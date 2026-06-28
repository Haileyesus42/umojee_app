// Phase 7 TypeScript Interfaces for Nexus Flow Journey Orchestration

import airlineImagesData from "../utils/airlineImages.json";
import { getHotelCategoryImage } from "../utils/hotelCategoryImages";
import { getPlaceCategoryImage } from "../utils/placeCategoryImages";

export const DEFAULT_FLIGHT_IMAGES = [
  "https://media.istockphoto.com/id/155439315/photo/passenger-airplane-flying-above-clouds-during-sunset.jpg?s=612x612&w=0&k=20&c=LJWadbs3B-jSGJBVy9s0f8gZMHi2NvWFXa3VJ2lFcL0=",
  "https://cbsaustin.com/resources/media2/16x9/3114/986/0x163/90/a6cacea6-5603-40c9-8ad8-044ef7f842f2-AP24323386490742.jpg",
  "https://images.photowall.com/products/44246/airplane.jpg?h=699&q=85",
  "https://platform.vox.com/wp-content/uploads/sites/2/chorus/uploads/chorus_asset/file/25013557/GettyImages_1544679552.jpeg?quality=90&strip=all&crop=0.0047169811320771%2C0%2C99.990566037736%2C100&w=2400",
];

export const DEFAULT_CAR_IMAGES = [
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
];

const airlineImages = airlineImagesData as Record<string, { airline_image: string; name: string }>;

/**
 * Extract the IATA airline code from a ComparisonItem's metadata or name,
 * then return the matching airline image URL from airlineImages.json.
 * Falls back to DEFAULT_FLIGHT_IMAGES if no match is found.
 */
export function getAirlineImage(item: ComparisonItem, fallbackIndex: number = 0): string {
  // 1. Try matching airline name exactly or partially from metadata
  const airlineName = (item.metadata?.airline || "").toUpperCase().trim();
  if (airlineName) {
    // If it's a direct IATA code match (e.g. from Amadeus Booking carrierCode)
    if (airlineImages[airlineName]) {
      return airlineImages[airlineName].airline_image;
    }
    for (const [code, info] of Object.entries(airlineImages)) {
      if (info.name.toUpperCase() === airlineName || airlineName.includes(info.name.toUpperCase())) {
        return info.airline_image;
      }
    }
  }

  // 2. Try metadata.flightNumber e.g. "MS 852" → "MS"
  const flightNumber = item.metadata?.flightNumber || item.metadata?.flightNo || item.metadata?.flight_no || "";
  if (flightNumber) {
    const code = flightNumber.toString().trim().split(/\s+/)[0].toUpperCase();
    if (code && airlineImages[code]) {
      return airlineImages[code].airline_image;
    }
  }

  // 3. Try item.name e.g. "EGYPTAIR MS852 — ADD → ABJ" → extract "MS" before the number
  const nameMatch = item.name?.match(/\b([A-Z]{2})\d{1,4}\b/);
  if (nameMatch && airlineImages[nameMatch[1]]) {
    return airlineImages[nameMatch[1]].airline_image;
  }

  // 4. Fallback to generic images
  return DEFAULT_FLIGHT_IMAGES[fallbackIndex % DEFAULT_FLIGHT_IMAGES.length];
}

/**
 * Returns an appropriate fallback image for a ComparisonItem based on its type.
 */
export function getComparisonFallbackImage(item: ComparisonItem, index: number = 0): string {
  switch (item.type) {
    case "car":
      return DEFAULT_CAR_IMAGES[index % DEFAULT_CAR_IMAGES.length];
    case "accommodation":
      return getHotelCategoryImage(item.name, item.id || `hotel_${index}`);
    case "destination":
      return getPlaceCategoryImage(item.name, item.id || `dest_${index}`);
    case "transport":
      return getAirlineImage(item, index);
    case "activity":
      return getPlaceCategoryImage(item.name, item.id || `activity_${index}`);
    default:
      return DEFAULT_FLIGHT_IMAGES[index % DEFAULT_FLIGHT_IMAGES.length];
  }
}

export type ComparisonItem = {
  id: string;
  type: 'destination' | 'transport' | 'activity' | 'accommodation' | 'car';
  name: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  matchConfidence?: number;
  pros: string[];
  cons: string[];
  metadata: Record<string, any>;
  seen?: boolean;
  isBooked?: boolean;
  journeyId?: string;
};

export type ComparisonType = 'destination' | 'transport' | 'activity' | 'accommodation' | 'car';

export type ComparisonData = {
  comparison_type: ComparisonType;
  items: ComparisonItem[];
};

export type TimelineSegment = {
  id: string;
  type: 'destination' | 'transport' | 'activity' | 'accommodation' | 'car';
  title: string;
  subtitle?: string;
  status: 'completed' | 'in_progress' | 'pending' | 'delayed' | 'cancelled' | 'blocked';
  startTime?: string;
  endTime?: string;
  duration?: string;
  departure?: string;
  arrival?: string;
  description?: string;
  details?: string[];
  confidence?: number;
  icon?: string;
  metadata?: Record<string, any>;
};

export type Milestone = {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  completed: boolean;
  critical?: boolean;
};

export type ReliabilityFactor = {
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
};

export type TimelineData = {
  journeyId: string;
  currentSegment: string;
  overallStatus?: 'on_track' | 'watch' | 'action_needed';
  reliability?: number;
  confidence?: number;
  segments: TimelineSegment[];
  milestones?: Milestone[];
  reliabilityFactors?: ReliabilityFactor[];

  /** Booking metadata — populated from handleBookingSuccess */
  origin?: string;           // IATA code e.g. "JFK"
  destination?: string;      // IATA code e.g. "DXB"
  destinations?: string[];   // All destination names/codes in the journey
  routeStops?: string[];     // Ordered IATA codes: ["JFK","IST","DXB"] for transit, ["JFK","DXB"] for direct
  departureDate?: string;    // ISO string
  returnDate?: string;       // ISO string
  flightPrice?: number;      // Total flight price
  currency?: string;         // e.g. "USD"
  airline?: string;
  flightNo?: string;

  /** Fields from journey creation drawer (INSPIRATION segment) */
  departureCity?: string;
  travelersCount?: number;
  durationDays?: number;
  budgetMin?: number;
  budgetMax?: number;
  budgetCurrency?: string;

  /** Flights saved by the user to the journey via interaction */
  savedFlights?: ComparisonItem[];
  /** Hotels saved by the user to the journey via interaction */
  savedHotels?: ComparisonItem[];
  /** Cars saved by the user to the journey via interaction */
  savedCars?: ComparisonItem[];
};

export type RiskLevel = 'on_track' | 'watch' | 'action_needed';

export type RiskAssessment = {
  level: RiskLevel;
  message: string;
  details?: string[];
  reliability?: number;
  factors?: ReliabilityFactor[];
};

export type ArchivedTrip = {
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

export type NotificationPriority = 'info' | 'reminder' | 'action_required' | 'warning';

export type PreferenceLearning = {
  category: string;
  preference: string;
  confidence: number;
  basedOn: string[];
};

// Confidence display types for Phase 7 test message #5
export type ConfidenceItem = {
  label: string;
  score: number; // 0-100
  description?: string;
};

export type ConfidenceData = {
  items: ConfidenceItem[];
};

export interface NotificationConfig {
  priority: NotificationPriority;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  autoDismiss?: boolean;
}

export interface BannerConfig extends NotificationConfig {
  id: string;
  dismissible?: boolean;
}

// Journey state types
export type Journey = {
  id: string;
  userId: string;
  conversationId: string;
  status: 'planning' | 'in_progress' | 'completed';
  currentSegment?: string;
  segments: TimelineSegment[];
  context?: Record<string, any>;
  timeline?: TimelineData;
  createdAt: string;
  updatedAt: string;
};

// =============================================================================
// WebSocket Context Update Types (Phase 2 Real-Time Monitoring)
// =============================================================================

export type MonitoringType =
  | 'traffic'
  | 'weather'
  | 'flight_status'
  | 'airport_conditions'
  | 'location';

export type WebSocketConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface ContextUpdateMessage {
  type: 'context_update';
  monitoring_type: MonitoringType;
  data: Record<string, any>;
  timestamp: string;
}

export interface LocationNotificationMessage {
  type: 'location_notification';
  zone: 'approaching' | 'nearby' | 'arrived';
  message: string;
  distance_km?: number;
  eta_minutes?: number | null;
}

export interface SegmentTransitionMessage {
  type: 'segment_transition';
  journey_id: string;
  from_segment: string;
  to_segment: string;
  timestamp: string;
}

export interface TrafficData {
  conditions: 'light' | 'moderate' | 'heavy';
  normal_duration_minutes: number;
  current_duration_minutes: number;
  delay_minutes: number;
  distance_km: number;
  incidents: any[];
  recommended_route: string;
  last_updated: string;
  source: string;
}

export interface FlightStatusData {
  flight_number: string;
  airline: string;
  status: string;
  departure_airport: string;
  arrival_airport: string;
  scheduled_departure: string;
  estimated_departure: string;
  actual_departure?: string;
  gate: string;
  terminal?: string;
  delay_minutes: number;
  last_updated: string;
  source: string;
}

export interface WeatherData {
  current: {
    condition: string;
    description: string;
    temperature_celsius: number;
    feels_like_celsius: number;
    humidity_percent: number;
    wind_speed_kmh: number;
    uv_index: number;
  };
  hourly: Array<{
    time: string;
    condition: string;
    temperature_celsius: number;
  }>;
  daily: Array<{
    date: string;
    condition: string;
    high_celsius: number;
    low_celsius: number;
    precipitation_probability: number;
  }>;
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  last_updated: string;
  source: string;
}

export interface AirportConditionsData {
  airport_code: string;
  name: string;
  security: {
    average_wait_minutes: number;
    current_crowd_level: string;
  };
  congestion: {
    overall_level: string;
    parking_availability: string;
    taxi_queue_minutes: number;
  };
  terminals: string[];
  amenities: string[];
  last_updated: string;
  source: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  accuracy_meters: number;
  detected_at: string;
  source: string;
}

export interface WebSocketJourneyProps {
  connectionStatus: WebSocketConnectionStatus;
  contextUpdates: Partial<Record<MonitoringType, ContextUpdateMessage>>;
  isConnected: boolean;
}
