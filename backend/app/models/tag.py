from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.book import Book
    from app.models.user import User


class TagRequestStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Tag(Base):
    __tablename__ = "tags"
    __table_args__ = (
        CheckConstraint("default_spoiler_level IN (0, 1, 2)", name="ck_tags_default_spoiler_level"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(140), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    aliases: Mapped[str] = mapped_column(Text, default="", nullable=False)
    default_spoiler_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_applicable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("tags.id"), index=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
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

    parent: Mapped[Tag | None] = relationship(remote_side=[id], back_populates="children")
    children: Mapped[list[Tag]] = relationship(back_populates="parent", order_by="Tag.name")
    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_id])
    approved_by: Mapped[User | None] = relationship(foreign_keys=[approved_by_id])
    votes: Mapped[list[BookTagVote]] = relationship(
        back_populates="tag",
        cascade="all, delete-orphan",
    )


class BookTagVote(Base):
    __tablename__ = "book_tag_votes"
    __table_args__ = (
        UniqueConstraint("book_id", "tag_id", "user_id", name="uq_book_tag_votes_user"),
        CheckConstraint("vote IN (-1, 1, 2, 3)", name="ck_book_tag_votes_vote"),
        CheckConstraint("spoiler_level IN (0, 1, 2)", name="ck_book_tag_votes_spoiler_level"),
        Index("ix_book_tag_votes_book_tag", "book_id", "tag_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False, index=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    vote: Mapped[int] = mapped_column(Integer, nullable=False)
    spoiler_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
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

    book: Mapped[Book] = relationship(back_populates="tag_votes")
    tag: Mapped[Tag] = relationship(back_populates="votes")
    user: Mapped[User] = relationship(back_populates="tag_votes")


class TagRequest(Base):
    __tablename__ = "tag_requests"
    __table_args__ = (
        Index("ix_tag_requests_status", "status"),
        Index("ix_tag_requests_parent_id", "parent_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requested_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("tags.id"))
    proposed_name: Mapped[str] = mapped_column(String(120), nullable=False)
    proposed_slug: Mapped[str] = mapped_column(String(140), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    submitter_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    reviewer_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[TagRequestStatus] = mapped_column(
        Enum(TagRequestStatus, name="tag_request_status"),
        default=TagRequestStatus.PENDING,
        nullable=False,
    )
    created_tag_id: Mapped[int | None] = mapped_column(ForeignKey("tags.id"), unique=True)
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

    requested_by: Mapped[User] = relationship(foreign_keys=[requested_by_id])
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_id])
    parent: Mapped[Tag | None] = relationship(foreign_keys=[parent_id])
    created_tag: Mapped[Tag | None] = relationship(foreign_keys=[created_tag_id])
