from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, aliased, selectinload

from app.db.session import get_db
from app.models.book import (
    Book,
    BookAuthor,
    BookCover,
    BookEdition,
    BookLanguage,
    BookTitle,
    EditionContributor,
    EditionTitle,
)
from app.models.entry import EntryRevision, EntryTargetType
from app.models.tag import BookTagVote, Tag
from app.models.user import User
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
from app.schemas.entry import EntryRevisionRead
from app.schemas.tag import BookTagAggregate, BookTagVoteCreate, BookTagVoteRead
from app.security import get_optional_current_active_user, require_admin_user
from app.security import get_current_active_user
from app.services.tags import list_book_tag_aggregates
from app.services.entries import create_book_edition_entry, create_book_entry, update_book_entry

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


def _rating_fields(average_rating: float | None, rating_count: int | None) -> dict[str, float | int | None]:
    return {
        "average_rating": round(float(average_rating), 2) if average_rating is not None else None,
        "rating_count": int(rating_count or 0),
    }


def _with_rating(schema, average_rating: float | None, rating_count: int | None):
    return schema.model_copy(update=_rating_fields(average_rating, rating_count))


def _get_book_or_404(db: Session, book_id: int) -> Book:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return book


def _book_with_rating_statement(order_by_title: bool = False, order_by_recent: bool = False):
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

    if order_by_recent:
        statement = statement.order_by(Book.created_at.desc(), Book.id.desc())
    elif order_by_title:
        primary_title = aliased(BookTitle)
        statement = statement.outerjoin(
            primary_title,
            and_(primary_title.book_id == Book.id, primary_title.is_primary.is_(True)),
        ).order_by(primary_title.title.asc().nullslast(), Book.id)

    return statement


@router.get("", response_model=PaginatedBookSummaryList)
def list_books(
    db: Annotated[Session, Depends(get_db)],
    limit: int = 50,
    offset: int = 0,
    author_id: int | None = None,
    sort: Literal["title", "recent"] = "title",
):
    filters = []
    if author_id is not None:
        filters.append(Book.authors.any(BookAuthor.author_id == author_id))

    statement = _book_with_rating_statement(
        order_by_title=sort == "title",
        order_by_recent=sort == "recent",
    ).options(*_book_summary_options())
    total_statement = select(func.count()).select_from(Book)

    if filters:
        statement = statement.where(*filters)
        total_statement = total_statement.where(*filters)

    statement = statement.limit(limit).offset(offset)
    total = db.scalar(total_statement) or 0
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
def create_book(
    payload: BookCreate,
    current_user: Annotated[User, Depends(require_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    change_note: str = "",
):
    book = create_book_entry(db, payload, changed_by=current_user, change_note=change_note)
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


@router.get("/{book_id}/tags", response_model=list[BookTagAggregate])
def list_book_tags(
    book_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_current_active_user)] = None,
    show_all: bool = False,
    show_spoilers: bool = False,
):
    _get_book_or_404(db, book_id)
    return list_book_tag_aggregates(
        db,
        book_id,
        current_user=current_user,
        show_all=show_all,
        show_spoilers=show_spoilers,
    )


@router.put("/{book_id}/tags/{tag_id}/vote", response_model=BookTagVoteRead)
def vote_book_tag(
    book_id: int,
    tag_id: int,
    payload: BookTagVoteCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _get_book_or_404(db, book_id)
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    if not tag.is_applicable:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This tag cannot be applied to books")

    vote = db.scalar(
        select(BookTagVote).where(
            BookTagVote.book_id == book_id,
            BookTagVote.tag_id == tag_id,
            BookTagVote.user_id == current_user.id,
        )
    )
    if vote is None:
        vote = BookTagVote(
            book_id=book_id,
            tag_id=tag_id,
            user_id=current_user.id,
            vote=payload.vote,
            spoiler_level=payload.spoiler_level,
        )
        db.add(vote)
    else:
        vote.vote = payload.vote
        vote.spoiler_level = payload.spoiler_level

    db.commit()
    db.refresh(vote)
    return vote


@router.delete("/{book_id}/tags/{tag_id}/vote", status_code=status.HTTP_204_NO_CONTENT)
def clear_book_tag_vote(
    book_id: int,
    tag_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _get_book_or_404(db, book_id)
    vote = db.scalar(
        select(BookTagVote).where(
            BookTagVote.book_id == book_id,
            BookTagVote.tag_id == tag_id,
            BookTagVote.user_id == current_user.id,
        )
    )
    if vote is not None:
        db.delete(vote)
        db.commit()


@router.get("/{book_id}/history", response_model=list[EntryRevisionRead])
def list_book_history(book_id: int, db: Annotated[Session, Depends(get_db)]):
    if db.get(Book, book_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    statement = (
        select(EntryRevision)
        .where(
            EntryRevision.entity_type == EntryTargetType.BOOK,
            EntryRevision.entity_id == book_id,
        )
        .order_by(EntryRevision.created_at.desc(), EntryRevision.id.desc())
    )
    return db.scalars(statement).all()


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
def update_book(
    book_id: int,
    payload: BookUpdate,
    current_user: Annotated[User, Depends(require_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    change_note: str = "",
):
    book = update_book_entry(db, book_id, payload, changed_by=current_user, change_note=change_note)
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
def create_book_edition(
    book_id: int,
    payload: BookEditionCreate,
    current_user: Annotated[User, Depends(require_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    edition = create_book_edition_entry(db, book_id, payload, changed_by=current_user)
    return db.scalar(select(BookEdition).options(*_edition_options()).where(BookEdition.id == edition.id))


@router.get("/{book_id}/editions/{edition_id}/history", response_model=list[EntryRevisionRead])
def list_book_edition_history(book_id: int, edition_id: int, db: Annotated[Session, Depends(get_db)]):
    edition = db.get(BookEdition, edition_id)
    if edition is None or edition.book_id != book_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edition not found")

    statement = (
        select(EntryRevision)
        .where(
            EntryRevision.entity_type == EntryTargetType.BOOK_EDITION,
            EntryRevision.entity_id == edition_id,
        )
        .order_by(EntryRevision.created_at.desc(), EntryRevision.id.desc())
    )
    return db.scalars(statement).all()
