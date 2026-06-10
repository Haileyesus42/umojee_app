from __future__ import annotations

import json
import logging
import os
import re
import traceback
import uuid
from typing import Any, Dict, List, Optional

from langchain_core.messages import SystemMessage

from server.helpers import (
    _format_vector_hits,
    _from_lang_messages,
    _groq_configured,
    _maybe_embed,
    _to_lang_messages,
    _vector_search,
    ConversationMsg,
    console,
)
from server.mongo_repo import (
    append_message,
    create_conversation,
    get_active_journey_for_user,
    get_conversation,
    list_messages,
    update_conversation_title,
)

logger = logging.getLogger(__name__)

try:
    from agent.router import graph
    from agent.logging_handlers import PrettyLogHandler
except ImportError:
    from agent.router import graph  # type: ignore
    from agent.logging_handlers import PrettyLogHandler  # type: ignore


def _strip_for_tts(value: str) -> str:
    text = re.sub(r"```[\s\S]*?```", " ", value or "")
    text = re.sub(r"`[^`]*`", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"!\[(.*?)\]\((.*?)\)", r"\1", text)
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", text)
    text = re.sub(r"[*_#>-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_tts_text(value: str) -> str:
    try:
        parsed = json.loads(value)
        if isinstance(parsed, dict) and isinstance(parsed.get("ai_generated"), str):
            return _strip_for_tts(parsed["ai_generated"])
    except Exception:
        pass
    return _strip_for_tts(value)


async def run_voice_turn(
    *,
    message: str,
    user_id: str,
    conversation_id: Optional[str],
    user_name: Optional[str] = None,
    username: Optional[str] = None,
    user_data: Optional[Dict[str, Any]] = None,
    is_logged_in: Optional[bool] = None,
    speech_locale: Optional[str] = None,
) -> Dict[str, Any]:
    conv_id = conversation_id or str(uuid.uuid4())
    conv = get_conversation(conv_id)
    if not conv:
        conv = create_conversation(conv_id, user_id)

    user_text = (message or "").strip()
    user_embedding = _maybe_embed(user_text, as_query=True)
    append_message(conv_id, "human", user_text, embedding=user_embedding)

    if is_logged_in is False:
        login_url = os.getenv("LOGIN_URL")
        ai_text = "You're not logged in. Please log in to enable personalized assistance and bookings."
        if login_url:
            ai_text += f" Login here: {login_url}"
        ai_emb = _maybe_embed(ai_text, as_query=False)
        append_message(conv_id, "ai", ai_text, embedding=ai_emb)
        return {
            "ok": False,
            "login_required": True,
            "conversation_id": conv_id,
            "message": ai_text,
            "tts_text": _strip_for_tts(ai_text),
            **({"login_url": login_url} if login_url else {}),
        }

    if not _groq_configured():
        ai_text = "AI backend is not configured. Set GROQ_API_KEY in ai/.env to enable responses."
        ai_emb = _maybe_embed(ai_text, as_query=False)
        append_message(conv_id, "ai", ai_text, embedding=ai_emb)
        return {
            "ok": False,
            "conversation_id": conv_id,
            "message": ai_text,
            "tts_text": _strip_for_tts(ai_text),
        }

    vector_hits: List[Dict[str, Any]] = []
    if user_embedding:
        vector_hits = _vector_search(conv_id, user_embedding)

    msgs = list_messages(conv_id)
    lang_messages = _to_lang_messages([ConversationMsg(role=m.role, content=m.content) for m in msgs])
    user_payload = user_data if isinstance(user_data, dict) else {}

    try:
        resolved_username = user_name or username or str(user_payload.get("firstName") or user_payload.get("username") or "")
    except Exception:
        resolved_username = user_name or username or ""

    ctx_lines = [
        "User Context:",
        f"user_id={user_id}",
        f"conversation_id={conv_id}",
        f"username={resolved_username}",
        f"user_data_full={json.dumps(user_payload, ensure_ascii=False, default=str)}",
        "input_modality=voice",
        f"speech_locale={speech_locale or 'auto'}",
        "voice_session=true",
        "prefer_spoken_response=true",
        "When possible, keep the response concise, natural, and easy to speak aloud.",
    ]
    if speech_locale and not speech_locale.lower().startswith("en"):
        ctx_lines.extend([
            "MULTILINGUAL INSTRUCTION: You may reason in English internally, but the final user-facing response must be in the same language as the user's input.",
            f"MULTILINGUAL INSTRUCTION: Return the final ai_generated/message text in {speech_locale}.",
            "MULTILINGUAL INSTRUCTION: Do not tell the user you translated internally.",
        ])

    try:
        active_journey = get_active_journey_for_user(user_id) if user_id else None
        if active_journey and active_journey.get("_id"):
            ctx_lines.append(f"journey_id={str(active_journey['_id'])}")
    except Exception:
        pass

    for key in ("email", "firstName", "lastName", "country", "phone"):
        if key in user_payload:
            ctx_lines.append(f"{key}={user_payload.get(key)}")

    front = os.getenv("CLIENT_APP_ORIGIN") or os.getenv("BASE_URL") or "http://localhost:3000"
    ctx_lines.append(f"frontend_origin={front}")
    ctx_lines.append("Use this information to personalize responses. Never leak private data back unprompted.")

    lang_messages = [SystemMessage(content="\n".join(ctx_lines))] + lang_messages
    formatted_hits = _format_vector_hits(vector_hits)
    if formatted_hits:
        lang_messages = [SystemMessage(content=formatted_hits)] + lang_messages

    try:
        state = {"messages": lang_messages}
        prev_count = len(state["messages"])
        show_prompts = os.getenv("AI_LOG_PROMPTS", "false").lower() in ("1", "true", "yes")
        pretty = PrettyLogHandler(show_prompts=show_prompts)
        console.print("[bold blue]> Handling voice AI request with logging enabled[/bold blue]")
        result = await graph.ainvoke(state, config={"callbacks": [pretty], "tags": ["api", "voice", "respond"]})
        console.print("[bold blue]> Voice AI request complete[/bold blue]")
        result_dict = result if isinstance(result, dict) else {}
        out_messages = result_dict.get("messages", []) if isinstance(result_dict, dict) else []
        normalized_all = _from_lang_messages(out_messages)

        new_messages = out_messages[prev_count:] if len(out_messages) >= prev_count else []
        normalized_new = _from_lang_messages(new_messages) if new_messages else []
        ai_candidates = [m for m in normalized_new if m.role == "ai" and m.content]

        persisted_ai: List[ConversationMsg] = []
        if ai_candidates:
            chosen = ai_candidates[-1]
            ai_emb = _maybe_embed(chosen.content, as_query=False)
            append_message(conv_id, chosen.role, chosen.content, embedding=ai_emb, route=result_dict.get("route"))
            persisted_ai.append(chosen)
        else:
            all_ai = [m for m in normalized_all if m.role == "ai" and m.content]
            if all_ai:
                chosen = all_ai[-1]
                ai_emb = _maybe_embed(chosen.content, as_query=False)
                append_message(conv_id, chosen.role, chosen.content, embedding=ai_emb, route=result_dict.get("route"))
                persisted_ai.append(chosen)

        if not persisted_ai:
            fallback = ConversationMsg(role="ai", content="Sorry, I could not generate a response.")
            ai_emb = _maybe_embed(fallback.content, as_query=False)
            append_message(conv_id, fallback.role, fallback.content, embedding=ai_emb, route=result_dict.get("route"))
            persisted_ai.append(fallback)

        ai_text = persisted_ai[-1].content.strip() if persisted_ai[-1].content else ""
        orchestrator_title = result_dict.get("title")
        current_title = conv.title if conv else None
        if orchestrator_title and orchestrator_title != current_title:
            updated = update_conversation_title(conv_id, orchestrator_title)
            if updated:
                current_title = updated.title

        return {
            "ok": True,
            "conversation_id": conv_id,
            "message": ai_text,
            "messages": [{"role": m.role, "content": m.content, "route": result_dict.get("route")} for m in persisted_ai],
            "title": current_title,
            "route": result_dict.get("route"),
            "tts_text": _extract_tts_text(ai_text),
            "voice_enabled": True,
            "auto_play_voice": True,
        }
    except Exception as exc:
        logger.error("Voice turn failed: %s", exc)
        logger.debug("%s", traceback.format_exc())
        raise
