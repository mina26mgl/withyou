import os
from functools import lru_cache
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, PointStruct, VectorParams

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "withyou_products")
EMBEDDING_DIM = 1024  # BGE-M3 output dimension


@lru_cache(maxsize=1)
def get_client() -> QdrantClient:
    return QdrantClient(url=QDRANT_URL)


def ensure_collection() -> None:
    client = get_client()
    if not client.collection_exists(QDRANT_COLLECTION):
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )


def upsert_produit(produit_id: str, vector: list[float], payload: dict) -> None:
    client = get_client()
    client.upsert(
        collection_name=QDRANT_COLLECTION,
        points=[PointStruct(id=produit_id, vector=vector, payload=payload)],
    )


def search(vector: list[float], limit: int = 10) -> list:
    client = get_client()
    return client.query_points(
        collection_name=QDRANT_COLLECTION,
        query=vector,
        limit=limit,
    ).points
