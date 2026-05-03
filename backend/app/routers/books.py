from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, aliased, selectinload

from app.db.session import get_db
from app.models.author import Author
from app.models.book import (
    Book,
    BookAuthor,
    BookCover,
    BookEdition,
    BookLanguage,
    BookTitle,
    EditionContributor,
    EditionCover,
    EditionTitle,
    Language,
)
from app.models.user import UserBook
from app.schemas.book import (
    BookCreate,
    BookCoverRead,
    BookDetail,
    BookEditionCreate,
    BookEditionRead,
    BookRead,
    BookSummary,
    BookUpdate,
    PaginatedBookSummaryList,
)

router = APIRouter(prefix="/books", tags=["books"])


def _book_author_options():
    return (
        selectinload(Book.authors).joinedload(BookAuthor.author),
    )


def _edition_options():
    return (
        selectinload(BookEdition.language),
        selectinload(BookEdition.titles).joinedload(EditionTitle.language),
        selectinload(BookEdition.covers),
        selectinload(BookEdition.contributors).joinedload(EditionContributor.author),
    )


def _book_detail_options():
    return (
        *_book_author_options(),
        selectinload(Book.languages).joinedload(BookLanguage.language),
        selectinload(Book.titles).joinedload(BookTitle.language),
        selectinload(Book.covers),
        selectinload(Book.editions).options(*_edition_options()),
    )


def _book_read_options():
    return (
        *_book_author_options(),
        selectinload(Book.languages).joinedload(BookLanguage.language),
        selectinload(Book.titles).joinedload(BookTitle.language),
        selectinload(Book.covers),
    )


def _book_summary_options():
    return (
        *_book_author_options(),
        selectinload(Book.titles).joinedload(BookTitle.language),
        selectinload(Book.covers),
    )


def _get_language_by_code(db: Session, code: str | None, field_name: str = "language_code") -> Language | None:
    if code is None:
        return None
    language = db.scalar(select(Language).where(Language.code == code.strip().lower()))
    if language is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        )
    return language


def _require_exactly_one_primary(items: list, label: str) -> None:
    primary_count = sum(1 for item in items if item.is_primary)
    if primary_count != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exactly one primary {label} is required",
        )


def _require_at_most_one_primary(items: list, label: str) -> None:
    primary_count = sum(1 for item in items if item.is_primary)
    if primary_count > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only one primary {label} is allowed",
        )


def _require_unique_book_languages(items: list) -> None:
    seen = set()
    for item in items:
        key = (item.language_code.strip().lower(), item.role)
        if key in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate book language role",
            )
        seen.add(key)


def _rating_fields(average_rating: float | None, rating_count: int | None) -> dict[str, float | int | None]:
    return {
        "average_rating": round(float(average_rating), 2) if average_rating is not None else None,
        "rating_count": int(rating_count or 0),
    }


def _with_rating(schema, average_rating: float | None, rating_count: int | None):
    return schema.model_copy(update=_rating_fields(average_rating, rating_count))


def _book_with_rating_statement(order_by_title: bool = False):
    rating_subquery = (
        select(
            UserBook.book_id.label("book_id"),
            func.avg(UserBook.rating).label("average_rating"),
            func.count(UserBook.rating).label("rating_count"),
        )
        .group_by(UserBook.book_id)
        .subquery()
    )
    statement = select(
        Book,
        rating_subquery.c.average_rating,
        rating_subquery.c.rating_count,
    ).outerjoin(rating_subquery, rating_subquery.c.book_id == Book.id)

    if order_by_title:
        primary_title = aliased(BookTitle)
        statement = statement.outerjoin(
            primary_title,
            and_(primary_title.book_id == Book.id, primary_title.is_primary.is_(True)),
        ).order_by(primary_title.title.asc().nullslast(), Book.id)

    return statement


def _build_book_title(db: Session, payload) -> BookTitle:
    language = _get_language_by_code(db, payload.language_code)
    title_data = payload.model_dump(exclude={"language_code"})
    return BookTitle(**title_data, language_code=language.code)


def _build_book_language(db: Session, payload) -> BookLanguage:
    language = _get_language_by_code(db, payload.language_code)
    language_data = payload.model_dump(exclude={"language_code"})
    return BookLanguage(**language_data, language_code=language.code)


def _build_edition_title(db: Session, payload) -> EditionTitle:
    language = _get_language_by_code(db, payload.language_code)
    title_data = payload.model_dump(exclude={"language_code"})
    return EditionTitle(**title_data, language_code=language.code)


@router.get("", response_model=PaginatedBookSummaryList)
def list_books(db: Annotated[Session, Depends(get_db)], limit: int = 50, offset: int = 0):
    statement = (
        _book_with_rating_statement(order_by_title=True)
        .options(*_book_summary_options())
        .limit(limit)
        .offset(offset)
    )
    total = db.scalar(select(func.count()).select_from(Book)) or 0
    return {
        "items": [
            _with_rating(BookSummary.model_validate(book), average_rating, rating_count)
            for book, average_rating, rating_count in db.execute(statement).all()
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("", response_model=BookRead, status_code=status.HTTP_201_CREATED)
def create_book(payload: BookCreate, db: Annotated[Session, Depends(get_db)]):
    _require_exactly_one_primary(payload.titles, "book title")
    _require_at_most_one_primary(payload.covers, "book cover")
    _require_unique_book_languages(payload.languages)

    data = payload.model_dump(exclude={"languages", "titles", "covers", "authors"})
    book = Book(**data)
    book.languages = [_build_book_language(db, language) for language in payload.languages]
    book.titles = [_build_book_title(db, title) for title in payload.titles]
    book.covers = [BookCover(**cover.model_dump()) for cover in payload.covers]

    author_ids = [a.author_id for a in payload.authors]
    found_authors = set(db.scalars(select(Author.id).where(Author.id.in_(author_ids))).all())
    missing_authors = set(author_ids) - found_authors

    if missing_authors:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")
    book.authors = [BookAuthor(**a.model_dump()) for a in payload.authors]

    db.add(book)
    db.commit()
    db.refresh(book)
    result = db.execute(
        _book_with_rating_statement().options(*_book_read_options()).where(Book.id == book.id)
    ).one()
    book, average_rating, rating_count = result
    return _with_rating(BookRead.model_validate(book), average_rating, rating_count)


@router.get("/{book_id}", response_model=BookDetail)
def get_book(book_id: int, db: Annotated[Session, Depends(get_db)]):
    result = db.execute(
        _book_with_rating_statement().options(*_book_detail_options()).where(Book.id == book_id)
    ).one_or_none()
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    book, average_rating, rating_count = result
    return _with_rating(BookDetail.model_validate(book), average_rating, rating_count)


@router.get("/{book_id}/covers", response_model=list[BookCoverRead])
def list_book_covers(book_id: int, db: Annotated[Session, Depends(get_db)]):
    if db.get(Book, book_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    statement = (
        select(BookCover)
        .where(BookCover.book_id == book_id)
        .order_by(BookCover.is_primary.desc(), BookCover.id)
    )
    return db.scalars(statement).all()


@router.patch("/{book_id}", response_model=BookRead)
def update_book(book_id: int, payload: BookUpdate, db: Annotated[Session, Depends(get_db)]):
    book = db.scalar(select(Book).options(*_book_read_options()).where(Book.id == book_id))
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    updates = payload.model_dump(exclude_unset=True)
    if "languages" in updates:
        updates.pop("languages")
        _require_unique_book_languages(payload.languages or [])
        book.languages = [_build_book_language(db, language) for language in payload.languages or []]

    for key, value in updates.items():
        setattr(book, key, value)

    db.commit()
    db.refresh(book)
    result = db.execute(
        _book_with_rating_statement().options(*_book_read_options()).where(Book.id == book.id)
    ).one()
    book, average_rating, rating_count = result
    return _with_rating(BookRead.model_validate(book), average_rating, rating_count)


@router.get("/{book_id}/editions", response_model=list[BookEditionRead])
def list_book_editions(book_id: int, db: Annotated[Session, Depends(get_db)]):
    if db.get(Book, book_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    primary_title = aliased(EditionTitle)
    statement = (
        select(BookEdition)
        .options(*_edition_options())
        .outerjoin(
            primary_title,
            and_(primary_title.edition_id == BookEdition.id, primary_title.is_primary.is_(True)),
        )
        .where(BookEdition.book_id == book_id)
        .order_by(BookEdition.publication_date, primary_title.title.asc().nullslast(), BookEdition.id)
    )
    return db.scalars(statement).all()


@router.post("/{book_id}/editions", response_model=BookEditionRead, status_code=status.HTTP_201_CREATED)
def create_book_edition(book_id: int, payload: BookEditionCreate, db: Annotated[Session, Depends(get_db)]):
    if db.get(Book, book_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    _require_exactly_one_primary(payload.titles, "edition title")
    _require_at_most_one_primary(payload.covers, "edition cover")

    language = _get_language_by_code(db, payload.language_code)
    data = payload.model_dump(exclude={"language_code", "titles", "covers", "contributors"})
    edition = BookEdition(
        **data,
        book_id=book_id,
        language_code=language.code if language else None,
    )
    edition.titles = [_build_edition_title(db, title) for title in payload.titles]
    edition.covers = [EditionCover(**cover.model_dump()) for cover in payload.covers]

    contributor_ids = [c.author_id for c in payload.contributors]
    found = set(db.scalars(select(Author.id).where(Author.id.in_(contributor_ids))).all())
    missing = set(contributor_ids) - found
    if missing:
        raise HTTPException(404, "Contributor not found")
    edition.contributors = [EditionContributor(**c.model_dump()) for c in payload.contributors]

    db.add(edition)
    db.commit()
    db.refresh(edition)
    return db.scalar(
        select(BookEdition)
        .options(*_edition_options())
        .where(BookEdition.id == edition.id)
    )
