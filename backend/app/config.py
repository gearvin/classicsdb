from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env")

    database_url: str

    secret_key: SecretStr
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    refresh_cookie_name: str = "classicsdb_refresh"
    # Set REFRESH_COOKIE_SECURE=true in production so browsers only send it over HTTPS.
    refresh_cookie_secure: bool = False
    refresh_cookie_samesite: str = "lax"



settings = Settings()
