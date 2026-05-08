from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field, model_validator

from app.models.entry import EntryAction, EntrySuggestionStatus, EntryTargetType
from app.schemas.author import AuthorCreate, AuthorUpdate
from app.schemas.base import SchemaBase
from app.schemas.book import BookCreate, BookEditionCreate, BookUpdate


def _validated_payload(
    target_type: EntryTargetType,
    action: EntryAction,
    target_id: int | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    if action == EntryAction.UPDATE and target_id is None:
        raise ValueError("target_id is required for update suggestions")

    if target_type == EntryTargetType.AUTHOR:
        schema = AuthorCreate if action == EntryAction.CREATE else AuthorUpdate
        if action == EntryAction.CREATE and target_id is not None:
            raise ValueError("target_id must be omitted for author create suggestions")
    elif target_type == EntryTargetType.BOOK:
        schema = BookCreate if action == EntryAction.CREATE else BookUpdate
        if action == EntryAction.CREATE and target_id is not None:
            raise ValueError("target_id must be omitted for book create suggestions")
    elif target_type == EntryTargetType.BOOK_EDITION:
        if action != EntryAction.CREATE:
            raise ValueError("book edition update suggestions are not supported yet")
        if target_id is None:
            raise ValueError("target_id must be the parent book id for book edition create suggestions")
        schema = BookEditionCreate
    else:
        raise ValueError("Unsupported target type")

    return schema.model_validate(payload).model_dump(mode="json", exclude_unset=action == EntryAction.UPDATE)


class EntrySuggestionCreate(SchemaBase):
    target_type: EntryTargetType
    action: EntryAction
    target_id: int | None = None
    payload: dict[str, Any]
    submitter_note: str = ""

    @model_validator(mode="after")
    def validate_payload(self) -> EntrySuggestionCreate:
        self.payload = _validated_payload(self.target_type, self.action, self.target_id, self.payload)
        return self


class EntrySuggestionReview(SchemaBase):
    status: EntrySuggestionStatus
    reviewer_note: str = ""

    @model_validator(mode="after")
    def validate_review_status(self) -> EntrySuggestionReview:
        if self.status == EntrySuggestionStatus.PENDING:
            raise ValueError("Review status must be approved or rejected")
        return self


class EntrySuggestionRead(SchemaBase):
    id: int
    suggested_by_id: int
    reviewed_by_id: int | None = None
    target_type: EntryTargetType
    action: EntryAction
    target_id: int | None = None
    payload: dict[str, Any]
    status: EntrySuggestionStatus
    submitter_note: str
    reviewer_note: str
    created_at: datetime
    updated_at: datetime
    reviewed_at: datetime | None = None


class EntryRevisionRead(SchemaBase):
    id: int
    entity_type: EntryTargetType
    entity_id: int
    action: EntryAction
    changed_by_id: int
    suggestion_id: int | None = None
    before_payload: dict[str, Any] | None = None
    after_payload: dict[str, Any]
    change_note: str = Field(default="")
    created_at: datetime
