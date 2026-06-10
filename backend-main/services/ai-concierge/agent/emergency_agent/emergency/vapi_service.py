from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from ..core.base_agent import BaseAgent
import logging
import json
from datetime import datetime
import httpx
from urllib.parse import urlparse

# Import the settings
from ...core.config import settings

logger = logging.getLogger(__name__)


class VAPIServiceAgent(BaseAgent):
    """Agent for VAPI service integration"""
    
    def __init__(self):
        self.initialized = False
        self.api_key = getattr(settings, 'VAPI_API_KEY', None)
        self.base_url = getattr(settings, 'VAPI_BASE_URL', 'https://api.vapi.ai')

    def initialize(self, config: dict = None) -> bool:
        """Initialize VAPI service agent"""
        try:
            if config:
                self.api_key = config.get('api_key', self.api_key)
                self.base_url = config.get('base_url', self.base_url)
            
            # If not provided in config, try to get from settings
            if not self.api_key:
                self.api_key = getattr(settings, 'VAPI_API_KEY', None)
            
            # Validate configuration
            if not self.api_key:
                logger.warning("VAPI API key not provided in config or settings")
            
            self.initialized = True
            logger.info("VAPIServiceAgent initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize VAPIServiceAgent: {str(e)}")
            return False

    def health_check(self) -> dict:
        """Return health status of the agent"""
        return {
            "status": "healthy" if self.initialized else "unhealthy",
            "api_key_set": bool(self.api_key),
            "type": "vapi_service"
        }

    async def process_vapi_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a VAPI request"""
        if not self.initialized:
            raise RuntimeError("Agent not initialized")
            
        try:
            # Process the VAPI request
            processed_data = await self._process_vapi_request(request_data)
            
            return {
                "status": "success",
                "data": processed_data,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error processing VAPI request: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    async def _process_vapi_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Internal method to process the VAPI request"""
        # Placeholder implementation - would contain actual VAPI integration logic
        # This could involve making API calls to VAPI service, handling responses, etc.
        
        # Return the processed data
        result = {
            "original_request": request_data,
            "processed_at": datetime.utcnow().isoformat(),
            "status": "processed",
            "vapi_integration": "pending_actual_implementation"
        }
        
        return result

    async def make_emergency_call(self, call_data: Dict[str, Any]) -> Dict[str, Any]:
        """Make an emergency call using VAPI"""
        if not self.initialized:
            raise RuntimeError("Agent not initialized")
            
        try:
            # Implementation for making emergency calls
            # This would typically involve calling the actual VAPI service
            call_result = await self._make_call(call_data)
            
            return {
                "status": "success",
                "call_id": call_result.get("call_id"),
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error making emergency call: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    async def _make_call(self, call_data: Dict[str, Any]) -> Dict[str, Any]:
        """Internal method to make the actual call"""
        # This is a placeholder implementation
        # In a real implementation, this would make actual API calls to VAPI
        return {
            "call_id": f"call_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "status": "initiated",
            "destination": call_data.get("to", "unknown")
        }


# Standalone function that matches the expected interface in main.py
async def make_emergency_call(phone_number: str, traveler: Dict[str, Any], sos_data: Dict[str, Any], 
                             trip_data: Dict[str, Any], contact_data: Dict[str, Any], 
                             user_id: int, contact_id: int) -> Dict[str, Any]:
    """
    Standalone function to make an emergency call using VAPI.
    This function matches the interface expected by main.py
    """
    agent = VAPIServiceAgent()
    agent.initialize()
    
    # Construct the call data in the format expected by the class method
    call_data = {
        "phone_number": phone_number,
        "traveler": traveler,
        "sos_data": sos_data,
        "trip_data": trip_data,
        "contact_data": contact_data,
        "user_id": user_id,
        "contact_id": contact_id
    }
    
    return await agent.make_emergency_call(call_data)