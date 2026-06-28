import React, { useState } from "react";
import JourneyTimeline from "../components/JourneyTimeline";
import SegmentIndicator from "../components/SegmentIndicator";
import MilestoneTracker from "../components/MilestoneTracker";
import TimelineDrawer from "../components/TimelineDrawer";
import type { TimelineData, Milestone } from "../types/phase7";

// Sample journey timeline data
const sampleTimelineData: TimelineData = {
  journeyId: "demo_journey_001",
  currentSegment: "flight_to_paris",
  overallStatus: "on_track",
  confidence: 87,
  segments: [
    {
      id: "flight_to_paris",
      type: "transport",
      title: "Flight to Paris",
      subtitle: "Air France AF 1234",
      status: "completed",
      startTime: "2024-01-15T08:30:00Z",
      endTime: "2024-01-15T14:45:00Z",
      duration: "8h 15m",
      departure: "JFK, New York",
      arrival: "CDG, Paris",
      description: "Direct flight with in-flight entertainment and meals included",
      confidence: 95,
      details: [
        "Business class seating",
        "WiFi available",
        "USB charging ports",
        "Entertainment system"
      ]
    },
    {
      id: "hotel_checkin",
      type: "accommodation",
      title: "Hotel Check-in",
      subtitle: "Le Meurice Paris",
      status: "in_progress",
      startTime: "2024-01-15T16:00:00Z",
      endTime: "2024-01-20T11:00:00Z",
      duration: "5 nights",
      departure: "Hotel Reception",
      description: "Luxury 5-star hotel in the heart of Paris",
      confidence: 92,
      details: [
        "Room with Eiffel Tower view",
        "Concierge service",
        "Spa access included",
        "Breakfast buffet"
      ]
    },
    {
      id: "louvre_visit",
      type: "activity",
      title: "Louvre Museum",
      subtitle: "Art & Culture",
      status: "pending",
      startTime: "2024-01-16T10:00:00Z",
      endTime: "2024-01-16T15:00:00Z",
      duration: "5 hours",
      departure: "Louvre Museum",
      description: "Explore the world's largest art museum",
      confidence: 88,
      details: [
        "Mona Lisa viewing",
        "Ancient artifacts",
        "Audio guide included",
        "Café on premises"
      ]
    },
    {
      id: "seine_cruise",
      type: "activity",
      title: "Seine River Cruise",
      subtitle: "Evening Cruise",
      status: "pending",
      startTime: "2024-01-17T19:30:00Z",
      endTime: "2024-01-17T21:30:00Z",
      duration: "2 hours",
      departure: "Pont Neuf",
      description: "Romantic evening cruise along the Seine",
      confidence: 85,
      details: [
        "Champagne included",
        "Live music",
        "City lights views",
        "Photo opportunities"
      ]
    },
    {
      id: "flight_home",
      type: "transport",
      title: "Flight Home",
      subtitle: "Air France AF 4321",
      status: "pending",
      startTime: "2024-01-20T13:30:00Z",
      endTime: "2024-01-20T19:45:00Z",
      duration: "8h 15m",
      departure: "CDG, Paris",
      arrival: "JFK, New York",
      description: "Return flight with premium economy seating",
      confidence: 90,
      details: [
        "Premium economy",
        "Extra legroom",
        "Priority boarding",
        "In-flight meals"
      ]
    }
  ],
  milestones: [
    {
      id: "booking_confirmed",
      title: "Flight & Hotel Booked",
      description: "All major bookings confirmed and paid",
      completed: true,
      critical: false
    },
    {
      id: "visa_check",
      title: "Visa Requirements",
      description: "Ensure passport and visa are valid",
      dueDate: "2024-01-10T00:00:00Z",
      completed: true,
      critical: true
    },
    {
      id: "louvre_tickets",
      title: "Louvre Museum Tickets",
      description: "Purchase skip-the-line tickets",
      dueDate: "2024-01-16T09:00:00Z",
      completed: false,
      critical: false
    },
    {
      id: "cruise_reservation",
      title: "Seine Cruise Booking",
      description: "Confirm evening cruise reservation",
      dueDate: "2024-01-17T18:00:00Z",
      completed: false,
      critical: false
    },
    {
      id: "packing_complete",
      title: "Packing Complete",
      description: "Pack luggage and check weight limits",
      dueDate: "2024-01-14T20:00:00Z",
      completed: false,
      critical: true
    }
  ]
};

const JourneyTimelineDemo: React.FC = () => {
  const [timelineDrawerOpen, setTimelineDrawerOpen] = useState(false);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);

  const handleSegmentClick = (segment: any) => {
    console.log('Segment clicked:', segment);
    setSelectedSegmentIndex(sampleTimelineData.segments.findIndex(s => s.id === segment.id));
    setTimelineDrawerOpen(true);
  };

  const handleMilestoneClick = (milestone: Milestone) => {
    console.log('Milestone clicked:', milestone);
  };

  return (
    <div className="max-w-md mx-auto bg-background p-4 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Journey Timeline Demo</h1>
        <p className="text-muted-foreground">Phase 7 Week 3: Journey Timeline Components</p>
      </div>

      {/* Main Journey Timeline */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Main Timeline</h2>
        <JourneyTimeline
          data={sampleTimelineData}
          onSegmentClick={handleSegmentClick}
          onExpandToDrawer={() => setTimelineDrawerOpen(true)}
        />
      </div>

      {/* Segment Indicator */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Segment Indicator</h2>
        <SegmentIndicator
          segments={sampleTimelineData.segments}
          currentSegmentId={sampleTimelineData.currentSegment}
          onSegmentClick={handleSegmentClick}
        />
      </div>

      {/* Milestone Tracker */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Milestone Tracker</h2>
        {sampleTimelineData.milestones && (
          <MilestoneTracker
            milestones={sampleTimelineData.milestones}
            onMilestoneClick={handleMilestoneClick}
          />
        )}
      </div>

      {/* Compact Segment Indicator */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Compact Indicator</h2>
        <SegmentIndicator
          segments={sampleTimelineData.segments}
          currentSegmentId={sampleTimelineData.currentSegment}
          onSegmentClick={handleSegmentClick}
          compact={true}
        />
      </div>

      {/* Timeline Drawer */}
      <TimelineDrawer
        timeline={sampleTimelineData}
        isOpen={timelineDrawerOpen}
        onClose={() => setTimelineDrawerOpen(false)}
        onSegmentClick={handleSegmentClick}
      />

      {/* Demo Info */}
      <div className="bg-muted rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-2">Demo Features</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Horizontal scrollable timeline with progress visualization</li>
          <li>• Interactive segment cards with status indicators</li>
          <li>• Milestone checklist with due dates and critical flags</li>
          <li>• Full-screen timeline drawer with detailed segment info</li>
          <li>• Mobile-optimized touch interactions</li>
          <li>• Confidence scores and reliability indicators</li>
        </ul>
      </div>
    </div>
  );
};

export default JourneyTimelineDemo;