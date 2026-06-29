import cv2
import numpy as np
from typing import Optional, Tuple, List

# Simple config class to replace the import
class Config:
    FACE_DETECTION_THRESHOLD = 0.5

settings = Config()

import mediapipe as mp

# Determine which MediaPipe API to use (new vs old)
USE_NEW_API = False
MODEL_PATH = None
vision = None  # To hold the resolved vision module safely

try:
    import os
    # Try importing vision from standard tasks namespace, fallback to python layout
    try:
        from mediapipe.tasks import vision
    except ImportError:
        from mediapipe.tasks.python import vision
        
    # Dynamically locate the folder containing this specific script file
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Try to find the model file (including your absolute same-directory root path)
    possible_paths = [
        os.path.join(SCRIPT_DIR, "blaze_face_short_range.tflite"),
        "services/ai_concierge/models/blaze_face_short_range.tflite",
        "./models/blaze_face_short_range.tflite",
        "../models/blaze_face_short_range.tflite",
        "../../models/blaze_face_short_range.tflite",
        "blaze_face_short_range.tflite"
    ]
    for path in possible_paths:
        if os.path.exists(path):
            MODEL_PATH = path
            break
        
    if MODEL_PATH is not None and vision is not None:
        USE_NEW_API = True
except (ImportError, Exception):
    pass


class FaceDetector:
    def __init__(self):
        self.use_new_api = USE_NEW_API and MODEL_PATH is not None
        self.detector = None
        
        if self.use_new_api:
            try:
                # Handle varying sub-namespaces safely
                try:
                    from mediapipe.tasks import python
                except ImportError:
                    from mediapipe.tasks.python import python
                    
                base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
                self.detector = vision.FaceDetector.create_from_options(
                    vision.FaceDetectorOptions(
                        base_options=base_options,
                        running_mode=vision.RunningMode.IMAGE,
                        min_detection_confidence=settings.FACE_DETECTION_THRESHOLD
                    )
                )
            except Exception as e:
                print(f"Failed to initialize new MediaPipe API: {e}. Cannot fallback because legacy solutions API is removed.")
                self.use_new_api = False

    def detect_face(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Detect a single face in the image and return 5 key landmarks (left eye, right eye, nose, left mouth, right mouth).
        Returns None if no face or multiple faces.
        """
        if self.use_new_api and self.detector is not None:
            # New API – face detection only (no landmark mesh)
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
            detection_result = self.detector.detect(mp_image)
            
            # Safe check for no detections or multiple faces
            if not detection_result.detections or len(detection_result.detections) > 1:
                return None

            detection = detection_result.detections[0]

            # MediaPipe FaceDetector key_points order:
            # 0=right_eye, 1=left_eye, 2=nose_tip, 3=mouth_center,
            # 4=right_ear_tragion, 5=left_ear_tragion
            kps = getattr(detection, 'key_points', None) or getattr(detection, 'keypoints', None)
            if kps and len(kps) >= 4:
                h_img, w_img = image.shape[:2]
                landmarks = np.array([
                    [kps[1].x * w_img, kps[1].y * h_img],  # left eye
                    [kps[0].x * w_img, kps[0].y * h_img],  # right eye
                    [kps[2].x * w_img, kps[2].y * h_img],  # nose
                    [kps[3].x * w_img + (kps[1].x - kps[0].x) * w_img * 0.15,
                     kps[3].y * h_img],                     # left mouth corner
                    [kps[3].x * w_img - (kps[1].x - kps[0].x) * w_img * 0.15,
                     kps[3].y * h_img],                     # right mouth corner
                ], dtype=np.float32)
                return landmarks

            # Fallback: key_points unavailable — approximate from bounding box
            # (less accurate but better than nothing)
            bbox = detection.bounding_box
            x, y, w, h = bbox.origin_x, bbox.origin_y, bbox.width, bbox.height
            landmarks = np.array([
                [x + w * 0.35, y + h * 0.35],
                [x + w * 0.65, y + h * 0.35],
                [x + w * 0.50, y + h * 0.55],
                [x + w * 0.35, y + h * 0.72],
                [x + w * 0.65, y + h * 0.72],
            ], dtype=np.float32)
            return landmarks

        return None

    def __del__(self):
        if hasattr(self, 'detector') and self.detector is not None:
            try:
                self.detector.close()
            except:
                pass
