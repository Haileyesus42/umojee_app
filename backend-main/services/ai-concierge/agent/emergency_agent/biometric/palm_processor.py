"""
Palm Processor – uses the real PalmRecognitionService.
"""
import os
import logging
import tempfile
from pathlib import Path
from typing import Dict, Any, Union, List
import numpy as np

logger = logging.getLogger(__name__)


def to_feature_list(features: Union[np.ndarray, list, None]) -> List[float]:
    """Ensure features are always a plain Python list of floats."""
    if features is None:
        return None
    if isinstance(features, np.ndarray):
        return features.tolist()
    return list(features)


def compute_quality_score(features: Union[np.ndarray, list]) -> float:
    """
    Compute a quality score from feature vector variance.
    Low variance = blank/covered image. High variance = real palm.
    Returns a score between 0.0 and 1.0.
    """
    arr = np.array(features)
    feature_std = float(np.std(arr))
    # Typical real palm: std ~0.3–0.8, blank/covered: std ~0.01–0.05
    score = min(1.0, max(0.0, (feature_std - 0.05) / 0.5))
    return round(score, 4)


# Resolve model path relative to this file
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
_DEFAULT_MODEL_PATH = str(_BACKEND_DIR / "models" / "palmprint_encoder.pth")

# Always import the real service - raise an exception if it's not available
from ..utils.palm_recognition_service import PalmRecognitionService


class PalmProcessor:
    # Minimum quality score to accept an image
    QUALITY_THRESHOLD = 0.1

    def __init__(self, model_path: str = _DEFAULT_MODEL_PATH):
        try:
            self.service = PalmRecognitionService(model_path=model_path)
            logger.info(f"PalmRecognitionService loaded from {model_path}")
        except Exception as e:
            logger.error(f"Failed to load PalmRecognitionService: {e}")
            raise RuntimeError(f"Critical error: PalmRecognitionService could not be initialized: {e}")

    def extract_features(self, image_data: bytes) -> Dict[str, Any]:
        """Extract palm features from image bytes."""
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_data)
            tmp_path = tmp.name

        try:
            features = self.service.extract_features(tmp_path)
            if features is None:
                return {
                    "features": None,
                    "quality_score": 0.0,
                    "message": "Feature extraction failed — no palm detected"
                }
                
            features_list = to_feature_list(features)
            quality = compute_quality_score(features_list)
            
            if quality < 0.1:  # Using the same quality threshold as before
                logger.warning(f"Palm image rejected — quality score too low: {quality}")
                return {
                    "features": None,
                    "quality_score": quality,
                    "message": f"Image quality too low ({quality:.2f}) — ensure palm is clearly visible and well-lit"
                }
                
            return {
                "features": features_list,
                "quality_score": quality,
                "message": "Palm features extracted"
            }
        except Exception as e:
            logger.error(f"Palm feature extraction error: {e}")
            return {
                "features": None,
                "quality_score": 0.0,
                "message": str(e)
            }
        finally:
            os.unlink(tmp_path)

    def verify(self, template_data: bytes) -> Dict[str, Any]:
        return {"message": "Use verify_from_server"}

    def verify_from_server(self, template1_b64: str, template2_b64: str) -> Dict[str, Any]:
        """Compare two base64-encoded palm templates (JSON arrays)."""
        import base64
        import json

        t1 = np.array(json.loads(base64.b64decode(template1_b64).decode()))
        t2 = np.array(json.loads(base64.b64decode(template2_b64).decode()))

        # Cosine similarity
        dot = float(np.dot(t1, t2))
        norm = float(np.linalg.norm(t1) * np.linalg.norm(t2))
        similarity = dot / (norm + 1e-8)

        threshold = 0.8  # Updated from 0.97 to 0.8 for consistency
        return {
            "is_match": bool(similarity >= threshold),
            "confidence": float(similarity),
            "threshold": threshold,
            "message": "Match" if similarity >= threshold else "No match"
        }