# Multi-Task Handling Implementation

## 🎯 Overview

The system has been upgraded to handle **multiple tasks from a single user message**, executing them **sequentially** with **context propagation** between tasks, and **synthesizing all results** into one coherent response.

### Example Scenario

**User says**: *"Book me a flight from NYC to London on Jan 25, rent a car at Heathrow, and find a hotel near Big Ben for 3 nights"*

**System behavior**:
1. ✅ **Parses** → Identifies 3 tasks: flight, car, hotel
2. ✅ **Executes sequentially**: Amadeus Flights → Amadeus Cars → Amadeus Hotels
3. ✅ **Passes context**: Flight destination/dates → Car pickup location/dates → Hotel location/dates
4. ✅ **Synthesizes**: One final response combining all three results

---

## 📐 Architecture Changes

### 1. **State Extensions**

#### [router.py](agent/router.py) - `OrchestratorState`
```python
class OrchestratorState(TypedDict, total=False):
    # ... existing fields ...
    route_queue: Optional[List[str]]              # Pending tasks
    tasks_identified: Optional[List[str]]         # Task descriptions
    task_context: Optional[dict]                  # Shared context between tasks
    accumulated_results: Optional[List[WorkerResult]]  # All task results
```

#### [amadeus_workflow.py](agent/amadeus/amadeus_workflow.py) - `AmadeusState`
```python
class AmadeusState(TypedDict, total=False):
    # ... existing fields ...
    route_queue: Optional[List[str]]              # Pending sub-tasks
    tasks_identified: Optional[List[str]]         # Sub-task descriptions
    task_context: Optional[dict]                  # Context for next task
```

---

### 2. **Orchestrator Enhancements**

#### **Prompt Upgrade** ([router.py](agent/router.py:57-74))

**Before**:
- Simple routing: "Which workflow should handle this?"

**After**:
- **Task decomposition**: "What are ALL the tasks in this message?"
- **Dependency ordering**: "Flights must come before cars/hotels"
- **Sequential execution**: "Execute tasks in order, passing context"

#### **Schema Changes** ([router.py](agent/router.py:76-97))

**New fields**:
- `targets`: Array of workflows for multi-task (e.g., `["Amadeus_Workflow", "Amadeus_Workflow", "Amadeus_Workflow"]`)
- `tasks_identified`: Array of task descriptions (e.g., `["search flights", "rent car", "book hotel"]`)
- `task_instructions`: Brief context for workflows

#### **Decision Logic** ([router.py](agent/router.py:157-234))

**Key changes**:
1. **Queue Processing**: On re-entry, pop next task from `route_queue` without re-deciding
2. **Task Hints**: Inject `[TASK X/Y]: description` as SystemMessage before each task
3. **Context Injection**: Attach `task_context` from previous tasks
4. **State Initialization**: Set up `accumulated_results` and `task_context` for multi-task

```python
# When resuming from queue
if route_queue:
    target = route_queue.pop(0)
    # Add task hint with context
    task_hint = f"[TASK {idx + 1}/{total}]: {task_description}"
    if task_context:
        task_hint += f"\nContext from previous: {json.dumps(task_context)}"
    state["messages"] += [SystemMessage(content=task_hint)]
    return Command(goto=target, update=state)
```

---

### 3. **Synthesizer Enhancements**

#### **Prompt Upgrade** ([synthesizer.py](agent/synthesizer.py:10-45))

**New capability**: Aggregate multiple worker results
- "You may receive results from MULTIPLE workers (flights, cars, hotels) executed sequentially"
- "AGGREGATE all results into ONE coherent response"
- "Example: User asked for 'flight, car, hotel' → Synthesize: 'I found flights to Paris, rental cars at CDG, and 3 hotels near the Eiffel Tower.'"

#### **Result Accumulation** ([synthesizer.py](agent/synthesizer.py:127-172))

**Key logic**:
1. **Detect multi-task**: Check if `route_queue` exists or `accumulated_results` initialized
2. **Accumulate**: Store each worker's result in `accumulated_results`
3. **Extract context**: Parse JSON responses to find structured data (flight details, etc.)
4. **Store context**: Save in `task_context` for next task
5. **Skip synthesis**: If more tasks pending, don't synthesize yet
6. **Final synthesis**: When all tasks done, synthesize ALL accumulated results

```python
# Accumulate results
if has_more_tasks or state.get("accumulated_results") is not None:
    accumulated = list(state.get("accumulated_results") or [])
    accumulated.extend(worker_results)
    state["accumulated_results"] = accumulated

    # Extract context for next task
    if worker_results:
        latest_content = worker_results[-1]["content"]
        parsed = json.loads(latest_content)
        if parsed.get("api_response"):
            task_context[f"{worker}_data"] = parsed["api_response"]
        state["task_context"] = task_context

# If more tasks pending, don't synthesize yet
if has_more_tasks:
    return state  # No AI message added yet

# Final synthesis with ALL accumulated results
results_to_synthesize = state.get("accumulated_results") or worker_results
reply = _synthesize_reply(llm, user_text, results_to_synthesize)
```

---

### 4. **Amadeus Workflow Enhancements**

#### **Prompt Upgrade** ([amadeus_workflow.py](agent/amadeus/amadeus_workflow.py:36-65))

**New instructions**:
- "ALWAYS analyze if request contains MULTIPLE Amadeus services (flights AND cars AND hotels)"
- "Set 'targets' as an ARRAY when multiple services needed"
- "DEPENDENCY ORDER: Flights MUST complete before Cars or Hotels"
- "CONTEXT FLOW: Destination, dates, travelers from flights → automatically used for cars/hotels"

#### **Supervisor Logic** ([amadeus_workflow.py](agent/amadeus/amadeus_workflow.py:122-178))

**Enhanced decision-making**:
1. **Queue processing**: Handle `route_queue` on re-entry
2. **Task hints**: Inject `[AMADEUS TASK X/Y]` with context
3. **Multi-service detection**: Parse `targets` array from LLM decision
4. **Context initialization**: Set up `task_context` for service chaining

#### **Return Handler** ([amadeus_workflow.py](agent/amadeus/amadeus_workflow.py:180-268))

**Context extraction**:
1. **Parse responses**: Try to extract JSON from worker responses
2. **Extract flight details**: Specifically look for destination, dates, travelers
3. **Store in task_context**: Make available to next service
4. **Route back**: If `route_queue` has more tasks, return to supervisor

```python
# Extract context from this task
if last_ai and (has_more_tasks or flight_completed):
    parsed = json.loads(last_ai.content)
    task_context = state.get("task_context") or {}

    # Store API responses
    if parsed.get("api_response"):
        task_context[f"{route}_data"] = parsed["api_response"]

    # Extract flight details specifically
    if route == "Amadeus_Flights":
        if parsed.get("flight_booking_details"):
            task_context["flight_details"] = parsed["flight_booking_details"]

    state["task_context"] = task_context

# Route back to supervisor if more tasks
if has_more_tasks:
    state["forward_to_supervisor"] = True
    return state
```

---

## 🔄 Execution Flow

### Single Task (Baseline)

```
User: "Find flights from NYC to London"
  ↓
Orchestrator: { target: "Amadeus_Workflow" }
  ↓
Amadeus_Workflow executes
  ↓
Synthesizer: ONE result
  ↓
Final Response
```

### Multi-Task (New)

```
User: "Book flight to Paris, rent car at CDG, find hotel near Louvre"
  ↓
Orchestrator: {
  targets: ["Amadeus_Workflow", "Amadeus_Workflow", "Amadeus_Workflow"],
  tasks_identified: ["search flights", "rent car", "book hotel"]
}
  ↓
[TASK 1/3] Amadeus_Workflow (Flights)
  - Executes flight search/booking
  - Extracts: destination=Paris, arrival_date=..., travelers=1
  - Stores in task_context
  ↓
Synthesizer (partial)
  - Accumulates result #1
  - Sees route_queue has more tasks
  - Does NOT synthesize yet
  ↓
Orchestrator (re-entry)
  - Pops next task from route_queue
  - Injects: "[TASK 2/3]: rent car"
  - Injects: "Context: destination=Paris, arrival_date=..."
  ↓
[TASK 2/3] Amadeus_Workflow (Cars)
  - Uses context from flights
  - Searches cars at Paris CDG on arrival_date
  - Returns car options
  ↓
Synthesizer (partial)
  - Accumulates result #2
  - Sees route_queue has more tasks
  - Does NOT synthesize yet
  ↓
Orchestrator (re-entry)
  - Pops next task from route_queue
  - Injects: "[TASK 3/3]: book hotel"
  - Injects: "Context: destination=Paris, arrival_date=..."
  ↓
[TASK 3/3] Amadeus_Workflow (Hotels)
  - Uses context from flights
  - Searches hotels in Paris near Louvre
  - Returns hotel options
  ↓
Synthesizer (final)
  - Accumulates result #3
  - Route queue is now EMPTY
  - Synthesizes ALL THREE results
  ↓
Final Response: "I found flights to Paris, rental cars at CDG, and 3 hotels near the Louvre"
```

---

## 🧪 Testing

### Test Script

Run the comprehensive test suite:

```bash
cd /path/to/ai
python test_multi_task.py
```

**Tests included**:
1. ✅ **Single Task (Baseline)**: Verify single-task still works
2. ✅ **Flight + Hotel**: Two-task scenario
3. ✅ **Flight + Car + Hotel**: Three-task scenario (full chain)

### Manual Testing via API

```bash
curl -X POST http://localhost:8000/api/ai/respond \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "message": "I need a flight from NYC to London on Jan 25, a rental car at Heathrow, and a hotel near Big Ben for 3 nights",
    "is_logged_in": true
  }'
```

**Expected behavior**:
- Should return ONE response with all three services
- Response should mention flights, cars, AND hotels
- Should not require 3 separate messages

---

## 📊 Key Metrics

### Before (Single-Task Only)
- ❌ Multi-task request → Only first task handled
- ❌ User must send 3 separate messages
- ❌ No context sharing between requests

### After (Multi-Task Support)
- ✅ Multi-task request → All tasks handled
- ✅ User sends ONE message
- ✅ Context automatically flows between tasks
- ✅ ONE coherent response combining all results

---

## 🔍 Debugging

### Enable Verbose Logging

Set in `.env`:
```bash
AI_LOG_PROMPTS=true
```

This will show:
- Orchestrator decisions (targets, rationale, tasks_identified)
- Task hints injected before each task
- Worker results being accumulated
- Final synthesis combining all results

### Check State

Add logging in [router.py](agent/router.py) `orchestrator_node`:
```python
print(f"[DEBUG] route_queue: {state.get('route_queue')}")
print(f"[DEBUG] tasks_identified: {state.get('tasks_identified')}")
print(f"[DEBUG] task_context: {state.get('task_context')}")
```

### Check Synthesis

Add logging in [synthesizer.py](agent/synthesizer.py) `synthesizer_node`:
```python
print(f"[DEBUG] has_more_tasks: {has_more_tasks}")
print(f"[DEBUG] accumulated_results: {len(state.get('accumulated_results', []))}")
print(f"[DEBUG] Synthesizing: {results_to_synthesize}")
```

---

## 🐛 Known Limitations

1. **LLM Dependent**: Task decomposition relies on LLM understanding multi-task intent
   - Mitigation: Clear prompts with examples

2. **Context Extraction**: Relies on JSON parsing of worker responses
   - Mitigation: Structured responses from all workers

3. **Token Limits**: Very long multi-task chains may hit context limits
   - Mitigation: Message trimming (already implemented)

4. **Error Handling**: If one task fails, subsequent tasks may not have complete context
   - Future: Add error recovery logic

---

## ✅ Validation Checklist

- [x] Orchestrator identifies multiple tasks from one message
- [x] Tasks are queued in dependency order
- [x] Tasks execute sequentially (not parallel)
- [x] Context flows from task to task
- [x] Synthesizer accumulates all results
- [x] Final response mentions all completed tasks
- [x] Single-task behavior unchanged (backward compatible)
- [x] State cleanup after multi-task completion
- [x] Test script created and passing

---

## 🚀 Next Steps

With multi-task handling now solid, you can:

1. **Test in production** with real user requests
2. **Monitor performance** (multi-task requests may take longer)
3. **Optimize context extraction** (add more structured data parsing)
4. **Extend to other workflows** (Umoja can also benefit from multi-task)
5. **Begin Nexus Flow implementation** (Phase 1: Journey State Foundation)

---

## 📝 Files Modified

| File | Changes |
|------|---------|
| [agent/router.py](agent/router.py) | Orchestrator prompt, schema, state, decision logic, queue processing |
| [agent/synthesizer.py](agent/synthesizer.py) | Result accumulation, context extraction, conditional synthesis |
| [agent/amadeus/amadeus_workflow.py](agent/amadeus/amadeus_workflow.py) | Amadeus supervisor prompt, schema, state, queue handling, context extraction |

## 📝 Files Created

| File | Purpose |
|------|---------|
| [test_multi_task.py](test_multi_task.py) | Comprehensive test suite for multi-task scenarios |
| [MULTI_TASK_IMPLEMENTATION.md](MULTI_TASK_IMPLEMENTATION.md) | This documentation |

---

**Implementation Date**: 2026-01-23
**Status**: ✅ Complete and Ready for Testing
