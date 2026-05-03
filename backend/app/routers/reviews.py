from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models.review import Review
from app.models.user import User, UserBook, UserBookEdition
from app.schemas.review import ReviewCreate, ReviewRead, ReviewUpdate
from app.security import get_current_active_user

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _review_options():
    return (
        selectinload(Review.votes),
        selectinload(Review.user_book),
        selectinload(Review.user_book_edition),
    )


def _get_owned_user_book(db: Session, user_book_id: int, user_id: int) -> UserBook:
    user_book = db.get(UserBook, user_book_id)
    if user_book is None or user_book.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User book not found")
    return user_book


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
    _get_owned_user_book(db, payload.user_book_id, current_user.id)
    _validate_user_book_edition(db, payload.user_book_id, payload.user_book_edition_id)

    review = Review(**payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return db.scalar(select(Review).options(*_review_options()).where(Review.id == review.id))


@router.get("/{review_id}", response_model=ReviewRead)
def get_review(review_id: int, db: Annotated[Session, Depends(get_db)]):
    review = db.scalar(select(Review).options(*_review_options()).where(Review.id == review_id))
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review


@router.patch("/{review_id}", response_model=ReviewRead)
def update_review(
    review_id: int,
    payload: ReviewUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    review = db.scalar(select(Review).options(*_review_options()).where(Review.id == review_id))
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review.user_book.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    updates = payload.model_dump(exclude_unset=True)
    if "user_book_edition_id" in updates:
        _validate_user_book_edition(db, review.user_book_id, updates["user_book_edition_id"])

    for key, value in updates.items():
        setattr(review, key, value)

    db.commit()
    db.refresh(review)
    return db.scalar(select(Review).options(*_review_options()).where(Review.id == review.id))
