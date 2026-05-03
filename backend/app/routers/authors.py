from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.author import Author
from app.schemas.author import AuthorCreate, AuthorRead, AuthorUpdate

router = APIRouter(prefix="/authors", tags=["authors"])


@router.get("", response_model=list[AuthorRead])
def list_authors(db: Annotated[Session, Depends(get_db)], limit: int = 50, offset: int = 0):
    statement = select(Author).order_by(Author.sort_name, Author.name).limit(limit).offset(offset)
    return db.scalars(statement).all()


@router.post("", response_model=AuthorRead, status_code=status.HTTP_201_CREATED)
def create_author(payload: AuthorCreate, db: Annotated[Session, Depends(get_db)]):
    author = Author(**payload.model_dump())
    db.add(author)
    db.commit()
    db.refresh(author)
    return author


@router.get("/{author_id}", response_model=AuthorRead)
def get_author(author_id: int, db: Annotated[Session, Depends(get_db)]):
    author = db.get(Author, author_id)
    if author is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")
    return author


@router.patch("/{author_id}", response_model=AuthorRead)
def update_author(author_id: int, payload: AuthorUpdate, db: Annotated[Session, Depends(get_db)]):
    author = db.get(Author, author_id)
    if author is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(author, key, value)

    db.commit()
    db.refresh(author)
    return author
