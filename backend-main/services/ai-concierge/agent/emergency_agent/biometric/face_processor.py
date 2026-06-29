"""
Real Face Processor – detection, alignment, embedding extraction.
Uses the utility modules inside agent/utils.
"""
import base64
import json
import numpy as np
import logging
from typing import Dict, Any, List, Union

try:
    import cv2
except ImportError:
    cv2 = None

from ..utils.image_utils import image_to_numpy
from ..utils.face_detection import FaceDetector
from ..utils.face_alignment import FaceAligner
from ..utils.embedding_extraction import EmbeddingExtractor
from ..utils.math_utils import cosine_similarity
from ..utils.face_liveness_service import FaceLivenessService

logger = logging.getLogger(__name__)


def to_embedding_list(embedding: Union[np.ndarray, list, None]) -> List[float]:
    """Ensure embedding is always a plain Python list of floats."""
    if embedding is None:
        return []
    if isinstance(embedding, np.ndarray):
        return embedding.tolist()
    return list(embedding)


class FaceProcessor:
    def __init__(self):
        self.detector = FaceDetector()
        self.aligner = FaceAligner()
        self.extractor = EmbeddingExtractor()   # lazy: uniface IR101 loads on first extract
        self._liveness_service: FaceLivenessService | None = None
        self.similarity_threshold = 0.25

    @property
    def liveness_service(self) -> FaceLivenessService:
        if self._liveness_service is None:
            self._liveness_service = FaceLivenessService()
        return self._liveness_service

    def extract_embedding(self, image_data: bytes) -> Dict[str, Any]:
        try:
            image = image_to_numpy(image_data)

            landmarks = self.detector.detect_face(image)
            if landmarks is None:
                return {
                    "embedding": None,
                    "face_detected": False,
                    "quality_score": 0.0,
                    "message": "No face detected"
                }

            aligned = self.aligner.align_face(image, landmarks)
            if aligned is None:
                return {
                    "embedding": None,
                    "face_detected": False,
                    "quality_score": 0.0,
                    "message": "Alignment failed"
                }

            embedding = self.extractor.extract_embedding(image, landmarks)
            if embedding is None:
                return {
                    "embedding": None,
                    "face_detected": False,
                    "quality_score": 0.0,
                    "message": "Embedding extraction failed"
                }

            # Normalize to plain list regardless of what extractor returns
            embedding_list = to_embedding_list(embedding)

            # Estimate sharpness from the aligned image using Laplacian variance
            if cv2 is not None:
                gray = cv2.cvtColor(aligned, cv2.COLOR_BGR2GRAY) if len(aligned.shape) == 3 else aligned
                lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
                quality = min(0.95, 0.5 + min(lap_var / 1000.0, 0.45))
            else:
                quality = 0.75  # cv2 unavailable — use neutral default

            return {
                "embedding": embedding_list,
                "face_detected": True,
                "quality_score": round(quality, 4),
                "message": "Success"
            }

        except Exception as e:
            logger.error(f"Face extraction error: {e}")
            return {
                "embedding": None,
                "face_detected": False,
                "quality_score": 0.0,
                "message": str(e)
            }

    def check_liveness(self, image_data: bytes) -> Dict[str, Any]:
        try:
            detection = self.liveness_service.detect_from_file(image_data)
            return {
                "is_live": bool(detection.is_real),
                "confidence": float(detection.confidence),
                "message": detection.label_text,
            }
        except ValueError as e:
            return {"is_live": False, "confidence": 0.0, "message": str(e)}
        except Exception as e:
            logger.error(f"Liveness check error: {e}")
            return {"is_live": False, "confidence": 0.0, "message": "Liveness check failed"}

    def verify_from_server(self, emb1_b64: str, emb2_b64: str) -> Dict[str, Any]:
        try:
            emb1 = np.array(json.loads(base64.b64decode(emb1_b64).decode()))
            emb2 = np.array(json.loads(base64.b64decode(emb2_b64).decode()))
        except Exception as e:
            logger.error(f"Embedding decode error: {e}")
            raise ValueError("Invalid embedding data") from None
        try:
            similarity = cosine_similarity(emb1, emb2)
            is_match = bool(similarity >= self.similarity_threshold)
            return {
                "is_match": is_match,
                "confidence": float(similarity),
                "threshold": self.similarity_threshold,
                "message": "Match" if is_match else "No match"
            }
        except Exception as e:
            logger.error(f"Verify error: {e}")
            raise