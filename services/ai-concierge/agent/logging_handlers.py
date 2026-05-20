from __future__ import annotations

from typing import Any, Dict, List, Optional

from langchain_core.callbacks.base import BaseCallbackHandler
from rich.console import Console
from rich.panel import Panel
from rich.text import Text


_console = Console(highlight=False)


def _safe(text: str) -> str:
    """Best-effort conversion to the console encoding."""
    encoding = getattr(getattr(_console, "file", None), "encoding", None) or getattr(
        _console, "encoding", None
    ) or "utf-8"
    try:
        return text.encode(encoding, errors="replace").decode(encoding, errors="replace")
    except LookupError:
        return text.encode("utf-8", errors="replace").decode("utf-8", errors="replace")


def _truncate(text: str, n: int = 220) -> str:
    """Trim multiline strings for compact console output."""
    try:
        shortened = text.strip().replace("\n", " \\n ")
    except Exception:
        shortened = str(text)
    safe = _safe(shortened)
    return safe[: n - 1] + ("..." if len(safe) > n else "")


class PrettyLogHandler(BaseCallbackHandler):
    """Rich-based callback handler that prints readable, colored logs."""

    def __init__(self, show_prompts: bool = True) -> None:
        super().__init__()
        self.show_prompts = show_prompts
        self._last_user: Optional[str] = None
        self._last_reply: Optional[str] = None

    # ------------------------------------------------------------------ helpers
    def _name_of(self, serialized: Dict[str, Any], name: Optional[str]) -> str:
        if name:
            return str(name)
        try:
            sid = serialized.get("id")
            if isinstance(sid, dict):
                return str(sid.get("name") or sid)
            return str(sid)
        except Exception:
            return name or "runnable"

    def _has(self, tags: Optional[List[str]], prefix: str) -> bool:
        return bool(tags and any(tag.startswith(prefix) for tag in tags))

    def _interesting_chain(
        self, name: str, tags: Optional[List[str]], parent_run_id: Optional[str]
    ) -> bool:
        # Only top-level or graph-step chains; hide noisy seq internals like Prompt/ChannelWrite
        if parent_run_id is None:
            return True
        if not tags:
            return False
        if not self._has(tags, "graph:step"):
            return False
        if name in {"supervisor", "agent", "tools", "call_model"}:
            return True
        agent_like = name.endswith("_agent") or name.startswith("agent:") or name in {
            "booking_agent",
            "luggage_agent",
            "seating_agent",
            "recommendation_agent",
            "checkin_agent",
        }
        return agent_like

    # --------------------------------------------------------------- chain hooks
    def on_chain_start(
        self,
        serialized: Dict[str, Any],
        inputs: Dict[str, Any],
        run_id: str,
        parent_run_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        run_type: Optional[str] = None,
        name: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        label = self._name_of(serialized, name)
        if not self._interesting_chain(label, tags, parent_run_id):
            return
        if tags:
            label = f"{label}  [dim]{', '.join(tags)}[/dim]"
        _console.print(Panel.fit(Text(f"Start {label}", style="bold cyan"), border_style="cyan"))

        # Show last user message if present
        try:
            messages = inputs.get("messages") or []
            if messages:
                latest = messages[-1]
                text = str(latest.content if hasattr(latest, "content") else latest)
                truncated = _truncate(text)
                if truncated != self._last_user:
                    _console.print(Text(f"User -> {truncated}", style="bright_white"))
                    self._last_user = truncated
        except Exception:
            pass

    def on_chain_end(
        self,
        outputs: Dict[str, Any],
        run_id: str,
        parent_run_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        name: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        if not self._interesting_chain(self._name_of({}, name), tags, parent_run_id):
            return
        # Show assistant reply snippet if available
        try:
            messages = outputs.get("messages") or []
            if messages:
                last = messages[-1]
                content = getattr(last, "content", None) or last
                truncated = _truncate(str(content))
                if truncated and truncated != self._last_reply:
                    _console.print(Text(f"Assistant -> {truncated}", style="green"))
                    self._last_reply = truncated
        except Exception:
            pass
        _console.print(Panel.fit(Text("Done", style="bold green"), border_style="green"))

    # ------------------------------------------------------------------- LLM hooks
    def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        run_id: str,
        parent_run_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        name: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        if not self.show_prompts:
            return
        # Only show prompts when inside an agent call or explicit call_model
        label = self._name_of(serialized, name)
        if not (self._has(tags, "agent:") or label == "call_model"):
            return
        try:
            model = serialized.get("kwargs", {}).get("model_name") or serialized.get("id")
        except Exception:
            model = serialized.get("id")
        _console.print(Text(f"LLM[{model}] prompt ->", style="magenta"))
        if prompts:
            _console.print(Text(_truncate(prompts[0]), style="dim"))

    def on_llm_end(  # type: ignore[override]
        self,
        response,
        run_id: str,
        parent_run_id: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        try:
            text = response.generations[0][0].text  # type: ignore[attr-defined]
            _console.print(Text(f"LLM reply -> {_truncate(text)}", style="magenta"))
        except Exception:
            pass

    # ----------------------------------------------------------------- tool hooks
    def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        run_id: str,
        parent_run_id: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        name = serialized.get("name", "tool")
        _console.print(Panel.fit(Text(f"Tool -> {name}", style="bold yellow"), border_style="yellow"))
        if input_str:
            _console.print(Text(_truncate(input_str), style="yellow"))

    def on_tool_end(
        self,
        output: str,
        run_id: str,
        parent_run_id: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        _console.print(Text(f"Tool result: {_truncate(str(output))}", style="bright_yellow"))

    def on_tool_error(
        self,
        error: BaseException,
        run_id: str,
        parent_run_id: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        _console.print(Text(f"Tool error: {error}", style="bold red"))
