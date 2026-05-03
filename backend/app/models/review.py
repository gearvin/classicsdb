from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User, UserBook, UserBookEdition


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating IS NULL OR rating BETWEEN 1 AND 10", name="ck_review_rating_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_book_id: Mapped[int] = mapped_column(ForeignKey("user_books.id"), nullable=False, index=True)
    user_book_edition_id: Mapped[int | None] = mapped_column(ForeignKey("user_book_editions.id"), index=True)
    rating: Mapped[int | None] = mapped_column(Integer)
    contains_spoilers: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
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

    user_book: Mapped[UserBook] = relationship(back_populates="reviews")
    user_book_edition: Mapped[UserBookEdition | None] = relationship(back_populates="reviews")
    votes: Mapped[list[ReviewVote]] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
    )

    @property
    def helpful_count(self) -> int:
        return sum(1 for vote in self.votes if vote.is_helpful)

    @property
    def unhelpful_count(self) -> int:
        return sum(1 for vote in self.votes if not vote.is_helpful)


class ReviewVote(Base):
    __tablename__ = "review_votes"

    review_id: Mapped[int] = mapped_column(ForeignKey("reviews.id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    is_helpful: Mapped[bool] = mapped_column(Boolean, nullable=False)
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

    review: Mapped[Review] = relationship(back_populates="votes")
    user: Mapped[User] = relationship(back_populates="review_votes")
