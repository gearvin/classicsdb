from __future__ import annotations

from pydantic import Field

from app.schemas.base import SchemaBase


class LanguageRead(SchemaBase):
    code: str = Field(min_length=3, max_length=3)
    name: str
    native_name: str | None = None
    is_rtl: bool
