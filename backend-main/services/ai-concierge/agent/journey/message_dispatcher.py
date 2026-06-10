import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from .phase_1_foundation.journey_models import JourneyMessage, MessageType
from server.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

class MessageDispatcher:
    """
    Centralized dispatcher for journey messages.
    Handles deduplication, cooldowns, persistence, and broadcasting.
    """
    def __init__(self, state_manager: Any, websocket_manager: Optional[Any] = None):
        self.state_manager = state_manager
        self.ws_manager = websocket_manager or ws_manager
        # (Optional) Add deduplication/cooldown cache here

    async def dispatch(self, journey_id: str, message: JourneyMessage) -> bool:
        """
        Dispatch a message to the user.
        
        Steps:
        1. Persist to journey state
        2. Broadcast via WebSocket
        """
        try:
            # 1. Persist to journey state
            journey = self.state_manager.get_journey(journey_id)
            if journey:
                # Add message to journey's messages list
                if not hasattr(journey, "messages") or journey.messages is None:
                    journey.messages = []
                
                journey.messages.append(message)
                self.state_manager._persist_journey(journey)
                logger.info(f"Persisted message {message.id} for journey {journey_id}")

            # 2. Broadcast via WebSocket
            if self.ws_manager:
                payload = {
                    "type": "journey_message",
                    "journey_id": journey_id,
                    "message": message.model_dump() if hasattr(message, "model_dump") else message.dict()
                }
                await self.ws_manager.broadcast_to_journey(journey_id, payload)
                logger.info(f"Broadcasted message {message.id} to journey {journey_id}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to dispatch message: {e}")
            return False

    async def dispatch_many(self, journey_id: str, messages: List[JourneyMessage]) -> int:
        """Dispatch multiple messages."""
        count = 0
        for msg in messages:
            if await self.dispatch(journey_id, msg):
                count += 1
        return count

# Global instance initialization is usually done in main.py or journey_orchestrator.py
