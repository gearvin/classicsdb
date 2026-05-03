from __future__ import annotations

from app.schemas.base import SchemaBase


class TokenRead(SchemaBase):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SchemaBase):
    sub: str | None = None
