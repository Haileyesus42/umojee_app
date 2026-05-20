import os
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    import psycopg
    from psycopg.rows import dict_row
    from pgvector.psycopg import register_vector, Vector
except Exception:
    psycopg = None  # type: ignore

PGVECTOR_URL = os.getenv("PGVECTOR_URL")

_conn = None


def _get_conn():
    global _conn
    if _conn:
        return _conn
    if not PGVECTOR_URL:
        raise RuntimeError("PGVECTOR_URL is not configured")
    if not psycopg:
        raise RuntimeError("psycopg or pgvector not installed")
    _conn = psycopg.connect(PGVECTOR_URL, autocommit=True, row_factory=dict_row)
    register_vector(_conn)
    try:
        # Try to extract host info without printing credentials
        dsn = getattr(_conn, "info", None)
        host = None
        if dsn and hasattr(dsn, "dsn_parameters"):
            params = dsn.dsn_parameters
            host = params.get("host") if isinstance(params, dict) else None
        logger.info("Connected to pgvector database (host=%s)", host)
    except Exception:
        logger.info("Connected to pgvector database")
    return _conn


def check_health() -> None:
    """
    Verify PGVector connectivity at startup. Raises RuntimeError if unhealthy.
    Checks: env var set, dependencies installed, connection works, pgvector extension loaded.
    """
    if not PGVECTOR_URL:
        raise RuntimeError(
            "PGVECTOR_URL environment variable is not set. "
            "Set it to a valid PostgreSQL connection string (e.g. postgresql://user:pass@host:5432/db)."
        )
    if not psycopg:
        raise RuntimeError(
            "Required packages 'psycopg' and/or 'pgvector' are not installed. "
            "Install them with: pip install 'psycopg[binary]' pgvector"
        )
    try:
        conn = _get_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.execute("SELECT extname FROM pg_extension WHERE extname = 'vector'")
            row = cur.fetchone()
            if not row:
                raise RuntimeError(
                    "pgvector extension is not installed in the database. "
                    "Run: CREATE EXTENSION IF NOT EXISTS vector;"
                )
        logger.info("PGVector health check passed")
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(
            f"PGVector health check failed — cannot connect to PostgreSQL at "
            f"{PGVECTOR_URL}: {exc}"
        ) from exc


def insert_vector(
    message_id: str,
    conversation_id: str,
    embedding: List[float],
    role: Optional[str] = None,
    content: Optional[str] = None,
    turn: Optional[int] = None,
    created_at: Optional[Any] = None,
) -> None:
    conn = _get_conn()
    with conn.cursor() as cur:
        emb_val = Vector(embedding) if embedding is not None else None
        cur.execute(
            """
            INSERT INTO ai_vectors (message_id, conversation_id, role, content, turn, embedding, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (message_id, conversation_id, role, content, turn, emb_val, created_at),
        )
    logger.info("Inserted embedding for conversation=%s message_id=%s", conversation_id, message_id)


def vector_search(conversation_id: str, query_vector: List[float], k: int = 5) -> List[Dict[str, Any]]:
    """Return list of dicts with keys: content, role, turn, score"""
    try:
        conn = _get_conn()
    except Exception as exc:
        raise
    with conn.cursor() as cur:
        # Ensure we pass a pgvector.Vector so cosine distance works with pgvector.
        qv = Vector(query_vector)
        cur.execute(
            """
            SELECT content, role, turn, created_at,
                   1 - (embedding <=> %s) AS score
            FROM ai_vectors
            WHERE conversation_id = %s
            ORDER BY embedding <=> %s
            LIMIT %s
            """,
            (qv, conversation_id, qv, k),
        )
        rows = cur.fetchall()
    out = [dict(r) for r in rows]
    logger.info("pgvector search conv=%s k=%s results=%d", conversation_id, k, len(out))
    return out
