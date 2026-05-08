"""add book tag vote spoiler flag

Revision ID: c7d9e1a4b6f2
Revises: a3f4d8c9b2e1
Create Date: 2026-05-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c7d9e1a4b6f2"
down_revision: Union[str, Sequence[str], None] = "a3f4d8c9b2e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        "ALTER TABLE book_tag_votes "
        "ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN DEFAULT false NOT NULL"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE book_tag_votes DROP COLUMN IF EXISTS is_spoiler")
