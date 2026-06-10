"""
Voice Server Module
Handles voice-related biometric API endpoints
"""
import os
import sys
from typing import Dict, Any
import logging
import base64
import json

logger = logging.getLogger(__name__)

class VoiceServer:
    """Handles voice-related biometric operations"""
    
    def __init__(self):
        """Initialize voice server"""
        # Import the voice processor from the agent
        from agent.biometric.voice_processor import VoiceProcessor
        self.voice_processor = VoiceProcessor()
    
    def process_voice(self, audio_data: bytes, operation: str = "extract-features") -> Dict[str, Any]:
        """Process voice biometric data"""
        if operation == "extract-features":
            return self.voice_processor.extract_features(audio_data)
        elif operation == "verify":
            return self.voice_processor.verify(audio_data)
        else:
            raise ValueError(f"Unknown voice operation: {operation}")
    
    def verify(self, features1: str, features2: str) -> Dict[str, Any]:
        """Verify two voice feature sets match"""
        return self.voice_processor.verify_from_server(features1, features2)