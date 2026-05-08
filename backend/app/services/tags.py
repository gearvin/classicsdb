from __future__ import annotations

from datetime import datetime
import re

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.book import Book, BookAuthor, BookTitle
from app.models.tag import BookTagVote, Tag, TagRequest, TagRequestStatus
from app.models.user import User, UserBook
from app.schemas.book import BookSummary
from app.schemas.tag import (
    BookTagAggregate,
    TagCreate,
    TagDetail,
    TaggedBookSummary,
    TagRead,
    TagRequestCreate,
    TagUpdate,
)


def normalize_tag_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    if not slug:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag name must include letters or numbers")
    return slug


def _clean_name(name: str) -> str:
    cleaned = " ".join(name.split())
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag name cannot be empty")
    return cleaned


def _get_parent_or_404(db: Session, parent_id: int | None) -> Tag | None:
    if parent_id is None:
        return None
    parent = db.get(Tag, parent_id)
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent tag not found")
    return parent


def _require_slug_available(db: Session, slug: str, *, ignore_tag_id: int | None = None) -> None:
    statement = select(Tag).where(Tag.slug == slug)
    if ignore_tag_id is not None:
        statement = statement.where(Tag.id != ignore_tag_id)
    if db.scalar(statement) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A tag with this name already exists")


def _require_pending_request_slug_available(db: Session, slug: str) -> None:
    tag_request = db.scalar(
        select(TagRequest).where(
            TagRequest.proposed_slug == slug,
            TagRequest.status == TagRequestStatus.PENDING,
        )
    )
    if tag_request is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A pending tag request with this name already exists")


def _require_no_parent_cycle(db: Session, tag: Tag, parent_id: int | None) -> None:
    ancestor_id = parent_id
    seen_ids: set[int] = set()
    while ancestor_id is not None:
        if ancestor_id == tag.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag parent cannot create a cycle")
        if ancestor_id in seen_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag tree already contains a cycle")
        seen_ids.add(ancestor_id)
        ancestor = db.get(Tag, ancestor_id)
        if ancestor is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent tag not found")
        ancestor_id = ancestor.parent_id


def create_tag(db: Session, payload: TagCreate, *, current_user: User) -> Tag:
    _get_parent_or_404(db, payload.parent_id)
    name = _clean_name(payload.name)
    slug = normalize_tag_slug(name)
    _require_slug_available(db, slug)

    tag = Tag(
        name=name,
        slug=slug,
        description=payload.description.strip(),
        aliases=payload.aliases.strip(),
        default_spoiler_level=payload.default_spoiler_level,
        is_applicable=payload.is_applicable,
        parent_id=payload.parent_id,
        created_by_id=current_user.id,
        approved_by_id=current_user.id,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def update_tag(db: Session, tag_id: int, payload: TagUpdate) -> Tag:
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    updates = payload.model_dump(exclude_unset=True)
    if "parent_id" in updates:
        _require_no_parent_cycle(db, tag, payload.parent_id)
        _get_parent_or_404(db, payload.parent_id)
        tag.parent_id = payload.parent_id
    if payload.name is not None:
        name = _clean_name(payload.name)
        slug = normalize_tag_slug(name)
        _require_slug_available(db, slug, ignore_tag_id=tag.id)
        tag.name = name
        tag.slug = slug
    if payload.description is not None:
        tag.description = payload.description.strip()
    if payload.aliases is not None:
        tag.aliases = payload.aliases.strip()
    if payload.default_spoiler_level is not None:
        tag.default_spoiler_level = payload.default_spoiler_level
    if payload.is_applicable is not None:
        tag.is_applicable = payload.is_applicable

    db.commit()
    db.refresh(tag)
    return tag


def create_tag_request(db: Session, payload: TagRequestCreate, *, current_user: User) -> TagRequest:
    _get_parent_or_404(db, payload.parent_id)
    name = _clean_name(payload.proposed_name)
    slug = normalize_tag_slug(name)
    _require_slug_available(db, slug)
    _require_pending_request_slug_available(db, slug)

    tag_request = TagRequest(
        requested_by_id=current_user.id,
        parent_id=payload.parent_id,
        proposed_name=name,
        proposed_slug=slug,
        description=payload.description.strip(),
        submitter_note=payload.submitter_note.strip(),
    )
    db.add(tag_request)
    db.commit()
    db.refresh(tag_request)
    return tag_request


def approve_tag_request(
    db: Session,
    tag_request: TagRequest,
    *,
    reviewer: User,
    reviewer_note: str = "",
) -> None:
    if tag_request.status != TagRequestStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag request has already been reviewed")

    _get_parent_or_404(db, tag_request.parent_id)
    _require_slug_available(db, tag_request.proposed_slug)
    tag = Tag(
        name=tag_request.proposed_name,
        slug=tag_request.proposed_slug,
        description=tag_request.description,
        parent_id=tag_request.parent_id,
        created_by_id=tag_request.requested_by_id,
        approved_by_id=reviewer.id,
    )
    db.add(tag)
    db.flush()

    tag_request.status = TagRequestStatus.APPROVED
    tag_request.reviewed_by_id = reviewer.id
    tag_request.reviewer_note = reviewer_note
    tag_request.reviewed_at = datetime.now().astimezone()
    tag_request.created_tag_id = tag.id


def reject_tag_request(
    db: Session,
    tag_request: TagRequest,
    *,
    reviewer: User,
    reviewer_note: str = "",
) -> None:
    if tag_request.status != TagRequestStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag request has already been reviewed")

    tag_request.status = TagRequestStatus.REJECTED
    tag_request.reviewed_by_id = reviewer.id
    tag_request.reviewer_note = reviewer_note
    tag_request.reviewed_at = datetime.now().astimezone()


def tag_ancestors(tags_by_id: dict[int, Tag], tag: Tag) -> list[Tag]:
    ancestors: list[Tag] = []
    parent_id = tag.parent_id
    seen_ids: set[int] = set()
    while parent_id is not None and parent_id not in seen_ids:
        seen_ids.add(parent_id)
        parent = tags_by_id.get(parent_id)
        if parent is None:
            break
        ancestors.append(parent)
        parent_id = parent.parent_id
    ancestors.reverse()
    return ancestors


def _book_summary_options():
    return (
        selectinload(Book.authors).joinedload(BookAuthor.author),
        selectinload(Book.titles).joinedload(BookTitle.language),
        selectinload(Book.covers),
    )


def _book_rating_subquery():
    return (
        select(
            UserBook.book_id.label("book_id"),
            func.avg(UserBook.rating).label("average_rating"),
            func.count(UserBook.rating).label("rating_count"),
        )
        .group_by(UserBook.book_id)
        .subquery()
    )


def _book_summary_with_rating(book: Book, average_rating: float | None, rating_count: int | None) -> BookSummary:
    return BookSummary.model_validate(book).model_copy(
        update={
            "average_rating": round(float(average_rating), 2) if average_rating is not None else None,
            "rating_count": int(rating_count or 0),
        }
    )


def get_tag_detail(
    db: Session,
    tag_id: int,
    *,
    show_all: bool = False,
    show_spoilers: bool = False,
) -> TagDetail:
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    positive_vote = case((BookTagVote.vote > 0, 1), else_=0)
    downvote = case((BookTagVote.vote < 0, 1), else_=0)
    positive_rating = case((BookTagVote.vote > 0, BookTagVote.vote), else_=None)
    spoiler_vote = case(((BookTagVote.vote > 0) & (BookTagVote.spoiler_level > 0), 1), else_=0)
    positive_spoiler_level = case((BookTagVote.vote > 0, BookTagVote.spoiler_level), else_=0)
    tag_book_aggregate = (
        select(
            BookTagVote.book_id.label("book_id"),
            func.sum(BookTagVote.vote).label("score"),
            func.count(BookTagVote.id).label("vote_count"),
            func.sum(positive_vote).label("positive_vote_count"),
            func.sum(downvote).label("downvote_count"),
            func.sum(spoiler_vote).label("spoiler_vote_count"),
            func.max(positive_spoiler_level).label("aggregate_spoiler_level"),
            func.avg(positive_rating).label("average_positive_rating"),
        )
        .where(BookTagVote.tag_id == tag_id)
        .group_by(BookTagVote.book_id)
        .subquery()
    )
    rating_subquery = _book_rating_subquery()
    statement = (
        select(
            Book,
            tag_book_aggregate.c.score,
            tag_book_aggregate.c.vote_count,
            tag_book_aggregate.c.positive_vote_count,
            tag_book_aggregate.c.downvote_count,
            tag_book_aggregate.c.spoiler_vote_count,
            tag_book_aggregate.c.aggregate_spoiler_level,
            tag_book_aggregate.c.average_positive_rating,
            rating_subquery.c.average_rating,
            rating_subquery.c.rating_count,
        )
        .join(tag_book_aggregate, tag_book_aggregate.c.book_id == Book.id)
        .outerjoin(rating_subquery, rating_subquery.c.book_id == Book.id)
        .options(*_book_summary_options())
        .order_by(
            tag_book_aggregate.c.score.desc(),
            tag_book_aggregate.c.average_positive_rating.desc().nullslast(),
            tag_book_aggregate.c.vote_count.desc(),
            Book.id.asc(),
        )
    )

    books: list[TaggedBookSummary] = []
    for (
        book,
        score,
        vote_count,
        positive_vote_count,
        downvote_count,
        spoiler_vote_count,
        aggregate_spoiler_level,
        average_positive_rating,
        average_rating,
        rating_count,
    ) in db.execute(statement).all():
        score_value = int(score or 0)
        aggregate_spoiler_level_value = int(aggregate_spoiler_level or 0)
        if score_value <= 0 and not show_all:
            continue
        if aggregate_spoiler_level_value > 0 and not show_spoilers:
            continue

        books.append(
            TaggedBookSummary(
                book=_book_summary_with_rating(book, average_rating, rating_count),
                relevance_score=score_value,
                vote_count=int(vote_count or 0),
                positive_vote_count=int(positive_vote_count or 0),
                downvote_count=int(downvote_count or 0),
                spoiler_vote_count=int(spoiler_vote_count or 0),
                aggregate_spoiler_level=aggregate_spoiler_level_value,
                average_positive_rating=(
                    round(float(average_positive_rating), 2)
                    if average_positive_rating is not None
                    else None
                ),
            )
        )

    children = db.scalars(select(Tag).where(Tag.parent_id == tag_id).order_by(Tag.name.asc(), Tag.id.asc())).all()
    return TagDetail(
        **TagRead.model_validate(tag).model_dump(),
        parent=TagRead.model_validate(tag.parent) if tag.parent is not None else None,
        children=[TagRead.model_validate(child) for child in children],
        books=books,
    )


def list_book_tag_aggregates(
    db: Session,
    book_id: int,
    *,
    current_user: User | None = None,
    show_all: bool = False,
    show_spoilers: bool = False,
) -> list[BookTagAggregate]:
    tags_by_id = {tag.id: tag for tag in db.scalars(select(Tag)).all()}
    current_user_votes: dict[int, BookTagVote] = {}

    if current_user is not None:
        current_user_votes = {
            vote.tag_id: vote
            for vote in db.scalars(
                select(BookTagVote).where(
                    BookTagVote.book_id == book_id,
                    BookTagVote.user_id == current_user.id,
                )
            ).all()
        }

    positive_vote = case((BookTagVote.vote > 0, 1), else_=0)
    downvote = case((BookTagVote.vote < 0, 1), else_=0)
    positive_rating = case((BookTagVote.vote > 0, BookTagVote.vote), else_=None)
    spoiler_vote = case(((BookTagVote.vote > 0) & (BookTagVote.spoiler_level > 0), 1), else_=0)
    positive_spoiler_level = case((BookTagVote.vote > 0, BookTagVote.spoiler_level), else_=0)
    statement = (
        select(
            Tag,
            func.sum(BookTagVote.vote).label("score"),
            func.count(BookTagVote.id).label("vote_count"),
            func.sum(positive_vote).label("positive_vote_count"),
            func.sum(downvote).label("downvote_count"),
            func.sum(spoiler_vote).label("spoiler_vote_count"),
            func.max(positive_spoiler_level).label("aggregate_spoiler_level"),
            func.avg(positive_rating).label("average_positive_rating"),
        )
        .join(BookTagVote, BookTagVote.tag_id == Tag.id)
        .where(BookTagVote.book_id == book_id)
        .group_by(Tag.id)
        .order_by(
            func.sum(BookTagVote.vote).desc(),
            func.count(BookTagVote.id).desc(),
            Tag.name.asc(),
        )
    )

    aggregates: list[BookTagAggregate] = []
    for (
        tag,
        score,
        vote_count,
        positive_vote_count,
        downvote_count,
        spoiler_vote_count,
        aggregate_spoiler_level,
        average_positive_rating,
    ) in db.execute(statement).all():
        score_value = int(score or 0)
        aggregate_spoiler_level_value = int(aggregate_spoiler_level or 0)
        if score_value <= 0 and not show_all:
            continue
        if aggregate_spoiler_level_value > 0 and not show_spoilers:
            continue

        current_user_vote = current_user_votes.get(tag.id)
        current_user_spoiler_level = current_user_vote.spoiler_level if current_user_vote is not None else None

        aggregates.append(
            BookTagAggregate(
                tag=TagRead.model_validate(tag),
                ancestors=[TagRead.model_validate(ancestor) for ancestor in tag_ancestors(tags_by_id, tag)],
                score=score_value,
                vote_count=int(vote_count or 0),
                positive_vote_count=int(positive_vote_count or 0),
                downvote_count=int(downvote_count or 0),
                spoiler_vote_count=int(spoiler_vote_count or 0),
                aggregate_spoiler_level=aggregate_spoiler_level_value,
                is_spoiler=aggregate_spoiler_level_value > 0,
                average_positive_rating=(
                    round(float(average_positive_rating), 2)
                    if average_positive_rating is not None
                    else None
                ),
                current_user_vote=current_user_vote.vote if current_user_vote is not None else None,
                current_user_spoiler_level=current_user_spoiler_level,
                current_user_spoiler=(
                    current_user_spoiler_level > 0
                    if current_user_spoiler_level is not None
                    else None
                ),
            )
        )
    return aggregates
