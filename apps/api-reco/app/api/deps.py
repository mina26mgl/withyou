from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.recommender.engine import RecommendationEngine
from app.services.catalog_service import EngineProvider

DbSession = Annotated[Session, Depends(get_db)]


def get_engine_provider(request: Request) -> EngineProvider:
    return request.app.state.engine_provider


def get_engine(db: DbSession, provider: Annotated[EngineProvider, Depends(get_engine_provider)]) -> RecommendationEngine:
    return provider.get(db)


Engine = Annotated[RecommendationEngine, Depends(get_engine)]
Provider = Annotated[EngineProvider, Depends(get_engine_provider)]


def require_admin(request: Request, x_admin_token: Annotated[str | None, Header()] = None) -> None:
    expected = request.app.state.settings.admin_token
    if not expected:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admin routes are disabled (ADMIN_TOKEN not set)")
    if not x_admin_token or not secrets.compare_digest(x_admin_token, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid admin token")
