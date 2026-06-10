"""
Local embedding helper for vector search.

Model: default intfloat/e5-large-v2 (1024-d).
Environment:
  EMBEDDING_MODEL                  optional override (e.g., "intfloat/e5-large-v2")
  EMBEDDING_LOCAL_FILES_ONLY       when true, do not attempt remote Hugging Face download
  EMBEDDING_RETRY_COOLDOWN_SECONDS cooldown after a load failure before retrying
  EMBEDDING_MAX_CPU_THREADS        caps torch CPU threads for cooler local development
"""

import os
import time
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

# Reduce tokenizer/BLAS contention before importing sentence_transformers.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

from sentence_transformers import SentenceTransformer
import torch

DEFAULT_MODEL = os.getenv("EMBEDDING_MODEL", "intfloat/e5-large-v2")
LOCAL_FILES_ONLY = os.getenv("EMBEDDING_LOCAL_FILES_ONLY", "true").lower() in ("1", "true", "yes", "on")
RETRY_COOLDOWN_SECONDS = int(os.getenv("EMBEDDING_RETRY_COOLDOWN_SECONDS", "300"))
MAX_CPU_THREADS = max(1, int(os.getenv("EMBEDDING_MAX_CPU_THREADS", "1")))

torch.set_num_threads(MAX_CPU_THREADS)
if hasattr(torch, "set_num_interop_threads"):
    torch.set_num_interop_threads(1)

_model: Optional[SentenceTransformer] = None
_last_load_failed_at: float = 0.0
_last_load_error: Optional[str] = None


def _get_model() -> SentenceTransformer:
    global _model, _last_load_failed_at, _last_load_error

    if _model is not None:
        return _model

    now = time.time()
    if _last_load_error and (now - _last_load_failed_at) < RETRY_COOLDOWN_SECONDS:
        remaining = int(RETRY_COOLDOWN_SECONDS - (now - _last_load_failed_at))
        raise RuntimeError(
            f"Embedding model unavailable; retrying after cooldown in {remaining}s. "
            f"Last error: {_last_load_error}"
        )

    try:
        logger.info(
            "Loading embedding model '%s' on cpu (local_files_only=%s, max_cpu_threads=%s)",
            DEFAULT_MODEL,
            LOCAL_FILES_ONLY,
            MAX_CPU_THREADS,
        )
        _model = SentenceTransformer(
            DEFAULT_MODEL,
            device="cpu",
            local_files_only=LOCAL_FILES_ONLY,
        )
        dim = _model.get_sentence_embedding_dimension()
        logger.info("Embedding model ready: %s (dim=%s)", DEFAULT_MODEL, dim)
        _last_load_error = None
        _last_load_failed_at = 0.0
        return _model
    except Exception as exc:
        _last_load_error = str(exc)
        _last_load_failed_at = time.time()
        logger.warning(
            "Embedding model load failed for '%s' (local_files_only=%s). "
            "Vector search will be skipped until a later retry. Error: %s",
            DEFAULT_MODEL,
            LOCAL_FILES_ONLY,
            exc,
        )
        raise


def embed_text(text: str, *, as_query: bool = False) -> List[float]:
    """
    Return a 1024-d embedding for Atlas Vector Search.
    E5 models expect "query:" for queries and "passage:" for documents.
    """
    if not text:
        return []
    model = _get_model()
    prefix = "query: " if as_query else "passage: "
    vec = model.encode([prefix + text], normalize_embeddings=False)[0]
    out = vec.astype(float).tolist()
    # Log that an embedding was produced (avoid dumping full content)
    try:
        logger.info('Computed embedding (len=%d) as_query=%s', len(out), bool(as_query))
    except Exception:
        pass
    return out
