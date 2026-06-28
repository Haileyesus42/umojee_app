/**
 * Phase 7 Components Demo
 *
 * This file demonstrates how to use the Phase 7 foundation components
 * with mock data. Use this for testing and development.
 *
 * To use: Import this component into MobileChatPage or create a test route
 */

import React, { useState } from "react";
import ConfidenceBadge from "../components/ConfidenceBadge";
import RiskIndicator from "../components/RiskIndicator";
import TimelineReliability from "../components/TimelineReliability";
import ComparisonView from "../components/ComparisonView";
import JourneyTimelineDemo from "./JourneyTimelineDemo";
import ComparisonModal from "../modals/ComparisonModal";
import TripArchiveDemo from "./TripArchiveDemo";
import CalmNotificationToast from "../components/CalmNotificationToast";
import NotificationBanner from "../components/NotificationBanner";
import toast from "react-hot-toast";
import type { ComparisonItem, ReliabilityFactor, BannerConfig } from "../types/phase7";

const Phase7Demo: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<"confidence" | "risk" | "reliability" | "comparison" | "timeline" | "archive" | "notifications">("notifications");
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [demoBanners, setDemoBanners] = useState<BannerConfig[]>([
    {
      id: "demo_info",
      priority: "info",
      title: "System Maintenance",
      message: "We'll be performing scheduled maintenance tonight at 2 AM EST.",
      actionLabel: "Learn More",
    },
    {
      id: "demo_reminder",
      priority: "reminder",
      title: "Unsaved Changes",
      message: "You have unsaved changes in your itinerary for Paris.",
    },
    {
      id: "demo_action",
      priority: "action_required",
      title: "Passport Required",
      message: "Please upload a copy of your passport to confirm your international flight.",
      actionLabel: "Upload Now",
    }
  ]);

  // Mock data
  const mockComparisonItems: ComparisonItem[] = [
    {
      id: "dest_1",
      type: "destination",
      name: "Paris, France",
      imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400",
      price: 1200,
      currency: "USD",
      matchConfidence: 95,
      pros: [
        "Rich cultural heritage and museums",
        "World-class cuisine and cafes",
        "Excellent public transportation",
        "Romantic atmosphere"
      ],
      cons: [
        "Higher cost compared to other cities",
        "Can be crowded in summer months",
        "Language barrier for non-French speakers"
      ],
      metadata: {
        averageTemperature: "22°C",
        flightDuration: "7h",
        activitiesCount: 45
      }
    },
    {
      id: "dest_2",
      type: "destination",
      name: "Tokyo, Japan",
      imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400",
      price: 1500,
      currency: "USD",
      matchConfidence: 92,
      pros: [
        "Unique blend of tradition and modernity",
        "Exceptional food scene",
        "Safe and clean city",
        "Efficient train system"
      ],
      cons: [
        "Longer flight duration",
        "Higher accommodation costs",
        "Potential language barrier"
      ],
      metadata: {
        averageTemperature: "25°C",
        flightDuration: "14h",
        activitiesCount: 78
      }
    },
    {
      id: "dest_3",
      type: "destination",
      name: "Barcelona, Spain",
      imageUrl: "https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=400",
      price: 950,
      currency: "USD",
      matchConfidence: 88,
      pros: [
        "Beautiful architecture and beaches",
        "Vibrant nightlife",
        "More affordable than Paris",
        "Mediterranean climate"
      ],
      cons: [
        "Tourist crowds at popular sites",
        "Pickpocketing concerns in some areas",
        "Less English spoken than expected"
      ],
      metadata: {
        averageTemperature: "24°C",
        flightDuration: "8h",
        activitiesCount: 52
      }
    }
  ];

  const mockReliabilityFactors: ReliabilityFactor[] = [
    {
      label: "Booking lead time",
      impact: "positive",
      description: "60 days ahead is optimal for pricing and availability"
    },
    {
      label: "Seasonal demand",
      impact: "negative",
      description: "Peak summer season increases prices by 20-30%"
    },
    {
      label: "Confirmed bookings",
      impact: "positive",
      description: "40% of journey already confirmed"
    },
    {
      label: "Currency exchange rate",
      impact: "neutral",
      description: "USD/EUR rate is stable within expected range"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">Phase 7 Components Demo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Interactive demonstration of the new journey orchestration components
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar rounded-xl border border-border bg-card p-2">
          {(["confidence", "risk", "reliability", "comparison", "timeline", "archive", "notifications"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${selectedTab === tab
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Confidence Badges */}
          {selectedTab === "confidence" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Confidence Badge - Minimal Variant</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <ConfidenceBadge score={95} variant="minimal" />
                    <span className="text-sm text-muted-foreground">95% (High confidence)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ConfidenceBadge score={75} variant="minimal" />
                    <span className="text-sm text-muted-foreground">75% (Good confidence)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ConfidenceBadge score={55} variant="minimal" />
                    <span className="text-sm text-muted-foreground">55% (Moderate confidence)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ConfidenceBadge score={35} variant="minimal" />
                    <span className="text-sm text-muted-foreground">35% (Low confidence)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Confidence Badge - Pill Variant</h2>
                <div className="flex flex-wrap gap-3">
                  <ConfidenceBadge score={95} variant="pill" />
                  <ConfidenceBadge score={85} variant="pill" showIcon />
                  <ConfidenceBadge score={65} variant="pill" label="Match" />
                  <ConfidenceBadge score={45} variant="pill" label="Fit" showIcon />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Confidence Badge - Detailed Variant</h2>
                <div className="space-y-6">
                  <ConfidenceBadge score={92} variant="detailed" label="Destination Match" />
                  <ConfidenceBadge score={78} variant="detailed" label="Budget Alignment" />
                  <ConfidenceBadge score={55} variant="detailed" label="Timing Feasibility" />
                </div>
              </div>
            </div>
          )}

          {/* Risk Indicators */}
          {selectedTab === "risk" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Risk Indicator - Full Variant</h2>
                <div className="space-y-4">
                  <RiskIndicator
                    level="on_track"
                    message="Your journey is on schedule"
                    details={[
                      "All bookings confirmed",
                      "No weather alerts for travel dates",
                      "Transportation options readily available"
                    ]}
                  />

                  <RiskIndicator
                    level="watch"
                    message="One segment needs attention"
                    details={[
                      "Flight prices increasing for Rome → Athens segment",
                      "Hotel in Istanbul showing limited availability",
                      "Consider booking within 7 days to lock in rates"
                    ]}
                  />

                  <RiskIndicator
                    level="action_needed"
                    message="Immediate action required"
                    details={[
                      "Train tickets for overnight sleeper car selling out fast",
                      "Travel insurance deadline approaching",
                      "Visa processing time may be tight for departure date"
                    ]}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Risk Indicator - Compact Variant</h2>
                <div className="flex gap-3">
                  <RiskIndicator
                    level="on_track"
                    message="Everything is on track"
                    compact
                  />
                  <RiskIndicator
                    level="watch"
                    message="Monitor situation"
                    compact
                  />
                  <RiskIndicator
                    level="action_needed"
                    message="Action required"
                    compact
                  />
                </div>
              </div>
            </div>
          )}

          {/* Timeline Reliability */}
          {selectedTab === "reliability" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Timeline Reliability Indicators</h2>
                <div className="space-y-6">
                  <TimelineReliability
                    reliability={92}
                    factors={mockReliabilityFactors}
                  />

                  <TimelineReliability
                    reliability={75}
                    factors={mockReliabilityFactors.slice(0, 2)}
                  />

                  <TimelineReliability
                    reliability={58}
                    factors={mockReliabilityFactors.slice(1, 3)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Comparison View */}
          {selectedTab === "comparison" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Comparison View - Inline</h2>
                <ComparisonView
                  items={mockComparisonItems}
                  comparisonType="destination"
                  onExpandToModal={() => setComparisonModalOpen(true)}
                />
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Individual Comparison Cards</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {mockComparisonItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-card p-4 shadow-sm"
                    >
                      {item.imageUrl && (
                        <div className="relative mb-3 h-32 w-full overflow-hidden rounded-lg">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute right-2 top-2">
                            <ConfidenceBadge score={item.matchConfidence!} variant="pill" />
                          </div>
                        </div>
                      )}
                      <h3 className="mb-2 font-semibold text-foreground">{item.name}</h3>
                      <p className="text-sm font-medium text-primary">
                        {item.price} {item.currency}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Journey Timeline */}
          {selectedTab === "timeline" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Journey Timeline Demo</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Complete journey timeline with progress tracking, milestones, and interactive components.
                </p>
                <JourneyTimelineDemo />
              </div>
            </div>
          )}

          {/* Trip Archive */}
          {selectedTab === "archive" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Trip Archive Demo</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Archive system for viewing past trips with statistics, search, and filtering.
                </p>
                <TripArchiveDemo />
              </div>
            </div>
          )}

          {/* Notifications */}
          {selectedTab === "notifications" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Calm Notification Toasts</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Minimalist, reassuring toasts that provide feedback without being aggressive.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => {
                      toast.custom((t) => (
                        <CalmNotificationToast
                          t={t}
                          priority="info"
                          title="Search Saved"
                          message="Your Paris search has been saved to your profile."
                        />
                      ));
                    }}
                    className="rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-500/20"
                  >
                    Trigger Info Toast
                  </button>
                  <button
                    onClick={() => {
                      toast.custom((t) => (
                        <CalmNotificationToast
                          t={t}
                          priority="reminder"
                          title="Price Drop"
                          message="A flight you're watching just dropped by $50!"
                          actionLabel="View Flight"
                          onAction={() => console.log('Action clicked')}
                        />
                      ));
                    }}
                    className="rounded-lg bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-500/20"
                  >
                    Trigger Reminder Toast
                  </button>
                  <button
                    onClick={() => {
                      toast.custom((t) => (
                        <CalmNotificationToast
                          t={t}
                          priority="action_required"
                          title="Verify Identity"
                          message="Please complete verification to proceed with booking."
                          actionLabel="Verify"
                          onAction={() => console.log('Action clicked')}
                        />
                      ));
                    }}
                    className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/20"
                  >
                    Trigger Action Toast
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Notification Banners</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Persistent messages for critical system updates or required user actions.
                </p>
                <div className="space-y-4">
                  {demoBanners.length > 0 ? (
                    demoBanners.map((banner) => (
                      <NotificationBanner
                        key={banner.id}
                        banner={banner}
                        onDismiss={(id) => setDemoBanners(prev => prev.filter(b => b.id !== id))}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-xl">
                      <p className="text-sm text-muted-foreground">All banners dismissed.</p>
                      <button
                        onClick={() => setDemoBanners([
                          {
                            id: "demo_info_" + Date.now(),
                            priority: "info",
                            title: "Refreshed Banners",
                            message: "Demo banners have been reset for viewing.",
                          }
                        ])}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        Reset Demo Banners
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Implementation Status</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>✅ Week 1: Foundation components (ConfidenceBadge, RiskIndicator, TimelineReliability, ComparisonView)</p>
            <p>✅ Week 2: Comparison Modal (ComparisonModal with grid/table views and navigation)</p>
            <p>✅ Week 3: Journey Timeline (JourneyTimeline, SegmentIndicator, MilestoneTracker, TimelineDrawer)</p>
            <p>✅ Week 4: Archive System (TripArchive, TripCard, TripStats with search/filter/stats)</p>
            <p>✅ Week 5: Notifications (CalmNotificationToast, NotificationBanner, useMobileChat integration)</p>
            <p>⏳ Week 6: Polish & Testing (pending)</p>
          </div>
        </div>

        {/* Comparison Modal */}
        <ComparisonModal
          open={comparisonModalOpen}
          items={mockComparisonItems}
          comparisonType="destination"
          onClose={() => setComparisonModalOpen(false)}
          onSelect={(item) => {
            console.log('Selected item:', item);
            setComparisonModalOpen(false);
          }}
        />
      </div>
    </div>
  );
};

export default Phase7Demo;
