from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import TokenRead
from app.schemas.user import UserCreate, UserPrivate
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


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

    return TokenRead(access_token=create_access_token(str(user.id)))
