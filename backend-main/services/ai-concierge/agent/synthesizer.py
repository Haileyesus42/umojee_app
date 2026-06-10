from __future__ import annotations

import json
from typing import Any, List, MutableMapping, TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage


SYNTHESIZER_PROMPT = """
You are the Umoja Synthesizer. Review the user request and the structured outputs coming back from specialist workers.

Return EXACTLY ONE JSON object shaped as:
{
  "ai_generated": string,          // concise narrative for the user
  "message": string,               // duplicate of ai_generated
  "api_response_type": string|null,// e.g., "flights_list" when present; null otherwise
  "api_response": any|null,        // structured payload from the most relevant worker; null if none
  "trigger_popup": boolean,        // true when api_response_type is one of flights_list|hotels_list|cars_list; otherwise false
  "route"?: string,                // which agent handled the task
  "tool_raw"?: any                 // pass through any tool payloads from workers when available
}

MULTI-TASK SYNTHESIS RULES:
- You may receive results from MULTIPLE workers (e.g., flights, then cars, then hotels) executed sequentially.
- AGGREGATE all results into ONE coherent response that addresses ALL user tasks.
- The ai_generated/message MUST mention ALL completed tasks, not just the last one.

AGGREGATION STRATEGY:
1. If ALL workers returned structured data (api_response): Combine into single response
   - Keep the FIRST non-null api_response_type (usually "flights_list", "hotels_list", or "cars_list")
   - Merge api_response objects intelligently (flights take priority for display)
   - Example: {"api_response_type": "flights_list", "api_response": {flights:[...], also_found: {cars:[...], hotels:[...]}}}

2. If MIXED (some structured, some text): Prioritize structured data, append text summaries
   - Use structured data from the most important task (usually flights)
   - Mention other tasks in ai_generated text
   - Example: api_response=flight_data, ai_generated="Found flights to Paris. Also found 5 rental cars and 3 hotels."

3. If ALL text responses: Concatenate intelligently with clear separators
   - Example: "✈️ Flights: [...]. 🚗 Cars: [...]. 🏨 Hotels: [...]."

CLEAR EXAMPLES:
Input: [{"worker": "Amadeus_Workflow", "content": "{flights:[...]}"}, {"worker": "Amadeus_Workflow", "content": "{hotels:[...]}"}]
Output: {"ai_generated": "I found flights to Paris departing Jan 25, and 3 hotels near the Eiffel Tower.", "api_response_type": "flights_list", "api_response": {...}, "trigger_popup": true}

Input: [{"worker": "Amadeus_Workflow", "content": "Flight booked"}, {"worker": "Amadeus_Workflow", "content": "Car reserved"}]
Output: {"ai_generated": "✅ Flight booked successfully. ✅ Car rental confirmed at pickup location.", "api_response_type": null, "api_response": null, "trigger_popup": false}

Standard Rules:
- Prefer worker payloads that already contain ai_generated/api_response/api_response_type and reuse them without altering shapes or keys.
- Do NOT add markdown, tables, or extra prose outside the JSON object.
- If multiple workers responded, MERGE results coherently (don't just pick one).
- If api_response_type is flights_list, hotels_list, cars_list, or compare_flights, set trigger_popup=true; otherwise trigger_popup=false.
- CRITICAL: When api_response_type is "compare_flights", preserve the api_response structure EXACTLY as received from the worker. Do NOT restructure, flatten, or rename any fields inside it. The api_response must contain {"comparison_type": "destination", "items": [...]} with items untouched.
- If no structured data is available, set api_response=null and api_response_type=null (and trigger_popup=false) but still provide a clear ai_generated/message about next steps or missing info.
- Never fabricate data; if a worker result looks incomplete, state what is missing in ai_generated/message.
- The conversation may include language hints such as `speech_locale=<locale>` in prior system context or worker content.
- You may reason internally in English if needed, but the final `ai_generated` and `message` fields must be in the user's input language whenever a non-English language is indicated by context.
- Do not mention internal translation unless the user explicitly asks.
""".strip()


class WorkerResult(TypedDict):
    worker: str
    content: str


def _coerce_str(value: Any) -> str:
    if isinstance(value, list):
        return " ".join(str(part) for part in value)
    return str(value)


def _latest_user_message(messages: List[BaseMessage]) -> str:
    for message in reversed(messages):
        if isinstance(message, HumanMessage):
            return _coerce_str(message.content)
    return ""


def _capture_worker_results(
    messages: List[BaseMessage],
    cursor: int,
    worker: str,
    existing: List[WorkerResult] | None,
) -> List[WorkerResult]:
    results = list(existing or [])
    if cursor >= len(messages):
        return results

    new_msgs = messages[cursor:]
    parts: List[str] = []
    for msg in new_msgs:
        if isinstance(msg, AIMessage):
            text = _coerce_str(msg.content).strip()
            if text:
                parts.append(text)

    if parts:
        combined = "\n\n".join(parts)
        results.append({"worker": worker, "content": combined})
    return results


def _synthesize_reply(
    llm: BaseChatModel,
    user_query: str,
    worker_results: List[WorkerResult],
) -> str:
    if not worker_results:
        wait_msg = "I'm waiting on additional worker updates before I can respond."
        return json.dumps(
            {
                "ai_generated": wait_msg,
                "message": wait_msg,
                "api_response_type": None,
                "api_response": None,
                "trigger_popup": False,
                "tool_raw": None,
            }
        )

    payload = {
        "user_query": user_query,
        "worker_results": worker_results,
    }

    sys = SystemMessage(content=SYNTHESIZER_PROMPT)
    human = HumanMessage(content=json.dumps(payload))
    response = llm.invoke([sys, human])
    text = _coerce_str(getattr(response, "content", "")).strip()
    if text:
        try:
            json.loads(text)
            return text
        except Exception:
            pass

    # fallback: concatenate worker outputs
    fallback = []
    for result in worker_results:
        fallback.append(f"{result['worker']}: {result['content']}")
    fallback_msg = "\n\n".join(fallback) or "No worker content available."
    return json.dumps(
        {
            "ai_generated": fallback_msg,
            "message": fallback_msg,
            "api_response_type": None,
            "api_response": None,
            "trigger_popup": False,
            "tool_raw": None,
        }
    )


def synthesizer_node(
    state: MutableMapping[str, Any],
    *,
    llm: BaseChatModel,
) -> MutableMapping[str, Any]:
    messages = list(state.get("messages") or [])
    cursor = state.pop("worker_cursor", len(messages))
    worker = state.get("route") or "worker"
    worker_results = _capture_worker_results(
        messages,
        cursor,
        worker,
        state.get("worker_results"),
    )
    state["worker_results"] = worker_results

    # Check if this is a multi-task scenario with more tasks pending
    has_more_tasks = bool(state.get("route_queue"))

    # Accumulate results for multi-task scenarios
    if has_more_tasks or state.get("accumulated_results") is not None:
        accumulated = list(state.get("accumulated_results") or [])
        if worker_results:
            accumulated.extend(worker_results)
        state["accumulated_results"] = accumulated

        # Extract context from this task's results for next task
        # Try to parse JSON responses to extract structured data
        if worker_results:
            latest_content = worker_results[-1]["content"]
            try:
                parsed = json.loads(latest_content)
                if isinstance(parsed, dict):
                    # Extract useful context (flight details, booking info, etc.)
                    task_context = state.get("task_context") or {}
                    if "api_response" in parsed and parsed["api_response"]:
                        # Store structured data for next task
                        task_context[f"{worker}_data"] = parsed["api_response"]
                    if "flight_booking_details" in parsed:
                        task_context["flight_details"] = parsed["flight_booking_details"]
                    state["task_context"] = task_context
            except (json.JSONDecodeError, TypeError):
                pass

    # If more tasks are pending, don't synthesize yet - just pass through
    if has_more_tasks:
        # Keep worker_results for next iteration
        state.pop("route", None)
        # Don't add a message - let the next task run
        return state

    # Final synthesis - all tasks complete
    forward_from_agent = state.get("forward_from_agent")

    # Use accumulated results if available (multi-task), otherwise use current worker_results
    results_to_synthesize = state.get("accumulated_results") or worker_results

    if forward_from_agent and results_to_synthesize:
        raw_content = results_to_synthesize[-1]["content"]
        # The worker may have produced intermediate AI messages (e.g., tool-call
        # thinking text) that got concatenated with the final JSON output.
        # Try to extract just the last valid JSON object.
        reply = raw_content
        try:
            json.loads(raw_content)
        except (json.JSONDecodeError, ValueError):
            # Content has multiple parts; find the last valid JSON object
            last_json = None
            for segment in raw_content.split("\n\n"):
                segment = segment.strip()
                if not segment:
                    continue
                try:
                    json.loads(segment)
                    last_json = segment
                except (json.JSONDecodeError, ValueError):
                    continue
            if last_json:
                reply = last_json
        state["forward_from_agent"] = None
    else:
        user_text = _latest_user_message(messages)
        reply = _synthesize_reply(llm, user_text, results_to_synthesize)

    state["messages"] = messages + [AIMessage(content=reply)]

    # Clear all task-related state
    state["worker_results"] = []
    state.pop("accumulated_results", None)
    state.pop("task_context", None)
    state.pop("tasks_identified", None)
    state.pop("route", None)
    return state


__all__ = ["WorkerResult", "synthesizer_node"]
