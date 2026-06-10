"""
Phase 5: Adaptation Engine

This module handles disruption detection and automatic replanning.
It generates adapted plans when journey conditions change.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from typing import Dict, Any, List, Optional, Tuple, Callable
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import logging

# Phase 4 imports
from ..phase_4_risk_notification import NotificationPriority, NotificationType

logger = logging.getLogger(__name__)


class DisruptionMonitor:
    """Protocol for external disruption monitoring services."""
    
    async def check_flight_status(self, flight_number: str) -> Dict[str, Any]:
        """Check flight status from API."""
        raise NotImplementedError
    
    async def check_weather_forecast(self, location: str, date: datetime) -> Dict[str, Any]:
        """Check weather forecast."""
        raise NotImplementedError
    
    async def check_traffic_predictions(self, origin: str, destination: str, time: datetime) -> Dict[str, Any]:
        """Check traffic predictions."""
        raise NotImplementedError


class DisruptionType(str, Enum):
    """Types of journey disruptions."""
    FLIGHT_DELAY = "flight_delay"
    FLIGHT_CANCELLATION = "flight_cancellation"
    WEATHER = "weather"
    TRAFFIC = "traffic"
    HOTEL_ISSUE = "hotel_issue"
    HEALTH = "health"
    TRANSPORT_DELAY = "transport_delay"
    ACTIVITY_CLOSURE = "activity_closure"


class DisruptionSeverity(str, Enum):
    """Severity levels for disruptions."""
    MINOR = "minor"        # < 30 min impact
    MODERATE = "moderate"  # 30-120 min impact
    MAJOR = "major"        # > 2 hours impact
    CRITICAL = "critical"  # Journey at risk


@dataclass
class Disruption:
    """A detected journey disruption."""
    disruption_id: str = ""
    disruption_type: DisruptionType = DisruptionType.FLIGHT_DELAY
    severity: DisruptionSeverity = DisruptionSeverity.MINOR
    detected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    description: str = ""
    impact_minutes: int = 0
    affected_segments: List[str] = field(default_factory=list)
    source: str = ""  # API, user report, etc.
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ImpactAssessment:
    """Assessment of disruption impact."""
    affected_events: List[str]
    cascade_effects: List[str]
    total_delay_minutes: int
    connections_at_risk: List[str]
    recovery_possible: bool
    automatic_recovery: bool
    requires_user_decision: bool
    financial_impact: Optional[float] = None
    impact_chain: List[str] = field(default_factory=list)  # Narrative chain e.g. ["Flight delay", "Later arrival", "Hotel check-in after 6", "Dinner at 7 at risk"]


class OneTapActionKind(str, Enum):
    """Kind of one-tap action from an adapted plan."""
    REBOOK_FLIGHT = "rebook_flight"
    CALL_AIRLINE = "call_airline"
    CALL_HOTEL = "call_hotel"
    OPEN_LINK = "open_link"
    OPEN_APP = "open_app"


@dataclass
class OneTapAction:
    """One-tap action from an adapted plan (rebook, call hotel, etc.)."""
    kind: OneTapActionKind
    label: str
    phone_number: Optional[str] = None
    url: Optional[str] = None
    deep_link: Optional[str] = None
    adjustment_id: Optional[str] = None  # Link to PlanAdjustment for partial accept


@dataclass
class PlanAdjustment:
    """A single adjustment to the plan."""
    adjustment_type: str  # reschedule, cancel, replace, add, notify
    target_event: str
    description: str
    new_time: Optional[datetime] = None
    new_value: Optional[Any] = None
    requires_booking: bool = False
    estimated_cost: float = 0
    adjustment_id: str = field(default_factory=lambda: str(__import__('uuid').uuid4()))
    one_tap_actions: List[OneTapAction] = field(default_factory=list)


@dataclass
class AdaptedPlan:
    """An adapted plan after disruption."""
    original_disruption: Disruption
    impact: ImpactAssessment
    adjustments: List[PlanAdjustment]
    summary: str
    confidence: float
    requires_approval: bool
    plan_id: str = field(default_factory=lambda: str(__import__('uuid').uuid4()))
    alternatives: List['AdaptedPlan'] = field(default_factory=list)
    total_cost: float = 0.0
    time_impact_minutes: int = 0
    ranking_score: float = 0.0  # For comparing alternatives
    accepted_adjustment_ids: List[str] = field(default_factory=list)  # User accepted these
    rejected_adjustment_ids: List[str] = field(default_factory=list)  # User declined these


class AdaptationEngine:
    """
    Handles disruption detection and journey adaptation.

    This engine:
    - Detects disruptions from context updates
    - Assesses impact on the journey
    - Generates adapted plans with multiple alternatives
    - Determines what requires user approval
    - Proactively monitors for potential disruptions
    """

    # Thresholds for automatic vs. user-approved adaptations
    AUTO_ADAPT_THRESHOLD_MINUTES = 30
    FINANCIAL_THRESHOLD = 100  # USD

    def __init__(self, disruption_monitor: Optional[DisruptionMonitor] = None):
        """Initialize the adaptation engine.
        
        Args:
            disruption_monitor: Optional monitor for proactive disruption detection
        """
        self._disruption_counter = 0
        self._monitor = disruption_monitor
        self._monitoring_tasks: Dict[str, asyncio.Task] = {}
        self._disruption_callbacks: List[Callable] = []

    def detect_disruption(
        self,
        context_update: Dict[str, Any],
        current_journey: Dict[str, Any]
    ) -> Optional[Disruption]:
        """
        Detect a disruption from a context update.

        Args:
            context_update: New context data
            current_journey: Current journey state

        Returns:
            Disruption if detected, None otherwise
        """
        disruption = None

        # Check for flight delay
        if "flight_status" in context_update:
            flight_data = context_update["flight_status"]
            delay = flight_data.get("delay_minutes", 0)

            if delay > 0:
                self._disruption_counter += 1
                severity = self._calculate_severity(delay)

                disruption = Disruption(
                    disruption_id=f"disr_{self._disruption_counter}",
                    disruption_type=DisruptionType.FLIGHT_DELAY,
                    severity=severity,
                    description=f"Flight delayed by {delay} minutes",
                    impact_minutes=delay,
                    affected_segments=["flight_to_hotel", "hotel_to_activities"],
                    source="flight_api",
                    raw_data=flight_data
                )

            if flight_data.get("status") == "cancelled":
                self._disruption_counter += 1
                disruption = Disruption(
                    disruption_id=f"disr_{self._disruption_counter}",
                    disruption_type=DisruptionType.FLIGHT_CANCELLATION,
                    severity=DisruptionSeverity.CRITICAL,
                    description="Flight has been cancelled",
                    impact_minutes=1440,  # Full day impact
                    affected_segments=["airport_to_flight", "flight_to_hotel"],
                    source="flight_api",
                    raw_data=flight_data
                )

        # Check for weather disruption
        if "weather" in context_update:
            weather = context_update["weather"]
            condition = weather.get("condition", "").lower()

            if condition in ["storm", "hurricane", "blizzard"]:
                self._disruption_counter += 1
                disruption = Disruption(
                    disruption_id=f"disr_{self._disruption_counter}",
                    disruption_type=DisruptionType.WEATHER,
                    severity=DisruptionSeverity.MAJOR,
                    description=f"Severe weather: {condition}",
                    impact_minutes=180,
                    affected_segments=["inspiration", "home_to_airport", "hotel_to_activities"],
                    source="weather_api",
                    raw_data=weather
                )

        # Check for traffic disruption
        if "traffic" in context_update:
            traffic = context_update["traffic"]
            delay = traffic.get("delay_minutes", 0)

            if delay > 30:
                self._disruption_counter += 1
                disruption = Disruption(
                    disruption_id=f"disr_{self._disruption_counter}",
                    disruption_type=DisruptionType.TRAFFIC,
                    severity=self._calculate_severity(delay),
                    description=f"Traffic delay of {delay} minutes",
                    impact_minutes=delay,
                    affected_segments=["home_to_airport"],
                    source="traffic_api",
                    raw_data=traffic
                )

        if disruption:
            logger.info(f"Detected disruption: {disruption.disruption_type.value} - {disruption.description}")

        return disruption

    def calculate_impact(
        self,
        disruption: Disruption,
        journey_timeline: List[Dict[str, Any]]
    ) -> ImpactAssessment:
        """
        Calculate the impact of a disruption on the journey.

        Args:
            disruption: The detected disruption
            journey_timeline: Current journey timeline

        Returns:
            ImpactAssessment with detailed impact analysis
        """
        affected_events = []
        cascade_effects = []
        connections_at_risk = []

        # Find affected events and build narrative impact chain
        event_id_to_name: Dict[str, str] = {}
        event_id_to_time: Dict[str, Any] = {}
        for event in journey_timeline:
            eid = event.get("event_id", "")
            event_id_to_name[eid] = event.get("name", eid or "event")
            t = event.get("scheduled_time")
            event_id_to_time[eid] = t

        for event in journey_timeline:
            segment = event.get("segment", "")
            if segment in disruption.affected_segments:
                affected_events.append(event.get("event_id", ""))

                # Check for cascade effects
                if event.get("has_connection"):
                    connections_at_risk.append(event.get("connection_to", ""))
                    cascade_effects.append(f"May affect connection to {event.get('connection_to')}")

        # Build narrative impact chain: "Flight delay → later arrival → hotel check-in after 6 → dinner at 7 at risk"
        impact_chain = self._build_impact_chain(
            disruption,
            journey_timeline,
            affected_events,
            event_id_to_name,
            event_id_to_time,
        )

        # Determine recovery options
        recovery_possible = disruption.severity != DisruptionSeverity.CRITICAL
        automatic_recovery = (
            disruption.impact_minutes <= self.AUTO_ADAPT_THRESHOLD_MINUTES and
            len(connections_at_risk) == 0
        )
        requires_user_decision = not automatic_recovery or len(connections_at_risk) > 0

        return ImpactAssessment(
            affected_events=affected_events,
            cascade_effects=cascade_effects,
            total_delay_minutes=disruption.impact_minutes,
            connections_at_risk=connections_at_risk,
            recovery_possible=recovery_possible,
            automatic_recovery=automatic_recovery,
            requires_user_decision=requires_user_decision,
            impact_chain=impact_chain,
        )

    def _build_impact_chain(
        self,
        disruption: Disruption,
        journey_timeline: List[Dict[str, Any]],
        affected_events: List[str],
        event_id_to_name: Dict[str, str],
        event_id_to_time: Dict[str, Any],
    ) -> List[str]:
        """Build a narrative impact chain for the disruption (e.g. Flight delay → later arrival → hotel check-in after 6 → dinner at 7 at risk)."""
        chain: List[str] = []
        # First link: the disruption
        chain.append(disruption.description)
        if not affected_events:
            return chain
        # Order events by position in timeline to show cascade
        order: Dict[str, int] = {}
        for i, ev in enumerate(journey_timeline):
            eid = ev.get("event_id", "")
            if eid:
                order[eid] = i
        sorted_affected = sorted(
            (eid for eid in affected_events if eid in order),
            key=lambda eid: order[eid],
        )
        delay_min = disruption.impact_minutes
        for eid in sorted_affected:
            name = event_id_to_name.get(eid, eid)
            t = event_id_to_time.get(eid)
            if t and hasattr(t, "hour"):
                # Format time if datetime-like
                try:
                    time_str = t.strftime("%b %d, %H:%M") if hasattr(t, "strftime") else str(t)
                except Exception:
                    time_str = str(t)
                chain.append(f"{name} now at risk (after {time_str})")
            else:
                chain.append(f"{name} at risk")
        return chain

    def generate_adapted_plan(
        self,
        disruption: Disruption,
        current_plan: Dict[str, Any],
        generate_alternatives: bool = True,
        journey_context: Optional[Dict[str, Any]] = None,
    ) -> AdaptedPlan:
        """
        Generate an adapted plan for a disruption with multiple alternatives.

        Args:
            disruption: The disruption to adapt for
            current_plan: Current journey plan
            generate_alternatives: Whether to generate alternative plans
            journey_context: Optional context for one-tap actions (airline_phone, hotel_phone, rebook_url, etc.)

        Returns:
            AdaptedPlan with adjustments and alternatives
        """
        impact = self.calculate_impact(disruption, current_plan.get("events", []))
        ctx = journey_context or current_plan.get("journey_context") or {}
        
        # Generate primary plan
        primary_plan = self._generate_single_plan(disruption, current_plan, impact, strategy="balanced", journey_context=ctx)
        
        # Generate alternatives if requested
        if generate_alternatives:
            alternatives = []
            
            # Cost-optimized alternative
            cost_plan = self._generate_single_plan(disruption, current_plan, impact, strategy="cost", journey_context=ctx)
            if cost_plan and cost_plan.plan_id != primary_plan.plan_id:
                alternatives.append(cost_plan)
            
            # Time-optimized alternative
            time_plan = self._generate_single_plan(disruption, current_plan, impact, strategy="time", journey_context=ctx)
            if time_plan and time_plan.plan_id != primary_plan.plan_id:
                alternatives.append(time_plan)
            
            # Convenience-optimized alternative
            convenience_plan = self._generate_single_plan(disruption, current_plan, impact, strategy="convenience", journey_context=ctx)
            if convenience_plan and convenience_plan.plan_id != primary_plan.plan_id:
                alternatives.append(convenience_plan)
            
            primary_plan.alternatives = alternatives
            logger.info(f"Generated {len(alternatives)} alternative plans for disruption")
        
        return primary_plan
    
    def _generate_single_plan(
        self,
        disruption: Disruption,
        current_plan: Dict[str, Any],
        impact: ImpactAssessment,
        strategy: str = "balanced",
        journey_context: Optional[Dict[str, Any]] = None,
    ) -> AdaptedPlan:
        """
        Generate a single adapted plan with a specific strategy.
        
        Args:
            disruption: The disruption
            current_plan: Current plan
            impact: Impact assessment
            strategy: Optimization strategy ("cost", "time", "convenience", "balanced")
            journey_context: Optional context for one-tap actions (airline_phone, hotel_phone, rebook_url)
            
        Returns:
            AdaptedPlan optimized for the strategy
        """
        adjustments = []
        ctx = journey_context or {}

        # Generate adjustments based on disruption type and strategy
        if disruption.disruption_type == DisruptionType.FLIGHT_DELAY:
            adjustments = self._adapt_for_flight_delay(disruption, current_plan, strategy, ctx)

        elif disruption.disruption_type == DisruptionType.FLIGHT_CANCELLATION:
            adjustments = self._adapt_for_cancellation(disruption, current_plan, strategy, ctx)

        elif disruption.disruption_type == DisruptionType.TRAFFIC:
            adjustments = self._adapt_for_traffic(disruption, current_plan, strategy, ctx)

        elif disruption.disruption_type == DisruptionType.WEATHER:
            adjustments = self._adapt_for_weather(disruption, current_plan, strategy, ctx)

        # Calculate totals
        total_cost = sum(a.estimated_cost for a in adjustments)
        time_impact = disruption.impact_minutes
        
        # Generate summary
        summary = self._generate_adaptation_summary(disruption, adjustments, strategy)

        # Determine if approval needed
        requires_approval = (
            impact.requires_user_decision or
            any(a.requires_booking for a in adjustments) or
            total_cost > self.FINANCIAL_THRESHOLD
        )

        confidence = 0.9 if not requires_approval else 0.7
        
        # Calculate ranking score for this plan
        # Lower is better (combines cost, time, and complexity)
        ranking_score = self._calculate_ranking_score(
            total_cost, 
            time_impact, 
            len(adjustments),
            strategy
        )

        return AdaptedPlan(
            original_disruption=disruption,
            impact=impact,
            adjustments=adjustments,
            summary=summary,
            confidence=confidence,
            requires_approval=requires_approval,
            total_cost=total_cost,
            time_impact_minutes=time_impact,
            ranking_score=ranking_score
        )
    
    def _calculate_ranking_score(
        self,
        cost: float,
        time_minutes: int,
        num_adjustments: int,
        strategy: str
    ) -> float:
        """
        Calculate ranking score for comparing plan alternatives.
        Lower score is better.
        
        Args:
            cost: Total cost
            time_minutes: Time impact
            num_adjustments: Number of adjustments needed
            strategy: Optimization strategy
            
        Returns:
            Ranking score
        """
        # Normalize factors
        cost_factor = cost / 100.0  # Normalize to $100
        time_factor = time_minutes / 60.0  # Normalize to 1 hour
        complexity_factor = num_adjustments / 5.0  # Normalize to 5 adjustments
        
        # Weight based on strategy
        if strategy == "cost":
            return cost_factor * 3.0 + time_factor * 1.0 + complexity_factor * 1.0
        elif strategy == "time":
            return cost_factor * 1.0 + time_factor * 3.0 + complexity_factor * 1.0
        elif strategy == "convenience":
            return cost_factor * 1.0 + time_factor * 1.0 + complexity_factor * 3.0
        else:  # balanced
            return cost_factor * 1.5 + time_factor * 1.5 + complexity_factor * 1.0

    def _adapt_for_flight_delay(
        self,
        disruption: Disruption,
        current_plan: Dict[str, Any],
        strategy: str = "balanced",
        journey_context: Optional[Dict[str, Any]] = None,
    ) -> List[PlanAdjustment]:
        """Generate adjustments for flight delay."""
        adjustments = []
        ctx = journey_context or {}
        delay = timedelta(minutes=disruption.impact_minutes)

        # Adjust arrival time
        adjustments.append(PlanAdjustment(
            adjustment_type="reschedule",
            target_event="arrival",
            description=f"Arrival delayed by {disruption.impact_minutes} minutes",
            requires_booking=False,
        ))

        # Notify hotel of late arrival (with one-tap Call hotel)
        hotel_phone = ctx.get("hotel_phone") or ctx.get("hotel_contact")
        notify_adjustment = PlanAdjustment(
            adjustment_type="notify",
            target_event="hotel_checkin",
            description="Notify hotel of delayed arrival",
            requires_booking=False,
            one_tap_actions=[
                OneTapAction(OneTapActionKind.CALL_HOTEL, "Call hotel", phone_number=hotel_phone, adjustment_id=""),
            ] if hotel_phone else [],
        )
        if notify_adjustment.one_tap_actions:
            notify_adjustment.one_tap_actions[0].adjustment_id = notify_adjustment.adjustment_id
        adjustments.append(notify_adjustment)

        # Adjust evening activities if needed
        if disruption.impact_minutes > 60:
            adjustments.append(PlanAdjustment(
                adjustment_type="reschedule",
                target_event="evening_activity",
                description="Consider rescheduling evening activities",
                requires_booking=True,
            ))

        return adjustments

    def _adapt_for_cancellation(
        self,
        disruption: Disruption,
        current_plan: Dict[str, Any],
        strategy: str = "balanced",
        journey_context: Optional[Dict[str, Any]] = None,
    ) -> List[PlanAdjustment]:
        """Generate adjustments for flight cancellation."""
        adjustments = []
        ctx = journey_context or {}

        # Need to rebook flight (one-tap: Rebook flight / Call airline)
        airline_phone = ctx.get("airline_phone") or ctx.get("airline_contact")
        rebook_url = ctx.get("rebook_url") or ctx.get("airline_manage_booking_url")
        rebook_actions = []
        if airline_phone:
            rebook_actions.append(OneTapAction(OneTapActionKind.CALL_AIRLINE, "Call airline to rebook", phone_number=airline_phone, adjustment_id=""))
        if rebook_url:
            rebook_actions.append(OneTapAction(OneTapActionKind.REBOOK_FLIGHT, "Rebook online", url=rebook_url, adjustment_id=""))
        rebook_adj = PlanAdjustment(
            adjustment_type="replace",
            target_event="flight",
            description="Rebook on alternative flight",
            requires_booking=True,
            estimated_cost=0,
            one_tap_actions=rebook_actions,
        )
        for a in rebook_adj.one_tap_actions:
            a.adjustment_id = rebook_adj.adjustment_id
        adjustments.append(rebook_adj)

        # May need to adjust hotel (one-tap: Call hotel)
        hotel_phone = ctx.get("hotel_phone") or ctx.get("hotel_contact")
        hotel_adj = PlanAdjustment(
            adjustment_type="reschedule",
            target_event="hotel_checkin",
            description="Adjust hotel reservation dates if needed",
            requires_booking=True,
            one_tap_actions=[OneTapAction(OneTapActionKind.CALL_HOTEL, "Call hotel", phone_number=hotel_phone, adjustment_id="")] if hotel_phone else [],
        )
        if hotel_adj.one_tap_actions:
            hotel_adj.one_tap_actions[0].adjustment_id = hotel_adj.adjustment_id
        adjustments.append(hotel_adj)

        # Cancel first day activities
        adjustments.append(PlanAdjustment(
            adjustment_type="cancel",
            target_event="day1_activities",
            description="Cancel or reschedule first day activities",
            requires_booking=True,
        ))

        return adjustments

    def _adapt_for_traffic(
        self,
        disruption: Disruption,
        current_plan: Dict[str, Any],
        strategy: str = "balanced",
        journey_context: Optional[Dict[str, Any]] = None,
    ) -> List[PlanAdjustment]:
        """Generate adjustments for traffic delay."""
        adjustments = []
        ctx = journey_context or {}
        maps_link = ctx.get("maps_deeplink") or ctx.get("maps_url")

        # Suggest leaving earlier
        adjustments.append(PlanAdjustment(
            adjustment_type="reschedule",
            target_event="departure",
            description=f"Leave {disruption.impact_minutes} minutes earlier to account for traffic",
            requires_booking=False,
        ))

        # Alternative route suggestion (one-tap: Open maps)
        route_adj = PlanAdjustment(
            adjustment_type="add",
            target_event="route",
            description="Consider alternative route to avoid traffic",
            new_value={"route_type": "alternative"},
            requires_booking=False,
            one_tap_actions=[
                OneTapAction(OneTapActionKind.OPEN_APP, "Open maps", deep_link=maps_link or "maps://", adjustment_id=""),
            ],
        )
        route_adj.one_tap_actions[0].adjustment_id = route_adj.adjustment_id
        adjustments.append(route_adj)

        return adjustments

    def _adapt_for_weather(
        self,
        disruption: Disruption,
        current_plan: Dict[str, Any],
        strategy: str = "balanced",
        journey_context: Optional[Dict[str, Any]] = None,
    ) -> List[PlanAdjustment]:
        """Generate adjustments for weather disruption."""
        adjustments = []

        # Suggest indoor alternatives
        adjustments.append(PlanAdjustment(
            adjustment_type="replace",
            target_event="outdoor_activities",
            description="Switch to indoor activities during bad weather",
            requires_booking=True,
        ))

        # Add buffer time for travel
        adjustments.append(PlanAdjustment(
            adjustment_type="reschedule",
            target_event="travel",
            description="Add extra buffer time for weather-impacted travel",
            requires_booking=False,
        ))

        return adjustments

    def _generate_adaptation_summary(
        self,
        disruption: Disruption,
        adjustments: List[PlanAdjustment],
        strategy: str = "balanced"
    ) -> str:
        """Generate a human-readable summary of adaptations."""
        strategy_labels = {
            "cost": "Cost-Optimized Plan",
            "time": "Time-Optimized Plan",
            "convenience": "Convenience-Optimized Plan",
            "balanced": "Recommended Plan"
        }
        
        summary_parts = [
            f"**{strategy_labels.get(strategy, 'Plan')}**\n",
            f"Due to {disruption.description.lower()}, here's what we recommend:\n"
        ]

        for i, adj in enumerate(adjustments, 1):
            summary_parts.append(f"{i}. {adj.description}")

        if any(a.requires_booking for a in adjustments):
            summary_parts.append("\nSome changes require rebooking. Would you like me to proceed?")
        else:
            summary_parts.append("\nThese adjustments can be made automatically.")

        return "\n".join(summary_parts)

    def _calculate_severity(self, delay_minutes: int) -> DisruptionSeverity:
        """Calculate severity based on delay duration."""
        if delay_minutes < 30:
            return DisruptionSeverity.MINOR
        elif delay_minutes < 120:
            return DisruptionSeverity.MODERATE
        elif delay_minutes < 480:  # 8 hours
            return DisruptionSeverity.MAJOR
        else:
            return DisruptionSeverity.CRITICAL

    def apply_partial_plan(
        self,
        adapted_plan: AdaptedPlan,
        accepted_adjustment_ids: List[str],
        rejected_adjustment_ids: Optional[List[str]] = None,
    ) -> Tuple[List[PlanAdjustment], List[PlanAdjustment]]:
        """
        Apply only the user-accepted adjustments; return accepted list and suggested (declined) list.

        Args:
            adapted_plan: The adapted plan
            accepted_adjustment_ids: Adjustment IDs the user accepted
            rejected_adjustment_ids: Adjustment IDs the user explicitly declined (optional)

        Returns:
            (adjustments_to_apply, adjustments_remaining_suggested)
        """
        rejected = set(rejected_adjustment_ids or [])
        accepted = set(accepted_adjustment_ids)
        to_apply = [a for a in adapted_plan.adjustments if a.adjustment_id in accepted]
        suggested = [a for a in adapted_plan.adjustments if a.adjustment_id not in accepted and a.adjustment_id not in rejected]
        adapted_plan.accepted_adjustment_ids = list(accepted)
        adapted_plan.rejected_adjustment_ids = list(rejected)
        return to_apply, suggested

    def requires_user_approval(self, adapted_plan: AdaptedPlan) -> bool:
        """
        Determine if an adapted plan requires user approval.

        Args:
            adapted_plan: The adapted plan to check

        Returns:
            True if user approval is required
        """
        return adapted_plan.requires_approval

    def auto_execute_minor_adaptations(
        self,
        adapted_plan: AdaptedPlan
    ) -> List[PlanAdjustment]:
        """
        Execute adaptations that don't require user approval.
        """
        executed = []

        for adjustment in adapted_plan.adjustments:
            if not adjustment.requires_booking and adjustment.estimated_cost == 0:
                # Can execute automatically
                executed.append(adjustment)
                logger.info(f"Auto-executed adaptation: {adjustment.description}")

        return executed

    def auto_resolve_disruption(self, disruption: Disruption) -> Tuple[bool, str]:
        """
        Determine if a disruption can and should be resolved automatically.
        """
        if disruption.severity == DisruptionSeverity.MINOR:
            return True, "Minor disruption - auto-resolving with timeline update"
        
        return False, f"User decision needed for {disruption.severity.value} disruption"
    
    async def start_proactive_monitoring(
        self, 
        journey_id: str,
        journey_data: Dict[str, Any],
        callback: Optional[Callable] = None
    ) -> None:
        """
        Start proactive monitoring for potential disruptions.
        
        Args:
            journey_id: Journey to monitor
            journey_data: Journey information (flight numbers, locations, dates)
            callback: Optional callback to notify when disruption detected
        """
        if not self._monitor:
            logger.warning("No disruption monitor configured")
            return
        
        if callback:
            self._disruption_callbacks.append(callback)
        
        # Create monitoring task
        task = asyncio.create_task(
            self._monitoring_loop(journey_id, journey_data)
        )
        self._monitoring_tasks[journey_id] = task
        logger.info(f"Started proactive monitoring for journey {journey_id}")
    
    async def stop_proactive_monitoring(self, journey_id: str) -> None:
        """Stop monitoring for a journey."""
        if journey_id in self._monitoring_tasks:
            task = self._monitoring_tasks[journey_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del self._monitoring_tasks[journey_id]
            logger.info(f"Stopped proactive monitoring for journey {journey_id}")
    
    async def _monitoring_loop(
        self,
        journey_id: str,
        journey_data: Dict[str, Any]
    ) -> None:
        """
        Main monitoring loop for proactive disruption detection.
        
        Continuously polls external APIs for potential disruptions.
        """
        check_interval_minutes = 15  # Check every 15 minutes
        
        while True:
            try:
                disruptions = []
                
                # Check flight status if applicable
                if 'flight_number' in journey_data:
                    try:
                        flight_status = await self._monitor.check_flight_status(
                            journey_data['flight_number']
                        )
                        if flight_status.get('delay_minutes', 0) > 0 or flight_status.get('status') == 'cancelled':
                            disruption = self.detect_disruption(
                                {'flight_status': flight_status},
                                journey_data
                            )
                            if disruption:
                                disruptions.append(disruption)
                    except Exception as e:
                        logger.error(f"Error checking flight status: {e}")
                
                # Check weather forecast
                if 'departure_location' in journey_data and 'departure_date' in journey_data:
                    try:
                        weather = await self._monitor.check_weather_forecast(
                            journey_data['departure_location'],
                            journey_data['departure_date']
                        )
                        if weather.get('condition') in ['storm', 'hurricane', 'blizzard']:
                            disruption = self.detect_disruption(
                                {'weather': weather},
                                journey_data
                            )
                            if disruption:
                                disruptions.append(disruption)
                    except Exception as e:
                        logger.error(f"Error checking weather: {e}")
                
                # Check traffic predictions
                if 'origin' in journey_data and 'destination' in journey_data and 'departure_time' in journey_data:
                    try:
                        traffic = await self._monitor.check_traffic_predictions(
                            journey_data['origin'],
                            journey_data['destination'],
                            journey_data['departure_time']
                        )
                        if traffic.get('delay_minutes', 0) > 30:
                            disruption = self.detect_disruption(
                                {'traffic': traffic},
                                journey_data
                            )
                            if disruption:
                                disruptions.append(disruption)
                    except Exception as e:
                        logger.error(f"Error checking traffic: {e}")
                
                # Notify callbacks of detected disruptions
                for disruption in disruptions:
                    logger.info(f"Proactively detected disruption for {journey_id}: {disruption.description}")
                    for callback in self._disruption_callbacks:
                        try:
                            await callback(journey_id, disruption)
                        except Exception as e:
                            logger.error(f"Error in disruption callback: {e}")
                
            except Exception as e:
                logger.error(f"Error in monitoring loop for {journey_id}: {e}")
            
            # Wait before next check
            await asyncio.sleep(check_interval_minutes * 60)
