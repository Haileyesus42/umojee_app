# Quick Start Guide - Using New AI Features

## For Developers

### 1. Context Resolution (Automatic)

**No code changes needed.** The system automatically resolves pronouns and implicit intents.

**Test it:**
```bash
# Start the server
cd ndit-umoja-all-apps/ai
uvicorn server.main:app --reload

# In another terminal, test with curl
curl -X POST http://localhost:8000/api/ai/respond \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "test_conv",
    "user_id": "test_user",
    "message": "Show me flights to Paris",
    "is_logged_in": true
  }'

# Then test pronoun resolution
curl -X POST http://localhost:8000/api/ai/respond \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "test_conv",
    "user_id": "test_user",
    "message": "Book it",
    "is_logged_in": true
  }'
```

---

### 2. Fuzzy Location Tracking

**Frontend code:**
```javascript
// Start location tracking when journey begins
function startLocationTracking(journeyId) {
  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const response = await fetch(
        `/api/ai/journey/${journeyId}/location/update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy_meters: position.coords.accuracy,
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.notification_sent) {
        showNotification({
          title: `${data.distance_km} km away`,
          body: `ETA: ${data.eta_minutes} minutes`,
          zone: data.zone,
        });
      }
    },
    (error) => console.error('Location error:', error),
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 5000,
    }
  );
  
  return watchId;
}

// Stop tracking
function stopLocationTracking(watchId) {
  navigator.geolocation.clearWatch(watchId);
}
```

---

### 3. Journey Templates

**Frontend code:**
```javascript
// Show templates on journey creation page
async function loadTemplates(userId) {
  const response = await fetch(`/api/ai/journey/templates?user_id=${userId}`);
  const data = await response.json();
  
  return data.templates;
}

// Display template cards
function TemplateList({ userId }) {
  const [templates, setTemplates] = useState([]);
  
  useEffect(() => {
    loadTemplates(userId).then(setTemplates);
  }, [userId]);
  
  return (
    <div className="template-grid">
      {templates.map(template => (
        <div key={template.template_id} className="template-card">
          <h3>{template.name}</h3>
          <p>{template.origin} → {template.destination}</p>
          <p>{template.duration_days} days</p>
          <p>Used {template.use_count} times</p>
          <button onClick={() => applyTemplate(template.template_id, userId)}>
            Use Template
          </button>
        </div>
      ))}
    </div>
  );
}

// Apply template
async function applyTemplate(templateId, userId) {
  const response = await fetch(
    `/api/ai/journey/templates/${templateId}/apply`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    }
  );
  
  const data = await response.json();
  
  if (data.ok) {
    // Navigate to new journey
    window.location.href = `/journey/${data.journey_id}`;
  }
}

// Save as template (after journey completes)
async function saveAsTemplate(journeyId, templateName) {
  const response = await fetch('/api/ai/journey/templates/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      journey_id: journeyId,
      template_name: templateName,
      description: 'My saved trip',
    }),
  });
  
  const data = await response.json();
  return data.template_id;
}
```

---

### 4. Calendar Export

**Frontend code:**
```javascript
// Add export button
function CalendarExportButton({ journeyId }) {
  const exportToCalendar = async () => {
    const response = await fetch(
      `/api/ai/journey/${journeyId}/export/calendar?format=ical`
    );
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip_${journeyId}.ics`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  return (
    <button onClick={exportToCalendar}>
      📅 Add to Calendar
    </button>
  );
}
```

---

### 5. Flight Comparison

**Frontend code:**
```javascript
// After flight search, show comparison
async function compareFlights(flights, userPriorities) {
  const response = await fetch('/api/ai/compare/flights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flights: flights,
      user_priorities: userPriorities || {
        price: 0.35,
        duration: 0.25,
        comfort: 0.20,
        convenience: 0.15,
        flexibility: 0.05,
      },
    }),
  });
  
  const data = await response.json();
  return data.comparison;
}

// Display comparison
function FlightComparison({ flights }) {
  const [comparison, setComparison] = useState(null);
  
  useEffect(() => {
    compareFlights(flights).then(setComparison);
  }, [flights]);
  
  if (!comparison) return <Loading />;
  
  return (
    <div className="comparison">
      <h2>Flight Comparison</h2>
      <p className="recommendation">{comparison.recommendation}</p>
      
      <div className="options">
        {comparison.options.map(option => (
          <div key={option.rank} className="option-card">
            <div className="rank">#{option.rank}</div>
            <h3>{option.name}</h3>
            <div className="score">Score: {option.overall_score}/10</div>
            
            <div className="pros">
              <strong>Pros:</strong>
              <ul>
                {option.pros.map((pro, i) => <li key={i}>{pro}</li>)}
              </ul>
            </div>
            
            <div className="cons">
              <strong>Cons:</strong>
              <ul>
                {option.cons.map((con, i) => <li key={i}>{con}</li>)}
              </ul>
            </div>
            
            <button onClick={() => selectFlight(option.data)}>
              Select This Flight
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 6. What-If Analysis

**Frontend code:**
```javascript
function WhatIfAnalyzer({ journeyId, currentDeparture, flightDeparture }) {
  const [impact, setImpact] = useState(null);
  const [proposedTime, setProposedTime] = useState(currentDeparture);
  
  const analyzeImpact = async () => {
    const response = await fetch(`/api/ai/journey/${journeyId}/whatif`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_type: 'departure_time',
        current_state: { departure: currentDeparture },
        proposed_change: { departure: proposedTime },
      }),
    });
    
    const data = await response.json();
    setImpact(data.impact);
  };
  
  return (
    <div className="whatif-analyzer">
      <h3>What if I leave at a different time?</h3>
      
      <input
        type="time"
        value={proposedTime}
        onChange={(e) => setProposedTime(e.target.value)}
      />
      
      <button onClick={analyzeImpact}>Analyze Impact</button>
      
      {impact && (
        <div className="impact-result">
          <div className={`recommendation ${impact.risk_change}`}>
            {impact.recommendation}
          </div>
          
          <div className="risk">
            Risk: {(impact.risk_percentage * 100).toFixed(0)}%
          </div>
          
          <div className="pros">
            <strong>Pros:</strong>
            <ul>
              {impact.pros.map((pro, i) => <li key={i}>{pro}</li>)}
            </ul>
          </div>
          
          <div className="cons">
            <strong>Cons:</strong>
            <ul>
              {impact.cons.map((con, i) => <li key={i}>{con}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 7. Safety Alerts

**Frontend code:**
```javascript
// Check safety before showing destination
async function DestinationCard({ destination, country }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`/api/ai/safety/check?country=${country}&city=${destination}`)
      .then(r => r.json())
      .then(data => {
        setAlerts(data.alerts);
        setLoading(false);
      });
  }, [country, destination]);
  
  return (
    <div className="destination-card">
      <h3>{destination}, {country}</h3>
      
      {alerts.length > 0 && (
        <div className="safety-alerts">
          {alerts.map((alert, i) => (
            <div key={i} className={`alert ${alert.severity}`}>
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
              <small>Source: {alert.source}</small>
            </div>
          ))}
        </div>
      )}
      
      <button
        disabled={alerts.some(a => a.severity === 'critical')}
        onClick={() => selectDestination(destination)}
      >
        {alerts.some(a => a.severity === 'critical')
          ? 'Not Recommended'
          : 'Select Destination'}
      </button>
    </div>
  );
}
```

---

### 8. Rollback Support

**Frontend code:**
```javascript
// Add "Undo" button to segment transitions
function SegmentTransitionNotification({ journeyId, transition }) {
  const [canUndo, setCanUndo] = useState(true);
  
  const undoTransition = async () => {
    const response = await fetch(`/api/ai/journey/${journeyId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'User requested undo',
      }),
    });
    
    const data = await response.json();
    
    if (data.ok) {
      showNotification('Transition undone');
      refreshJourneyState();
    }
  };
  
  return (
    <div className="transition-notification">
      <p>Moved to {transition.to_segment}</p>
      {canUndo && (
        <button onClick={undoTransition}>
          ↩️ Undo
        </button>
      )}
    </div>
  );
}
```

---

## 🧪 Testing Your Integration

### 1. Test Context Resolution
```javascript
// Send a search
await sendMessage("Show me flights to NYC");

// Wait for response with flight options
await sleep(2000);

// Test pronoun resolution
await sendMessage("Book it");
// Should resolve to specific flight
```

### 2. Test Implicit Intent
```javascript
// Create a journey
const journey = await createJourney();

// Test location intent
await sendMessage("I'm at the airport");
// Should trigger transition

// Test urgency intent
await sendMessage("Running late");
// Should check traffic and recalculate
```

### 3. Test Fuzzy Geofencing
```javascript
// Simulate approaching airport
await updateLocation(journeyId, {
  latitude: 40.7128,  // 5 km from JFK
  longitude: -74.0060,
});
// Should get "approaching" notification

await sleep(1000);

// Simulate nearby
await updateLocation(journeyId, {
  latitude: 40.6500,  // 1 km from JFK
  longitude: -73.7900,
});
// Should get "nearby" notification

await sleep(1000);

// Simulate arrival
await updateLocation(journeyId, {
  latitude: 40.6413,  // At JFK
  longitude: -73.7781,
});
// Should get "arrived" notification + transition
```

### 4. Test Timeline Recalculation
```javascript
// Create journey with departure time
const journey = await createJourneyWithTimeline();

// Simulate traffic delay (via monitoring)
// System should automatically recalculate and notify

// Or test urgency
await sendMessage("I'm running late");
// Should compress timeline and notify
```

### 5. Test Templates
```javascript
// Complete a journey
await completeJourney(journeyId);

// Save as template
const templateId = await saveAsTemplate(journeyId, "My NYC Trip");

// Create new journey from template
const newJourneyId = await applyTemplate(templateId, userId);
```

---

## 🐛 Debugging Tips

### Check Context Resolution
```python
from agent.context_resolver import resolve_user_message
from langchain_core.messages import HumanMessage, AIMessage

messages = [
    AIMessage(content="I found 3 flights: Flight 1 ($500), Flight 2 ($600), Flight 3 ($450)"),
]

result = resolve_user_message("Book it", messages)
print(result["resolved_message"])
# Should show: "book flight 3 ($450)"
```

### Check Geofencing
```python
from agent.location_geofencing import evaluate_user_location

status = evaluate_user_location(
    journey_id="test",
    current_lat=40.7128,
    current_lon=-74.0060,
    waypoint_lat=40.6413,
    waypoint_lon=-73.7781,
    waypoint_name="JFK Airport",
)

print(f"Zone: {status.zone}")
print(f"Distance: {status.distance_km:.1f} km")
print(f"ETA: {status.eta_minutes} min")
print(f"Notify: {status.should_notify}")
print(f"Message: {status.notification_message}")
```

### Check Tool Optimization
```python
from agent.tool_optimizer import ToolOptimizer
from datetime import datetime, timezone, timedelta

# Fresh data (5 min old)
monitoring_data = {
    "weather": {
        "temp": 72,
        "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat(),
    },
}

optimizer = ToolOptimizer(monitoring_data)
should_skip, cached = optimizer.should_skip_tool_call("get_weather", "weather")

print(f"Skip tool call: {should_skip}")
print(f"Cached data: {cached}")
```

### Check Error Handling
```python
from agent.error_handler import handle_error

error = Exception("503 Service Unavailable")
friendly = handle_error(error, operation="flight search", service="Amadeus")

print(friendly.message)
print("Suggestions:")
for s in friendly.suggestions:
    print(f"  - {s}")
```

---

## 📊 Monitoring

### Key Endpoints to Monitor

1. **Health Check**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Journey Status**
   ```bash
   curl http://localhost:8000/api/ai/journey/{journey_id}
   ```

3. **Monitoring Status**
   ```bash
   curl http://localhost:8000/api/ai/journey/{journey_id}/monitor/status
   ```

### Metrics to Track

```javascript
// Add to your monitoring dashboard
const metrics = {
  // Context resolution
  pronounResolutionRate: 0.95,  // Target: > 95%
  implicitIntentDetectionRate: 0.85,  // Target: > 80%
  
  // Performance
  avgResponseTime: 245,  // ms, Target: < 300ms
  p95ResponseTime: 380,  // ms, Target: < 500ms
  toolCallCacheHitRate: 0.62,  // Target: > 60%
  
  // Reliability
  errorRecoveryRate: 0.88,  // Target: > 80%
  transitionSuccessRate: 0.99,  // Target: > 99%
  
  // Usage
  templateUsageRate: 0.35,  // Target: > 30% for repeat users
  calendarExportRate: 0.45,  // Target: > 40%
};
```

---

## 🚀 Performance Tips

### 1. Enable Tool Call Batching
Already enabled by default in `tool_optimizer.py`.

### 2. Use Monitoring Data
Agents automatically prefer cached monitoring data over tool calls.

### 3. Enable Predictive Preloading
Already running as background task in `main.py`.

### 4. Optimize WebSocket Connections
```javascript
// Reuse WebSocket connection
const ws = new WebSocket('ws://localhost:8000/ws');

// Don't create new connection for each journey
// Instead, subscribe to journey-specific events
ws.send(JSON.stringify({
  type: 'subscribe',
  journey_id: journeyId,
}));
```

---

## 🔐 Security Considerations

### 1. Location Privacy
- Only track location when journey is active
- Stop tracking when journey completes
- Don't store historical location data

```javascript
// Stop tracking on journey complete
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'journey_completed') {
    stopLocationTracking(watchId);
  }
};
```

### 2. Template Privacy
- Templates are user-specific (filtered by user_id)
- No sharing between users (unless explicitly added)

### 3. Calendar Export
- iCal files contain journey data
- Don't include sensitive information in event descriptions
- Consider adding password protection for shared calendars

---

## 📝 Common Issues

### Issue 1: "Context resolution not working"
**Solution:** Ensure conversation history is being passed correctly.
```javascript
// Make sure conversation_id is consistent
await sendMessage("search flights", { conversation_id: convId });
await sendMessage("book it", { conversation_id: convId }); // Same ID
```

### Issue 2: "Location notifications not appearing"
**Solution:** Check that waypoint coordinates are set in journey context.
```python
# Set waypoint coordinates when booking flight
state_manager.update_context(journey_id, {
    "departure_airport_lat": 40.6413,
    "departure_airport_lon": -73.7781,
})
```

### Issue 3: "Timeline not recalculating"
**Solution:** Ensure monitoring is active for the journey.
```bash
curl -X POST http://localhost:8000/api/ai/journey/{journey_id}/monitor/start
```

### Issue 4: "Templates not showing"
**Solution:** Create MongoDB index for templates collection.
```javascript
db.journey_templates.createIndex({ user_id: 1, last_used: -1 });
```

---

## 🎓 Best Practices

### 1. Always Check Safety Alerts
```javascript
// Before showing destination suggestions
const alerts = await checkSafety(country, city);
if (alerts.has_critical) {
  // Don't show this destination
  return;
}
```

### 2. Use Comparison for 3+ Options
```javascript
// When showing multiple flights
if (flights.length >= 3) {
  const comparison = await compareFlights(flights);
  showComparisonView(comparison);
} else {
  showSimpleList(flights);
}
```

### 3. Enable Location Tracking Early
```javascript
// Start tracking as soon as journey enters home_to_airport
if (journey.current_segment === 'home_to_airport') {
  startLocationTracking(journey.journey_id);
}
```

### 4. Show What-If for Important Decisions
```javascript
// When user is about to book expensive flight
if (flight.price > 500) {
  showWhatIfButton("What if I take a cheaper option?");
}
```

### 5. Suggest Templates for Repeat Routes
```javascript
// Check if user has traveled this route before
const templates = await loadTemplates(userId);
const matchingTemplate = templates.find(
  t => t.origin === origin && t.destination === destination
);

if (matchingTemplate) {
  showTemplatePrompt(matchingTemplate);
}
```

---

## ✅ Checklist for Production

- [ ] MongoDB indexes created for `journey_templates`
- [ ] WebSocket connection pooling configured
- [ ] Location tracking permissions requested from users
- [ ] Error monitoring dashboard setup
- [ ] Load testing completed (1000+ journeys)
- [ ] Chaos tests passing
- [ ] API rate limits configured
- [ ] Logging configured for all new modules
- [ ] Frontend integrated with new endpoints
- [ ] User documentation updated

---

## 📚 Additional Resources

- **API Documentation:** `API_ENHANCEMENTS.md`
- **Implementation Details:** `IMPLEMENTATION_SUMMARY.md`
- **Trigger Rules:** `TRIGGER_RULES_SEGMENTS_PHASES.md`
- **Performance Guide:** `PERFORMANCE_USAGE_GUIDE.md`

---

## 🎉 You're Ready!

All improvements are implemented and ready to use. Start the server and begin testing:

```bash
cd ndit-umoja-all-apps/ai
uvicorn server.main:app --reload --port 8000
```

Then open your frontend and try:
- "Show me flights to Paris" → "Book it"
- "I'm at the airport"
- "Running late"
- "What if I leave 30 minutes later?"
- "Save this as a template"
- "Export to calendar"

Enjoy your enhanced AI travel experience! 🚀
