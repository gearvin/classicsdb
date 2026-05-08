from __future__ import annotations

from datetime import date, datetime

from pydantic import Field

from app.models.book import ContributorRole, EditionFormat, LanguageRole, TitleType, WorkType
from app.schemas.base import SchemaBase
from app.schemas.language import LanguageRead


class BookTitleCreate(SchemaBase):
    title: str = Field(max_length=500)
    language_code: str = Field(min_length=3, max_length=3)
    title_type: TitleType = TitleType.ALTERNATIVE
    is_primary: bool = False
    position: int = 0


class BookTitleRead(SchemaBase):
    id: int
    book_id: int
    title: str
    language: LanguageRead
    title_type: TitleType
    is_primary: bool
    position: int


class BookCoverCreate(SchemaBase):
    url: str
    is_primary: bool = False
    source: str | None = Field(default=None, max_length=50)


class BookCoverRead(BookCoverCreate):
    id: int
    book_id: int


class BookAuthorBase(SchemaBase):
    author_id: int
    role: ContributorRole = ContributorRole.AUTHOR
    position: int = 0


class BookAuthorCreate(BookAuthorBase):
    pass


class BookAuthorRead(BookAuthorBase):
    book_id: int
    author_name: str = Field(max_length=255)


class BookLanguageBase(SchemaBase):
    language_code: str = Field(min_length=3, max_length=3)
    role: LanguageRole
    position: int = 0


class BookLanguageCreate(BookLanguageBase):
    pass


class BookLanguageRead(SchemaBase):
    role: LanguageRole
    position: int = 0
    language: LanguageRead


class BookBase(SchemaBase):
    description: str = ""
    first_published_year: int | None = None
    work_type: WorkType = WorkType.OTHER


class BookCreate(BookBase):
    languages: list[BookLanguageCreate] = Field(default_factory=list)
    titles: list[BookTitleCreate]
    covers: list[BookCoverCreate] = Field(default_factory=list)
    authors: list[BookAuthorCreate] = Field(default_factory=list)


class BookUpdate(SchemaBase):
    description: str | None = None
    first_published_year: int | None = None
    work_type: WorkType | None = None
    languages: list[BookLanguageCreate] | None = None
    titles: list[BookTitleCreate] | None = None
    covers: list[BookCoverCreate] | None = None
    authors: list[BookAuthorCreate] | None = None


class BookRead(SchemaBase):
    id: int
    display_title: str
    description: str
    languages: list[BookLanguageRead] = Field(default_factory=list)
    first_published_year: int | None = None
    work_type: WorkType
    created_at: datetime
    updated_at: datetime
    cover: BookCoverRead | None = None
    authors: list[BookAuthorRead] = Field(default_factory=list)
    average_rating: float | None = None
    rating_count: int = 0


class BookSummary(SchemaBase):
    id: int
    display_title: str
    first_published_year: int | None = None
    work_type: WorkType
    cover: BookCoverRead | None = None
    authors: list[BookAuthorRead] = Field(default_factory=list)
    average_rating: float | None = None
    rating_count: int = 0


class PaginatedBookSummaryList(SchemaBase):
    items: list[BookSummary]
    total: int
    limit: int
    offset: int


class EditionContributorBase(SchemaBase):
    author_id: int
    role: ContributorRole
    position: int = 0


class EditionContributorCreate(EditionContributorBase):
    pass


class EditionContributorRead(EditionContributorBase):
    edition_id: int
    name: str = Field(max_length=255)


class EditionTitleCreate(SchemaBase):
    language_code: str = Field(min_length=3, max_length=3)
    title: str
    subtitle: str | None = None
    title_type: TitleType | None = None
    is_primary: bool = False


class EditionTitleRead(SchemaBase):
    id: int
    edition_id: int
    language: LanguageRead
    title: str
    subtitle: str | None = None
    title_type: TitleType | None = None
    is_primary: bool


class EditionCoverCreate(SchemaBase):
    url: str
    is_primary: bool = False
    source: str | None = Field(default=None, max_length=50)


class EditionCoverRead(EditionCoverCreate):
    id: int
    edition_id: int


class BookEditionBase(SchemaBase):
    isbn_10: str | None = Field(default=None, max_length=10)
    isbn_13: str | None = Field(default=None, max_length=13)
    publisher: str | None = Field(default=None, max_length=255)
    publication_date: date | None = None
    language_code: str | None = Field(default=None, min_length=3, max_length=3)
    format: EditionFormat = EditionFormat.OTHER
    page_count: int | None = None
    description: str = ""


class BookEditionCreate(BookEditionBase):
    titles: list[EditionTitleCreate]
    covers: list[EditionCoverCreate] = Field(default_factory=list)
    contributors: list[EditionContributorCreate] = Field(default_factory=list)


class BookEditionUpdate(SchemaBase):
    isbn_10: str | None = Field(default=None, max_length=10)
    isbn_13: str | None = Field(default=None, max_length=13)
    publisher: str | None = Field(default=None, max_length=255)
    publication_date: date | None = None
    language_code: str | None = Field(default=None, min_length=3, max_length=3)
    format: EditionFormat | None = None
    page_count: int | None = None
    description: str | None = None


class BookEditionRead(SchemaBase):
    id: int
    book_id: int
    display_title: str
    display_subtitle: str | None = None
    isbn_10: str | None = None
    isbn_13: str | None = None
    publisher: str | None = None
    publication_date: date | None = None
    language: LanguageRead | None = None
    format: EditionFormat
    page_count: int | None = None
    description: str
    created_at: datetime
    updated_at: datetime
    titles: list[EditionTitleRead] = Field(default_factory=list)
    contributors: list[EditionContributorRead] = Field(default_factory=list)


class BookDetail(BookRead):
    titles: list[BookTitleRead] = Field(default_factory=list)
    editions: list[BookEditionRead] = Field(default_factory=list)
