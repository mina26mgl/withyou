from fastapi import APIRouter, Depends

from app.api.deps import DbSession, Provider, require_admin
from app.services.stats_service import refresh_product_stats

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.post("/catalog/reload")
def reload_catalog(db: DbSession, provider: Provider) -> dict:
    """Rebuild the in-memory index now instead of waiting for the refresh interval."""
    provider.invalidate()
    engine = provider.get(db)
    return {"products": len(engine.index), "model_version": engine.model_version}


@router.post("/stats/refresh")
def refresh_stats(db: DbSession, provider: Provider) -> dict:
    count = refresh_product_stats(db, provider.config)
    provider.invalidate()
    return {"products": count}
