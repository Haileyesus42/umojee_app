/**
 * Phase 7 Test Data Generator
 *
 * Generates mock ChatMessage objects to test Phase 7 features in the chat interface.
 * Use this to inject test messages into the chat for demonstration and testing.
 */

import type { ChatMessage } from "../hooks/useMobileChat";

export const generatePhase7TestMessages = (): ChatMessage[] => {
  const messages: ChatMessage[] = [];

  // 1. Comparison List Message
  messages.push({
    id: `test_comparison_${Date.now()}_1`,
    type: "ai",
    content: "I've analyzed your preferences and compared 3 amazing destinations for your summer trip. Paris leads with a 95% match based on your interests in culture, cuisine, and romantic atmosphere!",
    apiResponseType: "comparison_list",
    apiResponse: {
      comparison_type: "destination",
      items: [
        {
          id: "dest_paris_test",
          type: "destination",
          name: "Paris, France",
          imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop",
          price: 1200,
          currency: "USD",
          matchConfidence: 95,
          pros: [
            "Rich cultural heritage with world-class museums",
            "Exceptional cuisine and charming cafes",
            "Excellent public transportation",
            "Romantic atmosphere perfect for couples"
          ],
          cons: [
            "Higher cost compared to other European cities",
            "Can be very crowded during summer months",
            "Language barrier for non-French speakers"
          ],
          metadata: {
            averageTemperature: "22°C",
            flightDuration: "7h",
            activitiesCount: 45,
            safetyRating: 4.5
          }
        },
        {
          id: "dest_tokyo_test",
          type: "destination",
          name: "Tokyo, Japan",
          imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop",
          price: 1500,
          currency: "USD",
          matchConfidence: 92,
          pros: [
            "Unique blend of traditional and modern culture",
            "World-renowned food scene",
            "Extremely safe and clean city",
            "Efficient public transportation system"
          ],
          cons: [
            "Longer flight duration from most locations",
            "Higher accommodation costs",
            "Significant language barrier",
            "Can be overwhelming for first-time visitors"
          ],
          metadata: {
            averageTemperature: "25°C",
            flightDuration: "14h",
            activitiesCount: 78,
            safetyRating: 4.8
          }
        },
        {
          id: "dest_barcelona_test",
          type: "destination",
          name: "Barcelona, Spain",
          imageUrl: "https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=600&h=400&fit=crop",
          price: 950,
          currency: "USD",
          matchConfidence: 88,
          pros: [
            "Stunning Gaudí architecture",
            "Beautiful Mediterranean beaches",
            "Vibrant nightlife and dining scene",
            "More affordable than Paris or Tokyo"
          ],
          cons: [
            "Heavy tourist crowds at popular sites",
            "Pickpocketing concerns in tourist areas",
            "Less English spoken than expected"
          ],
          metadata: {
            averageTemperature: "24°C",
            flightDuration: "8h",
            activitiesCount: 52,
            safetyRating: 4.2
          }
        }
      ]
    },
    triggerPopup: false
  });

  // 2. Risk Assessment with High Reliability
  messages.push({
    id: `test_risk_good_${Date.now()}_2`,
    type: "ai",
    content: "Great news! Your journey timeline is looking excellent. All segments are on track and your bookings are well-timed for optimal pricing.",
    apiResponseType: "risk_assessment",
    apiResponse: {
      level: "on_track",
      message: "Your journey is on schedule with no issues detected",
      details: [
        "All flight bookings confirmed and prices locked in",
        "Hotel reservations secured at preferred locations",
        "Weather forecasts showing favorable conditions",
        "No travel advisories for your destinations"
      ],
      reliability: 92,
      factors: [
        {
          label: "Booking lead time",
          impact: "positive",
          description: "60 days ahead of departure is optimal for pricing and availability"
        },
        {
          label: "Confirmed reservations",
          impact: "positive",
          description: "85% of your journey components are already confirmed"
        },
        {
          label: "Seasonal timing",
          impact: "positive",
          description: "Traveling in shoulder season offers good weather and fewer crowds"
        }
      ]
    },
    triggerPopup: false
  });

  // 3. Risk Assessment - Watch Level
  messages.push({
    id: `test_risk_watch_${Date.now()}_3`,
    type: "ai",
    content: "Your journey is mostly on track, but there are a couple of items that need monitoring over the next few days.",
    apiResponseType: "risk_assessment",
    apiResponse: {
      level: "watch",
      message: "Two segments require attention within the next week",
      details: [
        "Flight prices for Rome → Athens showing 15% increase trend",
        "Your preferred hotel in Istanbul has only 3 rooms remaining",
        "Train tickets for overnight sleeper selling faster than usual",
        "Consider booking these items within 5-7 days to lock in current rates"
      ],
      reliability: 78,
      factors: [
        {
          label: "Price volatility",
          impact: "negative",
          description: "Summer peak season causing 20-30% price fluctuations"
        },
        {
          label: "Booking window",
          impact: "positive",
          description: "Still within optimal booking window for most segments"
        },
        {
          label: "Availability trends",
          impact: "negative",
          description: "Popular travel dates showing faster-than-average booking rates"
        }
      ]
    },
    triggerPopup: false
  });

  // 4. Risk Assessment - Action Needed
  messages.push({
    id: `test_risk_action_${Date.now()}_4`,
    type: "ai",
    content: "⚠️ Urgent: Several items require your immediate attention to keep your journey on track.",
    apiResponseType: "risk_assessment",
    apiResponse: {
      level: "action_needed",
      message: "Immediate action required for 3 critical items",
      details: [
        "Overnight train to Athens: Only 2 sleeper cabins remaining, book within 24 hours",
        "Travel insurance deadline: Must purchase within 3 days for pre-existing condition coverage",
        "Visa application: Processing time may be tight for your June 15 departure date",
        "Hotel in Rome: Your preferred property is now fully booked, need to select alternative",
        "Flight price guarantee: Expiring in 48 hours, decision needed soon"
      ],
      reliability: 58,
      factors: [
        {
          label: "Time-sensitive bookings",
          impact: "negative",
          description: "Multiple items have approaching deadlines or selling out"
        },
        {
          label: "Alternative options",
          impact: "neutral",
          description: "Backup options available but may require itinerary adjustments"
        },
        {
          label: "Processing delays",
          impact: "negative",
          description: "Visa and insurance processing times cutting it close"
        }
      ]
    },
    triggerPopup: false
  });

  // 5. Multiple Confidence Levels Demo
  messages.push({
    id: `test_confidence_demo_${Date.now()}_5`,
    type: "ai",
    content: "Here's how your preferences align with different aspects of your trip:",
    apiResponseType: "confidence_list",
    apiResponse: {
      items: [
        {
          label: "Destination Match",
          score: 95,
          description: "Excellent alignment with your travel preferences"
        },
        {
          label: "Budget Alignment",
          score: 78,
          description: "Good fit with minor adjustments needed"
        },
        {
          label: "Timing Feasibility",
          score: 62,
          description: "Possible but requires some flexibility"
        },
        {
          label: "Activity Preferences",
          score: 88,
          description: "Strong match with your interests"
        }
      ]
    },
    triggerPopup: false
  });

  // 6. Transport Comparison
  messages.push({
    id: `test_transport_comparison_${Date.now()}_6`,
    type: "ai",
    content: "I've found 3 great transport options to get you from Paris to Rome. The high-speed train has the best match at 89% based on your preference for comfort and scenic routes.",
    apiResponseType: "comparison_list",
    apiResponse: {
      comparison_type: "transport",
      items: [
        {
          id: "transport_train_test",
          type: "transport",
          name: "High-Speed Train (TGV/Trenitalia)",
          price: 180,
          currency: "EUR",
          matchConfidence: 89,
          pros: [
            "Scenic route through the Alps",
            "Comfortable seating with dining car",
            "City center to city center",
            "No baggage restrictions"
          ],
          cons: [
            "Longer travel time (10-11 hours)",
            "May require one connection",
            "Limited departure times"
          ],
          metadata: {
            duration: "10h 30m",
            directFlight: false,
            carbonFootprint: "Low"
          }
        },
        {
          id: "transport_flight_test",
          type: "transport",
          name: "Direct Flight",
          price: 120,
          currency: "EUR",
          matchConfidence: 85,
          pros: [
            "Fastest option (2 hours)",
            "Multiple daily departures",
            "Often cheaper than train"
          ],
          cons: [
            "Airport security and check-in time",
            "Additional travel to/from airports",
            "Baggage fees may apply",
            "Higher carbon footprint"
          ],
          metadata: {
            duration: "2h flight + 3h airport time",
            directFlight: true,
            carbonFootprint: "High"
          }
        },
        {
          id: "transport_overnight_test",
          type: "transport",
          name: "Overnight Sleeper Train",
          price: 150,
          currency: "EUR",
          matchConfidence: 76,
          pros: [
            "Save a night's accommodation",
            "Wake up in Rome ready to explore",
            "Private sleeper cabin option",
            "Unique travel experience"
          ],
          cons: [
            "Sleep quality varies",
            "Shared bathroom facilities",
            "Limited availability"
          ],
          metadata: {
            duration: "Overnight (14h)",
            directFlight: false,
            carbonFootprint: "Low"
          }
        }
      ]
    },
    triggerPopup: false
  });

  // 7. Journey Timeline
  messages.push({
    id: `test_journey_timeline_${Date.now()}_7`,
    type: "ai",
    content: "Here's your complete journey timeline for the Paris trip! I've organized all your travel segments with progress tracking and milestone management. You can see your flight is completed, hotel check-in is in progress, and the Louvre visit is coming up next.",
    apiResponseType: "journey_timeline",
    apiResponse: {
      journeyId: "demo_journey_001",
      currentSegment: "hotel_checkin",
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
    },
    triggerPopup: false
  });

  return messages;
};

/**
 * Generates a simple welcome message explaining the test data
 */
export const generatePhase7WelcomeMessage = (): ChatMessage => ({
  id: `test_welcome_${Date.now()}`,
  type: "ai",
  content: "👋 **Phase 7 Test Mode Activated**\n\nI've loaded several test messages to showcase the new journey orchestration features:\n\n✨ **What you'll see:**\n• Destination and transport comparisons\n• Risk assessments (on track, watch, action needed)\n• Timeline reliability indicators\n• Confidence badges throughout\n• **Journey Timeline** with progress tracking and milestones\n\nScroll down to see each feature in action. The comparison cards are horizontally scrollable, and you can expand risk details by clicking \"Show details\". The journey timeline shows your complete travel itinerary with interactive segments!",
});
