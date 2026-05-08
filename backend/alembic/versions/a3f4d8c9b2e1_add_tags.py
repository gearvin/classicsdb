"""add tags

Revision ID: a3f4d8c9b2e1
Revises: 8b6e1b3b6c4f
Create Date: 2026-05-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a3f4d8c9b2e1"
down_revision: Union[str, Sequence[str], None] = "8b6e1b3b6c4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    tag_request_status = sa.Enum("PENDING", "APPROVED", "REJECTED", name="tag_request_status")

    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("approved_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["approved_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["tags.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tags_approved_by_id"), "tags", ["approved_by_id"], unique=False)
    op.create_index(op.f("ix_tags_created_by_id"), "tags", ["created_by_id"], unique=False)
    op.create_index(op.f("ix_tags_parent_id"), "tags", ["parent_id"], unique=False)
    op.create_index(op.f("ix_tags_slug"), "tags", ["slug"], unique=True)

    op.create_table(
        "book_tag_votes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("book_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("vote", sa.Integer(), nullable=False),
        sa.Column("is_spoiler", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("vote IN (-1, 1, 2, 3)", name="ck_book_tag_votes_vote"),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("book_id", "tag_id", "user_id", name="uq_book_tag_votes_user"),
    )
    op.create_index("ix_book_tag_votes_book_tag", "book_tag_votes", ["book_id", "tag_id"], unique=False)
    op.create_index(op.f("ix_book_tag_votes_book_id"), "book_tag_votes", ["book_id"], unique=False)
    op.create_index(op.f("ix_book_tag_votes_tag_id"), "book_tag_votes", ["tag_id"], unique=False)
    op.create_index(op.f("ix_book_tag_votes_user_id"), "book_tag_votes", ["user_id"], unique=False)

    op.create_table(
        "tag_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("requested_by_id", sa.Integer(), nullable=False),
        sa.Column("reviewed_by_id", sa.Integer(), nullable=True),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("proposed_name", sa.String(length=120), nullable=False),
        sa.Column("proposed_slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("submitter_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("reviewer_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", tag_request_status, nullable=False),
        sa.Column("created_tag_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_tag_id"], ["tags.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["tags.id"]),
        sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("created_tag_id"),
    )
    op.create_index("ix_tag_requests_parent_id", "tag_requests", ["parent_id"], unique=False)
    op.create_index("ix_tag_requests_status", "tag_requests", ["status"], unique=False)
    op.create_index(op.f("ix_tag_requests_proposed_slug"), "tag_requests", ["proposed_slug"], unique=False)
    op.create_index(op.f("ix_tag_requests_requested_by_id"), "tag_requests", ["requested_by_id"], unique=False)
    op.create_index(op.f("ix_tag_requests_reviewed_by_id"), "tag_requests", ["reviewed_by_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_tag_requests_reviewed_by_id"), table_name="tag_requests")
    op.drop_index(op.f("ix_tag_requests_requested_by_id"), table_name="tag_requests")
    op.drop_index(op.f("ix_tag_requests_proposed_slug"), table_name="tag_requests")
    op.drop_index("ix_tag_requests_status", table_name="tag_requests")
    op.drop_index("ix_tag_requests_parent_id", table_name="tag_requests")
    op.drop_table("tag_requests")

    op.drop_index(op.f("ix_book_tag_votes_user_id"), table_name="book_tag_votes")
    op.drop_index(op.f("ix_book_tag_votes_tag_id"), table_name="book_tag_votes")
    op.drop_index(op.f("ix_book_tag_votes_book_id"), table_name="book_tag_votes")
    op.drop_index("ix_book_tag_votes_book_tag", table_name="book_tag_votes")
    op.drop_table("book_tag_votes")

    op.drop_index(op.f("ix_tags_slug"), table_name="tags")
    op.drop_index(op.f("ix_tags_parent_id"), table_name="tags")
    op.drop_index(op.f("ix_tags_created_by_id"), table_name="tags")
    op.drop_index(op.f("ix_tags_approved_by_id"), table_name="tags")
    op.drop_table("tags")

    sa.Enum(name="tag_request_status").drop(op.get_bind(), checkfirst=True)
