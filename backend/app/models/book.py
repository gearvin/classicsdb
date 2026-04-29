from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.author import Author
    from app.models.review import Review
    from app.models.user import UserBook, UserEdition


class WorkType(StrEnum):
    NOVEL = "novel"
    POEM = "poem"
    PLAY = "play"
    EPIC = "epic"
    ESSAY = "essay"
    SHORT_STORY = "short_story"
    COLLECTION = "collection"
    OTHER = "other"


class TitleType(StrEnum):
    PRIMARY = "primary"
    ORIGINAL = "original"
    ALTERNATIVE = "alternative"
    ROMANIZED = "romanized"
    ABBREVIATION = "abbreviation"


class EditionFormat(StrEnum):
    HARDCOVER = "hardcover"
    PAPERBACK = "paperback"
    EBOOK = "ebook"
    AUDIOBOOK = "audiobook"
    SERIAL = "serial"
    OTHER = "other"


class ContributorRole(StrEnum):
    AUTHOR = "author"
    ATTRIBUTED_TO = "attributed_to"
    TRANSLATOR = "translator"
    EDITOR = "editor"
    ILLUSTRATOR = "illustrator"
    INTRODUCTION = "introduction"
    NARRATOR = "narrator"
    COMPILER = "compiler"
    OTHER = "other"


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    original_title: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    original_language: Mapped[str | None] = mapped_column(String(16), index=True)
    first_published_year: Mapped[int | None] = mapped_column(Integer)
    work_type: Mapped[WorkType] = mapped_column(
        Enum(WorkType, name="work_type"),
        default=WorkType.OTHER,
        nullable=False,
    )
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

    titles: Mapped[list[BookTitle]] = relationship(
        back_populates="book",
        cascade="all, delete-orphan",
        order_by="BookTitle.position",
    )
    authors: Mapped[list[BookAuthor]] = relationship(
        back_populates="book",
        cascade="all, delete-orphan",
        order_by="BookAuthor.position",
    )
    editions: Mapped[list[BookEdition]] = relationship(
        back_populates="book",
        cascade="all, delete-orphan",
        order_by="BookEdition.publication_date",
    )
    user_books: Mapped[list[UserBook]] = relationship(back_populates="book")
    reviews: Mapped[list[Review]] = relationship(back_populates="book")


class BookTitle(Base):
    __tablename__ = "book_titles"
    __table_args__ = (
        UniqueConstraint("book_id", "title", "language", "title_type", name="uq_book_title"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    language: Mapped[str | None] = mapped_column(String(16), index=True)
    title_type: Mapped[TitleType] = mapped_column(
        Enum(TitleType, name="title_type"),
        default=TitleType.ALTERNATIVE,
        nullable=False,
    )
    is_primary: Mapped[bool] = mapped_column(default=False, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    book: Mapped[Book] = relationship(back_populates="titles")


class BookAuthor(Base):
    __tablename__ = "book_authors"
    __table_args__ = (
        UniqueConstraint("book_id", "author_id", "role", name="uq_book_author_role"),
    )

    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"), primary_key=True)
    role: Mapped[ContributorRole] = mapped_column(
        Enum(ContributorRole, name="contributor_role"),
        default=ContributorRole.AUTHOR,
        primary_key=True,
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    book: Mapped[Book] = relationship(back_populates="authors")
    author: Mapped[Author] = relationship(back_populates="books")


class BookEdition(Base):
    __tablename__ = "book_editions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    subtitle: Mapped[str | None] = mapped_column(String(500))
    isbn_10: Mapped[str | None] = mapped_column(String(10), unique=True)
    isbn_13: Mapped[str | None] = mapped_column(String(13), unique=True)
    publisher: Mapped[str | None] = mapped_column(String(255), index=True)
    publication_date: Mapped[date | None] = mapped_column(Date)
    language: Mapped[str | None] = mapped_column(String(16), index=True)
    format: Mapped[EditionFormat] = mapped_column(
        Enum(EditionFormat, name="edition_format"),
        default=EditionFormat.OTHER,
        nullable=False,
    )
    page_count: Mapped[int | None] = mapped_column(Integer)
    cover_image_url: Mapped[str | None] = mapped_column(String(1000))
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
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

    book: Mapped[Book] = relationship(back_populates="editions")
    contributors: Mapped[list[EditionContributor]] = relationship(
        back_populates="edition",
        cascade="all, delete-orphan",
        order_by="EditionContributor.position",
    )
    user_editions: Mapped[list[UserEdition]] = relationship(back_populates="edition")
    reviews: Mapped[list[Review]] = relationship(back_populates="edition")


class EditionContributor(Base):
    __tablename__ = "edition_contributors"
    __table_args__ = (
        UniqueConstraint("edition_id", "author_id", "role", name="uq_edition_contributor_role"),
    )

    edition_id: Mapped[int] = mapped_column(ForeignKey("book_editions.id"), primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"), primary_key=True)
    role: Mapped[ContributorRole] = mapped_column(
        Enum(ContributorRole, name="edition_contributor_role"),
        primary_key=True,
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    edition: Mapped[BookEdition] = relationship(back_populates="contributors")
    author: Mapped[Author] = relationship(back_populates="edition_contributions")
