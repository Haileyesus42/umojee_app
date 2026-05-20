import os
import json
import multiprocessing
import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

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

# Load ai/.env explicitly so startup does not depend on the shell cwd.
AI_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(AI_ROOT / ".env")

# Prefer the 'spawn' start method to avoid leaked semaphore warnings
try:
    multiprocessing.set_start_method("spawn")
except RuntimeError:
    # start method already set by another part of the program
    pass

from server.mongo_db import close_mongo_client  # noqa: E402
from server.mongo_repo import ensure_indexes  # noqa: E402
from server.routes import router  # noqa: E402
from server.voice_routes import router as voice_router  # noqa: E402
from server.voice.signaling import handle_voice_signaling_websocket  # noqa: E402

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
                transitioned_to.value if hasattr(transitioned_to, "value") else transitioned_to,
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

