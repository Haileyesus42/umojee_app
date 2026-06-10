from __future__ import annotations

from abc import ABC, abstractmethod

from server.voice.schemas import VoiceTranscriptionResult


class BaseSTTProvider(ABC):
    @abstractmethod
    async def transcribe_bytes(
        self,
        audio_bytes: bytes,
        *,
        filename: str = "audio.webm",
        mime_type: str = "audio/webm",
        language: str | None = None,
    ) -> VoiceTranscriptionResult:
        raise NotImplementedError
