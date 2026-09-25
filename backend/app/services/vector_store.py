from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import os
import logging
from ..config import settings

logger = logging.getLogger(__name__)

class BaseVectorStore(ABC):
    """
    Abstract Vector Store interface.
    Swapping to Pinecone, Weaviate, Qdrant, or FAISS is a one-file change
    by implementing this interface.
    """

    @abstractmethod
    def add_documents(
        self,
        repo_id: int,
        ids: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        documents: List[str],
    ) -> None:
        """Add or update vector documents scoped to repo_id."""
        pass

    @abstractmethod
    def query(
        self,
        repo_id: int,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Query top-k documents for a specific repo_id."""
        pass

    @abstractmethod
    def delete_repo(self, repo_id: int) -> None:
        """Purge all documents associated with repo_id."""
        pass

    @abstractmethod
    def delete_by_ids(self, repo_id: int, ids: List[str]) -> None:
        """Delete specific documents by id."""
        pass


class ChromaVectorStore(BaseVectorStore):
    """
    Local ChromaDB vector store implementation.
    Stores embeddings in a persistent directory, partitioned/filtered by repo_id.
    """

    def __init__(self, persist_directory: Optional[str] = None):
        self.persist_directory = persist_directory or settings.VECTOR_DB_PATH
        self._client = None
        self._collections: Dict[str, Any] = {}
        self._init_client()

    def _init_client(self):
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
            os.makedirs(self.persist_directory, exist_ok=True)
            self._client = chromadb.PersistentClient(path=self.persist_directory)
            logger.info(f"Initialized ChromaDB at {self.persist_directory}")
        except Exception as e:
            logger.warning(f"ChromaDB initialization failed: {e}. Using in-memory fallback store.")
            self._client = None
            self._memory_store = {}

    def _get_collection(self, repo_id: int):
        collection_name = f"repo_{repo_id}"
        if self._client is not None:
            return self._client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        return None

    def add_documents(
        self,
        repo_id: int,
        ids: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        documents: List[str],
    ) -> None:
        if not ids:
            return

        collection = self._get_collection(repo_id)
        if collection is not None:
            # Upsert into ChromaDB
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=documents,
            )
        else:
            # In-memory fallback
            if repo_id not in self._memory_store:
                self._memory_store[repo_id] = {}
            for i, doc_id in enumerate(ids):
                self._memory_store[repo_id][doc_id] = {
                    "id": doc_id,
                    "embedding": embeddings[i],
                    "metadata": metadatas[i],
                    "document": documents[i],
                }

    def query(
        self,
        repo_id: int,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        collection = self._get_collection(repo_id)
        results = []

        if collection is not None:
            try:
                chroma_res = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=min(top_k, max(1, collection.count())),
                    where=filter_metadata,
                )
                if chroma_res and chroma_res["ids"] and len(chroma_res["ids"][0]) > 0:
                    for i in range(len(chroma_res["ids"][0])):
                        results.append({
                            "id": chroma_res["ids"][0][i],
                            "document": chroma_res["documents"][0][i] if chroma_res.get("documents") else "",
                            "metadata": chroma_res["metadatas"][0][i] if chroma_res.get("metadatas") else {},
                            "distance": chroma_res["distances"][0][i] if chroma_res.get("distances") else 0.0,
                            "similarity": 1.0 - (chroma_res["distances"][0][i] if chroma_res.get("distances") else 0.0),
                        })
            except Exception as e:
                logger.error(f"Error querying ChromaDB: {e}")
                return []
        else:
            # Simple cosine similarity in memory
            import math
            repo_items = self._memory_store.get(repo_id, {})
            scored = []
            
            def dot(a, b):
                return sum(x * y for x, y in zip(a, b))
            
            def norm(a):
                return math.sqrt(sum(x * x for x in a)) or 1e-9

            for doc_id, item in repo_items.items():
                emb = item["embedding"]
                sim = dot(query_embedding, emb) / (norm(query_embedding) * norm(emb))
                scored.append((sim, item))

            scored.sort(key=lambda x: x[0], reverse=True)
            for sim, item in scored[:top_k]:
                results.append({
                    "id": item["id"],
                    "document": item["document"],
                    "metadata": item["metadata"],
                    "similarity": float(sim),
                    "distance": 1.0 - float(sim),
                })

        return results

    def delete_repo(self, repo_id: int) -> None:
        collection_name = f"repo_{repo_id}"
        if self._client is not None:
            try:
                self._client.delete_collection(name=collection_name)
            except Exception as e:
                logger.debug(f"Collection {collection_name} not found or error deleting: {e}")
        if hasattr(self, "_memory_store") and repo_id in self._memory_store:
            del self._memory_store[repo_id]

    def delete_by_ids(self, repo_id: int, ids: List[str]) -> None:
        if not ids:
            return
        collection = self._get_collection(repo_id)
        if collection is not None:
            try:
                collection.delete(ids=ids)
            except Exception as e:
                logger.error(f"Error deleting IDs from ChromaDB: {e}")
        elif hasattr(self, "_memory_store") and repo_id in self._memory_store:
            for i in ids:
                self._memory_store[repo_id].pop(i, None)


# Default vector store singleton
vector_store = ChromaVectorStore()

def get_vector_store() -> BaseVectorStore:
    """Dependency injector / factory for vector store."""
    return vector_store
