"""
Sentence embeddings for semantic similarity.
"""
from threading import Lock
import numpy as np

_model = None
_model_lock = Lock()


def _get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer
                _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed(text: str) -> list[float]:
    """Return a 384-dim embedding as a plain Python list (JSON-serializable)."""
    model = _get_model()
    vec = model.encode(text, normalize_embeddings=True)  # unit length
    return vec.tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two embeddings."""
    av = np.asarray(a, dtype=np.float32)
    bv = np.asarray(b, dtype=np.float32)
    return float(np.dot(av, bv))