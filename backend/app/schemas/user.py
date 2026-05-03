from __future__ import annotations

from datetime import date, datetime

from pydantic import EmailStr, Field

from app.models.user import ReadingStatus
from app.schemas.base import SchemaBase


class UserBase(SchemaBase):
    username: str = Field(max_length=64)
    email: EmailStr
    display_name: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=1000)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=255)


class UserUpdate(SchemaBase):
    username: str | None = Field(default=None, max_length=64)
    email: EmailStr | None = None
    display_name: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=1000)
    is_active: bool | None = None


class UserMeUpdate(SchemaBase):
    username: str | None = Field(default=None, max_length=64)
    email: EmailStr | None = None
    display_name: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=1000)


class UserPublic(SchemaBase):
    id: int
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    created_at: datetime


class UserPrivate(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime


class UserBookBase(SchemaBase):
    status: ReadingStatus | None = None
    rating: int | None = Field(default=None, ge=1, le=10)
    started_at: date | None = None
    finished_at: date | None = None


class UserBookCreate(UserBookBase):
    book_id: int


class UserBookUpdate(SchemaBase):
    status: ReadingStatus | None = None
    rating: int | None = Field(default=None, ge=1, le=10)
    started_at: date | None = None
    finished_at: date | None = None


class UserBookRead(UserBookBase):
    id: int
    book_id: int
    created_at: datetime
    updated_at: datetime


class UserBookEditionBase(SchemaBase):
    status: ReadingStatus | None = None
    notes: str = ""


class UserBookEditionCreate(UserBookEditionBase):
    edition_id: int | None = None


class UserBookEditionUpdate(SchemaBase):
    status: ReadingStatus | None = None
    notes: str | None = None


class UserBookEditionRead(UserBookEditionBase):
    id: int
    user_book_id: int
    edition_id: int | None = None
    created_at: datetime
    updated_at: datetime
