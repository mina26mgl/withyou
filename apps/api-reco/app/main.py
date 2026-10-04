"""FastAPI entry point: `uvicorn app.main:app --reload --port 8001`."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.core.logging import configure_logging
from app.db.reference_data import seed_reference_data
from app.db.session import get_session_factory
from app.services.catalog_service import EngineProvider

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if settings.seed_reference_on_startup:
            with get_session_factory()() as session:
                seed_reference_data(session)
        app.state.engine_provider = EngineProvider(settings)
        logger.info("Recommender config %s loaded", app.state.engine_provider.config.version)
        yield

    app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"code": exc.code, "message": exc.message})

    @app.get("/health", tags=["health"])
    def health() -> dict:
        return {"status": "ok", "service": "withyou-reco"}

    app.include_router(api_router)
    return app


app = create_app()
