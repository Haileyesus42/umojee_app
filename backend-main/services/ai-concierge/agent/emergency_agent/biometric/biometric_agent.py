"""
Biometric Agent Module
Contains the core biometric processing logic
"""

import os
import numpy as np
import base64
import json
from typing import Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

class BiometricAgent:
    """Core biometric processing class"""
    
    def __init__(self):
        """Initialize biometric agent"""
        self.face_processor = None
        self.palm_processor = None
        self.voice_processor = None
    
    def initialize_processors(self):
        """Initialize the biometric processors"""
        from agent.biometric.face_processor import FaceProcessor
        from agent.biometric.palm_processor import PalmProcessor
        from agent.biometric.voice_processor import VoiceProcessor
        
        self.face_processor = FaceProcessor()
        self.palm_processor = PalmProcessor()
        self.voice_processor = VoiceProcessor()
    
    def process_face(self, image_data: bytes, operation: str = "extract-embedding") -> Dict[str, Any]:
        """Process face biometric data"""
        if self.face_processor is None:
            self.initialize_processors()
        
        if operation == "extract-embedding":
            return self.face_processor.extract_embedding(image_data)
        elif operation == "verify":
            return self.face_processor.verify(image_data)
        elif operation == "liveness":
            return self.face_processor.check_liveness(image_data)
        else:
            raise ValueError(f"Unknown face operation: {operation}")
    
    def process_palm(self, image_data: bytes, operation: str = "extract-features") -> Dict[str, Any]:
        """Process palm biometric data"""
        if self.palm_processor is None:
            self.initialize_processors()
        
        if operation == "extract-features":
            return self.palm_processor.extract_features(image_data)
        elif operation == "verify":
            return self.palm_processor.verify(image_data)
        else:
            raise ValueError(f"Unknown palm operation: {operation}")
    
    def process_voice(self, audio_data: bytes, operation: str = "extract-features") -> Dict[str, Any]:
        """Process voice biometric data"""
        if self.voice_processor is None:
            self.initialize_processors()
        
        if operation == "extract-features":
            return self.voice_processor.extract_features(audio_data)
        elif operation == "verify":
            return self.voice_processor.verify(audio_data)
        else:
            raise ValueError(f"Unknown voice operation: {operation}")