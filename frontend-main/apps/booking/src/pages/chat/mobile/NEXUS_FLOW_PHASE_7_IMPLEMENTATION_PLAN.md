# Phase 7 Frontend Implementation Plan: Nexus Flow Journey Orchestration

## Executive Summary

Implement Phase 7 UX enhancements for Nexus Flow mobile chat interface, adding:
- **Comparison Views** - Side-by-side destination/transport/activity comparisons
- **Confidence Indicators** - Visual match quality, timeline reliability, and risk assessments
- **Journey Timeline** - Interactive progress visualization with segment tracking
- **Trip Archive** - Browse past trips, plan similar journeys, preference learning
- **Calm Notifications** - Neutral, reassuring notification system

**Timeline**: 6 weeks
**Foundation**: Mobile-first React + TypeScript + Tailwind CSS
**Integration**: Extends existing modal wizard patterns and message parsing flow

---

## Current Architecture Summary

**Component Structure**:
- `MobileChatPage.tsx` - Main coordinator (manages modals, normalizes API responses)
- `useMobileChat.ts` - Custom hook (state management, API calls, message parsing)
- Modal system - Multi-step wizards (FlightModal, HotelModal, CarModal)
- Message parsing - Handles structured JSON with `apiResponseType` + `apiResponse`

**Styling Patterns**:
- Tailwind CSS with HSL color variables (primary, card, muted, border)
- Cards: `rounded-2xl border border-border bg-card shadow-sm`
- Transitions: `transition-all duration-300`
- Mobile-first responsive design (max-w-480px container)

**Data Flow**:
```
User Input → sendMessage() → API (/api/ai/respond) → parseAiPayload()
→ ChatMessage with apiResponseType → MessageBubble renders → Opens modals
```

---

## Phase 7 Implementation

### 1. NEW COMPONENTS TO CREATE

#### 1.1 Comparison Components

**Location**: `/client/src/pages/chat/mobile/`

- **`modals/ComparisonModal.tsx`** - Universal comparison modal
  - Props: `open`, `items: ComparisonItem[]`, `comparisonType`, `onClose`, `onSelect`
  - Features: Multi-step wizard, card grid ↔ table toggle, confidence indicators
  - Sub-components:
    - `modals/components/ComparisonCard.tsx` - Flip card (front: summary, back: pros/cons)
    - `modals/components/ComparisonTable.tsx` - Side-by-side attribute comparison
    - `modals/components/ComparisonToggle.tsx` - View switcher

- **`components/ComparisonView.tsx`** - Inline comparison (embedded in messages)
  - Props: `items`, `comparisonType`, `onExpandToModal`
  - Features: Horizontal scrollable cards, "Expand" button

#### 1.2 Confidence & Risk Indicators

- **`components/ConfidenceBadge.tsx`**
  - Props: `score: number (0-100)`, `label?`, `variant: 'minimal'|'detailed'|'pill'`, `showIcon?`
  - Color scale: 90-100 (emerald), 70-89 (primary), 50-69 (amber), 0-49 (muted)
  - Variants: Dot indicator, percentage bar, pill badge

- **`components/RiskIndicator.tsx`**
  - Props: `level: 'on_track'|'watch'|'action_needed'`, `message`, `details`, `compact?`
  - Design: Left-border accent, color-coded background, expandable details
  - Icons: checkmark (on_track), eye (watch), alert (action_needed)

- **`components/TimelineReliability.tsx`**
  - Props: `reliability: number`, `factors: {label, impact, description}[]`
  - Features: Circular progress, collapsible factor list

#### 1.3 Journey Timeline Components

- **`components/JourneyTimeline.tsx`** - Main timeline component
  - Props: `segments: TimelineSegment[]`, `currentSegmentId`, `orientation: 'horizontal'|'vertical'`, `interactive`, `onSegmentClick`
  - Features:
    - Horizontal: Scrollable with snap points (mobile default)
    - Vertical: Full-screen detailed view
    - Status icons, progress bars, confidence badges, connector lines
    - Current position: Pulsing animation

- **`components/SegmentIndicator.tsx`** - Compact progress indicator
  - Props: `totalSegments`, `currentSegment`, `segmentLabels?`, `variant: 'dots'|'progress'|'breadcrumb'`
  - Placement: Sticky header above messages

- **`components/MilestoneTracker.tsx`** - Milestone checklist
  - Props: `milestones: Milestone[]`, `showCompleted?`, `compact?`
  - Features: Checkbox completion, critical highlight, overdue warnings

#### 1.4 Archive Components

- **`components/TripArchiveView.tsx`** - Archive list/grid
  - Props: `trips: ArchivedTrip[]`, `onTripSelect`, `onPlanSimilar`, `viewMode: 'grid'|'list'`
  - Features: Grid/list toggle, search/filter, swipe actions

- **`modals/TripArchiveModal.tsx`** - Full archive modal
  - Multi-step: Browse → Trip Details → Plan Similar Confirmation
  - Integrates TripArchiveView with NavigationSteps pattern

- **`components/PreferenceLearningCard.tsx`** - Learned preferences display
  - Props: `insights: {category, preference, confidence, basedOn}[]`, `onApplyInsights`
  - Shows AI-learned preferences from past trips

#### 1.5 Notification Components

- **`components/CalmNotificationToast.tsx`** - Calm notification toast
  - Props: `priority: 'info'|'reminder'|'action_required'`, `title`, `message`, `actionLabel`, `onAction`, `autoDismiss`
  - Design: Soft colors, gentle slide-in, no harsh red backgrounds
  - Integration: react-hot-toast

- **`components/NotificationBanner.tsx`** - Persistent banner
  - Props: `variant`, `message`, `dismissible`, `actions`
  - Placement: Below header, above messages

---

### 2. FILES TO MODIFY

#### 2.1 MobileChatPage.tsx

**Add modal states**:
```typescript
const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
const [comparisonModalData, setComparisonModalData] = useState<ComparisonItem[]>([]);
const [timelineModalOpen, setTimelineModalOpen] = useState(false);
const [archiveModalOpen, setArchiveModalOpen] = useState(false);
```

**Add normalizer functions**:
```typescript
const normalizeComparisons = (apiResponse: any): ComparisonItem[] => { ... };
const normalizeTimeline = (apiResponse: any): TimelineData => { ... };
```

**Extend handleOpenPopup**:
```typescript
if (target.apiResponseType === "comparison_list") {
  setComparisonModalData(normalizeComparisons(target.apiResponse));
  setComparisonModalOpen(true);
}
else if (target.apiResponseType === "journey_timeline") {
  // Handle timeline modal
}
```

**Render new modals**:
```tsx
<ComparisonModal open={comparisonModalOpen} items={comparisonModalData} ... />
<TripArchiveModal open={archiveModalOpen} ... />
```

#### 2.2 MessageBubble.tsx

**Add inline rendering for new message types**:
```tsx
{message.apiResponseType === "comparison_list" && (
  <ComparisonView
    items={message.apiResponse.items}
    onExpandToModal={() => handleOpenPopup(message.id)}
  />
)}

{message.apiResponseType === "journey_timeline" && (
  <JourneyTimeline
    segments={message.apiResponse.segments}
    currentSegmentId={message.apiResponse.currentSegment}
    orientation="horizontal"
    interactive={false}
  />
)}

{message.apiResponseType === "risk_assessment" && (
  <RiskIndicator
    level={message.apiResponse.level}
    message={message.apiResponse.message}
    details={message.apiResponse.details}
  />
)}
```

#### 2.3 MobileSidebar.tsx

**Add archive button to footer** (line ~165):
```tsx
<div className="grid grid-cols-4 gap-2">
  <button onClick={onOpenFlightModal}>...</button>
  <button onClick={onOpenHotelModal}>...</button>
  <button onClick={onOpenCarModal}>...</button>

  {/* NEW: Archive button */}
  <button onClick={onOpenArchiveModal} aria-label="View archived trips">
    <ArchiveIcon />
  </button>
</div>
```

#### 2.4 useMobileChat.ts

**Extend parseAiPayload**:
```typescript
const parseAiPayload = (raw: string): ParsedAiPayload => {
  // ... existing code

  // Handle new response types
  if (candidate.api_response_type === "comparison_list") {
    return { ...parsed, apiResponse: normalizeComparisons(candidate.api_response) };
  }

  if (candidate.api_response_type === "journey_timeline") {
    return { ...parsed, apiResponse: normalizeTimeline(candidate.api_response) };
  }

  // ... return parsed
};
```

#### 2.5 Create New Hook: useJourneyState.ts

**Location**: `/client/src/pages/chat/mobile/hooks/useJourneyState.ts`

```typescript
export const useJourneyState = () => {
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [journeyTimeline, setJourneyTimeline] = useState<TimelineSegment[]>([]);
  const [archivedTrips, setArchivedTrips] = useState<ArchivedTrip[]>([]);

  const loadJourneyState = async (conversationId: string) => {
    // POST /api/journey/{journey_id}
  };

  const archiveJourney = async (journeyId: string) => {
    // POST /api/journey/{journey_id}/archive
  };

  const loadArchivedTrips = async () => {
    // GET /api/journey/archived
  };

  const planSimilarTrip = async (archiveId: string) => {
    // POST /api/journey/from-archive
  };

  return {
    activeJourney,
    journeyTimeline,
    archivedTrips,
    loadJourneyState,
    archiveJourney,
    loadArchivedTrips,
    planSimilarTrip,
  };
};
```

---

### 3. API CONTRACT REQUIREMENTS

Backend must support these new `apiResponseType` values:

#### 3.1 Comparison List Response
```json
{
  "ai_generated": "I've compared 3 destinations for you...",
  "api_response_type": "comparison_list",
  "api_response": {
    "comparison_type": "destination", // or "transport", "activity"
    "items": [
      {
        "id": "dest_1",
        "type": "destination",
        "name": "Paris",
        "imageUrl": "...",
        "price": 1200,
        "currency": "USD",
        "matchConfidence": 95,
        "pros": ["Rich culture", "Great food"],
        "cons": ["Expensive", "Crowded"],
        "metadata": {
          "averageTemperature": "22°C",
          "flightDuration": "7h",
          "activitiesCount": 45
        }
      }
    ]
  },
  "trigger_popup": true
}
```

#### 3.2 Journey Timeline Response
```json
{
  "ai_generated": "Here's your journey timeline...",
  "api_response_type": "journey_timeline",
  "api_response": {
    "journeyId": "journey_123",
    "currentSegment": "seg_2",
    "overallStatus": "on_track",
    "reliability": 82,
    "segments": [
      {
        "id": "seg_1",
        "type": "destination",
        "title": "Paris",
        "status": "completed",
        "startDate": "2025-06-01",
        "endDate": "2025-06-05",
        "confidence": 100,
        "metadata": { "hotelBooked": true }
      }
    ],
    "milestones": [
      {
        "id": "mile_1",
        "title": "Book Paris hotel",
        "dueDate": "2025-05-15",
        "completed": true,
        "critical": false
      }
    ],
    "reliabilityFactors": [
      {
        "label": "Booking lead time",
        "impact": "positive",
        "description": "60 days ahead is optimal"
      }
    ]
  }
}
```

#### 3.3 Risk Assessment Response
```json
{
  "ai_generated": "Your timeline is mostly on track...",
  "api_response_type": "risk_assessment",
  "api_response": {
    "level": "watch", // or "on_track", "action_needed"
    "message": "One segment needs attention",
    "details": [
      "Flight prices increasing for Rome → Athens",
      "Hotel in Istanbul has limited availability"
    ],
    "reliability": 82
  }
}
```

#### 3.4 Archived Trips Response
```json
{
  "ai_generated": "I found 5 of your past trips...",
  "api_response_type": "archived_trips",
  "api_response": {
    "trips": [
      {
        "id": "trip_123",
        "title": "Summer in Paris",
        "destination": "Paris, France",
        "startDate": "2024-06-15",
        "endDate": "2024-06-22",
        "status": "completed",
        "totalCost": 3200,
        "currency": "USD",
        "thumbnailUrl": "...",
        "metadata": {
          "segments": 4,
          "travelers": 3,
          "preferences": ["4-star hotels", "cultural activities"]
        }
      }
    ]
  },
  "trigger_popup": true
}
```

#### 3.5 Required Backend Endpoints

```
GET  /api/journey/{journey_id}           - Get journey state
POST /api/journey/{journey_id}/archive   - Archive journey
GET  /api/journey/archived               - Get archived trips
POST /api/journey/from-archive           - Create journey from archive
```

---

### 4. STYLING GUIDELINES

**Color System**:
```typescript
// Confidence colors
const confidenceColors = {
  high: 'bg-emerald-500 text-white',       // 90-100
  good: 'bg-primary text-primary-foreground', // 70-89
  moderate: 'bg-amber-400 text-black',     // 50-69
  low: 'bg-muted text-muted-foreground'    // 0-49
};

// Risk colors
const riskColors = {
  on_track: 'border-l-4 border-emerald-500 bg-emerald-500/10',
  watch: 'border-l-4 border-amber-500 bg-amber-500/10',
  action_needed: 'border-l-4 border-torch-red-500 bg-torch-red-500/10'
};

// Timeline status
const timelineStatusColors = {
  completed: 'bg-emerald-500',
  in_progress: 'bg-primary animate-pulse',
  pending: 'bg-muted',
  blocked: 'bg-torch-red-500'
};
```

**Animation Patterns**:
```css
/* Timeline current position pulse */
@keyframes pulse-slow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

/* Comparison card flip */
.comparison-card.flipped {
  transform: rotateY(180deg);
  transition: transform 0.6s;
}

/* Calm notification slide */
@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

---

### 5. IMPLEMENTATION SEQUENCE

**Week 1: Foundation**
- Create ConfidenceBadge, RiskIndicator, TimelineReliability components
- Update MessageBubble to render new apiResponseType values
- Implement normalizer functions in MobileChatPage
- Add localStorage keys for preferences

**Week 2: Comparison System**
- Create ComparisonCard, ComparisonView, ComparisonModal
- Build ComparisonTable and ComparisonToggle sub-components
- Integrate with message flow (trigger_popup logic)
- Test comparison modal with mock data

**Week 3: Journey Timeline**
- Create JourneyTimeline (horizontal + vertical layouts)
- Build SegmentIndicator and MilestoneTracker
- Implement useJourneyState hook
- Add timeline rendering in MessageBubble
- Create optional TimelineDrawer for full-screen view

**Week 4: Archive System**
- Create TripArchiveView (grid + list modes)
- Build TripArchiveModal with NavigationSteps
- Implement PreferenceLearningCard
- Add archive button to MobileSidebar
- Wire up "plan similar trip" flow

**Week 5: Notifications**
- Create CalmNotificationToast component
- Build NotificationBanner for persistent alerts
- Integrate react-hot-toast
- Add notification preferences to localStorage
- Implement calm messaging tone guidelines

**Week 6: Polish & Testing**
- Add loading skeletons for all components
- Implement error states and empty states
- Add ARIA labels and keyboard navigation
- Performance optimization (memoization, lazy loading)
- Responsive design testing (320px-768px)
- User acceptance testing

---

### 6. TECHNICAL CONSIDERATIONS

#### 6.1 Performance
- **Virtualization**: Use `@tanstack/react-virtual` for timelines with 50+ segments
- **Image lazy loading**: `loading="lazy"` on all comparison/archive images
- **Memoization**: `useMemo` for expensive sorts/calculations

#### 6.2 Responsive Design
- **Mobile-first**: Base styles for 320px+, progressive enhancement
- **Breakpoints**: sm (640px), md (768px), lg (1024px)
- **Touch-friendly**: 44x44px minimum touch targets
- **Auto-orientation**: Timeline switches from vertical to horizontal on mobile

#### 6.3 Accessibility
- **ARIA labels**: All interactive elements
- **Keyboard nav**: Tab, Enter, Escape, Arrow keys
- **Screen readers**: sr-only text for context
- **Focus management**: Trap focus in modals

#### 6.4 Error Handling
- **Loading skeletons**: Animate-pulse placeholders
- **Error boundaries**: Catch component errors
- **Empty states**: Friendly "no data" messages
- **Retry logic**: User-initiated retry buttons

---

### 7. VERIFICATION & TESTING

#### Unit Tests (Jest + React Testing Library)
```typescript
// ConfidenceBadge.test.tsx
it('renders high confidence with emerald color', () => {
  render(<ConfidenceBadge score={95} />);
  expect(screen.getByRole('status')).toHaveClass('bg-emerald-500');
});

// ComparisonModal.test.tsx
it('toggles between grid and table view', () => {
  render(<ComparisonModal items={mockItems} />);
  fireEvent.click(screen.getByText('Table'));
  expect(screen.getByRole('table')).toBeInTheDocument();
});
```

#### Integration Tests
- Comparison modal: Open → Select item → Triggers correct action
- Timeline: Renders segments → Click segment → Expands details
- Archive: Browse trips → Plan similar → Creates new conversation

#### E2E Tests (Cypress)
```typescript
it('displays timeline when AI sends journey_timeline message', () => {
  cy.visit('/chat/mobile/test-conversation');
  cy.get('[data-testid="timeline-segment"]').should('have.length', 4);
  cy.get('[data-testid="current-segment"]').should('contain', 'Rome');
});
```

#### Manual Testing Checklist
- [ ] All modals open/close correctly
- [ ] Confidence badges display correct colors
- [ ] Timeline scrolls smoothly with snap points
- [ ] Archive search/filter works
- [ ] "Plan similar trip" creates new conversation
- [ ] Notifications auto-dismiss after timeout
- [ ] Mobile responsive (test on iPhone SE, iPhone 14, Pixel 7)
- [ ] Dark mode compatibility (if applicable)
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces components correctly

---

### 8. CRITICAL FILES

**Primary Files to Modify**:
1. [MobileChatPage.tsx](./MobileChatPage.tsx) - Main integration point
2. [components/MessageBubble.tsx](./components/MessageBubble.tsx) - Inline rendering
3. [hooks/useMobileChat.ts](./hooks/useMobileChat.ts) - Message parsing
4. [components/MobileSidebar.tsx](./components/MobileSidebar.tsx) - Archive button

**Reference Patterns**:
5. [modals/FlightModal.tsx](./modals/FlightModal.tsx) - Multi-step wizard pattern
6. [modals/components/NavigationSteps.tsx](./modals/components/NavigationSteps.tsx) - Step indicator pattern

---

## Success Criteria

- ✅ All 5 feature categories implemented (comparison, confidence, timeline, archive, notifications)
- ✅ New `apiResponseType` values handled correctly
- ✅ Modals follow existing wizard patterns
- ✅ Styling consistent with existing components
- ✅ Mobile-first responsive design works 320px-768px
- ✅ Accessibility score 90+ (Lighthouse)
- ✅ Performance: Timeline renders 50+ segments smoothly
- ✅ All tests pass (unit, integration, E2E)
- ✅ Zero breaking changes to existing functionality

---

## Next Steps

1. **Backend Coordination**: Confirm API contract with backend team
2. **Component Library Setup**: Create base components (ConfidenceBadge, RiskIndicator)
3. **Phased Development**: Follow 6-week implementation sequence
4. **Continuous Testing**: Test each component as built
5. **User Feedback**: Gather feedback after each phase

---

## TypeScript Interfaces

```typescript
// Core types for Phase 7
type ComparisonItem = {
  id: string;
  type: 'destination' | 'transport' | 'activity';
  name: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  matchConfidence?: number;
  pros: string[];
  cons: string[];
  metadata: Record<string, any>;
};

type TimelineSegment = {
  id: string;
  type: 'destination' | 'transport' | 'activity' | 'accommodation';
  title: string;
  subtitle?: string;
  status: 'completed' | 'in_progress' | 'pending' | 'blocked';
  startDate?: string;
  endDate?: string;
  confidence?: number;
  icon?: string;
  metadata?: Record<string, any>;
};

type Milestone = {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  completed: boolean;
  critical?: boolean;
};

type ArchivedTrip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  thumbnailUrl?: string;
  status: 'completed' | 'cancelled' | 'archived';
  totalCost?: number;
  currency?: string;
  metadata: {
    segments: number;
    travelers: number;
    preferences: string[];
  };
};

type RiskLevel = 'on_track' | 'watch' | 'action_needed';

type NotificationPriority = 'info' | 'reminder' | 'action_required';
```

---

This plan provides a comprehensive, actionable roadmap for implementing Phase 7 frontend features while maintaining consistency with the existing Nexus Flow mobile chat architecture.