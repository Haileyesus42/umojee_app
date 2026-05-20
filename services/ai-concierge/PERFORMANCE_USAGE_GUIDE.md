# Performance Utilities - Usage Guide

Quick reference for using the new performance monitoring and optimization utilities.

---

## 📦 **Import**

```python
from agent.performance import (
    timer,                       # Time operations
    optimize_messages,           # Smart message trimming
    extract_context_early,       # Parse JSON once
    cache_decision,             # Cache LLM decisions
    get_cached_decision,        # Retrieve cached decision
    get_performance_report,     # View timing stats
    reset_performance_monitor,  # Reset stats
)
```

---

## ⏱️ **1. Timing Operations**

### **Basic Usage**

```python
from agent.performance import timer

# Time any operation
with timer("my_operation"):
    expensive_function()

# Time LLM calls
with timer("llm_call"):
    response = llm.invoke(messages)

# Time parsing
with timer("json_parse"):
    data = json.loads(text)
```

### **View Report**

```python
from agent.performance import get_performance_report

# Get performance stats
report = get_performance_report()
print(report)
```

**Example Output**:
```
Performance Report:
============================================================
llm_call                      | count:  10 | avg:  1520.3ms | total:  15.20s
message_optimization          | count:  10 | avg:    11.2ms | total:   0.11s
json_parse                    | count:  10 | avg:     1.8ms | total:   0.02s
```

### **Reset Stats**

```python
from agent.performance import reset_performance_monitor

# Clear all timing data
reset_performance_monitor()
```

---

## 💬 **2. Message Optimization**

### **Smart Trimming**

```python
from agent.performance import optimize_messages

# Before: 50 messages, 20K tokens
messages = state.get("messages", [])

# After: 15 messages, 4K tokens (optimized)
optimized = optimize_messages(
    messages,
    max_tokens=4000,        # Token budget
    keep_system=True,       # Keep system messages
    keep_recent_human=3,    # Keep last 3 user messages
)

# Use optimized messages
state["messages"] = optimized
```

### **Custom Parameters**

```python
# More aggressive trimming (for long conversations)
optimized = optimize_messages(
    messages,
    max_tokens=2000,        # Tighter budget
    keep_recent_human=1,    # Only last user message
)

# Less aggressive (for short conversations)
optimized = optimize_messages(
    messages,
    max_tokens=6000,        # Larger budget
    keep_recent_human=5,    # More context
)
```

---

## 🔍 **3. Early Context Extraction**

### **Parse JSON Once**

```python
from agent.performance import extract_context_early

messages = state.get("messages", [])

# Extract context from recent AI messages
# Parses JSON ONCE and returns structured data
context = extract_context_early(messages)

if context:
    # Use extracted context
    flight_details = context.get("flight_details")
    travel_details = context.get("travel_details")

    # Store for reuse (no re-parsing needed)
    state["task_context"] = context
```

**What it Extracts**:
```python
{
    "flight_details": {
        "destination": "Paris",
        "arrival_date": "2026-01-25",
        "departure_date": "2026-01-28",
        "travelers": 2
    },
    "travel_details": {
        "destination": "Paris",
        "arrival_date": "2026-01-25",
        ...
    }
}
```

---

## 💾 **4. Decision Caching**

### **Cache LLM Decisions**

```python
from agent.performance import (
    cache_key_for_decision,
    get_cached_decision,
    cache_decision,
)

messages = state.get("messages", [])

# Generate cache key
cache_key = cache_key_for_decision(messages)

# Check cache first
cached = get_cached_decision(cache_key)
if cached:
    return cached  # Instant return (< 1ms)

# Cache miss → call LLM
decision = _orchestrator_decide(messages)

# Cache for future requests
cache_decision(cache_key, decision)

return decision
```

### **Clear Cache**

```python
from agent.performance import clear_decision_cache

# Clear all cached decisions
clear_decision_cache()
```

---

## 🔧 **5. Integration Examples**

### **In a LangGraph Node**

```python
from agent.performance import timer, optimize_messages

def my_node(state):
    messages = state.get("messages", [])

    # Optimize messages
    with timer("node_message_optimization"):
        optimized = optimize_messages(messages, max_tokens=4000)

    # Call LLM with timing
    with timer("node_llm_call"):
        response = llm.invoke(optimized)

    # Parse with timing
    with timer("node_json_parse"):
        data = json.loads(response.content)

    return state
```

### **In FastAPI Endpoint**

```python
from fastapi import APIRouter
from agent.performance import timer, get_performance_report, reset_performance_monitor

router = APIRouter()

@router.post("/api/ai/respond")
def respond(payload):
    # Time entire request
    with timer("api_respond_total"):
        # Process request
        result = graph.invoke(...)

    return result

@router.get("/api/performance")
def performance_stats():
    """Get performance statistics"""
    report = get_performance_report()
    reset_performance_monitor()  # Reset after reporting
    return {"report": report}
```

---

## 📊 **6. Monitoring in Production**

### **Add Performance Endpoint**

```python
# In server/routes.py
from agent.performance import get_performance_report, reset_performance_monitor

@router.get("/api/ai/performance")
def get_performance():
    """Get AI performance statistics"""
    report = get_performance_report()
    return {"performance": report}

@router.post("/api/ai/performance/reset")
def reset_performance():
    """Reset performance statistics"""
    reset_performance_monitor()
    return {"ok": True}
```

### **Call from Frontend**

```javascript
// Get performance stats
fetch('/api/ai/performance')
  .then(res => res.json())
  .then(data => {
    console.log('AI Performance:', data.performance);
  });

// Reset stats
fetch('/api/ai/performance/reset', { method: 'POST' });
```

---

## 🎯 **7. Best Practices**

### **DO**
✅ Time expensive operations (LLM calls, parsing, API calls)
✅ Optimize messages before LLM calls
✅ Cache decisions for similar requests
✅ Extract context early to avoid redundant parsing
✅ Monitor performance regularly
✅ Reset stats periodically (daily/weekly)

### **DON'T**
❌ Time trivial operations (variable assignments, simple math)
❌ Over-optimize (don't cache everything)
❌ Keep stats forever (reset periodically to avoid memory issues)
❌ Cache user-specific data (privacy issue)

---

## 🐛 **8. Troubleshooting**

### **Performance Report Shows Slow Operations**

```python
# Check report
report = get_performance_report()
print(report)

# If "llm_call" is slow (> 2s avg):
# → Check message size (optimize_messages)
# → Check model (use faster model for simple tasks)
# → Check API latency (network issue?)

# If "message_optimization" is slow (> 50ms):
# → Too many messages? Increase max_tokens limit
# → Reduce keep_recent_human parameter

# If "json_parse" is slow (> 10ms):
# → JSON too large? Worker returning too much data
```

### **Cache Not Working**

```python
# Check if caching is enabled
from agent.performance import get_cached_decision

cached = get_cached_decision("test_key")
if cached is None:
    print("Cache miss or expired (TTL = 5 min)")

# Clear cache and try again
from agent.performance import clear_decision_cache
clear_decision_cache()
```

### **Memory Usage Increasing**

```python
# Reset performance monitor to free memory
from agent.performance import reset_performance_monitor
reset_performance_monitor()

# Clear decision cache
from agent.performance import clear_decision_cache
clear_decision_cache()
```

---

## 📈 **9. Performance Tuning**

### **Adjust Token Budget**

```python
# For long conversations (more context needed)
optimized = optimize_messages(messages, max_tokens=6000)

# For short conversations (less context needed)
optimized = optimize_messages(messages, max_tokens=2000)

# For multi-task (balance between context and speed)
optimized = optimize_messages(messages, max_tokens=4000)  # Default
```

### **Adjust Cache TTL**

Edit `agent/performance.py`:
```python
# Default: 5 minutes
_cache_ttl = 300

# Longer: 15 minutes (for stable conversations)
_cache_ttl = 900

# Shorter: 1 minute (for rapidly changing data)
_cache_ttl = 60
```

### **Adjust Recent Messages Count**

```python
# Keep more user context
optimized = optimize_messages(messages, keep_recent_human=5)

# Keep less (for token savings)
optimized = optimize_messages(messages, keep_recent_human=1)
```

---

## ✅ **10. Quick Checklist**

Before deploying to production:

- [ ] Performance monitoring enabled
- [ ] Timing added to key operations (LLM calls, parsing)
- [ ] Message optimization implemented
- [ ] Decision caching implemented (optional, but recommended)
- [ ] Performance endpoint added to API
- [ ] Performance report checked (no operations > 3s avg)
- [ ] Cache TTL appropriate for use case
- [ ] Token budget tuned for typical conversations
- [ ] Memory usage monitored (reset stats periodically)

---

## 🚀 **Quick Start**

```python
# 1. Import utilities
from agent.performance import timer, optimize_messages, get_performance_report

# 2. Use in your code
def my_function(state):
    messages = state.get("messages", [])

    # Optimize messages
    messages = optimize_messages(messages)

    # Time expensive operation
    with timer("my_expensive_operation"):
        result = expensive_function(messages)

    return result

# 3. Check performance
report = get_performance_report()
print(report)
```

That's it! You're now using performance utilities. 🎉

---

**For more details, see**: [PERFORMANCE_OPTIMIZATIONS.md](PERFORMANCE_OPTIMIZATIONS.md)
