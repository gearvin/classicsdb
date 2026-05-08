from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routers import auth, authors, books, languages, reviews, suggestions, tags, users

API_PREFIX = "/api/v1"
STATIC_DIR = Path(__file__).resolve().parents[1] / "static"


app = FastAPI(title="ClassicsDB API")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(authors.router, prefix=API_PREFIX)
app.include_router(books.router, prefix=API_PREFIX)
app.include_router(languages.router, prefix=API_PREFIX)
app.include_router(reviews.router, prefix=API_PREFIX)
app.include_router(suggestions.router, prefix=API_PREFIX)
app.include_router(suggestions.admin_router, prefix=API_PREFIX)
app.include_router(tags.router, prefix=API_PREFIX)
app.include_router(tags.tag_requests_router, prefix=API_PREFIX)
app.include_router(tags.admin_router, prefix=API_PREFIX)
app.include_router(tags.admin_tag_requests_router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)


@app.get("/health")
def health_check():
    return {"status": "ok"}
