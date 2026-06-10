"""
Journey Comparison: Compare multiple trip options side-by-side.

Features:
- Compare flights, hotels, full itineraries
- Side-by-side pros/cons
- Score-based ranking
- Visual comparison tables
"""

import logging
import uuid
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class ComparisonCriterion(str, Enum):
    """Criteria for comparing options."""
    PRICE = "price"
    DURATION = "duration"
    COMFORT = "comfort"
    CONVENIENCE = "convenience"
    FLEXIBILITY = "flexibility"
    OVERALL = "overall"


@dataclass
class ComparisonScore:
    """Score for a comparison criterion."""
    criterion: ComparisonCriterion
    score: float  # 0-10
    weight: float  # 0-1
    explanation: str


@dataclass
class ComparisonOption:
    """An option in a comparison."""
    option_id: str
    name: str
    data: Dict[str, Any]
    scores: List[ComparisonScore] = field(default_factory=list)
    pros: List[str] = field(default_factory=list)
    cons: List[str] = field(default_factory=list)
    overall_score: float = 0.0
    rank: int = 0


@dataclass
class JourneyComparison:
    """A comparison of multiple journey options."""
    comparison_id: str
    comparison_type: str  # "flights", "hotels", "full_itinerary"
    options: List[ComparisonOption]
    criteria: List[ComparisonCriterion]
    recommendation: Optional[str] = None
    user_priorities: Optional[Dict[str, float]] = None  # criterion -> weight


class JourneyComparer:
    """
    Compares multiple journey options and provides recommendations.
    
    Supports:
    - Flight comparison (price, duration, stops, airline)
    - Hotel comparison (price, rating, location, amenities)
    - Full itinerary comparison (total cost, total time, convenience)
    """
    
    # Default weights for criteria (if user doesn't specify)
    DEFAULT_WEIGHTS = {
        ComparisonCriterion.PRICE: 0.35,
        ComparisonCriterion.DURATION: 0.25,
        ComparisonCriterion.COMFORT: 0.20,
        ComparisonCriterion.CONVENIENCE: 0.15,
        ComparisonCriterion.FLEXIBILITY: 0.05,
    }
    
    def compare_flights(
        self,
        flights: List[Dict[str, Any]],
        user_priorities: Optional[Dict[str, float]] = None,
    ) -> JourneyComparison:
        """
        Compare multiple flight options.
        
        Args:
            flights: List of flight data dicts
            user_priorities: Optional user priority weights
        
        Returns:
            JourneyComparison with scored and ranked options
        """
        import uuid
        
        weights = user_priorities or self.DEFAULT_WEIGHTS
        options = []
        
        for i, flight in enumerate(flights):
            option = ComparisonOption(
                option_id=flight.get("id", f"flight_{i}"),
                name=f"Option {i + 1}: {flight.get('airline', 'Unknown')} {flight.get('flight_number', '')}",
                data=flight,
            )
            
            # Score each criterion
            scores = []
            
            # Price score (lower is better)
            price = flight.get("price", 999999)
            min_price = min(f.get("price", 999999) for f in flights)
            max_price = max(f.get("price", 0) for f in flights)
            price_range = max_price - min_price if max_price > min_price else 1
            price_score = 10 * (1 - (price - min_price) / price_range)
            scores.append(ComparisonScore(
                criterion=ComparisonCriterion.PRICE,
                score=price_score,
                weight=weights.get(ComparisonCriterion.PRICE, 0.35),
                explanation=f"${price} ({int(price_score)}/10)",
            ))
            
            # Duration score (shorter is better)
            duration = flight.get("duration_minutes", 999999)
            min_duration = min(f.get("duration_minutes", 999999) for f in flights)
            max_duration = max(f.get("duration_minutes", 0) for f in flights)
            duration_range = max_duration - min_duration if max_duration > min_duration else 1
            duration_score = 10 * (1 - (duration - min_duration) / duration_range)
            scores.append(ComparisonScore(
                criterion=ComparisonCriterion.DURATION,
                score=duration_score,
                weight=weights.get(ComparisonCriterion.DURATION, 0.25),
                explanation=f"{duration // 60}h {duration % 60}m ({int(duration_score)}/10)",
            ))
            
            # Convenience score (fewer stops is better)
            stops = flight.get("stops", 0)
            convenience_score = 10 if stops == 0 else (8 if stops == 1 else 5)
            scores.append(ComparisonScore(
                criterion=ComparisonCriterion.CONVENIENCE,
                score=convenience_score,
                weight=weights.get(ComparisonCriterion.CONVENIENCE, 0.15),
                explanation=f"{'Direct' if stops == 0 else f'{stops} stop(s)'} ({int(convenience_score)}/10)",
            ))
            
            # Comfort score (based on airline, class, aircraft)
            comfort_score = 7.0  # Default
            if flight.get("travel_class") == "business":
                comfort_score = 9.0
            elif flight.get("travel_class") == "first":
                comfort_score = 10.0
            scores.append(ComparisonScore(
                criterion=ComparisonCriterion.COMFORT,
                score=comfort_score,
                weight=weights.get(ComparisonCriterion.COMFORT, 0.20),
                explanation=f"{flight.get('travel_class', 'economy').title()} class ({int(comfort_score)}/10)",
            ))
            
            option.scores = scores
            
            # Calculate overall score
            option.overall_score = sum(s.score * s.weight for s in scores)
            
            # Generate pros/cons
            if price_score >= 8:
                option.pros.append("Great price")
            if duration_score >= 8:
                option.pros.append("Fast travel time")
            if stops == 0:
                option.pros.append("Direct flight")
            if comfort_score >= 8:
                option.pros.append("Premium comfort")
            
            if price_score < 5:
                option.cons.append("Expensive")
            if duration_score < 5:
                option.cons.append("Long travel time")
            if stops >= 2:
                option.cons.append("Multiple connections")
            
            options.append(option)
        
        # Rank options
        options.sort(key=lambda o: o.overall_score, reverse=True)
        for i, opt in enumerate(options):
            opt.rank = i + 1
        
        # Generate recommendation
        best = options[0]
        recommendation = (
            f"**Recommended: {best.name}** (Score: {best.overall_score:.1f}/10)\n"
            f"Best balance of {', '.join(best.pros[:2])}."
        )
        
        return JourneyComparison(
            comparison_id=str(uuid.uuid4()),
            comparison_type="flights",
            options=options,
            criteria=list(weights.keys()),
            recommendation=recommendation,
            user_priorities=user_priorities,
        )
    
    def compare_hotels(
        self,
        hotels: List[Dict[str, Any]],
        user_priorities: Optional[Dict[str, float]] = None,
    ) -> JourneyComparison:
        """Compare multiple hotel options."""
        import uuid
        
        weights = user_priorities or self.DEFAULT_WEIGHTS
        options = []
        
        for i, hotel in enumerate(hotels):
            option = ComparisonOption(
                option_id=hotel.get("id", f"hotel_{i}"),
                name=f"Option {i + 1}: {hotel.get('name', 'Unknown Hotel')}",
                data=hotel,
            )
            
            scores = []
            
            # Price score
            price = hotel.get("price", 999999)
            min_price = min(h.get("price", 999999) for h in hotels)
            max_price = max(h.get("price", 0) for h in hotels)
            price_range = max_price - min_price if max_price > min_price else 1
            price_score = 10 * (1 - (price - min_price) / price_range)
            scores.append(ComparisonScore(
                criterion=ComparisonCriterion.PRICE,
                score=price_score,
                weight=weights.get(ComparisonCriterion.PRICE, 0.35),
                explanation=f"${price}/night ({int(price_score)}/10)",
            ))
            
            # Comfort score (rating)
            rating = hotel.get("rating", 0)
            comfort_score = (rating / 5.0) * 10
            scores.append(ComparisonScore(
                criterion=ComparisonCriterion.COMFORT,
                score=comfort_score,
                weight=weights.get(ComparisonCriterion.COMFORT, 0.30),
                explanation=f"{rating:.1f}★ ({int(comfort_score)}/10)",
            ))
            
            # Convenience score (distance to center, amenities)
            distance = hotel.get("distance_to_center_km", 10)
            convenience_score = max(0, 10 - distance)  # Closer is better
            scores.append(ComparisonScore(
                criterion=ComparisonCriterion.CONVENIENCE,
                score=convenience_score,
                weight=weights.get(ComparisonCriterion.CONVENIENCE, 0.20),
                explanation=f"{distance:.1f}km to center ({int(convenience_score)}/10)",
            ))
            
            option.scores = scores
            option.overall_score = sum(s.score * s.weight for s in scores)
            
            # Pros/cons
            if price_score >= 8:
                option.pros.append("Excellent value")
            if rating >= 4.5:
                option.pros.append("Highly rated")
            if distance < 2:
                option.pros.append("Central location")
            
            if price_score < 5:
                option.cons.append("Pricey")
            if rating < 3.5:
                option.cons.append("Lower rating")
            if distance > 5:
                option.cons.append("Far from center")
            
            options.append(option)
        
        # Rank
        options.sort(key=lambda o: o.overall_score, reverse=True)
        for i, opt in enumerate(options):
            opt.rank = i + 1
        
        best = options[0]
        recommendation = (
            f"**Recommended: {best.name}** (Score: {best.overall_score:.1f}/10)\n"
            f"{', '.join(best.pros[:2])}."
        )
        
        return JourneyComparison(
            comparison_id=str(uuid.uuid4()),
            comparison_type="hotels",
            options=options,
            criteria=list(weights.keys()),
            recommendation=recommendation,
            user_priorities=user_priorities,
        )
    
    def format_comparison_table(self, comparison: JourneyComparison) -> str:
        """Format comparison as markdown table."""
        lines = [f"## {comparison.comparison_type.title()} Comparison\n"]
        
        # Header
        headers = ["Rank", "Option", "Score"]
        for criterion in comparison.criteria:
            # Handle both enum and string values
            crit_str = criterion.value if hasattr(criterion, 'value') else str(criterion)
            headers.append(crit_str.title())
        headers.extend(["Pros", "Cons"])
        
        lines.append("| " + " | ".join(headers) + " |")
        lines.append("|" + "|".join(["---"] * len(headers)) + "|")
        
        # Rows
        for opt in comparison.options:
            row = [
                f"#{opt.rank}",
                opt.name,
                f"{opt.overall_score:.1f}/10",
            ]
            
            for criterion in comparison.criteria:
                score_obj = next((s for s in opt.scores if s.criterion == criterion), None)
                if score_obj:
                    row.append(score_obj.explanation)
                else:
                    row.append("N/A")
            
            row.append("<br>".join(opt.pros[:2]))
            row.append("<br>".join(opt.cons[:2]))
            
            lines.append("| " + " | ".join(row) + " |")
        
        # Recommendation
        if comparison.recommendation:
            lines.append(f"\n{comparison.recommendation}")
        
        return "\n".join(lines)


# Singleton instance
_comparer = JourneyComparer()


def compare_options(
    option_type: str,
    options: List[Dict[str, Any]],
    user_priorities: Optional[Dict[str, float]] = None,
) -> JourneyComparison:
    """
    Compare multiple options and rank them.
    
    Usage:
        comparison = compare_options(
            option_type="flights",
            options=[flight1, flight2, flight3],
            user_priorities={"price": 0.5, "duration": 0.3, "comfort": 0.2},
        )
        
        print(comparison.recommendation)
        for opt in comparison.options:
            print(f"{opt.rank}. {opt.name}: {opt.overall_score}/10")
    """
    if option_type == "flights":
        return _comparer.compare_flights(options, user_priorities)
    elif option_type == "hotels":
        return _comparer.compare_hotels(options, user_priorities)
    else:
        raise ValueError(f"Unknown comparison type: {option_type}")


def format_comparison(comparison: JourneyComparison) -> str:
    """Format comparison as readable text."""
    return _comparer.format_comparison_table(comparison)
