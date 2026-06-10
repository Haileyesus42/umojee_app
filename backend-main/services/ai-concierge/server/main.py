import os
os.environ['GLOG_minloglevel'] = '3'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['MEDIAPIPE_DISABLE_GPU'] = '1'
os.environ['GLOG_logtostderr'] = '0'

import json
import multiprocessing
import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, HTTPException, Form, Depends, Header
import httpx
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from sqlalchemy.orm import Session

from server.websocket_manager import ws_manager
from agent.journey.phase_2_context_monitoring import ContextMonitor, ContextUpdate, MonitoringType, BackgroundTaskManager
from agent.journey.phase_1_foundation import JourneyStateManager
import server.mongo_repo as mongo_repo
from server.loop_controller import LoopController

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s:%(name)s: %(message)s')
logger = logging.getLogger(__name__)

"""
FastAPI wrapper around the LangGraph supervisor. Ensures .env is loaded early
so that downstream imports (Groq client) see GROQ_API_KEY.
"""

AI_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(AI_ROOT / ".env")

try:
    multiprocessing.set_start_method("spawn")
except RuntimeError:
    pass

from server.mongo_db import close_mongo_client  # noqa: E402
from server.mongo_repo import ensure_indexes  # noqa: E402
from server.routes import router  # noqa: E402
from server.voice_routes import router as voice_router  # noqa: E402
from server.voice.signaling import handle_voice_signaling_websocket  # noqa: E402

# Import emergency server components
from server.emergency_server.biometric.biometric_server import BiometricServer, EmbeddingVerifyRequest as EmbeddingVerificationRequest, TemplateVerifyRequest as TemplateVerificationRequest, FeaturesVerificationRequest
from server.emergency_server.emergency.emergency_server import EmergencyServer
from server.emergency_server.communication.messaging_server import MessagingServer
from server.auth_mongo import get_current_mongo_user  # Use MongoDB-based auth instead of PostgreSQL
from server.emergency_server.core.database.database import get_user_db
from pymongo import MongoClient
from bson.objectid import ObjectId
from server.mongo_db import get_database

# Initialize managers
state_manager = JourneyStateManager(mongo_repo=mongo_repo)
task_manager = BackgroundTaskManager()

# Global orchestrator instance (initialized after context_monitor)
journey_orchestrator = None


async def _process_live_location_geofence(journey_id: str, latitude: float, longitude: float):
    """
    Evaluate continuous browser location updates against the active segment waypoint.

    This mirrors the fuzzy geofencing behavior previously available via the
    HTTP location/update route, but runs directly on the WebSocket stream so we
    can notify and transition from the live frontend feed alone.
    """
    try:
        from agent.journey.phase_1_foundation import JourneySegment
        from agent.location_geofencing import evaluate_user_location

        journey = state_manager.get_journey(journey_id)
        if not journey:
            return

        current = journey.current_segment
        context = journey.context

        waypoint_map = {
            JourneySegment.HOME_TO_AIRPORT: (
                "departure_airport",
                context.departure_airport_lat,
                context.departure_airport_lon,
                "Airport",
            ),
            JourneySegment.FLIGHT_TO_HOTEL: (
                "hotel",
                getattr(context, "hotel_lat", None),
                getattr(context, "hotel_lon", None),
                "Hotel",
            ),
            JourneySegment.RETURN: (
                "return_airport",
                context.return_airport_lat,
                context.return_airport_lon,
                "Airport",
            ),
        }

        if current not in waypoint_map:
            return

        waypoint_key, waypoint_lat, waypoint_lon, waypoint_name = waypoint_map[current]
        if waypoint_lat is None or waypoint_lon is None:
            return

        monitoring = getattr(context, "monitoring", {}) or {}
        traffic_data = monitoring.get("traffic") if isinstance(monitoring, dict) else None

        status = evaluate_user_location(
            journey_id=journey_id,
            current_lat=latitude,
            current_lon=longitude,
            waypoint_lat=waypoint_lat,
            waypoint_lon=waypoint_lon,
            waypoint_name=waypoint_name,
            traffic_data=traffic_data,
        )

        if status.should_notify and status.notification_message:
            await ws_manager.broadcast_to_journey(
                journey_id,
                {
                    "type": "location_notification",
                    "zone": status.zone.value,
                    "message": status.notification_message,
                    "distance_km": status.distance_km,
                    "eta_minutes": status.eta_minutes,
                },
            )

        if status.zone.value != "arrived":
            return

        next_segment_map = {
            JourneySegment.HOME_TO_AIRPORT: JourneySegment.AIRPORT_TO_FLIGHT,
            JourneySegment.FLIGHT_TO_HOTEL: JourneySegment.HOTEL_TO_ACTIVITIES,
        }

        if current in next_segment_map:
            next_segment = next_segment_map[current]
            transitioned = state_manager.transition_segment(journey_id, current, next_segment)
            if transitioned:
                logger.info(
                    "WebSocket geofencing: transitioned %s %s -> %s",
                    journey_id,
                    current.value,
                    next_segment.value,
                )
                await ws_manager.broadcast_to_journey(
                    journey_id,
                    {
                        "type": "segment_transition",
                        "journey_id": journey_id,
                        "from_segment": current.value,
                        "to_segment": next_segment.value,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
        elif current == JourneySegment.RETURN and waypoint_key != "return_airport":
            state_manager.complete_journey(journey_id)
            logger.info("WebSocket geofencing: completed return journey %s", journey_id)

    except Exception as e:
        logger.warning("WebSocket geofencing failed for %s: %s", journey_id, e)

async def on_context_update(update: ContextUpdate):
    """Callback for context updates: broadcast to WebSockets and evaluate triggers (flight/traffic/weather)."""
    logger.info(f"Broadcasting context update for {update.journey_id}: {update.monitoring_type}")
    await ws_manager.broadcast_to_journey(update.journey_id, {
        "type": "context_update",
        "monitoring_type": update.monitoring_type,
        "data": update.data,
        "timestamp": update.timestamp.isoformat()
    })
    # Trigger evaluator: proactive notifications and segment transitions (TRIGGER_RULES_SEGMENTS_PHASES.md)
    try:
        from agent.journey.trigger_evaluator import evaluate_context_update as eval_triggers
        await eval_triggers(
            update, 
            state_manager, 
            ws_manager, 
            message_dispatcher=journey_orchestrator.message_dispatcher if journey_orchestrator else None
        )
    except Exception as e:
        logger.warning(f"Trigger evaluation failed: {e}")

    try:
        transitioned_to = state_manager.auto_transition_if_needed(update.journey_id)
        if transitioned_to:
            logger.info(
                "Auto-transitioned journey %s to %s after %s update",
                update.journey_id,
                transitioned_to.value,
                update.monitoring_type,
            )
    except Exception as e:
        logger.warning(f"Automatic transition evaluation failed: {e}")
        
    # Trigger smart recommendations via JourneyOrchestrator (Phase 6)
    if journey_orchestrator:
        try:
            await journey_orchestrator.handle_context_update(
                update.journey_id, 
                update.monitoring_type.value, 
                update.data
            )
        except Exception as e:
            logger.warning(f"Smart recommendation trigger failed: {e}")

context_monitor = ContextMonitor(
    state_manager=state_manager,
    on_context_update=on_context_update
)

# Initialize JourneyOrchestrator
from agent.journey.journey_orchestrator import JourneyOrchestrator
journey_orchestrator = JourneyOrchestrator(
    state_manager=state_manager,
    context_monitor=context_monitor,
    websocket_manager=ws_manager
)

# Initialize emergency server components
biometric_server = BiometricServer()
emergency_server = EmergencyServer()
messaging_server = MessagingServer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── PGVector health check ── refuse to start if unhealthy ──
    from server.pg_db import check_health as pgvector_check_health
    try:
        pgvector_check_health()
        logger.info("PGVector is healthy — proceeding with startup")
    except RuntimeError as exc:
        logger.critical("PGVector health check FAILED: %s", exc)
        raise SystemExit(f"FATAL: PGVector is not available. Server cannot start.\n{exc}")

    # Ensure Mongo collections have required indexes at startup
    ensure_indexes()

    # Store managers in app state for access in routes
    app.state.state_manager = state_manager
    app.state.task_manager = task_manager
    app.state.context_monitor = context_monitor

    # Inject singletons into the journey module so LangGraph nodes can use them
    from agent.journey.journey_orchestrator import set_journey_singletons
    set_journey_singletons(state_manager, context_monitor)
    
    # Register transition callback to sync monitoring
    def handle_transition(journey_id, from_seg, to_seg):
        # We need to run the async sync_monitoring_to_segment in a task
        asyncio.create_task(context_monitor.sync_monitoring_to_segment(journey_id, to_seg))
    
    state_manager.on_segment_transition_callbacks.append(handle_transition)

    # Initialize LoopController
    controller = LoopController(state_manager, ws_manager, context_monitor, task_manager)
    app.state.loop_controller = controller

    # Initial sync based on stored preferences
    await controller.sync()
    
    try:
        yield
    finally:
        # Cleanup
        await controller.stop()
        await close_mongo_client()


app = FastAPI(title="Umoja AI Backend", version="0.1.0", lifespan=lifespan)

# CORS - allow all by default or restrict to your client origin via env
client_origin = os.getenv("CLIENT_APP_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[client_origin] if client_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(router)
app.include_router(voice_router)


# ==================== Biometric Endpoints ====================

@app.post("/v1/face/extract-embedding")
async def extract_face_embedding_endpoint(image_data: UploadFile = File(...)):
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

        # Extract embedding from the image using the same processor as the biometric server
        from agent.emergency_agent.biometric.face_processor import FaceProcessor
        processor = FaceProcessor()
        result = processor.extract_embedding(contents)  # Pass raw bytes, not decoded image
        
        # Check if face was detected
        if not result.get("face_detected"):
            return {"match": False, "message": result.get("message", "No face detected")}
            
        embedding = result["embedding"]
        
        # Ensure embedding is a numpy array for computation
        import numpy as np
        if isinstance(embedding, list):
            embedding = np.array(embedding)
        elif isinstance(embedding, dict):
            # If embedding itself is a dict, extract the actual embedding array
            if "embedding" in embedding:
                embedding = np.array(embedding["embedding"])
            else:
                raise HTTPException(status_code=400, detail="Invalid embedding format")

        # Retrieve stored embedding from database
        from server.emergency_server.models.biometric.user_face import UserFace
        from server.emergency_server.core.database.database import get_sync_face_db
        from sqlalchemy.orm import Session
        
        # Get database session
        db_gen = get_sync_face_db()
        db: Session = next(db_gen)
        
        try:
            user_face = db.query(UserFace).filter(UserFace.user_id == user_id).first()
            if not user_face:
                return {"match": False, "message": "No enrolled face for this user"}

            stored_embedding = user_face.embedding
            
            if stored_embedding is None:
                return {"match": False, "message": "Stored embedding is invalid"}

            # Ensure stored embedding is also a numpy array
            if isinstance(stored_embedding, list):
                stored_embedding = np.array(stored_embedding)
                
            # Calculate cosine similarity
            from numpy.linalg import norm
            similarity = np.dot(embedding, stored_embedding) / (norm(embedding) * norm(stored_embedding))
            threshold = 0.6
            is_match = bool(similarity > threshold)  # Convert numpy bool to Python bool

            return {"match": is_match, "similarity": float(similarity)}
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error in verify_face_image: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Face verification failed: {str(e)}")

@app.post("/v1/face/enroll")
async def enroll_face_endpoint(
    user_id: str = Form(...),
    name: str = Form(...),
    image_data: UploadFile = File(...)
):
    # Call the actual implementation from the biometric server
    # The biometric server already handles upsert logic internally
    return await biometric_server.enroll_face(user_id, name, image_data)

@app.post("/v1/face/liveness")
async def check_face_liveness_endpoint(face_image: UploadFile = File(...)):
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
async def extract_palm_features_endpoint(image_data: UploadFile = File(...)):
    return await biometric_server.extract_palm_features(image_data)

@app.post("/v1/palm/verify")
async def verify_palm_for_user_endpoint(
    user_id: str = Form(...),
    image_data: UploadFile = File(...)
):
    return await biometric_server.verify_palm_for_user(user_id, image_data)

@app.post("/v1/palm/enroll")
async def enroll_palm_endpoint(
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
async def extract_voice_features_endpoint(audio_data: UploadFile = File(...)):
    # Return placeholder since voice processing isn't fully implemented yet
    return {"status": "success", "message": "Voice features extracted (placeholder)"}

@app.post("/v1/voice/verify")
async def verify_voices_endpoint(request: FeaturesVerificationRequest):
    # Return placeholder since voice processing isn't fully implemented yet
    return {"is_match": False, "confidence": 0.0, "message": "Voice verification not yet implemented"}

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
    current_user: dict = Depends(get_current_mongo_user),  # Use MongoDB-based auth
    authorization: str = Header(None, alias="Authorization")
):
    try:
        import httpx
        from agent.emergency_agent.emergency.dograh_service import make_emergency_call
        from agent.emergency_agent.emergency.whatsapp_service import send_emergency_whatsapp

        # User info is extracted from the JWT token (current_user from MongoDB)
        mongo_user = current_user  # This is the MongoDB user document
        mongo_user_id = mongo_user["_id"]
        
        # Get emergency contacts by calling the Node.js service
        # We need to use the authorization header to make the authenticated call
        token = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
        
        if not token:
            return {"status": "error", "message": "No authorization token provided", "user_found": False}
        
        # Call the Node.js service to get emergency contacts
        nodejs_base_url = os.getenv("NODEJS_GATEWAY_URL", "http://localhost:3000")
        contacts_endpoint = f"{nodejs_base_url}/api/client/emergency/contacts"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(contacts_endpoint, headers=headers)
                
                if response.status_code == 200:
                    contacts_data = response.json()
                    emergency_contacts = contacts_data.get("data", {}).get("contacts", [])
                    
                    if not emergency_contacts:
                        return {"status": "error", "message": "No emergency contacts found", "user_found": True}
                else:
                    logger.error(f"Failed to fetch emergency contacts from Node.js service: {response.status_code} - {response.text}")
                    return {"status": "error", "message": "Failed to retrieve emergency contacts", "user_found": True}
        except Exception as e:
            logger.error(f"Error calling Node.js service for contacts: {e}")
            return {"status": "error", "message": "Error retrieving emergency contacts", "user_found": True}

        # Sort contacts by priority if priority field exists, otherwise use them as-is
        sorted_contacts = sorted(emergency_contacts, key=lambda x: x.get('priority', 999))
        
        primary_contact = sorted_contacts[0] if sorted_contacts else None
        secondary_contact = sorted_contacts[1] if len(sorted_contacts) > 1 else None

        # For travel history, we might need to look in MongoDB or elsewhere
        # For now, we'll check if travel history is stored in MongoDB as well
        travel_records = []  # Placeholder - would need to determine where travel history is stored

        # Extract user data from MongoDB user document with better fallbacks
        # Use the actual user data from MongoDB instead of defaults
        traveler_data = {
            "name": mongo_user.get("firstName", "") + " " + mongo_user.get("lastName", "") or mongo_user.get("full_name", "") or mongo_user.get("username", "Unknown User"),
            "phone": mongo_user.get("phone", mongo_user.get("mobile", "Not available")),
            "email": mongo_user.get("email", "Not available"),
            "current_location": mongo_user.get("current_location") or f"{mongo_user.get('current_city', 'Unknown')}, {mongo_user.get('current_country', 'Unknown')}",
            "gps": f"{mongo_user.get('gps_latitude')}, {mongo_user.get('gps_longitude')}" if (mongo_user.get('gps_latitude') and mongo_user.get('gps_longitude')) else "Not available",
            "hotel": mongo_user.get("hotel_name", mongo_user.get("address", "Not available")),
            "address": mongo_user.get("address", "Not available")
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
        # TODO: Implement travel history retrieval from MongoDB if available

        contact_data = {
            "primary": {
                "name": primary_contact.get("name", primary_contact.get("contact_name", "Unknown")),
                "relationship": primary_contact.get("relationship", primary_contact.get("contact_relationship", "Unknown")),
                "phone": primary_contact.get("phone", primary_contact.get("phoneNumber", "Not available")),
                "whatsapp": primary_contact.get("whatsapp", primary_contact.get("phone", primary_contact.get("phoneNumber")))
            },
            "secondary": {
                "name": secondary_contact.get("name", secondary_contact.get("contact_name", "Unknown")) if secondary_contact else None,
                "relationship": secondary_contact.get("relationship", secondary_contact.get("contact_relationship", "Unknown")) if secondary_contact else "Unknown",
                "phone": secondary_contact.get("phone", secondary_contact.get("phoneNumber", "Not available")) if secondary_contact else "Not available",
                "whatsapp": secondary_contact.get("whatsapp", secondary_contact.get("phone", secondary_contact.get("phoneNumber"))) if secondary_contact else "Not available"
            } if secondary_contact else None
        }

        # Make the emergency call using the primary contact from MongoDB
        vapi_response = await asyncio.to_thread(
            make_emergency_call,
            phone_number=primary_contact.get("phone", primary_contact.get("phoneNumber")),
            traveler=traveler_data,
            sos_data=sos_data,
            trip_data=trip_data,
            contact_data=contact_data,
            user_id=mongo_user_id,  # Use MongoDB user ID
            contact_id=str(primary_contact.get("_id", "unknown"))  # Use MongoDB contact ID if available
        )

        if not vapi_response:
            try:
                await asyncio.to_thread(
                    send_emergency_whatsapp,
                    contact_name=primary_contact.get("name", primary_contact.get("contact_name", "Unknown")),
                    relationship=primary_contact.get("relationship", primary_contact.get("contact_relationship", "Unknown")),
                    phone=primary_contact.get("phone", primary_contact.get("phoneNumber")),
                    traveler_name=traveler_data["name"],
                    location=traveler_data["current_location"],
                    gps=traveler_data["gps"],
                    hotel=traveler_data["hotel"],
                    signal_type=signal.type  # Using the simplified "sos" type
                )
            except Exception as e:
                logger.error(f"WhatsApp fallback error: {e}")

        # Return detailed user information in the response
        return {
            "status": "success",
            "message": "Emergency signal received and processed",
            "user_found": True,
            "user_info": {
                "id": mongo_user_id,
                "name": traveler_data["name"],
                "email": traveler_data["email"],
                "phone": traveler_data["phone"],
                "current_location": traveler_data["current_location"],
                "address": traveler_data["address"],
                "hotel": traveler_data["hotel"]
            },
            "contact_info": {
                "primary": contact_data["primary"],
                "secondary": contact_data["secondary"]
            },
            "emergency_details": {
                "signal_type": signal.type,
                "timestamp": sos_data["timestamp"]
            }
        }

    except Exception as e:
        logger.error(f"Emergency webhook error: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/health-emergency")
def emergency_health_check():
    return {
        "status": "healthy",
        "services": {
            "biometric": True,
            "communication": True,
            "emergency": True
        },
        "timestamp": os.times()[4]
    }


@app.websocket("/ws/voice/signaling/{conversation_id}")
async def voice_signaling_websocket(websocket: WebSocket, conversation_id: str):
    await handle_voice_signaling_websocket(websocket, conversation_id)

# WebSocket endpoint for real-time journey updates
@app.websocket("/ws/journey/{journey_id}")
async def journey_websocket(websocket: WebSocket, journey_id: str):
    logger.info(f"New WebSocket connection attempt for journey: {journey_id}")
    await ws_manager.connect(websocket, journey_id)
    logger.info(f"WebSocket successfully established for journey: {journey_id}")
    try:
        while True:
            raw = await websocket.receive_text()

            # Try to parse as JSON and handle known message types
            try:
                message = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                continue  # Non-JSON keep-alive or ping; ignore

            msg_type = message.get("type")

            if msg_type == "location_update":
                # Real-time location from the user's browser via the frontend WebSocket
                data = message.get("data", {})
                logger.info(
                    f"Received browser location for journey {journey_id}: "
                    f"({data.get('latitude')}, {data.get('longitude')}) "
                    f"city={data.get('city')}"
                )

                # Update the journey context in state_manager
                state_manager.update_context(journey_id, {
                    "location": {
                        "latitude": data.get("latitude"),
                        "longitude": data.get("longitude"),
                        "city": data.get("city"),
                        "country": (data.get("address") or {}).get("country"),
                        "display_name": data.get("display_name"),
                        "detected_at": data.get("detected_at"),
                    }
                })

                latitude = data.get("latitude")
                longitude = data.get("longitude")
                if latitude is not None and longitude is not None:
                    await _process_live_location_geofence(
                        journey_id=journey_id,
                        latitude=latitude,
                        longitude=longitude,
                    )

                # Fire the context update callback so it broadcasts to all
                # connected clients and gets persisted/embedded
                update = ContextUpdate(
                    monitoring_type=MonitoringType.LOCATION,
                    journey_id=journey_id,
                    data={
                        "latitude": data.get("latitude"),
                        "longitude": data.get("longitude"),
                        "city": data.get("city"),
                        "country": (data.get("address") or {}).get("country"),
                        "display_name": data.get("display_name"),
                        "accuracy_meters": data.get("accuracy_meters"),
                        "detected_at": data.get("detected_at"),
                        "source": data.get("source", "browser_geolocation"),
                    },
                    timestamp=datetime.now(timezone.utc),
                    success=True,
                )
                await on_context_update(update)

                # Also persist and embed via the context monitor
                await context_monitor._persist_update(journey_id, update)
                await context_monitor._embed_to_messages(journey_id, update)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, journey_id)
        await _maybe_stop_monitoring(journey_id)
    except Exception as e:
        logger.error(f"WebSocket error for {journey_id}: {e}")
        ws_manager.disconnect(websocket, journey_id)
        await _maybe_stop_monitoring(journey_id)


async def _maybe_stop_monitoring(journey_id: str):
    """Stop monitoring if no WebSocket listeners remain for this journey."""
    if journey_id not in ws_manager.active_connections:
        if context_monitor.is_monitoring(journey_id):
            logger.info(f"No WebSocket listeners for {journey_id} — stopping monitoring")
            await context_monitor.stop_monitoring(journey_id)


# Entry point for `python -m ai.server.main`
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("ai.server.main:app", host="0.0.0.0", port=port, reload=True)