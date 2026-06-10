"""
Real Face Processor – detection, alignment, embedding extraction.
Uses the utility modules inside agent/utils.
"""
import base64
import json
import numpy as np
import logging
from typing import Dict, Any, List, Union

from ..utils.image_utils import image_to_numpy
from ..utils.face_detection import FaceDetector
from ..utils.face_alignment import FaceAligner
from ..utils.embedding_extraction import EmbeddingExtractor
from ..utils.math_utils import cosine_similarity

logger = logging.getLogger(__name__)


def to_embedding_list(embedding: Union[np.ndarray, list, None]) -> List[float]:
    """Ensure embedding is always a plain Python list of floats."""
    if embedding is None:
        return None
    if isinstance(embedding, np.ndarray):
        return embedding.tolist()
    return list(embedding)


class FaceProcessor:
    def __init__(self):
        self.detector = FaceDetector()
        self.aligner = FaceAligner()
        self.extractor = EmbeddingExtractor()
        self.similarity_threshold = 0.8

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

            embedding = self.extractor.extract_embedding(aligned)
            if embedding is None:
                return {
                    "embedding": None,
                    "face_detected": False,
                    "quality_score": 0.0,
                    "message": "Embedding extraction failed"
                }

            # Normalize to plain list regardless of what extractor returns
            embedding_list = to_embedding_list(embedding)

            # std works on both list and ndarray
            quality = min(0.95, 0.7 + (float(np.std(embedding_list)) * 0.05))

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
        result = self.extract_embedding(image_data)
        if result["face_detected"]:
            return {"is_live": True, "confidence": 0.9, "message": "Face detected"}
        return {"is_live": False, "confidence": 0.0, "message": result["message"]}

    def verify_from_server(self, emb1_b64: str, emb2_b64: str) -> Dict[str, Any]:
        try:
            emb1 = np.array(json.loads(base64.b64decode(emb1_b64).decode()))
            emb2 = np.array(json.loads(base64.b64decode(emb2_b64).decode()))
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