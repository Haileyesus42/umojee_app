"""
Messaging Server Module
Handles communication/messaging API endpoints
"""
import os
import sys
from typing import Dict, Any
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class MessagingServer:
    """Handles messaging operations"""
    
    def __init__(self):
        """Initialize messaging server"""
        # Import messaging processor from the agent
        from agent.emergency_agent.communication.messaging_agent import MessagingProcessor
        self.messaging_processor = MessagingProcessor()
    
    def process_message(self, operation: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process communication operations"""
        try:
            return self.messaging_processor.process_message(operation, data)
        except Exception as e:
            logger.error(f"Error processing messaging operation: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))