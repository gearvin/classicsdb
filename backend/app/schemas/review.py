from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.book import BookSummary
from app.schemas.base import SchemaBase
from app.schemas.user import UserPublic


class ReviewBase(SchemaBase):
    user_book_id: int
    user_book_edition_id: int | None = None
    rating: int | None = Field(default=None, ge=1, le=10)
    contains_spoilers: bool = False
    is_public: bool = True
    body: str = Field(min_length=1)


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(SchemaBase):
    user_book_edition_id: int | None = None
    rating: int | None = Field(default=None, ge=1, le=10)
    contains_spoilers: bool | None = None
    is_public: bool | None = None
    body: str | None = Field(default=None, min_length=1)


class ReviewRead(ReviewBase):
    id: int
    book: BookSummary
    reviewer: UserPublic
    helpful_count: int
    unhelpful_count: int
    comment_count: int
    created_at: datetime
    updated_at: datetime


class ReviewCommentCreate(SchemaBase):
    body: str = Field(min_length=1, max_length=5000)


class ReviewCommentRead(ReviewCommentCreate):
    id: int
    review_id: int
    author: UserPublic
    created_at: datetime
    updated_at: datetime


class ReviewVoteCreate(SchemaBase):
    is_helpful: bool


class ReviewVoteRead(ReviewVoteCreate):
    review_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
