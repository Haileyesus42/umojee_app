from __future__ import annotations

import os
from typing import Any, Dict

import httpx

from server.voice.schemas import VoiceTranscriptionResult
from server.voice.stt.base import BaseSTTProvider


class GroqSTTProvider(BaseSTTProvider):
    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.model = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")
        self.endpoint = os.getenv(
            "GROQ_STT_ENDPOINT",
            "https://api.groq.com/openai/v1/audio/transcriptions",
        )
        self.timeout = float(os.getenv("GROQ_STT_TIMEOUT_SECONDS", "45"))

    async def transcribe_bytes(
        self,
        audio_bytes: bytes,
        *,
        filename: str = "audio.webm",
        mime_type: str = "audio/webm",
        language: str | None = None,
    ) -> VoiceTranscriptionResult:
        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY is not configured")
        if not audio_bytes:
            return VoiceTranscriptionResult(model=self.model)

        data: Dict[str, Any] = {
            "model": self.model,
            "response_format": "verbose_json",
        }
        if language:
            data["language"] = language.split("-", 1)[0].lower()

        headers = {"Authorization": f"Bearer {self.api_key}"}
        files = {"file": (filename, audio_bytes, mime_type)}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.endpoint, headers=headers, data=data, files=files)

        if response.status_code >= 400:
            raise RuntimeError(f"Groq STT failed: {response.status_code} {response.text[:300]}")

        payload = response.json()
        transcript = str(payload.get("text") or "").strip()
        language_value = payload.get("language")
        duration = payload.get("duration")
        segments = payload.get("segments") or []
        confidence = None
        if segments and isinstance(segments, list):
            confidences = [
                float(segment["avg_logprob"])
                for segment in segments
                if isinstance(segment, dict) and segment.get("avg_logprob") is not None
            ]
            if confidences:
                confidence = sum(confidences) / len(confidences)

        return VoiceTranscriptionResult(
            transcript=transcript,
            language=language_value,
            duration_ms=int(float(duration) * 1000) if duration is not None else None,
            confidence=confidence,
            provider="groq",
            model=self.model,
        )
