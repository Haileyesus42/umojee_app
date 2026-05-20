"""
Phase 5: Journey Intelligence Layer

This module provides reasoning and confidence calculations for journey decisions.
It explains recommendations and provides comparison views.

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from enum import Enum
import logging

# Phase 1 imports
from ..phase_1_foundation import EnergyLevel, BudgetComfort

logger = logging.getLogger(__name__)


class ConfidenceLevel(str, Enum):
    """Confidence levels for matches and recommendations."""
    VERY_GOOD = "very_good"
    GOOD = "good"
    POSSIBLE = "possible"
    UNCERTAIN = "uncertain"


@dataclass
class ConfidenceIndicator:
    """A confidence indicator with explanation."""
    level: ConfidenceLevel
    score: float  # 0-1
    label: str
    explanation: str
    factors: List[str] = field(default_factory=list)


@dataclass
class DestinationMatch:
    """A destination match result with reasoning."""
    destination: str
    country: str
    confidence: ConfidenceIndicator
    match_reasons: List[str]
    concerns: List[str] = field(default_factory=list)
    best_for: List[str] = field(default_factory=list)


@dataclass
class ComparisonItem:
    """An item in a comparison view."""
    name: str
    values: Dict[str, Any]
    highlights: List[str]
    score: float


@dataclass
class ComparisonView:
    """Side-by-side comparison of options."""
    comparison_type: str  # destination, transport, hotel, etc.
    items: List[ComparisonItem]
    criteria: List[str]
    recommendation: Optional[str] = None
    recommendation_reason: Optional[str] = None


class JourneyIntelligence:
    """
    Provides reasoning and intelligence for journey decisions.

    This class handles:
    - Destination matching with explanations
    - Confidence indicators
    - Comparison views
    - Budget comfort framing
    - Time feasibility checks
    """

    def __init__(self):
        """Initialize the intelligence layer."""
        self._interest_keywords = {
            "beach": ["beach", "ocean", "sea", "coast", "surf", "swimming"],
            "culture": ["culture", "history", "museum", "art", "heritage", "tradition"],
            "adventure": ["adventure", "hiking", "trekking", "extreme", "outdoor"],
            "relaxation": ["relax", "spa", "peaceful", "quiet", "retreat"],
            "food": ["food", "cuisine", "culinary", "restaurant", "gastronomy"],
            "nightlife": ["nightlife", "party", "club", "bar", "entertainment"],
            "nature": ["nature", "wildlife", "safari", "jungle", "mountain"],
            "shopping": ["shopping", "market", "mall", "boutique"],
        }

    def explain_destination_match(
        self,
        destination: str,
        user_intent: Dict[str, Any]
    ) -> DestinationMatch:
        """
        Explain why a destination matches user intent.

        Args:
            destination: The destination being evaluated
            user_intent: Extracted user intent/preferences

        Returns:
            DestinationMatch with explanations
        """
        # This would typically use a destination database and LLM
        # For now, demonstrate the structure

        interests = user_intent.get("interests", [])
        budget_range = user_intent.get("budget_range", (0, 10000))
        duration = user_intent.get("duration_days", 7)

        # Mock destination data
        destination_data = self._get_destination_data(destination)

        match_reasons = []
        concerns = []

        # Check interest matches
        for interest in interests:
            if interest in destination_data.get("highlights", []):
                match_reasons.append(f"Great for {interest} lovers")

        # Check budget
        avg_daily_cost = destination_data.get("avg_daily_cost", 200)
        total_estimate = avg_daily_cost * duration

        if total_estimate <= budget_range[1] * 0.7:
            match_reasons.append("Comfortable within your budget")
        elif total_estimate <= budget_range[1]:
            match_reasons.append("Fits within your budget")
        else:
            concerns.append("May stretch your budget")

        # Check duration feasibility
        min_days = destination_data.get("min_recommended_days", 3)
        if duration >= min_days:
            match_reasons.append(f"Perfect for a {duration}-day trip")
        else:
            concerns.append(f"Ideally needs {min_days}+ days")

        # Calculate confidence
        confidence = self.calculate_confidence_indicator(
            match_factors=match_reasons,
            concern_factors=concerns
        )

        return DestinationMatch(
            destination=destination,
            country=destination_data.get("country", ""),
            confidence=confidence,
            match_reasons=match_reasons,
            concerns=concerns,
            best_for=destination_data.get("best_for", [])
        )

    def calculate_confidence_indicator(
        self,
        match_factors: List[str],
        concern_factors: Optional[List[str]] = None,
        user_preferences: Optional[Dict[str, Any]] = None,
        historical_satisfaction: Optional[float] = None,
        factor_weights: Optional[Dict[str, float]] = None
    ) -> ConfidenceIndicator:
        """
        Calculate a confidence indicator for a match with sophisticated scoring.

        Args:
            match_factors: Positive matching factors
            concern_factors: Negative or concerning factors
            user_preferences: User preferences for weighting factors
            historical_satisfaction: Past satisfaction score (0-1) to learn from
            factor_weights: Optional weights for different factor types

        Returns:
            ConfidenceIndicator with level and explanation
        """
        concerns = concern_factors or []
        weights = factor_weights or {}

        # Calculate weighted match score
        match_score = 0.0
        for factor in match_factors:
            # Determine factor importance based on keywords
            weight = 1.0
            
            # High-priority factors get higher weights
            if any(keyword in factor.lower() for keyword in ['perfect', 'excellent', 'ideal', 'great']):
                weight = 1.5
            elif any(keyword in factor.lower() for keyword in ['good', 'matches', 'suitable']):
                weight = 1.0
            elif any(keyword in factor.lower() for keyword in ['acceptable', 'okay', 'reasonable']):
                weight = 0.7
            
            # Apply user preference weighting if available
            if user_preferences:
                for pref_key, pref_weight in weights.items():
                    if pref_key.lower() in factor.lower():
                        weight *= pref_weight
            
            match_score += weight
        
        # Normalize match score (assume 4 good matches = 1.0)
        normalized_match = min(match_score / 4.0, 1.0)
        
        # Calculate concern penalty with severity weighting
        concern_penalty = 0.0
        for concern in concerns:
            # Major concerns get higher penalties
            if any(keyword in concern.lower() for keyword in ['over budget', 'too expensive', 'insufficient']):
                concern_penalty += 0.25
            elif any(keyword in concern.lower() for keyword in ['may', 'might', 'consider']):
                concern_penalty += 0.10
            else:
                concern_penalty += 0.15
        
        # Calculate base score
        score = normalized_match - concern_penalty
        score = max(0, min(1.0, score))
        
        # Incorporate historical satisfaction if available
        if historical_satisfaction is not None:
            # Weight current score 70%, historical 30%
            score = score * 0.7 + historical_satisfaction * 0.3
        
        # Apply confidence boost for strong matches
        if len(match_factors) >= 5 and len(concerns) == 0:
            score = min(score * 1.1, 1.0)  # 10% boost for excellent matches
        
        # Apply confidence reduction for many concerns
        if len(concerns) >= 3:
            score *= 0.9  # 10% reduction for multiple concerns

        # Determine level with adjusted thresholds
        if score >= 0.80:
            level = ConfidenceLevel.VERY_GOOD
            label = "Excellent Match"
            explanation = "This option strongly matches your preferences with minimal concerns"
        elif score >= 0.60:
            level = ConfidenceLevel.GOOD
            label = "Good Match"
            explanation = "This option matches most of your preferences"
        elif score >= 0.35:
            level = ConfidenceLevel.POSSIBLE
            label = "Possible Match"
            explanation = "This option has some appeal but may not be ideal"
        else:
            level = ConfidenceLevel.UNCERTAIN
            label = "Uncertain Match"
            explanation = "This option may not fully meet your needs"

        return ConfidenceIndicator(
            level=level,
            score=round(score, 3),
            label=label,
            explanation=explanation,
            factors=match_factors + [f"⚠️ {c}" for c in concerns]
        )

    def generate_comparison_view(
        self,
        options: List[Dict[str, Any]],
        comparison_type: str = "destination"
    ) -> ComparisonView:
        """
        Generate a side-by-side comparison of options.

        Args:
            options: List of options to compare
            comparison_type: Type of comparison

        Returns:
            ComparisonView for display
        """
        if comparison_type == "destination":
            return self._compare_destinations(options)
        elif comparison_type == "transport":
            return self._compare_transport(options)
        elif comparison_type == "hotel":
            return self._compare_hotels(options)
        else:
            return self._compare_generic(options, comparison_type)

    def _compare_destinations(self, options: List[Dict[str, Any]]) -> ComparisonView:
        """Compare destination options."""
        criteria = ["Budget", "Duration Match", "Activities", "Weather", "Overall"]
        items = []

        for opt in options:
            values = {
                "Budget": opt.get("budget_comfort", "N/A"),
                "Duration Match": opt.get("duration_fit", "N/A"),
                "Activities": opt.get("activities_count", 0),
                "Weather": opt.get("weather_match", "N/A"),
                "Overall": opt.get("overall_score", 0)
            }

            items.append(ComparisonItem(
                name=opt.get("destination", "Unknown"),
                values=values,
                highlights=opt.get("highlights", [])[:3],
                score=opt.get("overall_score", 0.5)
            ))

        # Sort by score
        items.sort(key=lambda x: x.score, reverse=True)

        recommendation = items[0].name if items else None
        reason = f"Best overall match based on your preferences" if items else None

        return ComparisonView(
            comparison_type="destination",
            items=items,
            criteria=criteria,
            recommendation=recommendation,
            recommendation_reason=reason
        )

    def _compare_transport(self, options: List[Dict[str, Any]]) -> ComparisonView:
        """Compare transport options."""
        criteria = ["Cost", "Duration", "Reliability", "Comfort"]
        items = []

        for opt in options:
            values = {
                "Cost": f"${opt.get('cost', 0):.2f}",
                "Duration": f"{opt.get('duration_minutes', 0)} min",
                "Reliability": f"{opt.get('reliability', 0) * 100:.0f}%",
                "Comfort": opt.get("comfort_level", "N/A")
            }

            items.append(ComparisonItem(
                name=opt.get("mode", "Unknown"),
                values=values,
                highlights=opt.get("benefits", []),
                score=opt.get("reliability", 0.5)
            ))

        # Sort by reliability (most important for travel)
        items.sort(key=lambda x: x.score, reverse=True)

        return ComparisonView(
            comparison_type="transport",
            items=items,
            criteria=criteria,
            recommendation=items[0].name if items else None,
            recommendation_reason="Most reliable option for your journey"
        )

    def _compare_hotels(self, options: List[Dict[str, Any]]) -> ComparisonView:
        """Compare hotel options."""
        criteria = ["Price/Night", "Location", "Rating", "Amenities"]
        items = []

        for opt in options:
            values = {
                "Price/Night": f"${opt.get('price_per_night', 0):.2f}",
                "Location": opt.get("location_score", "N/A"),
                "Rating": f"{opt.get('rating', 0)}/5",
                "Amenities": opt.get("amenity_count", 0)
            }

            items.append(ComparisonItem(
                name=opt.get("name", "Unknown"),
                values=values,
                highlights=opt.get("highlights", []),
                score=opt.get("rating", 0) / 5
            ))

        items.sort(key=lambda x: x.score, reverse=True)

        return ComparisonView(
            comparison_type="hotel",
            items=items,
            criteria=criteria,
            recommendation=items[0].name if items else None,
            recommendation_reason="Best rated option in your criteria"
        )

    def _compare_generic(self, options: List[Dict[str, Any]], comparison_type: str) -> ComparisonView:
        """Generic comparison handler."""
        items = [
            ComparisonItem(
                name=opt.get("name", "Unknown"),
                values=opt.get("values", {}),
                highlights=opt.get("highlights", []),
                score=opt.get("score", 0.5)
            )
            for opt in options
        ]
        items.sort(key=lambda x: x.score, reverse=True)

        return ComparisonView(
            comparison_type=comparison_type,
            items=items,
            criteria=list(items[0].values.keys()) if items else [],
            recommendation=items[0].name if items else None
        )

    def frame_budget_comfort(
        self,
        estimated_cost: float,
        user_budget: float
    ) -> Dict[str, Any]:
        """
        Frame budget in comfort terms using Phase 1 enums.
        """
        ratio = estimated_cost / user_budget if user_budget > 0 else 1.0

        if ratio <= 0.7:
            comfort = BudgetComfort.COMFORTABLE
            message = "Well within your budget with room for extras"
            emoji = "😊"
        elif ratio <= 1.0:
            comfort = BudgetComfort.STRETCH
            message = "Fits within your budget"
            emoji = "👍"
        else:
            comfort = BudgetComfort.PREMIUM
            message = "Premium option - may stretch your budget"
            emoji = "✨"

        return {
            "comfort": comfort,
            "message": message,
            "emoji": emoji,
            "estimated_cost": estimated_cost,
            "budget": user_budget,
            "percentage_of_budget": ratio * 100
        }

    def check_time_feasibility(
        self,
        travel_duration_hours: float,
        trip_length_days: int,
        activities_planned: int = 0
    ) -> Dict[str, Any]:
        """
        Check if trip timing is realistic.

        Args:
            travel_duration_hours: Total travel time (one way)
            trip_length_days: Number of days for trip
            activities_planned: Number of activities planned

        Returns:
            Feasibility assessment
        """
        # Calculate usable days (accounting for travel)
        travel_days = travel_duration_hours / 12  # Assume 12 hours is a travel day
        usable_days = trip_length_days - (travel_days * 2)  # Round trip

        # Assess feasibility
        if usable_days >= activities_planned * 0.5:  # Half day per activity minimum
            feasibility = "realistic"
            message = f"Good timing! You'll have {usable_days:.1f} full days at your destination."
            recommendation = None
        elif usable_days >= activities_planned * 0.3:
            feasibility = "rushed"
            message = f"Timing is tight with only {usable_days:.1f} days for activities."
            recommendation = "Consider extending your trip or reducing planned activities"
        else:
            feasibility = "unrealistic"
            message = f"Trip may feel too rushed with only {usable_days:.1f} usable days."
            recommendation = "We recommend either extending your trip or choosing a closer destination"

        return {
            "feasibility": feasibility,
            "message": message,
            "usable_days": usable_days,
            "travel_days": travel_days * 2,
            "recommendation": recommendation,
            "activities_per_day": activities_planned / usable_days if usable_days > 0 else 0
        }

    def _get_destination_data(self, destination: str) -> Dict[str, Any]:
        """Get mock destination data. In production, this would query a database."""
        destinations = {
            "Bali": {
                "country": "Indonesia",
                "highlights": ["beach", "culture", "food", "relaxation"],
                "avg_daily_cost": 150,
                "min_recommended_days": 5,
                "best_for": ["Beach lovers", "Culture seekers", "Foodies"]
            },
            "Barcelona": {
                "country": "Spain",
                "highlights": ["culture", "food", "beach", "nightlife"],
                "avg_daily_cost": 200,
                "min_recommended_days": 4,
                "best_for": ["Art enthusiasts", "Food lovers", "City explorers"]
            },
            "Tokyo": {
                "country": "Japan",
                "highlights": ["culture", "food", "shopping", "adventure"],
                "avg_daily_cost": 250,
                "min_recommended_days": 5,
                "best_for": ["Culture buffs", "Foodies", "Tech enthusiasts"]
            }
        }
        return destinations.get(destination, {
            "country": "Unknown",
            "highlights": [],
            "avg_daily_cost": 200,
            "min_recommended_days": 3,
            "best_for": []
        })
