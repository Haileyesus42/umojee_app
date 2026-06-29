import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

TARGET_SIZE = (138, 138)   # Final size fed to the encoder
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID_SIZE = (5, 5)
_clahe = cv2.createCLAHE(CLAHE_CLIP_LIMIT, CLAHE_TILE_GRID_SIZE)

# ---------------------------------------------------------------------------
# MediaPipe Hands — used to find the palm ROI without relying on background
# ---------------------------------------------------------------------------
try:
    import mediapipe as mp
    _mp_hands = mp.solutions.hands
    _hands_detector = _mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=0.5,
    )
    _MEDIAPIPE_AVAILABLE = True
except Exception as _e:
    logger.warning(f"MediaPipe Hands unavailable: {_e}. Falling back to contour method.")
    _hands_detector = None
    _MEDIAPIPE_AVAILABLE = False


def _extract_roi_mediapipe(bgr_image: np.ndarray):
    """
    Use MediaPipe Hands to locate the palm and return a square crop of the
    wrist-to-fingertip region.  Returns None if no hand is detected.
    """
    rgb = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
    result = _hands_detector.process(rgb)
    if not result.multi_hand_landmarks:
        return None

    h, w = bgr_image.shape[:2]
    lm = result.multi_hand_landmarks[0].landmark

    # Collect all landmark pixel coordinates
    xs = [int(p.x * w) for p in lm]
    ys = [int(p.y * h) for p in lm]

    x_min, x_max = max(0, min(xs)), min(w, max(xs))
    y_min, y_max = max(0, min(ys)), min(h, max(ys))

    # Add 10 % margin so we capture the full palm surface
    pad_x = int((x_max - x_min) * 0.10)
    pad_y = int((y_max - y_min) * 0.10)
    x_min = max(0, x_min - pad_x)
    y_min = max(0, y_min - pad_y)
    x_max = min(w, x_max + pad_x)
    y_max = min(h, y_max + pad_y)

    roi = bgr_image[y_min:y_max, x_min:x_max]
    if roi.size == 0:
        return None
    return roi


def _extract_roi_contour(gray_image: np.ndarray):
    """
    Legacy brightness-threshold fallback.  Less reliable against complex
    backgrounds — only used when MediaPipe is unavailable.
    """
    ROI_SIZE = (276, 276)
    THRESHOLD_VALUE = 80

    _, binary = cv2.threshold(gray_image, THRESHOLD_VALUE, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    largest = max(contours, key=cv2.contourArea)
    M = cv2.moments(largest)
    if M["m00"] == 0:
        return None

    cx = int(M["m10"] / M["m00"])
    cy = int(M["m01"] / M["m00"])
    rw, rh = ROI_SIZE
    x = max(0, cx - rw // 2)
    y = max(0, cy - rh // 2)
    x_end = min(gray_image.shape[1], x + rw)
    y_end = min(gray_image.shape[0], y + rh)
    return gray_image[y:y_end, x:x_end]


def preprocess_image(image_path: str):
    """
    Full preprocessing pipeline:
      1. Load image
      2. Detect hand / palm ROI (MediaPipe Hands preferred, contour fallback)
      3. Convert ROI to grayscale
      4. Apply CLAHE contrast enhancement
      5. Resize to TARGET_SIZE
      6. Normalise to [0, 1] float32

    Returns a (H, W) float32 numpy array, or None on failure.
    """
    try:
        bgr = cv2.imread(image_path)
        if bgr is None:
            logger.error(f"Could not read image: {image_path}")
            return None

        # --- Step 1: detect the palm ROI ---
        if _MEDIAPIPE_AVAILABLE:
            roi_bgr = _extract_roi_mediapipe(bgr)
            if roi_bgr is None:
                logger.warning(f"MediaPipe found no hand in {image_path}")
                return None
            # Convert BGR roi to grayscale
            gray_roi = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
        else:
            # Fallback: use the full-frame grayscale + contour method
            gray_full = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            gray_roi = _extract_roi_contour(gray_full)
            if gray_roi is None:
                logger.warning(f"Contour ROI extraction failed for {image_path}")
                return None

        # --- Step 2: CLAHE contrast enhancement ---
        enhanced = _clahe.apply(gray_roi)

        # --- Step 3: resize and normalise ---
        resized = cv2.resize(enhanced, TARGET_SIZE)
        normalised = resized.astype(np.float32) / 255.0
        return normalised

    except Exception as e:
        logger.error(f"Error preprocessing {image_path}: {e}")
        return None
