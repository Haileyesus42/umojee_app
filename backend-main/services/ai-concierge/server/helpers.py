import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, AnyMessage, HumanMessage
from pydantic import BaseModel
from rich.console import Console

from server.embeddings import embed_text
from server.mongo_db import get_collection
from server.mongo_repo import list_conversations_for_user
import logging

logger = logging.getLogger(__name__)

# Optional Postgres pgvector support
try:
    from server import pg_db
except Exception:
    pg_db = None  # type: ignore

console = Console(highlight=False)


class ConversationMsg(BaseModel):
    role: str  # "human" or "ai"
    content: str


class Conversation(BaseModel):
    id: str
    user_id: str
    messages: List[ConversationMsg] = []
    updated_at: datetime
    title: Optional[str] = None

class FlightUpdateData(BaseModel):
    bookingId: str
    flightNumber: str
    airline: Optional[str] = None
    departureCity: Optional[str] = None
    oldStatus: str
    newStatus: str
    newDepartureTime: Optional[str] = None  
    gate: Optional[str] = None
    delayDuration: Optional[int] = 0
    provider: Optional[str] = "Amadeus"
    

class WebhookPayload(BaseModel):
    userId: str
    threadId: Optional[str] = None
    eventType: str
    data: FlightUpdateData
    
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_lang_messages(msgs: List[ConversationMsg]) -> List[AnyMessage]:
    out: List[AnyMessage] = []
    for m in msgs:
        if m.role == "human":
            out.append(HumanMessage(content=m.content))
        else:
            out.append(AIMessage(content=m.content))
    return out


def _from_lang_messages(msgs: List[AnyMessage]) -> List[ConversationMsg]:
    out: List[ConversationMsg] = []
    for m in msgs:
        role = "human"
        if isinstance(m, AIMessage):
            role = "ai"
        # m.content can be str or list of parts; normalize to string
        content = m.content
        if isinstance(content, list):
            # Join any structured parts into a single string
            content = " ".join(str(p) for p in content)
        out.append(ConversationMsg(role=role, content=str(content)))
    return out


def _groq_configured() -> bool:
    # Minimal check: GROQ_API_KEY present in env
    return bool(os.getenv("GROQ_API_KEY"))


def _bool_env(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.lower() in ("1", "true", "yes", "on")


VECTOR_SEARCH_ENABLED = _bool_env("VECTOR_SEARCH_ENABLED", True)
VECTOR_K = int(os.getenv("VECTOR_K", "5"))
VECTOR_NUM_CANDIDATES = int(os.getenv("VECTOR_NUM_CANDIDATES", "200"))
VECTOR_INDEX_NAME = os.getenv("VECTOR_INDEX_NAME", "ai_messages_vector")
WARM_START_MAX_PER_CONV = int(os.getenv("WARM_START_MAX_PER_CONV", "6"))


def _maybe_embed(text: str, *, as_query: bool = False) -> Optional[List[float]]:
    if not text or not VECTOR_SEARCH_ENABLED:
        return None
    try:
        return embed_text(text, as_query=as_query)
    except Exception as exc:
        console.print(f"[yellow]Embedding failed (continuing without vectors): {exc}[/yellow]")
        return None


def _vector_search(conv_id: str, query_vector: List[float], k: int = VECTOR_K, num_candidates: int = VECTOR_NUM_CANDIDATES) -> List[Dict[str, Any]]:
    """
    Run Atlas $vectorSearch scoped to a conversation. Returns list of docs with content/role/turn/score.
    """
    pipe: List[Dict[str, Any]] = [
        {
            "$vectorSearch": {
                "index": VECTOR_INDEX_NAME,
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": num_candidates,
                "limit": k,
                "filter": {"conversation_id": conv_id},
            }
        },
        {
            "$project": {
                "content": 1,
                "role": 1,
                "turn": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]
    # Prefer pgvector if available
    if pg_db is not None:
        try:
            logger.info('Delegating vector search to pgvector for conv=%s k=%s', conv_id, k)
            results = pg_db.vector_search(conv_id, query_vector, k=k)
            logger.info('pgvector returned %d results for conv=%s', len(results), conv_id)
            return results
        except Exception as exc:
            console.print(f"[yellow]pgvector search failed (falling back to Mongo): {exc}[/yellow]")
            logger.warning('pgvector search failed for conv=%s: %s', conv_id, exc)
    try:
        coll = get_collection("ai_messages")
        return list(coll.aggregate(pipe))
    except Exception as exc:
        console.print(f"[yellow]Vector search failed (continuing): {exc}[/yellow]")
        return []


def monitoring_vector_search(
    conv_id: str,
    query: str = "current journey monitoring: traffic weather flight status airport conditions",
    k: int = 10,
) -> List[Dict[str, Any]]:
    """
    Search ai_messages for monitoring context updates tied to a conversation.

    Returns documents with ``monitoring_type`` and ``monitoring_data`` fields
    (written by ContextMonitor._embed_to_messages).  Falls back gracefully if
    no monitoring messages exist or vector search is unavailable.
    """
    query_vec = _maybe_embed(query, as_query=True)
    if not query_vec:
        return []

    pipe: List[Dict[str, Any]] = [
        {
            "$vectorSearch": {
                "index": VECTOR_INDEX_NAME,
                "path": "embedding",
                "queryVector": query_vec,
                "numCandidates": max(k * 10, 100),
                "limit": k * 3,  # over-fetch, then post-filter
                "filter": {"conversation_id": conv_id},
            }
        },
        {
            "$project": {
                "content": 1,
                "role": 1,
                "monitoring_type": 1,
                "monitoring_data": 1,
                "created_at": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]
    # Prefer pgvector if available
    if pg_db is not None:
        try:
            logger.info('Delegating monitoring vector search to pgvector for conv=%s k=%s', conv_id, k)
            results = pg_db.vector_search(conv_id, query_vec, k=max(k * 3, k))
            logger.info('pgvector monitoring search returned %d results for conv=%s', len(results), conv_id)
            return [r for r in results if r.get("role") == "monitoring"][:k]
        except Exception as exc:
            console.print(f"[yellow]pgvector monitoring search failed (falling back to Mongo): {exc}[/yellow]")
            logger.warning('pgvector monitoring search failed for conv=%s: %s', conv_id, exc)
    try:
        coll = get_collection("ai_messages")
        results = list(coll.aggregate(pipe))
        # Post-filter to only monitoring messages (in case index doesn't filter by role)
        return [r for r in results if r.get("role") == "monitoring"][:k]
    except Exception as exc:
        console.print(f"[yellow]Monitoring vector search failed: {exc}[/yellow]")
        return []


def _recall_for_conversation(conv_id: str, user_id: str) -> List[Dict[str, Any]]:
    """
    Return up to WARM_START_MAX_PER_CONV messages for a conversation, preferring vector hits.
    """
    query_vec = _maybe_embed(f"recall highlights for conversation {conv_id} user {user_id}", as_query=True)
    hits: List[Dict[str, Any]] = []
    if query_vec:
        hits = _vector_search(conv_id, query_vec, k=WARM_START_MAX_PER_CONV, num_candidates=max(WARM_START_MAX_PER_CONV * 5, 50))
    if hits:
        return hits
    # Fallback to chronological tail
    coll = get_collection("ai_messages")
    cursor = (
        coll.find({"conversation_id": conv_id}).sort("created_at", -1).limit(WARM_START_MAX_PER_CONV)
    )
    out: List[Dict[str, Any]] = []
    for doc in cursor:
        out.append({
            "content": doc.get("content", ""),
            "role": doc.get("role", ""),
            "turn": doc.get("turn"),
        })
    out.reverse()
    return out


def _build_user_recall_context(user_id: str) -> Optional[str]:
    convs = list_conversations_for_user(user_id)
    if not convs:
        return None
    lines: List[str] = ["Returning user recall:", f"user_id={user_id}", "Past conversation highlights:"]
    for conv in convs:
        highlights = _recall_for_conversation(conv.id, user_id)
        if not highlights:
            continue
        lines.append(f"- Conversation {conv.id}:")
        for h in highlights:
            role = h.get("role", "unknown")
            turn = h.get("turn")
            content = h.get("content", "")
            prefix = f"    [{role}]"
            if turn is not None:
                prefix += f" turn={turn}"
            lines.append(f"{prefix}: {content}")
    return "\n".join(lines) if len(lines) > 3 else None


def _format_vector_hits(hits: List[Dict[str, Any]]) -> Optional[str]:
    if not hits:
        return None
    lines = ["Retrieved context (vector search):"]
    for idx, hit in enumerate(hits, start=1):
        role = hit.get("role", "unknown")
        turn = hit.get("turn")
        score = hit.get("score")
        content = hit.get("content", "")
        label = f"{idx}. [{role}]"
        if turn is not None:
            label += f" turn={turn}"
        if score is not None:
            try:
                label += f" score={float(score):.4f}"
            except Exception:
                pass
        lines.append(f"{label}: {content}")
    return "\n".join(lines)

