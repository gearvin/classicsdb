from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models.review import Review, ReviewComment, ReviewVote
from app.models.user import ReadingStatus, User, UserBook, UserBookEdition
from app.routers.books import _book_summary_options
from app.schemas.review import (
    ReviewCommentCreate,
    ReviewCommentRead,
    ReviewCreate,
    ReviewRead,
    ReviewUpdate,
    ReviewVoteCreate,
    ReviewVoteRead,
)
from app.security import get_current_active_user

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _review_options():
    return (
        selectinload(Review.votes),
        selectinload(Review.comments),
        selectinload(Review.user_book).selectinload(UserBook.user),
        selectinload(Review.user_book).selectinload(UserBook.book).options(*_book_summary_options()),
        selectinload(Review.user_book_edition),
    )


def _get_owned_user_book(db: Session, user_book_id: int, user_id: int) -> UserBook:
    user_book = db.get(UserBook, user_book_id)
    if user_book is None or user_book.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User book not found")
    return user_book


def _require_reviewable_user_book(user_book: UserBook) -> None:
    if user_book.status != ReadingStatus.READ and user_book.rating is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mark this book as read or rate it before reviewing it",
        )


def _validate_user_book_edition(
    db: Session,
    user_book_id: int,
    user_book_edition_id: int | None,
) -> UserBookEdition | None:
    if user_book_edition_id is None:
        return None
    user_book_edition = db.get(UserBookEdition, user_book_edition_id)
    if user_book_edition is None or user_book_edition.user_book_id != user_book_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User book edition does not belong to user book",
        )
    return user_book_edition


def _get_review_or_404(db: Session, review_id: int) -> Review:
    review = db.scalar(select(Review).options(*_review_options()).where(Review.id == review_id))
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review


def _comment_options():
    return (
        selectinload(ReviewComment.author),
    )


@router.get("", response_model=list[ReviewRead])
def list_reviews(
    db: Annotated[Session, Depends(get_db)],
    book_id: int | None = None,
    user_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
):
    statement = (
        select(Review)
        .options(*_review_options())
        .join(UserBook, Review.user_book_id == UserBook.id)
        .order_by(Review.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if book_id is not None:
        statement = statement.where(UserBook.book_id == book_id)
    if user_id is not None:
        statement = statement.where(UserBook.user_id == user_id)
    return db.scalars(statement).all()


@router.post("", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ReviewCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    user_book = _get_owned_user_book(db, payload.user_book_id, current_user.id)
    _require_reviewable_user_book(user_book)
    _validate_user_book_edition(db, payload.user_book_id, payload.user_book_edition_id)

    review = Review(**payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return db.scalar(select(Review).options(*_review_options()).where(Review.id == review.id))


@router.get("/{review_id}", response_model=ReviewRead)
def get_review(review_id: int, db: Annotated[Session, Depends(get_db)]):
    return _get_review_or_404(db, review_id)


@router.get("/{review_id}/comments", response_model=list[ReviewCommentRead])
def list_review_comments(review_id: int, db: Annotated[Session, Depends(get_db)]):
    _get_review_or_404(db, review_id)
    statement = (
        select(ReviewComment)
        .options(*_comment_options())
        .where(ReviewComment.review_id == review_id)
        .order_by(ReviewComment.created_at.asc(), ReviewComment.id.asc())
    )
    return db.scalars(statement).all()


@router.post("/{review_id}/comments", response_model=ReviewCommentRead, status_code=status.HTTP_201_CREATED)
def create_review_comment(
    review_id: int,
    payload: ReviewCommentCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _get_review_or_404(db, review_id)
    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comment cannot be empty")

    comment = ReviewComment(review_id=review_id, user_id=current_user.id, body=body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return db.scalar(select(ReviewComment).options(*_comment_options()).where(ReviewComment.id == comment.id))


@router.patch("/{review_id}", response_model=ReviewRead)
def update_review(
    review_id: int,
    payload: ReviewUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    review = _get_review_or_404(db, review_id)
    if review.user_book.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    _require_reviewable_user_book(review.user_book)

    updates = payload.model_dump(exclude_unset=True)
    if "user_book_edition_id" in updates:
        _validate_user_book_edition(db, review.user_book_id, updates["user_book_edition_id"])

    for key, value in updates.items():
        setattr(review, key, value)

    db.commit()
    db.refresh(review)
    return db.scalar(select(Review).options(*_review_options()).where(Review.id == review.id))


@router.get("/{review_id}/vote", response_model=ReviewVoteRead | None)
def get_my_review_vote(
    review_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _get_review_or_404(db, review_id)
    return db.get(ReviewVote, {"review_id": review_id, "user_id": current_user.id})


@router.post("/{review_id}/vote", response_model=ReviewRead)
def vote_review(
    review_id: int,
    payload: ReviewVoteCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    review = _get_review_or_404(db, review_id)
    if review.user_book.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot vote on your own review")

    vote = db.get(ReviewVote, {"review_id": review_id, "user_id": current_user.id})
    if vote is None:
        vote = ReviewVote(review_id=review_id, user_id=current_user.id, is_helpful=payload.is_helpful)
        db.add(vote)
    else:
        vote.is_helpful = payload.is_helpful

    db.commit()
    return _get_review_or_404(db, review_id)


@router.delete("/{review_id}/vote", response_model=ReviewRead)
def clear_review_vote(
    review_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _get_review_or_404(db, review_id)
    vote = db.get(ReviewVote, {"review_id": review_id, "user_id": current_user.id})
    if vote is not None:
        db.delete(vote)
        db.commit()

    return _get_review_or_404(db, review_id)
