"""
FastAPI Biometric Server – integrates real face liveness, face embedding,
and palm recognition. All endpoints match the NestJS PythonAiService.
"""

import sys
import os
import logging
import json
import base64
import numpy as np
from typing import Any, List
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from agent.emergency_agent.biometric.face_processor import FaceProcessor
from agent.emergency_agent.biometric.palm_processor import PalmProcessor
from agent.emergency_agent.utils.face_liveness_service import FaceLivenessService
# Relative imports for the emergency_server package
from ..core.database.database import get_sync_face_db
from ..models.biometric.user_face import insert_face_embedding
from ..models.biometric.palm_template import PalmTemplate
from ..models.common.user import User  # <-- used in enroll_palm
from ..core.security.auth import get_current_user  # Import authentication dependency

# --- IMPORT the User model for type hinting (alias as needed) ---
from ..models.common.user import User as UserModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def to_serializable(obj: Any) -> Any:
    """Recursively convert numpy types to native Python types for JSON serialization."""
    if isinstance(obj, dict):
        return {k: to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_serializable(v) for v in obj]
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, (np.float32, np.float64)):
        return float(obj)
    if isinstance(obj, (np.int32, np.int64)):
        return int(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj


# Pydantic models
class EmbeddingVerifyRequest(BaseModel):
    embedding1: List[float]
    embedding2: List[float]

class TemplateVerifyRequest(BaseModel):
    template1: List[float]
    template2: List[float]

class FeaturesVerificationRequest(BaseModel):
    features1: List[float]
    features2: List[float]


# ----------------------------------------------------------------------
# Biometric Server
# ----------------------------------------------------------------------
class BiometricServer:
    def __init__(self):
        self.face_processor = FaceProcessor()
        self.liveness_service = FaceLivenessService()
        self.palm_processor = PalmProcessor()

    # -------------------- Face Endpoints --------------------

    async def extract_face_embedding(self, image_data: UploadFile):
        try:
            contents = await image_data.read()
            result = self.face_processor.extract_embedding(contents)
            if not result.get("face_detected"):
                message = result.get("message", "No face detected")
                logger.warning(f"Face detection failed: {message}")
                raise HTTPException(400, detail=message)
            return to_serializable(result)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in extract_face_embedding: {str(e)}", exc_info=True)
            raise HTTPException(500, detail=f"Internal server error during face embedding extraction: {str(e)}")

    async def verify_faces(self, request: EmbeddingVerifyRequest):
        try:
            emb1_b64 = base64.b64encode(json.dumps(request.embedding1).encode()).decode()
            emb2_b64 = base64.b64encode(json.dumps(request.embedding2).encode()).decode()
            result = self.face_processor.verify_from_server(emb1_b64, emb2_b64)
            return to_serializable(result)
        except Exception as e:
            logger.error(f"Error in verify_faces: {str(e)}", exc_info=True)
            raise HTTPException(500, detail=f"Face verification failed: {str(e)}")

    async def check_face_liveness(self, face_image: UploadFile):
        try:
            contents = await face_image.read()
            res = self.liveness_service.detect_from_file(contents)
            return {
                "is_live": bool(res.is_real),
                "confidence": float(res.confidence),
                "message": "Liveness passed" if res.is_real else "Spoof detected"
            }
        except ValueError as e:
            logger.warning(f"Liveness check validation error: {str(e)}")
            raise HTTPException(400, detail=str(e))
        except Exception as e:
            logger.error(f"Unexpected error in check_face_liveness: {str(e)}", exc_info=True)
            raise HTTPException(500, detail=f"Liveness check failed: {str(e)}")

    async def enroll_face(self, user_id: str, name: str, image_data: UploadFile):
        try:
            contents = await image_data.read()
            emb_res = self.face_processor.extract_embedding(contents)
            if not emb_res.get("face_detected"):
                message = emb_res.get("message", "No face")
                logger.warning(f"Face enrollment failed at detection step: {message}")
                raise HTTPException(400, detail=message)

            # Liveness check — re-read from contents, not the exhausted UploadFile
            import io
            from starlette.datastructures import UploadFile as StarletteUploadFile
            liveness_file = UploadFile(filename=image_data.filename, file=io.BytesIO(contents))
            liveness = await self.check_face_liveness(liveness_file)
            if not liveness["is_live"]:
                logger.warning("Face enrollment failed at liveness check")
                raise HTTPException(400, detail="Liveness failed")

            db = next(get_sync_face_db())
            try:
                embedding = to_serializable(emb_res["embedding"])
                face_record = insert_face_embedding(db, user_id, name, embedding)
                return {
                    "status": "success",
                    "message": "Face enrolled",
                    "user_id": user_id,
                    "face_id": face_record.id,
                    "embedding": embedding,
                    "quality_score": float(emb_res.get("quality_score", 0.95))
                }
            finally:
                db.close()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in enroll_face: {str(e)}", exc_info=True)
            raise HTTPException(500, detail=f"Face enrollment failed: {str(e)}")

    # -------------------- Palm Endpoints --------------------

    async def extract_palm_features(self, image_data: UploadFile):
        contents = await image_data.read()
        result = self.palm_processor.extract_features(contents)
        if not result.get("features"):
            raise HTTPException(400, detail=result.get("message", "Feature extraction failed"))
        return to_serializable(result)

    async def verify_palms(self, request: TemplateVerifyRequest):
        emb1_b64 = base64.b64encode(json.dumps(request.template1).encode()).decode()
        emb2_b64 = base64.b64encode(json.dumps(request.template2).encode()).decode()
        result = self.palm_processor.verify_from_server(emb1_b64, emb2_b64)
        return to_serializable(result)

    async def enroll_palm(self, user_id: str, image_data: UploadFile):
        from datetime import datetime
        contents = await image_data.read()
        result = self.palm_processor.extract_features(contents)
        if not result.get("features"):
            raise HTTPException(400, detail="Could not extract palm features")
        
        db = next(get_sync_face_db())
        try:
            # Ensure user_id is string type
            user_id_str = str(user_id)
            
            # Query for existing palm template
            existing = db.query(PalmTemplate).filter(PalmTemplate.user_id == user_id_str).first()
            
            # Convert features to JSON string
            features_json = json.dumps(result["features"])
            
            if existing:
                # Update existing template
                existing.template_data = features_json
                existing.template_hash = result.get("hash", "")
                existing.quality_score = float(result.get("quality_score", 0.85))
                existing.updated_at = datetime.utcnow()
                
                db.commit()
                db.refresh(existing)
                
                return {
                    "status": "updated",
                    "message": "Palm template updated successfully",
                    "user_id": user_id_str,
                    "palm_template_id": existing.id,
                    "quality_score": float(existing.quality_score)
                }
            else:
                # Create new template
                new_template = PalmTemplate(
                    user_id=user_id_str,
                    template_data=features_json,
                    template_hash=result.get("hash", ""),
                    quality_score=float(result.get("quality_score", 0.85)),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_template)
                db.commit()
                db.refresh(new_template)
                
                return {
                    "status": "created",
                    "message": "Palm template created successfully",
                    "user_id": user_id_str,
                    "palm_template_id": new_template.id,
                    "quality_score": float(new_template.quality_score)
                }
        except Exception as e:
            logger.error(f"Error in enroll_palm: {str(e)}", exc_info=True)
            db.rollback()
            raise HTTPException(500, detail=f"Failed to enroll palm template: {str(e)}")
        finally:
            db.close()

    async def verify_palm_for_user(self, user_id: str, image_data: UploadFile):
        contents = await image_data.read()
        query_result = self.palm_processor.extract_features(contents)
        if not query_result.get("features"):
            raise HTTPException(400, detail="Could not extract palm features")
        db = next(get_sync_face_db())
        try:
            stored = db.query(PalmTemplate).filter(PalmTemplate.user_id == str(user_id)).first()
            if not stored:
                raise HTTPException(404, detail="No palm template for this user")
            stored_features = json.loads(stored.template_data)
            similarity = self._cosine_similarity(query_result["features"], stored_features)
            is_match = similarity >= 0.6
            return {
                "is_match": bool(is_match),
                "confidence": float(similarity),
                "message": "Match" if is_match else "No match",
                "user_id": user_id
            }
        finally:
            db.close()

    @staticmethod
    def _cosine_similarity(a, b):
        a = np.array(a)
        b = np.array(b)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))


# ----------------------------------------------------------------------
# FastAPI App
# ----------------------------------------------------------------------
app = FastAPI(title="Biometric AI Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

biometric = BiometricServer()

@app.get("/health")
async def health():
    return {"status": "ok"}

# -------------------- Face Routes --------------------
@app.post("/v1/face/extract-embedding")
async def extract_face_embedding(image_data: UploadFile = File(...)):
    return await biometric.extract_face_embedding(image_data)

@app.post("/v1/face/liveness")
async def face_liveness(face_image: UploadFile = File(...)):
    return await biometric.check_face_liveness(face_image)

@app.post("/v1/face/enroll")
async def enroll_face(user_id: str = Form(...), name: str = Form(...), image_data: UploadFile = File(...)):
    return await biometric.enroll_face(user_id, name, image_data)

# -------------------- Palm Routes --------------------
@app.post("/v1/palm/extract-features")
async def extract_palm_features(image_data: UploadFile = File(...)):
    return await biometric.extract_palm_features(image_data)

@app.post("/v1/palm/verify")
async def verify_palms(
    request: Request,
    current_user: UserModel = Depends(get_current_user),
):
    import json
    try:
        body = await request.json()
        image_data = body.get('image_data')
        if not image_data:
            raise HTTPException(400, detail="image_data is required")

        import base64
        from io import BytesIO
        from starlette.datastructures import UploadFile

        image_bytes = base64.b64decode(image_data)
        image_stream = BytesIO(image_bytes)
        temp_file = UploadFile(
            file=image_stream,
            filename="temp_palm_image.jpg",
            size=len(image_bytes)
        )

        user_id = str(current_user.id)
        return await biometric.verify_palm_for_user(user_id, temp_file)
    except json.JSONDecodeError:
        raise HTTPException(400, detail="Invalid JSON in request body")
    except Exception as e:
        raise HTTPException(400, detail=f"Error processing request: {str(e)}")

# This endpoint handles file uploads (multipart) for palm verification
@app.post("/v1/palm/verify-file")
async def verify_palm_file(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
):
    user_id = str(current_user.id)
    return await biometric.verify_palm_for_user(user_id, file)

@app.post("/v1/palm/enroll")
async def enroll_palm(user_id: str = Form(...), image_data: UploadFile = File(...)):
    return await biometric.enroll_palm(user_id, image_data)

# -------------------- CORS preflight (optional, already covered by middleware) --------------------
# (You can keep the manual OPTIONS handlers if needed, but the middleware should handle them.)

# Manual OPTIONS routes for CORS preflight - ensure all are present
@app.options("/v1/palm/verify")
async def options_palm_verify():
    from fastapi.responses import Response
    return Response(status_code=200, headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization,content-type"
    })

