from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional

from pymongo.collection import Collection
from pymongo import ReturnDocument

from server.mongo_db import get_collection
try:
    from server import pg_db
except Exception:
    pg_db = None  # type: ignore
import logging

logger = logging.getLogger(__name__)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _conversations() -> Collection:
    return get_collection("ai_conversations")


def _messages() -> Collection:
    return get_collection("ai_messages")


def _destination_recommendation_logs() -> Collection:
    return get_collection("ai_destination_recommendation_logs")


@dataclass
class ConversationRecord:
    id: str
    user_id: str
    updated_at: datetime
    title: Optional[str] = None
    journey_id: Optional[str] = None


@dataclass
class MessageRecord:
    conversation_id: str
    role: str
    content: str
    created_at: datetime
    route: Optional[str] = None


def create_conversation(conv_id: str, user_id: str, journey_id: Optional[str] = None) -> ConversationRecord:
    doc = {
        "_id": conv_id,
        "user_id": user_id,
        "updated_at": _now_utc(),
        "title": None,
    }
    if journey_id:
        doc["journey_id"] = journey_id
    _conversations().update_one({"_id": conv_id}, {"$setOnInsert": doc}, upsert=True)
    created = _conversations().find_one({"_id": conv_id})
    return _deserialize_conversation(created)


def get_conversation(conv_id: str) -> Optional[ConversationRecord]:
    doc = _conversations().find_one({"_id": conv_id})
    return _deserialize_conversation(doc) if doc else None


def list_conversations_for_user(user_id: str) -> List[ConversationRecord]:
    docs = (
        _conversations()
        .find({"user_id": user_id})
        .sort("updated_at", -1)
    )
    return [_deserialize_conversation(doc) for doc in docs]


def list_conversations_for_journey(journey_id: str) -> List[ConversationRecord]:
    """List all conversations linked to a specific journey."""
    docs = (
        _conversations()
        .find({"journey_id": journey_id})
        .sort("updated_at", -1)
    )
    return [_deserialize_conversation(doc) for doc in docs]


def list_general_conversations_for_user(user_id: str) -> List[ConversationRecord]:
    """List conversations NOT linked to any journey (JourneyListingPage / generic chats)."""
    docs = (
        _conversations()
        .find({"user_id": user_id, "journey_id": {"$exists": False}})
        .sort("updated_at", -1)
    )
    return [_deserialize_conversation(doc) for doc in docs]


def list_messages(conv_id: str) -> List[MessageRecord]:
    docs = (
        _messages()
        .find({"conversation_id": conv_id})
        .sort("created_at", 1)
    )
    return [_deserialize_message(doc) for doc in docs]


def append_message(
    conv_id: str,
    role: str,
    content: str,
    embedding: Optional[list] = None,
    route: Optional[str] = None,
) -> MessageRecord:
    now = _now_utc()
    doc = {
        "conversation_id": conv_id,
        "role": role,
        "content": content,
        "created_at": now,
    }
    if route:
        doc["route"] = route
    if embedding is not None:
        doc["embedding"] = embedding
    result = _messages().insert_one(doc)
    _conversations().update_one(
        {"_id": conv_id},
        {
            "$set": {
                "updated_at": now,
            }
        },
    )
    inserted = _messages().find_one({"_id": result.inserted_id})
    # Persist embedding to Postgres pgvector table if configured
    try:
        if embedding is not None and pg_db is not None:
            # message_id: use string of Mongo ObjectId
            pg_db.insert_vector(str(result.inserted_id), conv_id, embedding, role=role, content=content, turn=None, created_at=now)
            logger.info('Persisted embedding to pgvector for conv=%s msg=%s', conv_id, str(result.inserted_id))
    except Exception as exc:
        # Do not fail if Postgres persistence fails; keep MongoDB as primary store
        logger.warning('Failed to persist embedding to pgvector for conv=%s: %s', conv_id, exc)
    return _deserialize_message(inserted)


def delete_conversation(conv_id: str) -> bool:
    """
    Delete a conversation and all of its messages. Returns True if any records were removed.
    """
    convo_deleted = _conversations().delete_one({"_id": conv_id}).deleted_count
    messages_deleted = _messages().delete_many({"conversation_id": conv_id}).deleted_count
    return (convo_deleted + messages_deleted) > 0


def last_message_text(conv_id: str) -> str:
    cursor = (
        _messages()
        .find({"conversation_id": conv_id}, {"content": 1})
        .sort("created_at", -1)
        .limit(1)
    )
    doc = next(cursor, None)
    return doc.get("content") if doc else ""


def update_conversation_title(conv_id: str, title: Optional[str]) -> Optional[ConversationRecord]:
    if title is None:
        update = {"$unset": {"title": ""}}
    else:
        update = {"$set": {"title": title}}
    doc = _conversations().find_one_and_update(
        {"_id": conv_id},
        update,
        return_document=ReturnDocument.AFTER,
    )
    return _deserialize_conversation(doc) if doc else None


def _deserialize_conversation(doc) -> ConversationRecord:
    if not doc:
        raise ValueError("Conversation document is missing")
    return ConversationRecord(
        id=str(doc.get("_id")),
        user_id=doc.get("user_id"),
        updated_at=_ensure_timezone(doc.get("updated_at")),
        title=doc.get("title"),
        journey_id=doc.get("journey_id"),
    )


def _deserialize_message(doc) -> MessageRecord:
    if not doc:
        raise ValueError("Message document is missing")
    return MessageRecord(
        conversation_id=doc.get("conversation_id"),
        role=doc.get("role"),
        content=doc.get("content"),
        created_at=_ensure_timezone(doc.get("created_at")),
        route=doc.get("route"),
    )


def ensure_indexes() -> None:
    """
    Create indexes required for efficient lookups. Safe to call multiple times.
    """
    # Conversation and message indexes
    _conversations().create_index([("user_id", 1), ("updated_at", -1)])
    _conversations().create_index([("journey_id", 1), ("updated_at", -1)])
    _messages().create_index([("conversation_id", 1), ("created_at", 1)])

    # Journey indexes (Phase 1: Foundation)
    _journeys().create_index([("user_id", 1), ("updated_at", -1)])
    _journeys().create_index([("user_id", 1), ("status", 1), ("updated_at", -1)])
    _journeys().create_index([("conversation_id", 1)])
    _journeys().create_index([("status", 1), ("updated_at", -1)])

    # Destination recommendation logs/cache
    _destination_recommendation_logs().create_index([("user_id", 1), ("created_at", -1)])
    _destination_recommendation_logs().create_index([("provider", 1), ("created_at", -1)])


def _ensure_timezone(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


# =============================================================================
# Journey CRUD Operations (Phase 1: Foundation)
# =============================================================================

def _journeys() -> Collection:
    """Get the journeys collection."""
    return get_collection("journeys")


def create_journey(journey_doc: dict) -> dict:
    """
    Create a new journey document in MongoDB.

    Args:
        journey_doc: Journey document (from Journey.to_mongo_dict())

    Returns:
        The created journey document
    """
    # Ensure timestamps
    if "created_at" not in journey_doc:
        journey_doc["created_at"] = _now_utc()
    if "updated_at" not in journey_doc:
        journey_doc["updated_at"] = _now_utc()

    # Insert the journey
    _journeys().insert_one(journey_doc)

    # Return the created document
    return _journeys().find_one({"_id": journey_doc["_id"]})


def get_journey(journey_id: str) -> Optional[dict]:
    """
    Retrieve a journey by ID.

    Args:
        journey_id: The journey ID to retrieve

    Returns:
        The journey document or None if not found
    """
    return _journeys().find_one({"_id": journey_id})


def get_active_journeys() -> List[dict]:
    """
    Get all active (in-progress) journeys.
    
    Returns:
        List of active journey documents
    """
    return list(_journeys().find({"status": "active"}).sort("updated_at", -1))


def get_journey_by_user(user_id: str, active_only: bool = True) -> Optional[dict]:
    """
    Get the most recent journey for a user.

    Args:
        user_id: The user ID
        active_only: If True, only return journeys that are in_progress

    Returns:
        The most recent journey document or None
    """
    query = {"user_id": user_id}
    if active_only:
        query["status"] = "in_progress"

    return _journeys().find_one(query, sort=[("updated_at", -1)])


def list_journeys_for_user(user_id: str, limit: int = 10) -> List[dict]:
    """
    List all journeys for a user, sorted by most recent.

    Args:
        user_id: The user ID
        limit: Maximum number of journeys to return

    Returns:
        List of journey documents
    """
    cursor = (
        _journeys()
        .find({"user_id": user_id})
        .sort("updated_at", -1)
        .limit(limit)
    )
    return list(cursor)


def update_journey(journey_id: str, updates: dict) -> Optional[dict]:
    """
    Update a journey document.

    Args:
        journey_id: The journey ID
        updates: Dictionary of fields to update

    Returns:
        The updated journey document or None if not found
    """
    # Always update the updated_at timestamp
    updates["updated_at"] = _now_utc()

    doc = _journeys().find_one_and_update(
        {"_id": journey_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    return doc


def update_journey_segment(journey_id: str, segment_type: str, segment_updates: dict) -> Optional[dict]:
    """
    Update a specific segment within a journey.

    Args:
        journey_id: The journey ID
        segment_type: The segment type to update
        segment_updates: Dictionary of segment fields to update

    Returns:
        The updated journey document or None if not found
    """
    # Build the update query to modify the specific segment in the array
    update_query = {}
    for key, value in segment_updates.items():
        update_query[f"segments.$[elem].{key}"] = value

    # Always update the journey's updated_at timestamp
    update_query["updated_at"] = _now_utc()

    doc = _journeys().find_one_and_update(
        {"_id": journey_id},
        {"$set": update_query},
        array_filters=[{"elem.segment_type": segment_type}],
        return_document=ReturnDocument.AFTER,
    )
    return doc


def update_journey_context(journey_id: str, context_updates: dict) -> Optional[dict]:
    """
    Update the journey context.

    Args:
        journey_id: The journey ID
        context_updates: Dictionary of context fields to update

    Returns:
        The updated journey document or None if not found
    """
    # Build the update query for nested context fields
    update_query = {}
    for key, value in context_updates.items():
        update_query[f"context.{key}"] = value

    # Always update the journey's updated_at timestamp
    update_query["updated_at"] = _now_utc()

    doc = _journeys().find_one_and_update(
        {"_id": journey_id},
        {"$set": update_query},
        return_document=ReturnDocument.AFTER,
    )
    return doc


def complete_journey(journey_id: str) -> Optional[dict]:
    """
    Mark a journey as completed.

    Args:
        journey_id: The journey ID

    Returns:
        The updated journey document or None if not found
    """
    return update_journey(journey_id, {"status": "completed"})


def cancel_journey(journey_id: str) -> Optional[dict]:
    """
    Mark a journey as cancelled.

    Args:
        journey_id: The journey ID

    Returns:
        The updated journey document or None if not found
    """
    return update_journey(journey_id, {"status": "cancelled"})


def archive_journey(journey_id: str) -> bool:
    """
    Archive a journey (soft delete - adds archived flag).

    Args:
        journey_id: The journey ID

    Returns:
        True if successful, False if not found
    """
    result = _journeys().update_one(
        {"_id": journey_id},
        {
            "$set": {
                "status": "cancelled",
                "archived": True,
                "archived_at": _now_utc(),
                "updated_at": _now_utc(),
            }
        }
    )
    return result.modified_count > 0


def get_active_journey_for_user(user_id: str) -> Optional[dict]:
    """
    Get the journey currently marked as active for a user (is_active=True).

    Args:
        user_id: The user ID

    Returns:
        The active journey document or None
    """
    return _journeys().find_one({"user_id": user_id, "is_active": True})


def set_active_journey(journey_id: str, user_id: str) -> Optional[dict]:
    """
    Mark a journey as the user's active (tracked) journey.

    First clears ``is_active`` from every journey belonging to the user,
    then sets ``is_active=True`` on the specified journey.

    Args:
        journey_id: The journey to activate
        user_id: The owning user – used to clear previous active journeys

    Returns:
        The updated journey document, or None if not found
    """
    now = _now_utc()

    # Step 1: clear is_active on ALL journeys for this user
    _journeys().update_many(
        {"user_id": user_id, "is_active": True},
        {"$set": {"is_active": False, "updated_at": now}},
    )

    # Step 2: set the requested journey as active
    doc = _journeys().find_one_and_update(
        {"_id": journey_id},
        {"$set": {"is_active": True, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    return doc


def delete_journey(journey_id: str) -> bool:
    """
    Permanently delete a journey.

    Args:
        journey_id: The journey ID

    Returns:
        True if deleted, False if not found
    """
    result = _journeys().delete_one({"_id": journey_id})
    return result.deleted_count > 0


def delete_all_journeys_for_user(user_id: str) -> int:
    """
    Permanently delete all journeys for a specific user.

    Args:
        user_id: The user ID

    Returns:
        The number of journeys deleted
    """
    result = _journeys().delete_many({"user_id": user_id})
    return result.deleted_count


def get_latest_destination_recommendation_log(
    user_id: str,
    provider: Optional[str] = None,
) -> Optional[dict]:
    """Return the latest destination recommendation log for a user."""
    query = {"user_id": user_id}
    if provider:
        query["provider"] = provider
    return _destination_recommendation_logs().find_one(query, sort=[("created_at", -1)])


def list_destination_recommendation_logs_since(
    user_id: str,
    since: datetime,
    provider: Optional[str] = None,
    limit: int = 20,
) -> List[dict]:
    """Return recent destination recommendation logs for a user."""
    query = {"user_id": user_id, "created_at": {"$gte": since}}
    if provider:
        query["provider"] = provider
    return list(
        _destination_recommendation_logs()
        .find(query)
        .sort("created_at", -1)
        .limit(limit)
    )


def create_destination_recommendation_log(
    user_id: str,
    provider: str,
    response: dict,
    *,
    source: str = "recommend_destinations",
    user_data: Optional[dict] = None,
) -> dict:
    """Persist a destination recommendation response as an auditable log."""
    now = _now_utc()
    doc = {
        "user_id": user_id,
        "provider": provider,
        "response": response,
        "source": source,
        "created_at": now,
        "updated_at": now,
    }
    if user_data is not None:
        doc["user_data"] = user_data
    result = _destination_recommendation_logs().insert_one(doc)
    return _destination_recommendation_logs().find_one({"_id": result.inserted_id})

def get_monitoring_settings() -> dict:
    """Read the local monitoring settings map from JSON."""
    import os
    import json
    settings_path = os.path.join(os.path.dirname(__file__), "monitoring_settings.json")
    if os.path.exists(settings_path):
        try:
            with open(settings_path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}
