from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app.models  # noqa: F401  # Import models so SQLAlchemy registers every table.
from app.db.session import SessionLocal
from app.models import Tag, User
from app.reference.tags import TAG_TREE, TagSeed
from app.services.tags import normalize_tag_slug


def _find_seed_admin(db: Session) -> User | None:
    return db.scalar(select(User).where(User.is_admin.is_(True)).order_by(User.id.asc()).limit(1))


def _upsert_tag(
    db: Session,
    seed: TagSeed,
    *,
    parent: Tag | None,
    admin: User | None,
) -> tuple[Tag, bool]:
    slug = normalize_tag_slug(seed.name)
    tag = db.scalar(select(Tag).where(Tag.slug == slug))
    created = tag is None

    if tag is None:
        tag = Tag(
            name=seed.name,
            slug=slug,
            created_by_id=admin.id if admin is not None else None,
            approved_by_id=admin.id if admin is not None else None,
        )
        db.add(tag)

    tag.name = seed.name
    tag.description = seed.description
    tag.parent = parent
    tag.is_applicable = parent is not None
    if tag.approved_by_id is None and admin is not None:
        tag.approved_by_id = admin.id
    if tag.created_by_id is None and admin is not None:
        tag.created_by_id = admin.id

    db.flush()
    return tag, created


def _seed_branch(
    db: Session,
    seed: TagSeed,
    *,
    parent: Tag | None,
    admin: User | None,
) -> int:
    tag, created = _upsert_tag(db, seed, parent=parent, admin=admin)
    created_count = 1 if created else 0
    for child in seed.children:
        created_count += _seed_branch(db, child, parent=tag, admin=admin)
    return created_count


def seed_tags(db: Session) -> int:
    admin = _find_seed_admin(db)
    created_count = 0
    for root in TAG_TREE:
        created_count += _seed_branch(db, root, parent=None, admin=admin)
    return created_count


def main() -> None:
    with SessionLocal() as db:
        created_count = seed_tags(db)
        db.commit()

    print(f"Seeded tags. Created {created_count} new tags.")


if __name__ == "__main__":
    main()
