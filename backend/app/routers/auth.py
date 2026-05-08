from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import TokenRead
from app.schemas.user import UserCreate, UserPrivate
from app.security import (
    create_access_token,
    create_refresh_token,
    get_valid_refresh_token,
    hash_password,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/api/v1/auth",
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path="/api/v1/auth",
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,
    )


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post(
    "/register",
    response_model=UserPrivate,
    status_code=status.HTTP_201_CREATED
)
def register_user(payload: UserCreate, db: Annotated[Session, Depends(get_db)]):
    email = _normalize_email(str(payload.email))
    existing_user = db.scalar(
        select(User).where(or_(User.email == email, User.username == payload.username))
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email or username already exists",
        )

    user = User(
        username=payload.username,
        email=email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
        avatar_url=payload.avatar_url,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email or username already exists",
        ) from exc
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenRead)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
    request: Request,
    response: Response,
):
    email = _normalize_email(form_data.username)
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    refresh_token, _ = create_refresh_token(db, user, request.headers.get("user-agent"))
    db.commit()
    _set_refresh_cookie(response, refresh_token)
    return TokenRead(access_token=create_access_token(str(user.id)))


@router.post("/refresh", response_model=TokenRead)
def refresh(
    db: Annotated[Session, Depends(get_db)],
    request: Request,
    response: Response,
    refresh_cookie: Annotated[str | None, Cookie(alias=settings.refresh_cookie_name)] = None,
):
    refresh_token = get_valid_refresh_token(db, refresh_cookie)
    if refresh_token is None or refresh_token.user is None:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    user = refresh_token.user
    if not user.is_active:
        revoke_refresh_token(refresh_token)
        db.commit()
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    next_refresh_token, _ = rotate_refresh_token(db, refresh_token, request.headers.get("user-agent"))
    db.commit()
    _set_refresh_cookie(response, next_refresh_token)
    return TokenRead(access_token=create_access_token(str(user.id)))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    db: Annotated[Session, Depends(get_db)],
    response: Response,
    refresh_cookie: Annotated[str | None, Cookie(alias=settings.refresh_cookie_name)] = None,
):
    refresh_token = get_valid_refresh_token(db, refresh_cookie)
    if refresh_token is not None:
        revoke_refresh_token(refresh_token)
        db.commit()

    _clear_refresh_cookie(response)
