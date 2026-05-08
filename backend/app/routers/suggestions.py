from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.author import Author
from app.models.book import Book
from app.models.entry import EntrySuggestion, EntrySuggestionStatus, EntryTargetType
from app.models.user import User
from app.schemas.entry import EntrySuggestionCreate, EntrySuggestionRead, EntrySuggestionReview
from app.security import get_current_active_user, require_admin_user
from app.services.entries import approve_suggestion, reject_suggestion

router = APIRouter(prefix="/suggestions", tags=["suggestions"])
admin_router = APIRouter(prefix="/admin/suggestions", tags=["admin suggestions"])


def _validate_suggestion_target(db: Session, payload: EntrySuggestionCreate) -> None:
    if payload.target_type == EntryTargetType.AUTHOR and payload.target_id is not None:
        if db.get(Author, payload.target_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")

    if payload.target_type == EntryTargetType.BOOK and payload.target_id is not None:
        if db.get(Book, payload.target_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    if payload.target_type == EntryTargetType.BOOK_EDITION:
        if payload.target_id is None or db.get(Book, payload.target_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")


@router.post("", response_model=EntrySuggestionRead, status_code=status.HTTP_201_CREATED)
def create_suggestion(
    payload: EntrySuggestionCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _validate_suggestion_target(db, payload)
    suggestion = EntrySuggestion(
        suggested_by_id=current_user.id,
        target_type=payload.target_type,
        action=payload.action,
        target_id=payload.target_id,
        payload=payload.payload,
        submitter_note=payload.submitter_note,
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)
    return suggestion


@router.get("/me", response_model=list[EntrySuggestionRead])
def list_my_suggestions(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    statement = (
        select(EntrySuggestion)
        .where(EntrySuggestion.suggested_by_id == current_user.id)
        .order_by(EntrySuggestion.created_at.desc(), EntrySuggestion.id.desc())
    )
    return db.scalars(statement).all()


@router.get("/{suggestion_id}", response_model=EntrySuggestionRead)
def get_suggestion(
    suggestion_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    suggestion = db.get(EntrySuggestion, suggestion_id)
    if suggestion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")
    if suggestion.suggested_by_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")
    return suggestion


@admin_router.get("", response_model=list[EntrySuggestionRead])
def list_admin_suggestions(
    current_user: Annotated[User, Depends(require_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    suggestion_status: EntrySuggestionStatus | None = None,
):
    statement = select(EntrySuggestion).order_by(EntrySuggestion.created_at.desc(), EntrySuggestion.id.desc())
    if suggestion_status is not None:
        statement = statement.where(EntrySuggestion.status == suggestion_status)
    return db.scalars(statement).all()


@admin_router.post("/{suggestion_id}/review", response_model=EntrySuggestionRead)
def review_suggestion(
    suggestion_id: int,
    payload: EntrySuggestionReview,
    current_user: Annotated[User, Depends(require_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    suggestion = db.get(EntrySuggestion, suggestion_id)
    if suggestion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")

    if payload.status == EntrySuggestionStatus.APPROVED:
        approve_suggestion(db, suggestion, current_user, payload.reviewer_note)
    else:
        reject_suggestion(db, suggestion, current_user, payload.reviewer_note)

    db.commit()
    db.refresh(suggestion)
    return suggestion
