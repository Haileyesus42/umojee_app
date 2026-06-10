"""
Reorganized AI Services Main API
Uses FastAPI to provide AI services with the new structure
"""
import os
import sys
import asyncio
from typing import Dict, Any, Optional
import logging
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import base64
from pydantic import BaseModel
import uvicorn
from sqlalchemy.orm import Session

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import from the correct locations within the emergency_server structure
from .biometric.biometric_server import BiometricServer, EmbeddingVerifyRequest as EmbeddingVerificationRequest, TemplateVerifyRequest as TemplateVerificationRequest, FeaturesVerificationRequest
from .emergency.emergency_server import EmergencyServer
from .communication.messaging_server import MessagingServer
from .core.security.auth import get_current_user
from .core.database.database import get_user_db
from .models.common.user import User

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Umoja AI Services",
    description="Reorganized AI services for the Umoja Emergency System",
    version="1.0.0"
)

# Apply CORS middleware to handle all routes including preflight requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# Initialize servers
biometric_server = BiometricServer()
emergency_server = EmergencyServer()
messaging_server = MessagingServer()

# ==================== Root & Health ====================

@app.get("/")
def read_root():
    return {"status": "healthy", "service": "Umoja AI Services", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "services": {
            "biometric": True,
            "communication": True,
            "emergency": True
        },
        "timestamp": os.times()[4]
    }

# ==================== Face Endpoints ====================

@app.post("/v1/face/extract-embedding")
async def extract_face_embedding(image_data: UploadFile = File(...)):
    try:
        return await biometric_server.extract_face_embedding(image_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in extract_face_embedding: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/v1/face/verify")
async def verify_face_image(
    user_id: str = Form(...),
    image_data: UploadFile = File(...)   # Updated to accept image file
):
    try:
        # Read the uploaded image
        contents = await image_data.read()
        import cv2
        import numpy as np
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Extract embedding from the image
        from agent.emergency_agent.biometric.face_processor import FaceProcessor
        processor = FaceProcessor()
        embedding = processor.extract_embedding(img)

        # Retrieve stored embedding from database
        from server.emergency_server.models.biometric.user_face import UserFace
        from server.emergency_server.core.database.database import get_db
        db = next(get_db())
        user_face = db.query(UserFace).filter(UserFace.user_id == user_id).first()
        if not user_face:
            return {"match": False, "message": "No enrolled face for this user"}

        stored_embedding = user_face.embedding

        # Calculate cosine similarity
        from numpy.linalg import norm
        similarity = np.dot(embedding, stored_embedding) / (norm(embedding) * norm(stored_embedding))
        threshold = 0.6
        is_match = similarity > threshold

        return {"match": is_match, "similarity": float(similarity)}
    except Exception as e:
        logger.error(f"Error in verify_face_image: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Face verification failed: {str(e)}")

@app.post("/v1/face/enroll")
async def enroll_face(
    user_id: str = Form(...),
    name: str = Form(...),
    image_data: UploadFile = File(...)
):
    try:
        # Read the uploaded image
        contents = await image_data.read()
        import cv2
        import numpy as np
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Extract embedding from the image
        from agent.emergency_agent.biometric.face_processor import FaceProcessor
        processor = FaceProcessor()
        embedding = processor.extract_embedding(img)

        # Upsert operation - update if exists, create if not
        from server.emergency_server.models.biometric.user_face import UserFace
        from server.emergency_server.core.database.database import get_db
        from sqlalchemy.exc import IntegrityError
        
        db = next(get_db())
        existing = db.query(UserFace).filter(UserFace.user_id == user_id).first()
        
        if existing:
            # Update existing record
            existing.embedding = embedding
            existing.name = name
            existing.updated_at = datetime.utcnow()
        else:
            # Create new record
            new_face = UserFace(
                user_id=user_id, 
                name=name, 
                embedding=embedding,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_face)
        
        db.commit()
        return {"status": "success", "message": "Face enrolled/updated"}
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="User ID already exists with different constraints")
    except Exception as e:
        logger.error(f"Error in enroll_face: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Face enrollment failed: {str(e)}")

@app.post("/v1/face/liveness")
async def check_face_liveness(face_image: UploadFile = File(...)):
    return await biometric_server.check_face_liveness(face_image)

@app.get("/v1/face/status")
def face_service_status():
    return {
        "service": "face",
        "status": "available",
        "operations": ["extract-embedding", "verify", "liveness", "enroll"]
    }

# ==================== Palm Endpoints ====================

@app.post("/v1/palm/extract-features")
async def extract_palm_features(image_data: UploadFile = File(...)):
    return await biometric_server.extract_palm_features(image_data)

@app.post("/v1/palm/verify")
async def verify_palm_for_user(
    user_id: str = Form(...),
    image_data: UploadFile = File(...)
):
    return await biometric_server.verify_palm_for_user(user_id, image_data)

@app.post("/v1/palm/enroll")
async def enroll_palm(
    user_id: str = Form(...),
    image_data: UploadFile = File(...)
):
    return await biometric_server.enroll_palm(user_id, image_data)

@app.get("/v1/palm/status")
def palm_service_status():
    return {
        "service": "palm",
        "status": "available",
        "operations": ["extract-features", "verify", "enroll"]
    }

# ==================== Voice Endpoints ====================

@app.post("/v1/voice/extract-features")
async def extract_voice_features(audio_data: UploadFile = File(...)):
    return await biometric_server.extract_voice_features(audio_data)

@app.post("/v1/voice/verify")
async def verify_voices(request: FeaturesVerificationRequest):
    return await biometric_server.verify_voices(request)

@app.get("/v1/voice/status")
def voice_service_status():
    return {
        "service": "voice",
        "status": "available",
        "operations": ["extract-features", "verify"]
    }

# ==================== Emergency Webhook ====================

class EmergencySignal(BaseModel):
    type: str  # Only the type field is required now, user info comes from JWT token


@app.post("/api/v1/emergency/webhook")
async def emergency_webhook(
    signal: EmergencySignal,
    current_user: User = Depends(get_current_user),  # Extract user from JWT token
    db: Session = Depends(get_user_db)
):
    try:
        from agent.emergency_agent.emergency.dograh_service import make_emergency_call
        from agent.emergency_agent.emergency.whatsapp_service import send_emergency_whatsapp
        from server.models.communication.emergency_contact import EmergencyContact
        from server.models.common.travel_history import TravelHistory

        # User info is extracted from the JWT token (current_user)
        # Now fetch user's emergency contacts and other info from DB
        user = current_user

        contacts = db.query(EmergencyContact).filter(
            EmergencyContact.user_id == user.id
        ).order_by(EmergencyContact.priority).all()

        if not contacts:
            return {"status": "error", "message": "No emergency contacts found", "user_found": True}

        primary_contact = contacts[0]
        secondary_contact = contacts[1] if len(contacts) > 1 else None

        travel_records = db.query(TravelHistory).filter(TravelHistory.user_id == user.id).all()

        traveler_data = {
            "name": user.full_name or user.username,
            "phone": user.phone or "Not available",
            "email": user.email or "Not available",
            "current_location": user.current_location or f"{user.current_city or 'Unknown'}, {user.current_country or 'Unknown'}",
            "gps": f"{user.gps_latitude}, {user.gps_longitude}" if user.gps_latitude and user.gps_longitude else "Not available",
            "hotel": user.hotel_name or user.address or "Not specified",
            "address": user.address or "Not available"
        }

        sos_data = {
            "status": "ACTIVE",
            "signalType": signal.type,  # Using the simplified "sos" type
            "timestamp": datetime.utcnow().isoformat(),  # Using current time instead of passed timestamp
            "locationName": traveler_data["current_location"],
            "gps": traveler_data["gps"],
            "nearbyAccommodation": traveler_data["hotel"]
        }

        trip_data = {"destination": "Unknown", "date": "Unknown"}
        if travel_records:
            latest = travel_records[0]
            trip_data = {"destination": f"{latest.city}, {latest.country}", "date": latest.travel_date or "Unknown"}

        contact_data = {
            "primary": {
                "name": primary_contact.contact_name,
                "relationship": primary_contact.contact_relationship or "Unknown",
                "phone": primary_contact.phone or "Not available",
                "whatsapp": primary_contact.whatsapp or primary_contact.phone
            },
            "secondary": {
                "name": secondary_contact.contact_name,
                "relationship": secondary_contact.contact_relationship or "Unknown",
                "phone": secondary_contact.phone or "Not available",
                "whatsapp": secondary_contact.whatsapp or secondary_contact.phone
            } if secondary_contact else None
        }

        vapi_response = await asyncio.to_thread(
            make_emergency_call,
            phone_number=primary_contact.phone,
            traveler=traveler_data,
            sos_data=sos_data,
            trip_data=trip_data,
            contact_data=contact_data,
            user_id=user.id,
            contact_id=primary_contact.id
        )

        if not vapi_response:
            try:
                await asyncio.to_thread(
                    send_emergency_whatsapp,
                    contact_name=primary_contact.contact_name,
                    relationship=primary_contact.contact_relationship or "Unknown",
                    phone=primary_contact.phone,
                    traveler_name=traveler_data["name"],
                    location=traveler_data["current_location"],
                    gps=traveler_data["gps"],
                    hotel=traveler_data["hotel"],
                    signal_type=signal.type  # Using the simplified "sos" type
                )
            except Exception as e:
                logger.error(f"WhatsApp fallback error: {e}")

        return {
            "status": "success",
            "message": "Emergency signal received and processed",
            "user_found": True
        }

    except Exception as e:
        logger.error(f"Emergency webhook error: {e}")
        return {"status": "error", "message": str(e)}


# For direct execution
if __name__ == "__main__":
    uvicorn.run(
        "server.emergency_server.main:app",
        host="0.0.0.0",
        port=3001,
        reload=True,
        log_level="info"
    )