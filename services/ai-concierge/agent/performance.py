"""
Performance monitoring and optimization utilities for the AI agent system.

Usage:
    from agent.performance import timer, optimize_messages

    # Time a function
    with timer("my_operation"):
        expensive_operation()

    # Optimize message history
    optimized = optimize_messages(messages, max_tokens=4000)
"""

import time
import json
from typing import List, Any, Dict, Optional
from contextlib import contextmanager
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage


class PerformanceMonitor:
    """Simple performance monitoring for agent operations"""

    def __init__(self):
        self.timings: Dict[str, List[float]] = {}
        self.enabled = True

    def record(self, operation: str, duration: float):
        """Record timing for an operation"""
        if not self.enabled:
            return
        if operation not in self.timings:
            self.timings[operation] = []
        self.timings[operation].append(duration)

    def get_stats(self, operation: str) -> Dict[str, float]:
        """Get statistics for an operation"""
        if operation not in self.timings or not self.timings[operation]:
            return {"count": 0, "total": 0, "avg": 0, "min": 0, "max": 0}

        times = self.timings[operation]
        return {
            "count": len(times),
            "total": sum(times),
            "avg": sum(times) / len(times),
            "min": min(times),
            "max": max(times),
        }

    def report(self) -> str:
        """Generate performance report"""
        if not self.timings:
            return "No performance data recorded"

        lines = ["Performance Report:", "=" * 60]
        for operation, times in sorted(self.timings.items()):
            stats = self.get_stats(operation)
            lines.append(
                f"{operation:30s} | "
                f"count: {stats['count']:3d} | "
                f"avg: {stats['avg']*1000:6.1f}ms | "
                f"total: {stats['total']:6.2f}s"
            )
        return "\n".join(lines)

    def reset(self):
        """Clear all recorded timings"""
        self.timings.clear()


# Global performance monitor instance
_monitor = PerformanceMonitor()


@contextmanager
def timer(operation: str):
    """Context manager for timing operations

    Example:
        with timer("llm_decision"):
            decision = llm.invoke(messages)
    """
    start = time.time()
    try:
        yield
    finally:
        duration = time.time() - start
        _monitor.record(operation, duration)


def get_performance_report() -> str:
    """Get performance report from global monitor"""
    return _monitor.report()


def reset_performance_monitor():
    """Reset global performance monitor"""
    _monitor.reset()


def enable_performance_monitoring(enabled: bool = True):
    """Enable or disable performance monitoring"""
    _monitor.enabled = enabled


# Message optimization utilities


def estimate_tokens(text: str) -> int:
    """Rough token count estimation (1 token ≈ 4 chars)"""
    return len(text) // 4


def estimate_message_tokens(message: BaseMessage) -> int:
    """Estimate tokens in a message"""
    content = str(getattr(message, "content", ""))
    return estimate_tokens(content)


def optimize_messages(
    messages: List[BaseMessage],
    max_tokens: int = 4000,
    keep_system: bool = True,
    keep_recent_human: int = 3,
) -> List[BaseMessage]:
    """Optimize message history by intelligently trimming

    Strategy:
    1. Always keep system messages (instructions)
    2. Keep last N user messages (context)
    3. Fill remaining budget with most recent AI messages
    4. Remove redundant task hints (system messages starting with "[TASK")

    Args:
        messages: List of messages to optimize
        max_tokens: Maximum token budget
        keep_system: Whether to keep system messages
        keep_recent_human: Number of recent human messages to keep

    Returns:
        Optimized message list within token budget
    """
    if not messages:
        return messages

    # Separate message types
    system_msgs = []
    human_msgs = []
    ai_msgs = []
    task_hints = []

    for msg in messages:
        if isinstance(msg, SystemMessage):
            content = str(msg.content)
            if content.startswith("[TASK") or content.startswith("[AMADEUS TASK"):
                task_hints.append(msg)
            else:
                system_msgs.append(msg)
        elif isinstance(msg, HumanMessage):
            human_msgs.append(msg)
        elif isinstance(msg, AIMessage):
            ai_msgs.append(msg)

    # Start with essential messages
    result = []
    tokens_used = 0

    # 1. Keep primary system messages (orchestrator instructions)
    if keep_system and system_msgs:
        # Keep only the FIRST system message (main instructions)
        first_system = system_msgs[0]
        result.append(first_system)
        tokens_used += estimate_message_tokens(first_system)

    # 2. Keep last task hint (if any) - provides current task context
    if task_hints:
        last_hint = task_hints[-1]
        result.append(last_hint)
        tokens_used += estimate_message_tokens(last_hint)

    # 3. Keep recent human messages (user context)
    recent_humans = human_msgs[-keep_recent_human:] if keep_recent_human > 0 else []
    for msg in recent_humans:
        msg_tokens = estimate_message_tokens(msg)
        if tokens_used + msg_tokens <= max_tokens:
            result.append(msg)
            tokens_used += msg_tokens
        else:
            break

    # 4. Fill remaining budget with recent AI messages
    remaining_budget = max_tokens - tokens_used
    recent_ai = []

    for msg in reversed(ai_msgs):
        msg_tokens = estimate_message_tokens(msg)
        if tokens_used + msg_tokens <= max_tokens:
            recent_ai.append(msg)
            tokens_used += msg_tokens
        else:
            break

    recent_ai.reverse()
    result.extend(recent_ai)

    # Sort messages by original order
    # Create index map
    msg_to_idx = {id(msg): i for i, msg in enumerate(messages)}
    result.sort(key=lambda m: msg_to_idx.get(id(m), float("inf")))

    return result


def extract_context_early(messages: List[BaseMessage]) -> Optional[Dict[str, Any]]:
    """Extract context from messages early to avoid redundant parsing

    Looks for JSON content in AI messages and extracts:
    - flight_details
    - api_response data
    - booking details

    Returns:
        Dict with extracted context or None
    """
    context = {}

    # Search recent AI messages for JSON responses
    for msg in reversed(messages):
        if not isinstance(msg, AIMessage):
            continue

        content = str(getattr(msg, "content", ""))
        if not content or not ("{" in content and "}" in content):
            continue

        try:
            parsed = json.loads(content)
            if not isinstance(parsed, dict):
                continue

            # Extract flight details
            if "flight_booking_details" in parsed:
                context["flight_details"] = parsed["flight_booking_details"]

            if "flight_details" in parsed:
                context["flight_details"] = parsed["flight_details"]

            # Extract API response data
            if "api_response" in parsed and parsed["api_response"]:
                api_resp = parsed["api_response"]
                if isinstance(api_resp, dict):
                    # Look for travel details
                    if "destination" in api_resp or "arrival_date" in api_resp:
                        context.setdefault("travel_details", {}).update(
                            {
                                "destination": api_resp.get("destination"),
                                "arrival_date": api_resp.get("arrival_date"),
                                "departure_date": api_resp.get("departure_date"),
                                "travelers": api_resp.get("travelers")
                                or api_resp.get("passengers", 1),
                            }
                        )

            # If we found context, we can stop (most recent is most relevant)
            if context:
                break

        except (json.JSONDecodeError, TypeError, AttributeError):
            continue

    return context if context else None


def cache_key_for_decision(messages: List[BaseMessage]) -> str:
    """Generate cache key for LLM decision

    Uses last user message + conversation length as key
    This allows caching similar requests without full message hash
    """
    if not messages:
        return "empty"

    # Find last human message
    last_human = None
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage):
            last_human = str(msg.content)[:200]  # Truncate to 200 chars
            break

    if not last_human:
        return "no_human"

    # Create simple cache key
    key = f"{last_human}_{len(messages)}"
    return key


# Simple in-memory cache for LLM decisions (expires after 5 minutes)
_decision_cache: Dict[str, tuple[Any, float]] = {}
_cache_ttl = 300  # 5 minutes


def get_cached_decision(cache_key: str) -> Optional[Any]:
    """Get cached LLM decision if still valid"""
    if cache_key not in _decision_cache:
        return None

    decision, timestamp = _decision_cache[cache_key]
    if time.time() - timestamp > _cache_ttl:
        # Expired
        del _decision_cache[cache_key]
        return None

    return decision


def cache_decision(cache_key: str, decision: Any):
    """Cache an LLM decision"""
    _decision_cache[cache_key] = (decision, time.time())


def clear_decision_cache():
    """Clear all cached decisions"""
    _decision_cache.clear()


__all__ = [
    "timer",
    "get_performance_report",
    "reset_performance_monitor",
    "enable_performance_monitoring",
    "optimize_messages",
    "extract_context_early",
    "cache_key_for_decision",
    "get_cached_decision",
    "cache_decision",
    "clear_decision_cache",
]
