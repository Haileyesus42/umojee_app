from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


TtsVoiceOption = Literal["autumn", "diana", "hannah", "austin", "daniel", "troy"]


class VoiceSessionStartPayload(BaseModel):
    user_id: str
    conversation_id: Optional[str] = None
    user_name: Optional[str] = None
    username: Optional[str] = None
    user_data: Optional[Dict[str, Any]] = None
    is_logged_in: Optional[bool] = None
    language: Optional[str] = None


class VoiceStopPayload(BaseModel):
    conversation_id: str


class VoiceReplayPayload(BaseModel):
    text: str
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    voice: Optional[TtsVoiceOption] = None
    language: Optional[str] = None
    response_format: str = "wav"


class VoiceSessionStartedResponse(BaseModel):
    ok: bool = True
    conversation_id: str
    language: str
    signaling_path: str
    webrtc_supported: bool = False
    provider: str = "groq"
    stt_model: str
    tts_model: str


class VoiceTranscriptionResult(BaseModel):
    transcript: str = ""
    language: Optional[str] = None
    duration_ms: Optional[int] = None
    confidence: Optional[float] = None
    provider: str = "groq"
    model: Optional[str] = None


class VoiceTurnRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: str
    user_name: Optional[str] = None
    username: Optional[str] = None
    user_data: Optional[Dict[str, Any]] = None
    is_logged_in: Optional[bool] = None
    speech_locale: Optional[str] = None


class VoiceSocketEvent(BaseModel):
    type: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class VoiceSocketError(BaseModel):
    code: str
    message: str
    detail: Optional[str] = None


VoiceState = Literal[
    "idle",
    "connecting",
    "recording",
    "transcribing",
    "ready",
    "error",
    "closed",
]
