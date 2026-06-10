"""
Face Server – wrapper around FaceProcessor for API layer.
"""

import logging
from typing import Dict, Any
from agent.biometric.face_processor import FaceProcessor

logger = logging.getLogger(__name__)


class FaceServer:
    def __init__(self):
        self.face_processor = FaceProcessor()

    def process_face(self, image_data: bytes, operation: str = "extract-embedding") -> Dict[str, Any]:
        """
        Route face operations to the processor.
        Supported operations: extract-embedding, liveness, verify.
        """
        if operation == "extract-embedding":
            return self.face_processor.extract_embedding(image_data)
        elif operation == "verify":
            return self.face_processor.verify(image_data)
        elif operation == "liveness":
            return self.face_processor.check_liveness(image_data)
        else:
            raise ValueError(f"Unknown face operation: {operation}")

    def verify(self, embedding1: str, embedding2: str) -> Dict[str, Any]:
        """Verify two embeddings (base64‑encoded JSON strings)."""
        return self.face_processor.verify_from_server(embedding1, embedding2)