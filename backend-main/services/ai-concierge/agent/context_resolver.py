"""
Context Resolver: Disambiguate user references and implicit intents.

Handles:
- Pronoun resolution: "book it" → "book flight 3"
- Implicit references: "what about hotels?" → knows destination from flight
- Implicit intents: "I'm at the airport" → trigger location check
- Contextual understanding: "running late" → check traffic + recalculate
"""

import logging
import re
import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ContextResolver:
    """
    Resolves ambiguous user messages using conversation and journey context.
    
    This enables natural follow-up messages like:
    - "Book it" (knows "it" = Flight 3 from previous search)
    - "What about hotels?" (knows destination from booked flight)
    - "I'm at the airport" (triggers location check)
    - "Running late" (checks traffic + recalculates timeline)
    """
    
    # Patterns for implicit intents
    LOCATION_PATTERNS = [
        r"\b(i'?m|i am|just|now)\s+(at|in|near|arrived|reached)\s+(the\s+)?(airport|hotel|home|gate|terminal)\b",
        r"\b(arrived|reached|got to|made it to)\s+(the\s+)?(airport|hotel|home)\b",
    ]
    
    URGENCY_PATTERNS = [
        r"\b(running|gonna be|will be|might be)\s+(late|delayed|behind)\b",
        r"\b(traffic|stuck|delay|slow)\b",
        r"\b(hurry|rush|quick|fast)\b",
    ]
    
    PRONOUN_PATTERNS = [
        r"\b(book|reserve|confirm|select|choose|take|get)\s+(it|that|this|the first|the second|the third|option \d+|number \d+)\b",
        r"\b(what about|how about|tell me about|show me)\s+(hotels?|cars?|flights?|options?)\b",
    ]
    
    def __init__(self):
        self._location_regex = [re.compile(p, re.IGNORECASE) for p in self.LOCATION_PATTERNS]
        self._urgency_regex = [re.compile(p, re.IGNORECASE) for p in self.URGENCY_PATTERNS]
        self._pronoun_regex = [re.compile(p, re.IGNORECASE) for p in self.PRONOUN_PATTERNS]
    
    def resolve(
        self,
        user_message: str,
        conversation_context: Optional[Dict[str, Any]] = None,
        journey_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Resolve ambiguous message using context.
        
        Returns:
        {
            "resolved_message": str,  # Expanded message with resolved references
            "implicit_intent": Optional[str],  # Detected implicit intent
            "context_hints": Dict[str, Any],  # Extracted context to inject
            "trigger_action": Optional[str],  # Action to trigger (location_check, traffic_check, etc.)
        }
        """
        result = {
            "resolved_message": user_message,
            "implicit_intent": None,
            "context_hints": {},
            "trigger_action": None,
        }
        
        # 1. Detect implicit location intent
        location_intent = self._detect_location_intent(user_message)
        if location_intent:
            result["implicit_intent"] = "location_arrival"
            result["trigger_action"] = "location_check"
            result["context_hints"]["location_type"] = location_intent
            result["resolved_message"] = f"[IMPLICIT: User indicates arrival at {location_intent}] {user_message}"
            logger.info(f"Detected location intent: {location_intent}")
        
        # 2. Detect urgency/delay intent
        if self._detect_urgency(user_message):
            result["implicit_intent"] = "urgency"
            result["trigger_action"] = "traffic_check"
            result["context_hints"]["urgency"] = True
            result["resolved_message"] = f"[IMPLICIT: User indicates urgency/delay] {user_message}"
            logger.info("Detected urgency intent")
        
        # 3. Resolve pronouns using conversation context
        if conversation_context:
            resolved, hints = self._resolve_pronouns(user_message, conversation_context)
            if resolved != user_message:
                result["resolved_message"] = resolved
                result["context_hints"].update(hints)
                logger.info(f"Resolved pronouns: {user_message} → {resolved}")
        
        # 4. Infer missing context from journey
        if journey_context:
            inferred = self._infer_from_journey(user_message, journey_context)
            result["context_hints"].update(inferred)
        
        return result
    
    def _detect_location_intent(self, message: str) -> Optional[str]:
        """Detect if user is indicating arrival at a location."""
        for regex in self._location_regex:
            match = regex.search(message)
            if match:
                # Extract location type (airport, hotel, home, gate, terminal)
                location = match.group(4) if match.lastindex >= 4 else match.group(2)
                if location:
                    location = location.lower()
                    if location in ("gate", "terminal"):
                        return "airport"
                    return location
        return None
    
    def _detect_urgency(self, message: str) -> bool:
        """Detect if user is indicating urgency or delay."""
        for regex in self._urgency_regex:
            if regex.search(message):
                return True
        return False
    
    def _resolve_pronouns(
        self,
        message: str,
        conversation_context: Dict[str, Any],
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Resolve pronouns like 'it', 'that', 'this' using conversation context.
        
        Example:
        - Last AI message: "I found 3 flights: Flight 1 ($500), Flight 2 ($600), Flight 3 ($450)"
        - User: "Book it" → "Book Flight 3 ($450)" (assumes last/cheapest)
        - User: "Book the first" → "Book Flight 1 ($500)"
        """
        hints = {}
        resolved = message
        
        # Check if message contains pronoun pattern
        has_pronoun = any(regex.search(message) for regex in self._pronoun_regex)
        if not has_pronoun:
            return resolved, hints
        
        # Extract last search results from conversation
        last_results = conversation_context.get("last_search_results", {})
        
        # Handle "book it" / "book that" / "book this"
        if re.search(r"\b(book|reserve|confirm|select|choose|take|get)\s+(it|that|this)\b", message, re.IGNORECASE):
            # Try to find the most recent item mentioned
            if "flights" in last_results and last_results["flights"]:
                flights = last_results["flights"]
                # Default to first or cheapest
                selected = flights[0] if len(flights) == 1 else min(flights, key=lambda f: f.get("price", 999999))
                flight_id = selected.get("id", "unknown")
                price = selected.get("price", "")
                resolved = re.sub(
                    r"\b(it|that|this)\b",
                    f"flight {flight_id} (${price})" if price else f"flight {flight_id}",
                    resolved,
                    flags=re.IGNORECASE,
                )
                hints["selected_flight_id"] = flight_id
                hints["selected_flight"] = selected
            elif "hotels" in last_results and last_results["hotels"]:
                hotels = last_results["hotels"]
                selected = hotels[0]
                hotel_name = selected.get("name", "unknown")
                resolved = re.sub(r"\b(it|that|this)\b", f"hotel {hotel_name}", resolved, flags=re.IGNORECASE)
                hints["selected_hotel"] = selected
            elif "cars" in last_results and last_results["cars"]:
                cars = last_results["cars"]
                selected = cars[0]
                car_type = selected.get("vehicle_type", "unknown")
                resolved = re.sub(r"\b(it|that|this)\b", f"car {car_type}", resolved, flags=re.IGNORECASE)
                hints["selected_car"] = selected
        
        # Handle "book the first/second/third" or "option 1/2/3"
        ordinal_match = re.search(r"\b(the\s+)?(first|second|third|option|number)\s*(\d+)?\b", message, re.IGNORECASE)
        if ordinal_match:
            ordinal = ordinal_match.group(2).lower()
            num = ordinal_match.group(3)
            if num:
                index = int(num) - 1
            else:
                index = {"first": 0, "second": 1, "third": 2}.get(ordinal, 0)
            
            if "flights" in last_results and last_results["flights"]:
                flights = last_results["flights"]
                if 0 <= index < len(flights):
                    selected = flights[index]
                    flight_id = selected.get("id", "unknown")
                    resolved = f"book flight {flight_id}"
                    hints["selected_flight_id"] = flight_id
                    hints["selected_flight"] = selected
        
        # Handle "what about hotels?" - infer destination from flight
        if re.search(r"\b(what|how|tell me|show me)\s+about\s+(hotels?|cars?)\b", message, re.IGNORECASE):
            booked_flight = conversation_context.get("booked_flight")
            if booked_flight:
                destination = booked_flight.get("destination")
                arrival = booked_flight.get("arrival_date")
                departure = booked_flight.get("departure_date")
                if destination:
                    resolved = f"{message} [Context: destination={destination}"
                    if arrival:
                        resolved += f", arrival={arrival}"
                    if departure:
                        resolved += f", departure={departure}"
                    resolved += "]"
                    hints["destination"] = destination
                    hints["arrival_date"] = arrival
                    hints["departure_date"] = departure
        
        return resolved, hints
    
    def _infer_from_journey(
        self,
        message: str,
        journey_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Infer missing context from active journey."""
        hints = {}
        
        # If user asks about hotels/cars without specifying location, use journey destination
        if re.search(r"\b(hotel|car|restaurant|activity)\b", message, re.IGNORECASE):
            if not re.search(r"\b(in|at|near)\s+\w+", message, re.IGNORECASE):
                # No location specified, use journey destination
                destination = journey_context.get("planned_destination") or journey_context.get("destination_city")
                if destination:
                    hints["inferred_destination"] = destination
        
        # If user mentions time without date, use journey timeline
        if re.search(r"\b(when|what time|schedule)\b", message, re.IGNORECASE):
            timeline = journey_context.get("timeline", {})
            if timeline:
                hints["journey_timeline"] = timeline
        
        return hints


def extract_last_search_results(messages: List[Any]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Extract last search results from conversation messages.
    
    Looks for structured data in AI messages (flights, hotels, cars).
    Returns dict with keys: flights, hotels, cars (each a list of items).
    """
    results = {"flights": [], "hotels": [], "cars": []}
    
    # Scan last 10 messages for search results
    for msg in reversed(messages[-10:]):
        if not hasattr(msg, "content") or not msg.content:
            continue
        
        content = msg.content
        
        # Try to parse JSON from message (some agents return structured data)
        try:
            if "```json" in content:
                json_match = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group(1))
                    if "flights" in data:
                        results["flights"] = data["flights"]
                    if "hotels" in data:
                        results["hotels"] = data["hotels"]
                    if "cars" in data:
                        results["cars"] = data["cars"]
        except Exception:
            pass
        
        # Extract flight mentions (fallback pattern)
        if not results["flights"]:
            flight_matches = re.findall(
                r"Flight\s+(\d+)[:\s]+.*?\$?([\d,]+)",
                content,
                re.IGNORECASE,
            )
            if flight_matches:
                results["flights"] = [
                    {"id": fid, "price": float(price.replace(",", ""))}
                    for fid, price in flight_matches[:5]
                ]
    
    return results


def extract_booked_flight(messages: List[Any]) -> Optional[Dict[str, Any]]:
    """
    Extract most recently booked flight from conversation.
    
    Returns dict with: destination, arrival_date, departure_date, flight_number.
    """
    for msg in reversed(messages[-20:]):
        if not hasattr(msg, "content") or not msg.content:
            continue
        
        content = msg.content
        
        # Look for booking confirmation patterns
        if re.search(r"\b(booked|confirmed|reserved|booking reference)\b", content, re.IGNORECASE):
            # Try to extract destination
            dest_match = re.search(r"\bto\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b", content)
            destination = dest_match.group(1) if dest_match else None
            
            # Try to extract dates
            date_matches = re.findall(r"\b(\d{4}-\d{2}-\d{2})\b", content)
            arrival = date_matches[0] if len(date_matches) > 0 else None
            departure = date_matches[1] if len(date_matches) > 1 else None
            
            # Try to extract flight number
            flight_match = re.search(r"\b([A-Z]{2}\d{3,4})\b", content)
            flight_number = flight_match.group(1) if flight_match else None
            
            if destination or arrival or flight_number:
                return {
                    "destination": destination,
                    "arrival_date": arrival,
                    "departure_date": departure,
                    "flight_number": flight_number,
                }
    
    return None


def build_context_for_resolver(
    messages: List[Any],
    journey_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build conversation context for the resolver.
    
    Returns dict with:
    - last_search_results: {flights, hotels, cars}
    - booked_flight: {destination, dates, flight_number}
    - journey_context: active journey data
    """
    return {
        "last_search_results": extract_last_search_results(messages),
        "booked_flight": extract_booked_flight(messages),
        "journey_context": journey_context or {},
    }


# Singleton instance
_resolver = ContextResolver()


def resolve_user_message(
    user_message: str,
    messages: List[Any],
    journey_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Main entry point for context resolution.
    
    Usage:
        result = resolve_user_message("Book it", messages, journey_context)
        resolved_msg = result["resolved_message"]
        trigger = result["trigger_action"]
    """
    conversation_context = build_context_for_resolver(messages, journey_context)
    return _resolver.resolve(user_message, conversation_context, journey_context)
