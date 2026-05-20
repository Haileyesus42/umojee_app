# Multi-Task Handling - Quick Reference

## 🎯 What Changed

Your AI system can now handle **multiple tasks from ONE user message**.

### Example

**Before** ❌:
```
User: "Book flight to Paris, rent car, find hotel"
System: [Only handles flight, ignores car and hotel]
```

**After** ✅:
```
User: "Book flight to Paris, rent car, find hotel"
System: [Handles ALL THREE: flight → car → hotel → ONE response]
```

---

## 🔑 Key Concepts

### 1. Task Decomposition
The orchestrator now **identifies ALL tasks** in a user message:
- "flight to Paris" → Task 1: Amadeus Flights
- "rent car" → Task 2: Amadeus Cars
- "find hotel" → Task 3: Amadeus Hotels

### 2. Sequential Execution
Tasks execute **one after another** (not parallel):
1. Flight completes → extracts destination, dates
2. Car starts → uses flight destination/dates
3. Hotel starts → uses flight destination/dates

### 3. Context Propagation
Information flows between tasks:
```
Flight Result:
{
  "destination": "Paris",
  "arrival_date": "2026-01-25",
  "travelers": 1
}
    ↓ (automatic)
Car Request:
"Search cars at Paris CDG on 2026-01-25 for 1 traveler"
```

### 4. Result Synthesis
ALL results combined into ONE final response:
- ✅ "I found flights to Paris, rental cars at CDG, and 3 hotels near the Eiffel Tower"
- ❌ NOT: "Flight booked" → "Car found" → "Hotel found" (3 separate messages)

---

## 📋 How It Works (Simple)

```
┌─────────────────────────────────────────────┐
│ User: "Flight + Car + Hotel to Paris"      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ ORCHESTRATOR                                │
│ - Identifies: 3 tasks                       │
│ - Creates queue: [Flight, Car, Hotel]      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ TASK 1: Amadeus Flights                    │
│ - Searches/books flight                     │
│ - Result: destination=Paris, date=Jan 25   │
└─────────────────────────────────────────────┘
                    ↓ (pass context)
┌─────────────────────────────────────────────┐
│ TASK 2: Amadeus Cars                       │
│ - Receives: Paris, Jan 25                  │
│ - Searches cars at Paris airports          │
└─────────────────────────────────────────────┘
                    ↓ (pass context)
┌─────────────────────────────────────────────┐
│ TASK 3: Amadeus Hotels                     │
│ - Receives: Paris, Jan 25                  │
│ - Searches hotels in Paris                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ SYNTHESIZER                                 │
│ - Combines ALL 3 results                   │
│ - Returns: ONE coherent response           │
└─────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Quick Test

```bash
cd /path/to/ai
python test_multi_task.py
```

### Test via API

```bash
curl -X POST http://localhost:8000/api/ai/respond \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test",
    "message": "Book flight NYC to London Jan 25, rent car at Heathrow, hotel near Big Ben",
    "is_logged_in": true
  }'
```

**Expected**: ONE response mentioning flights, cars, AND hotels.

---

## 🔍 How to Verify It's Working

### 1. Check Logs (if AI_LOG_PROMPTS=true)

Look for:
```
[Orchestrator] targets: ["Amadeus_Workflow", "Amadeus_Workflow", "Amadeus_Workflow"]
[Orchestrator] tasks_identified: ["search flights", "rent car", "book hotel"]
[Task 1/3]: search flights
[Task 2/3]: rent car
[Task 3/3]: book hotel
[Synthesizer] Synthesizing 3 worker results
```

### 2. Check Response

The final AI response should mention **ALL tasks**:
- ✅ "I found flights to London, rental cars at Heathrow, and 3 hotels near Big Ben"
- ❌ "I found flights to London" (missing car and hotel)

### 3. Check State

Add this debug line in `router.py` `orchestrator_node`:
```python
print(f"[DEBUG] Queue: {state.get('route_queue')}, Context: {state.get('task_context')}")
```

Should show:
- First call: Queue = ["Amadeus_Workflow", "Amadeus_Workflow"]
- Second call: Queue = ["Amadeus_Workflow"]
- Third call: Queue = []

---

## 🐛 Troubleshooting

### Issue: Only first task executed

**Symptom**: User says "flight + car + hotel" → Only gets flight result

**Check**:
1. Is LLM returning `targets` array? (Check logs)
2. Is `route_queue` being set? (Add debug print)
3. Is synthesizer seeing `has_more_tasks`? (Add debug print)

**Fix**: Orchestrator prompt may need adjustment for your LLM model

---

### Issue: Tasks executed but context not passed

**Symptom**: Car search doesn't use flight destination

**Check**:
1. Is flight result JSON parseable? (Check worker response format)
2. Is `task_context` being populated? (Add debug print in synthesizer)
3. Is context being injected in task hint? (Check messages array)

**Fix**: Ensure flight workflow returns structured JSON with `api_response` field

---

### Issue: Final response doesn't mention all tasks

**Symptom**: 3 tasks executed, but final response only mentions last one

**Check**:
1. Are results being accumulated? (Check `accumulated_results` in state)
2. Is synthesizer using accumulated results? (Add debug print)
3. Is synthesizer prompt clear about aggregation? (Review prompt)

**Fix**: Synthesizer should use `accumulated_results` not `worker_results`

---

## 📚 Related Files

- **Implementation Details**: [MULTI_TASK_IMPLEMENTATION.md](MULTI_TASK_IMPLEMENTATION.md)
- **Test Script**: [test_multi_task.py](test_multi_task.py)
- **Main Router**: [agent/router.py](agent/router.py)
- **Synthesizer**: [agent/synthesizer.py](agent/synthesizer.py)
- **Amadeus Workflow**: [agent/amadeus/amadeus_workflow.py](agent/amadeus/amadeus_workflow.py)

---

## ✅ Checklist for Production

Before deploying to production:

- [ ] Run test_multi_task.py successfully
- [ ] Test with real Amadeus API calls (not just mock)
- [ ] Test with various multi-task combinations:
  - [ ] Flight + Hotel
  - [ ] Flight + Car
  - [ ] Flight + Car + Hotel
  - [ ] Hotel + Car (no flight)
- [ ] Verify context propagation works
- [ ] Verify final response aggregates all results
- [ ] Verify single-task still works (backward compatible)
- [ ] Monitor performance (multi-task takes longer)
- [ ] Check error handling (what if flight search fails?)

---

## 🎓 Understanding the Code

### Orchestrator Decision

```python
# In router.py orchestrator_node()

# Check if resuming from queue
if route_queue:
    # Pop next task
    target = route_queue.pop(0)
    # Add task hint with context
    state["messages"] += [SystemMessage(f"[TASK X/Y] with context...")]
    return Command(goto=target)

# New decision
decision = _orchestrator_decide(messages)
targets = decision.get("targets") or [decision.get("target")]

if len(targets) > 1:
    # Multi-task: store queue
    state["route_queue"] = targets[1:]
```

### Synthesizer Accumulation

```python
# In synthesizer.py synthesizer_node()

has_more_tasks = bool(state.get("route_queue"))

if has_more_tasks:
    # Accumulate result
    accumulated = state.get("accumulated_results", [])
    accumulated.extend(worker_results)
    state["accumulated_results"] = accumulated

    # Extract context for next task
    task_context = state.get("task_context", {})
    # ... parse and store ...
    state["task_context"] = task_context

    # Don't synthesize yet
    return state

# All tasks done - synthesize everything
results = state.get("accumulated_results") or worker_results
reply = _synthesize_reply(llm, user_text, results)
```

---

**Quick Start**: Just run `python test_multi_task.py` and see it work! 🚀
