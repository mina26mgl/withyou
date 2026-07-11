from fastapi import APIRouter
from pydantic import BaseModel
from app.models.schemas import SemanticSearchResponse, ProduitHit
from app.services.embedder import embed_text
from app.services.qdrant_service import search as qdrant_search

router = APIRouter()


class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 10


@router.post("/semantic", response_model=SemanticSearchResponse)
def semantic_search(body: SemanticSearchRequest):
    vector = embed_text(body.query)
    hits = qdrant_search(vector, limit=body.limit)

    results = [
        ProduitHit(id=str(hit.id), nom=hit.payload.get("nom", ""), score=hit.score)
        for hit in hits
    ]

    return SemanticSearchResponse(query=body.query, results=results)
