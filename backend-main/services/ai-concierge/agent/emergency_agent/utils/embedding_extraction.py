from typing import List, Optional

import numpy as np

from uniface.recognition.adaface import AdaFace, AdaFaceWeights


class EmbeddingExtractor:
    def __init__(self):
        self._model: Optional[AdaFace] = None

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        self._model = AdaFace(model_name=AdaFaceWeights.IR_101)

    def extract_embedding(
        self,
        face_image: np.ndarray,
        landmarks: Optional[np.ndarray] = None,
        augment: bool = False,  # kept for API compat, unused
    ) -> Optional[List[float]]:
        """
        Extract a 512-dim L2-normalized face embedding via uniface AdaFace IR101.

        Args:
            face_image: Full BGR image. Pass landmarks so uniface does its own alignment.
            landmarks:  5-point (5,2) float32 array in pixel coords.
        """
        try:
            self._ensure_loaded()
            embedding = self._model.get_normalized_embedding(face_image, landmarks)
            return embedding.astype(np.float32).tolist()
        except Exception as e:
            print(f"Error extracting embedding: {e}")
            return None
