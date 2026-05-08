from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EntryTargetType(StrEnum):
    AUTHOR = "author"
    BOOK = "book"
    BOOK_EDITION = "book_edition"


class EntryAction(StrEnum):
    CREATE = "create"
    UPDATE = "update"


class EntrySuggestionStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class EntrySuggestion(Base):
    __tablename__ = "entry_suggestions"
    __table_args__ = (
        Index("ix_entry_suggestions_target", "target_type", "target_id"),
        Index("ix_entry_suggestions_status", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    suggested_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    target_type: Mapped[EntryTargetType] = mapped_column(Enum(EntryTargetType, name="entry_target_type"), nullable=False)
    action: Mapped[EntryAction] = mapped_column(Enum(EntryAction, name="entry_action"), nullable=False)
    target_id: Mapped[int | None] = mapped_column(Integer, index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    status: Mapped[EntrySuggestionStatus] = mapped_column(
        Enum(EntrySuggestionStatus, name="entry_suggestion_status"),
        default=EntrySuggestionStatus.PENDING,
        nullable=False,
    )
    submitter_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    reviewer_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    suggested_by = relationship("User", foreign_keys=[suggested_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    revision: Mapped[EntryRevision | None] = relationship(back_populates="suggestion")


class EntryRevision(Base):
    __tablename__ = "entry_revisions"
    __table_args__ = (
        Index("ix_entry_revisions_entity", "entity_type", "entity_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_type: Mapped[EntryTargetType] = mapped_column(Enum(EntryTargetType, name="entry_target_type"), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    action: Mapped[EntryAction] = mapped_column(Enum(EntryAction, name="entry_action"), nullable=False)
    changed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    suggestion_id: Mapped[int | None] = mapped_column(ForeignKey("entry_suggestions.id"), unique=True)
    before_payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    after_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    change_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    changed_by = relationship("User")
    suggestion: Mapped[EntrySuggestion | None] = relationship(back_populates="revision")
