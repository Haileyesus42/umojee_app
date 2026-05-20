import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import traceback
import httpx

logger = logging.getLogger(__name__)

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel

# Monitoring settings file path
MONITORING_SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "monitoring_settings.json")

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

try:
    from agent.router import graph
    from agent.logging_handlers import PrettyLogHandler
    from agent.journey.destination_recommendation.destination_recommendation_agent import destination_recommendation_agent
    from agent.travel_provider import (
        ACTIVE_TRAVEL_PROVIDER,
        ACTIVE_TRAVEL_PROVIDER_LABEL,
        active_save_booked_flight_to_journey,
    )
except ImportError:
    from agent.router import graph  # type: ignore
    from agent.logging_handlers import PrettyLogHandler  # type: ignore
    from agent.journey.destination_recommendation.destination_recommendation_agent import destination_recommendation_agent
    from agent.travel_provider import (  # type: ignore
        ACTIVE_TRAVEL_PROVIDER,
        ACTIVE_TRAVEL_PROVIDER_LABEL,
        active_save_booked_flight_to_journey,
    )

from server.helpers import (
    _bool_env,
    _format_vector_hits,
    _from_lang_messages,
    _groq_configured,
    _maybe_embed,
    _to_lang_messages,
    _vector_search,
    console,
    ConversationMsg,
    WebhookPayload,
)
from server.mongo_repo import (
    append_message,
    archive_journey,
    create_conversation,
    delete_all_journeys_for_user,
    delete_conversation,
    delete_journey,
    get_active_journey_for_user,
    get_conversation,
    get_journey as get_journey_doc,
    get_latest_destination_recommendation_log,
    last_message_text,
    list_destination_recommendation_logs_since,
    list_conversations_for_user,
    list_conversations_for_journey,
    list_general_conversations_for_user,
    list_journeys_for_user,
    list_messages,
    create_destination_recommendation_log,
    set_active_journey,
    update_conversation_title,
    update_journey,
)

router = APIRouter(prefix="/api/ai")


def _extract_destination_names_from_response(response: Optional[Dict[str, Any]]) -> List[str]:
    """Extract normalized destination names from a recommendation response."""
    if not isinstance(response, dict):
        return []
    api_response = response.get("api_response") or response.get("apiResponse") or {}
    items = api_response.get("items") if isinstance(api_response, dict) else None
    if not isinstance(items, list):
        return []
    names: List[str] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        country = str(item.get("country") or "").strip()
        if name:
            names.append(name.lower())
        if name and country:
            names.append(f"{name}, {country}".lower())
    return names


def _destination_items_are_five_unique_new(
    response: Dict[str, Any],
    excluded_names: set[str],
) -> bool:
    names = _extract_destination_names_from_response(response)
    primary_names = []
    api_response = response.get("api_response") or response.get("apiResponse") or {}
    items = api_response.get("items") if isinstance(api_response, dict) else None
    if isinstance(items, list):
        for item in items:
            if isinstance(item, dict) and item.get("name"):
                primary_names.append(str(item["name"]).strip().lower())
    return (
        len(primary_names) == 5
        and len(set(primary_names)) == 5
        and not (set(names) & excluded_names)
    )


async def _geocode_airport_code(airport_code: Optional[str]) -> tuple[Optional[float], Optional[float]]:
    """Resolve an airport IATA code like ADD to latitude/longitude."""
    code = (airport_code or "").strip().upper()
    if not code:
        return None, None

    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        logger.warning("Skipping airport geocoding for %s: GOOGLE_MAPS_API_KEY not configured", code)
        return None, None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": f"{code} Airport", "key": api_key},
            )
        logger.info("Geocoding '%s Airport' - API response status: %s", code, response.status_code)

        if response.status_code != 200:
            return None, None

        payload = response.json()
        if payload.get("status") != "OK" or not payload.get("results"):
            logger.warning("Airport geocoding failed for %s: %s", code, payload.get("status"))
            return None, None

        location = payload["results"][0]["geometry"]["location"]
        return float(location["lat"]), float(location["lng"])
    except Exception as exc:
        logger.warning("Airport geocoding error for %s: %s", code, exc)
        return None, None


# Schemas for requests
class SessionBase(BaseModel):
    user_id: str
    user_name: Optional[str] = None
    username: Optional[str] = None
    user_data: Optional[Dict[str, Any]] = None
    is_logged_in: Optional[bool] = None
    force_refetch: Optional[bool] = None


class SessionStart(SessionBase):
    conversation_id: str


class SessionDelete(SessionBase):
    conversation_id: str


class RespondPayload(SessionBase):
    message: str
    conversation_id: Optional[str] = None
    input_method: Optional[str] = None
    speech_locale: Optional[str] = None
    voice_output_requested: Optional[bool] = None


def _parse_ai_generated_json(raw: str) -> Optional[Dict[str, Any]]:
    """Robustly parse structured JSON from LLM output.

    LLMs sometimes produce slightly malformed JSON (extra trailing braces,
    markdown fences, etc.).  This helper tries multiple strategies to extract
    a valid dict with an ``ai_generated`` key.
    """
    if not raw or not isinstance(raw, str):
        return None

    text = raw.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[-1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].rstrip()

    # Strategy 1: direct parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict) and "ai_generated" in parsed:
            return parsed
    except (json.JSONDecodeError, ValueError):
        pass

    # Strategy 2: raw_decode — parse the first valid JSON object
    try:
        decoder = json.JSONDecoder()
        # Find the first '{' to start decoding
        start = text.index("{")
        parsed, _ = decoder.raw_decode(text, start)
        if isinstance(parsed, dict) and "ai_generated" in parsed:
            return parsed
    except (json.JSONDecodeError, ValueError):
        pass

    # Strategy 3: regex extraction of ai_generated value
    import re
    m = re.search(r'"ai_generated"\s*:\s*"((?:[^"\\]|\\.)*)"', text)
    if m:
        try:
            ai_gen = json.loads(f'"{m.group(1)}"')  # unescape the string
            # Try to build a partial result — also extract api_response block
            result: Dict[str, Any] = {"ai_generated": ai_gen, "message": ai_gen}
            # Look for api_response_type
            t = re.search(r'"api_response_type"\s*:\s*"([^"]*)"', text)
            if t:
                result["api_response_type"] = t.group(1)
            # Look for trigger_popup
            tp = re.search(r'"trigger_popup"\s*:\s*(true|false)', text)
            if tp:
                result["trigger_popup"] = tp.group(1) == "true"
            # Try to extract api_response as raw JSON substring
            ar = re.search(r'"api_response"\s*:\s*(\{[\s\S]+\})\s*[,}]', text)
            if ar:
                try:
                    result["api_response"] = json.loads(ar.group(1))
                except (json.JSONDecodeError, ValueError):
                    pass
            return result
        except Exception:
            pass
    return None


def _recover_ai_response_from_failed_tool_call(exc: Exception) -> Optional[Dict[str, Any]]:
    """Try to extract a valid structured response when the LLM erroneously
    attempts to call a ``json`` tool (or similar non-existent tool).

    Groq returns the would-be generation in the ``failed_generation`` field
    of the error body.  This helper parses it and returns the dict
    if valid, or ``None`` otherwise.
    """
    try:
        # The Groq/OpenAI SDK stores the parsed response body on the exception
        body = getattr(exc, "body", None)
        if isinstance(body, dict):
            failed_gen_str = body.get("error", {}).get("failed_generation", "")
        else:
            # Fallback: extract from string representation
            exc_str = str(exc)
            if "failed_generation" not in exc_str:
                return None
            import re
            match = re.search(r'"failed_generation":\s*"((?:[^"\\]|\\.)*)"', exc_str)
            if not match:
                return None
            failed_gen_str = match.group(1).encode().decode("unicode_escape")

        if not failed_gen_str:
            return None

        parsed = json.loads(failed_gen_str)
        # The model wraps the response as {"name": "json", "arguments": {...}}
        if isinstance(parsed, dict) and "arguments" in parsed:
            response_data = parsed["arguments"]
        else:
            response_data = parsed

        if isinstance(response_data, dict) and "ai_generated" in response_data:
            return response_data
    except Exception:
        pass
    return None


def _strip_for_tts(value: str) -> str:
    import re

    text = re.sub(r"```[\s\S]*?```", " ", value or "")
    text = re.sub(r"`[^`]*`", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"!\[(.*?)\]\((.*?)\)", r"\1", text)
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", text)
    text = re.sub(r"[*_#>-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_tts_text(value: str) -> str:
    parsed = _parse_ai_generated_json(value)
    if parsed and isinstance(parsed.get("ai_generated"), str):
        return _strip_for_tts(parsed["ai_generated"])
    return _strip_for_tts(value)


async def _maybe_sync_loops(request: Request):
    """Trigger background loop synchronization if controller is available."""
    if hasattr(request.app.state, "loop_controller"):
        await request.app.state.loop_controller.sync()


@router.get("/hello")
def hello():
    return {
        "ok": True,
        "service": "umojai",
        "graph": "supervisor",
        "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        "groq_configured": _groq_configured(),
    }


@router.post("/session/new")
async def session_new(payload: SessionBase, request: Request):
    conv_id = str(uuid.uuid4())
    console.print("[bold blue]> payload for new session:[/bold blue]", payload)
    
    # Sync monitoring preference if present in user_data
    if payload.user_data and isinstance(payload.user_data, dict):
        pref = payload.user_data.get("journeyMonitoringPreference")
        if pref and payload.user_id:
            _update_local_preference(payload.user_id, pref)
            await _maybe_sync_loops(request)
            
    create_conversation(conv_id, payload.user_id)
    resp: Dict[str, Any] = {"conversation_id": conv_id}
    if payload.is_logged_in is False:
        login_url = os.getenv("LOGIN_URL")
        if login_url:
            resp["login_url"] = login_url
            resp["message"] = "Please login to access your account-linked features."
        return resp

    return resp


@router.post("/session/list")
def session_list(payload: SessionBase):
    convs_db = list_conversations_for_user(payload.user_id)
    convs = []
    for c in convs_db:
        last = last_message_text(c.id)
        convs.append(
            {
                "id": c.id,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                "title": c.title or None,
                "last_message": last,
            }
        )
    return {"conversations": convs}


@router.post("/session/start")
async def session_start(payload: SessionStart, request: Request):
    # Sync monitoring preference if present in user_data
    if payload.user_data and isinstance(payload.user_data, dict):
        pref = payload.user_data.get("journeyMonitoringPreference")
        if pref and payload.user_id:
            _update_local_preference(payload.user_id, pref)
            await _maybe_sync_loops(request)
            
    conv = get_conversation(payload.conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = list_messages(conv.id)
    return {
        "conversation_id": conv.id,
        "messages": [{"role": m.role, "content": m.content, "route": getattr(m, "route", None)} for m in msgs],
    }


@router.post("/session/delete")
def session_delete(payload: SessionDelete):
    conv = get_conversation(payload.conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id != payload.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not delete_conversation(payload.conversation_id):
        raise HTTPException(status_code=500, detail="Failed to delete conversation")
    return {"ok": True, "conversation_id": payload.conversation_id}


@router.post("/respond")
async def respond(payload: RespondPayload):
    conv_id = payload.conversation_id or str(uuid.uuid4())
    conv = get_conversation(conv_id)
    if not conv:
        conv = create_conversation(conv_id, payload.user_id)
    # Append user message
    user_text = payload.message.strip()
    
    # Context resolution: disambiguate pronouns and detect implicit intents
    from agent.context_resolver import resolve_user_message, build_context_for_resolver
    msgs = list_messages(conv_id)
    lang_messages = _to_lang_messages([ConversationMsg(role=m.role, content=m.content) for m in msgs])
    
    # Get active journey context if available
    journey_ctx = None
    try:
        if payload.user_id:
            active_journey = get_active_journey_for_user(payload.user_id)
            if active_journey:
                journey_ctx = active_journey.get("context", {})
    except Exception:
        pass
    
    resolution = resolve_user_message(user_text, lang_messages, journey_ctx)
    resolved_text = resolution.get("resolved_message", user_text)
    implicit_intent = resolution.get("implicit_intent")
    trigger_action = resolution.get("trigger_action")
    context_hints = resolution.get("context_hints", {})
    
    # Log resolution for debugging
    if resolved_text != user_text:
        logger.info(f"Context resolution: '{user_text}' → '{resolved_text}'")
    
    # Handle implicit intent triggers
    if trigger_action and active_journey and active_journey.get("_id"):
        journey_id = active_journey["_id"]
        try:
            from agent.implicit_intent_handler import handle_implicit_intent
            from server.main import state_manager, context_monitor, ws_manager
            
            intent_result = await handle_implicit_intent(
                trigger_action=trigger_action,
                implicit_intent=implicit_intent,
                context_hints=context_hints,
                journey_id=journey_id,
                state_manager=state_manager,
                context_monitor=context_monitor,
                ws_manager=ws_manager,
            )
            
            if intent_result.get("action_taken"):
                logger.info(f"Implicit intent handled: {intent_result}")
        except Exception as e:
            logger.warning(f"Implicit intent handler failed: {e}")
    
    user_embedding = _maybe_embed(resolved_text, as_query=True)
    user_msg = ConversationMsg(role="human", content=resolved_text)
    append_message(conv_id, user_msg.role, user_msg.content, embedding=user_embedding)

    # If the user is not logged in, short-circuit with a friendly login nudge
    if payload.is_logged_in is False:
        login_url = os.getenv("LOGIN_URL")
        ai_text = (
            "You're not logged in. Please log in to enable personalized assistance and bookings."
        )
        if login_url:
            ai_text += f" Login here: {login_url}"
        ai_emb = _maybe_embed(ai_text, as_query=False)
        append_message(conv_id, "ai", ai_text, embedding=ai_emb)
        return {
            "ok": False,
            "login_required": True,
            "conversation_id": conv_id,
            "message": ai_text,
            **({"login_url": login_url} if login_url else {}),
        }

    # If GROQ is not configured, return a friendly stub so the UI stays usable
    if not _groq_configured():
        ai_text = (
            "AI backend is not configured. Set GROQ_API_KEY in ai/.env to enable responses."
        )
        ai_emb = _maybe_embed(ai_text, as_query=False)
        append_message(conv_id, "ai", ai_text, embedding=ai_emb)
        return {"ok": False, "conversation_id": conv_id, "message": ai_text}

    # Build LangGraph input and invoke supervisor
    vector_hits: List[Dict[str, Any]] = []
    if user_embedding:
        vector_hits = _vector_search(conv_id, user_embedding)

    msgs = list_messages(conv_id)
    lang_messages = _to_lang_messages([ConversationMsg(role=m.role, content=m.content) for m in msgs])

    # Inject user context for logged-in sessions so all agents can personalize
    # Frontend always provides full user_data; include everything plus conversation_id for booking tools
    user_payload = payload.user_data if isinstance(payload.user_data, dict) else {}
    try:
        username = (
            payload.user_name
            or payload.username
            or str(user_payload.get("firstName") or user_payload.get("username") or "")
        )
    except Exception:
        username = payload.user_name or payload.username or ""
    ctx_lines = [
        "User Context:",
        f"user_id={payload.user_id}",
        f"conversation_id={conv_id}",
        f"username={username}",
        f"user_data_full={json.dumps(user_payload, ensure_ascii=False, default=str)}",
    ]
    if payload.input_method == "voice":
        ctx_lines.append("input_modality=voice")
    if payload.speech_locale:
        ctx_lines.append(f"speech_locale={payload.speech_locale}")
        if not payload.speech_locale.lower().startswith("en"):
            ctx_lines.extend([
                "MULTILINGUAL INSTRUCTION: You may reason in English internally, but the final user-facing response must be in the same language as the user's input.",
                f"MULTILINGUAL INSTRUCTION: Return the final ai_generated/message text in {payload.speech_locale}.",
                "MULTILINGUAL INSTRUCTION: Do not mention translation or language switching unless the user asks.",
            ])
    # Include active journey_id when user has one (for Update_Journey_Workflow routing and auto flight-save)
    try:
        if payload.user_id:
            active_journey = get_active_journey_for_user(payload.user_id)
            if active_journey and active_journey.get("_id"):
                active_journey_id = str(active_journey["_id"])
                ctx_lines.append(f"journey_id={active_journey_id}")
                ctx_lines.append(
                    f"FLIGHT SAVE INSTRUCTION: A journey_id ({active_journey_id}) is active. "
                    f"After every successful flight search, the active {ACTIVE_TRAVEL_PROVIDER_LABEL} recommendation agent MUST "
                    "automatically save the recommended flights to this journey_id before responding."
                )
    except Exception:
        pass
    # Include a few common fields if present (kept for quick parsing)
    for k in ("email", "firstName", "lastName", "country", "phone"):
        if k in user_payload:
            ctx_lines.append(f"{k}={user_payload.get(k)}")
    # Include location if provided by the frontend (localStorage 'user_location')
    try:
        loc = user_payload.get("location")
        if isinstance(loc, dict):
            lat = loc.get("lat")
            lon = loc.get("lon")
            city = loc.get("city")
            if lat is not None and lon is not None:
                ctx_lines.append(f"location_lat={lat}")
                ctx_lines.append(f"location_lon={lon}")
            if city:
                ctx_lines.append(f"location_city={city}")
    except Exception:
        pass
    # Provide frontend origin so agents can emit usable links
    front = os.getenv("CLIENT_APP_ORIGIN") or os.getenv("BASE_URL") or "http://localhost:3000"
    ctx_lines.append(f"frontend_origin={front}")
    ctx_lines.append(
        "Use this information to personalize responses. Never leak private data back unprompted."
    )
    # Prepend a SystemMessage so the entire graph sees the context
    lang_messages = [SystemMessage(content="\n".join(ctx_lines))] + lang_messages
    # Inject vector search recalls ahead of history to ground the model
    formatted_hits = _format_vector_hits(vector_hits)
    if formatted_hits:
        lang_messages = [SystemMessage(content=formatted_hits)] + lang_messages
    try:
        state = {"messages": lang_messages}
        prev_count = len(state["messages"])
        # Attach rich-based pretty logs so you can see supervisor decisions,
        # agent routing, tool calls, and brief LLM prompts in the server console.
        show_prompts = os.getenv("AI_LOG_PROMPTS", "false").lower() in ("1", "true", "yes")
        pretty = PrettyLogHandler(show_prompts=show_prompts)
        console.print("[bold blue]> Handling AI request with logging enabled[/bold blue]")
        result = await graph.ainvoke(state, config={"callbacks": [pretty], "tags": ["api", "respond"]})
        console.print("[bold blue]> AI request complete[/bold blue]")
        # Expect result dict with "messages" list
        # Normalize result to a dict for safe .get calls (graph.invoke may return a list)
        result_dict = result if isinstance(result, dict) else {}
        out_messages = result_dict.get("messages", []) if isinstance(result_dict, dict) else []
        normalized_all = _from_lang_messages(out_messages)

        new_messages = out_messages[prev_count:] if len(out_messages) >= prev_count else []
        normalized_new = _from_lang_messages(new_messages) if new_messages else []
        ai_candidates = [m for m in normalized_new if m.role == "ai" and m.content]

        persisted_ai: List[ConversationMsg] = []
        if ai_candidates:
            # Use only the last AI message (typically the synthesizer output)
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

        # Persist any orchestrator-provided title (they may update it later).
        current_title = conv.title if conv else None
        orchestrator_title = result_dict.get("title")
        if orchestrator_title and orchestrator_title != current_title:
            updated = update_conversation_title(conv_id, orchestrator_title)
            if updated:
                conv = updated
                current_title = updated.title
            else:
                current_title = orchestrator_title
        route_info = result_dict.get("route")

        if persisted_ai:
            try:
                console.log("[respond] Persisted last AI message", {
                    "conversation_id": conv_id,
                    "message": persisted_ai[-1].content[:200],
                    "api_route": route_info,
                })
            except Exception:
                console.print(f"[respond] Persisted last AI message: conv_id={conv_id}, len={len(persisted_ai[-1].content) if persisted_ai[-1].content else 0}")

        # Expose journey_id when Journey_Workflow created one (7.5: client can store for next turn)
        journey_id_out = None
        if route_info == "Journey_Workflow":
            sd = result_dict.get("segment_data")
            if isinstance(sd, dict) and sd.get("journey_id"):
                journey_id_out = sd["journey_id"]

        return {
            "ok": True,
            "conversation_id": conv_id,
            "message": ai_text,
            "messages": [
                {"role": m.role, "content": m.content, "route": route_info}
                for m in persisted_ai
            ],
            "title": current_title,
            "route": route_info,
            "tts_text": _extract_tts_text(ai_text),
            "voice_enabled": True,
            "auto_play_voice": bool(payload.voice_output_requested or payload.input_method == "voice"),
            **({"journey_id": journey_id_out} if journey_id_out else {}),
        }
    except Exception as e:
        # Check if this is a tool hallucination error we can recover from
        recovered = _recover_ai_response_from_failed_tool_call(e)
        if recovered:
            console.print("[green]> Recovered structured JSON from hallucinated tool call[/green]")
            ai_text = json.dumps(recovered)
            ai_emb = _maybe_embed(ai_text, as_query=False)
            append_message(conv_id, "ai", ai_text, embedding=ai_emb)
            
            return {
                "ok": True,
                "conversation_id": conv_id,
                "message": ai_text,
                "messages": [{"role": "ai", "content": ai_text, "route": None}],
                "title": conv.title if conv else None,
                "route": None,
                "tts_text": _extract_tts_text(ai_text),
                "voice_enabled": True,
                "auto_play_voice": bool(payload.voice_output_requested or payload.input_method == "voice"),
            }

        # Graceful handling for provider rate limits / 429s
        emsg = str(e)
        # Log full traceback for debugging
        try:
            console.print("[red]Exception in /respond:[/red]")
            console.print(traceback.format_exc())
        except Exception:
            pass
        if (
            "rate limit" in emsg.lower()
            or "rate_limit_exceeded" in emsg.lower()
            or "429" in emsg
        ):
            ai_text = (
                "We're temporarily out of AI capacity (rate limit). Please try again in a few minutes."
            )
            append_message(conv_id, "ai", ai_text)
            # 429 Too Many Requests - hint to caller that a retry later may succeed
            raise HTTPException(status_code=429, detail=ai_text)
        raise HTTPException(status_code=500, detail=f"Model error: {type(e).__name__}: {e}")


@router.post("/hooks/flight-update")
def flight_update_hook(payload: WebhookPayload):
    console.print(f"[bold red]>> WEBHOOK RECEIVED:[/bold red] {payload.data.flightNumber} ({payload.data.provider}) Status: {payload.data.newStatus}")

    conv_id = payload.threadId
    if not conv_id:
        conv_id = str(uuid.uuid4())
        create_conversation(conv_id, payload.userId)
    else:
        if not get_conversation(conv_id):
            create_conversation(conv_id, payload.userId)

    status = payload.data.newStatus.upper()
    flight_label = f"{payload.data.flightNumber} ({payload.data.airline or ''})"
    delay_min = payload.data.delayDuration or 0
    provider_name = payload.data.provider or "Amadeus"

    visible_message = f"[ALERT] FLIGHT {flight_label} STATUS UPDATE: {status}."
    
  
    hidden_instruction = ""
    
    if "CANCEL" in status:
        visible_message += f"\nYour flight has been CANCELLED by the airline."
        hidden_instruction = (
            "SYSTEM URGENT UPDATE: The user's flight has been cancelled.\n"
            "INSTRUCTIONS:\n"
            "1. Express empathy for the disruption.\n"
            "2. DO NOT offer to rebook flights (Agent limitation).\n"
            "3. ACTION: You MUST use your 'hotel_search' tool (or similar) to find 3 available hotels near the airport immediately.\n"
            "4. Present these hotel options to the user with prices if available.\n"
            "5. Keep the response helpful but concise."
        )
    elif "DELAY" in status:
        visible_message += f"\nNew Departure Time: {payload.data.newTime} (Delayed by {delay_min} mins)."
        if delay_min > 90:
            hidden_instruction = (
                f"SYSTEM UPDATE: Flight delayed by {delay_min} minutes.\n"
                "INSTRUCTIONS:\n"
                "1. Acknowledge the significant delay.\n"
                "2. Suggest checking duty-free or restaurants to pass the time.\n"
                "3. DO NOT suggest hotels for a delay of this length.\n"
                "4. Be helpful and upbeat."
            )
        else:
            hidden_instruction = (
                f"SYSTEM UPDATE: Flight delayed by {delay_min} minutes.\n"
                "INSTRUCTIONS:\n"
                "1. Inform the user it is a short wait.\n"
                "2. Suggest relaxing near the gate.\n"
                "3. Keep it concise."
            )
    else:
        visible_message += f"\nNew Gate: {payload.data.gate}"
        hidden_instruction = "SYSTEM UPDATE: Gate change detected. Inform the user clearly."

    trigger_embedding = _maybe_embed(visible_message, as_query=True)
    append_message(conv_id, "human", visible_message, embedding=trigger_embedding)

    try:

        msgs = list_messages(conv_id)
        lang_messages = _to_lang_messages([ConversationMsg(role=m.role, content=m.content) for m in msgs])
        

        lang_messages.append(SystemMessage(content=hidden_instruction))
        state = {"messages": lang_messages}
        
        console.print(f"[bold blue]> Triggering AI ({provider_name} - Delay: {delay_min}m)...[/bold blue]")
        
        result = graph.invoke(state, config={"tags": ["api", "webhook", "strict_mode"]})
        
        out_messages = result.get("messages", [])
        new_ai_msgs = [m for m in out_messages if isinstance(m, AIMessage) and m.content]
        
        if not new_ai_msgs:
            return {"ok": False, "reason": "No response generated"}

        final_response = new_ai_msgs[-1]

        ai_emb = _maybe_embed(final_response.content, as_query=False)
        append_message(conv_id, "ai", final_response.content, embedding=ai_emb)

        console.print(f"[green]>> AI Response Saved:[/green] {final_response.content[:50]}...")

        return {
            "ok": True, 
            "conversation_id": conv_id, 
            "message": final_response.content
        }

    except Exception as e:
        console.print(f"[bold red]Webhook Error:[/bold red] {e}")

        fallback = f"Alert: Flight {payload.data.flightNumber} status is {status}. Please check airport screens."
        append_message(conv_id, "ai", fallback)
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# Journey Monitoring Preference Endpoint
# =============================================================================

class MonitoringPreferencePayload(BaseModel):
    user_id: str
    journeyMonitoringPreference: str

def _update_local_preference(user_id: str, pref: str):
    """Internal helper to update the local settings map."""
    try:
        # Load existing
        settings = {}
        if os.path.exists(MONITORING_SETTINGS_FILE):
            with open(MONITORING_SETTINGS_FILE, "r") as f:
                settings = json.load(f)
        
        # Update and save
        settings[user_id] = pref
        with open(MONITORING_SETTINGS_FILE, "w") as f:
            json.dump(settings, f)
    except Exception as e:
        logger.warning(f"Failed to sync monitoring preference for user {user_id}: {e}")

@router.post("/monitoring/preference")
async def update_monitoring_preference(payload: MonitoringPreferencePayload, request: Request):
    """
    Update the user's monitoring preference and persist to the local file.
    """
    try:
        pref = payload.journeyMonitoringPreference
        user_id = payload.user_id
        if pref not in ('all', 'active', 'off'):
            raise HTTPException(status_code=400, detail="Invalid preference value")
        
        _update_local_preference(user_id, pref)
        await _maybe_sync_loops(request)
        
        logger.info(f"Monitoring preference for user {user_id} updated to: {pref}")
        return {"ok": True, "preference": pref}
    except Exception as e:
        logger.error(f"Failed to update monitoring preference: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/monitoring/sync")
async def sync_monitoring_preference(payload: MonitoringPreferencePayload, request: Request):
    """
    Silent sync of monitoring preference from the client.
    Used when the app loads to ensure the FastAPI backend is aware of the user's setting.
    """
    try:
        _update_local_preference(payload.user_id, payload.journeyMonitoringPreference)
        await _maybe_sync_loops(request)
        return {"ok": True}
    except Exception as e:
        logger.error(f"Failed to sync monitoring preference: {e}")
        return {"ok": False, "error": str(e)}


# =============================================================================
# Journey-Context Chat Endpoint (BottomChatBar on JourneyHomePage)
# =============================================================================

class JourneyRespondPayload(RespondPayload):
    """Same as RespondPayload — journey_id comes from the path."""
    pass


@router.post("/journey/{journey_id}/respond")
async def journey_respond(journey_id: str, payload: JourneyRespondPayload):
    """Chat endpoint that injects the full journey document as context.

    Used by JourneyHomePage's BottomChatBar so the AI orchestrator sees the
    user's active journey (current segment, context, bookings, etc.) and routes
    to Update_Journey_Workflow for journey management or Amadeus_Workflow for
    flight/hotel/car searches, with auto-save of recommended flights to the journey.
    """
    # ── 1. Resolve (or create) the conversation ──────────────────────────────
    conv_id = payload.conversation_id or str(uuid.uuid4())
    conv = get_conversation(conv_id)
    if not conv:
        conv = create_conversation(conv_id, payload.user_id, journey_id=journey_id)

    # ── 2. Fetch journey document for context injection ───────────────────────
    journey_doc: Optional[Dict[str, Any]] = None
    try:
        journey_doc = get_journey_doc(journey_id)
        if journey_doc:
            # Serialise ObjectId to string so json.dumps works
            if "_id" in journey_doc:
                journey_doc["_id"] = str(journey_doc["_id"])
    except Exception as exc:
        logger.warning(f"[journey_respond] Could not fetch journey {journey_id}: {exc}")

    # ── 3. Persist the user message ───────────────────────────────────────────
    user_text = payload.message.strip()
    user_embedding = _maybe_embed(user_text, as_query=True)
    append_message(conv_id, "human", user_text, embedding=user_embedding)

    # Short-circuit if AI is not configured
    if not _groq_configured():
        fallback = "AI backend is not configured. Set GROQ_API_KEY in ai/.env to enable responses."
        append_message(conv_id, "ai", fallback)
        return {"ok": False, "conversation_id": conv_id, "message": fallback}

    # ── 4. Build LangGraph input with User Context + Journey Context ──────────
    msgs = list_messages(conv_id)
    lang_messages = _to_lang_messages([ConversationMsg(role=m.role, content=m.content) for m in msgs])

    # User context (same as /respond)
    user_payload = payload.user_data if isinstance(payload.user_data, dict) else {}
    try:
        username = (
            payload.user_name
            or payload.username
            or str(user_payload.get("firstName") or user_payload.get("username") or "")
        )
    except Exception:
        username = payload.user_name or payload.username or ""

    user_ctx_lines = [
        "User Context:",
        f"user_id={payload.user_id}",
        f"conversation_id={conv_id}",
        f"username={username}",
        f"user_data_full={json.dumps(user_payload, ensure_ascii=False, default=str)}",
        f"journey_id={journey_id}",
    ]
    if payload.input_method == "voice":
        user_ctx_lines.append("input_modality=voice")
    if payload.speech_locale:
        user_ctx_lines.append(f"speech_locale={payload.speech_locale}")
        if not payload.speech_locale.lower().startswith("en"):
            user_ctx_lines.extend([
                "MULTILINGUAL INSTRUCTION: You may reason in English internally, but the final user-facing response must be in the same language as the user's input.",
                f"MULTILINGUAL INSTRUCTION: Return the final ai_generated/message text in {payload.speech_locale}.",
                "MULTILINGUAL INSTRUCTION: Do not mention translation or language switching unless the user asks.",
            ])
    for k in ("email", "firstName", "lastName", "country", "phone"):
        if k in user_payload:
            user_ctx_lines.append(f"{k}={user_payload.get(k)}")
    try:
        loc = user_payload.get("location")
        if isinstance(loc, dict):
            if loc.get("lat") is not None and loc.get("lon") is not None:
                user_ctx_lines.append(f"location_lat={loc['lat']}")
                user_ctx_lines.append(f"location_lon={loc['lon']}")
            if loc.get("city"):
                user_ctx_lines.append(f"location_city={loc['city']}")
    except Exception:
        pass
    front = os.getenv("CLIENT_APP_ORIGIN") or os.getenv("BASE_URL") or "http://localhost:3000"
    user_ctx_lines.append(f"frontend_origin={front}")
    user_ctx_lines.append("Use this information to personalize responses. Never leak private data back unprompted.")

    lang_messages = [SystemMessage(content="\n".join(user_ctx_lines))] + lang_messages

    # Journey context — inject full journey state so Update_Journey_Workflow and
    # the active travel-provider agents can read the current segment and context without a DB lookup.
    if journey_doc:
        journey_ctx_lines = [
            "Journey Context:",
            f"journey_id={journey_id}",
            f"current_segment={journey_doc.get('current_segment', 'unknown')}",
            f"status={journey_doc.get('status', 'unknown')}",
            f"context_json={json.dumps(journey_doc.get('context', {}), ensure_ascii=False, default=str)}",
            f"segments_json={json.dumps(journey_doc.get('segments', []), ensure_ascii=False, default=str)}",
            "CRITICAL ROUTING INSTRUCTION: The user is messaging from the specific Journey Dashboard page for this journey.",
            "Prefer routing to 'Update_Journey_Workflow' for journey status, planning advice, segment transitions, or any journey management.",
            f"However, if the user explicitly requests to search, compare, book, or SAVE flights, hotels, or cars, route to 'Amadeus_Workflow' using the active travel provider ({ACTIVE_TRAVEL_PROVIDER_LABEL}) and this journey context.",
            f"FLIGHT SAVE INSTRUCTION: A journey_id ({journey_id}) is active. After every successful flight search, the active {ACTIVE_TRAVEL_PROVIDER_LABEL} recommendation agent MUST automatically save the recommended flights to this journey_id before responding.",
            f"ACTIVE_TRAVEL_PROVIDER={ACTIVE_TRAVEL_PROVIDER}",
        ]
        lang_messages = [SystemMessage(content="\n".join(journey_ctx_lines))] + lang_messages

    # Vector search recall
    if user_embedding:
        vector_hits = _vector_search(conv_id, user_embedding)
        formatted_hits = _format_vector_hits(vector_hits)
        if formatted_hits:
            lang_messages = [SystemMessage(content=formatted_hits)] + lang_messages

    # ── 5. Invoke orchestrator ────────────────────────────────────────────────
    try:
        show_prompts = os.getenv("AI_LOG_PROMPTS", "false").lower() in ("1", "true", "yes")
        pretty = PrettyLogHandler(show_prompts=show_prompts)
        prev_count = len(lang_messages)
        state = {"messages": lang_messages}
        console.print(f"[bold blue]> [journey_respond] Invoking orchestrator for journey {journey_id}[/bold blue]")
        result = await graph.ainvoke(state, config={"callbacks": [pretty], "tags": ["api", "journey_chat"]})
        console.print("[bold blue]> [journey_respond] Done[/bold blue]")

        result_dict = result if isinstance(result, dict) else {}
        out_messages = result_dict.get("messages", [])
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
            fallback_msg = ConversationMsg(role="ai", content="Sorry, I could not generate a response.")
            append_message(conv_id, fallback_msg.role, fallback_msg.content)
            persisted_ai.append(fallback_msg)

        ai_text = persisted_ai[-1].content.strip() if persisted_ai[-1].content else ""
        route_info = result_dict.get("route")

        # Persist orchestrator title if provided
        current_title = conv.title if conv else None
        orchestrator_title = result_dict.get("title")
        if orchestrator_title and orchestrator_title != current_title:
            updated = update_conversation_title(conv_id, orchestrator_title)
            if updated:
                current_title = updated.title

        return {
            "ok": True,
            "conversation_id": conv_id,
            "journey_id": journey_id,
            "message": ai_text,
            "messages": [
                {"role": m.role, "content": m.content, "route": route_info}
                for m in persisted_ai
            ],
            "title": current_title,
            "route": route_info,
            "tts_text": _extract_tts_text(ai_text),
            "voice_enabled": True,
            "auto_play_voice": bool(payload.voice_output_requested or payload.input_method == "voice"),
        }

    except Exception as e:
        # Check if this is a tool hallucination error we can recover from
        recovered = _recover_ai_response_from_failed_tool_call(e)
        if recovered:
            console.print("[green]> Recovered structured JSON from hallucinated tool call[/green]")
            ai_text = json.dumps(recovered)
            ai_emb = _maybe_embed(ai_text, as_query=False)
            append_message(conv_id, "ai", ai_text, embedding=ai_emb)
            
            return {
                "ok": True,
                "conversation_id": conv_id,
                "journey_id": journey_id,
                "message": ai_text,
                "messages": [{"role": "ai", "content": ai_text, "route": None}],
                "title": conv.title if conv else None,
                "route": None,
                "tts_text": _extract_tts_text(ai_text),
                "voice_enabled": True,
                "auto_play_voice": bool(payload.voice_output_requested or payload.input_method == "voice"),
            }

        emsg = str(e)
        try:
            console.print("[red]Exception in /journey/{id}/respond:[/red]")
            console.print(traceback.format_exc())
        except Exception:
            pass
        if "rate limit" in emsg.lower() or "429" in emsg:
            ai_text = "We're temporarily out of AI capacity (rate limit). Please try again in a few minutes."
            append_message(conv_id, "ai", ai_text)
            raise HTTPException(status_code=429, detail=ai_text)
        raise HTTPException(status_code=500, detail=f"Model error: {type(e).__name__}: {e}")


# =============================================================================
# Conversation Listing Endpoints (for ConversationDrawer)
# =============================================================================

@router.get("/journey/{journey_id}/conversations")
def list_journey_conversations(journey_id: str):
    """List all conversations linked to a specific journey (for ConversationDrawer on JourneyHomePage)."""
    try:
        convs = list_conversations_for_journey(journey_id)
        result = []
        for c in convs:
            last = last_message_text(c.id)
            result.append({
                "id": c.id,
                "journey_id": c.journey_id,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                "title": c.title or None,
                "last_message": last[:120] if last else None,
            })
        return {"ok": True, "conversations": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/session/list-general")
def session_list_general(payload: SessionBase):
    """List conversations NOT linked to any journey — for JourneyListingPage ConversationDrawer."""
    convs = list_general_conversations_for_user(payload.user_id)
    result = []
    for c in convs:
        last = last_message_text(c.id)
        result.append({
            "id": c.id,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "title": c.title or None,
            "last_message": last[:120] if last else None,
        })
    return {"conversations": result}


# =============================================================================
# Journey User Endpoints
# =============================================================================

@router.get("/journey/user/{user_id}")
def list_user_journeys(user_id: str, limit: int = 20):
    """List all journeys for a user, sorted by most recent."""
    try:
        journeys = list_journeys_for_user(user_id, limit=limit)
        # Convert ObjectId fields to strings for JSON serialisation
        for j in journeys:
            if "_id" in j:
                j["_id"] = str(j["_id"])
        return {"ok": True, "journeys": journeys}
    except Exception as exc:
        console.print(f"[red]Error listing journeys for user {user_id}: {exc}[/red]")
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/journey/{journey_id}")
def delete_user_journey(journey_id: str):
    """Permanently delete a single journey."""
    try:
        doc = get_journey_doc(journey_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Journey not found")

        deleted = delete_journey(journey_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete journey")

        return {"ok": True, "journey_id": journey_id, "deleted": True}
    except HTTPException:
        raise
    except Exception as exc:
        console.print(f"[red]Error deleting journey {journey_id}: {exc}[/red]")
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/journey/user/{user_id}/all")
def delete_all_user_journeys(user_id: str):
    """Permanently delete all journeys for a user."""
    try:
        count = delete_all_journeys_for_user(user_id)
        return {"ok": True, "deleted_count": count}
    except Exception as exc:
        console.print(f"[red]Error deleting all journeys for user {user_id}: {exc}[/red]")
        raise HTTPException(status_code=500, detail=str(exc))

# =============================================================================
# Archive & Set-Active Endpoints
# =============================================================================


class SetActivePayload(BaseModel):
    user_id: str


@router.patch("/journey/{journey_id}/archive")
def archive_user_journey(journey_id: str):
    """Soft-archive a journey (sets archived flag, preserves the document)."""
    try:
        doc = get_journey_doc(journey_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Journey not found")
        archived = archive_journey(journey_id)
        if not archived:
            raise HTTPException(status_code=500, detail="Failed to archive journey")
        return {"ok": True, "journey_id": journey_id, "archived": True}
    except HTTPException:
        raise
    except Exception as exc:
        console.print(f"[red]Error archiving journey {journey_id}: {exc}[/red]")
        raise HTTPException(status_code=500, detail=str(exc))


@router.patch("/journey/{journey_id}/set-active")
def set_active_journey_endpoint(journey_id: str, payload: SetActivePayload):
    """Mark a journey as the user's active (tracked) journey.

    Clears the ``is_active`` flag from all other journeys belonging to
    the same user, then sets it on the specified journey.
    """
    try:
        doc = get_journey_doc(journey_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Journey not found")
        if doc.get("user_id") != payload.user_id:
            raise HTTPException(status_code=403, detail="Forbidden")

        # Clear ALL currently-active journeys for this user, then activate this one
        updated = set_active_journey(journey_id, payload.user_id)
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to set active journey")

        return {"ok": True, "journey_id": journey_id, "is_active": True}
    except HTTPException:
        raise
    except Exception as exc:
        console.print(f"[red]Error setting active journey {journey_id}: {exc}[/red]")
        raise HTTPException(status_code=500, detail=str(exc))


# =============================================================================
# Journey Monitoring Endpoints (Phase 2)
# =============================================================================

@router.post("/journey/{journey_id}/monitor/start")
async def start_journey_monitoring(journey_id: str, request: Request):
    """Start segment-appropriate background monitoring for a journey."""
    monitor = request.app.state.context_monitor
    state_manager = request.app.state.state_manager
    auto_transitioned_to = None

    if state_manager:
        auto_transitioned_to = state_manager.auto_transition_if_needed(journey_id)

    # If already monitoring, report that
    if monitor.is_monitoring(journey_id):
        journey = state_manager.get_journey(journey_id) if state_manager else None
        if journey and journey.current_segment:
            await monitor.sync_monitoring_to_segment(journey_id, journey.current_segment)
        return {
            "ok": True,
            "message": "Monitoring already active",
            "auto_transitioned_to": (
                auto_transitioned_to.value if hasattr(auto_transitioned_to, "value") else auto_transitioned_to
            ),
            "current_segment": (
                journey.current_segment.value if journey and hasattr(journey.current_segment, "value")
                else (journey.current_segment if journey else None)
            ),
            "journey_status": (
                journey.status.value if journey and hasattr(journey.status, "value")
                else (journey.status if journey else None)
            ),
        }

    # Use segment-aware monitoring (same logic as the booking webhook)
    journey = state_manager.get_journey(journey_id) if state_manager else None
    if journey and journey.current_segment:
        await monitor.sync_monitoring_to_segment(journey_id, journey.current_segment)
        return {
            "ok": True,
            "message": f"Monitoring synced to segment {journey.current_segment.value if hasattr(journey.current_segment, 'value') else journey.current_segment}",
            "auto_transitioned_to": (
                auto_transitioned_to.value if hasattr(auto_transitioned_to, "value") else auto_transitioned_to
            ),
            "current_segment": (
                journey.current_segment.value if hasattr(journey.current_segment, "value")
                else journey.current_segment
            ),
            "journey_status": (
                journey.status.value if hasattr(journey.status, "value")
                else journey.status
            ),
        }

    # Fallback: start all types if no segment info available
    success = await monitor.start_monitoring(journey_id)
    if not success:
        return {"ok": False, "message": "Failed to start monitoring"}

    return {
        "ok": True,
        "message": f"Monitoring started for journey {journey_id}",
        "auto_transitioned_to": (
            auto_transitioned_to.value if hasattr(auto_transitioned_to, "value") else auto_transitioned_to
        ),
    }

@router.post("/journey/{journey_id}/monitor/stop")
async def stop_journey_monitoring(journey_id: str, request: Request):
    """Stop background monitoring for a journey."""
    monitor = request.app.state.context_monitor
    
    success = await monitor.stop_monitoring(journey_id)
    if not success:
        return {"ok": False, "message": "Monitoring not active for this journey"}
    
    return {"ok": True, "message": f"Monitoring stopped for journey {journey_id}"}


@router.post("/journey/{journey_id}/rollback")
async def rollback_journey_segment(journey_id: str, request: Request):
    """
    Rollback to previous segment (undo incorrect transition).
    
    Use case: User says "Actually I'm not at the airport yet"
    """
    from server.main import state_manager
    
    body = await request.json()
    reason = body.get("reason", "User correction")
    
    success = state_manager.rollback_segment(journey_id, reason)
    
    if not success:
        return {"ok": False, "error": "Rollback failed (no previous segment or journey not found)"}
    
    journey = state_manager.get_journey(journey_id)
    return {
        "ok": True,
        "message": "Segment rolled back successfully",
        "current_segment": journey.current_segment.value if journey else None,
    }


@router.post("/compare/flights")
async def compare_flights(request: Request):
    """
    Compare multiple flight options side-by-side.
    
    Body:
    {
        "flights": [...],
        "user_priorities": {"price": 0.5, "duration": 0.3, "comfort": 0.2} (optional),
    }
    """
    from agent.journey_comparison import compare_options, format_comparison
    
    body = await request.json()
    flights = body.get("flights", [])
    priorities = body.get("user_priorities")
    
    if not flights or len(flights) < 2:
        return {"ok": False, "error": "Need at least 2 flights to compare"}
    
    comparison = compare_options("flights", flights, priorities)
    formatted = format_comparison(comparison)
    
    return {
        "ok": True,
        "comparison": {
            "options": [
                {
                    "rank": opt.rank,
                    "name": opt.name,
                    "overall_score": opt.overall_score,
                    "pros": opt.pros,
                    "cons": opt.cons,
                    "data": opt.data,
                }
                for opt in comparison.options
            ],
            "recommendation": comparison.recommendation,
            "formatted_table": formatted,
        },
    }


@router.post("/compare/hotels")
async def compare_hotels(request: Request):
    """
    Compare multiple hotel options side-by-side.
    
    Body:
    {
        "hotels": [...],
        "user_priorities": {"price": 0.4, "comfort": 0.4, "convenience": 0.2} (optional),
    }
    """
    from agent.journey_comparison import compare_options, format_comparison
    
    body = await request.json()
    hotels = body.get("hotels", [])
    priorities = body.get("user_priorities")
    
    if not hotels or len(hotels) < 2:
        return {"ok": False, "error": "Need at least 2 hotels to compare"}
    
    comparison = compare_options("hotels", hotels, priorities)
    formatted = format_comparison(comparison)
    
    return {
        "ok": True,
        "comparison": {
            "options": [
                {
                    "rank": opt.rank,
                    "name": opt.name,
                    "overall_score": opt.overall_score,
                    "pros": opt.pros,
                    "cons": opt.cons,
                    "data": opt.data,
                }
                for opt in comparison.options
            ],
            "recommendation": comparison.recommendation,
            "formatted_table": formatted,
        },
    }


@router.get("/safety/check")
async def check_destination_safety(country: str, city: Optional[str] = None):
    """
    Check safety conditions for a destination.
    
    Query params:
    - country: Country code (e.g., "US", "FR")
    - city: City name (optional)
    """
    from agent.safety_alerts import check_destination_safety as check_safety
    
    alerts = await check_safety(country, city)
    
    return {
        "ok": True,
        "country": country,
        "city": city,
        "alerts": [
            {
                "type": alert.alert_type.value,
                "severity": alert.severity.value,
                "title": alert.title,
                "message": alert.message,
                "source": alert.source,
                "issued_at": alert.issued_at.isoformat(),
            }
            for alert in alerts
        ],
        "has_critical": any(a.severity.value == "critical" for a in alerts),
    }

@router.get("/journey/{journey_id}/monitor/status")
async def get_journey_monitoring_status(journey_id: str, request: Request):
    """Get status and latest context for a journey."""
    monitor = request.app.state.context_monitor
    state_manager = request.app.state.state_manager
    auto_transitioned_to = None

    if state_manager:
        auto_transitioned_to = state_manager.auto_transition_if_needed(journey_id)
        journey = state_manager.get_journey(journey_id)
        if auto_transitioned_to and journey and journey.current_segment and monitor.is_monitoring(journey_id):
            await monitor.sync_monitoring_to_segment(journey_id, journey.current_segment)
    else:
        journey = None
    
    is_active = monitor.is_monitoring(journey_id)
    latest_context = monitor.get_latest_context(journey_id)
    
    # Format latest context for response
    context_data = {}
    if latest_context:
        for m_type, update in latest_context.items():
            context_data[m_type.value] = {
                "data": update.data,
                "timestamp": update.timestamp.isoformat(),
                "success": update.success
            }
            
    return {
        "journey_id": journey_id,
        "is_active": is_active,
        "latest_context": context_data,
        "auto_transitioned_to": (
            auto_transitioned_to.value if hasattr(auto_transitioned_to, "value") else auto_transitioned_to
        ),
        "current_segment": (
            journey.current_segment.value if journey and hasattr(journey.current_segment, "value")
            else (journey.current_segment if journey else None)
        ),
        "journey_status": (
            journey.status.value if journey and hasattr(journey.status, "value")
            else (journey.status if journey else None)
        ),
    }


# =============================================================================
# Location Reached (TRIGGER_RULES_SEGMENTS_PHASES.md §4.1)
# =============================================================================

class LocationReachedPayload(BaseModel):
    """Client sends this when user is within threshold of a waypoint (e.g. 500 m)."""
    waypoint: str  # "airport" | "hotel" | "home"


class LocationUpdatePayload(BaseModel):
    """Payload for continuous location updates (fuzzy geofencing)."""
    latitude: float
    longitude: float
    accuracy_meters: Optional[float] = None


@router.post("/journey/{journey_id}/location/update")
async def journey_location_update(journey_id: str, payload: LocationUpdatePayload, request: Request):
    """
    Handle continuous location updates with fuzzy geofencing.
    
    Uses graduated proximity zones instead of exact threshold:
    - Approaching (2-5 km): "You're 3 km from airport. ETA 15 min."
    - Nearby (0.5-2 km): "You're nearby. Traffic is light."
    - Arrived (< 0.5 km): "You've arrived."
    """
    from agent.journey.phase_1_foundation import JourneySegment
    from agent.location_geofencing import evaluate_user_location
    from server.websocket_manager import ws_manager as ws_mgr
    
    state_manager = request.app.state.state_manager
    journey = state_manager.get_journey(journey_id) if state_manager else None
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    
    current = journey.current_segment
    context = journey.context
    
    # Determine target waypoint based on current segment
    waypoint_map = {
        JourneySegment.HOME_TO_AIRPORT: ("departure_airport", context.departure_airport_lat, context.departure_airport_lon, "Airport"),
        JourneySegment.FLIGHT_TO_HOTEL: ("hotel", context.hotel_lat, context.hotel_lon, "Hotel"),
        JourneySegment.RETURN: ("return_airport", context.return_airport_lat, context.return_airport_lon, "Airport"),
    }
    
    if current not in waypoint_map:
        return {"ok": True, "message": "No active waypoint for current segment"}
    
    waypoint_key, waypoint_lat, waypoint_lon, waypoint_name = waypoint_map[current]
    
    if not waypoint_lat or not waypoint_lon:
        return {"ok": False, "error": f"Waypoint coordinates not set"}
    
    # Get traffic data for ETA
    monitoring = getattr(context, "monitoring", {}) or {}
    traffic_data = monitoring.get("traffic")
    
    # Evaluate with fuzzy geofencing
    status = evaluate_user_location(
        journey_id=journey_id,
        current_lat=payload.latitude,
        current_lon=payload.longitude,
        waypoint_lat=waypoint_lat,
        waypoint_lon=waypoint_lon,
        waypoint_name=waypoint_name,
        traffic_data=traffic_data,
    )
    
    # Send notification if needed
    if status.should_notify and status.notification_message:
        await ws_mgr.broadcast_to_journey(journey_id, {
            "type": "location_notification",
            "zone": status.zone.value,
            "message": status.notification_message,
            "distance_km": status.distance_km,
            "eta_minutes": status.eta_minutes,
        })
    
    # Trigger transition if arrived
    if status.zone.value == "arrived":
        next_segment_map = {
            JourneySegment.HOME_TO_AIRPORT: JourneySegment.AIRPORT_TO_FLIGHT,
            JourneySegment.FLIGHT_TO_HOTEL: JourneySegment.HOTEL_TO_ACTIVITIES,
        }
        
        if current in next_segment_map:
            next_segment = next_segment_map[current]
            state_manager.transition_segment(journey_id, current, next_segment)
            logger.info(f"Fuzzy geofencing: transitioned {journey_id} {current.value} → {next_segment.value}")
        elif current == JourneySegment.RETURN:
            # Check if at home or return airport
            if waypoint_key == "return_airport":
                # At return airport, not home yet
                pass
            else:
                # At home, complete journey
                state_manager.complete_journey(journey_id)
    
    return {
        "ok": True,
        "zone": status.zone.value,
        "distance_km": round(status.distance_km, 2),
        "eta_minutes": status.eta_minutes,
        "notification_sent": status.should_notify,
    }


@router.post("/journey/{journey_id}/location/reached")
async def journey_location_reached(journey_id: str, payload: LocationReachedPayload, request: Request):
    """
    Handle client-side location trigger when user reaches a waypoint (legacy endpoint).
    
    Note: Prefer /location/update for fuzzy geofencing with graduated zones.
    """
    from agent.journey.phase_1_foundation import JourneySegment
    from server.websocket_manager import ws_manager as ws_mgr

    state_manager = request.app.state.state_manager
    journey = state_manager.get_journey(journey_id) if state_manager else None
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    waypoint = (payload.waypoint or "").strip().lower()
    current = journey.current_segment
    seg_value = current.value if hasattr(current, "value") else str(current)

    # Map waypoint -> allowed current segment and next action
    if waypoint == "airport":
        if seg_value != JourneySegment.HOME_TO_AIRPORT.value:
            raise HTTPException(
                status_code=400,
                detail=f"Waypoint 'airport' only valid when segment is home_to_airport (current: {seg_value})"
            )
        state_manager.transition_segment(journey_id, JourneySegment.HOME_TO_AIRPORT, JourneySegment.AIRPORT_TO_FLIGHT)
        message = "You've reached the airport. Head to your gate when ready."
    elif waypoint == "hotel":
        if seg_value != JourneySegment.FLIGHT_TO_HOTEL.value:
            raise HTTPException(
                status_code=400,
                detail=f"Waypoint 'hotel' only valid when segment is flight_to_hotel (current: {seg_value})"
            )
        state_manager.transition_segment(journey_id, JourneySegment.FLIGHT_TO_HOTEL, JourneySegment.HOTEL_TO_ACTIVITIES)
        message = "You've arrived at your hotel. Enjoy your stay."
    elif waypoint == "home":
        if seg_value != JourneySegment.RETURN.value:
            raise HTTPException(
                status_code=400,
                detail=f"Waypoint 'home' only valid when segment is return (current: {seg_value})"
            )
        state_manager.complete_journey(journey_id)
        message = "Welcome home. Your journey is complete."
    else:
        raise HTTPException(status_code=400, detail="waypoint must be one of: airport, hotel, home")

    # Broadcast proactive notification to journey clients
    try:
        await ws_mgr.broadcast_to_journey(journey_id, {
            "type": "proactive_notification",
            "trigger": "location_reached",
            "waypoint": waypoint,
            "message": message,
        })
    except Exception as e:
        console.print(f"[yellow] location/reached broadcast failed: {e}[/yellow]")

    return {
        "ok": True,
        "journey_id": journey_id,
        "waypoint": waypoint,
        "message": message,
        "segment_after": state_manager.get_journey(journey_id).current_segment.value if waypoint != "home" else "completed",
    }


# =============================================================================
# Journey Orchestration Endpoints (Phase 6)
# =============================================================================

class JourneyCreatePayload(BaseModel):
    user_id: str
    intent: str
    # Optional fields collected from the UI modal
    destination: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    currency: Optional[str] = "USD"
    departure_city: Optional[str] = None
    departure_airport_code: Optional[str] = None
    destination_airport_code: Optional[str] = None
    travelers_count: Optional[int] = None
    departure_date: Optional[str] = None
    duration_days: Optional[int] = None
    # Full user data from localStorage (profile + location)
    user_data: Optional[Dict[str, Any]] = None


class JourneyMessagePayload(BaseModel):
    user_id: str
    message: str


@router.post("/journey/create")
async def create_new_journey(payload: JourneyCreatePayload, request: Request):
    """Start a new journey based on user intent.

    The newly-created journey is automatically marked active and the
    inspiration segment is activated by the state manager.  Destination
    and budget are baked into the initial context so the journey is
    created in a single persist roundtrip.  Background monitoring
    starts immediately.

    After creation, the journey inspiration agent is invoked to recommend
    flights based on the journey details and user data — following the
    same structured JSON response scheme.
    """
    from agent.journey.phase_1_foundation.journey_models import JourneyContext

    state_manager = request.app.state.state_manager
    context_monitor = request.app.state.context_monitor

    # Build initial context with all fields provided by the UI
    initial_context = JourneyContext()
    if payload.destination:
        initial_context.planned_destination = payload.destination
    if payload.budget_min is not None or payload.budget_max is not None:
        initial_context.budget = {
            "min": payload.budget_min,
            "max": payload.budget_max,
            "currency": payload.currency or "USD",
        }
    if payload.departure_city:
        initial_context.departure_city = payload.departure_city
    if payload.departure_airport_code:
        initial_context.departure_airport_code = payload.departure_airport_code
        initial_context.airport_code = payload.departure_airport_code
    if payload.destination_airport_code:
        initial_context.destination_airport_code = payload.destination_airport_code
    if payload.departure_airport_code:
        dep_lat, dep_lon = await _geocode_airport_code(payload.departure_airport_code)
        if dep_lat is not None and dep_lon is not None:
            initial_context.departure_airport_lat = dep_lat
            initial_context.departure_airport_lon = dep_lon
    if payload.destination_airport_code:
        dest_lat, dest_lon = await _geocode_airport_code(payload.destination_airport_code)
        if dest_lat is not None and dest_lon is not None:
            initial_context.return_airport_lat = dest_lat
            initial_context.return_airport_lon = dest_lon
    if payload.travelers_count is not None:
        initial_context.travelers_count = payload.travelers_count
    if payload.departure_date:
        initial_context.planned_departure_date = payload.departure_date
    if payload.duration_days is not None:
        initial_context.duration_days = payload.duration_days

    # Create the journey — activates INSPIRATION segment and persists to MongoDB
    journey = state_manager.initialize_journey(
        user_id=payload.user_id,
        initial_context=initial_context,
    )
    journey_id = journey.journey_id
    console.print(f"[green]  Journey created: {journey_id}[/green]")

    # Mark as the user's active trip in MongoDB
    try:
        set_active_journey(journey_id, payload.user_id)
    except Exception:
        # non-fatal; logged inside set_active_journey
        pass

    # Start background monitoring immediately
    try:
        await context_monitor.start_monitoring(journey_id)
        console.print(f"[green]  Monitoring started for journey {journey_id}[/green]")
    except Exception as exc:
        console.print(f"[yellow]  Failed to start monitoring: {exc}[/yellow]")

    resp = {
        "ok": True,
        "journey_id": journey_id,
        "status": journey.status.value,
        "current_segment": journey.current_segment.value,
    }

    # ------------------------------------------------------------------
    # PRIMARY: Run the InspirationOrchestrator (Phase 3 segment) which
    # includes the flight_recommendation node + structured JSON output.
    # FALLBACK: If the orchestrator fails, use the journey_inspiration_agent.
    # ------------------------------------------------------------------
    inspiration_ok = False

    # --- Primary: InspirationOrchestrator ---
    try:
        from agent.journey.phase_3_segment_orchestrators.segments.inspiration import (
            InspirationOrchestrator,
        )

        orchestrator = InspirationOrchestrator()

        # Build the journey_context dict the orchestrator expects, including
        # the full payload and user_data so the flight node can use them.
        orch_payload = payload.model_dump()
        orch_context = {
            "user_id": payload.user_id,
            "journey_id": journey_id,
            "destination": payload.destination,
            "destination_airport_code": payload.destination_airport_code,
            "departure_city": payload.departure_city,
            "departure_airport_code": payload.departure_airport_code,
            "departure_date": payload.departure_date,
            "planned_departure_date": payload.departure_date,
            "planned_destination": payload.destination,
            "duration_days": payload.duration_days,
            "travelers_count": payload.travelers_count,
            "budget_min": payload.budget_min,
            "budget_max": payload.budget_max,
            "currency": payload.currency or "USD",
            "user_data": payload.user_data or {},
        }

        # Build a synthetic user message from the journey details
        user_msg = (
            f"I want to travel to {payload.destination or 'somewhere exciting'}"
            f" from {payload.departure_city or 'my city'}"
        )
        if payload.departure_date:
            user_msg += f" departing {payload.departure_date}"
        if payload.duration_days:
            user_msg += f" for {payload.duration_days} days"
        if payload.budget_min is not None and payload.budget_max is not None:
            user_msg += f" with a budget of {payload.currency or 'USD'} {payload.budget_min}-{payload.budget_max}"

        orch_result = await orchestrator.execute(
            journey_context=orch_context,
            user_message=user_msg,
        )

        if orch_result.success:
            # Wait briefly for the primary inspiration flow to fully settle
            # before returning from the create API. This ensures the
            # structured response exists and fresh flight recommendations, when
            # produced, have been persisted onto the journey.
            for _ in range(10):
                final_state = orch_result.final_state or {}
                structured = final_state.get("structured_response")
                flight_items = final_state.get("flight_items") or []
                ready = isinstance(structured, dict) and "ai_generated" in structured

                if ready and flight_items:
                    try:
                        persisted_journey = state_manager.get_journey(journey_id)
                        persisted_saved = getattr(persisted_journey, "saved_flights", None) or []
                        ready = bool(persisted_saved)
                    except Exception:
                        ready = False

                if ready:
                    break
                await asyncio.sleep(0.1)

            # Extract the structured response from the orchestrator
            structured = orch_result.final_state.get("structured_response")
            if structured and isinstance(structured, dict) and "ai_generated" in structured:
                resp["inspiration"] = structured
                resp["message"] = json.dumps(structured, ensure_ascii=False)
                inspiration_ok = True
                console.print("[green]  InspirationOrchestrator returned flight recommendations[/green]")
            elif orch_result.response_message:
                # The response might be a JSON string from create_journey_node
                parsed = _parse_ai_generated_json(orch_result.response_message)
                if parsed:
                    resp["inspiration"] = parsed
                    resp["message"] = json.dumps(parsed, ensure_ascii=False)
                    inspiration_ok = True
                    console.print("[green]  InspirationOrchestrator returned parsed JSON response[/green]")
                else:
                    resp["inspiration"] = {
                        "ai_generated": orch_result.response_message,
                        "message": orch_result.response_message,
                    }
                    resp["message"] = orch_result.response_message
                    inspiration_ok = True
        else:
            console.print(
                f"[yellow]  InspirationOrchestrator failed: {orch_result.error}[/yellow]"
            )
    except Exception as exc:
        console.print(f"[yellow]  InspirationOrchestrator exception: {exc}[/yellow]")
        import traceback as _tb
        _tb.print_exc()

    # --- Fallback: journey_inspiration_agent ---
    if not inspiration_ok:
        console.print("[cyan]  Falling back to journey_inspiration_agent...[/cyan]")
        try:
            from agent.journey.journey_inspiration.journey_inspiration_agent import (
                journey_inspiration_agent,
            )

            agent_payload = payload.model_dump()
            agent_payload["journey_id"] = journey_id

            inspiration_directive = SystemMessage(
                content=(
                    "Journey creation request: invoke the Journey_Inspiration_Agent to "
                    "recommend flights for this newly created journey. Return the agent "
                    "response directly."
                )
            )
            inspiration_payload_msg = HumanMessage(
                content=f"Journey creation payload JSON: {json.dumps(agent_payload, ensure_ascii=False)}"
            )

            pretty = PrettyLogHandler(show_prompts=_bool_env("AI_LOG_PROMPTS", False))
            result = journey_inspiration_agent.invoke(
                {"messages": [inspiration_directive, inspiration_payload_msg]},
                config={
                    "callbacks": [pretty],
                    "tags": ["api", "journey_create", "inspiration", "flight_recommendation", "fallback"],
                },
            )

            if isinstance(result, dict):
                out_messages = result.get("messages", [])
            elif isinstance(result, list):
                out_messages = result
            else:
                out_messages = []

            normalized_all = _from_lang_messages(out_messages)
            ai_candidates = [m for m in normalized_all if m.role == "ai" and m.content]

            if ai_candidates:
                msg = ai_candidates[-1]
                parsed_inspiration = _parse_ai_generated_json(msg.content)
                if parsed_inspiration:
                    resp["inspiration"] = parsed_inspiration
                    resp["message"] = json.dumps(parsed_inspiration, ensure_ascii=False)
                    console.print("[green]  Fallback agent returned flight recommendations[/green]")
                else:
                    resp["inspiration"] = {"ai_generated": msg.content, "message": msg.content}
                    resp["message"] = msg.content
            else:
                console.print("[yellow]  Fallback agent returned no AI message[/yellow]")
        except Exception as fallback_exc:
            recovered = _recover_ai_response_from_failed_tool_call(fallback_exc)
            if recovered:
                resp["inspiration"] = recovered
                resp["message"] = json.dumps(recovered, ensure_ascii=False)
                console.print("[yellow]  Recovered inspiration from failed tool call[/yellow]")
            else:
                console.print(f"[yellow]  Fallback agent also failed: {fallback_exc}[/yellow]")

    return resp


@router.get("/journey/{journey_id}")
async def get_journey_status(journey_id: str, request: Request):
    """Get the current status of a journey."""
    journey = request.app.state.state_manager.get_journey(journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return {"ok": True, "journey": journey.to_mongo_dict()}


@router.post("/journey/{journey_id}/message")
async def send_journey_message(journey_id: str, payload: JourneyMessagePayload, request: Request):
    """Send a message within an active journey context."""
    from agent.journey import JourneyOrchestrator
    orchestrator = JourneyOrchestrator(
        state_manager=request.app.state.state_manager,
        context_monitor=request.app.state.context_monitor,
    )
    result = await orchestrator.handle_user_message(journey_id, payload.message)
    return {"ok": result.success, "response": result.response_message, "segment": result.segment_name}


@router.get("/journey/{journey_id}/timeline")
async def get_journey_timeline(journey_id: str, request: Request):
    """Retrieve the calculated timeline for a journey."""
    journey = request.app.state.state_manager.get_journey(journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return {"ok": True, "timeline": journey.timeline.dict()}


# =============================================================================
# Booking Confirmed Webhook (called by Node server after Amadeus order success)
# =============================================================================

class BookingFlightData(BaseModel):
    fromCode: str
    toCode: str
    departure: Optional[str] = None
    arrival: Optional[str] = None
    flightNo: Optional[str] = None
    airline: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None


class BookingConfirmedPayload(BaseModel):
    provider: Optional[str] = None
    userId: str
    conversationId: Optional[str] = None
    journeyId: Optional[str] = None
    bookingReference: Optional[str] = None
    amadeusOrderId: Optional[str] = None
    duffelOrderId: Optional[str] = None
    providerOrderId: Optional[str] = None
    flight: BookingFlightData
    itineraries: Optional[list] = None
    travelers: Optional[list] = None
    price: Optional[dict] = None


@router.post("/hooks/booking-confirmed")
async def booking_confirmed_hook(payload: BookingConfirmedPayload, request: Request):
    """
    Webhook called by the Node server when a flight booking succeeds.
    Persists the booking onto a journey using the active provider's save tool.
    """
    from agent.journey.phase_1_foundation.journey_models import JourneyContext
    from datetime import datetime, timezone

    console.print(
        f"[bold green]>> BOOKING WEBHOOK:[/bold green] "
        f"User {payload.userId} booked {payload.flight.flightNo or 'flight'} "
        f"({payload.flight.fromCode} → {payload.flight.toCode})"
    )

    state_manager = request.app.state.state_manager

    try:
        # Parse flight times
        departure_time = None
        arrival_time = None
        if payload.flight.departure:
            try:
                departure_time = datetime.fromisoformat(
                    payload.flight.departure.replace(" ", "T")
                )
                if departure_time.tzinfo is None:
                    departure_time = departure_time.replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        if payload.flight.arrival:
            try:
                arrival_time = datetime.fromisoformat(
                    payload.flight.arrival.replace(" ", "T")
                )
                if arrival_time.tzinfo is None:
                    arrival_time = arrival_time.replace(tzinfo=timezone.utc)
            except ValueError:
                pass

        # Resolve price: prefer payload.price.grandTotal/total, fallback to flight.price
        resolved_price = payload.flight.price
        resolved_currency = payload.flight.currency
        if payload.price and isinstance(payload.price, dict):
            resolved_price = float(payload.price.get("grandTotal") or payload.price.get("total") or resolved_price or 0) or None
            resolved_currency = payload.price.get("currency") or resolved_currency

        # Resolve flight number: prefer payload.flight.flightNo, fallback to itinerary segments
        resolved_flight_number = payload.flight.flightNo or ""
        resolved_airline = payload.flight.airline or ""
        if not resolved_flight_number and payload.itineraries:
            # Extract from first itinerary's first segment (carrierCode + flightNumber)
            for itin in payload.itineraries:
                segments = itin.get("segments", []) if isinstance(itin, dict) else []
                for seg in segments:
                    carrier = seg.get("carrierCode", "")
                    fn = seg.get("flightNumber", "") or seg.get("number", "")
                    if carrier and fn:
                        resolved_flight_number = f"{carrier}{fn}"
                        if not resolved_airline:
                            resolved_airline = carrier
                        break
                if resolved_flight_number:
                    break
        if resolved_flight_number:
            console.print(f"[green]  Resolved flight number: {resolved_flight_number}[/green]")
        else:
            console.print("[yellow]  Warning: Could not resolve flight number from payload or itineraries[/yellow]")

        # If journeyId is provided, update the existing journey instead of creating new
        existing_journey = None
        if payload.journeyId:
            existing_journey = state_manager.get_journey(payload.journeyId)

        departure_airport_lat, departure_airport_lon = await _geocode_airport_code(payload.flight.fromCode)
        destination_airport_lat, destination_airport_lon = await _geocode_airport_code(payload.flight.toCode)

        if existing_journey:
            # Update existing journey with flight/booking context
            journey = existing_journey
            # Keep flight_status updated to the latest booked flight
            console.print(f"[green]  Journey updated: {journey.journey_id}[/green]")
        else:
            # No existing journey — create a new one (fallback)
            initial_context = JourneyContext(
                departure_airport_code=payload.flight.fromCode,
                destination_airport_code=payload.flight.toCode,
                departure_airport_lat=departure_airport_lat,
                departure_airport_lon=departure_airport_lon,
                return_airport_lat=destination_airport_lat,
                return_airport_lon=destination_airport_lon,
            )
            journey = state_manager.initialize_journey(
                user_id=payload.userId,
                conversation_id=payload.conversationId,
                initial_context=initial_context,
            )
            console.print(f"[green]  Journey created: {journey.journey_id}[/green]")

        resolved_provider = (payload.provider or ACTIVE_TRAVEL_PROVIDER).lower()
        resolved_order_id = payload.providerOrderId or payload.duffelOrderId or payload.amadeusOrderId
        if resolved_provider != ACTIVE_TRAVEL_PROVIDER:
            console.print(
                f"[yellow]  Warning: booking webhook provider {resolved_provider} does not match active AI provider "
                f"{ACTIVE_TRAVEL_PROVIDER}; saving with active provider tool.[/yellow]"
            )

        save_result = active_save_booked_flight_to_journey.invoke({
            "journey_id": journey.journey_id,
            "booking_reference": payload.bookingReference,
            "amadeus_order_id": resolved_order_id,
            "flight_number": resolved_flight_number,
            "airline": resolved_airline,
            "from_code": payload.flight.fromCode,
            "to_code": payload.flight.toCode,
            "departure": payload.flight.departure,
            "arrival": payload.flight.arrival,
            "price": resolved_price,
            "currency": resolved_currency,
        })
        if save_result.get("error"):
            raise RuntimeError(save_result.get("error"))
            console.print("[green]  Segment: INSPIRATION → HOME_TO_AIRPORT[/green]")
        journey = state_manager.get_journey(journey.journey_id)
        if journey:
            if departure_airport_lat is not None and departure_airport_lon is not None:
                journey.context.departure_airport_lat = departure_airport_lat
                journey.context.departure_airport_lon = departure_airport_lon
            if destination_airport_lat is not None and destination_airport_lon is not None:
                journey.context.return_airport_lat = destination_airport_lat
                journey.context.return_airport_lon = destination_airport_lon
            if departure_airport_lat is not None or destination_airport_lat is not None:
                journey.updated_at = datetime.now(timezone.utc)
                state_manager._persist_journey(journey)

        journey = state_manager.get_journey(journey.journey_id) if journey else None
        console.print("[green]  Booking saved; awaiting background monitoring for any segment transition[/green]")

        return {
            "ok": True,
            "journey_id": journey.journey_id if journey else None,
            "status": journey.status.value if journey else None,
            "current_segment": journey.current_segment.value if journey else None,
            "flight_number": resolved_flight_number,
            "booking_reference": payload.bookingReference,
            "provider": resolved_provider,
            "message": "Journey updated with booking." if existing_journey else "Journey created and updated with booking.",
        }

    except Exception as e:
        console.print(f"[bold red]Booking webhook error:[/bold red] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Driving route proxy (Google Maps Directions API) ─────────────────────────

class DrivingRouteRequest(BaseModel):
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float


def _decode_polyline(encoded: str) -> list:
    """Decode a Google Maps encoded polyline string into a list of [lat, lng] pairs."""
    points = []
    index = 0
    lat = 0
    lng = 0
    while index < len(encoded):
        for attr in ('lat', 'lng'):
            shift = 0
            result = 0
            while True:
                b = ord(encoded[index]) - 63
                index += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            diff = ~(result >> 1) if (result & 1) else (result >> 1)
            if attr == 'lat':
                lat += diff
            else:
                lng += diff
        points.append([lat / 1e5, lng / 1e5])
    return points


@router.post("/driving-route")
async def get_driving_route(body: DrivingRouteRequest):
    """
    Proxy to Google Maps Directions API (driving).
    Returns the route geometry as an array of [lat, lng] pairs.
    """
    gm_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    if not gm_key:
        raise HTTPException(status_code=500, detail="GOOGLE_MAPS_API_KEY not configured")

    try:
        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": f"{body.from_lat},{body.from_lng}",
            "destination": f"{body.to_lat},{body.to_lng}",
            "mode": "driving",
            "key": gm_key,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)

        if resp.status_code != 200:
            logger.warning(f"Google Maps error {resp.status_code}: {resp.text[:300]}")
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Google Maps error: {resp.text[:300]}",
            )

        data = resp.json()
        if data.get("status") != "OK" or not data.get("routes"):
            detail = data.get("error_message") or data.get("status", "NO_ROUTES")
            logger.warning(f"Google Maps Directions: {detail}")
            raise HTTPException(status_code=404, detail=f"Google Maps: {detail}")

        # Decode the overview polyline into [lat, lng] pairs
        polyline = data["routes"][0].get("overview_polyline", {}).get("points", "")
        route = _decode_polyline(polyline) if polyline else []
        return {"route": route}

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Google Maps request failed: {str(e)}")


# ── Nearby Places (Google Places API) ────────────────────────────────────────

class NearbyPlacesRequest(BaseModel):
    latitude: float
    longitude: float
    radius: int = 3000  # metres
    types: Optional[List[str]] = None  # e.g. ["restaurant", "hotel", "library", "park"]
    # limit how many places should be returned. passing 1 will also restrict
    # the number of Google Places API calls so only one type is queried.
    limit: Optional[int] = 1

@router.post("/nearby-places")
async def get_nearby_places(body: NearbyPlacesRequest):
    """
    Fetch nearby places using Google Places Nearby Search.
    Returns a list of places with name, location, photo URL, rating, etc.
    """
    gm_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    if not gm_key:
        raise HTTPException(status_code=500, detail="GOOGLE_MAPS_API_KEY not configured")

    place_types = body.types or ["restaurant", "lodging", "library", "park", "cafe", "museum"]
    # `limit` is interpreted as the maximum number of places to return **per
    # type** rather than a global cap.  we still need to iterate through every
    # requested type so that each category (restaurant, park, etc.) can
    # contribute up to `limit` entries.
    #
    # caller may still pass a larger limit or `None` to retrieve more items.

    all_places: list[dict] = []

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            for ptype in place_types:
                url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                params = {
                    "location": f"{body.latitude},{body.longitude}",
                    "radius": str(body.radius),
                    "type": ptype,
                    "key": gm_key,
                }
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    continue
                data = resp.json()
                if data.get("status") not in ("OK", "ZERO_RESULTS"):
                    continue
                for place in data.get("results", [])[:5]:
                    photo_url = None
                    if place.get("photos"):
                        photo_ref = place["photos"][0].get("photo_reference", "")
                        if photo_ref:
                            photo_url = (
                                f"https://maps.googleapis.com/maps/api/place/photo"
                                f"?maxwidth=400&photo_reference={photo_ref}&key={gm_key}"
                            )
                    loc = place.get("geometry", {}).get("location", {})
                    all_places.append({
                        "place_id": place.get("place_id", ""),
                        "name": place.get("name", ""),
                        "type": ptype,
                        "latitude": loc.get("lat"),
                        "longitude": loc.get("lng"),
                        "rating": place.get("rating"),
                        "user_ratings_total": place.get("user_ratings_total"),
                        "vicinity": place.get("vicinity", ""),
                        "photo_url": photo_url,
                        "icon": place.get("icon", ""),
                        "open_now": place.get("opening_hours", {}).get("open_now"),
                    })

        # Deduplicate by place_id while preserving insertion order
        seen = set()
        unique: list[dict] = []
        for p in all_places:
            if p["place_id"] not in seen:
                seen.add(p["place_id"])
                unique.append(p)

        # If a `limit` is specified we enforce it **per type**.  Group the
        # results by their `type` field and trim each bucket accordingly.
        if body.limit is not None:
            by_type: dict[str, list[dict]] = {}
            for p in unique:
                by_type.setdefault(p.get("type", ""), []).append(p)
            limited: list[dict] = []
            for bucket in by_type.values():
                limited.extend(bucket[: body.limit])
            unique = limited

        return {"places": unique}

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Google Places request failed: {str(e)}")


# ── Weather Forecast ─────────────────────────────────────────────────────────

class WeatherForecastRequest(BaseModel):
    latitude: float
    longitude: float
    days: int = 3

@router.post("/weather-forecast")
async def get_weather_forecast(body: WeatherForecastRequest):
    """Return current weather + multi-day daily forecast using OpenWeatherMap free-tier."""
    api_key = os.getenv("OPENWEATHERMAP_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENWEATHERMAP_API_KEY not configured")

    async with httpx.AsyncClient(timeout=10) as client:
        # Current weather
        current_resp = await client.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"lat": body.latitude, "lon": body.longitude, "appid": api_key, "units": "metric"},
        )
        # 5-day / 3-hour forecast
        forecast_resp = await client.get(
            "https://api.openweathermap.org/data/2.5/forecast",
            params={"lat": body.latitude, "lon": body.longitude, "appid": api_key, "units": "metric"},
        )

    current_data = None
    if current_resp.status_code == 200:
        data = current_resp.json()
        weather_arr = data.get("weather", [{}])
        main = data.get("main", {})
        current_data = {
            "condition": weather_arr[0].get("main", "Unknown") if weather_arr else "Unknown",
            "description": weather_arr[0].get("description", "") if weather_arr else "",
            "icon": weather_arr[0].get("icon", "01d") if weather_arr else "01d",
            "temp": round(main.get("temp", 0)),
            "feels_like": round(main.get("feels_like", 0)),
            "humidity": main.get("humidity"),
        }

    hourly_list: list[dict] = []
    daily_list: list[dict] = []
    if forecast_resp.status_code == 200:
        entries = forecast_resp.json().get("list", [])

        # Hourly: next 12 hours (4 entries × 3-hour intervals)
        for entry in entries[:4]:
            hourly_list.append({
                "time": entry.get("dt_txt", ""),
                "condition": entry.get("weather", [{}])[0].get("main", "Unknown"),
                "icon": entry.get("weather", [{}])[0].get("icon", "01d"),
                "temp": round(entry.get("main", {}).get("temp", 0)),
            })

        # Daily aggregation
        daily_map: dict[str, dict] = {}
        for entry in entries:
            dt_txt = entry.get("dt_txt", "")
            day_str = dt_txt.split(" ")[0] if " " in dt_txt else dt_txt[:10]
            if not day_str:
                continue
            temp = entry.get("main", {}).get("temp")
            condition = entry.get("weather", [{}])[0].get("main", "Unknown")
            icon = entry.get("weather", [{}])[0].get("icon", "01d")
            if day_str not in daily_map:
                daily_map[day_str] = {"date": day_str, "condition": condition, "icon": icon, "temps": []}
            if temp is not None:
                daily_map[day_str]["temps"].append(temp)

        for day_str in sorted(daily_map.keys())[:body.days]:
            day = daily_map[day_str]
            temps = day["temps"]
            daily_list.append({
                "date": day["date"],
                "condition": day["condition"],
                "icon": day["icon"],
                "high": round(max(temps)) if temps else None,
                "low": round(min(temps)) if temps else None,
            })

    if not current_data:
        raise HTTPException(status_code=502, detail="Failed to fetch weather data")

    return {"current": current_data, "hourly": hourly_list, "daily": daily_list}


# =============================================================================
# Proactive Intelligence
# =============================================================================

@router.get("/journey/{journey_id}/suggestions")
async def get_proactive_suggestions(
    journey_id: str,
    min_priority: Optional[str] = None,
    request: Request = None
):
    """
    Get proactive suggestions for a journey.
    
    Query params:
    - min_priority: "low" | "medium" | "high" | "urgent" (optional)
    
    Returns suggestions like:
    - "You have 2 hours before boarding. Want restaurant recommendations?"
    - "Your flight price dropped by $50. Want to rebook?"
    - "You haven't packed yet. Need help?"
    """
    from agent.proactive_intelligence import get_active_suggestions_for_journey
    from server.main import state_manager
    
    journey = state_manager.get_journey(journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    
    # Analyze journey and get suggestions
    from agent.proactive_intelligence import analyze_journey_proactively
    suggestions = await analyze_journey_proactively(journey)
    
    # Filter by priority if specified
    if min_priority:
        priority_order = {"low": 0, "medium": 1, "high": 2, "urgent": 3}
        min_level = priority_order.get(min_priority.lower(), 0)
        suggestions = [
            s for s in suggestions 
            if priority_order.get(s.get("priority", "low"), 0) >= min_level
        ]
    
    return {
        "ok": True,
        "journey_id": journey_id,
        "suggestions": suggestions,
        "count": len(suggestions),
    }


@router.post("/journey/{journey_id}/suggestions/{suggestion_id}/dismiss")
async def dismiss_proactive_suggestion(
    journey_id: str,
    suggestion_id: str,
    request: Request
):
    """
    Dismiss a proactive suggestion so it's not shown again.
    """
    from agent.proactive_intelligence import dismiss_suggestion_for_journey
    
    await dismiss_suggestion_for_journey(journey_id, suggestion_id)
    
    return {
        "ok": True,
        "message": "Suggestion dismissed",
    }


@router.post("/journey/{journey_id}/suggestions/{suggestion_id}/action")
async def execute_suggestion_action(
    journey_id: str,
    suggestion_id: str,
    request: Request
):
    """
    Execute the action associated with a proactive suggestion.
    
    Body (optional):
    {
        "additional_params": {...}
    }
    """
    from agent.proactive_intelligence import get_proactive_intelligence
    from server.main import state_manager
    
    body = await request.json() if request.method == "POST" else {}
    
    intelligence = get_proactive_intelligence()
    suggestions = intelligence.get_suggestions_for_journey(journey_id)
    suggestion = next((s for s in suggestions if s.suggestion_id == suggestion_id), None)
    
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found or expired")
    
    action_data = suggestion.action_data or {}
    action = action_data.get("action")
    
    # Route to appropriate handler based on action type
    if action == "search_restaurants":
        return {
            "ok": True,
            "action": "search_restaurants",
            "message": "Searching for restaurants near your gate...",
            "next_step": "Use /search/restaurants endpoint",
        }
    
    elif action == "book_transfer":
        return {
            "ok": True,
            "action": "book_transfer",
            "message": "Arranging airport pickup...",
            "next_step": "Use /booking/transfer endpoint",
        }
    
    elif action == "create_packing_list":
        duration = action_data.get("duration_days", 5)
        return {
            "ok": True,
            "action": "create_packing_list",
            "message": f"Creating packing list for {duration}-day trip...",
            "packing_list": [
                "Passport and travel documents",
                "Phone charger and adapter",
                f"Clothes for {duration} days",
                "Toiletries",
                "Medications",
                "Travel insurance documents",
            ],
        }
    
    elif action == "rebook_flight":
        savings = action_data.get("savings", 0)
        return {
            "ok": True,
            "action": "rebook_flight",
            "message": f"Rebooking flight to save ${int(savings)}...",
            "next_step": "Confirm rebooking with /booking/rebook endpoint",
        }
    
    elif action == "check_upgrade":
        miles_needed = action_data.get("miles_needed", 15000)
        return {
            "ok": True,
            "action": "check_upgrade",
            "message": f"Checking business class upgrade ({miles_needed:,} miles)...",
            "next_step": "Use /booking/upgrade endpoint",
        }
    
    elif action == "search_activities":
        city = action_data.get("city", "destination")
        return {
            "ok": True,
            "action": "search_activities",
            "message": f"Finding popular attractions in {city}...",
            "next_step": "Use /search/activities endpoint",
        }
    
    else:
        return {
            "ok": True,
            "action": action or "unknown",
            "message": "Action acknowledged",
            "action_data": action_data,
        }


@router.post("/recommend/destinations")
async def recommend_destinations(payload: SessionBase):
    """
    Return destination recommendations, cached in MongoDB for 24 hours per user/provider.
    """
    if not _groq_configured():
        return {"ok": False, "message": "AI backend not configured"}

    user_payload = payload.user_data if isinstance(payload.user_data, dict) else {}
    cache_window = timedelta(hours=24)
    recent_window = datetime.now(timezone.utc) - timedelta(days=3)

    recent_logs = list_destination_recommendation_logs_since(
        payload.user_id,
        since=recent_window,
        provider=ACTIVE_TRAVEL_PROVIDER,
        limit=20,
    )
    excluded_destination_names: set[str] = set()
    for log in recent_logs:
        excluded_destination_names.update(
            _extract_destination_names_from_response(log.get("response"))
        )
    excluded_display_names = sorted(excluded_destination_names)
    force_refetch = payload.force_refetch is True

    if force_refetch:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        refetch_count_today = 0
        for log in recent_logs:
            created_at = log.get("created_at")
            if created_at and created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if (
                created_at
                and created_at >= today_start
                and log.get("source") == "recommend_destinations_refetch"
            ):
                refetch_count_today += 1
        if refetch_count_today >= 3:
            return {
                "ok": False,
                "message": "Daily destination refetch limit reached",
                "refetches_remaining": 0,
            }

    latest_log = get_latest_destination_recommendation_log(
        payload.user_id,
        provider=ACTIVE_TRAVEL_PROVIDER,
    )

    if latest_log and not force_refetch:
        created_at = latest_log.get("created_at")
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if created_at and datetime.now(timezone.utc) - created_at <= cache_window:
            cached_response = latest_log.get("response") or {}
            return {
                "ok": True,
                "provider": ACTIVE_TRAVEL_PROVIDER,
                "source": "destination_recommendation_log",
                "cached": True,
                **cached_response,
            }

    ctx_lines = [
        "User Context:",
        f"user_id={payload.user_id}",
        f"username={payload.user_name or ''}",
        f"active_travel_provider={ACTIVE_TRAVEL_PROVIDER}",
        f"active_travel_provider_label={ACTIVE_TRAVEL_PROVIDER_LABEL}",
        "strict_personalization=true",
    ]
    ctx_lines.append(f"user_data_full={json.dumps(user_payload, ensure_ascii=False, default=str)}")
    ctx_lines.append(
        "exclude_destinations_last_3_days="
        f"{json.dumps(excluded_display_names, ensure_ascii=False, default=str)}"
    )

    agent_payload = {
        "user_id": payload.user_id,
        "user_name": payload.user_name,
        "username": payload.username,
        "user_data": user_payload,
        "is_logged_in": payload.is_logged_in,
        "active_travel_provider": ACTIVE_TRAVEL_PROVIDER,
        "force_refetch": force_refetch,
        "exclude_destinations_last_3_days": excluded_display_names,
    }

    # Prepend context as system message
    lang_messages = [SystemMessage(content="\n".join(ctx_lines))]

    try:
        # Provide a trigger message
        state = {
            "messages": lang_messages + [
                HumanMessage(
                    content=(
                        "Please provide exactly five destination recommendations for me based on my location "
                        "and preferences. You must use the user's provided data and avoid every destination "
                        "listed in exclude_destinations_last_3_days. Use this JSON payload when calling "
                        "destination_recommendation_extract_context: "
                        f"{json.dumps(agent_payload, ensure_ascii=False, default=str)}"
                    )
                )
            ]
        }

        # Invoke the agent
        result = await destination_recommendation_agent.ainvoke(state)

        # The agent's final response should be in the last message content as JSON
        out_messages = result.get("messages", [])
        if not out_messages:
            return {"ok": False, "message": "No response from agent"}

        final_msg = out_messages[-1]
        raw_text = final_msg.content

        # Parse the JSON from the text
        parsed = _parse_ai_generated_json(raw_text)

        if not parsed:
            return {"ok": False, "message": "Failed to parse agent response", "raw": raw_text}

        if not _destination_items_are_five_unique_new(parsed, excluded_destination_names):
            retry_state = {
                "messages": lang_messages + [
                    HumanMessage(
                        content=(
                            "Your previous destination response was invalid because it did not contain exactly "
                            "five unique destinations or it repeated a destination from the last three days. "
                            "Return a new response with exactly five destinations, all different from this exclusion list: "
                            f"{json.dumps(excluded_display_names, ensure_ascii=False, default=str)}. "
                            "Use this same user payload for personalization: "
                            f"{json.dumps(agent_payload, ensure_ascii=False, default=str)}. "
                            "Use the same strict JSON schema and do not call a json tool."
                        )
                    )
                ]
            }
            retry_result = await destination_recommendation_agent.ainvoke(retry_state)
            retry_messages = retry_result.get("messages", [])
            if retry_messages:
                retry_text = retry_messages[-1].content
                retry_parsed = _parse_ai_generated_json(retry_text)
                if retry_parsed and _destination_items_are_five_unique_new(retry_parsed, excluded_destination_names):
                    parsed = retry_parsed
                else:
                    return {
                        "ok": False,
                        "message": "Agent did not return five unique new destination recommendations",
                        "raw": retry_text,
                    }

        create_destination_recommendation_log(
            payload.user_id,
            ACTIVE_TRAVEL_PROVIDER,
            parsed,
            source="recommend_destinations_refetch" if force_refetch else "recommend_destinations",
            user_data=user_payload,
        )

        return {
            "ok": True,
            "provider": ACTIVE_TRAVEL_PROVIDER,
            "source": "fresh_provider_fetch",
            "cached": False,
            **parsed
        }
    except Exception as e:
        recovered = _recover_ai_response_from_failed_tool_call(e)
        if recovered:
            console.print("[green]> Recovered structured JSON from hallucinated tool call[/green]")
            if not _destination_items_are_five_unique_new(recovered, excluded_destination_names):
                return {
                    "ok": False,
                    "message": "Recovered response did not contain five unique new destination recommendations",
                }
            create_destination_recommendation_log(
                payload.user_id,
                ACTIVE_TRAVEL_PROVIDER,
                recovered,
                source="recommend_destinations_refetch" if force_refetch else "recommend_destinations",
                user_data=user_payload,
            )
            return {
                "ok": True,
                "provider": ACTIVE_TRAVEL_PROVIDER,
                "source": "fresh_provider_fetch_recovered",
                "cached": False,
                **recovered,
            }
        logger.error(f"Error in recommend_destinations: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
