"""
Phase 4: Risk Calculation Engine

This module provides dynamic risk calculation for journey segments.
It assesses various risk factors and provides actionable recommendations.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from enum import Enum
import logging

# Phase 1 imports
from ..phase_1_foundation import Journey, JourneyContext, JourneySegment, RiskLevel as Phase1RiskLevel

logger = logging.getLogger(__name__)


class RiskLevel(str, Enum):
    """Risk level indicators."""
    ON_TRACK = "on_track"
    WATCH = "watch"
    ACTION_NEEDED = "action_needed"


class RiskCategory(str, Enum):
    """Categories of risk."""
    TIME = "time"
    TRAFFIC = "traffic"
    WEATHER = "weather"
    FLIGHT = "flight"
    CONNECTION = "connection"
    TRANSPORT = "transport"


@dataclass
class RiskFactor:
    """A single risk factor contributing to overall risk."""
    category: RiskCategory
    name: str
    severity: float  # 0-1, where 1 is highest severity
    description: str
    impact_minutes: int = 0
    mitigatable: bool = True


@dataclass
class RiskAssessment:
    """Complete risk assessment result."""
    overall_level: RiskLevel
    confidence: float  # 0-1
    factors: List[RiskFactor] = field(default_factory=list)
    recommended_actions: List[str] = field(default_factory=list)
    time_buffer_minutes: int = 0
    reassess_in_minutes: int = 15
    explanation: str = ""


class RiskEngine:
    """
    Calculates risk levels for various journey scenarios.

    This engine evaluates multiple factors and provides:
    - Overall risk level (On Track / Watch / Action Needed)
    - Contributing factors with severity
    - Recommended actions to mitigate risk
    - Explanation of the assessment
    """

    # Risk thresholds
    WATCH_THRESHOLD = 0.4
    ACTION_THRESHOLD = 0.7

    def __init__(self):
        """Initialize the risk engine."""
        self._factor_weights = {
            RiskCategory.TIME: 0.3,
            RiskCategory.TRAFFIC: 0.2,
            RiskCategory.WEATHER: 0.15,
            RiskCategory.FLIGHT: 0.25,
            RiskCategory.CONNECTION: 0.1,
        }

    def calculate_journey_risk(self, journey: Journey) -> RiskAssessment:
        """
        Calculate risk for the current state of a journey.
        
        This method chooses the appropriate risk calculation logic
        based on the journey's current segment and context.
        Integrates with real-time context data from Phase 2.
        """
        segment = journey.current_segment
        context = journey.context
        now = datetime.now(timezone.utc)

        if segment == JourneySegment.HOME_TO_AIRPORT:
            # Calculate departure risk with real-time data
            flight_time = context.flight_status.departure_time if context.flight_status else None
            if not flight_time:
                # Default for testing if not set
                flight_time = now + timedelta(hours=3)
            
            # Get real-time traffic data from context
            traffic_delay = 0
            if context.traffic:
                traffic_delay = getattr(context.traffic, 'delay_minutes', 0)
            
            # Get travel duration from context
            travel_duration = 45  # Default
            if context.traffic:
                travel_duration = getattr(context.traffic, 'duration_minutes', 45)
            
            # Get weather from context
            weather_condition = "clear"
            if context.weather:
                weather_condition = getattr(context.weather, 'condition', 'clear')
            
            return self.calculate_departure_risk(
                flight_time=flight_time,
                current_time=now,
                travel_duration_minutes=travel_duration,
                traffic_delay_minutes=traffic_delay,
                weather_condition=weather_condition,
                buffer_minutes=120
            )
            
        elif segment == JourneySegment.AIRPORT_TO_FLIGHT:
            # Calculate boarding risk with real-time data
            departure_time = context.flight_status.departure_time if context.flight_status else now + timedelta(hours=1)
            boarding_time = departure_time - timedelta(minutes=45)
            
            # Get security wait from airport context
            security_wait = 25  # Default
            if hasattr(context, 'airport_info') and context.airport_info:
                security_wait = getattr(context.airport_info, 'security_wait_minutes', 25)
            
            # Get gate distance from context
            gate_distance = 15  # Default
            if hasattr(context, 'airport_info') and context.airport_info:
                gate_distance = getattr(context.airport_info, 'distance_to_gate_minutes', 15)
            
            # Check if user is checked in
            is_checked_in = True  # Default
            if hasattr(context, 'booking_status') and context.booking_status:
                is_checked_in = getattr(context.booking_status, 'checked_in', True)
            
            return self.calculate_boarding_risk(
                boarding_time=boarding_time,
                current_time=now,
                security_wait_minutes=security_wait,
                distance_to_gate_minutes=gate_distance,
                is_checked_in=is_checked_in
            )
            
        # Default assessment for other segments
        return RiskAssessment(
            overall_level=RiskLevel.ON_TRACK,
            confidence=1.0,
            explanation="Journey is proceeding normally in segment: " + segment
        )

    def calculate_departure_risk(
        self,
        flight_time: datetime,
        current_time: datetime,
        travel_duration_minutes: int,
        traffic_delay_minutes: int = 0,
        weather_condition: str = "clear",
        buffer_minutes: int = 120
    ) -> RiskAssessment:
        """
        Calculate risk of missing departure.

        Args:
            flight_time: Scheduled flight departure time
            current_time: Current time
            travel_duration_minutes: Expected travel time to airport
            traffic_delay_minutes: Additional delay due to traffic
            weather_condition: Current weather conditions
            buffer_minutes: Planned buffer time at airport

        Returns:
            RiskAssessment with risk level and recommendations
        """
        factors = []

        # Calculate time-based risk
        time_until_flight = (flight_time - current_time).total_seconds() / 60
        required_time = travel_duration_minutes + traffic_delay_minutes + buffer_minutes

        time_remaining = time_until_flight - required_time

        # Time factor
        if time_remaining < 0:
            time_severity = 1.0
            factors.append(RiskFactor(
                category=RiskCategory.TIME,
                name="Insufficient time",
                severity=1.0,
                description=f"You need to leave immediately - {abs(int(time_remaining))} minutes behind schedule",
                impact_minutes=abs(int(time_remaining)),
                mitigatable=False
            ))
        elif time_remaining < 30:
            time_severity = 0.7
            factors.append(RiskFactor(
                category=RiskCategory.TIME,
                name="Tight timeline",
                severity=0.7,
                description=f"Only {int(time_remaining)} minutes buffer remaining",
                impact_minutes=0
            ))
        elif time_remaining < 60:
            time_severity = 0.4
            factors.append(RiskFactor(
                category=RiskCategory.TIME,
                name="Limited buffer",
                severity=0.4,
                description=f"{int(time_remaining)} minutes buffer - monitor closely",
                impact_minutes=0
            ))
        else:
            time_severity = 0.1
            factors.append(RiskFactor(
                category=RiskCategory.TIME,
                name="Comfortable buffer",
                severity=0.1,
                description=f"Good buffer of {int(time_remaining)} minutes",
                impact_minutes=0
            ))

        # Traffic factor
        if traffic_delay_minutes > 30:
            traffic_severity = 0.8
            factors.append(RiskFactor(
                category=RiskCategory.TRAFFIC,
                name="Heavy traffic",
                severity=0.8,
                description=f"Traffic adding {traffic_delay_minutes} minutes to journey",
                impact_minutes=traffic_delay_minutes
            ))
        elif traffic_delay_minutes > 15:
            traffic_severity = 0.5
            factors.append(RiskFactor(
                category=RiskCategory.TRAFFIC,
                name="Moderate traffic",
                severity=0.5,
                description=f"Traffic adding {traffic_delay_minutes} minutes",
                impact_minutes=traffic_delay_minutes
            ))
        else:
            traffic_severity = 0.1

        # Weather factor
        weather_severity = self._assess_weather_risk(weather_condition)
        if weather_severity > 0.3:
            factors.append(RiskFactor(
                category=RiskCategory.WEATHER,
                name=f"Weather: {weather_condition}",
                severity=weather_severity,
                description=f"Weather conditions may impact travel: {weather_condition}",
                impact_minutes=15 if weather_severity > 0.5 else 5
            ))

        # Calculate overall risk
        weighted_risk = (
            time_severity * self._factor_weights[RiskCategory.TIME] +
            traffic_severity * self._factor_weights[RiskCategory.TRAFFIC] +
            weather_severity * self._factor_weights[RiskCategory.WEATHER]
        )

        # Normalize to account for used weights
        used_weights = (
            self._factor_weights[RiskCategory.TIME] +
            self._factor_weights[RiskCategory.TRAFFIC] +
            self._factor_weights[RiskCategory.WEATHER]
        )
        weighted_risk = weighted_risk / used_weights

        # Determine risk level
        if weighted_risk >= self.ACTION_THRESHOLD:
            level = RiskLevel.ACTION_NEEDED
        elif weighted_risk >= self.WATCH_THRESHOLD:
            level = RiskLevel.WATCH
        else:
            level = RiskLevel.ON_TRACK

        # Generate recommendations
        recommendations = self._generate_departure_recommendations(level, factors)

        return RiskAssessment(
            overall_level=level,
            confidence=0.85,
            factors=factors,
            recommended_actions=recommendations,
            time_buffer_minutes=max(0, int(time_remaining)),
            reassess_in_minutes=15 if level == RiskLevel.ON_TRACK else 5,
            explanation=self._generate_explanation(level, factors)
        )

    def calculate_boarding_risk(
        self,
        boarding_time: datetime,
        current_time: datetime,
        security_wait_minutes: int,
        distance_to_gate_minutes: int,
        is_checked_in: bool = True
    ) -> RiskAssessment:
        """
        Calculate risk of missing boarding.

        Args:
            boarding_time: Flight boarding time
            current_time: Current time
            security_wait_minutes: Expected security wait
            distance_to_gate_minutes: Walking time to gate
            is_checked_in: Whether passenger has checked in

        Returns:
            RiskAssessment with risk level and recommendations
        """
        factors = []

        time_until_boarding = (boarding_time - current_time).total_seconds() / 60
        required_time = security_wait_minutes + distance_to_gate_minutes

        if not is_checked_in:
            required_time += 15  # Add time for check-in

        time_remaining = time_until_boarding - required_time

        # Time factor
        if time_remaining < 0:
            factors.append(RiskFactor(
                category=RiskCategory.TIME,
                name="Critical - may miss boarding",
                severity=1.0,
                description="Boarding has started or will start soon",
                impact_minutes=abs(int(time_remaining)),
                mitigatable=False
            ))
            level = RiskLevel.ACTION_NEEDED
        elif time_remaining < 15:
            factors.append(RiskFactor(
                category=RiskCategory.TIME,
                name="Tight timeline to gate",
                severity=0.7,
                description=f"Only {int(time_remaining)} minutes to spare",
                impact_minutes=0
            ))
            level = RiskLevel.WATCH
        else:
            factors.append(RiskFactor(
                category=RiskCategory.TIME,
                name="Good timing",
                severity=0.2,
                description=f"{int(time_remaining)} minutes buffer",
                impact_minutes=0
            ))
            level = RiskLevel.ON_TRACK

        # Check-in factor
        if not is_checked_in:
            factors.append(RiskFactor(
                category=RiskCategory.TIME,
                name="Not checked in",
                severity=0.5,
                description="You still need to complete check-in",
                impact_minutes=15
            ))
            if level == RiskLevel.ON_TRACK:
                level = RiskLevel.WATCH

        # Security factor
        if security_wait_minutes > 30:
            factors.append(RiskFactor(
                category=RiskCategory.TIME,
                name="Long security wait",
                severity=0.6,
                description=f"Security estimated at {security_wait_minutes} minutes",
                impact_minutes=security_wait_minutes
            ))

        recommendations = self._generate_boarding_recommendations(level, factors, is_checked_in)

        return RiskAssessment(
            overall_level=level,
            confidence=0.8,
            factors=factors,
            recommended_actions=recommendations,
            time_buffer_minutes=max(0, int(time_remaining)),
            reassess_in_minutes=5,
            explanation=self._generate_explanation(level, factors)
        )

    def calculate_connection_risk(
        self,
        arrival_time: datetime,
        next_departure_time: datetime,
        terminal_change: bool = False,
        immigration_required: bool = False
    ) -> RiskAssessment:
        """
        Calculate risk of missing a connection.

        Args:
            arrival_time: Arrival time of first flight
            next_departure_time: Departure time of connecting flight
            terminal_change: Whether terminal change is required
            immigration_required: Whether immigration is required

        Returns:
            RiskAssessment with risk level and recommendations
        """
        factors = []

        layover_minutes = (next_departure_time - arrival_time).total_seconds() / 60

        # Calculate minimum required time
        min_required = 30  # Base minimum
        if terminal_change:
            min_required += 20
        if immigration_required:
            min_required += 45

        buffer = layover_minutes - min_required

        if buffer < 0:
            factors.append(RiskFactor(
                category=RiskCategory.CONNECTION,
                name="Insufficient layover",
                severity=1.0,
                description=f"Layover too short by {abs(int(buffer))} minutes",
                impact_minutes=abs(int(buffer)),
                mitigatable=False
            ))
            level = RiskLevel.ACTION_NEEDED
        elif buffer < 30:
            factors.append(RiskFactor(
                category=RiskCategory.CONNECTION,
                name="Tight connection",
                severity=0.6,
                description=f"Only {int(buffer)} minutes buffer for connection",
                impact_minutes=0
            ))
            level = RiskLevel.WATCH
        else:
            factors.append(RiskFactor(
                category=RiskCategory.CONNECTION,
                name="Comfortable connection",
                severity=0.2,
                description=f"{int(buffer)} minutes buffer",
                impact_minutes=0
            ))
            level = RiskLevel.ON_TRACK

        if terminal_change:
            factors.append(RiskFactor(
                category=RiskCategory.CONNECTION,
                name="Terminal change required",
                severity=0.4,
                description="You'll need to change terminals",
                impact_minutes=20
            ))

        if immigration_required:
            factors.append(RiskFactor(
                category=RiskCategory.CONNECTION,
                name="Immigration required",
                severity=0.5,
                description="You'll need to clear immigration",
                impact_minutes=45
            ))

        recommendations = self._generate_connection_recommendations(level, factors)

        return RiskAssessment(
            overall_level=level,
            confidence=0.75,
            factors=factors,
            recommended_actions=recommendations,
            time_buffer_minutes=max(0, int(buffer)),
            reassess_in_minutes=10,
            explanation=self._generate_explanation(level, factors)
        )

    def _assess_weather_risk(self, condition: str) -> float:
        """Assess weather risk severity."""
        weather_risk = {
            "clear": 0.0,
            "sunny": 0.0,
            "cloudy": 0.1,
            "partly_cloudy": 0.1,
            "rain": 0.4,
            "heavy_rain": 0.7,
            "storm": 0.9,
            "snow": 0.6,
            "fog": 0.5,
        }
        return weather_risk.get(condition.lower(), 0.3)

    def _generate_departure_recommendations(
        self,
        level: RiskLevel,
        factors: List[RiskFactor]
    ) -> List[str]:
        """Generate recommendations for departure risk."""
        recommendations = []

        if level == RiskLevel.ACTION_NEEDED:
            recommendations.append("Leave for the airport immediately")
            recommendations.append("Consider faster transport option if available")

            for factor in factors:
                if factor.category == RiskCategory.TRAFFIC and factor.severity > 0.5:
                    recommendations.append("Check for alternative routes to avoid traffic")

        elif level == RiskLevel.WATCH:
            recommendations.append("Start preparing to leave soon")
            recommendations.append("Monitor traffic conditions closely")

            for factor in factors:
                if factor.category == RiskCategory.WEATHER and factor.severity > 0.4:
                    recommendations.append("Account for weather when traveling")

        else:
            recommendations.append("You're on track - continue as planned")
            recommendations.append("Set a reminder for when to leave")

        return recommendations

    def _generate_boarding_recommendations(
        self,
        level: RiskLevel,
        factors: List[RiskFactor],
        is_checked_in: bool
    ) -> List[str]:
        """Generate recommendations for boarding risk."""
        recommendations = []

        if not is_checked_in:
            recommendations.append("Complete check-in immediately")

        if level == RiskLevel.ACTION_NEEDED:
            recommendations.append("Head to your gate immediately")
            recommendations.append("Consider asking for expedited security")
        elif level == RiskLevel.WATCH:
            recommendations.append("Start making your way to security")
            recommendations.append("Have your boarding pass and ID ready")
        else:
            recommendations.append("You have time - no rush needed")

        return recommendations

    def _generate_connection_recommendations(
        self,
        level: RiskLevel,
        factors: List[RiskFactor]
    ) -> List[str]:
        """Generate recommendations for connection risk."""
        recommendations = []

        if level == RiskLevel.ACTION_NEEDED:
            recommendations.append("Contact airline about tight connection")
            recommendations.append("Consider rebooking to a later flight")
        elif level == RiskLevel.WATCH:
            recommendations.append("Sit near front of plane for faster deplaning")
            recommendations.append("Have connecting gate info ready")
        else:
            recommendations.append("Comfortable connection time - relax")

        return recommendations

    def _generate_explanation(
        self,
        level: RiskLevel,
        factors: List[RiskFactor]
    ) -> str:
        """Generate human-readable explanation of the risk assessment."""
        if level == RiskLevel.ON_TRACK:
            return "Everything looks good. You're on track to make it with time to spare."
        elif level == RiskLevel.WATCH:
            factor_names = [f.name for f in factors if f.severity > 0.3]
            return f"Keep an eye on the situation. Factors to watch: {', '.join(factor_names)}."
        else:
            critical_factors = [f.name for f in factors if f.severity > 0.6]
            return f"Action needed now. Critical issues: {', '.join(critical_factors)}."
