"""
Phase 3: Segment 1 - Trip Inspiration & Intent Discovery Orchestrator

This orchestrator handles the first segment of the journey:
- Intent extraction from user input
- Clarification prompts (max 3 questions)
- Destination suggestions with reasoning
- Confidence indicators
- Budget comfort framing
- Time feasibility checks
- Flight recommendation via Amadeus
- Journey creation with structured JSON response (greeting agent schema)

SAMPLE IMPLEMENTATION - Extend this for full functionality.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from dataclasses import dataclass
from enum import Enum
import logging
import json
import os

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from ..base_orchestrator import (
    BaseSegmentOrchestrator,
    NodeResult,
    NodeStatus,
)

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

# Initialize LLM
model = os.getenv("GROQ_MODEL", "openai/gpt-oss-safeguard-20b")
llm = ChatGroq(model=model)


class ConfidenceLevel(str, Enum):
    """Confidence levels for destination matches."""
    VERY_GOOD = "very_good"
    GOOD = "good"
    POSSIBLE = "possible"


@dataclass
class DestinationSuggestion:
    """A destination suggestion with reasoning."""
    destination: str
    country: str
    confidence: ConfidenceLevel
    match_reasons: List[str]
    budget_estimate: float
    budget_comfort: str  # comfortable, stretch, premium
    best_time_to_visit: str
    highlights: List[str]
    safety_alerts: Optional[List[Any]] = None  # List of SafetyAlert objects
    has_critical_safety_issue: bool = False
    confidence_label: Optional[str] = None
    budget_message: Optional[str] = None
    feasibility: Optional[Dict[str, Any]] = None


@dataclass
class UserIntent:
    """Extracted user travel intent."""
    travel_type: str  # vacation, business, adventure, relaxation, etc.
    duration_days: Optional[int] = None
    budget_range: Optional[tuple] = None
    interests: List[str] = None
    constraints: List[str] = None
    preferred_climate: Optional[str] = None
    travel_dates: Optional[tuple] = None


class InspirationOrchestrator(BaseSegmentOrchestrator):
    """
    Orchestrator for the Trip Inspiration segment.

    This handles the initial phase of journey planning where we:
    1. Understand what the user wants
    2. Suggest appropriate destinations
    3. Get confirmation and create the journey
    """

    def __init__(self):
        super().__init__("inspiration")
        self._clarification_count = 0
        self._max_clarifications = 3

    def _register_nodes(self) -> None:
        """Register all nodes for the inspiration segment."""
        self.register_node("intent_extraction", self._intent_extraction_node)
        self.register_node("clarification_check", self._clarification_check_node)
        self.register_node("destination_suggestion", self._destination_suggestion_node)
        self.register_node("safety_check", self._safety_check_node)
        self.register_node("confidence_indicator", self._confidence_indicator_node)
        self.register_node("budget_comfort", self._budget_comfort_node)
        self.register_node("time_feasibility", self._time_feasibility_node)
        self.register_node("flight_recommendation", self._flight_recommendation_node)
        self.register_node("smart_recommendation", self._smart_recommendation_node)
        self.register_node("create_journey", self._create_journey_node)

    async def _intent_extraction_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Extract travel intent from user message.

        This node analyzes the user's message to understand:
        - Type of trip they want
        - Budget constraints
        - Time constraints
        - Preferences and interests
        """
        user_message = state.get("user_message")
        journey_ctx = state.get("journey_context", {})
        metadata = journey_ctx.get("metadata", {})

        if not user_message:
            # Load previously extracted intent from metadata if available
            stored_intent_data = metadata.get("extracted_intent")
            if stored_intent_data:
                try:
                    # Basic reconstruction of UserIntent from dict
                    intent = UserIntent(
                        travel_type=stored_intent_data.get("travel_type", "vacation"),
                        duration_days=stored_intent_data.get("duration_days"),
                        budget_range=tuple(stored_intent_data.get("budget_range")) if stored_intent_data.get("budget_range") else None,
                        interests=stored_intent_data.get("interests", []),
                        constraints=stored_intent_data.get("constraints", []),
                        preferred_climate=stored_intent_data.get("preferred_climate"),
                        travel_dates=tuple(stored_intent_data.get("travel_dates")) if stored_intent_data.get("travel_dates") else None
                    )
                    confidence = metadata.get("intent_confidence", 0.7)
                    state["extracted_intent"] = intent
                    state["intent_confidence"] = confidence
                    return NodeResult(
                        node_name="intent_extraction",
                        status=NodeStatus.SUCCESS,
                        data={"extracted_intent": intent, "intent_confidence": confidence}
                    )
                except Exception as e:
                    logger.warning(f"Failed to reconstruct intent from metadata: {e}")

            # Fallback if no previous intent
            intent = UserIntent(
                travel_type="vacation",
                interests=["general"]
            )
            return NodeResult(
                node_name="intent_extraction",
                status=NodeStatus.SUCCESS,
                data={"extracted_intent": intent, "intent_confidence": 0.3}
            )

        # Use LLM to extract intent
        system_prompt = """You are a travel intent analyzer. Extract structured travel information from user messages.

Analyze the user's message and return ONLY a JSON object with this structure:
{
  "travel_type": "vacation | business | adventure | relaxation | cultural | family | solo",
  "duration_days": <number or null>,
  "budget_min": <number or null>,
  "budget_max": <number or null>,
  "interests": ["beach", "culture", "food", "adventure", "nature", "history", "nightlife", etc.],
  "constraints": ["direct flights", "visa-free", "family-friendly", etc.],
  "preferred_climate": "warm | cold | moderate | tropical | null",
  "travel_start_date": "YYYY-MM-DD or null",
  "travel_end_date": "YYYY-MM-DD or null",
  "confidence": 0.0-1.0
}

Extract as much as you can from the user's message. Use null for missing information.
If the user is clarifying or answering a previous question, merge with any existing extracted_intent from context when available.
Return ONLY the JSON object, no markdown, no explanation."""

        try:
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message)
            ])

            response_text = getattr(response, "content", "").strip()
            intent_data = json.loads(response_text)

            # Convert to UserIntent object
            intent = UserIntent(
                travel_type=intent_data.get("travel_type", "vacation"),
                duration_days=intent_data.get("duration_days"),
                budget_range=(intent_data.get("budget_min"), intent_data.get("budget_max"))
                    if intent_data.get("budget_min") and intent_data.get("budget_max") else None,
                interests=intent_data.get("interests", []),
                constraints=intent_data.get("constraints", []),
                preferred_climate=intent_data.get("preferred_climate"),
                travel_dates=(intent_data.get("travel_start_date"), intent_data.get("travel_end_date"))
                    if intent_data.get("travel_start_date") and intent_data.get("travel_end_date") else None
            )

            confidence = intent_data.get("confidence", 0.5)

        except Exception as e:
            logger.error(f"Error extracting intent with LLM: {e}")
            # Fallback to basic intent
            intent = UserIntent(
                travel_type="vacation",
                interests=["general"]
            )
            confidence = 0.3

        state["extracted_intent"] = intent
        state["intent_confidence"] = confidence

        # Persist to metadata for background updates
        metadata_updates = {
            "extracted_intent": {
                "travel_type": intent.travel_type,
                "duration_days": intent.duration_days,
                "budget_range": intent.budget_range,
                "interests": intent.interests,
                "constraints": intent.constraints,
                "preferred_climate": intent.preferred_climate,
                "travel_dates": intent.travel_dates
            },
            "intent_confidence": confidence
        }

        logger.info(f"Extracted intent: {intent.travel_type}, interests: {intent.interests}, confidence: {confidence}")

        return NodeResult(
            node_name="intent_extraction",
            status=NodeStatus.SUCCESS,
            data={
                "extracted_intent": intent, 
                "intent_confidence": confidence,
                "metadata_updates": metadata_updates
            }
        )

    async def _clarification_check_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Check if clarification is needed.

        If intent confidence is low or critical information is missing,
        ask clarifying questions (max 3).
        """
        intent = state.get("extracted_intent")
        confidence = state.get("intent_confidence", 0)

        needs_clarification = False
        clarification_questions = []

        if intent is None:
            return NodeResult(
                node_name="clarification_check",
                status=NodeStatus.SUCCESS,
                data={"needs_clarification": True, "questions": ["Could you describe your ideal trip?"]},
                should_continue=False
            )

        # Check for missing critical info
        if not intent.duration_days:
            needs_clarification = True
            clarification_questions.append("How many days are you planning to travel?")

        if not intent.budget_range:
            needs_clarification = True
            clarification_questions.append("What's your approximate budget for this trip?")

        if confidence < 0.7 and self._clarification_count < self._max_clarifications:
            needs_clarification = True
            clarification_questions.append("Could you tell me more about what kind of experience you're looking for?")

        if needs_clarification and self._clarification_count < self._max_clarifications:
            user_message = state.get("user_message")
            if not user_message:
                # BACKGROUND UPDATE: Proceed even with low confidence to allow nudges/tips
                logger.info("Background update in inspiration: bypassing clarification check")
                return NodeResult(
                    node_name="clarification_check",
                    status=NodeStatus.SUCCESS,
                    data={"needs_clarification": True, "bypassed_for_background": True},
                    should_continue=True
                )

            self._clarification_count += 1
            state["needs_clarification"] = True
            state["clarification_questions"] = clarification_questions[:3]  # Max 3
            state["response"] = self._format_clarification_response(clarification_questions[:3])

            return NodeResult(
                node_name="clarification_check",
                status=NodeStatus.SUCCESS,
                data={"needs_clarification": True, "questions": clarification_questions},
                should_continue=False  # Wait for user response
            )

        state["needs_clarification"] = False
        return NodeResult(
            node_name="clarification_check",
            status=NodeStatus.SUCCESS,
            data={"needs_clarification": False}
        )

    def _format_clarification_response(self, questions: List[str]) -> str:
        """Format clarification questions for user response."""
        intro = "To help you find the perfect destination, I have a few questions:\n\n"
        formatted_questions = "\n".join([f"• {q}" for q in questions])
        return intro + formatted_questions

    async def _destination_suggestion_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Generate destination suggestions based on intent.

        This node uses the extracted intent to suggest
        appropriate destinations with reasoning.
        """
        intent = state.get("extracted_intent")
        if intent is None:
            intent = UserIntent(travel_type="vacation", interests=["general"])

        # Use LLM to generate destination suggestions
        system_prompt = """You are a travel destination expert. Based on user travel intent, suggest 3 destinations.

For each destination, provide:
- destination name
- country
- confidence level (very_good, good, or possible)
- 3-4 match reasons explaining why it fits
- estimated budget (in USD)
- budget comfort level (comfortable, stretch, or premium)
- best time to visit
- 3 highlights

Return ONLY a JSON array of 3 suggestions with this structure:
[
  {
    "destination": "City/Place name",
    "country": "Country name",
    "confidence": "very_good | good | possible",
    "match_reasons": ["reason 1", "reason 2", "reason 3"],
    "budget_estimate": <number in USD>,
    "budget_comfort": "comfortable | stretch | premium",
    "best_time_to_visit": "Month range or season",
    "highlights": ["highlight 1", "highlight 2", "highlight 3"]
  }
]

Return ONLY the JSON array, no markdown, no explanation."""

        # Format intent for LLM
        intent_summary = f"""Travel Type: {intent.travel_type}
Duration: {intent.duration_days or 'flexible'} days
Budget: {f'${intent.budget_range[0]}-${intent.budget_range[1]}' if intent.budget_range else 'flexible'}
Interests: {', '.join(intent.interests) if intent.interests else 'general travel'}
Constraints: {', '.join(intent.constraints) if intent.constraints else 'none'}
Climate Preference: {intent.preferred_climate or 'any'}"""

        try:
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=intent_summary)
            ])

            response_text = getattr(response, "content", "").strip()
            suggestions_data = json.loads(response_text)

            # Convert to DestinationSuggestion objects
            suggestions = []
            for item in suggestions_data:
                confidence_map = {
                    "very_good": ConfidenceLevel.VERY_GOOD,
                    "good": ConfidenceLevel.GOOD,
                    "possible": ConfidenceLevel.POSSIBLE
                }

                suggestion = DestinationSuggestion(
                    destination=item.get("destination", "Unknown"),
                    country=item.get("country", "Unknown"),
                    confidence=confidence_map.get(item.get("confidence", "good"), ConfidenceLevel.GOOD),
                    match_reasons=item.get("match_reasons", []),
                    budget_estimate=item.get("budget_estimate", 3000),
                    budget_comfort=item.get("budget_comfort", "comfortable"),
                    best_time_to_visit=item.get("best_time_to_visit", "Year-round"),
                    highlights=item.get("highlights", [])
                )
                suggestions.append(suggestion)

        except Exception as e:
            logger.error(f"Error generating destination suggestions with LLM: {e}")
            # Fallback to basic suggestions
            suggestions = [
                DestinationSuggestion(
                    destination="Paris",
                    country="France",
                    confidence=ConfidenceLevel.GOOD,
                    match_reasons=["Popular destination", "Rich culture", "Great food"],
                    budget_estimate=3500,
                    budget_comfort="comfortable",
                    best_time_to_visit="April-October",
                    highlights=["Eiffel Tower", "Louvre", "Notre Dame"]
                )
            ]

        state["suggestions"] = suggestions

        return NodeResult(
            node_name="destination_suggestion",
            status=NodeStatus.SUCCESS,
            data={"suggestions": suggestions}
        )

    async def _safety_check_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Check safety alerts for suggested destinations.
        
        Integrates with SafetyAlertMonitor to check:
        - Travel advisories
        - Natural disasters
        - Health alerts
        """
        from agent.safety_alerts import SafetyAlertMonitor, AlertSeverity
        
        suggestions = state.get("suggestions", [])
        safety_monitor = SafetyAlertMonitor()
        
        # Check each destination
        for suggestion in suggestions:
            try:
                alerts = await safety_monitor.check_destination_safety(
                    country=suggestion.country,
                    city=suggestion.destination
                )
                
                suggestion.safety_alerts = alerts
                
                # Flag critical alerts
                critical_alerts = [a for a in alerts if a.severity == AlertSeverity.CRITICAL]
                if critical_alerts:
                    suggestion.has_critical_safety_issue = True
                    logger.warning(f"Critical safety alert for {suggestion.destination}: {critical_alerts[0].title}")
                else:
                    suggestion.has_critical_safety_issue = False
                    
            except Exception as e:
                logger.error(f"Error checking safety for {suggestion.destination}: {e}")
                suggestion.safety_alerts = []
                suggestion.has_critical_safety_issue = False
        
        return NodeResult(
            node_name="safety_check",
            status=NodeStatus.SUCCESS,
            data={"safety_checked": True}
        )

    async def _confidence_indicator_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Add confidence indicators to suggestions.

        Formats the confidence level into user-friendly indicators.
        """
        suggestions = state.get("suggestions", [])

        confidence_labels = {
            ConfidenceLevel.VERY_GOOD: "✨ Very Good Match",
            ConfidenceLevel.GOOD: "👍 Good Match",
            ConfidenceLevel.POSSIBLE: "🤔 Possible Match"
        }

        for suggestion in suggestions:
            suggestion.confidence_label = confidence_labels.get(
                suggestion.confidence,
                "Match"
            )

        return NodeResult(
            node_name="confidence_indicator",
            status=NodeStatus.SUCCESS
        )

    async def _budget_comfort_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Frame budget in terms of comfort level.

        Instead of just showing prices, frame them as:
        - Comfortable: Within budget with room to spare
        - Stretch: At the top of budget
        - Premium: Above budget but achievable
        """
        suggestions = state.get("suggestions", [])
        intent = state.get("extracted_intent")
        budget_max = intent.budget_range[1] if intent and intent.budget_range else 5000

        for suggestion in suggestions:
            estimate = suggestion.budget_estimate
            if estimate < budget_max * 0.8:
                suggestion.budget_comfort = "comfortable"
                suggestion.budget_message = "Comfortable within your budget"
            elif estimate <= budget_max:
                suggestion.budget_comfort = "stretch"
                suggestion.budget_message = "At the top of your budget, but doable"
            else:
                suggestion.budget_comfort = "premium"
                suggestion.budget_message = "A bit of a stretch, but worth considering"

        return NodeResult(
            node_name="budget_comfort",
            status=NodeStatus.SUCCESS
        )

    async def _time_feasibility_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Check time feasibility for suggestions.

        Validates that the trip duration is realistic for each destination.
        """
        suggestions = state.get("suggestions", [])
        intent = state.get("extracted_intent")
        duration = (intent.duration_days if intent else None) or 7

        feasibility_results = []

        for suggestion in suggestions:
            # Simple feasibility rules
            if suggestion.destination == "Maldives" and duration < 4:
                feasibility = {
                    "feasible": False,
                    "message": "Maldives typically requires at least 4 days to enjoy"
                }
            elif suggestion.destination == "Bali" and duration < 5:
                feasibility = {
                    "feasible": True,
                    "message": "Possible but you'll need to prioritize activities"
                }
            else:
                feasibility = {
                    "feasible": True,
                    "message": f"Perfect! {duration} days is ideal for {suggestion.destination}"
                }

            suggestion.feasibility = feasibility
            feasibility_results.append(feasibility)

        return NodeResult(
            node_name="time_feasibility",
            status=NodeStatus.SUCCESS,
            data={"feasibility_results": feasibility_results}
        )

    async def _flight_recommendation_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Search for flight offers via Amadeus based on journey context.

        Preference order:
        1. Use saved_flights already attached to the journey.
        2. Otherwise fetch fresh offers through the shared Amadeus flight tools.
        3. Persist fresh offers back to the journey as saved_flights.
        """
        from agent.travel_provider import (
            active_save_flights_to_journey,
            active_search_flight_offers,
        )

        journey_ctx = state.get("journey_context", {})
        saved_flights = journey_ctx.get("saved_flights") or journey_ctx.get("saved_flight") or []
        if isinstance(saved_flights, list) and saved_flights:
            state["flight_items"] = saved_flights
            return NodeResult(
                node_name="flight_recommendation",
                status=NodeStatus.SUCCESS,
                data={"flight_items": saved_flights, "_from_saved_flights": True},
            )

        origin_iata = journey_ctx.get("departure_airport_code", "")
        dest_iata = journey_ctx.get("destination_airport_code", "")
        departure_date_str = journey_ctx.get("departure_date", "")
        travelers = journey_ctx.get("travelers_count", 1) or 1
        currency = journey_ctx.get("currency", "USD") or "USD"
        user_id = journey_ctx.get("user_id", "unknown")
        journey_id = journey_ctx.get("journey_id")

        if not origin_iata or not dest_iata:
            logger.info("Missing origin or destination IATA — skipping flight search")
            state["flight_items"] = []
            return NodeResult(
                node_name="flight_recommendation",
                status=NodeStatus.SUCCESS,
                data={"flight_items": [], "skipped": True},
            )

        # ----- departure date -----
        if not departure_date_str:
            departure_date_str = (date.today() + timedelta(days=30)).isoformat()

        try:
            result = active_search_flight_offers.invoke({
                "origin_location_code": origin_iata.upper(),
                "destination_location_code": dest_iata.upper(),
                "departure_date": departure_date_str,
                "adults": travelers,
                "currency_code": currency,
                "max_results": 10,
                "user_id": user_id,
            })
            if result.get("error"):
                logger.warning(f"Amadeus flight search error: {result['error']}")
                state["flight_items"] = []
                return NodeResult(
                    node_name="flight_recommendation",
                    status=NodeStatus.SUCCESS,
                    data={"flight_items": [], "error": result["error"]},
                )

            items = result.get("flights", [])
            if items and journey_id:
                save_result = active_save_flights_to_journey.invoke({
                    "journey_id": journey_id,
                    "flights": items,
                })
                if save_result.get("error"):
                    logger.warning(
                        f"Failed to save inspiration flights for journey {journey_id}: {save_result}"
                    )
                else:
                    journey_ctx["saved_flights"] = items

            state["flight_items"] = items
            logger.info(f"Found {len(items)} flight offers {origin_iata}->{dest_iata}")
            return NodeResult(
                node_name="flight_recommendation",
                status=NodeStatus.SUCCESS,
                data={"flight_items": items},
            )
        except Exception as exc:
            logger.error(f"Flight recommendation failed: {exc}")
            state["flight_items"] = []
            return NodeResult(
                node_name="flight_recommendation",
                status=NodeStatus.SUCCESS,
                data={"flight_items": [], "error": str(exc)},
            )


    async def _smart_recommendation_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Generate a flight-finalization nudge when saved flights exist.
        """
        journey_context = state.get("journey_context", {})
        saved_flights = journey_context.get("saved_flights", []) or state.get("flight_items", [])

        if not saved_flights:
            return NodeResult(node_name="smart_recommendation", status=NodeStatus.SKIPPED)

        recommendation = await self.generate_smart_recommendation(
            recommendation_type="logistics",
            title="Time to Finalize Your Flight",
            content_prompt=(
                f"The user has saved {len(saved_flights)} flight options but hasn't booked yet. "
                "Provide a warm, proactive nudge to review their saved flights and make a booking soon. "
                "Mention that prices can change quickly. Keep it under 2 sentences."
            ),
            context_data={
                "saved_flights_count": len(saved_flights),
                "destination": journey_context.get("destination")
                or journey_context.get("planned_destination")
                or journey_context.get("destination_airport_code")
                or "your destination",
            }
        )

        message = await self.render_journey_message(
            template_name="discovery.j2",
            context_data={
                "destination": journey_context.get("destination")
                or journey_context.get("planned_destination")
                or "your destination",
                "interests": [],
                "recommendation_text": recommendation.content,
                "match_reasons": recommendation.match_reasons if hasattr(recommendation, "match_reasons") else []
            },
            title="Time to Finalize Your Flight"
        )
        
        # Add to state and recommendations/messages list
        state["smart_recommendation"] = recommendation
        state["journey_message"] = message
        
        recommendations = state.get("recommendations", [])
        recommendations.append(recommendation)
        state["recommendations"] = recommendations

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

    async def _create_journey_node(self, state: Dict[str, Any]) -> NodeResult:
        """
        Create the journey record and format the response for the user.

        - Persists a Journey via the app's JourneyStateManager (if available)
        - Starts WEATHER monitoring for the INSPIRATION segment
        - Formats destination suggestions + flight recommendations into a
          structured JSON response following the greeting agent schema
        """
        # Late import to avoid circular dependency (journey_orchestrator imports inspiration)
        from ...journey_orchestrator import _state_manager_ref, _context_monitor_ref

        suggestions = state.get("suggestions", [])
        flight_items = state.get("flight_items", [])
        journey_context = state.get("journey_context", {})
        user_id = journey_context.get("user_id", "unknown")
        user_data = journey_context.get("user_data") or {}

        journey_id = journey_context.get("journey_id")
        journey_status = None

        # Create a real journey record if the singleton state_manager is available
        # and a journey_id wasn't already supplied by routes.py
        conversation_id = journey_context.get("conversation_id")
        if journey_id is None and _state_manager_ref is not None:
            try:
                journey = _state_manager_ref.initialize_journey(
                    user_id,
                    conversation_id=conversation_id,
                )
                journey_id = journey.journey_id
                journey_status = journey.status.value if hasattr(journey.status, "value") else str(journey.status)
                logger.info(f"Created journey {journey_id} for user {user_id}")

                # Mark as active so subsequent requests get journey_id in User Context (7.5)
                _state_manager_ref.set_active_for_user(journey_id, user_id)

                # Start monitoring appropriate for the INSPIRATION segment
                if _context_monitor_ref is not None:
                    from ...phase_2_context_monitoring import MonitoringType
                    await _context_monitor_ref.start_monitoring(
                        journey_id,
                        monitoring_types=[MonitoringType.WEATHER],
                    )
            except Exception as e:
                logger.error(f"Failed to create journey for user {user_id}: {e}")
        elif journey_id is None:
            logger.warning("state_manager not available; journey not persisted")

        # ---- Build user-facing text ----
        user_name = (
            f"{user_data.get('firstName', '')} {user_data.get('lastName', '')}".strip()
            or "there"
        )
        destination = journey_context.get("destination") or journey_context.get("planned_destination") or ""
        departure_city = journey_context.get("departure_city") or ""
        origin_code = journey_context.get("departure_airport_code") or ""
        dest_code = journey_context.get("destination_airport_code") or ""
        departure_date = journey_context.get("departure_date") or journey_context.get("planned_departure_date") or ""
        duration_days = journey_context.get("duration_days")
        travelers = journey_context.get("travelers_count", 1)
        budget_min = journey_context.get("budget_min")
        budget_max = journey_context.get("budget_max")
        currency = journey_context.get("currency") or "USD"
        smart_recommendation = state.get("smart_recommendation")

        parts: List[str] = []

        if smart_recommendation and getattr(smart_recommendation, "content", None):
            ai_text = smart_recommendation.content
        else:
            # Opening
            if destination:
                parts.append(f"Hi {user_name}, your journey to {destination} has been created!")
            else:
                parts.append(f"Hi {user_name}, your new journey has been created!")

        # Journey Summary
        parts.append("\n\n**Journey Summary**")
        route = ""
        if departure_city and destination:
            route = f"{departure_city}"
            if origin_code:
                route += f" ({origin_code})"
            route += f" -> {destination}"
            if dest_code:
                route += f" ({dest_code})"
        elif destination:
            route = destination
        if route:
            parts.append(f"\n- Route: {route}")
        if departure_date:
            parts.append(f"\n- Departure: {departure_date}")
        if duration_days:
            parts.append(f"\n- Duration: {duration_days} days")
        if budget_min is not None and budget_max is not None:
            parts.append(f"\n- Budget: {currency} {budget_min:,.0f} - {budget_max:,.0f}")
        if travelers and travelers > 1:
            parts.append(f"\n- Travelers: {travelers}")

        # Flights section
        if flight_items:
            parts.append(
                f"\n\n**Recommended Flights**\n"
                f"I found {len(flight_items)} flight option{'s' if len(flight_items) != 1 else ''}"
            )
            if origin_code and dest_code:
                parts.append(f" from {origin_code} to {dest_code}")
            parts.append(" — swipe through to compare!")

        # Next steps
        parts.append("\n\n**Next Steps**")
        if flight_items:
            parts.append("\n- Pick a flight that fits your schedule and budget.")
        parts.append("\n- I can also search for hotels near your destination.")
        parts.append("\n- Let me know if you'd like to adjust dates or budget.")

        # Quick prompt
        if flight_items:
            parts.append("\n\n**Quick Prompt**\nWhich flight catches your eye?")
        else:
            parts.append("\n\n**Quick Prompt**\nWhich destination interests you most?")

        ai_text = "".join(parts)
        if smart_recommendation and getattr(smart_recommendation, "content", None):
            ai_text = smart_recommendation.content

        # ---- Build structured JSON response (greeting agent schema) ----
        structured_response: Dict[str, Any] = {
            "ai_generated": ai_text,
            "message": ai_text,
        }

        if flight_items:
            structured_response["api_response_type"] = "compare_flights"
            structured_response["api_response"] = {
                "comparison_type": "destination",
                "items": flight_items,
            }
            structured_response["trigger_popup"] = True
        else:
            structured_response["api_response_type"] = None
            structured_response["api_response"] = None
            structured_response["trigger_popup"] = False

        state["response"] = json.dumps(structured_response, ensure_ascii=False)
        state["structured_response"] = structured_response
        state["awaiting_selection"] = True

        return NodeResult(
            node_name="create_journey",
            status=NodeStatus.SUCCESS,
            data={
                "response_generated": True,
                "journey_id": journey_id,
                "journey_status": journey_status,
                "structured_response": structured_response,
            }
        )

    def _check_completion(self) -> bool:
        """Check if inspiration segment should transition."""
        # Transition when a flight booking has been confirmed on the journey context.
        journey_context = self._state.get("journey_context", {}) or {}
        flight_status = journey_context.get("flight_status") or {}
        booked_flights = journey_context.get("booked_flights") or []

        logger.info(
            "Inspiration completion check: flight_status=%s booked_flights=%s",
            (
                flight_status.model_dump()
                if hasattr(flight_status, "model_dump")
                else flight_status
            ),
            len(booked_flights) if isinstance(booked_flights, list) else booked_flights,
        )

        if flight_status:
            if hasattr(flight_status, "flight_number") or hasattr(flight_status, "booking_reference"):
                result = bool(
                    getattr(flight_status, "flight_number", None)
                    or getattr(flight_status, "booking_reference", None)
                )
                logger.info("Inspiration completion via object flight_status: %s", result)
                return result
            if isinstance(flight_status, dict):
                result = bool(
                    flight_status.get("flight_number")
                    or flight_status.get("booking_reference")
                )
                logger.info("Inspiration completion via dict flight_status: %s", result)
                return result

        result = isinstance(booked_flights, list) and len(booked_flights) > 0
        logger.info("Inspiration completion via booked_flights fallback: %s", result)
        return result

    def _get_next_segment(self) -> str:
        """Get the next segment after inspiration."""
        return "home_to_airport"


def create_inspiration_orchestrator() -> InspirationOrchestrator:
    """Factory function to create an InspirationOrchestrator."""
    return InspirationOrchestrator()


def create_inspiration_graph():
    """Create and return the compiled LangGraph for inspiration orchestrator."""
    orchestrator = InspirationOrchestrator()
    return orchestrator.build_graph()
