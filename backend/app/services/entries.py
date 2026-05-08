from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.author import Author
from app.models.book import (
    Book,
    BookAuthor,
    BookCover,
    BookEdition,
    BookLanguage,
    BookTitle,
    EditionContributor,
    EditionCover,
    EditionTitle,
    Language,
)
from app.models.entry import EntryAction, EntryRevision, EntrySuggestion, EntrySuggestionStatus, EntryTargetType
from app.models.user import User
from app.schemas.author import AuthorCreate, AuthorUpdate
from app.schemas.book import BookCreate, BookEditionCreate, BookUpdate


def _json_value(value: Any) -> Any:
    if hasattr(value, "value"):
        return value.value
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def _get_language_by_code(db: Session, code: str | None, field_name: str = "language_code") -> Language | None:
    if code is None:
        return None
    language = db.scalar(select(Language).where(Language.code == code.strip().lower()))
    if language is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        )
    return language


def _require_exactly_one_primary(items: list, label: str) -> None:
    primary_count = sum(1 for item in items if item.is_primary)
    if primary_count != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exactly one primary {label} is required",
        )


def _require_at_most_one_primary(items: list, label: str) -> None:
    primary_count = sum(1 for item in items if item.is_primary)
    if primary_count > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only one primary {label} is allowed",
        )


def _require_unique_book_languages(items: list) -> None:
    seen = set()
    for item in items:
        key = (item.language_code.strip().lower(), item.role)
        if key in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate book language role",
            )
        seen.add(key)


def _require_unique_book_authors(items: list) -> None:
    seen = set()
    for item in items:
        key = (item.author_id, item.role)
        if key in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate book contributor role",
            )
        seen.add(key)


def _require_unique_book_titles(items: list) -> None:
    seen = set()
    for item in items:
        key = (
            item.title.strip(),
            item.language_code.strip().lower(),
            item.title_type,
        )
        if key in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate book title",
            )
        seen.add(key)


def _build_book_title(db: Session, payload) -> BookTitle:
    language = _get_language_by_code(db, payload.language_code)
    title_data = payload.model_dump(exclude={"language_code"})
    return BookTitle(**title_data, language_code=language.code)


def _build_book_language(db: Session, payload) -> BookLanguage:
    language = _get_language_by_code(db, payload.language_code)
    language_data = payload.model_dump(exclude={"language_code"})
    return BookLanguage(**language_data, language_code=language.code)


def _build_book_authors(db: Session, payloads) -> list[BookAuthor]:
    author_ids = [author.author_id for author in payloads]
    if not author_ids:
        return []

    found_authors = set(db.scalars(select(Author.id).where(Author.id.in_(author_ids))).all())
    missing_authors = set(author_ids) - found_authors
    if missing_authors:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")

    return [BookAuthor(**author.model_dump()) for author in payloads]


def _build_edition_title(db: Session, payload) -> EditionTitle:
    language = _get_language_by_code(db, payload.language_code)
    title_data = payload.model_dump(exclude={"language_code"})
    return EditionTitle(**title_data, language_code=language.code)


def _build_edition_contributors(db: Session, payloads) -> list[EditionContributor]:
    contributor_ids = [contributor.author_id for contributor in payloads]
    if not contributor_ids:
        return []

    found = set(db.scalars(select(Author.id).where(Author.id.in_(contributor_ids))).all())
    missing = set(contributor_ids) - found
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contributor not found")

    return [EditionContributor(**contributor.model_dump()) for contributor in payloads]


def _book_snapshot_options():
    return (
        selectinload(Book.languages).joinedload(BookLanguage.language),
        selectinload(Book.titles).joinedload(BookTitle.language),
        selectinload(Book.covers),
        selectinload(Book.authors).joinedload(BookAuthor.author),
    )


def _edition_snapshot_options():
    return (
        selectinload(BookEdition.language),
        selectinload(BookEdition.titles).joinedload(EditionTitle.language),
        selectinload(BookEdition.covers),
        selectinload(BookEdition.contributors).joinedload(EditionContributor.author),
    )


def _load_book_for_snapshot(db: Session, book_id: int) -> Book:
    book = db.scalar(select(Book).options(*_book_snapshot_options()).where(Book.id == book_id))
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return book


def _load_edition_for_snapshot(db: Session, edition_id: int) -> BookEdition:
    edition = db.scalar(select(BookEdition).options(*_edition_snapshot_options()).where(BookEdition.id == edition_id))
    if edition is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edition not found")
    return edition


def snapshot_author(author: Author) -> dict[str, Any]:
    return {
        "id": author.id,
        "name": author.name,
        "sort_name": author.sort_name,
        "bio": author.bio,
        "birth_year": author.birth_year,
        "death_year": author.death_year,
    }


def snapshot_book(book: Book) -> dict[str, Any]:
    return {
        "id": book.id,
        "description": book.description,
        "first_published_year": book.first_published_year,
        "work_type": _json_value(book.work_type),
        "titles": [
            {
                "id": title.id,
                "title": title.title,
                "language_code": title.language_code,
                "title_type": _json_value(title.title_type),
                "is_primary": title.is_primary,
                "position": title.position,
            }
            for title in sorted(book.titles, key=lambda item: (item.position, item.id or 0))
        ],
        "languages": [
            {
                "language_code": language.language_code,
                "role": _json_value(language.role),
                "position": language.position,
            }
            for language in sorted(book.languages, key=lambda item: (item.position, item.language_code, _json_value(item.role)))
        ],
        "covers": [
            {
                "id": cover.id,
                "url": cover.url,
                "is_primary": cover.is_primary,
                "source": cover.source,
            }
            for cover in sorted(book.covers, key=lambda item: (not item.is_primary, item.id or 0))
        ],
        "authors": [
            {
                "author_id": author.author_id,
                "author_name": author.author.name,
                "role": _json_value(author.role),
                "position": author.position,
            }
            for author in sorted(book.authors, key=lambda item: (item.position, item.author_id, _json_value(item.role)))
        ],
    }


def snapshot_edition(edition: BookEdition) -> dict[str, Any]:
    return {
        "id": edition.id,
        "book_id": edition.book_id,
        "isbn_10": edition.isbn_10,
        "isbn_13": edition.isbn_13,
        "publisher": edition.publisher,
        "publication_date": _json_value(edition.publication_date),
        "language_code": edition.language_code,
        "format": _json_value(edition.format),
        "page_count": edition.page_count,
        "description": edition.description,
        "titles": [
            {
                "id": title.id,
                "language_code": title.language_code,
                "title": title.title,
                "subtitle": title.subtitle,
                "title_type": _json_value(title.title_type),
                "is_primary": title.is_primary,
            }
            for title in sorted(edition.titles, key=lambda item: (not item.is_primary, item.id or 0))
        ],
        "covers": [
            {
                "id": cover.id,
                "url": cover.url,
                "is_primary": cover.is_primary,
                "source": cover.source,
            }
            for cover in sorted(edition.covers, key=lambda item: (not item.is_primary, item.id or 0))
        ],
        "contributors": [
            {
                "author_id": contributor.author_id,
                "author_name": contributor.author.name,
                "role": _json_value(contributor.role),
                "position": contributor.position,
            }
            for contributor in sorted(
                edition.contributors,
                key=lambda item: (item.position, item.author_id, _json_value(item.role)),
            )
        ],
    }


def _record_revision(
    db: Session,
    *,
    entity_type: EntryTargetType,
    entity_id: int,
    action: EntryAction,
    changed_by: User,
    before_payload: dict[str, Any] | None,
    after_payload: dict[str, Any],
    suggestion: EntrySuggestion | None = None,
    change_note: str = "",
) -> EntryRevision:
    revision = EntryRevision(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        changed_by_id=changed_by.id,
        suggestion_id=suggestion.id if suggestion is not None else None,
        before_payload=before_payload,
        after_payload=after_payload,
        change_note=change_note,
    )
    db.add(revision)
    return revision


def create_author_entry(
    db: Session,
    payload: AuthorCreate,
    *,
    changed_by: User,
    suggestion: EntrySuggestion | None = None,
    change_note: str = "",
    commit: bool = True,
) -> Author:
    author = Author(**payload.model_dump())
    db.add(author)
    db.flush()
    _record_revision(
        db,
        entity_type=EntryTargetType.AUTHOR,
        entity_id=author.id,
        action=EntryAction.CREATE,
        changed_by=changed_by,
        suggestion=suggestion,
        before_payload=None,
        after_payload=snapshot_author(author),
        change_note=change_note,
    )
    if commit:
        db.commit()
        db.refresh(author)
    return author


def update_author_entry(
    db: Session,
    author_id: int,
    payload: AuthorUpdate,
    *,
    changed_by: User,
    suggestion: EntrySuggestion | None = None,
    change_note: str = "",
    commit: bool = True,
) -> Author:
    author = db.get(Author, author_id)
    if author is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")

    before_payload = snapshot_author(author)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(author, key, value)

    db.flush()
    db.refresh(author)
    _record_revision(
        db,
        entity_type=EntryTargetType.AUTHOR,
        entity_id=author.id,
        action=EntryAction.UPDATE,
        changed_by=changed_by,
        suggestion=suggestion,
        before_payload=before_payload,
        after_payload=snapshot_author(author),
        change_note=change_note,
    )
    if commit:
        db.commit()
        db.refresh(author)
    return author


def create_book_entry(
    db: Session,
    payload: BookCreate,
    *,
    changed_by: User,
    suggestion: EntrySuggestion | None = None,
    change_note: str = "",
    commit: bool = True,
) -> Book:
    _require_exactly_one_primary(payload.titles, "book title")
    _require_at_most_one_primary(payload.covers, "book cover")
    _require_unique_book_languages(payload.languages)
    _require_unique_book_titles(payload.titles)
    _require_unique_book_authors(payload.authors)

    data = payload.model_dump(exclude={"languages", "titles", "covers", "authors"})
    book = Book(**data)
    book.languages = [_build_book_language(db, language) for language in payload.languages]
    book.titles = [_build_book_title(db, title) for title in payload.titles]
    book.covers = [BookCover(**cover.model_dump()) for cover in payload.covers]
    book.authors = _build_book_authors(db, payload.authors)

    db.add(book)
    db.flush()
    after_payload = snapshot_book(_load_book_for_snapshot(db, book.id))
    _record_revision(
        db,
        entity_type=EntryTargetType.BOOK,
        entity_id=book.id,
        action=EntryAction.CREATE,
        changed_by=changed_by,
        suggestion=suggestion,
        before_payload=None,
        after_payload=after_payload,
        change_note=change_note,
    )
    if commit:
        db.commit()
    return _load_book_for_snapshot(db, book.id)


def update_book_entry(
    db: Session,
    book_id: int,
    payload: BookUpdate,
    *,
    changed_by: User,
    suggestion: EntrySuggestion | None = None,
    change_note: str = "",
    commit: bool = True,
) -> Book:
    book = _load_book_for_snapshot(db, book_id)
    before_payload = snapshot_book(book)

    updates = payload.model_dump(
        exclude_unset=True,
        exclude={"languages", "titles", "covers", "authors"},
    )
    updated_fields = payload.model_fields_set

    replacement_languages = None
    if "languages" in updated_fields:
        languages = payload.languages or []
        _require_unique_book_languages(languages)
        replacement_languages = [_build_book_language(db, language) for language in languages]

    replacement_titles = None
    if "titles" in updated_fields:
        titles = payload.titles or []
        _require_exactly_one_primary(titles, "book title")
        _require_unique_book_titles(titles)
        replacement_titles = [_build_book_title(db, title) for title in titles]

    replacement_covers = None
    if "covers" in updated_fields:
        covers = payload.covers or []
        _require_at_most_one_primary(covers, "book cover")
        replacement_covers = [BookCover(**cover.model_dump()) for cover in covers]

    replacement_authors = None
    if "authors" in updated_fields:
        authors = payload.authors or []
        _require_unique_book_authors(authors)
        replacement_authors = _build_book_authors(db, authors)

    for key, value in updates.items():
        setattr(book, key, value)

    has_replacements = any(
        replacement is not None
        for replacement in (
            replacement_languages,
            replacement_titles,
            replacement_covers,
            replacement_authors,
        )
    )

    if replacement_languages is not None:
        book.languages.clear()
    if replacement_titles is not None:
        book.titles.clear()
    if replacement_covers is not None:
        book.covers.clear()
    if replacement_authors is not None:
        book.authors.clear()

    if has_replacements:
        db.flush()

    if replacement_languages is not None:
        book.languages = replacement_languages
    if replacement_titles is not None:
        book.titles = replacement_titles
    if replacement_covers is not None:
        book.covers = replacement_covers
    if replacement_authors is not None:
        book.authors = replacement_authors

    db.flush()
    after_payload = snapshot_book(_load_book_for_snapshot(db, book_id))
    _record_revision(
        db,
        entity_type=EntryTargetType.BOOK,
        entity_id=book.id,
        action=EntryAction.UPDATE,
        changed_by=changed_by,
        suggestion=suggestion,
        before_payload=before_payload,
        after_payload=after_payload,
        change_note=change_note,
    )
    if commit:
        db.commit()
    return _load_book_for_snapshot(db, book_id)


def create_book_edition_entry(
    db: Session,
    book_id: int,
    payload: BookEditionCreate,
    *,
    changed_by: User,
    suggestion: EntrySuggestion | None = None,
    change_note: str = "",
    commit: bool = True,
) -> BookEdition:
    if db.get(Book, book_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    _require_exactly_one_primary(payload.titles, "edition title")
    _require_at_most_one_primary(payload.covers, "edition cover")

    language = _get_language_by_code(db, payload.language_code)
    data = payload.model_dump(exclude={"language_code", "titles", "covers", "contributors"})
    edition = BookEdition(
        **data,
        book_id=book_id,
        language_code=language.code if language else None,
    )
    edition.titles = [_build_edition_title(db, title) for title in payload.titles]
    edition.covers = [EditionCover(**cover.model_dump()) for cover in payload.covers]
    edition.contributors = _build_edition_contributors(db, payload.contributors)

    db.add(edition)
    db.flush()
    after_payload = snapshot_edition(_load_edition_for_snapshot(db, edition.id))
    _record_revision(
        db,
        entity_type=EntryTargetType.BOOK_EDITION,
        entity_id=edition.id,
        action=EntryAction.CREATE,
        changed_by=changed_by,
        suggestion=suggestion,
        before_payload=None,
        after_payload=after_payload,
        change_note=change_note,
    )
    if commit:
        db.commit()
    return _load_edition_for_snapshot(db, edition.id)


def approve_suggestion(db: Session, suggestion: EntrySuggestion, reviewer: User, reviewer_note: str = "") -> None:
    if suggestion.status != EntrySuggestionStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Suggestion has already been reviewed")

    suggestion.status = EntrySuggestionStatus.APPROVED
    suggestion.reviewed_by_id = reviewer.id
    suggestion.reviewer_note = reviewer_note
    suggestion.reviewed_at = datetime.now().astimezone()

    if suggestion.target_type == EntryTargetType.AUTHOR and suggestion.action == EntryAction.CREATE:
        create_author_entry(
            db,
            AuthorCreate.model_validate(suggestion.payload),
            changed_by=reviewer,
            suggestion=suggestion,
            change_note=reviewer_note,
            commit=False,
        )
    elif suggestion.target_type == EntryTargetType.AUTHOR and suggestion.action == EntryAction.UPDATE:
        update_author_entry(
            db,
            suggestion.target_id,
            AuthorUpdate.model_validate(suggestion.payload),
            changed_by=reviewer,
            suggestion=suggestion,
            change_note=reviewer_note,
            commit=False,
        )
    elif suggestion.target_type == EntryTargetType.BOOK and suggestion.action == EntryAction.CREATE:
        create_book_entry(
            db,
            BookCreate.model_validate(suggestion.payload),
            changed_by=reviewer,
            suggestion=suggestion,
            change_note=reviewer_note,
            commit=False,
        )
    elif suggestion.target_type == EntryTargetType.BOOK and suggestion.action == EntryAction.UPDATE:
        update_book_entry(
            db,
            suggestion.target_id,
            BookUpdate.model_validate(suggestion.payload),
            changed_by=reviewer,
            suggestion=suggestion,
            change_note=reviewer_note,
            commit=False,
        )
    elif suggestion.target_type == EntryTargetType.BOOK_EDITION and suggestion.action == EntryAction.CREATE:
        create_book_edition_entry(
            db,
            suggestion.target_id,
            BookEditionCreate.model_validate(suggestion.payload),
            changed_by=reviewer,
            suggestion=suggestion,
            change_note=reviewer_note,
            commit=False,
        )
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported suggestion target")


def reject_suggestion(db: Session, suggestion: EntrySuggestion, reviewer: User, reviewer_note: str = "") -> None:
    if suggestion.status != EntrySuggestionStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Suggestion has already been reviewed")

    suggestion.status = EntrySuggestionStatus.REJECTED
    suggestion.reviewed_by_id = reviewer.id
    suggestion.reviewer_note = reviewer_note
    suggestion.reviewed_at = datetime.now().astimezone()
