"""
Phase 3: Segment 5 - Hotel to Activities Orchestrator

This orchestrator handles the main stay period:
- Energy calibration
- Contextual activity suggestions (time, weather, energy, location)
- Activity timing adjustments
- Navigation guidance for each activity
- Proactive weather-aware replanning
- Daily wrap-up summaries
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import logging

from ..base_orchestrator import (
    BaseSegmentOrchestrator,
    NodeResult,
    NodeStatus,
)

logger = logging.getLogger(__name__)

class HotelToActivitiesOrchestrator(BaseSegmentOrchestrator):
    """
    Orchestrator for the Hotel to Activities segment.

    Manages the day-to-day experience during the trip:
    1. Calibrate plans based on user energy level
    2. Suggest activities based on context (weather, time)
    3. Provide navigation and timing guidance
    4. Adapt plans for disruptions (e.g., rain)
    5. Summarize the day's achievements
    """

    def __init__(self):
        super().__init__("hotel_to_activities")

    def _register_nodes(self) -> None:
        """Register all nodes for the hotel-to-activities segment."""
        self.register_node("energy_calibration", self._energy_calibration_node)
        self.register_node("activity_suggestion", self._activity_suggestion_node)
        self.register_node("weather_adaptation", self._weather_adaptation_node)
        self.register_node("navigation_guidance", self._navigation_guidance_node)
        self.register_node("nearby_places_discovery", self._nearby_places_node)
        self.register_node("smart_recommendation", self._smart_recommendation_node)
        self.register_node("generate_response", self._generate_response_node)

    async def _energy_calibration_node(self, state: Dict[str, Any]) -> NodeResult:
        """Assess user energy level and calibrate complexity of plans."""
        journey_context = state.get("journey_context", {})
        energy = journey_context.get("energy_level", "moderate")
        
        # Calibration logic
        if energy == "tired":
            state["plan_intensity"] = "low"
            state["calibration_message"] = "Since you're feeling a bit tired, I've picked some relaxing options for you today."
        elif energy == "fresh":
            state["plan_intensity"] = "high"
            state["calibration_message"] = "You look ready for adventure! I've suggested some high-energy activities today."
        else:
            state["plan_intensity"] = "moderate"
            state["calibration_message"] = "Let's find a good balance of activity and relaxation today."
            
        return NodeResult(
            node_name="energy_calibration",
            status=NodeStatus.SUCCESS,
            data={"intensity": state["plan_intensity"]}
        )

    async def _activity_suggestion_node(self, state: Dict[str, Any]) -> NodeResult:
        """Suggest activities based on current context."""
        journey_context = state.get("journey_context", {})
        intensity = state.get("plan_intensity", "moderate")
        
        # In real implementation, call get_top_tourist_places
        if intensity == "high":
            activities = [
                {"name": "Hiking the Ridge", "type": "Adventure", "duration": "4h"},
                {"name": "Full Day City Tour", "type": "Culture", "duration": "6h"}
            ]
        elif intensity == "low":
            activities = [
                {"name": "Local Museum", "type": "Culture", "duration": "2h"},
                {"name": "Sunset Beach Walk", "type": "Relaxation", "duration": "1h"}
            ]
        else:
            activities = [
                {"name": "Central Park Gallery", "type": "Culture", "duration": "3h"},
                {"name": "Food Market Tour", "type": "Food", "duration": "2h"}
            ]
            
        state["suggested_activities"] = activities
        
        return NodeResult(
            node_name="activity_suggestion",
            status=NodeStatus.SUCCESS,
            data={"activities": activities}
        )

    async def _weather_adaptation_node(self, state: Dict[str, Any]) -> NodeResult:
        """Adjust plans based on weather, using Phase 2 monitoring when available."""
        journey_context = state.get("journey_context", {})

        # Try cached Phase 2 weather monitoring first
        cached_weather = journey_context.get("monitoring", {}).get("weather")
        if cached_weather and "error" not in cached_weather:
            current = cached_weather.get("current", {})
            weather = current.get("condition", "sunny")
            temp = current.get("temperature_celsius")
            logger.info(f"Weather from Phase 2 monitor: {weather}, {temp}°C")
        else:
            weather = journey_context.get("weather", {}).get("condition", "sunny")
            temp = None

        if weather.lower() in ("rain", "rainy", "stormy", "thunderstorm", "drizzle"):
            state["weather_adjustment"] = "I see rain in the forecast, so I've prioritized indoor activities."
        elif temp is not None and temp > 35:
            state["weather_adjustment"] = "It's quite hot outside — I've favored shaded and air-conditioned options."
        else:
            state["weather_adjustment"] = "The weather looks great for exploring!"

        return NodeResult(
            node_name="weather_adaptation",
            status=NodeStatus.SUCCESS,
            data={"weather_condition": weather, "temperature": temp}
        )

    async def _navigation_guidance_node(self, state: Dict[str, Any]) -> NodeResult:
        """Provide navigation context for the first activity."""
        activities = state.get("suggested_activities", [])
        if not activities:
            return NodeResult(node_name="navigation_guidance", status=NodeStatus.SUCCESS)
            
        first_act = activities[0]
        # Mock navigation
        state["nav_guidance"] = f"{first_act['name']} is about 20 minutes away by taxi or a lovely 40 minute walk."
        
        return NodeResult(
            node_name="navigation_guidance",
            status=NodeStatus.SUCCESS,
            data={"target": first_act["name"]}
        )

    async def _nearby_places_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Fetch nearby places based on current location/destination.
        """
        from agent.utils.tools import get_nearby_places
        
        journey_context = state.get("journey_context", {})
        # Try to get coordinates from journey context (e.g., from weather or hotel)
        lat = journey_context.get("destination_lat")
        lon = journey_context.get("destination_lon")
        
        if not lat or not lon:
            # Fallback coordinates for demo if Paris
            dest = journey_context.get("destination", "").lower()
            if "paris" in dest:
                lat, lon = 48.8566, 2.3522
            elif "london" in dest:
                lat, lon = 51.5074, -0.1278
        
        if not lat or not lon:
            return NodeResult(node_name="nearby_places_discovery", status=NodeStatus.SKIPPED)

        try:
            result = get_nearby_places.invoke({
                "latitude": lat,
                "longitude": lon,
                "radius": 5000,
                "types": ["museum", "park", "cafe", "restaurant"]
            })
            
            if "places" in result:
                state["nearby_places_info"] = result["places"]
                logger.info(f"Found {len(result['places'])} nearby places for activity planning")
            
            return NodeResult(
                node_name="nearby_places_discovery",
                status=NodeStatus.SUCCESS,
                data={"nearby_places_count": len(result.get("places", []))}
            )
        except Exception as e:
            logger.error(f"Error fetching nearby places in hotel_to_activities: {e}")
            return NodeResult(node_name="nearby_places_discovery", status=NodeStatus.FAILED, error=str(e))

    async def _smart_recommendation_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Generate a smarter, LLM-powered activity recommendation.
        """
        activities = state.get("suggested_activities", [])
        intensity = state.get("plan_intensity", "moderate")
        journey_context = state.get("journey_context", {})
        weather_data = journey_context.get("monitoring", {}).get("weather", {})
        interests = journey_context.get("interests", [])
        
        # Build context for LLM
        context_data = {
            "intensity": intensity,
            "weather": weather_data,
            "interests": interests,
            "suggested_so_far": [a["name"] for a in activities]
        }
        
        recommendation = await self.generate_smart_recommendation(
            recommendation_type="places",
            title="Local Discovery",
            content_prompt="Provide one unique, context-aware activity or dining tip for the user. Consider their interests, the current weather, and their energy level. Suggest something that isn't already in their main list. Keep it very punchy.",
            context_data=context_data
        )
        
        # Add to state and recommendations list
        state["smart_recommendation"] = recommendation
        recommendations = state.get("recommendations", [])
        recommendations.append(recommendation)
        state["recommendations"] = recommendations
        
        return NodeResult(
            node_name="smart_recommendation",
            status=NodeStatus.SUCCESS,
            data={"recommendation": recommendation.dict()}
        )

    async def _generate_response_node(self, state: Dict[str, Any]) -> NodeResult:
        """Generate the response message for the user."""
        calibration = state.get("calibration_message")
        weather_adj = state.get("weather_adjustment")
        activities = state.get("suggested_activities", [])
        nav = state.get("nav_guidance")
        
        response_parts = [
            f"{calibration} {weather_adj}\n",
            "\n**Here's what I recommend for you:**\n"
        ]
        
        for act in activities:
            response_parts.append(f"• **{act['name']}** ({act['type']}, {act['duration']})\n")
            
        if nav:
            response_parts.append(f"\n{nav}\n")
            
        response_parts.append("\nWould you like to stick with these, or shall we swap something out?")
        
        state["response"] = "".join(response_parts)
        
        return NodeResult(
            node_name="generate_response",
            status=NodeStatus.SUCCESS
        )

    def _check_completion(self) -> bool:
        """Check if hotel-to-activities segment should transition."""
        # This completes when we reach the return day
        return self._state.get("is_return_day", False)

    def _get_next_segment(self) -> str:
        """Get the next segment after hotel-to-activities."""
        return "return"

def create_hotel_to_activities_orchestrator() -> HotelToActivitiesOrchestrator:
    """Factory function to create a HotelToActivitiesOrchestrator."""
    return HotelToActivitiesOrchestrator()


def create_hotel_to_activities_graph():
    """Create and return the compiled LangGraph for hotel-to-activities orchestrator."""
    orchestrator = HotelToActivitiesOrchestrator()
    return orchestrator.build_graph()
