from __future__ import annotations

import logging
import os

import httpx

from server.voice.tts.base import BaseTTSProvider

logger = logging.getLogger(__name__)

ARABIC_SCRIPT_RE = r"[\u0600-\u06FF]"


class GroqTTSError(RuntimeError):
    def __init__(self, message: str, *, status_code: int = 502, code: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


class GroqTTSProvider(BaseTTSProvider):
    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.model = os.getenv("GROQ_TTS_MODEL", "canopylabs/orpheus-v1-english")
        self.arabic_model = os.getenv(
            "GROQ_TTS_ARABIC_MODEL",
            "canopylabs/orpheus-arabic-saudi",
        )
        self.endpoint = os.getenv(
            "GROQ_TTS_ENDPOINT",
            "https://api.groq.com/openai/v1/audio/speech",
        )
        self.timeout = float(os.getenv("GROQ_TTS_TIMEOUT_SECONDS", "45"))
        self.default_voice = "hannah"

    def resolve_model(self, text: str, language: str | None = None) -> str:
        normalized_language = (language or "").strip().lower()
        if normalized_language.startswith("ar"):
            return self.arabic_model

        # Fallback to script detection when the caller does not pass a language hint.
        try:
            import re

            if re.search(ARABIC_SCRIPT_RE, text):
                return self.arabic_model
        except Exception:
            pass

        return self.model

    async def synthesize(
        self,
        text: str,
        *,
        voice: str | None = None,
        language: str | None = None,
        response_format: str = "wav",
    ) -> bytes:
        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY is not configured")
        cleaned = (text or "").strip()
        resolved_voice = (voice or "").strip() or self.default_voice
        resolved_model = self.resolve_model(cleaned, language)
        if not cleaned:
            return b""

        payload = {
            "model": resolved_model,
            "voice": resolved_voice,
            "input": cleaned[:200],
            "response_format": response_format or "wav",
        }
        logger.info(
            "Groq TTS request payload: %s",
            {
                "endpoint": self.endpoint,
                "model": payload["model"],
                "voice": payload["voice"],
                "response_format": payload["response_format"],
                "input_preview": payload["input"][:200],
                "input_length": len(payload["input"]),
            },
        )
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.endpoint, headers=headers, json=payload)

        if response.status_code >= 400:
            error_code = None
            error_message = response.text[:300]
            try:
                error_payload = response.json()
                error = error_payload.get("error", {}) if isinstance(error_payload, dict) else {}
                error_code = error.get("code")
                error_message = error.get("message") or error_message
            except Exception:
                error_payload = None
            logger.error(
                "Groq TTS failed: status=%s body=%s payload=%s",
                response.status_code,
                response.text,
                {
                    "endpoint": self.endpoint,
                    "model": payload["model"],
                    "voice": payload["voice"],
                    "response_format": payload["response_format"],
                    "input_preview": payload["input"][:200],
                    "input_length": len(payload["input"]),
                },
            )
            if error_code == "model_terms_required":
                raise GroqTTSError(
                    error_message,
                    status_code=409,
                    code=error_code,
                )
            raise GroqTTSError(
                f"Groq TTS failed: {response.status_code} {error_message}",
                status_code=502,
                code=error_code,
            )

        return response.content
