"""
Phase 2: Context Monitor Service

This module provides continuous multi-factor context monitoring.
It runs background tasks to poll various APIs and update journey context.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

import asyncio
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from enum import Enum
import logging
import os

logger = logging.getLogger(__name__)


def _get_env_int(name: str, default: int) -> int:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
        return value if value > 0 else default
    except ValueError:
        logger.warning("Invalid %s value '%s'; using default %s", name, raw, default)
        return default


class MonitoringType(str, Enum):
    """Types of monitoring that can be performed."""
    LOCATION = "location"
    FLIGHT_STATUS = "flight_status"
    WEATHER = "weather"
    TRAFFIC = "traffic"
    AIRPORT_CONDITIONS = "airport_conditions"


@dataclass
class MonitoringConfig:
    """Configuration for monitoring behavior."""
    location_interval_seconds: int = field(default_factory=lambda: _get_env_int("JOURNEY_MONITOR_LOCATION_INTERVAL_SECONDS", 60))  # Check location every minute
    flight_status_interval_seconds: int = field(default_factory=lambda: _get_env_int("JOURNEY_MONITOR_FLIGHT_STATUS_INTERVAL_SECONDS", 300))  # Check flight status every 5 minutes
    weather_interval_seconds: int = field(default_factory=lambda: _get_env_int("JOURNEY_MONITOR_WEATHER_INTERVAL_SECONDS", 900))  # Check weather every 15 minutes
    traffic_interval_seconds: int = field(default_factory=lambda: _get_env_int("JOURNEY_MONITOR_TRAFFIC_INTERVAL_SECONDS", 180))  # Check traffic every 3 minutes
    airport_interval_seconds: int = field(default_factory=lambda: _get_env_int("JOURNEY_MONITOR_AIRPORT_INTERVAL_SECONDS", 600))  # Check airport every 10 minutes
    max_retries: int = field(default_factory=lambda: _get_env_int("JOURNEY_MONITOR_MAX_RETRIES", 3))
    retry_delay_seconds: int = field(default_factory=lambda: _get_env_int("JOURNEY_MONITOR_RETRY_DELAY_SECONDS", 5))


@dataclass
class ContextUpdate:
    """Represents a context update from monitoring."""
    monitoring_type: MonitoringType
    journey_id: str
    data: Dict[str, Any]
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    success: bool = True
    error: Optional[str] = None


class ContextMonitor:
    """
    Monitors multiple context factors for active journeys.

    This service runs background tasks that poll various APIs
    and update journey context in real-time.
    """

    def __init__(
        self,
        config: Optional[MonitoringConfig] = None,
        on_context_update: Optional[Callable[[ContextUpdate], None]] = None,
        state_manager: Optional[Any] = None
    ):
        """
        Initialize the context monitor.

        Args:
            config: Monitoring configuration
            on_context_update: Callback for context updates
            state_manager: JourneyStateManager instance for persistence
        """
        self.config = config or MonitoringConfig()
        self.on_context_update = on_context_update
        self.state_manager = state_manager

        # Track active monitoring tasks per journey
        self._active_tasks: Dict[str, Dict[MonitoringType, asyncio.Task]] = {}
        self._running = False

        # Store latest context per journey
        self._latest_context: Dict[str, Dict[MonitoringType, ContextUpdate]] = {}

        # Import tools locally to avoid circular imports if any
        try:
            from .context_tools import (
                get_current_location,
                get_traffic_conditions,
                get_weather_forecast,
                get_airport_intelligence
            )
        except ImportError:
            # Fall back to absolute import for tests
            from context_tools import (
                get_current_location,
                get_traffic_conditions,
                get_weather_forecast,
                get_airport_intelligence
            )

        # Use the Amadeus Flight Order retrieval tool to check booking status
        # by order ID (not live flight status by flight number).
        try:
            from agent.travel_provider import (
                ACTIVE_TRAVEL_PROVIDER,
                active_get_flight_order,
            )
        except ImportError:
            try:
                from amadeus.amadeus_flight.amadeus_flight_tools import (
                    amadeus_get_flight_order as active_get_flight_order,
                )
                ACTIVE_TRAVEL_PROVIDER = "amadeus"
            except ImportError:
                active_get_flight_order = None
                ACTIVE_TRAVEL_PROVIDER = "amadeus"
                logger.warning("Could not import active_get_flight_order")

        self.active_travel_provider = ACTIVE_TRAVEL_PROVIDER

        self.tools = {
            MonitoringType.LOCATION: get_current_location,
            MonitoringType.FLIGHT_STATUS: active_get_flight_order,
            MonitoringType.WEATHER: get_weather_forecast,
            MonitoringType.TRAFFIC: get_traffic_conditions,
            MonitoringType.AIRPORT_CONDITIONS: get_airport_intelligence
        }

    async def start_monitoring(
        self,
        journey_id: str,
        monitoring_types: Optional[List[MonitoringType]] = None
    ) -> bool:
        """
        Start monitoring for a journey.
        """
        if journey_id in self._active_tasks:
            logger.warning(f"Monitoring already active for journey {journey_id}")
            return False

        self._running = True
        self._active_tasks[journey_id] = {}
        self._latest_context[journey_id] = {}

        # Default to all monitoring types
        types_to_monitor = monitoring_types or list(MonitoringType)

        for monitor_type in types_to_monitor:
            task = asyncio.create_task(
                self._monitoring_loop(journey_id, monitor_type)
            )
            self._active_tasks[journey_id][monitor_type] = task

        logger.info(f"Started monitoring for journey {journey_id}: {types_to_monitor}")
        return True

    async def stop_monitoring(self, journey_id: str) -> bool:
        """
        Stop monitoring for a journey.
        """
        if journey_id not in self._active_tasks:
            return False

        # Cancel all tasks for this journey
        for task in self._active_tasks[journey_id].values():
            task.cancel()

        del self._active_tasks[journey_id]

        if journey_id in self._latest_context:
            del self._latest_context[journey_id]

        logger.info(f"Stopped monitoring for journey {journey_id}")
        return True

    async def sync_monitoring_to_segment(self, journey_id: str, segment: Any) -> None:
        """
        Synchronize monitoring tasks and intervals to the current journey segment.
        """
        # First stop all monitoring for this journey to reset
        await self.stop_monitoring(journey_id)

        # Map segment names (string or enum) to monitoring types
        try:
            from ..phase_1_foundation.journey_models import JourneySegment
        except ImportError:
            # Mock for tests - use strings
            class JourneySegment:
                INSPIRATION = "inspiration"
                HOME_TO_AIRPORT = "home_to_airport"
                AIRPORT_TO_FLIGHT = "airport_to_flight"
                FLIGHT_TO_HOTEL = "flight_to_hotel"
                HOTEL_TO_ACTIVITIES = "hotel_to_activities"
                RETURN = "return"
        
        # Ensure we're working with the enum value
        seg_value = segment.value if hasattr(segment, 'value') else segment

        monitoring_types = []
        if seg_value == JourneySegment.INSPIRATION:
            monitoring_types = [MonitoringType.WEATHER]
        elif seg_value == JourneySegment.HOME_TO_AIRPORT:
            monitoring_types = [MonitoringType.LOCATION, MonitoringType.TRAFFIC, MonitoringType.FLIGHT_STATUS]
        elif seg_value == JourneySegment.AIRPORT_TO_FLIGHT:
            monitoring_types = [MonitoringType.AIRPORT_CONDITIONS, MonitoringType.FLIGHT_STATUS]
        elif seg_value == JourneySegment.FLIGHT_TO_HOTEL:
            monitoring_types = [MonitoringType.FLIGHT_STATUS, MonitoringType.TRAFFIC, MonitoringType.LOCATION]
        elif seg_value == JourneySegment.HOTEL_TO_ACTIVITIES:
            monitoring_types = [MonitoringType.LOCATION, MonitoringType.WEATHER, MonitoringType.TRAFFIC]
        elif seg_value == JourneySegment.RETURN:
            monitoring_types = [MonitoringType.LOCATION, MonitoringType.TRAFFIC, MonitoringType.FLIGHT_STATUS]
        
        if monitoring_types:
            await self.start_monitoring(journey_id, monitoring_types)
            logger.info(f"Synced monitoring for journey {journey_id} to segment {seg_value}")

    async def stop_all(self) -> None:
        """Stop all monitoring tasks."""
        self._running = False
        journey_ids = list(self._active_tasks.keys())
        for journey_id in journey_ids:
            await self.stop_monitoring(journey_id)

    async def _monitoring_loop(
        self,
        journey_id: str,
        monitor_type: MonitoringType
    ) -> None:
        """
        Main monitoring loop for a specific type.
        """
        while self._running:
            try:
                # Interval can change based on segment
                interval = await self._get_interval(journey_id, monitor_type)
                
                # Perform the monitoring check
                update = await self._perform_check(journey_id, monitor_type)

                # Store latest context
                if journey_id in self._latest_context:
                    self._latest_context[journey_id][monitor_type] = update

                # Persist to state manager if available
                if self.state_manager and update.success:
                    await self._persist_update(journey_id, update)
                    # Also embed into ai_messages for vector search retrieval
                    await self._embed_to_messages(journey_id, update)

                # Trigger callback if set
                if self.on_context_update:
                    if asyncio.iscoroutinefunction(self.on_context_update):
                        await self.on_context_update(update)
                    else:
                        self.on_context_update(update)

                logger.debug(f"Context update for {journey_id}/{monitor_type}: {update.success}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitoring error for {journey_id}/{monitor_type}: {e}")

            # Wait for next interval
            await asyncio.sleep(interval)

    async def _get_interval(self, journey_id: str, monitor_type: MonitoringType) -> int:
        """
        Get the polling interval for a monitoring type, potentially 
        adjusting based on the current segment.
        """
        interval = 60 # Default
        
        if monitor_type == MonitoringType.LOCATION:
            interval = self.config.location_interval_seconds
        elif monitor_type == MonitoringType.FLIGHT_STATUS:
            interval = self.config.flight_status_interval_seconds
        elif monitor_type == MonitoringType.WEATHER:
            interval = self.config.weather_interval_seconds
        elif monitor_type == MonitoringType.TRAFFIC:
            interval = self.config.traffic_interval_seconds
        elif monitor_type == MonitoringType.AIRPORT_CONDITIONS:
            interval = self.config.airport_interval_seconds

        # Segment-specific overrides for high-frequency polling
        if self.state_manager:
            journey = self.state_manager.get_journey(journey_id)
            if journey:
                try:
                    from ..phase_1_foundation.journey_models import JourneySegment
                except ImportError:
                    # Mock for tests
                    class JourneySegment:
                        HOME_TO_AIRPORT = "home_to_airport"
                        RETURN = "return"
                        AIRPORT_TO_FLIGHT = "airport_to_flight"
                        FLIGHT_TO_HOTEL = "flight_to_hotel"
                
                seg = journey.current_segment
                
                # Boost location and traffic frequency during active travel
                if seg in [JourneySegment.HOME_TO_AIRPORT, JourneySegment.RETURN]:
                    if monitor_type in [MonitoringType.LOCATION, MonitoringType.TRAFFIC]:
                        interval = min(interval, 30) # Boost to 30s
                
                # Boost flight status frequency near departure/arrival
                if seg in [JourneySegment.AIRPORT_TO_FLIGHT, JourneySegment.FLIGHT_TO_HOTEL]:
                    if monitor_type == MonitoringType.FLIGHT_STATUS:
                        interval = min(interval, 60) # Boost to 1m

        return interval

    async def _perform_check(
        self,
        journey_id: str,
        monitor_type: MonitoringType
    ) -> ContextUpdate:
        """
        Perform a monitoring check.
        """
        tool = self.tools.get(monitor_type)
        if not tool:
            return ContextUpdate(
                monitoring_type=monitor_type,
                journey_id=journey_id,
                data={},
                success=False,
                error=f"No tool found for {monitor_type}"
            )

        try:
            # Prepare arguments for the tool
            args = await self._get_tool_args(journey_id, monitor_type)

            # Skip sentinel: tool args indicated there's nothing to monitor
            if args.get("__skip__"):
                return ContextUpdate(
                    monitoring_type=monitor_type,
                    journey_id=journey_id,
                    data={},
                    success=False,
                    error="No data available to monitor"
                )

            # Execute tool (most tools are sync @tool, so we run in thread if needed)
            # But langchain @tool invoke is sync.
            if hasattr(tool, "ainvoke"):
                data = await tool.ainvoke(args)
            else:
                data = tool.invoke(args)

            # Normalize raw Amadeus flight-order response into the flat
            # structure that the frontend and _persist_update expect.
            if monitor_type == MonitoringType.FLIGHT_STATUS:
                args["__journey_id__"] = journey_id
                data = self._normalize_flight_status(data, args)

            return ContextUpdate(
                monitoring_type=monitor_type,
                journey_id=journey_id,
                data=data,
                success="error" not in data
            )
        except Exception as e:
            return ContextUpdate(
                monitoring_type=monitor_type,
                journey_id=journey_id,
                data={},
                success=False,
                error=str(e)
            )

    def _normalize_flight_status(self, raw: Dict[str, Any], args: Dict[str, Any]) -> Dict[str, Any]:
        """Transform raw Amadeus GET /v1/booking/flight-orders/{id} response
        into the flat structure expected by the frontend.

        Also enriches with journey-context data (booking reference, prices, etc.)
        so the frontend has a single comprehensive update.
        """
        if "error" in raw:
            return raw

        provider = str(
            raw.get("provider")
            or args.get("provider")
            or self.active_travel_provider
            or "amadeus"
        ).lower()

        if provider == "duffel":
            return self._normalize_duffel_flight_status(raw, args)

        # The response is {"data": {flight-order object}} (single object, not array)
        order = raw.get("data", {})
        if isinstance(order, list):
            order = order[0] if order else {}
        if not order:
            return {"error": "Empty order response", "source": "amadeus"}

        # Extract flight offers → itineraries → segments
        flight_offers = order.get("flightOffers", [])
        if not flight_offers:
            return {"error": "No flight offers in order", "source": "amadeus"}

        offer = flight_offers[0]
        itineraries = offer.get("itineraries", [])
        if not itineraries:
            return {"error": "No itineraries in order", "source": "amadeus"}

        # First itinerary, first and last segments (for departure and final arrival)
        all_segments = itineraries[0].get("segments", [])
        if not all_segments:
            return {"error": "No segments in itinerary", "source": "amadeus"}

        first_seg = all_segments[0]
        last_seg = all_segments[-1]

        dep = first_seg.get("departure", {})
        arr = last_seg.get("arrival", {})

        carrier_code = first_seg.get("carrierCode", "")
        flight_number = first_seg.get("number", "")

        # Build flight number label including all legs for connecting flights
        if len(all_segments) > 1:
            leg_labels = [
                f"{s.get('carrierCode', '')}{s.get('number', '')}"
                for s in all_segments
            ]
            flight_number_display = " / ".join(leg_labels)
        else:
            flight_number_display = f"{carrier_code}{flight_number}"

        # Determine booking status from the order
        # Amadeus order statuses: CONFIRMED, CANCELLED, etc.
        # Also check ticket status from travelerPricings
        order_type = order.get("type", "")
        traveler_pricings = offer.get("travelerPricings", [])
        ticket_status = None
        if traveler_pricings:
            fare_detail = traveler_pricings[0].get("fareDetailsBySegment", [])
            if fare_detail:
                ticket_status = fare_detail[0].get("class", "")

        # Price from the offer
        price_info = offer.get("price", {})
        total_price = price_info.get("grandTotal") or price_info.get("total")
        currency = price_info.get("currency", "USD")

        # Determine display status based on departure date proximity
        sched_dep = dep.get("at", "")
        sched_arr = arr.get("at", "")
        status = "Confirmed"
        delay_minutes = 0
        now = datetime.now(timezone.utc)

        if sched_dep:
            try:
                dep_dt = datetime.fromisoformat(sched_dep.replace("Z", "+00:00"))
                if dep_dt.tzinfo is None:
                    dep_dt = dep_dt.replace(tzinfo=timezone.utc)
                hours_until = (dep_dt - now).total_seconds() / 3600

                if hours_until > 48:
                    status = "Confirmed"
                elif hours_until > 24:
                    status = "Upcoming"
                elif hours_until > 0:
                    status = "Check-in Open"
                elif hours_until > -2:
                    # Within 2 hours after scheduled departure - likely in air
                    status = "Departed"
                else:
                    # More than 2 hours past departure - likely arrived
                    if sched_arr:
                        try:
                            arr_dt = datetime.fromisoformat(sched_arr.replace("Z", "+00:00"))
                            if arr_dt.tzinfo is None:
                                arr_dt = arr_dt.replace(tzinfo=timezone.utc)
                            if now > arr_dt:
                                status = "Arrived"
                            else:
                                status = "In Air"
                        except Exception:
                            status = "In Air"
                    else:
                        status = "In Air"
            except Exception:
                pass

        # Enrich with journey context data
        journey = None
        journey_id = args.get("__journey_id__")
        if journey_id and self.state_manager:
            journey = self.state_manager.get_journey(journey_id)

        booking_ref = ""
        amadeus_order_id = args.get("order_id", "")
        airline_name = carrier_code
        if journey and journey.context.flight_status:
            fs = journey.context.flight_status
            booking_ref = fs.booking_reference or ""
            airline_name = fs.airline or carrier_code

        return {
            "flight_number": flight_number_display,
            "airline": airline_name,
            "status": status,
            "departure_airport": dep.get("iataCode", "Unknown"),
            "arrival_airport": arr.get("iataCode", "Unknown"),
            "scheduled_departure": sched_dep or "Unknown",
            "estimated_departure": sched_dep or "Unknown",
            "actual_departure": None,
            "scheduled_arrival": sched_arr or "Unknown",
            "estimated_arrival": sched_arr or "Unknown",
            "gate": dep.get("terminal", "TBD") if dep.get("terminal") else "TBD",
            "terminal": dep.get("terminal", "Unknown"),
            "delay_minutes": delay_minutes,
            "booking_reference": booking_ref,
            "provider": "amadeus",
            "provider_order_id": amadeus_order_id,
            "amadeus_order_id": amadeus_order_id,
            "price": float(total_price) if total_price else None,
            "currency": currency,
            "segments_count": len(all_segments),
            "is_connecting": len(all_segments) > 1,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "source": "amadeus",
        }

    def _normalize_duffel_flight_status(self, raw: Dict[str, Any], args: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a Duffel order payload into the shared flight status shape."""
        order = raw.get("data", raw)
        if not isinstance(order, dict) or not order:
            return {"error": "Empty Duffel order response", "source": "duffel"}

        slices = order.get("slices", [])
        if not isinstance(slices, list) or not slices:
            return {"error": "No Duffel slices in order", "source": "duffel"}

        first_slice = slices[0] if isinstance(slices[0], dict) else {}
        segments = first_slice.get("segments", [])
        if not isinstance(segments, list) or not segments:
            return {"error": "No Duffel segments in order", "source": "duffel"}

        first_seg = segments[0] if isinstance(segments[0], dict) else {}
        last_seg = segments[-1] if isinstance(segments[-1], dict) else {}
        origin = first_seg.get("origin", {}) if isinstance(first_seg.get("origin"), dict) else {}
        destination = last_seg.get("destination", {}) if isinstance(last_seg.get("destination"), dict) else {}

        marketing_carrier = (
            first_seg.get("marketing_carrier")
            if isinstance(first_seg.get("marketing_carrier"), dict)
            else {}
        )
        operating_carrier = (
            first_seg.get("operating_carrier")
            if isinstance(first_seg.get("operating_carrier"), dict)
            else {}
        )
        carrier = marketing_carrier or operating_carrier
        carrier_iata = carrier.get("iata_code", "")
        airline_name = carrier.get("name") or carrier_iata or "Duffel Flight"
        flight_num = (
            first_seg.get("marketing_carrier_flight_number")
            or first_seg.get("operating_carrier_flight_number")
            or ""
        )

        departure_at = first_seg.get("departing_at", "")
        arrival_at = last_seg.get("arriving_at", "")
        order_id = str(order.get("id") or args.get("order_id") or "")

        now = datetime.now(timezone.utc)
        status = "Confirmed"
        delay_minutes = 0
        if departure_at:
            try:
                dep_dt = datetime.fromisoformat(str(departure_at).replace("Z", "+00:00"))
                if dep_dt.tzinfo is None:
                    dep_dt = dep_dt.replace(tzinfo=timezone.utc)
                hours_until = (dep_dt - now).total_seconds() / 3600
                if hours_until > 48:
                    status = "Confirmed"
                elif hours_until > 24:
                    status = "Upcoming"
                elif hours_until > 0:
                    status = "Check-in Open"
                elif hours_until > -2:
                    status = "Departed"
                else:
                    status = "Arrived"
            except Exception:
                status = "Confirmed"

        booking_ref = ""
        price = order.get("total_amount")
        currency = order.get("total_currency", "USD")
        if price is not None:
            try:
                price = float(price)
            except (TypeError, ValueError):
                price = None

        journey = None
        journey_id = args.get("__journey_id__")
        if journey_id and self.state_manager:
            journey = self.state_manager.get_journey(journey_id)
        if journey and journey.context.flight_status:
            fs = journey.context.flight_status
            booking_ref = fs.booking_reference or ""
            airline_name = fs.airline or airline_name
            currency = fs.currency or currency
            price = fs.price if fs.price is not None else price

        segment_labels = []
        for seg in segments:
            if not isinstance(seg, dict):
                continue
            seg_carrier = (
                ((seg.get("marketing_carrier") or {}).get("iata_code"))
                or ((seg.get("operating_carrier") or {}).get("iata_code"))
                or ""
            )
            seg_no = (
                seg.get("marketing_carrier_flight_number")
                or seg.get("operating_carrier_flight_number")
                or ""
            )
            label = f"{seg_carrier}{seg_no}".strip()
            if label:
                segment_labels.append(label)

        return {
            "flight_number": " / ".join(segment_labels) if segment_labels else f"{carrier_iata}{flight_num}".strip(),
            "airline": airline_name,
            "status": status,
            "departure_airport": origin.get("iata_code", "Unknown"),
            "arrival_airport": destination.get("iata_code", "Unknown"),
            "scheduled_departure": departure_at or "Unknown",
            "estimated_departure": departure_at or "Unknown",
            "actual_departure": None,
            "scheduled_arrival": arrival_at or "Unknown",
            "estimated_arrival": arrival_at or "Unknown",
            "gate": "TBD",
            "terminal": "Unknown",
            "delay_minutes": delay_minutes,
            "booking_reference": booking_ref,
            "provider": "duffel",
            "provider_order_id": order_id,
            "amadeus_order_id": None,
            "price": price,
            "currency": currency,
            "segments_count": len(segments),
            "is_connecting": len(segments) > 1,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "source": "duffel",
        }

    async def _get_tool_args(self, journey_id: str, monitor_type: MonitoringType) -> Dict[str, Any]:
        """Fetch necessary arguments for a tool from the journey state."""
        journey = None
        if self.state_manager:
            journey = self.state_manager.get_journey(journey_id)
            
        if monitor_type == MonitoringType.LOCATION:
            args: Dict[str, Any] = {"user_id": journey.user_id if journey else "unknown"}
            # Pass stored browser location if available so the tool skips ipinfo
            if journey and journey.context.location:
                loc = journey.context.location
                if loc.latitude is not None and loc.longitude is not None:
                    args["browser_lat"] = loc.latitude
                    args["browser_lon"] = loc.longitude
                    args["browser_city"] = loc.city
                    args["browser_country"] = loc.country
                    if loc.detected_at:
                        args["browser_detected_at"] = loc.detected_at.isoformat() if hasattr(loc.detected_at, 'isoformat') else str(loc.detected_at)
            return args
            
        if monitor_type == MonitoringType.FLIGHT_STATUS:
            # Only monitor if we have a booked flight with a provider-backed order ID
            fs = journey.context.flight_status if journey else None
            provider = (
                getattr(fs, "provider", None)
                or self.active_travel_provider
                or "amadeus"
            ) if fs else self.active_travel_provider
            provider_order_id = None
            if fs:
                provider_order_id = (
                    getattr(fs, "provider_order_id", None)
                    or getattr(fs, "amadeus_order_id", None)
                )

            if not fs or not provider_order_id:
                logger.warning(
                    f"Flight status monitoring for {journey_id}: no provider order id, skipping"
                )
                return {"__skip__": True}

            return {
                "order_id": provider_order_id,
                "provider": provider,
            }
            
        if monitor_type == MonitoringType.WEATHER:
            if journey and journey.context.location and journey.context.location.latitude is not None:
                return {
                    "latitude": journey.context.location.latitude,
                    "longitude": journey.context.location.longitude,
                }
            logger.error(f"Cannot fetch weather for journey {journey_id}: no location available")
            return {"latitude": 0, "longitude": 0}  # Will produce an error from the API
            
        if monitor_type == MonitoringType.TRAFFIC:
            # Needs origin (user location) and destination (airport or hotel).
            # The get_traffic_conditions tool accepts either coordinate dicts
            # or plain-text place names (geocoded automatically via Google Maps).

            # --- Origin ---
            origin: Any = None
            if journey and journey.context.location and journey.context.location.latitude is not None:
                origin = {
                    "lat": journey.context.location.latitude,
                    "lon": journey.context.location.longitude,
                }
            elif journey and journey.context.departure_city:
                origin = journey.context.departure_city
            elif journey and journey.context.departure_airport_code:
                origin = f"{journey.context.departure_airport_code} Airport"

            if origin is None:
                logger.error(f"Cannot fetch traffic for journey {journey_id}: no origin location available")
                return {
                    "origin": {"lat": 0, "lon": 0},
                    "destination": {"lat": 0, "lon": 0},
                }

            # --- Destination ---
            # Determine from the current segment which direction traffic
            # matters: towards the departure airport, or from the arrival
            # airport to the hotel/city.
            destination: Any = None
            seg_value = journey.current_segment.value if journey and hasattr(journey.current_segment, 'value') else None

            if seg_value in ("home_to_airport", "return"):
                # Travelling to the departure airport
                if journey.context.departure_airport_code:
                    destination = f"{journey.context.departure_airport_code} Airport"
                elif journey.context.airport_code:
                    destination = f"{journey.context.airport_code} Airport"
            elif seg_value in ("flight_to_hotel", "hotel_to_activities"):
                # Travelling within the destination city
                if journey.context.planned_destination:
                    destination = journey.context.planned_destination
                elif journey.context.destination_airport_code:
                    destination = f"{journey.context.destination_airport_code} Airport"

            # Fallback chain if segment-specific logic didn't resolve
            if destination is None:
                if journey and journey.context.destination_airport_code:
                    destination = f"{journey.context.destination_airport_code} Airport"
                elif journey and journey.context.planned_destination:
                    destination = journey.context.planned_destination
                elif journey and journey.context.airport_code:
                    destination = f"{journey.context.airport_code} Airport"

            if destination is None:
                logger.warning(f"Traffic monitoring for {journey_id}: no destination info available, skipping")
                return {
                    "origin": {"lat": 0, "lon": 0},
                    "destination": {"lat": 0, "lon": 0},
                }

            return {"origin": origin, "destination": destination}
            
        if monitor_type == MonitoringType.AIRPORT_CONDITIONS:
            code = "JFK"
            if journey and journey.context.airport_code:
                code = journey.context.airport_code
            return {"airport_code": code}
            
        return {}

    async def _persist_update(self, journey_id: str, update: ContextUpdate) -> None:
        """Persist context update to JourneyStateManager."""
        if not self.state_manager:
            return

        updates = {}
        data = update.data
        
        if update.monitoring_type == MonitoringType.LOCATION:
            updates["location"] = {
                "latitude": data.get("latitude"),
                "longitude": data.get("longitude"),
                "city": data.get("city"),
                "country": data.get("country"),
                "detected_at": data.get("detected_at")
            }
        elif update.monitoring_type == MonitoringType.FLIGHT_STATUS:
            updates["flight"] = {
                "flight_number": data.get("flight_number"),
                "status": data.get("status"),
                "departure_airport": data.get("departure_airport"),
                "arrival_airport": data.get("arrival_airport"),
                "airline": data.get("airline"),
                "gate": data.get("gate"),
                "departure_time": data.get("estimated_departure") or data.get("scheduled_departure"),
                "arrival_time": data.get("estimated_arrival") or data.get("scheduled_arrival"),
                "delay_minutes": data.get("delay_minutes"),
                "booking_reference": data.get("booking_reference"),
                "provider": data.get("provider"),
                "provider_order_id": data.get("provider_order_id"),
                "amadeus_order_id": data.get("amadeus_order_id"),
                "price": data.get("price"),
                "currency": data.get("currency"),
                "last_updated": data.get("last_updated")
            }
        elif update.monitoring_type == MonitoringType.WEATHER:
            updates["weather"] = data.get("current")
            
        elif update.monitoring_type == MonitoringType.TRAFFIC:
            updates["traffic"] = {
                "conditions": data.get("conditions"),
                "eta_impact_minutes": data.get("delay_minutes"),
                "last_updated": data.get("last_updated")
            }
        elif update.monitoring_type == MonitoringType.AIRPORT_CONDITIONS:
            updates["airport_context"] = data
            
        if updates:
            # JourneyStateManager.update_context expects Dict[str, Any] and applies to JourneyContext attributes
            # We need to make sure the attributes exist on JourneyContext
            self.state_manager.update_context(journey_id, updates)

    def _summarize_monitoring_data(self, monitor_type: MonitoringType, data: dict) -> str:
        """Create a human-readable summary of monitoring data for embedding."""
        if monitor_type == MonitoringType.TRAFFIC:
            return (
                f"Journey monitoring update: traffic. "
                f"Conditions: {data.get('conditions', 'unknown')}. "
                f"Delay: {data.get('delay_minutes', 0)} minutes. "
                f"Travel time: {data.get('current_duration_minutes', 'N/A')} min "
                f"(normal: {data.get('normal_duration_minutes', 'N/A')} min). "
                f"Distance: {data.get('distance_km', 'N/A')} km."
            )
        if monitor_type == MonitoringType.WEATHER:
            current = data.get("current", {})
            return (
                f"Journey monitoring update: weather. "
                f"Condition: {current.get('condition', 'unknown')}. "
                f"Temperature: {current.get('temperature_celsius', 'N/A')}°C "
                f"(feels like {current.get('feels_like_celsius', 'N/A')}°C). "
                f"Humidity: {current.get('humidity_percent', 'N/A')}%. "
                f"Wind: {current.get('wind_speed_kmh', 'N/A')} km/h."
            )
        if monitor_type == MonitoringType.FLIGHT_STATUS:
            return (
                f"Journey monitoring update: flight status. "
                f"Flight {data.get('flight_number', 'unknown')}: {data.get('status', 'unknown')}. "
                f"Route: {data.get('departure_airport', '?')} → {data.get('arrival_airport', '?')}. "
                f"Gate: {data.get('gate', 'TBD')}. "
                f"Delay: {data.get('delay_minutes', 0)} minutes."
            )
        if monitor_type == MonitoringType.AIRPORT_CONDITIONS:
            security = data.get("security", {})
            congestion = data.get("congestion", {})
            return (
                f"Journey monitoring update: airport conditions for {data.get('airport_code', 'unknown')}. "
                f"Security wait: {security.get('average_wait_minutes', 'N/A')} minutes "
                f"(crowd: {security.get('current_crowd_level', 'N/A')}). "
                f"Congestion: {congestion.get('overall_level', 'N/A')}."
            )
        if monitor_type == MonitoringType.LOCATION:
            return (
                f"Journey monitoring update: user location. "
                f"City: {data.get('city', 'unknown')}, {data.get('country', 'unknown')}. "
                f"Coordinates: ({data.get('latitude', 0)}, {data.get('longitude', 0)})."
            )
        return f"Journey monitoring update: {monitor_type.value}. Data: {data}"

    async def _embed_to_messages(self, journey_id: str, update: ContextUpdate) -> None:
        """
        Embed monitoring data into ai_messages for vector search retrieval.

        Each monitoring update is stored as a message with role='monitoring',
        along with the raw structured data for exact retrieval.
        """
        if not self.state_manager:
            return

        try:
            import json as _json
            from server.embeddings import embed_text
            from server.mongo_db import get_collection

            # Get conversation_id from the journey
            journey = self.state_manager.get_journey(journey_id)
            conv_id = getattr(journey, "conversation_id", None) if journey else None
            if not conv_id:
                return

            # Build human-readable summary for the embedding
            summary = self._summarize_monitoring_data(update.monitoring_type, update.data)

            # Embed the summary text
            embedding = embed_text(summary, as_query=False)
            if not embedding:
                return

            # Store in ai_messages with structured monitoring_data for retrieval
            doc = {
                "conversation_id": conv_id,
                "journey_id": journey_id,
                "role": "monitoring",
                "content": summary,
                "monitoring_type": update.monitoring_type.value,
                "monitoring_data": update.data,
                "embedding": embedding,
                "created_at": datetime.now(timezone.utc),
            }
            get_collection("ai_messages").insert_one(doc)
            logger.debug(
                f"Embedded monitoring [{update.monitoring_type.value}] "
                f"for journey {journey_id} into ai_messages"
            )

        except ImportError:
            # Server modules not available (e.g., test environment)
            pass
        except Exception as e:
            logger.warning(f"Failed to embed monitoring to ai_messages: {e}")

    def get_latest_context(
        self,
        journey_id: str,
        monitor_type: Optional[MonitoringType] = None
    ) -> Optional[Dict[MonitoringType, ContextUpdate]]:
        """
        Get the latest context for a journey.
        """
        if journey_id not in self._latest_context:
            return None

        if monitor_type:
            update = self._latest_context[journey_id].get(monitor_type)
            return {monitor_type: update} if update else None

        return self._latest_context[journey_id]

    def is_monitoring(self, journey_id: str) -> bool:
        """Check if a journey is being monitored."""
        return journey_id in self._active_tasks

    def get_active_journeys(self) -> List[str]:
        """Get list of journeys being monitored."""
        return list(self._active_tasks.keys())

