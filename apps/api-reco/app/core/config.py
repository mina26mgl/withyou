"""Application settings, read from environment variables / `.env`."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def normalize_database_url(url: str) -> str:
    """Accept the Prisma-style URL used by api-core and turn it into a SQLAlchemy one.

    `postgresql://u:p@h/db?schema=public` -> `postgresql+psycopg://u:p@h/db`
    """
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    if "?schema=" in url:
        url = url.split("?schema=")[0]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVICE_ROOT / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "WithYou Recommendation API"
    environment: Literal["dev", "test", "prod"] = "dev"
    log_level: str = "INFO"

    # Owns the `reco` schema (Alembic). Can point at the same database as api-core.
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/withyou"
    # Database holding the Prisma tables of api-core, read by scripts/sync_core.py.
    core_database_url: str | None = None

    recommender_config_path: Path = SERVICE_ROOT / "config" / "recommender.yaml"
    # The in-memory catalogue index is rebuilt when the catalogue changed,
    # checked at most once every N seconds.
    catalog_refresh_seconds: int = 60

    # Optional Learning-to-Rank model (V3). Ignored while unset.
    ltr_model_path: Path | None = None

    seed_reference_on_startup: bool = True
    admin_token: str | None = None
    cors_origins: list[str] = ["http://localhost:3000"]

    @field_validator("database_url", "core_database_url")
    @classmethod
    def _normalize_url(cls, value: str | None) -> str | None:
        return normalize_database_url(value) if value else None

    @field_validator("ltr_model_path", mode="before")
    @classmethod
    def _empty_path_is_none(cls, value: object) -> object:
        return None if value in ("", None) else value


@lru_cache
def get_settings() -> Settings:
    return Settings()
