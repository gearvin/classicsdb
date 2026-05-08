from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.book import Book, BookEdition
from app.models.review import Review
from app.models.user import User, UserBook, UserBookEdition
from app.routers.reviews import _review_options
from app.schemas.review import ReviewRead
from app.schemas.user import (
    UserBookCreate,
    UserBookEditionCreate,
    UserBookEditionRead,
    UserBookEditionUpdate,
    UserBookRead,
    UserBookUpdate,
    UserMeUpdate,
    UserPrivate,
    UserPublic,
)
from app.security import get_current_active_user

router = APIRouter(prefix="/users", tags=["users"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _get_owned_user_book(db: Session, user_book_id: int, user_id: int) -> UserBook:
    user_book = db.get(UserBook, user_book_id)
    if user_book is None or user_book.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User book not found")
    return user_book


@router.get("/me", response_model=UserPrivate)
def get_me(current_user: Annotated[User, Depends(get_current_active_user)]):
    return current_user


@router.patch("/me", response_model=UserPrivate)
def update_me(
    payload: UserMeUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("email") is None and "email" in updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email cannot be null")
    if updates.get("username") is None and "username" in updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be null")

    if "email" in updates and updates["email"] is not None:
        updates["email"] = _normalize_email(str(updates["email"]))

    if "email" in updates or "username" in updates:
        conditions = []
        if "email" in updates:
            conditions.append(User.email == updates["email"])
        if "username" in updates:
            conditions.append(User.username == updates["username"])
        existing_user = db.scalar(
            select(User).where(or_(*conditions), User.id != current_user.id)
        )
        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email or username already exists",
            )

    for key, value in updates.items():
        setattr(current_user, key, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email or username already exists",
        ) from exc
    db.refresh(current_user)
    return current_user


@router.get("", response_model=list[UserPublic])
def list_public_users(
    db: Annotated[Session, Depends(get_db)],
    limit: int = 50,
    offset: int = 0,
):
    statement = (
        select(User)
        .where(User.is_active.is_(True))
        .order_by(User.created_at.desc(), User.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return db.scalars(statement).all()


@router.get("/me/books", response_model=list[UserBookRead])
def list_my_books(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    statement = (
        select(UserBook)
        .where(UserBook.user_id == current_user.id)
        .order_by(UserBook.updated_at.desc(), UserBook.id.desc())
    )
    return db.scalars(statement).all()


@router.post("/me/books", response_model=UserBookRead, status_code=status.HTTP_201_CREATED)
def create_my_book(
    payload: UserBookCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if db.get(Book, payload.book_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    user_book = UserBook(user_id=current_user.id, **payload.model_dump())
    db.add(user_book)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Book is already in this user's library",
        ) from exc
    db.refresh(user_book)
    return user_book


@router.patch("/me/books/{user_book_id}", response_model=UserBookRead)
def update_my_book(
    user_book_id: int,
    payload: UserBookUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    user_book = _get_owned_user_book(db, user_book_id, current_user.id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user_book, key, value)

    db.commit()
    db.refresh(user_book)
    return user_book


@router.delete("/me/books/{user_book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_book(
    user_book_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    user_book = _get_owned_user_book(db, user_book_id, current_user.id)
    review_id = db.scalar(select(Review.id).where(Review.user_book_id == user_book.id).limit(1))
    if review_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This book has review activity and cannot be unshelved",
        )

    db.delete(user_book)
    db.commit()


@router.get("/me/books/{user_book_id}/editions", response_model=list[UserBookEditionRead])
def list_my_book_editions(
    user_book_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _get_owned_user_book(db, user_book_id, current_user.id)
    statement = (
        select(UserBookEdition)
        .where(UserBookEdition.user_book_id == user_book_id)
        .order_by(UserBookEdition.updated_at.desc(), UserBookEdition.id.desc())
    )
    return db.scalars(statement).all()


@router.post(
    "/me/books/{user_book_id}/editions",
    response_model=UserBookEditionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_my_book_edition(
    user_book_id: int,
    payload: UserBookEditionCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    user_book = _get_owned_user_book(db, user_book_id, current_user.id)
    if payload.edition_id is not None:
        edition = db.get(BookEdition, payload.edition_id)
        if edition is None or edition.book_id != user_book.book_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Edition does not belong to book")

    user_book_edition = UserBookEdition(user_book_id=user_book.id, **payload.model_dump())
    db.add(user_book_edition)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Edition is already tracked for this user book",
        ) from exc
    db.refresh(user_book_edition)
    return user_book_edition


@router.patch(
    "/me/books/{user_book_id}/editions/{user_book_edition_id}",
    response_model=UserBookEditionRead,
)
def update_my_book_edition(
    user_book_id: int,
    user_book_edition_id: int,
    payload: UserBookEditionUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _get_owned_user_book(db, user_book_id, current_user.id)
    user_book_edition = db.get(UserBookEdition, user_book_edition_id)
    if user_book_edition is None or user_book_edition.user_book_id != user_book_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User book edition not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user_book_edition, key, value)

    db.commit()
    db.refresh(user_book_edition)
    return user_book_edition


@router.get("/{username}", response_model=UserPublic)
def get_public_user(username: str, db: Annotated[Session, Depends(get_db)]):
    user = db.scalar(select(User).where(User.username == username, User.is_active.is_(True)))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("/{username}/books", response_model=list[UserBookRead])
def list_public_user_books(username: str, db: Annotated[Session, Depends(get_db)]):
    user = db.scalar(select(User).where(User.username == username, User.is_active.is_(True)))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    statement = (
        select(UserBook)
        .where(UserBook.user_id == user.id)
        .order_by(UserBook.updated_at.desc(), UserBook.id.desc())
    )
    return db.scalars(statement).all()


@router.get("/{username}/reviews", response_model=list[ReviewRead])
def list_public_user_reviews(
    username: str,
    db: Annotated[Session, Depends(get_db)],
    limit: int = 50,
    offset: int = 0,
):
    user = db.scalar(select(User).where(User.username == username, User.is_active.is_(True)))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    statement = (
        select(Review)
        .options(*_review_options())
        .join(UserBook, Review.user_book_id == UserBook.id)
        .where(UserBook.user_id == user.id, Review.is_public.is_(True))
        .order_by(Review.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return db.scalars(statement).all()
