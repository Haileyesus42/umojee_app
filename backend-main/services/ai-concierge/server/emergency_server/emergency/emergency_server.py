"""
Emergency Server Module
Handles emergency-related API endpoints
"""
import os
import sys
from typing import Dict, Any
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class EmergencyServer:
    """Handles emergency-related operations"""
    
    def __init__(self):
        """Initialize emergency server"""
        # Import emergency agents from the agent using relative imports
        # Since this is running from the ai-concierge directory, we need to import from agent
        try:
            from agent.emergency_agent.emergency.alert_system import AlertProcessor
            from agent.emergency_agent.emergency.emergency_protocol import EmergencyProtocolAgent
            self.alert_processor = AlertProcessor()
            self.emergency_protocol_agent = EmergencyProtocolAgent()
        except ImportError as e:
            logger.error(f"Failed to import emergency modules: {e}")
            raise
    
    def process_alert(self, operation: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process emergency operations"""
        try:
            return self.alert_processor.process_alert(operation, data)
        except Exception as e:
            logger.error(f"Error processing emergency operation: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    def trigger_emergency_protocol(self, db: Any, user_id: int, emergency_data: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger emergency protocol for a user"""
        try:
            return self.emergency_protocol_agent.trigger_emergency_protocol(db, user_id, emergency_data)
        except Exception as e:
            logger.error(f"Error triggering emergency protocol: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))