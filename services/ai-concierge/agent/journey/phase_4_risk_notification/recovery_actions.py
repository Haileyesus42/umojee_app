"""
Phase 4: Recovery Action Generator

This module generates actionable recovery suggestions when risks are detected.
It provides clear, actionable steps users can take to mitigate journey risks.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import logging

logger = logging.getLogger(__name__)


class OneTapActionKind(str, Enum):
    """Kind of one-tap action (call, open link, etc.)."""
    CALL = "call"
    OPEN_LINK = "open_link"
    OPEN_APP = "open_app"
    SEND_MESSAGE = "send_message"


@dataclass
class OneTapAction:
    """A one-tap action (call airline, open rebook link, etc.). Segment- and journey-specific."""
    kind: OneTapActionKind
    label: str
    phone_number: Optional[str] = None
    url: Optional[str] = None
    deep_link: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RecoveryPlaybook:
    """
    Step-by-step playbook for a risk type, with optional one-tap actions.
    Segment- and journey-specific (e.g. missed connection at JFK for flight XY123).
    """
    playbook_id: str = ""
    risk_type: str = ""
    segment: str = ""
    title: str = ""
    steps: List[str] = field(default_factory=list)
    one_tap_actions: List[OneTapAction] = field(default_factory=list)
    journey_context: Dict[str, Any] = field(default_factory=dict)


class ActionUrgency(str, Enum):
    """Urgency level for recovery actions."""
    IMMEDIATE = "immediate"
    SOON = "soon"
    WHEN_CONVENIENT = "when_convenient"


class ActionType(str, Enum):
    """Types of recovery actions."""
    TRANSPORT = "transport"
    TIMING = "timing"
    ROUTE = "route"
    BOOKING = "booking"
    COMMUNICATION = "communication"
    ALTERNATIVE = "alternative"


@dataclass
class RecoveryAction:
    """A suggested recovery action."""
    action_id: str = ""
    action_type: ActionType = ActionType.TIMING
    urgency: ActionUrgency = ActionUrgency.SOON
    title: str = ""
    description: str = ""
    steps: List[str] = field(default_factory=list)
    estimated_time_minutes: int = 0
    estimated_cost: Optional[float] = None
    success_probability: float = 0.8
    requires_user_action: bool = True
    can_automate: bool = False
    one_tap_actions: List[OneTapAction] = field(default_factory=list)


class RecoveryActionGenerator:
    """
    Generates recovery actions for various risk scenarios.

    This generator creates actionable suggestions that are:
    - Clear and specific
    - Ranked by effectiveness
    - Appropriate for the urgency level
    - Achievable by the user
    """

    def __init__(self):
        """Initialize the recovery action generator."""
        self._action_counter = 0

    def generate_recovery_actions(
        self,
        risk_type: str,
        context: Dict[str, Any]
    ) -> List[RecoveryAction]:
        """
        Generate recovery actions for a risk type.

        Args:
            risk_type: Type of risk (departure, boarding, connection, etc.)
            context: Context information about the risk

        Returns:
            List of recommended recovery actions
        """
        generators = {
            "departure": self._generate_departure_actions,
            "boarding": self._generate_boarding_actions,
            "connection": self._generate_connection_actions,
            "traffic": self._generate_traffic_actions,
            "weather": self._generate_weather_actions,
            "flight_delay": self._generate_delay_actions,
        }

        generator = generators.get(risk_type, self._generate_generic_actions)
        actions = generator(context)
        # Enrich with one-tap actions from context when available
        journey_ctx = context.get("journey_context") or context
        for action in actions:
            action.one_tap_actions = self._one_tap_actions_for_action(
                action, risk_type, journey_ctx
            )
        return actions

    def get_playbook(
        self,
        risk_type: str,
        segment: str,
        journey_context: Dict[str, Any],
    ) -> RecoveryPlaybook:
        """
        Get a segment- and journey-specific recovery playbook with steps and one-tap actions.

        Args:
            risk_type: Type of risk (departure, boarding, connection, missed_connection, etc.)
            segment: Current journey segment (e.g. airport_to_flight, flight_to_hotel)
            journey_context: Journey-specific data (airline_phone, hotel_phone, rebook_url, etc.)

        Returns:
            RecoveryPlaybook with ordered steps and one-tap actions (call airline, open link, etc.)
        """
        playbook_id = f"playbook_{risk_type}_{segment}_{self._next_id()}"
        playbooks = {
            "missed_connection": RecoveryPlaybook(
                playbook_id=playbook_id,
                risk_type=risk_type,
                segment=segment,
                title="Missed connection – what to do",
                steps=[
                    "Go to the airline desk or rebooking counter at the airport.",
                    "Call the airline to secure a seat on the next available flight.",
                    "Use the airline app or rebooking link to confirm your new flight.",
                    "Notify your hotel (or pickup) about your delayed arrival.",
                ],
                one_tap_actions=[
                    OneTapAction(
                        kind=OneTapActionKind.CALL,
                        label="Call airline",
                        phone_number=journey_context.get("airline_phone") or journey_context.get("airline_contact"),
                        context={"reason": "rebook_connection"},
                    ),
                    OneTapAction(
                        kind=OneTapActionKind.OPEN_LINK,
                        label="Rebook / manage booking",
                        url=journey_context.get("rebook_url") or journey_context.get("airline_manage_booking_url"),
                        context={"reason": "rebook"},
                    ),
                    OneTapAction(
                        kind=OneTapActionKind.CALL,
                        label="Notify hotel",
                        phone_number=journey_context.get("hotel_phone") or journey_context.get("hotel_contact"),
                        context={"reason": "late_arrival"},
                    ),
                ],
                journey_context=journey_context,
            ),
            "flight_delay": RecoveryPlaybook(
                playbook_id=playbook_id,
                risk_type=risk_type,
                segment=segment,
                title="Flight delayed – next steps",
                steps=[
                    "Check the airline app for updated departure time and gate.",
                    "Notify your hotel or pickup about the new arrival time.",
                    "If delay is long, check rebooking or compensation options.",
                ],
                one_tap_actions=[
                    OneTapAction(
                        kind=OneTapActionKind.OPEN_LINK,
                        label="Check flight status",
                        url=journey_context.get("flight_status_url") or journey_context.get("airline_app_deeplink"),
                        context={},
                    ),
                    OneTapAction(
                        kind=OneTapActionKind.CALL,
                        label="Notify hotel",
                        phone_number=journey_context.get("hotel_phone") or journey_context.get("hotel_contact"),
                        context={"reason": "late_arrival"},
                    ),
                ],
                journey_context=journey_context,
            ),
            "flight_cancellation": RecoveryPlaybook(
                playbook_id=playbook_id,
                risk_type=risk_type,
                segment=segment,
                title="Flight cancelled – rebook and notify",
                steps=[
                    "Call the airline immediately to rebook on the next available flight.",
                    "Use the rebooking link in the app or email to self-serve if offered.",
                    "Notify your hotel and any pickup or activities about the change.",
                ],
                one_tap_actions=[
                    OneTapAction(
                        kind=OneTapActionKind.CALL,
                        label="Call airline to rebook",
                        phone_number=journey_context.get("airline_phone") or journey_context.get("airline_contact"),
                        context={"reason": "rebook_cancellation"},
                    ),
                    OneTapAction(
                        kind=OneTapActionKind.OPEN_LINK,
                        label="Rebook online",
                        url=journey_context.get("rebook_url") or journey_context.get("airline_manage_booking_url"),
                        context={},
                    ),
                    OneTapAction(
                        kind=OneTapActionKind.CALL,
                        label="Call hotel",
                        phone_number=journey_context.get("hotel_phone") or journey_context.get("hotel_contact"),
                        context={"reason": "cancellation_arrival_change"},
                    ),
                ],
                journey_context=journey_context,
            ),
            "departure": RecoveryPlaybook(
                playbook_id=playbook_id,
                risk_type=risk_type,
                segment=segment,
                title="Running late for departure",
                steps=[
                    "Leave now with your documents and bags.",
                    "Check traffic and use an alternative route if needed.",
                    "Call the airline or use the app to report you're on the way.",
                ],
                one_tap_actions=[
                    OneTapAction(
                        kind=OneTapActionKind.CALL,
                        label="Call airline",
                        phone_number=journey_context.get("airline_phone") or journey_context.get("airline_contact"),
                        context={"reason": "running_late"},
                    ),
                    OneTapAction(
                        kind=OneTapActionKind.OPEN_APP,
                        label="Open maps / navigation",
                        deep_link=journey_context.get("maps_deeplink") or "maps://",
                        context={"destination": "airport"},
                    ),
                ],
                journey_context=journey_context,
            ),
            "connection": RecoveryPlaybook(
                playbook_id=playbook_id,
                risk_type=risk_type,
                segment=segment,
                title="Tight connection",
                steps=[
                    "Sit near the front and be ready to deplane quickly.",
                    "Check the airport map for the fastest route to your next gate.",
                    "If needed, call the airline to discuss rebooking options.",
                ],
                one_tap_actions=[
                    OneTapAction(
                        kind=OneTapActionKind.CALL,
                        label="Call airline",
                        phone_number=journey_context.get("airline_phone") or journey_context.get("airline_contact"),
                        context={"reason": "tight_connection"},
                    ),
                    OneTapAction(
                        kind=OneTapActionKind.OPEN_LINK,
                        label="Rebook if needed",
                        url=journey_context.get("rebook_url") or journey_context.get("airline_manage_booking_url"),
                        context={},
                    ),
                ],
                journey_context=journey_context,
            ),
        }
        playbook = playbooks.get(
            risk_type,
            RecoveryPlaybook(
                playbook_id=playbook_id,
                risk_type=risk_type,
                segment=segment,
                title=f"Recovery steps for {risk_type.replace('_', ' ')}",
                steps=[],
                one_tap_actions=[],
                journey_context=journey_context,
            ),
        )
        # Filter out one-tap actions that have no phone/url (context not available)
        playbook.one_tap_actions = [
            a for a in playbook.one_tap_actions
            if a.phone_number or a.url or a.deep_link
        ]
        return playbook

    def _one_tap_actions_for_action(
        self,
        action: "RecoveryAction",
        risk_type: str,
        journey_context: Dict[str, Any],
    ) -> List[OneTapAction]:
        """Attach one-tap actions to a recovery action when context provides phone/url."""
        if risk_type == "departure" and action.action_type == ActionType.COMMUNICATION:
            phone = journey_context.get("airline_phone") or journey_context.get("airline_contact")
            if phone:
                return [OneTapAction(OneTapActionKind.CALL, "Call airline", phone_number=phone)]
        if risk_type == "flight_delay" and "rebook" in action.title.lower():
            url = journey_context.get("rebook_url") or journey_context.get("airline_manage_booking_url")
            if url:
                return [OneTapAction(OneTapActionKind.OPEN_LINK, "Rebook / manage booking", url=url)]
        if risk_type == "flight_delay" and "notify" in action.title.lower():
            phone = journey_context.get("hotel_phone") or journey_context.get("hotel_contact")
            if phone:
                return [OneTapAction(OneTapActionKind.CALL, "Notify hotel", phone_number=phone)]
        if risk_type in ("connection", "missed_connection"):
            phone = journey_context.get("airline_phone") or journey_context.get("airline_contact")
            url = journey_context.get("rebook_url") or journey_context.get("airline_manage_booking_url")
            actions = []
            if phone:
                actions.append(OneTapAction(OneTapActionKind.CALL, "Call airline", phone_number=phone))
            if url:
                actions.append(OneTapAction(OneTapActionKind.OPEN_LINK, "Rebook online", url=url))
            return actions
        return []

    def _generate_departure_actions(self, context: Dict[str, Any]) -> List[RecoveryAction]:
        """Generate actions for departure risks."""
        actions = []
        time_remaining = context.get("time_remaining_minutes", 60)
        traffic_delay = context.get("traffic_delay_minutes", 0)

        if time_remaining < 30:
            # Urgent - need to leave immediately
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.TIMING,
                urgency=ActionUrgency.IMMEDIATE,
                title="Leave immediately",
                description="You need to leave now to make your flight.",
                steps=[
                    "Gather your belongings and travel documents",
                    "Head to your transport immediately",
                    "Skip any non-essential stops"
                ],
                estimated_time_minutes=5,
                success_probability=0.9 if time_remaining > 15 else 0.6
            ))

        if traffic_delay > 15:
            # Traffic is an issue
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.ROUTE,
                urgency=ActionUrgency.IMMEDIATE,
                title="Use alternative route",
                description=f"Traffic is adding {traffic_delay} minutes. Consider an alternative.",
                steps=[
                    "Check Google Maps or Waze for alternative routes",
                    "Consider back roads to avoid highway congestion",
                    "Alert your driver if using a taxi/rideshare"
                ],
                estimated_time_minutes=0,
                success_probability=0.7
            ))

            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.TRANSPORT,
                urgency=ActionUrgency.SOON,
                title="Consider faster transport",
                description="A different transport mode might be faster.",
                steps=[
                    "Check if train/subway to airport is available",
                    "Consider helicopter transfer if budget allows",
                    "Pre-arrange meet & greet at airport"
                ],
                estimated_time_minutes=10,
                estimated_cost=50.0,
                success_probability=0.8
            ))

        # Always include communication action for tight timelines
        if time_remaining < 60:
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.COMMUNICATION,
                urgency=ActionUrgency.WHEN_CONVENIENT,
                title="Contact airline",
                description="Let the airline know you're running late.",
                steps=[
                    "Call airline customer service",
                    "Use airline app to update your status",
                    "Ask about late check-in options"
                ],
                estimated_time_minutes=5,
                success_probability=0.6,
                can_automate=True
            ))

        return actions

    def _generate_boarding_actions(self, context: Dict[str, Any]) -> List[RecoveryAction]:
        """Generate actions for boarding risks."""
        actions = []
        time_remaining = context.get("time_remaining_minutes", 30)
        is_checked_in = context.get("is_checked_in", True)
        security_wait = context.get("security_wait_minutes", 20)

        if not is_checked_in:
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.BOOKING,
                urgency=ActionUrgency.IMMEDIATE,
                title="Complete check-in now",
                description="You haven't checked in yet - do this immediately.",
                steps=[
                    "Open airline app on your phone",
                    "Complete mobile check-in",
                    "Download or screenshot boarding pass"
                ],
                estimated_time_minutes=3,
                success_probability=0.95,
                can_automate=True
            ))

        if security_wait > 20 and time_remaining < 45:
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.ALTERNATIVE,
                urgency=ActionUrgency.IMMEDIATE,
                title="Use expedited security",
                description="Security lines are long. Consider fast-track options.",
                steps=[
                    "Check if TSA PreCheck is available",
                    "Look for CLEAR lane if enrolled",
                    "Ask staff about family/assistance lane"
                ],
                estimated_time_minutes=5,
                estimated_cost=15.0,
                success_probability=0.85
            ))

        if time_remaining < 20:
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.COMMUNICATION,
                urgency=ActionUrgency.IMMEDIATE,
                title="Alert gate agent",
                description="Let the gate know you're on your way.",
                steps=[
                    "Call airline or use app to alert gate",
                    "Ask security for expedited processing",
                    "Run (safely) once through security"
                ],
                estimated_time_minutes=2,
                success_probability=0.7
            ))

        return actions

    def _generate_connection_actions(self, context: Dict[str, Any]) -> List[RecoveryAction]:
        """Generate actions for connection risks."""
        actions = []
        layover_minutes = context.get("layover_minutes", 60)
        terminal_change = context.get("terminal_change", False)

        if layover_minutes < 45:
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.BOOKING,
                urgency=ActionUrgency.SOON,
                title="Consider rebooking",
                description="Your connection is tight. A later flight might be safer.",
                steps=[
                    "Check airline app for next available flight",
                    "Call airline to discuss options",
                    "Compare cost of rebooking vs missing connection"
                ],
                estimated_time_minutes=15,
                success_probability=0.9
            ))

        actions.append(RecoveryAction(
            action_id=self._next_id(),
            action_type=ActionType.TIMING,
            urgency=ActionUrgency.SOON,
            title="Sit near front of plane",
            description="Position yourself for faster deplaning.",
            steps=[
                "Request seat change to front rows if possible",
                "Be ready to deplane quickly when doors open",
                "Have carry-on accessible for quick exit"
            ],
            estimated_time_minutes=0,
            success_probability=0.8
        ))

        if terminal_change:
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.ROUTE,
                urgency=ActionUrgency.WHEN_CONVENIENT,
                title="Plan terminal transfer",
                description="You'll need to change terminals.",
                steps=[
                    "Check airport map for fastest route",
                    "Look for inter-terminal train or shuttle",
                    "Ask flight attendant for directions"
                ],
                estimated_time_minutes=5,
                success_probability=0.9
            ))

        return actions

    def _generate_traffic_actions(self, context: Dict[str, Any]) -> List[RecoveryAction]:
        """Generate actions for traffic-related risks."""
        actions = []
        delay_minutes = context.get("delay_minutes", 0)

        if delay_minutes > 30:
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.ROUTE,
                urgency=ActionUrgency.IMMEDIATE,
                title="Take alternative route",
                description=f"Heavy traffic is adding {delay_minutes} minutes.",
                steps=[
                    "Check navigation app for alternative routes",
                    "Consider surface streets instead of highway",
                    "Share alternative route with your driver"
                ],
                estimated_time_minutes=0,
                success_probability=0.7
            ))

        if delay_minutes > 45:
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.TRANSPORT,
                urgency=ActionUrgency.IMMEDIATE,
                title="Switch transport mode",
                description="Consider switching to avoid traffic entirely.",
                steps=[
                    "Check train/metro schedules to airport",
                    "Look for motorcycle taxi services",
                    "Consider helicopter if critical"
                ],
                estimated_time_minutes=10,
                estimated_cost=30.0,
                success_probability=0.8
            ))

        return actions

    def _generate_weather_actions(self, context: Dict[str, Any]) -> List[RecoveryAction]:
        """Generate actions for weather-related risks."""
        actions = []
        condition = context.get("condition", "unknown")

        if condition in ["storm", "heavy_rain", "snow"]:
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.TIMING,
                urgency=ActionUrgency.SOON,
                title="Add extra buffer time",
                description=f"Weather conditions ({condition}) may slow travel.",
                steps=[
                    "Plan to leave 30-45 minutes earlier",
                    "Check road conditions before departing",
                    "Ensure windshield wipers and lights work"
                ],
                estimated_time_minutes=30,
                success_probability=0.85
            ))

            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.COMMUNICATION,
                urgency=ActionUrgency.WHEN_CONVENIENT,
                title="Monitor flight status",
                description="Weather may affect your flight.",
                steps=[
                    "Enable flight status notifications",
                    "Check airline app regularly",
                    "Have backup travel plans ready"
                ],
                estimated_time_minutes=5,
                success_probability=0.9,
                can_automate=True
            ))

        return actions

    def _generate_delay_actions(self, context: Dict[str, Any]) -> List[RecoveryAction]:
        """Generate actions for flight delay risks."""
        actions = []
        delay_minutes = context.get("delay_minutes", 0)

        if delay_minutes > 60:
            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.BOOKING,
                urgency=ActionUrgency.SOON,
                title="Check rebooking options",
                description=f"Your flight is delayed {delay_minutes} minutes.",
                steps=[
                    "Check if earlier flight has availability",
                    "Look at alternative airlines",
                    "Consider compensation eligibility"
                ],
                estimated_time_minutes=15,
                success_probability=0.7
            ))

            actions.append(RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.COMMUNICATION,
                urgency=ActionUrgency.WHEN_CONVENIENT,
                title="Notify hotel/pickup",
                description="Let your destination know about the delay.",
                steps=[
                    "Contact hotel about late arrival",
                    "Update airport pickup service",
                    "Adjust any dinner reservations"
                ],
                estimated_time_minutes=10,
                success_probability=0.95,
                can_automate=True
            ))

        return actions

    def _generate_generic_actions(self, context: Dict[str, Any]) -> List[RecoveryAction]:
        """Generate generic recovery actions."""
        return [
            RecoveryAction(
                action_id=self._next_id(),
                action_type=ActionType.COMMUNICATION,
                urgency=ActionUrgency.WHEN_CONVENIENT,
                title="Stay informed",
                description="Keep monitoring the situation.",
                steps=[
                    "Check your journey status regularly",
                    "Enable notifications for updates",
                    "Have backup plans ready"
                ],
                estimated_time_minutes=5,
                success_probability=0.9
            )
        ]

    def _next_id(self) -> str:
        """Generate next action ID."""
        self._action_counter += 1
        return f"action_{self._action_counter}"

    def prioritize_actions(
        self,
        actions: List[RecoveryAction]
    ) -> List[RecoveryAction]:
        """
        Prioritize recovery actions by urgency and effectiveness.

        Args:
            actions: List of actions to prioritize

        Returns:
            Sorted list with most important actions first
        """
        urgency_order = {
            ActionUrgency.IMMEDIATE: 0,
            ActionUrgency.SOON: 1,
            ActionUrgency.WHEN_CONVENIENT: 2
        }

        return sorted(
            actions,
            key=lambda a: (
                urgency_order.get(a.urgency, 2),
                -a.success_probability
            )
        )

    def filter_automatable(
        self,
        actions: List[RecoveryAction]
    ) -> List[RecoveryAction]:
        """Get only actions that can be automated."""
        return [a for a in actions if a.can_automate]

    async def execute_automated_action(
        self,
        action: RecoveryAction,
        journey_id: str
    ) -> bool:
        """
        Execute an automated recovery action.
        
        In a real scenario, this would call external service APIs.
        """
        if not action.can_automate:
            logger.warning(f"Action {action.action_id} ({action.title}) is not automatable.")
            return False

        logger.info(f"Executing automated action for journey {journey_id}: {action.title}")
        
        # Simulate API call latency
        await asyncio.sleep(1)
        
        # Action-specific logic (MOCKED)
        if action.action_type == ActionType.COMMUNICATION:
            logger.info(f"Notification sent to external party for journey {journey_id}.")
        elif action.action_type == ActionType.BOOKING:
            logger.info(f"Check-in/rebooking process initiated for journey {journey_id}.")
            
        return True

    async def _mock_api_call(self, endpoint: str, data: Dict[str, Any]) -> bool:
        """Mock external service API call."""
        logger.debug(f"API CALL -> {endpoint}: {data}")
        return True
