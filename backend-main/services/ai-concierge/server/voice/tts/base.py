from __future__ import annotations

from abc import ABC, abstractmethod


class BaseTTSProvider(ABC):
    @abstractmethod
    async def synthesize(
        self,
        text: str,
        *,
        voice: str | None = None,
        language: str | None = None,
        response_format: str = "wav",
    ) -> bytes:
        raise NotImplementedError
