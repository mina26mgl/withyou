from fastapi import APIRouter
from app.models.schemas import RecommendRequest, RecommendResponse, ProduitHit
from app.services.embedder import embed_text
from app.services.qdrant_service import search as qdrant_search

router = APIRouter()


@router.post("", response_model=RecommendResponse)
def recommend(body: RecommendRequest):
    profile_text = " ".join([body.skin_type or "", *body.concerns]).strip()
    vector = embed_text(profile_text or "produit de beauté polyvalent")
    hits = qdrant_search(vector, limit=10)

    produits_recommandes = [
        ProduitHit(id=str(hit.id), nom=hit.payload.get("nom", ""), score=hit.score)
        for hit in hits
    ]

    return RecommendResponse(produits_recommandes=produits_recommandes)
