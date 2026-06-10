"""
Phase 2: Context Monitoring Engine

This module provides continuous multi-factor context monitoring including:
- Context monitor service (background monitoring)
- Background task manager (async execution)
- Real-time context APIs (tool integration)

This module is COMPLETELY INDEPENDENT - no dependencies on other phases.

Run tests: pytest agent/journey/phase_2_context_monitoring/test_phase_2.py -v
"""

from .context_monitor import (
    ContextMonitor,
    MonitoringConfig,
    MonitoringType,
    ContextUpdate,
)

from .background_tasks import (
    BackgroundTaskManager,
    ScheduledTask,
    TaskStatus,
    TaskPriority,
    TaskResult,
)

from .context_tools import (
    get_current_location,
    get_flight_status,
    get_traffic_conditions,
    get_weather_forecast,
    get_airport_intelligence,
    get_all_context_tools,
)

try:
    from .nodes import (
        booking_agent_v2,
        recommendation_agent_v2,
        checkin_agent_v2,
    )
    _NODES_AVAILABLE = True
except Exception:
    booking_agent_v2 = recommendation_agent_v2 = checkin_agent_v2 = None
    _NODES_AVAILABLE = False

__all__ = [
    # Context Monitor
    "ContextMonitor",
    "MonitoringConfig",
    "MonitoringType",
    "ContextUpdate",
    # Background Tasks
    "BackgroundTaskManager",
    "ScheduledTask",
    "TaskStatus",
    "TaskPriority",
    "TaskResult",
    # Context Tools
    "get_current_location",
    "get_flight_status",
    "get_traffic_conditions",
    "get_weather_forecast",
    "get_airport_intelligence",
    "get_all_context_tools",
    # Agents
    "booking_agent_v2",
    "recommendation_agent_v2",
    "checkin_agent_v2",
]
