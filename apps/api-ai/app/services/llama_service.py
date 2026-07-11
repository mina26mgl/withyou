from functools import lru_cache
from typing import Any

from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.core.embeddings import BaseEmbedding
from llama_index.vector_stores.qdrant import QdrantVectorStore

from .embedder import embed_text, embed_texts
from .qdrant_service import QDRANT_COLLECTION, ensure_collection, get_client


class BgeM3Embedding(BaseEmbedding):
    """Wraps our local sentence-transformers BGE-M3 model for LlamaIndex."""

    def _get_query_embedding(self, query: str) -> list[float]:
        return embed_text(query)

    def _get_text_embedding(self, text: str) -> list[float]:
        return embed_text(text)

    def _get_text_embeddings(self, texts: list[str]) -> list[list[float]]:
        return embed_texts(texts)

    async def _aget_query_embedding(self, query: str) -> list[float]:
        return self._get_query_embedding(query)

    async def _aget_text_embedding(self, text: str) -> list[float]:
        return self._get_text_embedding(text)


@lru_cache(maxsize=1)
def get_index() -> VectorStoreIndex:
    ensure_collection()
    Settings.embed_model = BgeM3Embedding()

    vector_store = QdrantVectorStore(client=get_client(), collection_name=QDRANT_COLLECTION)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    return VectorStoreIndex.from_vector_store(vector_store=vector_store, storage_context=storage_context)


def query_rag(question: str) -> dict[str, Any]:
    index = get_index()
    query_engine = index.as_query_engine()
    response = query_engine.query(question)
    return {"answer": str(response), "sources": [node.node.metadata for node in response.source_nodes]}
