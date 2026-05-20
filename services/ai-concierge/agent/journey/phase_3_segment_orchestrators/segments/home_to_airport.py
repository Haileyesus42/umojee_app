"""
Phase 3: Segment 2 - Home to Airport Orchestrator

This orchestrator handles the home-to-airport segment:
- Location setup
- Departure time calculation (multi-factor)
- Transport recommendations
- Traffic monitoring
- Risk calculation
- Notification scheduling
- Arrival detection

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from enum import Enum
import logging
import math
import os
import json

from ..base_orchestrator import (
    BaseSegmentOrchestrator,
    NodeResult,
    NodeStatus,
)

logger = logging.getLogger(__name__)


def _get_env_window_hours(env_name: str, default_hours: int = 24) -> int:
    """Read a positive integer hour window from the environment."""
    raw = (os.getenv(env_name) or "").strip()
    if not raw:
        return default_hours
    try:
        value = int(raw)
        return value if value >= 0 else default_hours
    except ValueError:
        logger.warning("Invalid %s value '%s'; using default %s hours", env_name, raw, default_hours)
        return default_hours


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth using Haversine formula.

    Args:
        lat1, lon1: Latitude and longitude of point 1 in decimal degrees
        lat2, lon2: Latitude and longitude of point 2 in decimal degrees

    Returns:
        Distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    # Earth's radius in kilometers
    r = 6371

    return round(c * r, 2)


class TransportMode(str, Enum):
    """Available transport modes."""
    PRIVATE_CAR = "private_car"
    TAXI = "taxi"
    RIDESHARE = "rideshare"
    PUBLIC_TRANSIT = "public_transit"
    AIRPORT_SHUTTLE = "airport_shuttle"


class RiskLevel(str, Enum):
    """Risk levels for journey segments."""
    ON_TRACK = "on_track"
    WATCH = "watch"
    ACTION_NEEDED = "action_needed"


@dataclass
class TransportOption:
    """A transport option with details."""
    mode: TransportMode
    estimated_duration_minutes: int
    estimated_cost: float
    reliability_score: float  # 0-1
    comfort_score: float  # 0-1
    recommended: bool
    notes: List[str]


@dataclass
class DepartureCalculation:
    """Calculated departure time with factors."""
    recommended_departure: datetime
    latest_safe_departure: datetime
    factors: Dict[str, int]  # Factor name -> minutes added
    total_buffer_minutes: int
    confidence: float


@dataclass
class RiskAssessment:
    """Risk assessment for the segment."""
    level: RiskLevel
    factors: List[str]
    recommended_actions: List[str]
    time_buffer_remaining_minutes: int


class HomeToAirportOrchestrator(BaseSegmentOrchestrator):
    """
    Orchestrator for the Home to Airport segment.

    This handles getting the user from their home to the airport on time:
    1. Calculate when to leave based on multiple factors
    2. Recommend transport options
    3. Monitor traffic and update in real-time
    4. Alert user when it's time to leave
    5. Detect arrival at airport
    """

    def __init__(self):
        super().__init__("home_to_airport")
        self.smart_recommendation_window_hours = _get_env_window_hours(
            "HOME_TO_AIRPORT_SMART_RECOMMENDATION_WINDOW_HOURS",
            default_hours=24,
        )
        self.notification_scheduling_window_hours = _get_env_window_hours(
            "HOME_TO_AIRPORT_NOTIFICATION_WINDOW_HOURS",
            default_hours=24,
        )

    def _register_nodes(self) -> None:
        """Register all nodes for the home-to-airport segment."""
        self.register_node("location_setup", self._location_setup_node)
        self.register_node("departure_calculation", self._departure_calculation_node)
        self.register_node("transport_recommendation", self._transport_recommendation_node)
        self.register_node("traffic_monitoring", self._traffic_monitoring_node)
        self.register_node("checkin_advice", self._checkin_advice_node)  # Phase 2 wiring: real-time context
        self.register_node("risk_calculation", self._risk_calculation_node)
        self.register_node("smart_recommendation", self._smart_recommendation_node)
        self.register_node("notification_scheduling", self._notification_scheduling_node)
        self.register_node("generate_response", self._generate_response_node)

    def _metadata_value(self, journey_context: Dict[str, Any], key: str, default: Any = None) -> Any:
        metadata = journey_context.get("metadata", {}) or {}
        return metadata.get(key, default) if isinstance(metadata, dict) else default

    def _build_smart_recommendation_signature(
        self,
        departure_time: Optional[datetime],
        recommended_departure: Any,
        traffic_data: Dict[str, Any],
        weather_data: Dict[str, Any],
        distance_km: Any,
    ) -> str:
        payload = {
            "departure_time": departure_time.isoformat() if hasattr(departure_time, "isoformat") else None,
            "recommended_departure": recommended_departure.isoformat() if hasattr(recommended_departure, "isoformat") else str(recommended_departure),
            "traffic_conditions": traffic_data.get("conditions"),
            "traffic_delay_minutes": traffic_data.get("delay_minutes"),
            "traffic_duration_minutes": traffic_data.get("current_duration_minutes"),
            "weather_condition": weather_data.get("condition") or weather_data.get("description"),
            "distance_km": distance_km,
        }
        return json.dumps(payload, sort_keys=True, default=str)

    def _format_full_datetime(self, dt: Any, context: Optional[Dict[str, Any]] = None) -> str:
        """Format a datetime with full date, time, and UTC offset."""
        if not dt:
            return "N/A"
        if not isinstance(dt, datetime):
            try:
                dt = datetime.fromisoformat(str(dt).replace("Z", "+00:00"))
            except Exception:
                return str(dt)

        offset_hours = 3
        if context:
            tz_info = context.get("timezone") or context.get("offset")
            if isinstance(tz_info, (int, float)):
                offset_hours = tz_info
            elif isinstance(tz_info, str):
                import re
                match = re.search(r'([+-])(\d+)', tz_info)
                if match:
                    sign = 1 if match.group(1) == "+" else -1
                    offset_hours = sign * int(match.group(2))

        local_tz = timezone(timedelta(hours=offset_hours))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        local_dt = dt.astimezone(local_tz)
        return local_dt.strftime("%Y-%m-%d %H:%M %z")

    def _coerce_datetime(self, value: Any) -> Optional[datetime]:
        """Parse journey/booking date values into timezone-aware datetimes."""
        if not value:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return None
            try:
                parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            except ValueError:
                try:
                    parsed = datetime.fromisoformat(f"{text}T00:00:00+00:00")
                except ValueError:
                    return None
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        return None

    def _get_segment_departure_time(self, journey_context: Dict[str, Any]) -> Optional[datetime]:
        """Resolve the best available departure timestamp for home-to-airport messaging."""
        flight_status = journey_context.get("flight_status") or {}
        booked_flights = journey_context.get("booked_flights") or []

        candidates = [
            flight_status.get("departure_time"),
            journey_context.get("flight_departure"),
            journey_context.get("planned_departure_date"),
        ]
        if booked_flights and isinstance(booked_flights, list):
            candidates.extend([
                booked_flights[0].get("departure"),
                booked_flights[0].get("departure_time"),
            ])

        for candidate in candidates:
            parsed = self._coerce_datetime(candidate)
            if parsed:
                return parsed
        return None

    def _has_real_location_context(self, journey_context: Dict[str, Any]) -> bool:
        """Return True when journey context has non-placeholder home/airport data."""
        monitoring = journey_context.get("monitoring", {}) or {}
        live_location = monitoring.get("location") or journey_context.get("location") or {}
        home_location = journey_context.get("home_location") or {}
        airport_location = journey_context.get("airport_location") or {}
        home_address = str(home_location.get("address") or "").strip()
        airport_code = str(airport_location.get("code") or "").strip().upper()
        departure_airport_code = str(
            journey_context.get("departure_airport_code")
            or journey_context.get("airport_code")
            or journey_context.get("destination_airport_code")
            or ""
        ).strip().upper()

        if home_address == "123 Main St, New York, NY":
            return False
        if airport_code == "JFK" and not departure_airport_code:
            return False
        has_real_home = bool(
            home_location
            or live_location.get("latitude") is not None
            or live_location.get("longitude") is not None
            or live_location.get("city")
        )
        has_real_airport = bool(
            departure_airport_code
            or airport_code
            or journey_context.get("departure_airport_lat") is not None
            or journey_context.get("departure_airport_lon") is not None
        )
        return has_real_home and has_real_airport

    async def _location_setup_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Set up location information.

        Gets the user's home location and destination airport.
        """
        journey_context = state.get("journey_context", {})
        monitoring = journey_context.get("monitoring", {}) or {}
        live_location = monitoring.get("location") or journey_context.get("location") or {}
        departure_airport_code = (
            journey_context.get("departure_airport_code")
            or journey_context.get("airport_code")
            or journey_context.get("destination_airport_code")
        )

        # Get locations from context or use defaults
        home_location = journey_context.get("home_location") or {
            "latitude": live_location.get("latitude"),
            "longitude": live_location.get("longitude"),
            "address": live_location.get("display_name") or live_location.get("city") or "Home",
        }
        if home_location.get("latitude") is None or home_location.get("longitude") is None:
            home_location = {
                "latitude": 40.7128,
                "longitude": -74.0060,
                "address": "123 Main St, New York, NY"
            }

        airport_location = journey_context.get("airport_location") or {
            "code": departure_airport_code or "JFK",
            "name": f"{departure_airport_code} Airport" if departure_airport_code else "John F. Kennedy International Airport",
            "latitude": journey_context.get("departure_airport_lat"),
            "longitude": journey_context.get("departure_airport_lon"),
        }
        if airport_location.get("latitude") is None or airport_location.get("longitude") is None:
            airport_location = {
                "code": airport_location.get("code") or departure_airport_code or "JFK",
                "name": airport_location.get("name")
                or (f"{departure_airport_code} Airport" if departure_airport_code else "John F. Kennedy International Airport"),
                "latitude": airport_location.get("latitude") or journey_context.get("departure_airport_lat"),
                "longitude": airport_location.get("longitude") or journey_context.get("departure_airport_lon"),
            }

        if (
            home_location.get("latitude") is None
            or home_location.get("longitude") is None
            or airport_location.get("latitude") is None
            or airport_location.get("longitude") is None
        ):
            distance_km = None
        else:
            # Calculate actual distance using Haversine formula
            distance_km = calculate_distance_km(
                home_location["latitude"],
                home_location["longitude"],
                airport_location["latitude"],
                airport_location["longitude"]
            )

        state["home_location"] = home_location
        state["airport_location"] = airport_location
        state["distance_km"] = distance_km

        distance_label = f"{distance_km} km" if isinstance(distance_km, (int, float)) else "distance unavailable"
        logger.info(f"Location setup: {home_location.get('address', 'Home')} -> {airport_location['code']} ({distance_label})")

        return NodeResult(
            node_name="location_setup",
            status=NodeStatus.SUCCESS,
            data={
                "home": home_location,
                "airport": airport_location
            }
        )

    async def _departure_calculation_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Calculate recommended departure time using production TimelineCalculator.
        """
        journey_context = state.get("journey_context", {})

        # Get flight time
        flight_time = self._get_segment_departure_time(journey_context)
        if not flight_time:
            logger.info("Skipping departure calculation: no real departure time in journey context")
            return NodeResult(
                node_name="departure_calculation",
                status=NodeStatus.SKIPPED,
                data={"reason": "missing_departure_time"},
            )

        # Use production TimelineCalculator
        result = self.timeline_calculator.calculate_departure_time(
            flight_time=flight_time,
            travel_duration_minutes=45,  # Base travel time
            is_international=journey_context.get("is_international", True),
            has_checked_bags=journey_context.get("has_checked_bags", True),
            traffic_buffer_minutes=state.get("traffic_data", {}).get("delay_minutes", 15)
        )

        calculation = DepartureCalculation(
            recommended_departure=result["recommended_departure"],
            latest_safe_departure=result["latest_safe_departure"],
            factors=result["components"],
            total_buffer_minutes=result["total_buffer_minutes"],
            confidence=result["confidence"]
        )

        state["departure_calculation"] = calculation
        logger.info(f"Production departure calculation: Leave by {result['recommended_departure']}")

        return NodeResult(
            node_name="departure_calculation",
            status=NodeStatus.SUCCESS,
            data={
                "recommended_departure": result["recommended_departure"].isoformat(),
                "factors": result["components"],
                "total_buffer_minutes": result["total_buffer_minutes"]
            }
        )

    async def _transport_recommendation_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Recommend transport options.

        Ranks options by reliability, not just speed or cost.
        """
        distance_km = state.get("distance_km", 25)

        # Generate transport options
        options = [
            TransportOption(
                mode=TransportMode.TAXI,
                estimated_duration_minutes=45,
                estimated_cost=65.0,
                reliability_score=0.9,
                comfort_score=0.8,
                recommended=True,
                notes=[
                    "Most reliable option",
                    "Door-to-door service",
                    "Can be pre-booked"
                ]
            ),
            TransportOption(
                mode=TransportMode.RIDESHARE,
                estimated_duration_minutes=50,
                estimated_cost=45.0,
                reliability_score=0.75,
                comfort_score=0.7,
                recommended=False,
                notes=[
                    "Good value option",
                    "May have longer wait during peak",
                    "Track driver in real-time"
                ]
            ),
            TransportOption(
                mode=TransportMode.PUBLIC_TRANSIT,
                estimated_duration_minutes=75,
                estimated_cost=12.0,
                reliability_score=0.7,
                comfort_score=0.5,
                recommended=False,
                notes=[
                    "Most affordable",
                    "No traffic delays on train",
                    "Requires transfer at Jamaica"
                ]
            ),
            TransportOption(
                mode=TransportMode.AIRPORT_SHUTTLE,
                estimated_duration_minutes=90,
                estimated_cost=25.0,
                reliability_score=0.8,
                comfort_score=0.6,
                recommended=False,
                notes=[
                    "Shared ride",
                    "Multiple pickup points",
                    "Book 24 hours in advance"
                ]
            )
        ]

        # Sort by reliability
        options.sort(key=lambda x: x.reliability_score, reverse=True)

        state["transport_options"] = options
        state["recommended_transport"] = options[0]

        return NodeResult(
            node_name="transport_recommendation",
            status=NodeStatus.SUCCESS,
            data={"options": [o.__dict__ for o in options]}
        )

    async def _traffic_monitoring_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Monitor current traffic conditions.

        Prefers cached data from Phase 2 background monitoring (injected into
        journey_context["monitoring"]["traffic"] by segment_router_node).
        Falls back to a direct API call if no cached data is available.
        """
        home_location = state.get("home_location", {})
        airport_location = state.get("airport_location", {})
        journey_context = state.get("journey_context", {})

        # --- Try cached Phase 2 monitoring data first ---
        cached_traffic = journey_context.get("monitoring", {}).get("traffic")
        if cached_traffic and "error" not in cached_traffic:
            logger.info("Using cached Phase 2 traffic monitoring data")
            traffic_data = {
                "conditions": cached_traffic.get("conditions", "moderate"),
                "delay_minutes": cached_traffic.get("delay_minutes", 0),
                "current_duration_minutes": cached_traffic.get("current_duration_minutes", 45),
                "normal_duration_minutes": cached_traffic.get("normal_duration_minutes", 40),
                "distance_km": cached_traffic.get("distance_km", state.get("distance_km", 25)),
                "incidents": cached_traffic.get("incidents", []),
                "recommendation": f"Current traffic is {cached_traffic.get('conditions', 'moderate')}",
                "source": "phase2_monitor"
            }
        else:
            # --- Fallback: direct API call ---
            try:
                from ...phase_2_context_monitoring.context_tools import get_traffic_conditions
                departure_airport_code = (
                    journey_context.get("departure_airport_code")
                    or airport_location.get("code")
                    or journey_context.get("airport_code")
                    or journey_context.get("destination_airport_code")
                )

                origin_payload: Any
                if home_location.get("latitude") is not None and home_location.get("longitude") is not None:
                    origin_payload = {
                        "lat": home_location.get("latitude"),
                        "lon": home_location.get("longitude"),
                    }
                else:
                    origin_payload = home_location.get("address") or journey_context.get("departure_city") or "Home"

                if (
                    airport_location.get("latitude") is not None
                    and airport_location.get("longitude") is not None
                ):
                    destination_payload: Any = {
                        "lat": airport_location.get("latitude"),
                        "lon": airport_location.get("longitude"),
                    }
                else:
                    destination_payload = (
                        f"{departure_airport_code} Airport"
                        if departure_airport_code
                        else airport_location.get("name")
                        or "Airport"
                    )

                traffic_result = get_traffic_conditions.invoke({
                    "origin": origin_payload,
                    "destination": destination_payload,
                })

                if "error" in traffic_result:
                    logger.warning(f"Traffic API error: {traffic_result['error']}, using fallback")
                    traffic_data = {
                        "conditions": "moderate",
                        "delay_minutes": 10,
                        "incidents": [],
                        "recommendation": "Traffic data unavailable, allow extra buffer time"
                    }
                else:
                    traffic_data = {
                        "conditions": traffic_result.get("conditions", "moderate"),
                        "delay_minutes": traffic_result.get("delay_minutes", 0),
                        "current_duration_minutes": traffic_result.get("current_duration_minutes", 45),
                        "normal_duration_minutes": traffic_result.get("normal_duration_minutes", 40),
                        "distance_km": traffic_result.get("distance_km", state.get("distance_km", 25)),
                        "incidents": traffic_result.get("incidents", []),
                        "recommendation": f"Current traffic is {traffic_result.get('conditions', 'moderate')}",
                        "source": "direct_api"
                    }

            except Exception as e:
                logger.error(f"Error getting traffic conditions: {e}")
                traffic_data = {
                    "conditions": "moderate",
                    "delay_minutes": 10,
                    "incidents": [],
                    "recommendation": "Using estimated traffic conditions"
                }

        state["traffic_data"] = traffic_data

        # Update travel time if needed
        if traffic_data.get("delay_minutes", 0) > 0:
            recommended_transport = state.get("recommended_transport")
            if recommended_transport:
                recommended_transport.estimated_duration_minutes += traffic_data["delay_minutes"]

        return NodeResult(
            node_name="traffic_monitoring",
            status=NodeStatus.SUCCESS,
            data=traffic_data
        )

    async def _checkin_advice_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Phase 2 wiring: use journey_context.monitoring (cached) first, then tools.
        Builds check-in recommendation from real-time airport/traffic when available.
        """
        journey_context = state.get("journey_context", {})
        monitoring = journey_context.get("monitoring", {})
        advice_parts = []

        # Use cached Phase 2 monitoring first (airport conditions, traffic)
        cached_airport = monitoring.get("airport_conditions")
        if cached_airport and "error" not in cached_airport:
            security = cached_airport.get("security", {})
            wait_mins = security.get("average_wait_minutes")
            if wait_mins is not None:
                advice_parts.append(f"Current security wait ~{wait_mins} min.")
            cong = cached_airport.get("congestion", {}).get("overall_level")
            if cong:
                advice_parts.append(f"Airport congestion: {cong}.")
        cached_traffic = monitoring.get("traffic")
        if cached_traffic and "error" not in cached_traffic:
            delay = cached_traffic.get("delay_minutes", 0)
            if delay > 0:
                advice_parts.append(f"Add {delay} min for traffic to airport.")

        # Optional: call check-in tool when we have departure city/time
        departure_calc = state.get("departure_calculation")
        departure_city = journey_context.get("departure_city") or journey_context.get("airport_location", {}).get("city") or "New York"
        if departure_calc and hasattr(departure_calc, "recommended_departure"):
            try:
                from agent.utils.checkin_tools import recommend_checkin_time_by_city
                dep_time = departure_calc.recommended_departure
                dep_str = dep_time.strftime("%Y-%m-%dT%H:%M:%S") if hasattr(dep_time, "strftime") else str(dep_time)
                rec = recommend_checkin_time_by_city.invoke({
                    "departure_city": departure_city,
                    "departure_time_str": dep_str,
                    "travel_class": journey_context.get("travel_class", "economy"),
                })
                if isinstance(rec, str) and rec:
                    advice_parts.append(rec)
            except Exception as e:
                logger.debug(f"Check-in tool skipped: {e}")

        state["checkin_advice"] = " ".join(advice_parts) if advice_parts else None
        return NodeResult(
            node_name="checkin_advice",
            status=NodeStatus.SUCCESS,
            data={"checkin_advice": state["checkin_advice"]}
        )

    async def _risk_calculation_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Calculate current risk level using production RiskEngine.
        """
        journey_context = state.get("journey_context", {})
        departure_calc = state.get("departure_calculation")
        traffic_data = state.get("traffic_data", {})

        if not departure_calc:
            return NodeResult(
                node_name="risk_calculation",
                status=NodeStatus.FAILED,
                error="No departure calculation available"
            )

        # Use production RiskEngine
        flight_time = journey_context.get("flight_departure", datetime.now(timezone.utc) + timedelta(hours=3))
        if isinstance(flight_time, str):
            flight_time = datetime.fromisoformat(flight_time)

        assessment = self.risk_engine.calculate_departure_risk(
            flight_time=flight_time,
            current_time=datetime.now(timezone.utc),
            travel_duration_minutes=45,
            traffic_delay_minutes=traffic_data.get("delay_minutes", 0),
            buffer_minutes=departure_calc.total_buffer_minutes - 45 # Subtract travel time to get airport buffer
        )

        # Adapt RiskAssessment to segment's RiskLevel if needed
        # (Though we should eventually move to Phase 1 RiskLevel uniformly)
        state["risk_assessment"] = assessment

        logger.info(f"Production risk assessment: {assessment.overall_level.value}")

        return NodeResult(
            node_name="risk_calculation",
            status=NodeStatus.SUCCESS,
            data={
                "risk_level": assessment.overall_level.value,
                "factors": [f.name for f in assessment.factors],
                "actions": assessment.recommended_actions
            }
        )

    async def _notification_scheduling_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Schedule notifications using production NotificationScheduler.
        """
        journey_context = state.get("journey_context", {})
        departure_calc = state.get("departure_calculation")
        journey_id = journey_context.get("journey_id")
        user_id = journey_context.get("user_id")
        departure_time = self._get_segment_departure_time(journey_context)
        now_utc = datetime.now(timezone.utc)

        if not departure_calc:
            return NodeResult(
                node_name="notification_scheduling",
                status=NodeStatus.SUCCESS,
                data={"notifications_scheduled": 0}
            )

        if not journey_id or not user_id:
            logger.info("Skipping notification scheduling: missing real journey_id/user_id")
            return NodeResult(
                node_name="notification_scheduling",
                status=NodeStatus.SKIPPED,
                data={"reason": "missing_identity"},
            )

        if not departure_time:
            logger.info(f"Skipping notification scheduling for journey {journey_id}: missing departure time")
            return NodeResult(
                node_name="notification_scheduling",
                status=NodeStatus.SKIPPED,
                data={"reason": "missing_departure_time"},
            )

        if not self._has_real_location_context(journey_context):
            logger.info(f"Skipping notification scheduling for journey {journey_id}: placeholder location context")
            return NodeResult(
                node_name="notification_scheduling",
                status=NodeStatus.SKIPPED,
                data={"reason": "placeholder_context"},
            )

        notification_window = timedelta(hours=self.notification_scheduling_window_hours)
        if now_utc < (departure_time - notification_window):
            logger.info(
                f"Skipping notification scheduling for journey {journey_id}: before "
                f"{self.notification_scheduling_window_hours}h window "
                f"(now={now_utc.isoformat()} departure={departure_time.isoformat()})"
            )
            return NodeResult(
                node_name="notification_scheduling",
                status=NodeStatus.SKIPPED,
                data={"reason": "before_notification_window"},
            )

        if departure_calc.recommended_departure <= now_utc:
            logger.info(
                f"Skipping notification scheduling for journey {journey_id}: "
                f"recommended departure is already in the past ({departure_calc.recommended_departure.isoformat()})"
            )
            return NodeResult(
                node_name="notification_scheduling",
                status=NodeStatus.SKIPPED,
                data={"reason": "departure_in_past"},
            )

        notification_signature = json.dumps(
            {
                "journey_id": journey_id,
                "recommended_departure": departure_calc.recommended_departure.isoformat(),
            },
            sort_keys=True,
        )
        if self._metadata_value(journey_context, "home_to_airport_notification_signature") == notification_signature:
            logger.info(
                f"Skipping notification scheduling for journey {journey_id}: "
                "identical notifications already recorded"
            )
            return NodeResult(
                node_name="notification_scheduling",
                status=NodeStatus.SKIPPED,
                data={"reason": "already_scheduled"},
            )

        # Use production NotificationScheduler
        # 1. Get ready reminder
        self.notification_scheduler.schedule_get_ready_reminder(
            journey_id=journey_id,
            user_id=user_id,
            departure_time=departure_calc.recommended_departure
        )

        # 2. Time to leave reminder
        self.notification_scheduler.schedule_time_to_leave_reminder(
            journey_id=journey_id,
            user_id=user_id,
            departure_time=departure_calc.recommended_departure
        )

        logger.info(f"Production notifications scheduled for journey {journey_id}")
        state.setdefault("metadata_updates", {})["home_to_airport_notification_signature"] = notification_signature

        return NodeResult(
            node_name="notification_scheduling",
            status=NodeStatus.SUCCESS,
            data={"status": "scheduled", "journey_id": journey_id}
        )

    async def _smart_recommendation_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Generate a smarter, LLM-powered departure recommendation.
        """
        traffic_data = state.get("traffic_data", {})
        departure_calculation = state.get("departure_calculation")
        journey_context = state.get("journey_context", {})
        departure_time = self._get_segment_departure_time(journey_context)
        now_utc = datetime.now(timezone.utc)
        
        # Helper for robust access
        def get_val(obj, key, default=None):
            if not obj: return default
            if isinstance(obj, dict): return obj.get(key, default)
            return getattr(obj, key, default)

        monitoring = get_val(journey_context, "monitoring", {})
        weather_data = get_val(monitoring, "weather", {})
        if not weather_data and hasattr(journey_context, "weather"):
             weather_data = journey_context.weather.model_dump() if journey_context.weather else {}
        
        if not departure_calculation:
            return NodeResult(node_name="smart_recommendation", status=NodeStatus.SKIPPED)

        # Only start sending this planning message within the configured
        # final window before the actual booked/planned departure.
        smart_window = timedelta(hours=self.smart_recommendation_window_hours)
        if departure_time and now_utc < (departure_time - smart_window):
            logger.info(
                "Skipping home_to_airport smart recommendation until "
                f"{self.smart_recommendation_window_hours}h window. "
                f"now={now_utc.isoformat()} departure={departure_time.isoformat()}"
            )
            return NodeResult(
                node_name="smart_recommendation",
                status=NodeStatus.SKIPPED,
                data={"reason": "before_smart_recommendation_window"},
            )

        weather_dict = weather_data if isinstance(weather_data, dict) else {}
        smart_signature = self._build_smart_recommendation_signature(
            departure_time=departure_time,
            recommended_departure=departure_calculation.recommended_departure,
            traffic_data=traffic_data,
            weather_data=weather_dict,
            distance_km=state.get("distance_km"),
        )
        if self._metadata_value(journey_context, "home_to_airport_smart_recommendation_signature") == smart_signature:
            logger.info("Skipping home_to_airport smart recommendation: context unchanged")
            return NodeResult(
                node_name="smart_recommendation",
                status=NodeStatus.SKIPPED,
                data={"reason": "unchanged_context"},
            )

        # Build context for LLM with safe access
        flight_status = get_val(journey_context, "flight_status")
        transport_options = state.get("transport_options", []) or []
        transport_summaries = []
        for option in transport_options[:3]:
            mode = getattr(option, "mode", None)
            transport_summaries.append({
                "mode": mode.value if hasattr(mode, "value") else str(mode or "transport"),
                "duration_minutes": getattr(option, "estimated_duration_minutes", None),
                "estimated_cost": getattr(option, "estimated_cost", None),
                "recommended": getattr(option, "recommended", False),
                "notes": (getattr(option, "notes", None) or [])[:2],
            })
        context_data = {
            "traffic": traffic_data,
            "weather": weather_data,
            "recommended_departure": departure_calculation.recommended_departure.isoformat() if hasattr(departure_calculation.recommended_departure, "isoformat") else str(departure_calculation.recommended_departure),
            "distance_km": state.get("distance_km"),
            "transport_options": transport_summaries,
            "flight_info": {
                "number": get_val(flight_status, "flight_number", "TBD"),
                "airline": get_val(flight_status, "airline", ""),
                "departure_time": get_val(flight_status, "departure_time", "TBD"),
                "origin": get_val(journey_context, "departure_airport_code", "Origin"),
                "destination": get_val(journey_context, "destination_airport_code", "Destination")
            },
            "travel_date": get_val(journey_context, "planned_departure_date", "TBD")
        }
        
        # Refined prompt for rich Pro-tip
        content_prompt = f"""
        Based on the current traffic ({traffic_data.get('conditions', 'unknown')}, {traffic_data.get('delay_minutes', 0)}m delay) 
        and weather ({weather_data.get('description', 'clear') if isinstance(weather_data, dict) else 'clear'}), provide a smart 'pro-tip' for the user's journey to the airport.
        
        Example style:
        "Traffic’s only a 7‑min slow‑down, so the 93‑minute drive is still doable. Leave by ~Mar 08, 12:35 (about 10 min earlier than the suggested 12:45) to stay ahead of any late‑day rush. No weather alerts, so a quick car or rideshare is the fastest option. If you’d rather avoid traffic altogether, hop on the 25‑min train that runs every 15 min."
        
        Include:
        1. Reality check on the drive/transport.
        2. Specific 'What to do' action (e.g., leave X min earlier).
        3. Alternative transport advice if applicable.
        Keep it punchy and premium.
        """

        weather_summary = weather_dict.get("description") or weather_dict.get("condition") or ""
        current_duration = traffic_data.get("current_duration_minutes")
        recommended_departure_text = self._format_time(
            departure_calculation.recommended_departure,
            journey_context,
        )
        content_prompt = f"""
        Write a concise, factual airport-ground-transport recommendation.
        Use only the context below. Do not invent trains, shuttles, schedules, frequencies,
        weather alerts, or alternate transport options that are not explicitly listed.
        Prefer exact datetimes and concrete numbers over conversational filler.
        Keep it to 2-3 short sentences and under 80 words.

        Context:
        - Traffic conditions: {traffic_data.get('conditions', 'unknown')}
        - Traffic delay minutes: {traffic_data.get('delay_minutes', 0)}
        - Current drive duration minutes: {current_duration}
        - Recommended departure time: {recommended_departure_text}
        - Distance to airport km: {state.get('distance_km')}
        - Weather summary: {weather_summary or 'unknown'}
        - Transport options: {json.dumps(transport_summaries, default=str)}

        Include:
        1. Current traffic impact and current travel time.
        2. Exact recommended departure datetime.
        3. At most one grounded alternative, only if it appears in transport options.
        Avoid hype, adjectives like "comfortably", and lifestyle language.
        """

        recommendation = await self.generate_smart_recommendation(
            recommendation_type="logistics",
            title="Optimized Departure Plan",
            content_prompt=content_prompt,
            context_data=context_data
        )

        # Generate new Unified JourneyMessage
        flight = context_data["flight_info"]
        
        message = await self.render_journey_message(
            template_name="logistics.j2",
            context_data={
                "travel_date": context_data["travel_date"],
                "airline": flight["airline"],
                "flight_number": flight["number"],
                "origin": flight["origin"],
                "destination": flight["destination"],
                "flight_departure_time": self._format_full_datetime(flight["departure_time"], journey_context),
                "traffic_delay": traffic_data.get("delay_minutes", 0),
                "traffic_conditions": traffic_data.get("conditions", "unknown"),
                "travel_duration_minutes": current_duration,
                "distance_km": state.get("distance_km"),
                "recommended_time": self._format_full_datetime(departure_calculation.recommended_departure, journey_context),
                "pro_tip": recommendation.content
            },
            title="Departure Recommendation"
        )
        
        # Add to state and recommendations/messages list
        state["smart_recommendation"] = recommendation
        state["journey_message"] = message
        
        recommendations = state.get("recommendations", [])
        recommendations.append(recommendation)
        state["recommendations"] = recommendations
        state.setdefault("metadata_updates", {})["home_to_airport_smart_recommendation_signature"] = smart_signature

        messages = state.get("messages", [])
        messages.append(message)
        state["messages"] = messages
        
        return NodeResult(
            node_name="smart_recommendation",
            status=NodeStatus.SUCCESS,
            data={
                "recommendation": recommendation.dict() if hasattr(recommendation, "dict") else recommendation.model_dump(),
                "message": message.model_dump()
            }
        )

    async def _generate_response_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Generate the response message for the user.
        
        Enhanced with:
        - Risk analysis and backup suggestions
        - What-if scenarios
        - Alternative planning
        """
        departure_calc = state.get("departure_calculation")
        transport = state.get("recommended_transport")
        risk = state.get("risk_assessment")
        traffic = state.get("traffic_data", {})
        checkin_advice = state.get("checkin_advice")
        journey_context = state.get("journey_context", {})

        if not departure_calc:
            state["response"] = "I'm calculating your departure time. Please wait..."
            return NodeResult(
                node_name="generate_response",
                status=NodeStatus.SUCCESS
            )

        # Format response
        response_parts = []

        # Departure time
        dep_time = self._format_time(departure_calc.recommended_departure, journey_context)
        response_parts.append(f"**Recommended departure:** {dep_time}\n")
        
        # Risk analysis with alternative suggestions
        if risk and hasattr(risk, "level"):
            from agent.alternative_planner import RiskLevel
            
            if risk.level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
                response_parts.append(
                    f"\n⚠️ **Risk Alert**: {risk.level.value.upper()} delay risk detected. "
                    f"Consider leaving 30-45 minutes earlier for safety.\n"
                )

        # Transport recommendation
        if transport:
            response_parts.append(
                f"\n**Recommended transport:** {transport.mode.value.replace('_', ' ').title()}\n"
                f"• Estimated travel time: {transport.estimated_duration_minutes} minutes\n"
                f"• Estimated cost: ${transport.estimated_cost:.2f}\n"
            )

        # Traffic update
        if traffic.get("conditions"):
            response_parts.append(
                f"\n**Current traffic:** {traffic['conditions'].title()}\n"
            )
            if traffic.get("incidents"):
                response_parts.append("• " + traffic["incidents"][0].get("type", "") + "\n")

        # Risk status
        if risk:
            status_emoji = {
                "on_track": "✅",
                "watch": "⚠️",
                "action_needed": "🚨"
            }
            # Handle both production RiskLevel enum and mock strings/enums
            level_value = risk.overall_level.value if hasattr(risk, "overall_level") else getattr(risk, "level", "on_track")
            emoji = status_emoji.get(level_value, "")
            response_parts.append(
                f"\n**Status:** {emoji} {level_value.replace('_', ' ').title()}\n"
            )
            if risk.recommended_actions:
                response_parts.append("Next step: " + risk.recommended_actions[0] + "\n")

        # Phase 2: check-in advice from real-time context when available
        if checkin_advice:
            response_parts.append(f"\n**Check-in:** {checkin_advice}\n")

        state["response"] = "".join(response_parts)

        return NodeResult(
            node_name="generate_response",
            status=NodeStatus.SUCCESS
        )

    def _check_completion(self) -> bool:
        """Check if home-to-airport segment should transition."""
        return self._state.get("arrived_at_airport", False)

    def _get_next_segment(self) -> str:
        """Get the next segment after home-to-airport."""
        return "airport_to_flight"


def create_home_to_airport_orchestrator() -> HomeToAirportOrchestrator:
    """Factory function to create a HomeToAirportOrchestrator."""
    return HomeToAirportOrchestrator()


def create_home_to_airport_graph():
    """Create and return the compiled LangGraph for home-to-airport orchestrator."""
    orchestrator = HomeToAirportOrchestrator()
    return orchestrator.build_graph()
