from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.book import BookAuthor, EditionContributor


# todo: handle alternative names
class Author(Base):
    __tablename__ = "authors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    sort_name: Mapped[str | None] = mapped_column(String(255), index=True)
    bio: Mapped[str] = mapped_column(Text, default="", nullable=False)
    birth_year: Mapped[int | None] = mapped_column(Integer)
    death_year: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    books: Mapped[list[BookAuthor]] = relationship(
        back_populates="author",
        cascade="all, delete-orphan",
    )
    edition_contributions: Mapped[list[EditionContributor]] = relationship(
        back_populates="author",
        cascade="all, delete-orphan",
    )
