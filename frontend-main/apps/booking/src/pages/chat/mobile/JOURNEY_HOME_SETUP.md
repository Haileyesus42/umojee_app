# Journey Home Page - Setup Guide

## 🎯 Overview

The Journey Home Page is a modern, professional dashboard that serves as the default landing page for the Nexus Flow mobile experience. It provides:

- **Journey Status Dashboard** - Real-time overview of active travel journeys
- **Timeline Visualization** - Interactive progress tracking across journey segments
- **Risk Indicators** - Confidence scores and reliability metrics
- **Quick Actions** - Fast access to bookings, destinations, and archived trips
- **Floating Chat Button** - Instant AI assistant access
- **Smooth Transitions** - Slide animations between dashboard and chat

---

## 📁 Files Created

### 1. **JourneyHomePage.tsx** (Main Dashboard)
Location: `/client/src/pages/chat/mobile/JourneyHomePage.tsx`

**Features:**
- Mobile-first responsive design (max-width: 480px)
- Glassmorphic cards with gradient backgrounds
- Animated components using Framer Motion
- Integration with Phase 7 journey orchestration components
- Real-time journey status and progress tracking
- Quick action grid for common tasks
- Recent activity timeline
- Call-to-action for chat engagement

**Props:**
```typescript
interface JourneyHomePageProps {
  onOpenChat: () => void;     // Callback to open chat interface
  userId?: string;              // Optional user ID for personalization
}
```

### 2. **FloatingChatButton.tsx** (FAB Component)
Location: `/client/src/pages/chat/mobile/components/FloatingChatButton.tsx`

**Features:**
- Floating action button with pulse animation
- Unread message badge indicator
- Smooth hover effects and tooltips
- Icon rotation animation (MessageCircle ↔ X)
- Position: Fixed bottom-right (24px from edges)

**Props:**
```typescript
interface FloatingChatButtonProps {
  onClick: () => void;          // Callback when button clicked
  unreadCount?: number;         // Number of unread messages (shows badge)
  isOpen?: boolean;             // Whether chat is currently open
}
```

### 3. **MobileAppContainer.tsx** (State Manager)
Location: `/client/src/pages/chat/mobile/MobileAppContainer.tsx`

**Features:**
- Manages view state between home and chat
- Smooth slide transitions using AnimatePresence
- "Back to Journey" button overlay on chat view
- Persistent chat state across transitions

**Props:**
```typescript
interface MobileAppContainerProps {
  userId?: string;              // User ID for personalization
  userName?: string;            // User name for greetings
}
```

---

## 🚀 Usage

### Option 1: Direct Route Access

Navigate to `/journey` in your application:
```
http://localhost:28285/journey
```

### Option 2: Programmatic Navigation

```typescript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  const goToJourneyHome = () => {
    navigate('/journey');
  };

  return <button onClick={goToJourneyHome}>View Journey</button>;
}
```

### Option 3: Replace Default Mobile Chat Route

If you want this as the default mobile experience, update `route.ts`:

```typescript
{
  path: "/chat/mobile",
  title: "Journey | Umoja Airline",
  component: MobileAppContainer,  // Changed from MobileChatPage
},
```

---

## 🎨 Design Features

### Color System
- **Primary Gradient**: `from-primary/5 via-card to-card`
- **Glassmorphism**: `backdrop-blur-xl bg-background/80`
- **Status Colors**:
  - Emerald: Positive indicators, completions
  - Blue: Informational, bookings
  - Orange: Warnings, reminders
  - Red: Critical alerts, actions needed
  - Purple: Archive, historical data

### Animation Timings
- **Page Load**: Staggered animations (0.1s - 0.6s delays)
- **Transitions**: Spring physics (stiffness: 300, damping: 30)
- **Button Tap**: Scale down to 0.95
- **FAB Pulse**: 2s infinite loop

### Responsive Breakpoints
- **Mobile Base**: 320px minimum
- **Container Max**: 480px (consistent with chat)
- **Touch Targets**: Minimum 44px × 44px

---

## 🔧 Customization

### Updating Journey Data

The dashboard uses mock data by default. To connect real data:

```typescript
// In JourneyHomePage.tsx

// Replace mock data with API calls
const { data: activeJourney } = useQuery('active-journey', fetchActiveJourney);
const { data: segments } = useQuery('timeline-segments', fetchSegments);

// Or use context/Redux
const activeJourney = useSelector((state) => state.journey.active);
```

### Adding Custom Quick Actions

```typescript
const quickActions = [
  {
    icon: YourIcon,
    label: "Custom Action",
    count: 5,
    color: "text-indigo-600 bg-indigo-50",
    onClick: () => handleCustomAction()
  },
  // ... existing actions
];
```

### Modifying Notifications

```typescript
const [notifications, setNotifications] = useState<BannerConfig[]>([
  {
    id: "custom_notif",
    priority: "info",  // or "reminder", "action_required"
    title: "Your Title",
    message: "Your message here",
    actionLabel: "Action Text",
    onAction: () => console.log('Action clicked'),
  }
]);
```

---

## 🎯 User Flow

```
┌─────────────────────────────┐
│   User Opens App            │
└─────────────────────────────┘
              ↓
┌─────────────────────────────┐
│  Journey Home Page          │
│  - View journey status      │
│  - See timeline progress    │
│  - Check risk indicators    │
│  - Access quick actions     │
└─────────────────────────────┘
              ↓
        [User clicks FAB]
              ↓
┌─────────────────────────────┐
│  Chat Interface Slides In   │
│  - Full MobileChatPage      │
│  - "Back to Journey" button │
│  - Persistent chat history  │
└─────────────────────────────┘
              ↓
      [User clicks "Back"]
              ↓
┌─────────────────────────────┐
│  Journey Home Page          │
│  (State restored)           │
└─────────────────────────────┘
```

---

## 📊 Component Integrations

### Phase 7 Components Used

1. **ConfidenceBadge** - Journey match score (88%)
2. **RiskIndicator** - Status alerts ("watch" level)
3. **TimelineReliability** - Reliability score with factors
4. **JourneyTimeline** - Horizontal timeline with segments
5. **NotificationBanner** - Dismissible alerts

### Future Enhancements

- [ ] Connect to real-time WebSocket for live updates
- [ ] Add pull-to-refresh gesture
- [ ] Implement journey creation wizard
- [ ] Add photo gallery for destinations
- [ ] Include weather widgets per segment
- [ ] Social sharing for trip plans
- [ ] Offline mode support
- [ ] Dark mode optimization

---

## 🐛 Troubleshooting

### Issue: Animations not smooth
**Solution**: Ensure `framer-motion` is installed:
```bash
npm install framer-motion
```

### Issue: Icons not showing
**Solution**: Install `lucide-react`:
```bash
npm install lucide-react
```

### Issue: Styles not applying
**Solution**: Verify Tailwind CSS config includes the mobile chat path:
```javascript
// tailwind.config.js
content: [
  "./src/pages/chat/mobile/**/*.{js,ts,jsx,tsx}",
  // ... other paths
]
```

### Issue: Route not found
**Solution**: Ensure the route is registered in `route.ts` and the import path is correct.

---

## 📱 Mobile Testing

Test on multiple device sizes:

```bash
# iOS Safari (iPhone SE)
- Viewport: 375 × 667
- Test touch interactions

# Android Chrome (Pixel 7)
- Viewport: 412 × 915
- Test swipe gestures

# iPad Mini
- Viewport: 768 × 1024
- Verify responsive breakpoints
```

---

## 🎉 Next Steps

1. **Navigate to `/journey`** to see the new dashboard
2. **Click the floating chat button** to test transitions
3. **Customize mock data** with your journey information
4. **Connect to backend APIs** for real-time data
5. **Add authentication** for personalized journeys
6. **Enable WebSocket** for live updates

---

## 💡 Pro Tips

- Use the **Quick Actions grid** to provide shortcuts to common tasks
- The **Recent Activity feed** can display real-time events
- Customize the **CTA card** gradient to match your branding
- Add **skeleton loaders** during data fetching for better UX
- Implement **haptic feedback** on mobile devices for button taps

---

## 🔗 Related Documentation

- [Phase 7 Implementation Plan](./NEXUS_FLOW_PHASE_7_IMPLEMENTATION_PLAN.md)
- [Phase7Demo Component](./examples/Phase7Demo.tsx)
- [Journey Orchestration Architecture](../../../../NEXUS_FLOW_JOURNEY_DIAGRAM.md)

---

**Built with** ❤️ **for Nexus Flow Journey Orchestration**
