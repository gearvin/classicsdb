from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import SessionLocal
from app.models.book import Language
from app.reference.languages import LANGUAGES


def seed_languages() -> int:
    with SessionLocal() as db:
        for language_data in LANGUAGES:
            db.merge(Language(**language_data))
        db.commit()
    return len(LANGUAGES)


def main() -> None:
    count = seed_languages()
    print(f"Seeded {count} languages.")


if __name__ == "__main__":
    main()
