"""
Proactive Intelligence: Predictive suggestions, smart reminders, and opportunity detection.

Features:
- Predictive Suggestions: Analyze timeline and suggest next actions
- Smart Reminders: Context-aware reminders beyond time triggers
- Opportunity Detection: Find cost savings or upgrades
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class SuggestionType(str, Enum):
    """Types of proactive suggestions."""
    PREDICTIVE = "predictive"
    REMINDER = "reminder"
    OPPORTUNITY = "opportunity"


class SuggestionPriority(str, Enum):
    """Priority levels for suggestions."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


@dataclass
class ProactiveSuggestion:
    """A proactive suggestion for the user."""
    suggestion_id: str
    type: SuggestionType
    priority: SuggestionPriority
    title: str
    message: str
    action_label: Optional[str] = None
    action_data: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None
    context: Optional[Dict[str, Any]] = None


class ProactiveIntelligence:
    """
    Analyzes journey state and proactively suggests actions, reminders, and opportunities.
    
    Runs periodically in background to generate timely suggestions.
    """
    
    def __init__(self):
        self.suggestion_cache: Dict[str, List[ProactiveSuggestion]] = {}
    
    def _ensure_aware(self, dt: Optional[datetime]) -> Optional[datetime]:
        """Ensure a datetime is timezone-aware (assume UTC if naive)."""
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    
    def analyze_journey(self, journey: Any) -> List[ProactiveSuggestion]:
        """
        Analyze a journey and generate proactive suggestions.
        
        Args:
            journey: Journey object with timeline, context, and current segment
        
        Returns:
            List of proactive suggestions
        """
        suggestions = []
        
        # 1. Predictive suggestions based on timeline
        suggestions.extend(self._generate_predictive_suggestions(journey))
        
        # 2. Smart reminders based on context
        suggestions.extend(self._generate_smart_reminders(journey))
        
        # 3. Opportunity detection
        suggestions.extend(self._generate_opportunities(journey))
        
        # Cache suggestions for this journey
        self.suggestion_cache[journey.journey_id] = suggestions
        
        return suggestions
    
    def _generate_predictive_suggestions(self, journey: Any) -> List[ProactiveSuggestion]:
        """Generate predictive suggestions based on timeline analysis."""
        suggestions = []
        now = datetime.now(timezone.utc)
        timeline = journey.timeline
        context = journey.context
        
        if not timeline:
            return suggestions
        
        # Suggestion: Restaurant recommendations before boarding
        flight_departure = self._ensure_aware(getattr(timeline, "flight_departure", None))
        if flight_departure:
            time_until_boarding = (flight_departure - now).total_seconds() / 60
            
            if 60 <= time_until_boarding <= 180:  # 1-3 hours before
                suggestions.append(ProactiveSuggestion(
                    suggestion_id=f"{journey.journey_id}_restaurant",
                    type=SuggestionType.PREDICTIVE,
                    priority=SuggestionPriority.MEDIUM,
                    title="Time for a meal",
                    message=f"You have {int(time_until_boarding / 60)} hours before boarding. Would you like restaurant recommendations near your gate?",
                    action_label="Show restaurants",
                    action_data={"action": "search_restaurants", "location": "airport_gate"},
                    expires_at=flight_departure - timedelta(minutes=30),
                ))
        
        # Suggestion: Hotel check-in preparation
        hotel_checkin = self._ensure_aware(getattr(timeline, "hotel_check_in", None))
        if hotel_checkin:
            time_until_checkin = (hotel_checkin - now).total_seconds() / 60
            
            if 15 <= time_until_checkin <= 45:  # 15-45 min before check-in
                suggestions.append(ProactiveSuggestion(
                    suggestion_id=f"{journey.journey_id}_hotel_pickup",
                    type=SuggestionType.PREDICTIVE,
                    priority=SuggestionPriority.HIGH,
                    title="Hotel check-in soon",
                    message=f"Your hotel check-in is in {int(time_until_checkin)} minutes. Should I arrange airport pickup?",
                    action_label="Arrange pickup",
                    action_data={"action": "book_transfer", "from": "airport", "to": "hotel"},
                    expires_at=hotel_checkin,
                ))
        
        # Suggestion: Activities during free time
        return_flight = self._ensure_aware(getattr(timeline, "return_flight_departure", None))
        if hotel_checkin and return_flight:
            # Check if user has activities planned
            has_activities = getattr(context, "activities", None) and len(context.activities) > 0
            
            if not has_activities:
                time_at_destination = (return_flight - hotel_checkin).total_seconds() / 3600
                
                if time_at_destination > 24:  # More than 1 day
                    # Use planned_destination instead of destination_city
                    dest_city = getattr(context, "planned_destination", "your destination")
                    suggestions.append(ProactiveSuggestion(
                        suggestion_id=f"{journey.journey_id}_activities",
                        type=SuggestionType.PREDICTIVE,
                        priority=SuggestionPriority.MEDIUM,
                        title="Plan your activities",
                        message=f"You have {int(time_at_destination / 24)} days at {dest_city}. Want me to suggest popular attractions?",
                        action_label="Show attractions",
                        action_data={"action": "search_activities", "city": dest_city},
                    ))
        
        # Suggestion: Return preparation
        if return_flight:
            time_until_return = (return_flight - now).total_seconds() / 3600
            
            if 12 <= time_until_return <= 24:  # 12-24 hours before return
                suggestions.append(ProactiveSuggestion(
                    suggestion_id=f"{journey.journey_id}_return_prep",
                    type=SuggestionType.PREDICTIVE,
                    priority=SuggestionPriority.MEDIUM,
                    title="Prepare for return",
                    message="Your return flight is tomorrow. Need help with hotel checkout or airport transfer?",
                    action_label="Plan return",
                    action_data={"action": "plan_return_journey"},
                ))
        
        return suggestions
    
    def _generate_smart_reminders(self, journey: Any) -> List[ProactiveSuggestion]:
        """Generate context-aware smart reminders."""
        suggestions = []
        now = datetime.now(timezone.utc)
        timeline = journey.timeline
        context = journey.context
        
        if not timeline:
            return suggestions
        
        # Reminder: Packing list
        flight_departure = self._ensure_aware(getattr(timeline, "flight_departure", None))
        if flight_departure:
            time_until_flight = (flight_departure - now).total_seconds() / 3600
            
            if 24 <= time_until_flight <= 72:  # 1-3 days before
                has_packing_list = getattr(context, "packing_list", None) and len(context.packing_list) > 0
                
                if not has_packing_list:
                    suggestions.append(ProactiveSuggestion(
                        suggestion_id=f"{journey.journey_id}_packing",
                        type=SuggestionType.REMINDER,
                        priority=SuggestionPriority.HIGH,
                        title="Don't forget to pack",
                        message="You haven't created a packing list yet. Want help packing for your trip?",
                        action_label="Create packing list",
                        action_data={"action": "create_packing_list", "duration_days": context.duration_days},
                        expires_at=flight_departure - timedelta(hours=6),
                    ))
        
        # Reminder: Weather-based packing
        monitoring = getattr(context, "monitoring", {}) or {}
        weather = monitoring.get("weather")
        
        if weather and flight_departure:
            time_until_flight = (flight_departure - now).total_seconds() / 3600
            
            if 12 <= time_until_flight <= 48:  # 12-48 hours before
                conditions = weather.get("conditions", "").lower()
                
                if "rain" in conditions or "storm" in conditions:
                    suggestions.append(ProactiveSuggestion(
                        suggestion_id=f"{journey.journey_id}_weather_pack",
                        type=SuggestionType.REMINDER,
                        priority=SuggestionPriority.MEDIUM,
                        title="Weather update",
                        message=f"Weather changed: {weather.get('conditions')} expected at destination. Pack an umbrella?",
                        action_label="View weather",
                        action_data={"action": "show_weather_details"},
                    ))
                
                elif "cold" in conditions or weather.get("temp_celsius", 20) < 10:
                    suggestions.append(ProactiveSuggestion(
                        suggestion_id=f"{journey.journey_id}_cold_weather",
                        type=SuggestionType.REMINDER,
                        priority=SuggestionPriority.MEDIUM,
                        title="Cold weather alert",
                        message=f"Temperature at destination: {weather.get('temp_celsius')}°C. Pack warm clothes?",
                        action_label="View weather",
                        action_data={"action": "show_weather_details"},
                    ))
        
        # Reminder: Check-in reminder
        if flight_departure:
            time_until_flight = (flight_departure - now).total_seconds() / 3600
            
            if 23 <= time_until_flight <= 25:  # 24 hours before (±1 hour window)
                suggestions.append(ProactiveSuggestion(
                    suggestion_id=f"{journey.journey_id}_checkin",
                    type=SuggestionType.REMINDER,
                    priority=SuggestionPriority.HIGH,
                    title="Online check-in available",
                    message="Your flight check-in opens now. Check in early to get better seat selection!",
                    action_label="Check in",
                    action_data={"action": "flight_checkin"},
                ))
        
        # Reminder: Passport/visa check
        if flight_departure:
            time_until_flight = (flight_departure - now).total_seconds() / 3600
            
            if 48 <= time_until_flight <= 96:  # 2-4 days before
                # Use planned_destination for country check if destination_country is missing
                dest_country = getattr(context, "destination_country", None) or getattr(context, "planned_destination", "your destination")
                
                if dest_country:
                    suggestions.append(ProactiveSuggestion(
                        suggestion_id=f"{journey.journey_id}_documents",
                        type=SuggestionType.REMINDER,
                        priority=SuggestionPriority.HIGH,
                        title="Check travel documents",
                        message=f"Traveling to {dest_country}. Have you checked passport validity and visa requirements?",
                        action_label="Check requirements",
                        action_data={"action": "check_visa_requirements", "country": dest_country},
                    ))
        
        return suggestions
    
    def _generate_opportunities(self, journey: Any) -> List[ProactiveSuggestion]:
        """Detect opportunities for cost savings or upgrades."""
        suggestions = []
        context = journey.context
        
        # Opportunity: Price drop detection
        # In real implementation, this would check flight price APIs
        # For now, we'll check if we have price tracking data
        price_history = getattr(context, "price_history", None)
        
        if price_history and len(price_history) > 1:
            original_price = price_history[0].get("price", 0)
            current_price = price_history[-1].get("price", 0)
            
            if current_price < original_price * 0.9:  # 10% drop
                savings = original_price - current_price
                suggestions.append(ProactiveSuggestion(
                    suggestion_id=f"{journey.journey_id}_price_drop",
                    type=SuggestionType.OPPORTUNITY,
                    priority=SuggestionPriority.HIGH,
                    title="Price drop alert!",
                    message=f"Your flight price dropped by ${int(savings)} since booking. Want to rebook?",
                    action_label="Rebook now",
                    action_data={"action": "rebook_flight", "savings": savings},
                ))
        
        # Opportunity: Upgrade availability
        # Check if user has loyalty points or miles
        loyalty_data = getattr(context, "loyalty_data", None)
        
        if loyalty_data:
            miles = loyalty_data.get("miles", 0)
            airline = getattr(context, "airline", None)
            
            # Business class upgrade typically 15,000-25,000 miles
            if miles >= 15000 and airline:
                suggestions.append(ProactiveSuggestion(
                    suggestion_id=f"{journey.journey_id}_upgrade",
                    type=SuggestionType.OPPORTUNITY,
                    priority=SuggestionPriority.MEDIUM,
                    title="Upgrade available",
                    message=f"Business class upgrade available for 15,000 miles. You have {miles:,} miles.",
                    action_label="Check upgrade",
                    action_data={"action": "check_upgrade", "airline": airline, "miles_needed": 15000},
                ))
        
        # Opportunity: Hotel upgrade
        hotel_booking = getattr(context, "hotel_booking", None)
        
        if hotel_booking:
            room_type = hotel_booking.get("room_type", "standard")
            
            if room_type == "standard":
                # Check if upgrade is available (in real impl, call hotel API)
                suggestions.append(ProactiveSuggestion(
                    suggestion_id=f"{journey.journey_id}_hotel_upgrade",
                    type=SuggestionType.OPPORTUNITY,
                    priority=SuggestionPriority.LOW,
                    title="Room upgrade available",
                    message="Suite upgrade available for $30/night. Better view and more space!",
                    action_label="View upgrade",
                    action_data={"action": "hotel_upgrade", "cost_per_night": 30},
                ))
        
        # Opportunity: Lounge access
        if context and hasattr(context, "departure_airport_code"):
            # Check if user has premium credit card or status
            has_lounge_access = getattr(context, "has_lounge_access", False)
            
            if not has_lounge_access:
                suggestions.append(ProactiveSuggestion(
                    suggestion_id=f"{journey.journey_id}_lounge",
                    type=SuggestionType.OPPORTUNITY,
                    priority=SuggestionPriority.LOW,
                    title="Airport lounge access",
                    message="Airport lounge available for $35. Includes food, drinks, and WiFi. Worth it for long waits!",
                    action_label="Book lounge",
                    action_data={"action": "book_lounge", "cost": 35},
                ))
        
        # Opportunity: Early bird deals
        planned_dest = getattr(context, "planned_destination", None)
        if planned_dest:
            # Suggest booking activities/tours early for discounts
            has_activities = getattr(context, "activities", None) and len(context.activities) > 0
            
            if not has_activities:
                suggestions.append(ProactiveSuggestion(
                    suggestion_id=f"{journey.journey_id}_early_tours",
                    type=SuggestionType.OPPORTUNITY,
                    priority=SuggestionPriority.LOW,
                    title="Early booking discount",
                    message=f"Book tours in {planned_dest} now and save 15-20%. Popular tours sell out fast!",
                    action_label="Browse tours",
                    action_data={"action": "search_tours", "city": planned_dest},
                ))
        
        return suggestions
    
    def get_suggestions_for_journey(self, journey_id: str) -> List[ProactiveSuggestion]:
        """Get cached suggestions for a journey."""
        return self.suggestion_cache.get(journey_id, [])
    
    def dismiss_suggestion(self, journey_id: str, suggestion_id: str):
        """Dismiss a suggestion so it's not shown again."""
        suggestions = self.suggestion_cache.get(journey_id, [])
        self.suggestion_cache[journey_id] = [
            s for s in suggestions if s.suggestion_id != suggestion_id
        ]
    
    def get_active_suggestions(
        self, 
        journey_id: str, 
        min_priority: Optional[SuggestionPriority] = None
    ) -> List[ProactiveSuggestion]:
        """
        Get active (non-expired) suggestions for a journey.
        
        Args:
            journey_id: Journey ID
            min_priority: Minimum priority level (e.g. MEDIUM filters out LOW)
        
        Returns:
            List of active suggestions
        """
        suggestions = self.get_suggestions_for_journey(journey_id)
        now = datetime.now(timezone.utc)
        
        # Filter expired
        active = [s for s in suggestions if not s.expires_at or self._ensure_aware(s.expires_at) > now]
        
        # Filter by priority
        if min_priority:
            priority_order = {
                SuggestionPriority.LOW: 0,
                SuggestionPriority.MEDIUM: 1,
                SuggestionPriority.HIGH: 2,
                SuggestionPriority.URGENT: 3,
            }
            min_level = priority_order.get(min_priority, 0)
            active = [s for s in active if priority_order.get(s.priority, 0) >= min_level]
        
        # Sort by priority (urgent first)
        priority_order = {
            SuggestionPriority.URGENT: 0,
            SuggestionPriority.HIGH: 1,
            SuggestionPriority.MEDIUM: 2,
            SuggestionPriority.LOW: 3,
        }
        active.sort(key=lambda s: priority_order.get(s.priority, 99))
        
        return active


# Singleton instance
_proactive_intelligence: Optional[ProactiveIntelligence] = None


def get_proactive_intelligence() -> ProactiveIntelligence:
    """Get or create the singleton proactive intelligence instance."""
    global _proactive_intelligence
    if _proactive_intelligence is None:
        _proactive_intelligence = ProactiveIntelligence()
    return _proactive_intelligence


async def analyze_journey_proactively(journey: Any) -> List[Dict[str, Any]]:
    """
    Analyze a journey and return proactive suggestions.
    
    This is called periodically by the background task manager.
    
    Args:
        journey: Journey object
    
    Returns:
        List of suggestion dicts for API response
    """
    intelligence = get_proactive_intelligence()
    suggestions = intelligence.analyze_journey(journey)
    
    return [
        {
            "suggestion_id": s.suggestion_id,
            "type": s.type.value,
            "priority": s.priority.value,
            "title": s.title,
            "message": s.message,
            "action_label": s.action_label,
            "action_data": s.action_data,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        }
        for s in suggestions
    ]


async def get_active_suggestions_for_journey(
    journey_id: str,
    min_priority: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get active suggestions for a journey (API helper).
    
    Args:
        journey_id: Journey ID
        min_priority: Optional minimum priority ("low", "medium", "high", "urgent")
    
    Returns:
        List of suggestion dicts
    """
    intelligence = get_proactive_intelligence()
    
    priority_enum = None
    if min_priority:
        try:
            priority_enum = SuggestionPriority(min_priority.lower())
        except ValueError:
            pass
    
    suggestions = intelligence.get_active_suggestions(journey_id, priority_enum)
    
    return [
        {
            "suggestion_id": s.suggestion_id,
            "type": s.type.value,
            "priority": s.priority.value,
            "title": s.title,
            "message": s.message,
            "action_label": s.action_label,
            "action_data": s.action_data,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        }
        for s in suggestions
    ]


async def dismiss_suggestion_for_journey(journey_id: str, suggestion_id: str):
    """Dismiss a suggestion (API helper)."""
    intelligence = get_proactive_intelligence()
    intelligence.dismiss_suggestion(journey_id, suggestion_id)
    logger.info(f"Dismissed suggestion {suggestion_id} for journey {journey_id}")


async def proactive_intelligence_loop(state_manager: Any, ws_manager: Any, interval_seconds: int = 180):
    """
    Background loop that analyzes all active journeys and generates proactive suggestions.
    
    Runs every 3 minutes (default) to check for:
    - Predictive suggestions (restaurant recommendations, check-in reminders)
    - Smart reminders (packing, weather changes, document checks)
    - Opportunities (price drops, upgrades, early booking discounts)
    
    Args:
        state_manager: Journey state manager
        ws_manager: WebSocket manager for broadcasting suggestions
        interval_seconds: How often to run analysis (default: 180s = 3 min)
    """
    logger.info("Proactive intelligence loop started")
    intelligence = get_proactive_intelligence()
    
    try:
        while True:
            await asyncio.sleep(interval_seconds)
            
            try:
                # Get all active journeys
                all_active = []
                if hasattr(state_manager, 'get_active_journeys'):
                    all_active = state_manager.get_active_journeys()
                
                if not all_active:
                    continue
                
                # Filter by monitoring preference
                from server.mongo_repo import get_monitoring_settings
                settings = get_monitoring_settings()
                active_journeys = []
                for j in all_active:
                    # Handle both Journey objects (with user_id attribute) and dicts (with user_id key)
                    u_id = getattr(j, "user_id", None) or (j.get("user_id") if isinstance(j, dict) else None)
                    pref = settings.get(u_id, "off") # Default to off
                    if pref != "off":
                        active_journeys.append(j)

                if not active_journeys:
                    continue
                
                logger.info(f"Proactive intelligence: analyzing {len(active_journeys)} journeys with monitoring enabled")
                
                for journey in active_journeys:
                    try:
                        # Analyze journey and get suggestions
                        suggestions = intelligence.analyze_journey(journey)
                        
                        if suggestions:
                            # Get only new suggestions (not previously sent)
                            new_suggestions = [
                                s for s in suggestions
                                if s.priority in [SuggestionPriority.HIGH, SuggestionPriority.URGENT]
                            ]
                            
                            if new_suggestions:
                                # Broadcast to WebSocket
                                await ws_manager.broadcast_to_journey(journey.journey_id, {
                                    "type": "proactive_suggestions",
                                    "suggestions": [
                                        {
                                            "suggestion_id": s.suggestion_id,
                                            "type": s.type.value,
                                            "priority": s.priority.value,
                                            "title": s.title,
                                            "message": s.message,
                                            "action_label": s.action_label,
                                            "action_data": s.action_data,
                                        }
                                        for s in new_suggestions
                                    ],
                                    "timestamp": datetime.now(timezone.utc).isoformat(),
                                })
                                
                                logger.info(
                                    f"Sent {len(new_suggestions)} proactive suggestions "
                                    f"for journey {journey.journey_id}"
                                )
                    
                    except Exception as e:
                        logger.error(f"Failed to analyze journey {journey.journey_id}: {e}")
                        continue
            
            except Exception as e:
                logger.error(f"Proactive intelligence loop error: {e}")
                continue
    
    except asyncio.CancelledError:
        logger.info("Proactive intelligence loop cancelled")
        raise
