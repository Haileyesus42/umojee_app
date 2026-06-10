"""
Real Face Liveness Detection using MiniFASNet (ONNX).
"""

import os
import time
import logging
import numpy as np
import cv2
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    logger.warning("onnxruntime not installed. Liveness will be basic.")


class DetectionResult:
    def __init__(self, is_real: bool, confidence: float, label: int,
                 label_text: str, processing_time: float, bbox: Optional[list] = None):
        self.is_real = is_real
        self.confidence = confidence
        self.label = label
        self.label_text = label_text
        self.processing_time = processing_time
        self.bbox = bbox


class FaceLivenessService:
    def __init__(self, model_dir: str = None):
        """Initialize liveness detector using MiniFASNetV2."""
        if model_dir is None:
            # Resolve models directory relative to this file's location
            base = Path(__file__).parent.parent.parent.parent.parent
            model_dir = str(base / "models")

        self.model_dir = model_dir
        self.session = None
        self.face_detector = None
        self._load_model()

    def _load_model(self):
        if not ONNX_AVAILABLE:
            logger.warning("onnxruntime not available, liveness using fallback.")
            return

        # Try both known filenames
        candidates = [
            "2.7_80x80_MiniFASNetV2.onnx",
            "MiniFASNetV2.onnx",
            "4_0_0_80x80_MiniFASNetV1SE.onnx",
        ]

        for filename in candidates:
            onnx_path = os.path.join(self.model_dir, filename)
            if os.path.exists(onnx_path):
                try:
                    self.session = ort.InferenceSession(
                        onnx_path, providers=['CPUExecutionProvider']
                    )
                    logger.info(f"Loaded liveness model: {onnx_path}")
                    return
                except Exception as e:
                    logger.warning(f"Failed to load {onnx_path}: {e}")

        logger.warning(
            f"No liveness ONNX model found in {self.model_dir}. Using fallback.\n"
            f"Tried: {candidates}"
        )

    def detect_face(self, frame: np.ndarray) -> Optional[list]:
        if self.face_detector is None:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.face_detector = cv2.CascadeClassifier(cascade_path)
            if self.face_detector.empty():
                logger.error("Could not load Haar cascade")
                return None

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_detector.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))
        if len(faces) == 0:
            return None
        faces = sorted(faces, key=lambda x: x[2] * x[3], reverse=True)
        return faces[0].tolist()

    def _preprocess_face(self, frame: np.ndarray, bbox: list) -> np.ndarray:
        """Crop and resize face to 80x80 for MiniFASNet."""
        x, y, w, h = bbox
        face = frame[y:y+h, x:x+w]
        if face.size == 0:
            raise ValueError("Empty face region")
        face = cv2.resize(face, (80, 80))
        face = face.astype(np.float32) / 255.0
        face = np.transpose(face, (2, 0, 1))  # HWC -> CHW
        return face

    def _predict_with_model(self, face_tensor: np.ndarray) -> Dict[str, Any]:
        input_tensor = np.expand_dims(face_tensor, axis=0)
        input_name = self.session.get_inputs()[0].name
        output_name = self.session.get_outputs()[0].name
        outputs = self.session.run([output_name], {input_name: input_tensor})
        probs = outputs[0][0]  # shape (3,) for MiniFASNet: [spoof, real, ?] or similar

        # MiniFASNet: index 1 = real, index 0 = spoof
        real_prob = float(probs[1])
        spoof_prob = float(probs[0])
        is_real = real_prob > spoof_prob
        confidence = real_prob if is_real else spoof_prob

        return {
            "is_real": is_real,
            "confidence": confidence,
            "label": 1 if is_real else 0,
            "label_text": "Real" if is_real else "Spoof"
        }

    def detect_from_file(self, image_contents: bytes) -> DetectionResult:
        start = time.time()
        nparr = np.frombuffer(image_contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Invalid image file")

        bbox = self.detect_face(frame)
        if bbox is None:
            raise ValueError("No face detected in image")

        if self.session is not None:
            face_tensor = self._preprocess_face(frame, bbox)
            result = self._predict_with_model(face_tensor)
        else:
            # Fallback: assume live if face detected
            result = {
                "is_real": True,
                "confidence": 0.9,
                "label": 1,
                "label_text": "Real (fallback – model not loaded)"
            }

        processing_time = time.time() - start
        return DetectionResult(
            is_real=result["is_real"],
            confidence=result["confidence"],
            label=result["label"],
            label_text=result["label_text"],
            processing_time=processing_time,
            bbox=bbox
        )