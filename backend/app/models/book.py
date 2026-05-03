from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.author import Author
    from app.models.user import UserBook, UserBookEdition


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
    ORIGINAL = "original"
    TRANSLATED = "translated"
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


class LanguageRole(StrEnum):
    ORIGINAL = "original"
    TRANSLATION = "translation"
    INCLUDED = "included"


class Language(Base):
    __tablename__ = "languages"

    code: Mapped[str] = mapped_column(String(3), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    native_name: Mapped[str | None] = mapped_column(String(100))
    is_rtl: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
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

    languages: Mapped[list[BookLanguage]] = relationship(
        back_populates="book",
        cascade="all, delete-orphan",
        order_by="BookLanguage.position",
    )
    titles: Mapped[list[BookTitle]] = relationship(
        back_populates="book",
        cascade="all, delete-orphan",
        order_by="BookTitle.position",
    )
    covers: Mapped[list[BookCover]] = relationship(
        back_populates="book",
        cascade="all, delete-orphan",
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

    @property
    def display_title(self) -> str:
        primary_title = next((title for title in self.titles if title.is_primary), None)
        fallback_title = self.titles[0] if self.titles else None
        if primary_title is not None:
            return primary_title.title
        if fallback_title is not None:
            return fallback_title.title
        return "Untitled"

    @property
    def cover(self) -> BookCover | None:
        primary_cover = next((cover for cover in self.covers if cover.is_primary), None)
        if primary_cover is not None:
            return primary_cover
        return self.covers[0] if self.covers else None


class BookTitle(Base):
    __tablename__ = "book_titles"
    __table_args__ = (
        UniqueConstraint("book_id", "title", "language_code", "title_type", name="uq_book_title"),
        Index(
            "uq_book_titles_primary",
            "book_id",
            unique=True,
            postgresql_where=text("is_primary = true"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    language_code: Mapped[str] = mapped_column(String(3), ForeignKey("languages.code"), nullable=False, index=True)
    title_type: Mapped[TitleType] = mapped_column(
        Enum(TitleType, name="title_type"),
        default=TitleType.ALTERNATIVE,
        nullable=False,
    )
    is_primary: Mapped[bool] = mapped_column(default=False, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    book: Mapped[Book] = relationship(back_populates="titles")
    language: Mapped[Language] = relationship()


class BookLanguage(Base):
    __tablename__ = "book_languages"
    __table_args__ = (
        Index("ix_book_languages_language_code", "language_code"),
        Index("ix_book_languages_role", "role"),
    )

    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), primary_key=True)
    language_code: Mapped[str] = mapped_column(String(3), ForeignKey("languages.code"), primary_key=True)
    role: Mapped[LanguageRole] = mapped_column(
        Enum(LanguageRole, name="language_role"),
        primary_key=True,
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    book: Mapped[Book] = relationship(back_populates="languages")
    language: Mapped[Language] = relationship()


class BookCover(Base):
    __tablename__ = "book_covers"
    __table_args__ = (
        Index(
            "uq_book_covers_primary",
            "book_id",
            unique=True,
            postgresql_where=text("is_primary = true"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source: Mapped[str | None] = mapped_column(String(50))

    book: Mapped[Book] = relationship(back_populates="covers")


class BookAuthor(Base):
    __tablename__ = "book_authors"

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

    @property
    def author_name(self) -> str:
        return self.author.name


class BookEdition(Base):
    __tablename__ = "book_editions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False, index=True)
    isbn_10: Mapped[str | None] = mapped_column(String(10), unique=True)
    isbn_13: Mapped[str | None] = mapped_column(String(13), unique=True)
    publisher: Mapped[str | None] = mapped_column(String(255), index=True)
    publication_date: Mapped[date | None] = mapped_column(Date)
    language_code: Mapped[str | None] = mapped_column(String(3), ForeignKey("languages.code"), index=True)
    format: Mapped[EditionFormat] = mapped_column(
        Enum(EditionFormat, name="edition_format"),
        default=EditionFormat.OTHER,
        nullable=False,
    )
    page_count: Mapped[int | None] = mapped_column(Integer)
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
    language: Mapped[Language | None] = relationship()
    titles: Mapped[list[EditionTitle]] = relationship(
        back_populates="edition",
        cascade="all, delete-orphan",
    )
    covers: Mapped[list[EditionCover]] = relationship(
        back_populates="edition",
        cascade="all, delete-orphan",
    )
    contributors: Mapped[list[EditionContributor]] = relationship(
        back_populates="edition",
        cascade="all, delete-orphan",
        order_by="EditionContributor.position",
    )
    user_book_editions: Mapped[list[UserBookEdition]] = relationship(back_populates="edition")

    @property
    def display_title(self) -> str:
        primary_title = next((title for title in self.titles if title.is_primary), None)
        fallback_title = self.titles[0] if self.titles else None
        if primary_title is not None:
            return primary_title.title
        if fallback_title is not None:
            return fallback_title.title
        return self.book.display_title

    @property
    def display_subtitle(self) -> str | None:
        primary_title = next((title for title in self.titles if title.is_primary), None)
        return primary_title.subtitle if primary_title is not None else None


class EditionTitle(Base):
    __tablename__ = "edition_titles"
    __table_args__ = (
        Index(
            "uq_edition_titles_primary",
            "edition_id",
            unique=True,
            postgresql_where=text("is_primary = true"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    edition_id: Mapped[int] = mapped_column(ForeignKey("book_editions.id"), nullable=False, index=True)
    language_code: Mapped[str] = mapped_column(String(3), ForeignKey("languages.code"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    subtitle: Mapped[str | None] = mapped_column(Text)
    title_type: Mapped[TitleType | None] = mapped_column(Enum(TitleType, name="title_type"))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    edition: Mapped[BookEdition] = relationship(back_populates="titles")
    language: Mapped[Language] = relationship()


class EditionCover(Base):
    __tablename__ = "edition_covers"
    __table_args__ = (
        Index(
            "uq_edition_covers_primary",
            "edition_id",
            unique=True,
            postgresql_where=text("is_primary = true"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    edition_id: Mapped[int] = mapped_column(ForeignKey("book_editions.id"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source: Mapped[str | None] = mapped_column(String(50))

    edition: Mapped[BookEdition] = relationship(back_populates="covers")


class EditionContributor(Base):
    __tablename__ = "edition_contributors"

    edition_id: Mapped[int] = mapped_column(ForeignKey("book_editions.id"), primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"), primary_key=True)
    role: Mapped[ContributorRole] = mapped_column(
        Enum(ContributorRole, name="edition_contributor_role"),
        primary_key=True,
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    edition: Mapped[BookEdition] = relationship(back_populates="contributors")
    author: Mapped[Author] = relationship(back_populates="edition_contributions")

    @property
    def author_name(self) -> str:
        return self.author.name
