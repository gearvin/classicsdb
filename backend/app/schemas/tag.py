from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from app.models.tag import TagRequestStatus
from app.schemas.base import SchemaBase
from app.schemas.book import BookSummary

TagVoteValue = Literal[-1, 1, 2, 3]
SpoilerLevel = Literal[0, 1, 2]


class TagBase(SchemaBase):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    aliases: str = ""
    default_spoiler_level: SpoilerLevel = 0
    is_applicable: bool = True
    parent_id: int | None = None


class TagCreate(TagBase):
    pass


class TagUpdate(SchemaBase):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    aliases: str | None = None
    default_spoiler_level: SpoilerLevel | None = None
    is_applicable: bool | None = None
    parent_id: int | None = None


class TagRead(SchemaBase):
    id: int
    name: str
    slug: str
    description: str
    aliases: str
    default_spoiler_level: int
    is_applicable: bool
    parent_id: int | None = None
    created_by_id: int | None = None
    approved_by_id: int | None = None
    created_at: datetime
    updated_at: datetime


class TagTreeNode(TagRead):
    children: list[TagTreeNode] = Field(default_factory=list)


class BookTagVoteCreate(SchemaBase):
    vote: TagVoteValue
    spoiler_level: SpoilerLevel = 0


class BookTagVoteRead(SchemaBase):
    id: int
    book_id: int
    tag_id: int
    user_id: int
    vote: int
    spoiler_level: int
    created_at: datetime
    updated_at: datetime


class BookTagAggregate(SchemaBase):
    tag: TagRead
    ancestors: list[TagRead] = Field(default_factory=list)
    score: int
    vote_count: int
    positive_vote_count: int
    downvote_count: int
    spoiler_vote_count: int
    aggregate_spoiler_level: int
    is_spoiler: bool
    average_positive_rating: float | None = None
    current_user_vote: int | None = None
    current_user_spoiler_level: int | None = None
    current_user_spoiler: bool | None = None


class TaggedBookSummary(SchemaBase):
    book: BookSummary
    relevance_score: int
    vote_count: int
    positive_vote_count: int
    downvote_count: int
    spoiler_vote_count: int
    aggregate_spoiler_level: int
    average_positive_rating: float | None = None


class TagDetail(TagRead):
    parent: TagRead | None = None
    children: list[TagRead] = Field(default_factory=list)
    books: list[TaggedBookSummary] = Field(default_factory=list)


class TagRequestCreate(SchemaBase):
    proposed_name: str = Field(min_length=1, max_length=120)
    parent_id: int | None = None
    description: str = ""
    submitter_note: str = ""


class TagRequestReview(SchemaBase):
    status: TagRequestStatus
    reviewer_note: str = ""

    @model_validator(mode="after")
    def validate_review_status(self) -> TagRequestReview:
        if self.status == TagRequestStatus.PENDING:
            raise ValueError("Review status must be approved or rejected")
        return self


class TagRequestRead(SchemaBase):
    id: int
    requested_by_id: int
    reviewed_by_id: int | None = None
    parent_id: int | None = None
    proposed_name: str
    proposed_slug: str
    description: str
    submitter_note: str
    reviewer_note: str
    status: TagRequestStatus
    created_tag_id: int | None = None
    created_at: datetime
    updated_at: datetime
    reviewed_at: datetime | None = None
