from __future__ import annotations

from typing import Any, Dict


def webrtc_runtime_available() -> bool:
    try:
        import aiortc  # type: ignore  # noqa: F401
        return True
    except Exception:
        return False


def unsupported_webrtc_payload() -> Dict[str, Any]:
    return {
        "supported": False,
        "reason": "Server WebRTC runtime is not installed. Falling back to WebSocket snapshot transcription.",
    }
