"""
Response Cache System for API Responses

Solves the problem of large API responses (Amadeus flights, hotels, cars) being
trimmed from context due to message optimization. Responses are saved to disk
and can be retrieved by subsequent agents without re-calling APIs.

Usage:
    from agent.response_cache import cache_response, get_cached_response

    # After API call
    cache_response(conversation_id, "flight_search", flight_data, query_params)

    # Before API call
    cached = get_cached_response(conversation_id, "flight_search", query_params)
    if cached:
        return cached  # Use cached data
"""

import json
import os
import time
import hashlib
from typing import Any, Dict, Optional
from pathlib import Path


# Cache configuration
CACHE_DIR = Path(__file__).parent.parent / ".response_cache"
CACHE_TTL = 3600  # 1 hour (Amadeus data changes, so don't cache too long)
MAX_CACHE_SIZE_MB = 100  # Prevent unbounded growth


def _ensure_cache_dir():
    """Create cache directory if it doesn't exist"""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _generate_cache_key(conversation_id: str, operation: str, params: Dict[str, Any]) -> str:
    """
    Generate cache key from conversation_id + operation + params

    Args:
        conversation_id: Unique conversation identifier
        operation: Type of operation (e.g., "flight_search", "hotel_search")
        params: Query parameters that make this request unique

    Returns:
        Cache key string (safe filename)
    """
    # Sort params for consistent keys
    sorted_params = json.dumps(params, sort_keys=True)
    param_hash = hashlib.md5(sorted_params.encode()).hexdigest()[:8]

    # Create safe filename: conv_id__operation__param_hash
    safe_key = f"{conversation_id}__{operation}__{param_hash}"
    return safe_key


def _get_cache_path(cache_key: str) -> Path:
    """Get full path to cache file"""
    return CACHE_DIR / f"{cache_key}.json"


def cache_response(
    conversation_id: str,
    operation: str,
    response_data: Any,
    query_params: Optional[Dict[str, Any]] = None,
    ttl: Optional[int] = None,
) -> str:
    """
    Cache an API response to disk

    Args:
        conversation_id: Conversation ID
        operation: Operation type ("flight_search", "hotel_search", etc.)
        response_data: The API response to cache
        query_params: Query parameters that produced this response
        ttl: Optional custom time-to-live in seconds (default: CACHE_TTL / 1 hour)

    Returns:
        Cache key (for debugging/logging)
    """
    _ensure_cache_dir()

    if query_params is None:
        query_params = {}

    cache_key = _generate_cache_key(conversation_id, operation, query_params)
    cache_path = _get_cache_path(cache_key)

    cache_entry = {
        "conversation_id": conversation_id,
        "operation": operation,
        "query_params": query_params,
        "response_data": response_data,
        "cached_at": time.time(),
        "expires_at": time.time() + (ttl if ttl is not None else CACHE_TTL),
    }

    try:
        with open(cache_path, "w") as f:
            json.dump(cache_entry, f)

        # Log cache save (optional)
        # print(f"[Cache] Saved {operation} for conversation {conversation_id[:8]}...")

    except Exception as e:
        # Don't fail if cache write fails
        print(f"[Cache Warning] Failed to save cache: {e}")

    return cache_key


def get_cached_response(
    conversation_id: str,
    operation: str,
    query_params: Optional[Dict[str, Any]] = None,
) -> Optional[Any]:
    """
    Retrieve cached API response

    Args:
        conversation_id: Conversation ID
        operation: Operation type ("flight_search", "hotel_search", etc.)
        query_params: Query parameters to match

    Returns:
        Cached response data or None if not found/expired
    """
    if query_params is None:
        query_params = {}

    cache_key = _generate_cache_key(conversation_id, operation, query_params)
    cache_path = _get_cache_path(cache_key)

    if not cache_path.exists():
        return None

    try:
        with open(cache_path, "r") as f:
            cache_entry = json.load(f)

        # Check expiration
        if time.time() > cache_entry.get("expires_at", 0):
            # Expired - delete file
            cache_path.unlink(missing_ok=True)
            return None

        # Log cache hit (optional)
        # print(f"[Cache] Hit for {operation} in conversation {conversation_id[:8]}...")

        return cache_entry.get("response_data")

    except Exception as e:
        # Don't fail if cache read fails
        print(f"[Cache Warning] Failed to read cache: {e}")
        return None


def list_cached_responses(conversation_id: str) -> list[Dict[str, Any]]:
    """
    List all cached responses for a conversation

    Args:
        conversation_id: Conversation ID

    Returns:
        List of cache entries with metadata
    """
    _ensure_cache_dir()

    entries = []
    pattern = f"{conversation_id}__*.json"

    try:
        for cache_file in CACHE_DIR.glob(pattern):
            try:
                with open(cache_file, "r") as f:
                    entry = json.load(f)

                # Check if expired
                if time.time() > entry.get("expires_at", 0):
                    cache_file.unlink(missing_ok=True)
                    continue

                entries.append({
                    "operation": entry.get("operation"),
                    "cached_at": entry.get("cached_at"),
                    "expires_at": entry.get("expires_at"),
                    "query_params": entry.get("query_params"),
                    "has_data": bool(entry.get("response_data")),
                })
            except Exception:
                continue

    except Exception as e:
        print(f"[Cache Warning] Failed to list cache: {e}")

    return entries


def clear_conversation_cache(conversation_id: str) -> int:
    """
    Clear all cached responses for a conversation

    Args:
        conversation_id: Conversation ID

    Returns:
        Number of cache entries deleted
    """
    _ensure_cache_dir()

    count = 0
    pattern = f"{conversation_id}__*.json"

    try:
        for cache_file in CACHE_DIR.glob(pattern):
            cache_file.unlink(missing_ok=True)
            count += 1
    except Exception as e:
        print(f"[Cache Warning] Failed to clear cache: {e}")

    return count


def cleanup_expired_cache() -> int:
    """
    Remove expired cache entries from all conversations

    Returns:
        Number of expired entries deleted
    """
    _ensure_cache_dir()

    count = 0
    current_time = time.time()

    try:
        for cache_file in CACHE_DIR.glob("*.json"):
            try:
                with open(cache_file, "r") as f:
                    entry = json.load(f)

                if current_time > entry.get("expires_at", 0):
                    cache_file.unlink(missing_ok=True)
                    count += 1
            except Exception:
                # If file is corrupted, delete it
                cache_file.unlink(missing_ok=True)
                count += 1
    except Exception as e:
        print(f"[Cache Warning] Failed to cleanup cache: {e}")

    return count


def get_cache_size_mb() -> float:
    """Get total cache directory size in MB"""
    _ensure_cache_dir()

    total_bytes = 0
    try:
        for cache_file in CACHE_DIR.glob("*.json"):
            total_bytes += cache_file.stat().st_size
    except Exception:
        pass

    return total_bytes / (1024 * 1024)


def enforce_cache_size_limit():
    """
    Enforce cache size limit by deleting oldest entries

    Called automatically when cache grows too large
    """
    current_size = get_cache_size_mb()

    if current_size <= MAX_CACHE_SIZE_MB:
        return

    # Delete oldest files until under limit
    cache_files = []
    try:
        for cache_file in CACHE_DIR.glob("*.json"):
            cache_files.append((cache_file, cache_file.stat().st_mtime))

        # Sort by modification time (oldest first)
        cache_files.sort(key=lambda x: x[1])

        # Delete oldest until under limit
        for cache_file, _ in cache_files:
            if get_cache_size_mb() <= MAX_CACHE_SIZE_MB * 0.8:  # Leave 20% buffer
                break
            cache_file.unlink(missing_ok=True)

    except Exception as e:
        print(f"[Cache Warning] Failed to enforce size limit: {e}")


# Automatic cleanup on module import (runs once)
try:
    cleanup_expired_cache()
    enforce_cache_size_limit()
except Exception:
    pass


__all__ = [
    "cache_response",
    "get_cached_response",
    "list_cached_responses",
    "clear_conversation_cache",
    "cleanup_expired_cache",
    "get_cache_size_mb",
]
