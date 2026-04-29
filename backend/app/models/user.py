from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.book import Book, BookEdition
    from app.models.review import Review, ReviewVote


class ReadingStatus(StrEnum):
    WANT_TO_READ = "want_to_read"
    READING = "reading"
    READ = "read"
    DNF = "dnf"
    OWNED = "owned"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(default=False, nullable=False)
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

    books: Mapped[list[UserBook]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    editions: Mapped[list[UserEdition]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    reviews: Mapped[list[Review]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    review_votes: Mapped[list[ReviewVote]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserBook(Base):
    __tablename__ = "user_books"
    __table_args__ = (
        UniqueConstraint("user_id", "book_id", name="uq_user_book"),
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), primary_key=True)
    status: Mapped[ReadingStatus | None] = mapped_column(Enum(ReadingStatus, name="reading_status"))
    rating: Mapped[int | None] = mapped_column(Integer)
    started_at: Mapped[date | None] = mapped_column(Date)
    finished_at: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
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

    user: Mapped[User] = relationship(back_populates="books")
    book: Mapped[Book] = relationship(back_populates="user_books")


class UserEdition(Base):
    __tablename__ = "user_editions"
    __table_args__ = (
        UniqueConstraint("user_id", "edition_id", name="uq_user_edition"),
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    edition_id: Mapped[int] = mapped_column(ForeignKey("book_editions.id"), primary_key=True)
    owned: Mapped[bool] = mapped_column(default=False, nullable=False)
    currently_reading: Mapped[bool] = mapped_column(default=False, nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
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

    user: Mapped[User] = relationship(back_populates="editions")
    edition: Mapped[BookEdition] = relationship(back_populates="user_editions")
