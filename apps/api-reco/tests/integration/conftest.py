"""API tests on an in-memory SQLite database loaded with the development catalogue.

The `reco` schema is mapped to SQLite's default schema; PostgreSQL-only types
(JSONB, BIGSERIAL) have SQLite variants in app/db/base.py.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.db import session as db_session
from app.db.base import SCHEMA, Base
from app.db.dev_seed import seed
from app.main import create_app

ADMIN_TOKEN = "test-admin-token"


@pytest.fixture()
def engine():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    ).execution_options(schema_translate_map={SCHEMA: None})

    @event.listens_for(engine, "connect")
    def _foreign_keys(dbapi_connection, _):  # SQLite ignores FKs (and ON DELETE CASCADE) by default
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    with Session(engine) as session:
        seed(session)
    db_session.configure(engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def client(engine):
    settings = Settings(
        environment="test", database_url="sqlite://", admin_token=ADMIN_TOKEN, catalog_refresh_seconds=0,
        seed_reference_on_startup=True,
    )
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture()
def db(engine):
    with Session(engine) as session:
        yield session
