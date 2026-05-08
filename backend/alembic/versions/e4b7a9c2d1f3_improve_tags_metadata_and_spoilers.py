"""improve tags metadata and spoilers

Revision ID: e4b7a9c2d1f3
Revises: c7d9e1a4b6f2
Create Date: 2026-05-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e4b7a9c2d1f3"
down_revision: Union[str, Sequence[str], None] = "c7d9e1a4b6f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("tags", sa.Column("aliases", sa.Text(), nullable=False, server_default=""))
    op.add_column("tags", sa.Column("default_spoiler_level", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("tags", sa.Column("is_applicable", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.execute(
        "UPDATE tags SET is_applicable = false "
        "WHERE slug IN ('theme', 'character', 'style', 'plot', 'setting')"
    )
    op.create_check_constraint(
        "ck_tags_default_spoiler_level",
        "tags",
        "default_spoiler_level IN (0, 1, 2)",
    )

    op.add_column("book_tag_votes", sa.Column("spoiler_level", sa.Integer(), nullable=False, server_default="0"))
    op.execute(
        "UPDATE book_tag_votes "
        "SET spoiler_level = CASE WHEN is_spoiler THEN 2 ELSE 0 END"
    )
    op.create_check_constraint(
        "ck_book_tag_votes_spoiler_level",
        "book_tag_votes",
        "spoiler_level IN (0, 1, 2)",
    )
    op.drop_column("book_tag_votes", "is_spoiler")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column("book_tag_votes", sa.Column("is_spoiler", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.execute(
        "UPDATE book_tag_votes "
        "SET is_spoiler = CASE WHEN spoiler_level > 0 THEN true ELSE false END"
    )
    op.drop_constraint("ck_book_tag_votes_spoiler_level", "book_tag_votes", type_="check")
    op.drop_column("book_tag_votes", "spoiler_level")

    op.drop_constraint("ck_tags_default_spoiler_level", "tags", type_="check")
    op.drop_column("tags", "is_applicable")
    op.drop_column("tags", "default_spoiler_level")
    op.drop_column("tags", "aliases")
