from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.base import SchemaBase


class AuthorBase(SchemaBase):
    name: str = Field(max_length=255)
    sort_name: str | None = Field(default=None, max_length=255)
    bio: str = ""
    birth_year: int | None = None
    death_year: int | None = None


class AuthorCreate(AuthorBase):
    pass


class AuthorUpdate(SchemaBase):
    name: str | None = Field(default=None, max_length=255)
    sort_name: str | None = Field(default=None, max_length=255)
    bio: str | None = None
    birth_year: int | None = None
    death_year: int | None = None


class AuthorRead(AuthorBase):
    id: int
    created_at: datetime
    updated_at: datetime
