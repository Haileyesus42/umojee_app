"""
Voice Processor Module
Contains voice processing functionality
"""

import os
import numpy as np
import base64
import json
from typing import Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

class VoiceProcessor:
    """Voice processing functionality"""
    
    def extract_features(self, audio_data: bytes) -> Dict[str, Any]:
        """Extract voice features from audio.

        Not yet implemented — a real voice recognition model is required.
        Returns an error result rather than random data so callers can
        surface a meaningful failure instead of silently accepting any audio.
        """
        logger.error("VoiceProcessor.extract_features is not implemented; voice biometric is unavailable")
        return {
            "features": [],
            "quality_score": 0.0,
            "voice_detected": False,
            "message": "Voice biometric is not yet implemented"
        }
    
    def verify_from_server(self, features1: str, features2: str) -> Dict[str, Any]:
        """Verify two voice feature sets match - called from server"""
        try:
            # Decode the base64 encoded features
            feats1_bytes = base64.b64decode(features1)
            feats2_bytes = base64.b64decode(features2)
            features1_array = json.loads(feats1_bytes.decode('utf-8'))
            features2_array = json.loads(feats2_bytes.decode('utf-8'))
            
            # Calculate cosine similarity between feature sets
            arr1 = np.array(features1_array)
            arr2 = np.array(features2_array)
            
            # Compute cosine similarity
            dot_product = np.dot(arr1, arr2)
            norm1 = np.linalg.norm(arr1)
            norm2 = np.linalg.norm(arr2)
            
            if norm1 == 0 or norm2 == 0:
                similarity = 0.0
            else:
                similarity = dot_product / (norm1 * norm2)
            
            # Determine if match based on threshold
            threshold = 0.7
            is_match = float(similarity) > threshold
            
            return {
                "is_match": is_match,
                "confidence": float(similarity),
                "threshold_used": threshold,
                "message": f"Voice verification {'successful' if is_match else 'failed'}"
            }
        except Exception as e:
            logger.error(f"Error verifying voice features: {str(e)}")
            raise
    
    def verify(self, features_data: bytes) -> Dict[str, Any]:
        """Verify voice - general method for internal use"""
        # This would typically handle verification with raw data
        # For now, returning a placeholder
        return {
            "is_match": False,
            "confidence": 0.0,
            "threshold_used": 0.7,
            "message": "Verification method not implemented for raw data"
        }