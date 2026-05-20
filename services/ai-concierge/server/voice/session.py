from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from fastapi import WebSocket

from server.voice.vad import VoiceActivityGate


@dataclass
class VoiceSession:
    conversation_id: str
    user_id: str = "anonymous"
    language: str = "auto"
    websocket: Optional[WebSocket] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    current_transcript: str = ""
    partial_transcript: str = ""
    last_partial_sent: str = ""
    last_audio_bytes: bytes = b""
    last_audio_mime_type: str = "audio/webm"
    last_filename: str = "voice.webm"
    gate: VoiceActivityGate = field(default_factory=VoiceActivityGate)
    peer_state: Dict[str, Any] = field(default_factory=dict)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def touch(self) -> None:
        self.updated_at = time.time()


class VoiceSessionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, VoiceSession] = {}

    def get_or_create(self, conversation_id: str, *, user_id: str = "anonymous", language: str = "auto") -> VoiceSession:
        session = self._sessions.get(conversation_id)
        if session is None:
            session = VoiceSession(conversation_id=conversation_id, user_id=user_id, language=language)
            self._sessions[conversation_id] = session
        else:
            session.user_id = user_id or session.user_id
            session.language = language or session.language
            session.touch()
        return session

    def get(self, conversation_id: str) -> Optional[VoiceSession]:
        return self._sessions.get(conversation_id)

    def close(self, conversation_id: str) -> None:
        self._sessions.pop(conversation_id, None)


voice_session_manager = VoiceSessionManager()
