import logging
import json
from typing import Dict, List, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class WebSocketManager:
    """
    Manages WebSocket connections for real-time journey updates.
    """
    def __init__(self):
        # Maps journey_id -> list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, journey_id: str):
        """Accept a new WebSocket connection for a journey."""
        await websocket.accept()
        if journey_id not in self.active_connections:
            self.active_connections[journey_id] = []
        self.active_connections[journey_id].append(websocket)
        logger.info(f"WebSocket connected for journey {journey_id}. Total: {len(self.active_connections[journey_id])}")

    def disconnect(self, websocket: WebSocket, journey_id: str):
        """Handle WebSocket disconnection."""
        if journey_id in self.active_connections:
            if websocket in self.active_connections[journey_id]:
                self.active_connections[journey_id].remove(websocket)
            
            if not self.active_connections[journey_id]:
                del self.active_connections[journey_id]
        logger.info(f"WebSocket disconnected for journey {journey_id}")

    async def broadcast_to_journey(self, journey_id: str, message: Any):
        """Send a message to all active WebSockets for a specific journey."""
        if journey_id not in self.active_connections:
            return

        payload = message
        if not isinstance(message, str):
            payload = json.dumps(message, default=str)

        disconnected_sockets = []
        for websocket in self.active_connections[journey_id]:
            try:
                await websocket.send_text(payload)
            except Exception as e:
                logger.error(f"Error sending WebSocket message to {journey_id}: {e}")
                disconnected_sockets.append(websocket)

        # Cleanup failed connections
        for websocket in disconnected_sockets:
            self.disconnect(websocket, journey_id)

# Global instances (can be injected via app.state)
ws_manager = WebSocketManager()
