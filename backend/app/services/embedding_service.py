import hashlib
import math
import logging
from typing import List
from ..config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", dim: int = 384):
        self.model_name = model_name
        self.dim = dim
        self._model = None
        self._load_model()

    def _load_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            # Try loading sentence transformer
            self._model = SentenceTransformer(self.model_name)
            logger.info(f"Loaded SentenceTransformer: {self.model_name}")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer ({e}). Using deterministic semantic feature hashing fallback.")
            self._model = None

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        if self._model is not None:
            try:
                embeddings = self._model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.tolist()
            except Exception as e:
                logger.error(f"Error encoding with SentenceTransformer: {e}. Falling back.")

        return [self._hash_embed(t) for t in texts]

    def embed_query(self, query: str) -> List[float]:
        results = self.embed_texts([query])
        return results[0] if results else [0.0] * self.dim

    def _hash_embed(self, text: str) -> List[float]:
        """
        Deterministic, fast n-gram & token feature hashing embedding fallback.
        Preserves cosine similarity properties for identical and overlapping tokens/code identifiers.
        """
        vec = [0.0] * self.dim
        import re
        tokens = re.findall(r"[A-Za-z0-9_]{2,}", text.lower())
        if not tokens:
            return vec

        for token in tokens:
            # Hash token to dimension
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dim
            sign = 1.0 if ((h >> 8) & 1) else -1.0
            vec[idx] += sign

        # Add 3-char n-grams for fuzzy code matching
        for i in range(len(text) - 2):
            ngram = text[i:i+3].lower()
            h = int(hashlib.md5(ngram.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dim
            vec[idx] += 0.25 * (1.0 if ((h >> 8) & 1) else -1.0)

        # L2 normalize
        norm = math.sqrt(sum(x * x for x in vec)) or 1e-9
        return [x / norm for x in vec]


embedding_service = EmbeddingService(model_name=settings.EMBEDDING_MODEL)

def get_embedding_service() -> EmbeddingService:
    return embedding_service
