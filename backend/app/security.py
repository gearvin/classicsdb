from __future__ import annotations

from hashlib import sha256
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.models.user import RefreshToken, User

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(
        payload,
        settings.secret_key.get_secret_value(),
        algorithm=settings.algorithm,
    )


def create_refresh_token(db: Session, user: User, user_agent: str | None = None) -> tuple[str, RefreshToken]:
    token_value = secrets.token_urlsafe(64)
    refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(token_value),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        user_agent=user_agent[:512] if user_agent else None,
    )
    db.add(refresh_token)
    return token_value, refresh_token


def hash_refresh_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def get_valid_refresh_token(db: Session, token: str | None) -> RefreshToken | None:
    if token is None:
        return None

    refresh_token = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(token))
    )
    if refresh_token is None or refresh_token.revoked_at is not None:
        return None

    expires_at = refresh_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at <= datetime.now(UTC):
        return None

    return refresh_token


def rotate_refresh_token(
    db: Session,
    refresh_token: RefreshToken,
    user_agent: str | None = None,
) -> tuple[str, RefreshToken]:
    now = datetime.now(UTC)
    refresh_token.revoked_at = now
    refresh_token.last_used_at = now

    next_token_value, next_refresh_token = create_refresh_token(db, refresh_token.user, user_agent)
    db.flush()
    refresh_token.replaced_by_token_id = next_refresh_token.id
    return next_token_value, next_refresh_token


def revoke_refresh_token(refresh_token: RefreshToken) -> None:
    now = datetime.now(UTC)
    refresh_token.revoked_at = now
    refresh_token.last_used_at = now


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key.get_secret_value(),
            algorithms=[settings.algorithm],
        )
    except InvalidTokenError:
        return None

    subject = payload.get("sub")
    return subject if isinstance(subject, str) else None


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    subject = decode_access_token(token)
    if subject is None:
        raise credentials_error

    try:
        user_id = int(subject)
    except ValueError as exc:
        raise credentials_error from exc

    user = db.get(User, user_id)
    if user is None:
        raise credentials_error
    return user


def get_optional_current_user(
    token: Annotated[str | None, Depends(optional_oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User | None:
    if token is None:
        return None

    subject = decode_access_token(token)
    if subject is None:
        return None

    try:
        user_id = int(subject)
    except ValueError:
        return None

    return db.get(User, user_id)


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return current_user


def get_optional_current_active_user(
    current_user: Annotated[User | None, Depends(get_optional_current_user)],
) -> User | None:
    if current_user is None or not current_user.is_active:
        return None
    return current_user


def require_admin_user(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return current_user
