"""
Alternative Planner: Proactive backup plans and risk mitigation.

Features:
- Suggests backup flights when high delay risk detected
- Queues alternative hotels when primary is fully booked
- Provides contingency plans for disruptions
- Calculates risk scores and confidence levels
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class RiskLevel(str, Enum):
    """Risk levels for journey disruptions."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Alternative:
    """An alternative option with reasoning."""
    type: str  # "flight", "hotel", "car", "route"
    option: Dict[str, Any]
    reason: str
    risk_reduction: str
    cost_difference: Optional[float] = None
    time_difference: Optional[int] = None  # minutes


@dataclass
class BackupPlan:
    """A backup plan with alternatives."""
    primary_option: Dict[str, Any]
    alternatives: List[Alternative]
    risk_level: RiskLevel
    recommendation: str
    confidence_score: float  # 0-1


class AlternativePlanner:
    """
    Generates backup plans and alternative options for journey components.
    
    Use cases:
    - High delay risk → suggest earlier flights
    - Hotel fully booked → queue alternatives
    - Traffic congestion → suggest alternative routes
    - Weather disruption → suggest backup dates
    """
    
    def __init__(self):
        self.risk_thresholds = {
            "delay_probability": {
                "low": 0.2,
                "moderate": 0.4,
                "high": 0.6,
                "critical": 0.8,
            },
            "traffic_delay_minutes": {
                "low": 10,
                "moderate": 20,
                "high": 40,
                "critical": 60,
            },
        }
    
    def calculate_delay_risk(
        self,
        flight_data: Dict[str, Any],
        weather_data: Optional[Dict[str, Any]] = None,
        traffic_data: Optional[Dict[str, Any]] = None,
    ) -> tuple[RiskLevel, float]:
        """
        Calculate delay risk probability for a flight.
        
        Factors:
        - Historical airline performance
        - Weather conditions
        - Airport congestion
        - Time of day
        
        Returns:
            (risk_level, probability)
        """
        risk_score = 0.0
        
        # Weather factor (0-0.3)
        if weather_data:
            desc = (weather_data.get("description") or "").lower()
            if any(kw in desc for kw in ["storm", "thunder", "heavy rain", "snow"]):
                risk_score += 0.3
            elif any(kw in desc for kw in ["rain", "cloudy", "fog"]):
                risk_score += 0.15
        
        # Traffic factor (0-0.2)
        if traffic_data:
            delay = traffic_data.get("delay_minutes", 0)
            if delay > 30:
                risk_score += 0.2
            elif delay > 15:
                risk_score += 0.1
        
        # Time of day factor (0-0.2)
        departure_time = flight_data.get("departure_time")
        if departure_time:
            try:
                if isinstance(departure_time, str):
                    dt = datetime.fromisoformat(departure_time.replace("Z", "+00:00"))
                else:
                    dt = departure_time
                hour = dt.hour
                # Peak hours (6-9 AM, 5-8 PM) have higher delay risk
                if (6 <= hour <= 9) or (17 <= hour <= 20):
                    risk_score += 0.15
            except Exception:
                pass
        
        # Airline factor (0-0.3) - placeholder for ML model
        # TODO: Integrate ML model trained on historical delay data
        airline = flight_data.get("airline", "").upper()
        # Simplified heuristic (replace with actual data)
        if airline in ["SPIRIT", "FRONTIER"]:
            risk_score += 0.2
        elif airline in ["DELTA", "ALASKA"]:
            risk_score += 0.05
        else:
            risk_score += 0.1
        
        # Cap at 1.0
        risk_score = min(risk_score, 1.0)
        
        # Determine risk level
        if risk_score >= 0.6:
            level = RiskLevel.HIGH
        elif risk_score >= 0.4:
            level = RiskLevel.MODERATE
        elif risk_score >= 0.2:
            level = RiskLevel.LOW
        else:
            level = RiskLevel.LOW
        
        return level, risk_score
    
    def generate_flight_alternatives(
        self,
        primary_flight: Dict[str, Any],
        all_flights: List[Dict[str, Any]],
        risk_level: RiskLevel,
        risk_score: float,
    ) -> BackupPlan:
        """
        Generate backup flight options when primary has high delay risk.
        
        Returns:
            BackupPlan with alternatives and recommendation
        """
        alternatives = []
        
        # Filter for earlier flights (reduce risk)
        primary_dep = primary_flight.get("departure_time")
        if primary_dep:
            try:
                if isinstance(primary_dep, str):
                    primary_dt = datetime.fromisoformat(primary_dep.replace("Z", "+00:00"))
                else:
                    primary_dt = primary_dep
                
                for flight in all_flights:
                    if flight == primary_flight:
                        continue
                    
                    dep = flight.get("departure_time")
                    if not dep:
                        continue
                    
                    if isinstance(dep, str):
                        dep_dt = datetime.fromisoformat(dep.replace("Z", "+00:00"))
                    else:
                        dep_dt = dep
                    
                    # Earlier flights reduce delay risk
                    time_diff = (primary_dt - dep_dt).total_seconds() / 60
                    if 0 < time_diff <= 180:  # 1-3 hours earlier
                        price_diff = flight.get("price", 0) - primary_flight.get("price", 0)
                        alternatives.append(Alternative(
                            type="flight",
                            option=flight,
                            reason=f"Departs {int(time_diff)} minutes earlier",
                            risk_reduction="Reduces delay risk by avoiding peak congestion",
                            cost_difference=price_diff,
                            time_difference=int(time_diff),
                        ))
            except Exception as e:
                logger.debug(f"Failed to generate flight alternatives: {e}")
        
        # Sort by time difference (earliest first)
        alternatives.sort(key=lambda a: a.time_difference or 0, reverse=True)
        
        # Generate recommendation
        if risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
            recommendation = (
                f"Your selected flight has a {int(risk_score * 100)}% delay risk. "
                f"Consider booking an earlier flight to reduce this risk."
            )
        else:
            recommendation = f"Your flight has a {int(risk_score * 100)}% delay risk (acceptable)."
        
        return BackupPlan(
            primary_option=primary_flight,
            alternatives=alternatives[:3],  # Top 3
            risk_level=risk_level,
            recommendation=recommendation,
            confidence_score=1.0 - risk_score,
        )
    
    def generate_hotel_alternatives(
        self,
        primary_hotel: Dict[str, Any],
        all_hotels: List[Dict[str, Any]],
        reason: str = "Primary hotel fully booked",
    ) -> List[Alternative]:
        """
        Generate alternative hotels when primary is unavailable.
        
        Returns:
            List of Alternative hotels with reasoning
        """
        alternatives = []
        
        primary_price = primary_hotel.get("price", 0)
        primary_rating = primary_hotel.get("rating", 0)
        
        for hotel in all_hotels:
            if hotel == primary_hotel:
                continue
            
            price = hotel.get("price", 0)
            rating = hotel.get("rating", 0)
            
            # Calculate similarity score
            price_diff = abs(price - primary_price)
            rating_diff = abs(rating - primary_rating)
            
            # Prefer similar price and rating
            if price_diff <= primary_price * 0.3 and rating_diff <= 1.0:
                alternatives.append(Alternative(
                    type="hotel",
                    option=hotel,
                    reason=f"Similar quality and price (${price} vs ${primary_price})",
                    risk_reduction="Ensures accommodation availability",
                    cost_difference=price - primary_price,
                ))
        
        # Sort by similarity (price + rating)
        alternatives.sort(key=lambda a: abs(a.cost_difference or 0))
        
        return alternatives[:5]  # Top 5
    
    def should_suggest_alternatives(
        self,
        risk_level: RiskLevel,
        user_preferences: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Decide if we should proactively suggest alternatives.
        
        Args:
            risk_level: Current risk level
            user_preferences: User's risk tolerance settings
        
        Returns:
            True if alternatives should be suggested
        """
        # Default: suggest for HIGH and CRITICAL
        if risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
            return True
        
        # Check user preferences
        if user_preferences:
            risk_tolerance = user_preferences.get("risk_tolerance", "moderate")
            if risk_tolerance == "low" and risk_level == RiskLevel.MODERATE:
                return True
        
        return False


# Singleton instance
_planner = AlternativePlanner()


def calculate_flight_delay_risk(
    flight: Dict[str, Any],
    monitoring_data: Optional[Dict[str, Any]] = None,
) -> tuple[RiskLevel, float, Optional[BackupPlan]]:
    """
    Calculate delay risk for a flight and generate backup plan if needed.
    
    Usage:
        risk_level, probability, backup_plan = calculate_flight_delay_risk(
            flight=selected_flight,
            monitoring_data=journey_context.get("monitoring"),
        )
        
        if backup_plan and risk_level == RiskLevel.HIGH:
            notify_user(backup_plan.recommendation)
    """
    monitoring_data = monitoring_data or {}
    weather = monitoring_data.get("weather")
    traffic = monitoring_data.get("traffic")
    
    risk_level, risk_score = _planner.calculate_delay_risk(flight, weather, traffic)
    
    # Generate backup plan if high risk
    backup_plan = None
    if _planner.should_suggest_alternatives(risk_level):
        # Note: Need all_flights to generate alternatives
        # This would typically come from the search results
        backup_plan = None  # Placeholder - needs integration with search results
    
    return risk_level, risk_score, backup_plan


def generate_hotel_backup_options(
    primary_hotel: Dict[str, Any],
    all_hotels: List[Dict[str, Any]],
) -> List[Alternative]:
    """
    Generate backup hotel options.
    
    Usage:
        alternatives = generate_hotel_backup_options(
            primary_hotel=selected_hotel,
            all_hotels=search_results,
        )
        
        if alternatives:
            show_user("Primary hotel unavailable. Here are similar options:", alternatives)
    """
    return _planner.generate_hotel_alternatives(primary_hotel, all_hotels)
