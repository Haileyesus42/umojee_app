import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

try:
    from pymongo import MongoClient
    from pymongo.collection import Collection
    from pymongo.database import Database
except ImportError as exc:
    raise ImportError(
        "pymongo is required to use the MongoDB utilities. Install it with `pip install pymongo`."
    ) from exc

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb+srv://vipinchaudhary:fNTLn4s17coZlvqT@cluster0.8e1ltns.mongodb.net/?retryWrites=true&w=majority")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "umoja_ai")
_FALLBACK_URI = "mongodb+srv://vipinchaudhary:fNTLn4s17coZlvqT@cluster0.8e1ltns.mongodb.net/?retryWrites=true&w=majority"

_client: Optional[MongoClient] = None


def _mk_client(uri: str) -> MongoClient:
    client = MongoClient(uri, serverSelectionTimeoutMS=5_000)
    # Ping to surface connectivity issues eagerly.
    client.admin.command("ping")
    return client


def get_mongo_client() -> MongoClient:
    """
    Return a cached MongoClient, falling back to localhost if the configured URI fails.
    """
    global _client

    if _client is not None:
        return _client

    try:
        _client = _mk_client(MONGODB_URI)
    except Exception:
        if MONGODB_URI != _FALLBACK_URI:
            _client = _mk_client(_FALLBACK_URI)
        else:
            raise
    return _client


def get_database(name: Optional[str] = None) -> Database:
    """
    Retrieve the configured MongoDB database (or the provided name) using the shared client.
    """
    db_name = name or MONGODB_DB_NAME
    if not db_name:
        raise ValueError("MongoDB database name is not configured.")
    return get_mongo_client()[db_name]


def get_collection(collection_name: str, *, database: Optional[Database] = None) -> Collection:
    """
    Convenience helper to fetch a collection, optionally from a supplied Database instance.
    """
    if not collection_name:
        raise ValueError("collection_name is required.")
    db = database or get_database()
    return db[collection_name]


def close_mongo_client() -> None:
    """
    Close the shared MongoClient and clear the cache.
    """
    global _client
    if _client is not None:
        _client.close()
        _client = None
