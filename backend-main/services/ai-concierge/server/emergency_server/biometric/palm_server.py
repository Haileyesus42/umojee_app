"""
Palm Server Module
Handles palm-related biometric API endpoints
"""
import os
import sys
from typing import Dict, Any
import logging
import base64
import json

logger = logging.getLogger(__name__)

class PalmServer:
    """Handles palm-related biometric operations"""
    
    def __init__(self):
        """Initialize palm server"""
        # Import the palm processor from the agent
        from agent.biometric.palm_processor import PalmProcessor
        self.palm_processor = PalmProcessor()
    
    def process_palm(self, image_data: bytes, operation: str = "extract-features") -> Dict[str, Any]:
        """Process palm biometric data"""
        if operation == "extract-features":
            return self.palm_processor.extract_features(image_data)
        elif operation == "verify":
            return self.palm_processor.verify(image_data)
        else:
            raise ValueError(f"Unknown palm operation: {operation}")
    
    def verify(self, template1: str, template2: str) -> Dict[str, Any]:
        """Verify two palm templates match"""
        return self.palm_processor.verify_from_server(template1, template2)