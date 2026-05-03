from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.book import Language
from app.schemas.language import LanguageRead

router = APIRouter(prefix="/languages", tags=["languages"])


@router.get("", response_model=list[LanguageRead])
def list_languages(db: Annotated[Session, Depends(get_db)]):
    return db.scalars(select(Language).order_by(Language.name, Language.code)).all()
