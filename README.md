# ClassicsDB

ClassicsDB is a work-in-progress community catalogue for classic and literary fiction. It combines a structured book database with reader shelves, reviews, tags, suggestions, and editorial history.

The project is currently a local development app with a FastAPI backend and a React frontend.

## Features

- Browse books, authors, editions, ratings, and reviews
- Register, log in, refresh sessions, and log out
- Maintain personal shelves and reading status
- Write reviews, vote on reviews, and comment on reviews
- Browse and request tags, then vote on book tags with spoiler levels
- Submit catalogue suggestions
- Track book and edition history for admin changes

## Stack

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL
- Auth: JWT access tokens plus HTTP-only refresh-token cookies
- Frontend: React, TypeScript, Vite
- Routing: TanStack Router
- Data fetching: TanStack Query
- Styling: Tailwind CSS v4

## Repository Layout

```text
backend/
  app/
    main.py          FastAPI app and router registration
    config.py        environment-backed settings
    db/              SQLAlchemy engine/session setup
    models/          ORM models
    routers/         API routes
    schemas/         Pydantic request/response schemas
    services/        catalogue and tag workflow logic
  alembic/           database migrations
  scripts/           seed scripts

frontend/
  src/
    api/             typed API helpers
    auth/            auth provider and token storage
    components/      layout, UI, and feature components
    routes/          TanStack Router file routes
    styles.css       Tailwind theme and global styles
```

## Backend Setup

Create a PostgreSQL database:

```bash
createdb classicsdb
```

Create a Python environment and install backend dependencies:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install fastapi "uvicorn[standard]" sqlalchemy alembic pydantic-settings "psycopg[binary]" pyjwt "pwdlib[argon2]" email-validator python-multipart
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/classicsdb
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
REFRESH_COOKIE_NAME=classicsdb_refresh
REFRESH_COOKIE_SECURE=false
REFRESH_COOKIE_SAMESITE=lax
```

Run migrations:

```bash
alembic upgrade head
```

Optional seed data:

```bash
# Adds reference languages only
python scripts/seed_languages.py

# Adds the tag taxonomy
python scripts/seed_tags.py

# Recreates all tables and loads a full local demo dataset
python scripts/seed_database.py
```

`seed_database.py` drops and recreates tables by default. Use `python scripts/seed_database.py --no-reset` to keep existing tables and merge seed data instead.