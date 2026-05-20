from __future__ import annotations

import time
from dataclasses import dataclass


@dataclass
class VoiceActivityState:
    in_speech: bool = False
    last_activity_ts: float = 0.0
    silence_threshold_s: float = 1.8


class VoiceActivityGate:
    """A lightweight speech gate driven by transcript activity."""

    def __init__(self, silence_threshold_s: float = 1.8):
        self.state = VoiceActivityState(silence_threshold_s=silence_threshold_s)

    def update(self, has_text: bool) -> str | None:
        now = time.monotonic()
        if has_text:
            self.state.last_activity_ts = now
            if not self.state.in_speech:
                self.state.in_speech = True
                return "speech_start"
            return None

        if self.state.in_speech and (now - self.state.last_activity_ts) >= self.state.silence_threshold_s:
            self.state.in_speech = False
            return "speech_end"

        return None
