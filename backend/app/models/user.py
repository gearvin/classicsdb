from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
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


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(120))
    avatar_url: Mapped[str | None] = mapped_column(String(1000))
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
    review_votes: Mapped[list[ReviewVote]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserBook(Base):
    __tablename__ = "user_books"
    __table_args__ = (
        UniqueConstraint("user_id", "book_id", name="uq_user_books_shelf_book"),
        CheckConstraint("rating IS NULL OR rating BETWEEN 1 AND 10", name="ck_user_book_rating_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False, index=True)
    status: Mapped[ReadingStatus | None] = mapped_column(Enum(ReadingStatus, name="reading_status"))
    rating: Mapped[int | None] = mapped_column(Integer)
    started_at: Mapped[date | None] = mapped_column(Date)
    finished_at: Mapped[date | None] = mapped_column(Date)
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
    editions: Mapped[list[UserBookEdition]] = relationship(
        back_populates="user_book",
        cascade="all, delete-orphan",
    )
    reviews: Mapped[list[Review]] = relationship(
        back_populates="user_book",
        cascade="all, delete-orphan",
    )


class UserBookEdition(Base):
    __tablename__ = "user_book_editions"
    __table_args__ = (
        Index(
            "uq_user_book_editions_with_edition",
            "user_book_id",
            "edition_id",
            unique=True,
            postgresql_where=text("edition_id IS NOT NULL"),
        ),
        Index(
            "uq_user_book_editions_no_edition",
            "user_book_id",
            unique=True,
            postgresql_where=text("edition_id IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_book_id: Mapped[int] = mapped_column(ForeignKey("user_books.id"), nullable=False, index=True)
    edition_id: Mapped[int | None] = mapped_column(ForeignKey("book_editions.id"), nullable=True, index=True)
    status: Mapped[ReadingStatus | None] = mapped_column(Enum(ReadingStatus, name="reading_status"))
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

    user_book: Mapped[UserBook] = relationship(back_populates="editions")
    edition: Mapped[BookEdition | None] = relationship(back_populates="user_book_editions")
    reviews: Mapped[list[Review]] = relationship(back_populates="user_book_edition")
