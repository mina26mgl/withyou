from typing import Optional
from pydantic import BaseModel


class ProduitHit(BaseModel):
    id: str
    nom: str
    score: float


class SemanticSearchResponse(BaseModel):
    query: str
    results: list[ProduitHit]


class RecommendRequest(BaseModel):
    consommateur_id: str
    skin_type: Optional[str] = None
    concerns: list[str] = []


class RecommendResponse(BaseModel):
    produits_recommandes: list[ProduitHit]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    consommateur_id: str
    messages: list[ChatMessage]
