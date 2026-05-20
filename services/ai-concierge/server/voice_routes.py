from __future__ import annotations

import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from server.mongo_repo import create_conversation, get_conversation
from server.voice.rtc import webrtc_runtime_available
from server.voice.schemas import (
    VoiceReplayPayload,
    VoiceSessionStartPayload,
    VoiceSessionStartedResponse,
    VoiceStopPayload,
)
from server.voice.session import voice_session_manager
from server.voice.stt.groq_stt import GroqSTTProvider
from server.voice.tts.groq_tts import GroqTTSProvider, GroqTTSError

router = APIRouter(prefix="/api/ai/voice", tags=["voice"])

stt_provider = GroqSTTProvider()
tts_provider = GroqTTSProvider()


@router.post("/session/start", response_model=VoiceSessionStartedResponse)
async def start_voice_session(payload: VoiceSessionStartPayload):
    conversation_id = payload.conversation_id or str(uuid.uuid4())
    conv = get_conversation(conversation_id)
    if not conv:
        create_conversation(conversation_id, payload.user_id)

    voice_session_manager.get_or_create(
        conversation_id,
        user_id=payload.user_id,
        language=payload.language or "auto",
    )

    return VoiceSessionStartedResponse(
        conversation_id=conversation_id,
        language=payload.language or "auto",
        signaling_path=f"/ws/voice/signaling/{conversation_id}",
        webrtc_supported=webrtc_runtime_available(),
        stt_model=stt_provider.model,
        tts_model=tts_provider.model,
    )


@router.post("/transcribe")
async def transcribe_voice_audio(
    audio: UploadFile = File(...),
    conversation_id: str | None = None,
    language: str | None = None,
):
    content = await audio.read()
    if not content:
        return {"ok": True, "transcript": "", "language": language, "duration_ms": 0}

    try:
        result = await stt_provider.transcribe_bytes(
            content,
            filename=audio.filename or "voice.webm",
            mime_type=audio.content_type or "audio/webm",
            language=language,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Voice transcription failed: {exc}")

    if conversation_id:
        session = voice_session_manager.get_or_create(conversation_id, language=language or "auto")
        session.current_transcript = result.transcript
        session.last_audio_bytes = content
        session.last_audio_mime_type = audio.content_type or "audio/webm"
        session.last_filename = audio.filename or "voice.webm"

    return {"ok": True, **result.model_dump()}


@router.post("/stop")
async def stop_voice_session(payload: VoiceStopPayload):
    session = voice_session_manager.get(payload.conversation_id)
    transcript = session.current_transcript if session else ""
    voice_session_manager.close(payload.conversation_id)
    return {"ok": True, "conversation_id": payload.conversation_id, "transcript": transcript}


@router.post("/replay")
async def replay_voice_audio(payload: VoiceReplayPayload):
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        resolved_model = tts_provider.resolve_model(text, payload.language)
        audio_bytes = await tts_provider.synthesize(
            text,
            voice=payload.voice,
            language=payload.language,
            response_format=payload.response_format or "wav",
        )
    except GroqTTSError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={
                "message": str(exc),
                "code": exc.code,
                "fallback": "browser_speech_synthesis",
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Voice synthesis failed: {exc}")

    media_type = "audio/wav" if (payload.response_format or "wav").lower() == "wav" else "application/octet-stream"
    headers = {
        "X-Voice-Provider": "groq",
        "X-Voice-Model": resolved_model,
        "X-Voice-Name": (payload.voice or tts_provider.default_voice),
    }
    return Response(content=audio_bytes, media_type=media_type, headers=headers)
