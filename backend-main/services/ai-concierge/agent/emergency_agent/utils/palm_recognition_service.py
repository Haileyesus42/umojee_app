import os
import sys
import numpy as np
import cv2
import torch
import torchvision.models as models
import logging
from typing import Optional
from pathlib import Path

logger = logging.getLogger(__name__)

# Add the agent directory to the Python path so palm_utils can be imported
_AGENT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_AGENT_DIR))

try:
    from palm_utils.preprocessor import preprocess_image
    from palm_utils.cosine_similarity import calculate_similarity
    PALM_UTILS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"palm_utils not available: {e}")
    PALM_UTILS_AVAILABLE = False


class PalmRecognitionService:
    def __init__(self, model_path: str = None):
        if model_path is None:
            # Calculate path: from utils -> agent -> ai_concierge -> services -> backend (4 levels up)
            backend = Path(__file__).resolve().parent.parent.parent.parent.parent
            model_path = str(backend / "models" / "palmprint_encoder.pth")

        # Load ResNet18 with the original 3-channel input
        resnet = models.resnet18(weights=None)
        # Remove the final classification layer -> feature extractor
        self.encoder = torch.nn.Sequential(*list(resnet.children())[:-1])

        # Load the trained encoder weights (must match 3-channel input)
        if os.path.exists(model_path):
            state_dict = torch.load(model_path, map_location='cpu')
            # The saved state_dict may have keys like '0.weight', '1.weight', etc.
            # Our Sequential model has the same keys, so direct load works.
            self.encoder.load_state_dict(state_dict)
            logger.info(f"Loaded palm model from {model_path}")
        else:
            logger.warning(f"Palm model not found at {model_path}. Using random weights (pretrained ResNet).")
            # Optionally load pretrained ImageNet weights for better feature extraction
            # resnet = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
            # self.encoder = torch.nn.Sequential(*list(resnet.children())[:-1])

        self.encoder.eval()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.encoder.to(self.device)
        logger.info(f"Palm recognition service initialized on device: {self.device}")

    def _is_valid_palm_roi(self, roi: np.ndarray) -> bool:
        """
        Heuristic checks to reject non-palm ROIs.
        Returns True if the ROI looks like a genuine palm.
        """
        if roi.size == 0:
            logger.debug("Empty ROI")
            return False

        # Convert to uint8 (assuming roi is float in [0,1] or [0,255])
        if roi.dtype != np.uint8:
            roi_uint8 = (roi * 255).astype(np.uint8) if roi.max() <= 1.0 else roi.astype(np.uint8)
        else:
            roi_uint8 = roi

        h, w = roi_uint8.shape[:2]
        # Minimum size for a palm ROI - reduced threshold
        if h < 48 or w < 48:
            logger.debug(f"ROI too small: {h}x{w}")
            return False

        # Laplacian variance – measure texture sharpness (palms have wrinkles)
        lap_var = cv2.Laplacian(roi_uint8, cv2.CV_64F).var()
        if lap_var < 8.0:   # Reduced from 15.0 to 8.0
            logger.debug(f"Low texture variance: {lap_var:.2f}")
            return False

        # Edge density – palms have many edges (lines, wrinkles)
        edges = cv2.Canny(roi_uint8, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        if edge_density < 0.03 or edge_density > 0.45:
            logger.debug(f"Abnormal edge density: {edge_density:.3f}")
            return False

        # Non-zero ratio – covered camera or blank image
        non_zero_ratio = np.count_nonzero(roi_uint8) / roi_uint8.size
        if non_zero_ratio < 0.05:
            logger.debug(f"Too few non-zero pixels: {non_zero_ratio:.2%}")
            return False

        # Average brightness – very dark or overexposed
        avg_brightness = np.mean(roi_uint8) / 255.0
        if avg_brightness < 0.05 or avg_brightness > 0.98:
            logger.debug(f"Poor brightness: {avg_brightness:.2f}")
            return False

        return True

    def extract_features(self, image_path: str) -> Optional[np.ndarray]:
        """Extract 512-dim feature vector from a palm image path."""
        if not PALM_UTILS_AVAILABLE:
            logger.error("palm_utils not available, cannot extract features")
            return None

        preprocessed_roi = preprocess_image(image_path)
        if preprocessed_roi is None:
            logger.error(f"Could not preprocess image: {image_path}")
            return None

        # Reject non-palm ROIs
        if not self._is_valid_palm_roi(preprocessed_roi):
            logger.warning(f"ROI rejected as non-palm: {image_path}")
            return None

        # Convert grayscale (H, W) to 3-channel tensor (1, 3, H, W)
        # preprocessed_roi is a 2D numpy array (float, likely in [0,1])
        if len(preprocessed_roi.shape) == 2:
            # Add batch and channel dimensions: (1, 1, H, W)
            input_tensor = torch.from_numpy(preprocessed_roi).float().unsqueeze(0).unsqueeze(0)
            # Repeat the single channel 3 times -> (1, 3, H, W)
            input_tensor = input_tensor.repeat(1, 3, 1, 1)
        else:
            # If for some reason it's already multi-channel (H,W,C)
            input_tensor = torch.from_numpy(preprocessed_roi).float().permute(2, 0, 1).unsqueeze(0)
            if input_tensor.shape[1] == 1:
                input_tensor = input_tensor.repeat(1, 3, 1, 1)
            elif input_tensor.shape[1] != 3:
                logger.error(f"Unexpected number of channels: {input_tensor.shape[1]}")
                return None

        input_tensor = input_tensor.to(self.device)

        try:
            with torch.no_grad():
                features = self.encoder(input_tensor)
            # Flatten to 512-dim vector
            features = features.view(features.size(0), -1).cpu().numpy()
            return features[0]
        except Exception as e:
            logger.error(f"Error during feature extraction: {e}")
            return None