import os
from contextlib import contextmanager
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from langchain_core.tools import tool
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

AI_ROOT = Path(__file__).resolve().parents[2]
PRIMARY_SQLITE_DB = AI_ROOT / "ai_data.db"
load_dotenv(AI_ROOT / ".env")

try:
    from server.mongo_db import get_collection  # type: ignore
    from pymongo.errors import PyMongoError  # type: ignore
except Exception:  # pragma: no cover - fallback for environments without Mongo deps
    get_collection = None  # type: ignore

    class PyMongoError(Exception):
        ...

def _mk_engine(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


def _candidate_urls() -> List[str]:
    urls: List[str] = []
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        urls.append(env_url)
    server_db = AI_ROOT / "server" / "ai_data.db"
    root_db = PRIMARY_SQLITE_DB
    if root_db.exists():
        urls.append(f"sqlite:///{root_db.as_posix()}")
    if server_db.exists():
        urls.append(f"sqlite:///{server_db.as_posix()}")
    urls.append(f"sqlite:///{PRIMARY_SQLITE_DB.as_posix()}")
    urls.append(f"sqlite:///{server_db.as_posix()}")
    return urls


def _init_engine() -> Optional[Engine]:
    last_error: Optional[Exception] = None
    for url in _candidate_urls():
        try:
            eng = _mk_engine(url)
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            return eng
        except Exception as exc:
            last_error = exc
            continue
    if last_error:
        raise last_error
    return None


try:
    engine = _init_engine()
except Exception:
    engine = None


@contextmanager
def _get_connection():
    if engine is None:
        raise RuntimeError("Database engine is not available.")
    conn = engine.connect()
    try:
        yield conn
    finally:
        conn.close()


def _fetch_company_blob(conn, company_name: str) -> Dict[str, Any]:
    company_row = conn.execute(
        text(
            """
            SELECT id, name, website, tagline, description, mission, vision,
                   headquarters, phone
            FROM companies
            WHERE name = :name
            """
        ),
        {"name": company_name},
    ).mappings().first()

    if not company_row:
        return {}

    company_id = company_row["id"]

    def fetch_list(query: str) -> List[Dict[str, Any]]:
        rows = conn.execute(
            text(query),
            {"company_id": company_id},
        ).mappings().all()
        return [dict(row) for row in rows]

    values = fetch_list(
        """
        SELECT name, description
        FROM company_values
        WHERE company_id = :company_id
        ORDER BY name
        """
    )
    services = fetch_list(
        """
        SELECT name, summary, bullets
        FROM services
        WHERE company_id = :company_id
        ORDER BY name
        """
    )
    testimonials = fetch_list(
        """
        SELECT sector, quote, author, role
        FROM testimonials
        WHERE company_id = :company_id
        ORDER BY sector, author
        """
    )
    models = fetch_list(
        """
        SELECT name, slug, version, status, short_description, long_description
        FROM ai_models
        WHERE company_id = :company_id
        ORDER BY name
        """
    )
    personas = fetch_list(
        """
        SELECT name, slug, language, description, greeting, capabilities,
               limitations, safety, conversation_starters, system_prompt
        FROM chatbot_personas
        WHERE company_id = :company_id
        ORDER BY name
        """
    )

    company_payload: Dict[str, Any] = dict(company_row)
    company_payload.update(
        {
            "values": values,
            "services": services,
            "testimonials": testimonials,
            "ai_models": models,
            "personas": personas,
        }
    )
    return company_payload


def _serialize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _serialize_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize_value(v) for v in value]
    return value


def _get_mongo_profile(slug: str) -> Dict[str, Any]:
    if get_collection is None:
        return {"error": "MongoDB integration is not available in this runtime."}
    try:
        collection = get_collection("umoja_profiles")
    except Exception as exc:
        return {"error": f"Unable to access MongoDB: {exc}"}

    try:
        doc = collection.find_one({"slug": slug})
    except PyMongoError as exc:
        return {"error": f"MongoDB query failed: {exc}"}

    if not doc:
        return {"error": f"Profile with slug '{slug}' not found."}

    doc.pop("_id", None)
    return {
        "slug": slug,
        "profile": _serialize_value(doc),
    }


@tool
def fetch_company_knowledge(query: str = "", company_name: str = "ND IT Solutions (NDIT/Nexus)") -> Dict[str, Any]:
    """
    Retrieve official company information and related assets from the local database.

    Args:
        query: Optional topic or focus area supplied by the agent (e.g. "services", "values").
        company_name: Exact company name to match in the database.

    Returns:
        A dictionary containing company metadata, values, services, testimonials,
        AI models, personas, and the original query for context.
        Returns {"error": "..."} if the company is missing or the database query fails.
    """
    if engine is None:
        return {"error": "Database connection unavailable.", "query": query}

    try:
        with _get_connection() as conn:
            company_data = _fetch_company_blob(conn, company_name)

        if not company_data:
            return {"error": f"Company '{company_name}' not found.", "query": query}

        return {"query": query, "company": company_data}
    except Exception as exc:
        return {"error": str(exc), "query": query}


@tool
def fetch_umoja_profile(slug: str = "umoja-ai-ndit") -> Dict[str, Any]:
    """
    Retrieve the Umoja AI self-description profile stored in MongoDB.

    Args:
        slug: Profile slug to look up (defaults to the Umoja AI seed).

    Returns:
        A dictionary containing the serialized profile or an error message.
    """
    return _get_mongo_profile(slug)


# __all__ = ["fetch_company_knowledge", "fetch_umoja_profile"]
