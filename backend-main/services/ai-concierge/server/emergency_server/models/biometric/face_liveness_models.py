from pydantic import BaseModel
from typing import Optional
from pydantic import ConfigDict


class DetectionResult(BaseModel):
    """Response model for detection results"""
    is_real: bool
    confidence: float
    label: int
    label_text: str
    processing_time: float
    bbox: Optional[list] = None


class DetectionRequest(BaseModel):
    """Request model for detection with base64 image"""
    base64_image: str


class FaceLivenessResult(BaseModel):
    """Response model for face liveness detection results"""
    is_live: bool
    confidence: float
    message: str
    user_id: int


class FaceRecognitionResult(BaseModel):
    """Response model for face recognition results"""
    success: bool
    confidence: float
    message: str
    user_id: int


class FaceStatusResult(BaseModel):
    """Response model for face liveness detection status"""
    status: str
    model_loaded: bool = False
    service_type: str
    
    model_config = ConfigDict(protected_namespaces=())