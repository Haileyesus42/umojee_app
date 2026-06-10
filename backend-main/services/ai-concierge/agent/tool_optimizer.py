"""
Tool Optimizer: Smart tool selection, batching, validation, and error handling.

Features:
- Prevents redundant tool calls when fresh monitoring data exists
- Batches independent tool calls for parallel execution
- Validates tool results and suggests alternatives
- Wraps errors with user-friendly messages
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List, Callable, Awaitable
from datetime import datetime, timezone, timedelta
from functools import wraps

from agent.error_handler import handle_error, UserFriendlyError

logger = logging.getLogger(__name__)


class ToolOptimizer:
    """
    Optimizes tool usage across the AI system.
    
    Capabilities:
    1. Smart tool selection: Skip calls when fresh data exists
    2. Tool call batching: Execute independent calls in parallel
    3. Result validation: Check if results make sense
    4. Error handling: Convert errors to user-friendly messages
    """
    
    # Freshness thresholds (minutes)
    FRESHNESS_THRESHOLDS = {
        "weather": 10,
        "traffic": 5,
        "flight_status": 2,
        "airport_conditions": 15,
        "location": 1,
    }
    
    def __init__(self, monitoring_data: Optional[Dict[str, Any]] = None):
        """
        Initialize with current monitoring data.
        
        Args:
            monitoring_data: Dict from journey_context["monitoring"]
        """
        self.monitoring_data = monitoring_data or {}
    
    def should_skip_tool_call(
        self,
        tool_name: str,
        monitoring_type: str,
    ) -> tuple[bool, Optional[Dict[str, Any]]]:
        """
        Check if tool call can be skipped due to fresh monitoring data.
        
        Returns:
            (should_skip, cached_data)
        """
        if monitoring_type not in self.monitoring_data:
            return False, None
        
        cached = self.monitoring_data[monitoring_type]
        if not cached or "error" in cached:
            return False, None
        
        # Check freshness
        timestamp = cached.get("timestamp")
        if not timestamp:
            return False, None
        
        try:
            if isinstance(timestamp, str):
                ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            else:
                ts = timestamp
            
            age_minutes = (datetime.now(timezone.utc) - ts).total_seconds() / 60
            threshold = self.FRESHNESS_THRESHOLDS.get(monitoring_type, 10)
            
            if age_minutes < threshold:
                logger.info(f"Skipping {tool_name}: fresh {monitoring_type} data ({age_minutes:.1f} min old)")
                return True, cached
        except Exception as e:
            logger.debug(f"Freshness check failed: {e}")
        
        return False, None
    
    def validate_tool_result(
        self,
        tool_name: str,
        result: Dict[str, Any],
        operation: str,
        user_input: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Validate tool result and add suggestions if needed.
        
        Returns:
            Enhanced result with validation status and suggestions
        """
        validated = dict(result)
        validated["validation"] = {"status": "success", "suggestions": []}
        
        # Check for errors
        if "error" in result:
            friendly = handle_error(
                Exception(result["error"]),
                operation=operation,
                service=tool_name,
                user_input=user_input,
            )
            validated["user_friendly_error"] = friendly.format_for_user()
            validated["error_suggestions"] = friendly.suggestions
            return validated
        
        # Validate search results
        if "flight" in tool_name.lower():
            offers = result.get("data", [])
            if not offers or len(offers) == 0:
                validated["validation"]["status"] = "no_results"
                validated["validation"]["suggestions"] = [
                    "Try flexible dates (±3 days)",
                    "Check nearby airports",
                    "Consider connecting flights",
                ]
                validated["user_friendly_message"] = (
                    "No flights found for your search. Try adjusting your dates or checking nearby airports."
                )
        
        elif "hotel" in tool_name.lower():
            hotels = result.get("data", [])
            if not hotels or len(hotels) == 0:
                validated["validation"]["status"] = "no_results"
                validated["validation"]["suggestions"] = [
                    "Expand search radius",
                    "Try different dates",
                    "Consider nearby neighborhoods",
                ]
                validated["user_friendly_message"] = (
                    "No hotels available for your criteria. Try expanding your search or adjusting dates."
                )
        
        elif "car" in tool_name.lower():
            cars = result.get("data", [])
            if not cars or len(cars) == 0:
                validated["validation"]["status"] = "no_results"
                validated["validation"]["suggestions"] = [
                    "Try different pickup location",
                    "Adjust rental dates",
                    "Consider alternative vehicle types",
                ]
                validated["user_friendly_message"] = (
                    "No cars available. Try a different location or dates."
                )
        
        return validated
    
    async def batch_tool_calls(
        self,
        tool_calls: List[tuple[str, Callable, Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        """
        Execute multiple independent tool calls in parallel.
        
        Args:
            tool_calls: List of (tool_name, tool_func, kwargs)
        
        Returns:
            List of results in same order as input
        """
        async def _call_tool(name: str, func: Callable, kwargs: Dict[str, Any]) -> Dict[str, Any]:
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(**kwargs)
                else:
                    result = func(**kwargs)
                return {"tool": name, "result": result, "success": True}
            except Exception as e:
                logger.error(f"Tool {name} failed: {e}")
                friendly = handle_error(e, operation=name)
                return {
                    "tool": name,
                    "result": {"error": str(e)},
                    "success": False,
                    "user_friendly_error": friendly.format_for_user(),
                }
        
        tasks = [_call_tool(name, func, kwargs) for name, func, kwargs in tool_calls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions from gather
        processed = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                tool_name = tool_calls[i][0]
                friendly = handle_error(r, operation=tool_name)
                processed.append({
                    "tool": tool_name,
                    "result": {"error": str(r)},
                    "success": False,
                    "user_friendly_error": friendly.format_for_user(),
                })
            else:
                processed.append(r)
        
        return processed


def smart_tool_wrapper(monitoring_type: Optional[str] = None):
    """
    Decorator to add smart tool selection and error handling to tools.
    
    Usage:
        @smart_tool_wrapper(monitoring_type="weather")
        @tool
        def get_weather_forecast(...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Check if we can skip this call
            journey_context = kwargs.get("journey_context")
            if journey_context and monitoring_type:
                monitoring = journey_context.get("monitoring", {})
                optimizer = ToolOptimizer(monitoring)
                should_skip, cached_data = optimizer.should_skip_tool_call(func.__name__, monitoring_type)
                
                if should_skip:
                    logger.info(f"Using cached {monitoring_type} data instead of calling {func.__name__}")
                    return cached_data
            
            # Execute tool with error handling
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
                
                # Validate result
                if journey_context and monitoring_type:
                    optimizer = ToolOptimizer()
                    result = optimizer.validate_tool_result(
                        tool_name=func.__name__,
                        result=result,
                        operation=monitoring_type,
                        user_input=kwargs,
                    )
                
                return result
            
            except Exception as e:
                logger.error(f"Tool {func.__name__} failed: {e}")
                friendly = handle_error(e, operation=func.__name__)
                return {
                    "error": str(e),
                    "user_friendly_error": friendly.format_for_user(),
                    "suggestions": friendly.suggestions,
                }
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Check if we can skip this call
            journey_context = kwargs.get("journey_context")
            if journey_context and monitoring_type:
                monitoring = journey_context.get("monitoring", {})
                optimizer = ToolOptimizer(monitoring)
                should_skip, cached_data = optimizer.should_skip_tool_call(func.__name__, monitoring_type)
                
                if should_skip:
                    logger.info(f"Using cached {monitoring_type} data instead of calling {func.__name__}")
                    return cached_data
            
            # Execute tool with error handling
            try:
                result = func(*args, **kwargs)
                
                # Validate result
                if journey_context and monitoring_type:
                    optimizer = ToolOptimizer()
                    result = optimizer.validate_tool_result(
                        tool_name=func.__name__,
                        result=result,
                        operation=monitoring_type,
                        user_input=kwargs,
                    )
                
                return result
            
            except Exception as e:
                logger.error(f"Tool {func.__name__} failed: {e}")
                friendly = handle_error(e, operation=func.__name__)
                return {
                    "error": str(e),
                    "user_friendly_error": friendly.format_for_user(),
                    "suggestions": friendly.suggestions,
                }
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator


# Singleton optimizer for batch operations
_global_optimizer = ToolOptimizer()


async def batch_tool_calls(
    tool_calls: List[tuple[str, Callable, Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    """
    Execute multiple tool calls in parallel.
    
    Usage:
        results = await batch_tool_calls([
            ("weather", get_weather, {"city": "NYC"}),
            ("traffic", get_traffic, {"origin": "home", "dest": "airport"}),
            ("flight_status", get_flight, {"flight_id": "AA123"}),
        ])
    """
    return await _global_optimizer.batch_tool_calls(tool_calls)
