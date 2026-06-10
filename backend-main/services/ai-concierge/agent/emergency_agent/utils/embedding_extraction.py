import os
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
import onnxruntime as ort

# Simple config to replace the import
class Config:
    MODEL_PATH = "models/adaface_ir18.onnx"

settings = Config()


class EmbeddingExtractor:
    def __init__(self, model_path: str = settings.MODEL_PATH):
        resolved_model_path = self._resolve_model_path(model_path)

        if not resolved_model_path.exists():
            raise FileNotFoundError(
                f"Model file not found at: {resolved_model_path}\n"
                f"Original path from settings: {model_path}\n"
                f"To fix this issue:\n"
                f"1. Make sure you have the adaface_ir18.onnx model file\n"
                f"2. Place it in the correct directory: {resolved_model_path.parent}\n"
                f"3. You can download the model from the AdaFace repository or convert from PyTorch checkpoint\n"
                f"4. Run python download_models.py for more information"
            )

        self.session = ort.InferenceSession(str(resolved_model_path))
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name  # 'embedding'

    def _resolve_model_path(self, model_path: str) -> Path:
        if os.path.isabs(model_path):
            return Path(model_path)
        # Resolve relative path from the backend directory
        backend_dir = Path(__file__).parent.parent.parent.parent.parent
        return backend_dir / model_path

    def extract_embedding(self, face_image: np.ndarray) -> Optional[List[float]]:
        """
        Extract face embedding using AdaFace ONNX model.

        Args:
            face_image: Aligned face image (any size — will be resized to 80x80)

        Returns:
            Normalized embedding as a plain Python list of floats,
            or None if extraction fails.
        """
        try:
            input_tensor = self._preprocess(face_image)
            embedding = self.session.run(
                [self.output_name], {self.input_name: input_tensor}
            )[0][0]

            # Normalize to unit vector
            normalized = embedding / np.linalg.norm(embedding)

            # Convert to plain Python list so FastAPI can serialize it
            return normalized.astype(np.float32).tolist()

        except Exception as e:
            print(f"Error extracting embedding: {str(e)}")
            return None

    def _preprocess(self, image: np.ndarray) -> np.ndarray:
        """Resize, normalize, and format image for the ONNX model."""
        target_size = (160, 160)  # (width, height) for cv2.resize — model expects 160x160

        if image.shape[:2] != (target_size[1], target_size[0]):
            image = cv2.resize(image, target_size)

        # Convert BGR to RGB
        if len(image.shape) == 3 and image.shape[2] == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Normalize to [-1, 1]
        image = image.astype(np.float32) / 127.5 - 1.0

        # HWC -> CHW, add batch dimension
        image = np.transpose(image, (2, 0, 1))
        image = np.expand_dims(image, axis=0)

        return image

    def __del__(self):
        if hasattr(self, 'session'):
            del self.session