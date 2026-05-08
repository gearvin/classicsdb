from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app.models  # noqa: F401  # Import models so SQLAlchemy registers every table.
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import (
    Author,
    Book,
    BookAuthor,
    BookEdition,
    BookLanguage,
    BookTitle,
    BookTagVote,
    ContributorRole,
    EditionFormat,
    EditionTitle,
    EntryAction,
    EntryRevision,
    EntryTargetType,
    Language,
    LanguageRole,
    Tag,
    TitleType,
    User,
    WorkType,
)
from app.reference.languages import LANGUAGES
from app.security import hash_password
from scripts.seed_tags import seed_tags

ADMIN_EMAIL = "ivanz1247@gmail.com"
ADMIN_PASSWORD = "12345678"
ADMIN_USERNAME = "ivanz1247"


@dataclass(frozen=True)
class AuthorSeed:
    name: str
    sort_name: str
    bio: str
    birth_year: int | None = None
    death_year: int | None = None


@dataclass(frozen=True)
class BookSeed:
    title: str
    author: str
    language_code: str
    work_type: WorkType
    first_published_year: int | None
    description: str
    page_count: int
    original_title: str | None = None
    publisher: str = "ClassicsDB Seed Library"


@dataclass(frozen=True)
class BookTagSeed:
    title: str
    tag_slugs: tuple[str, ...]
    vote: int = 2
    spoiler_level: int = 0


AUTHORS: tuple[AuthorSeed, ...] = (
    AuthorSeed(
        "Homer",
        "Homer",
        "Ancient Greek poet traditionally credited with the foundational epics of the Greek literary tradition.",
    ),
    AuthorSeed(
        "Virgil",
        "Virgil",
        "Roman poet whose epic and pastoral works became central texts for Latin literature.",
        -70,
        -19,
    ),
    AuthorSeed(
        "Ovid",
        "Ovid",
        "Roman poet known for mythological narrative, erotic elegy, and an unusually supple narrative voice.",
        -43,
        17,
    ),
    AuthorSeed(
        "Dante Alighieri",
        "Alighieri, Dante",
        "Florentine poet whose work joins medieval theology, classical inheritance, and vernacular invention.",
        1265,
        1321,
    ),
    AuthorSeed(
        "Miguel de Cervantes",
        "Cervantes, Miguel de",
        "Spanish novelist, poet, and playwright whose fiction helped define the modern European novel.",
        1547,
        1616,
    ),
    AuthorSeed(
        "Jane Austen",
        "Austen, Jane",
        "English novelist whose comedies of manners combine social precision with moral intelligence.",
        1775,
        1817,
    ),
    AuthorSeed(
        "Mary Shelley",
        "Shelley, Mary",
        "English novelist and editor whose speculative fiction helped shape Gothic and science fiction traditions.",
        1797,
        1851,
    ),
    AuthorSeed(
        "Charlotte Bronte",
        "Bronte, Charlotte",
        "English novelist whose work gave new intensity to first-person psychological and social fiction.",
        1816,
        1855,
    ),
    AuthorSeed(
        "Herman Melville",
        "Melville, Herman",
        "American novelist and short story writer whose sea fiction expanded into metaphysics, labor, and obsession.",
        1819,
        1891,
    ),
    AuthorSeed(
        "Leo Tolstoy",
        "Tolstoy, Leo",
        "Russian novelist and moral thinker whose panoramic fiction studies family, history, and conscience.",
        1828,
        1910,
    ),
    AuthorSeed(
        "Fyodor Dostoevsky",
        "Dostoevsky, Fyodor",
        "Russian novelist whose works probe faith, guilt, freedom, and moral extremity.",
        1821,
        1881,
    ),
    AuthorSeed(
        "Gustave Flaubert",
        "Flaubert, Gustave",
        "French novelist admired for stylistic exactness and unsparing studies of romantic illusion.",
        1821,
        1880,
    ),
    AuthorSeed(
        "Victor Hugo",
        "Hugo, Victor",
        "French poet, novelist, and dramatist whose public imagination joined politics, history, and melodrama.",
        1802,
        1885,
    ),
    AuthorSeed(
        "Murasaki Shikibu",
        "Murasaki Shikibu",
        "Heian court writer traditionally credited with one of the world's earliest psychological novels.",
        973,
        1014,
    ),
    AuthorSeed(
        "Cao Xueqin",
        "Cao, Xueqin",
        "Qing dynasty writer associated with the great Chinese family novel Dream of the Red Chamber.",
        1715,
        1763,
    ),
    AuthorSeed(
        "Chinua Achebe",
        "Achebe, Chinua",
        "Nigerian novelist and critic whose fiction reshaped modern African literary expression.",
        1930,
        2013,
    ),
    AuthorSeed(
        "Gabriel Garcia Marquez",
        "Garcia Marquez, Gabriel",
        "Colombian novelist and journalist whose fiction made magical realism a global literary language.",
        1927,
        2014,
    ),
    AuthorSeed(
        "Franz Kafka",
        "Kafka, Franz",
        "Prague-born German-language writer whose fiction renders modern authority and alienation with dream logic.",
        1883,
        1924,
    ),
)


BOOKS: tuple[BookSeed, ...] = (
    BookSeed(
        "The Iliad",
        "Homer",
        "grc",
        WorkType.EPIC,
        -750,
        "A war poem centered on Achilles' rage during the final year of the Trojan War. Its battles, laments, and arguments turn heroic glory into a study of mortality and honor.",
        560,
        "Ἰλιάς",
    ),
    BookSeed(
        "The Odyssey",
        "Homer",
        "grc",
        WorkType.EPIC,
        -725,
        "Odysseus struggles home from Troy through monsters, enchantments, storms, and divine interference. The poem balances adventure with questions of hospitality, memory, and the meaning of home.",
        480,
        "Ὀδύσσεια",
    ),
    BookSeed(
        "The Aeneid",
        "Virgil",
        "lat",
        WorkType.EPIC,
        -19,
        "Aeneas survives Troy and journeys toward the founding destiny of Rome. Virgil's epic joins imperial myth to private loss, asking what history demands from the individual.",
        442,
        "Aeneis",
    ),
    BookSeed(
        "Metamorphoses",
        "Ovid",
        "lat",
        WorkType.POEM,
        8,
        "A vast mythological poem organized around transformations of bodies, gods, cities, and desires. Its quicksilver storytelling links creation myth, erotic pursuit, punishment, art, and memory.",
        624,
        "Metamorphoses",
    ),
    BookSeed(
        "The Divine Comedy",
        "Dante Alighieri",
        "ita",
        WorkType.EPIC,
        1321,
        "Dante travels through Hell, Purgatory, and Paradise in a poem of theology, politics, grief, and hope. The journey makes personal crisis into a complete moral architecture of the cosmos.",
        798,
        "Commedia",
    ),
    BookSeed(
        "Don Quixote",
        "Miguel de Cervantes",
        "spa",
        WorkType.NOVEL,
        1605,
        "A country gentleman reads too many romances and rides out to restore chivalry with Sancho Panza beside him. The novel is comic, humane, and deeply alert to the unstable border between books and life.",
        940,
        "Don Quijote de la Mancha",
    ),
    BookSeed(
        "Pride and Prejudice",
        "Jane Austen",
        "eng",
        WorkType.NOVEL,
        1813,
        "Elizabeth Bennet and Fitzwilliam Darcy misunderstand, judge, and gradually revise one another. Austen's novel turns courtship into a brilliant study of class, family pressure, wit, and self-knowledge.",
        432,
    ),
    BookSeed(
        "Frankenstein",
        "Mary Shelley",
        "eng",
        WorkType.NOVEL,
        1818,
        "Victor Frankenstein creates a living being and then recoils from his responsibility. The novel fuses Gothic dread with philosophical questions about creation, loneliness, education, and revenge.",
        304,
    ),
    BookSeed(
        "Jane Eyre",
        "Charlotte Bronte",
        "eng",
        WorkType.NOVEL,
        1847,
        "Jane Eyre moves from orphaned dependence toward moral and emotional independence. The novel combines social critique, Gothic secrecy, romance, and a fierce first-person voice.",
        592,
    ),
    BookSeed(
        "Moby-Dick",
        "Herman Melville",
        "eng",
        WorkType.NOVEL,
        1851,
        "Ishmael joins the Pequod under Captain Ahab, whose pursuit of the white whale becomes a cosmic obsession. Melville mixes adventure, sermon, taxonomy, drama, and metaphysical comedy.",
        720,
    ),
    BookSeed(
        "War and Peace",
        "Leo Tolstoy",
        "rus",
        WorkType.NOVEL,
        1869,
        "Several aristocratic families live through Napoleon's invasion of Russia and the upheavals around it. Tolstoy's scale is epic, but its power rests in ordinary choices, domestic change, and moral awakening.",
        1225,
        "Война и мир",
    ),
    BookSeed(
        "Anna Karenina",
        "Leo Tolstoy",
        "rus",
        WorkType.NOVEL,
        1878,
        "Anna's affair with Vronsky unfolds beside Levin's search for a truthful life. The novel examines marriage, desire, faith, agriculture, society, and the costs of refusing hypocrisy.",
        864,
        "Анна Каренина",
    ),
    BookSeed(
        "Crime and Punishment",
        "Fyodor Dostoevsky",
        "rus",
        WorkType.NOVEL,
        1866,
        "Raskolnikov commits murder under a theory of exceptional will and then unravels under guilt. The novel is a feverish inquiry into conscience, poverty, pride, and redemption.",
        576,
        "Преступление и наказание",
    ),
    BookSeed(
        "The Brothers Karamazov",
        "Fyodor Dostoevsky",
        "rus",
        WorkType.NOVEL,
        1880,
        "A family crisis becomes a murder case and a spiritual argument about freedom, faith, and responsibility. Dostoevsky gives each brother a different way of wrestling with God and the world.",
        824,
        "Братья Карамазовы",
    ),
    BookSeed(
        "Madame Bovary",
        "Gustave Flaubert",
        "fra",
        WorkType.NOVEL,
        1857,
        "Emma Bovary seeks the intensity promised by romantic stories and finds provincial life unbearable. Flaubert's exacting prose turns fantasy, debt, boredom, and social performance into tragedy.",
        384,
        "Madame Bovary",
    ),
    BookSeed(
        "Les Miserables",
        "Victor Hugo",
        "fra",
        WorkType.NOVEL,
        1862,
        "Jean Valjean's transformation after prison unfolds across decades of French social and political life. Hugo's novel embraces crime, grace, poverty, revolution, law, and mercy on a grand scale.",
        1232,
        "Les Misérables",
    ),
    BookSeed(
        "The Tale of Genji",
        "Murasaki Shikibu",
        "jpn",
        WorkType.NOVEL,
        1021,
        "Courtly love, rank, poetry, and impermanence shape the life and legacy of Prince Genji. The work is prized for psychological delicacy and its intricate portrait of Heian aristocratic culture.",
        1184,
        "源氏物語",
    ),
    BookSeed(
        "Dream of the Red Chamber",
        "Cao Xueqin",
        "zho",
        WorkType.NOVEL,
        1791,
        "The decline of the Jia family is told through romance, domestic ritual, poetry, and spiritual allegory. The novel is both an intimate family chronicle and a vast social world.",
        992,
        "紅樓夢",
    ),
    BookSeed(
        "Things Fall Apart",
        "Chinua Achebe",
        "eng",
        WorkType.NOVEL,
        1958,
        "Okonkwo's life in Umuofia is shaped by ambition, fear, kinship, ritual, and colonial disruption. Achebe's novel restores depth and agency to a society often flattened by imperial narratives.",
        224,
    ),
    BookSeed(
        "The Trial",
        "Franz Kafka",
        "deu",
        WorkType.NOVEL,
        1925,
        "Josef K. is arrested without being told the charge and enters a world of opaque procedure. Kafka's unfinished novel makes bureaucracy, guilt, and interpretation feel both absurd and terrifying.",
        304,
        "Der Process",
    ),
)


BOOK_TAGS: tuple[BookTagSeed, ...] = (
    BookTagSeed("The Iliad", ("war", "epic-hero", "tragedy", "ancient-world")),
    BookTagSeed("The Odyssey", ("journey", "homecoming", "voyage", "quest", "ancient-world")),
    BookTagSeed("The Aeneid", ("empire", "journey", "epic-hero", "ancient-world")),
    BookTagSeed("Metamorphoses", ("transformation", "ancient-world", "frame-narrative")),
    BookTagSeed("The Divine Comedy", ("afterlife", "spiritual-crisis", "journey", "medieval-world")),
    BookTagSeed("Don Quixote", ("satire", "quest", "comedy", "fool")),
    BookTagSeed("Pride and Prejudice", ("courtship", "comedy-of-manners", "family-drama", "social-drama")),
    BookTagSeed("Frankenstein", ("gothic", "outsider-protagonist", "revenge-tragedy", "frame-narrative")),
    BookTagSeed("Jane Eyre", ("coming-of-age-drama", "gothic", "courtship", "victorian-era")),
    BookTagSeed("Moby-Dick", ("sea", "voyage", "quest", "outsider-protagonist")),
    BookTagSeed("War and Peace", ("war", "family-drama", "politics", "rural-setting")),
    BookTagSeed("Anna Karenina", ("tragic-romance", "family-drama", "social-drama", "rural-setting")),
    BookTagSeed("Crime and Punishment", ("law-and-justice", "spiritual-crisis", "morally-ambiguous-protagonist", "urban-setting")),
    BookTagSeed("The Brothers Karamazov", ("family-drama", "spiritual-crisis", "law-and-justice", "trial")),
    BookTagSeed("Madame Bovary", ("tragic-romance", "domestic-tragedy", "social-drama", "rural-setting")),
    BookTagSeed("Les Miserables", ("law-and-justice", "revolution", "religion", "urban-setting")),
    BookTagSeed("The Tale of Genji", ("court", "courtship", "love-triangle", "medieval-world")),
    BookTagSeed("Dream of the Red Chamber", ("family-drama", "court", "tragic-romance", "spiritual-crisis")),
    BookTagSeed("Things Fall Apart", ("empire", "tragedy", "rural-setting", "flawed-hero")),
    BookTagSeed("The Trial", ("trial", "law-and-justice", "urban-setting", "unreliable-narrator")),
)


def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed_languages(db: Session) -> None:
    for language_data in LANGUAGES:
        db.merge(Language(**language_data))


def seed_admin(db: Session) -> User:
    admin = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
    if admin is None:
        admin = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            display_name="Ivan Z",
            is_active=True,
            is_admin=True,
        )
        db.add(admin)
    else:
        admin.username = ADMIN_USERNAME
        admin.password_hash = hash_password(ADMIN_PASSWORD)
        admin.display_name = admin.display_name or "Ivan Z"
        admin.is_active = True
        admin.is_admin = True
    db.flush()
    return admin


def seed_authors(db: Session) -> dict[str, Author]:
    authors: dict[str, Author] = {}
    for data in AUTHORS:
        author = db.scalar(select(Author).where(Author.name == data.name))
        if author is None:
            author = Author(
                name=data.name,
                sort_name=data.sort_name,
                bio=data.bio,
                birth_year=data.birth_year,
                death_year=data.death_year,
            )
            db.add(author)
        else:
            author.sort_name = data.sort_name
            author.bio = data.bio
            author.birth_year = data.birth_year
            author.death_year = data.death_year
        authors[data.name] = author
    db.flush()
    return authors


def seed_books(db: Session, authors: dict[str, Author], admin: User) -> int:
    created = 0
    for index, data in enumerate(BOOKS):
        existing = db.scalar(
            select(Book)
            .join(BookTitle)
            .where(BookTitle.title == data.title, BookTitle.is_primary.is_(True))
        )
        if existing is not None:
            continue

        primary_title_is_original = data.language_code == "eng" or data.original_title == data.title
        primary_title_language_code = data.language_code if primary_title_is_original else "eng"
        title_type = TitleType.ORIGINAL if primary_title_is_original else TitleType.TRANSLATED
        book = Book(
            description=data.description,
            first_published_year=data.first_published_year,
            work_type=data.work_type,
        )
        book.languages = [
            BookLanguage(language_code=data.language_code, role=LanguageRole.ORIGINAL, position=0),
        ]
        book.titles = [
            BookTitle(
                title=data.title,
                language_code=primary_title_language_code,
                title_type=title_type,
                is_primary=True,
                position=0,
            ),
        ]
        if data.original_title and data.original_title != data.title:
            book.titles.append(
                BookTitle(
                    title=data.original_title,
                    language_code=data.language_code,
                    title_type=TitleType.ORIGINAL,
                    is_primary=False,
                    position=1,
                )
            )
        book.authors = [
            BookAuthor(
                author=authors[data.author],
                role=ContributorRole.AUTHOR,
                position=0,
            )
        ]
        edition = BookEdition(
            publisher=data.publisher,
            publication_date=date(2026, 1, 1),
            language_code="eng",
            format=EditionFormat.PAPERBACK,
            page_count=data.page_count,
            description=f"A seeded reading edition of {data.title} for local development.",
        )
        edition.titles = [
            EditionTitle(
                language_code="eng",
                title=data.title,
                subtitle=None,
                title_type=title_type,
                is_primary=True,
            )
        ]
        book.editions = [edition]
        db.add(book)
        db.flush()

        db.add(
            EntryRevision(
                entity_type=EntryTargetType.BOOK,
                entity_id=book.id,
                action=EntryAction.CREATE,
                changed_by_id=admin.id,
                before_payload=None,
                after_payload={
                    "title": data.title,
                    "author": data.author,
                    "language_code": data.language_code,
                    "first_published_year": data.first_published_year,
                    "work_type": data.work_type.value,
                },
                change_note="Seeded from backend/scripts/seed_database.py.",
            )
        )
        created += 1

    return created


def seed_book_tags(db: Session, admin: User) -> int:
    primary_titles = {
        title.title: title.book
        for title in db.scalars(select(BookTitle).where(BookTitle.is_primary.is_(True))).all()
    }
    tags_by_slug = {tag.slug: tag for tag in db.scalars(select(Tag)).all()}
    created = 0

    for data in BOOK_TAGS:
        book = primary_titles.get(data.title)
        if book is None:
            raise RuntimeError(f"Book tag seed references unknown book title: {data.title}")

        for tag_slug in data.tag_slugs:
            tag = tags_by_slug.get(tag_slug)
            if tag is None:
                raise RuntimeError(f"Book tag seed references unknown tag slug: {tag_slug}")

            existing_vote = db.scalar(
                select(BookTagVote).where(
                    BookTagVote.book_id == book.id,
                    BookTagVote.tag_id == tag.id,
                    BookTagVote.user_id == admin.id,
                )
            )
            if existing_vote is None:
                existing_vote = BookTagVote(
                    book_id=book.id,
                    tag_id=tag.id,
                    user_id=admin.id,
                )
                db.add(existing_vote)
                created += 1

            existing_vote.vote = data.vote
            existing_vote.spoiler_level = data.spoiler_level

    db.flush()
    return created


def seed_database(reset: bool) -> None:
    if reset:
        reset_database()

    with SessionLocal() as db:
        seed_languages(db)
        admin = seed_admin(db)
        authors = seed_authors(db)
        book_count = seed_books(db, authors, admin)
        tag_count = seed_tags(db)
        book_tag_count = seed_book_tags(db, admin)
        db.commit()

    print(f"Seeded admin user: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    print(f"Seeded {len(LANGUAGES)} languages, {len(AUTHORS)} authors, and {book_count} books.")
    print(f"Seeded tag taxonomy. Created {tag_count} new tags.")
    print(f"Seeded book tag links. Created {book_tag_count} new votes.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Drop, recreate, and seed the ClassicsDB development database."
    )
    parser.add_argument(
        "--no-reset",
        action="store_true",
        help="Keep existing tables and only merge seed data.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    seed_database(reset=not args.no_reset)


if __name__ == "__main__":
    main()
