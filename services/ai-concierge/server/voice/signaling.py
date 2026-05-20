from __future__ import annotations

import base64
import json
import logging
from typing import Any, Dict

from fastapi import WebSocket, WebSocketDisconnect

from server.voice.rtc import unsupported_webrtc_payload, webrtc_runtime_available
from server.voice.schemas import VoiceSocketError
from server.voice.session import voice_session_manager
from server.voice.stt.groq_stt import GroqSTTProvider
from server.voice.turns import run_voice_turn

logger = logging.getLogger(__name__)

stt_provider = GroqSTTProvider()


def _normalize_stt_language(language: str | None) -> str | None:
    value = (language or "").strip().lower()
    if not value or value == "auto":
        return None
    return value


async def _send(websocket: WebSocket, event_type: str, payload: Dict[str, Any] | None = None) -> None:
    await websocket.send_json({"type": event_type, "payload": payload or {}})


def _extract_incremental_text(previous: str, current: str) -> str:
    prev = (previous or "").strip()
    curr = (current or "").strip()
    if not prev:
        return curr
    if curr.startswith(prev):
        return curr[len(prev):].strip()
    return curr


async def handle_voice_signaling_websocket(websocket: WebSocket, conversation_id: str) -> None:
    await websocket.accept()
    session = voice_session_manager.get_or_create(conversation_id)
    session.websocket = websocket
    await _send(
        websocket,
        "voice_session_ready",
        {
            "conversation_id": conversation_id,
            "webrtc_supported": webrtc_runtime_available(),
            "webrtc": unsupported_webrtc_payload() if not webrtc_runtime_available() else {"supported": True},
        },
    )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await _send(websocket, "voice_error", VoiceSocketError(code="bad_json", message="Invalid JSON payload").model_dump())
                continue

            msg_type = message.get("type")
            payload = message.get("payload") or {}

            if msg_type == "start":
                session.user_id = payload.get("user_id") or session.user_id
                session.language = payload.get("language") or session.language or "auto"
                session.touch()
                await _send(
                    websocket,
                    "voice_session_ready",
                    {
                        "conversation_id": conversation_id,
                        "language": session.language,
                        "webrtc_supported": webrtc_runtime_available(),
                    },
                )
                continue

            if msg_type in {"offer", "ice_candidate"}:
                session.peer_state[msg_type] = payload
                if not webrtc_runtime_available():
                    await _send(
                        websocket,
                        "voice_error",
                        VoiceSocketError(
                            code="webrtc_unavailable",
                            message="Server WebRTC runtime is unavailable; continuing with WebSocket snapshot transcription.",
                        ).model_dump(),
                    )
                else:
                    await _send(websocket, msg_type, {"accepted": True})
                continue

            if msg_type == "audio_chunk":
                audio_base64 = payload.get("audio_base64") or ""
                mime_type = payload.get("mime_type") or "audio/webm"
                filename = payload.get("filename") or "voice.webm"
                finalize = bool(payload.get("finalize"))

                try:
                    audio_bytes = base64.b64decode(audio_base64)
                except Exception:
                    await _send(websocket, "voice_error", VoiceSocketError(code="bad_audio", message="Audio payload could not be decoded").model_dump())
                    continue

                async with session.lock:
                    session.last_audio_bytes = audio_bytes
                    session.last_audio_mime_type = mime_type
                    session.last_filename = filename
                    session.touch()

                await _send(websocket, "turn_started", {"mode": "transcription"})
                try:
                    result = await stt_provider.transcribe_bytes(
                        audio_bytes,
                        filename=filename,
                        mime_type=mime_type,
                        language=_normalize_stt_language(session.language),
                    )
                except Exception as exc:
                    logger.warning("Voice transcription failed for %s: %s", conversation_id, exc)
                    await _send(
                        websocket,
                        "voice_error",
                        VoiceSocketError(code="transcription_failed", message="Speech recognition failed", detail=str(exc)).model_dump(),
                    )
                    continue

                transcript = (result.transcript or "").strip()
                if finalize:
                    session.current_transcript = transcript
                    session.partial_transcript = ""
                    await _send(
                        websocket,
                        "final_transcript",
                        {
                            "transcript": transcript,
                            "language": result.language or session.language,
                            "duration_ms": result.duration_ms,
                        },
                    )
                else:
                    incremental = _extract_incremental_text(session.current_transcript, transcript)
                    session.partial_transcript = incremental or transcript
                    await _send(
                        websocket,
                        "partial_transcript",
                        {
                            "transcript": session.partial_transcript,
                            "full_transcript": transcript,
                            "language": result.language or session.language,
                        },
                    )
                await _send(websocket, "turn_completed", {"mode": "transcription"})
                continue

            if msg_type == "run_turn":
                transcript = str(payload.get("transcript") or session.current_transcript or "").strip()
                if not transcript:
                    await _send(websocket, "voice_error", VoiceSocketError(code="empty_transcript", message="No transcript available to send to the AI").model_dump())
                    continue
                await _send(websocket, "turn_started", {"mode": "assistant"})
                try:
                    turn_result = await run_voice_turn(
                        message=transcript,
                        user_id=payload.get("user_id") or session.user_id,
                        conversation_id=conversation_id,
                        user_name=payload.get("user_name"),
                        username=payload.get("username"),
                        user_data=payload.get("user_data"),
                        is_logged_in=payload.get("is_logged_in"),
                        speech_locale=payload.get("speech_locale") or session.language,
                    )
                    await _send(websocket, "turn_completed", turn_result)
                except Exception as exc:
                    await _send(
                        websocket,
                        "voice_error",
                        VoiceSocketError(code="assistant_failed", message="Assistant turn failed", detail=str(exc)).model_dump(),
                    )
                continue

            if msg_type in {"stop", "cancel"}:
                transcript = session.current_transcript if msg_type == "stop" else ""
                await _send(websocket, "session_closed", {"conversation_id": conversation_id, "transcript": transcript})
                if msg_type == "cancel":
                    voice_session_manager.close(conversation_id)
                continue

            await _send(
                websocket,
                "voice_error",
                VoiceSocketError(code="unsupported_event", message=f"Unsupported event type: {msg_type}").model_dump(),
            )

    except WebSocketDisconnect:
        logger.info("Voice websocket disconnected: %s", conversation_id)
    finally:
        existing = voice_session_manager.get(conversation_id)
        if existing and existing.websocket is websocket:
            existing.websocket = None
