from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.author import Author
from app.models.entry import EntryRevision, EntryTargetType
from app.models.user import User
from app.schemas.author import AuthorCreate, AuthorRead, AuthorUpdate
from app.schemas.entry import EntryRevisionRead
from app.security import require_admin_user
from app.services.entries import create_author_entry, update_author_entry

router = APIRouter(prefix="/authors", tags=["authors"])


@router.get("", response_model=list[AuthorRead])
def list_authors(db: Annotated[Session, Depends(get_db)], limit: int = 50, offset: int = 0):
    statement = select(Author).order_by(Author.sort_name, Author.name).limit(limit).offset(offset)
    return db.scalars(statement).all()


@router.post("", response_model=AuthorRead, status_code=status.HTTP_201_CREATED)
def create_author(
    payload: AuthorCreate,
    current_user: Annotated[User, Depends(require_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    change_note: str = "",
):
    return create_author_entry(db, payload, changed_by=current_user, change_note=change_note)


@router.get("/{author_id}", response_model=AuthorRead)
def get_author(author_id: int, db: Annotated[Session, Depends(get_db)]):
    author = db.get(Author, author_id)
    if author is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")
    return author


@router.patch("/{author_id}", response_model=AuthorRead)
def update_author(
    author_id: int,
    payload: AuthorUpdate,
    current_user: Annotated[User, Depends(require_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    change_note: str = "",
):
    return update_author_entry(db, author_id, payload, changed_by=current_user, change_note=change_note)


@router.get("/{author_id}/history", response_model=list[EntryRevisionRead])
def list_author_history(author_id: int, db: Annotated[Session, Depends(get_db)]):
    if db.get(Author, author_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")

    statement = (
        select(EntryRevision)
        .where(
            EntryRevision.entity_type == EntryTargetType.AUTHOR,
            EntryRevision.entity_id == author_id,
        )
        .order_by(EntryRevision.created_at.desc(), EntryRevision.id.desc())
    )
    return db.scalars(statement).all()
