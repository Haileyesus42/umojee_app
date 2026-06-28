/**
 * Journey Home Page - Modern Dashboard
 *
 * A professional, mobile-first journey orchestration dashboard that displays:
 * - Active journey status with timeline
 * - Risk indicators and confidence scores
 * - Quick actions and notifications
 * - Trip archive access
 * - Floating chat button for AI assistance
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Archive,
  ChevronRight,
  ChevronLeft,
  Bell,
  Settings,
  RefreshCcw,
  User,
  Shield,
  LogOut,
  MessageSquare,
  Share2,
} from "lucide-react";
import ConfidenceBadge from "./components/ConfidenceBadge";
import RiskIndicator from "./components/RiskIndicator";
import TimelineReliability from "./components/TimelineReliability";
import JourneyTimeline from "./components/JourneyTimeline";
import LiveContextBar from "./components/LiveContextBar";
import CalmNotificationToast from "./components/CalmNotificationToast";
import AllJourneysDrawer from "./components/AllJourneysDrawer";
import BookingsDrawer from "./components/BookingsDrawer";
import HomeBottomChatBar from "./components/HomeBottomChatBar";
import ComparisonView from "./components/ComparisonView";
import MilestoneTracker from "./components/MilestoneTracker";
import MapView from "./components/MapView";
import TimelineDrawer from "./components/TimelineDrawer";
import RecommendationMessage from "./components/RecommendationMessage";
import ComparisonModal from "./modals/ComparisonModal";
import FlightModal from "./modals/FlightModal";
import NotificationsModal from "./modals/NotificationsModal";
import NewJourneyModal from "./modals/NewJourneyModal";
import HomeNewJourneyChatDrawer from "./modals/HomeNewJourneyChatDrawer";
import SpeechToTextModal from "./modals/SpeechToTextModal";
import HomeConversationDrawer from "./components/HomeConversationDrawer";
import JourneyShareDialog from "./components/JourneyShareDialog";
import Coachmark from "./components/Coachmark";
import type { BudgetInfo } from "./modals/NewJourneyModal";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../../../store/auth/authSlice";
import { getLocalStorageValue, removeLocalStorageValue } from "../../../lib/utils";
import { cookies } from "../../..";
import { IMAGES } from "../../../assets";
import type { SettingsSection } from "./JourneySettingsPage";
import type { Flight } from "./modals/utils";
import { type TimelineSegment, type ReliabilityFactor, type BannerConfig, type TimelineData, type Milestone, type ComparisonItem, type ComparisonType, type WebSocketConnectionStatus, type MonitoringType, type ContextUpdateMessage, getComparisonFallbackImage } from "./types/phase7";
import type {
  LocationNotificationMessage,
  SegmentTransitionMessage,
} from "./types/phase7";
import { useContextUpdateMapper } from "./hooks/useContextUpdateMapper";
import { useDestinationRecommendations } from "./hooks/useDestinationRecommendations";
import { useAllJourneys } from "./hooks/useAllJourneys";
import type { JourneyItem } from "./hooks/useAllJourneys";
import { formatRoute, formatAirportCity, getAirportLogo } from "./utils/airportCityMap";
import { getHotelCategoryImage } from "./utils/hotelCategoryImages";
import { useNewJourney } from "./hooks/useNewJourney";
import { fetchAiWithFallback } from "./utils/aiBackend";
import type {
  JourneyLocationMode,
  JourneyLocationOverride,
} from "./hooks/useJourneyWebSocket";

const DEFAULT_ADD_AIRPORT_COORDINATES = {
  latitude: 8.9779,
  longitude: 38.7993,
};

const DEMO_APPROACHING_DISTANCE_KM = Number(
  process.env.REACT_APP_JOURNEY_DEMO_APPROACHING_KM ?? "4"
);
const DEMO_NEARBY_DISTANCE_KM = Number(
  process.env.REACT_APP_JOURNEY_DEMO_NEARBY_KM ?? "1.8"
);
const DEMO_ARRIVED_DISTANCE_KM = Number(
  process.env.REACT_APP_JOURNEY_DEMO_ARRIVED_KM ?? "0"
);

function offsetLatitudeByKm(latitude: number, distanceKm: number): number {
  return latitude - distanceKm / 111;
}

function normalizeComparisonItem(
  item: any,
  fallback: Partial<ComparisonItem> & Pick<ComparisonItem, "id" | "type" | "name">
): ComparisonItem {
  return {
    id: item?.id || fallback.id,
    type: (item?.type || fallback.type) as ComparisonItem["type"],
    name: item?.name || fallback.name,
    imageUrl: item?.imageUrl || fallback.imageUrl,
    price: typeof item?.price === "number" ? item.price : fallback.price,
    currency: item?.currency || fallback.currency,
    matchConfidence:
      typeof item?.matchConfidence === "number"
        ? item.matchConfidence
        : fallback.matchConfidence,
    pros: Array.isArray(item?.pros) ? item.pros : (fallback.pros || []),
    cons: Array.isArray(item?.cons) ? item.cons : (fallback.cons || []),
    metadata:
      item?.metadata && typeof item.metadata === "object"
        ? item.metadata
        : (fallback.metadata || {}),
    seen: typeof item?.seen === "boolean" ? item.seen : fallback.seen,
    isBooked: typeof item?.isBooked === "boolean" ? item.isBooked : fallback.isBooked,
    journeyId: item?.journeyId || fallback.journeyId,
  };
}

function getFlightMatchCandidates(source: any): string[] {
  if (!source || typeof source !== "object") return [];

  return [
    source.id,
    source.flightId,
    source.amadeus_order_id,
    source.amadeusOrderId,
    source.booking_reference,
    source.bookingReference,
    source.referenceNumber,
    source.flight_number,
    source.flightNumber,
    source.flightNo,
    source.carrierCode && (source.flight_number || source.flightNumber)
      ? `${source.carrierCode}${source.flight_number || source.flightNumber}`
      : null,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());
}

function isBookedFlight(savedFlight: any, bookedFlights: any[]): boolean {
  if (!Array.isArray(bookedFlights) || bookedFlights.length === 0) return false;

  const savedCandidates = new Set(getFlightMatchCandidates(savedFlight));
  if (savedCandidates.size > 0) {
    for (const bookedFlight of bookedFlights) {
      for (const candidate of getFlightMatchCandidates(bookedFlight)) {
        if (savedCandidates.has(candidate)) {
          return true;
        }
      }
    }
  }

  const savedFrom = savedFlight?.from || savedFlight?.departure_airport || savedFlight?.origin || "";
  const savedTo = savedFlight?.to || savedFlight?.arrival_airport || savedFlight?.destination || "";
  const savedDeparture = savedFlight?.departure || savedFlight?.departure_time || "";
  const savedAirline = savedFlight?.airline || "";

  return bookedFlights.some((bookedFlight) => {
    const bookedFrom = bookedFlight?.from_code || bookedFlight?.from || "";
    const bookedTo = bookedFlight?.to_code || bookedFlight?.to || "";
    const bookedDeparture = bookedFlight?.departure || "";
    const bookedAirline = bookedFlight?.airline || "";

    return (
      savedFrom === bookedFrom &&
      savedTo === bookedTo &&
      savedDeparture === bookedDeparture &&
      savedAirline === bookedAirline
    );
  });
}

function getHotelMatchCandidates(source: any): string[] {
  if (!source || typeof source !== "object") return [];

  return [
    source.id,
    source.hotelId,
    source.hotel_id,
    source.amadeus_order_id,
    source.amadeusOrderId,
    source.booking_reference,
    source.bookingReference,
    source.referenceNumber,
    source.hotel_name,
    source.name,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());
}

function isBookedHotel(savedHotel: any, bookedHotels: any[]): boolean {
  if (!Array.isArray(bookedHotels) || bookedHotels.length === 0) return false;

  const savedCandidates = new Set(getHotelMatchCandidates(savedHotel));
  if (savedCandidates.size > 0) {
    for (const bookedHotel of bookedHotels) {
      for (const candidate of getHotelMatchCandidates(bookedHotel)) {
        if (savedCandidates.has(candidate)) {
          return true;
        }
      }
    }
  }

  const savedName = savedHotel?.hotel_name || savedHotel?.name || "";
  const savedCity = savedHotel?.city_code || savedHotel?.cityCode || savedHotel?.city_code || "";
  const savedAddress = typeof savedHotel?.address === "string" ? savedHotel.address : "";

  return bookedHotels.some((bookedHotel) => {
    const bookedName = bookedHotel?.hotel_name || bookedHotel?.name || "";
    const bookedCity = bookedHotel?.city_code || bookedHotel?.cityCode || "";
    const bookedAddress = typeof bookedHotel?.address === "string" ? bookedHotel.address : "";

    return (
      savedName === bookedName &&
      savedCity === bookedCity &&
      (!savedAddress || !bookedAddress || savedAddress === bookedAddress)
    );
  });
}

function getCarMatchCandidates(source: any): string[] {
  if (!source || typeof source !== "object") return [];

  return [
    source.id,
    source.carId,
    source.amadeus_order_id,
    source.amadeusOrderId,
    source.booking_reference,
    source.bookingReference,
    source.referenceNumber,
    source.car_name,
    source.carName,
    [source.brand, source.model].filter(Boolean).join(" "),
    source.name,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());
}

function isBookedCar(savedCar: any, bookedCars: any[]): boolean {
  if (!Array.isArray(bookedCars) || bookedCars.length === 0) return false;

  const savedCandidates = new Set(getCarMatchCandidates(savedCar));
  if (savedCandidates.size > 0) {
    for (const bookedCar of bookedCars) {
      for (const candidate of getCarMatchCandidates(bookedCar)) {
        if (savedCandidates.has(candidate)) {
          return true;
        }
      }
    }
  }

  const savedName = [savedCar?.brand, savedCar?.model].filter(Boolean).join(" ") || savedCar?.name || "";
  const savedPickup = savedCar?.pickup || savedCar?.pickup_location || "";
  const savedDropoff = savedCar?.dropoff || savedCar?.return_location || "";

  return bookedCars.some((bookedCar) => {
    const bookedName = bookedCar?.car_name || bookedCar?.name || "";
    const bookedPickup = bookedCar?.pickup_location || bookedCar?.pickup || "";
    const bookedDropoff = bookedCar?.return_location || bookedCar?.dropoff || "";

    return savedName === bookedName && savedPickup === bookedPickup && savedDropoff === bookedDropoff;
  });
}

interface JourneyHomePageProps {
  journeyId?: string;
  connectionStatus?: WebSocketConnectionStatus;
  contextUpdates?: Partial<Record<MonitoringType, ContextUpdateMessage>>;
  isConnected?: boolean;
  recommendations?: any[];
  locationNotification?: LocationNotificationMessage | null;
  segmentTransition?: SegmentTransitionMessage | null;
  onJourneyIdChange?: (journeyId: string | null) => void;
  onJourneyLocationOverrideChange?: (
    override: JourneyLocationOverride | null
  ) => void;
}

type JourneySharePresence = {
  _id: string;
  journeyId: string;
  recipientEmail: string;
  recipientUserId: {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    photo?: string | null;
  } | null;
  status: "pending_friendship" | "pending_signup" | "active" | "revoked";
  isWatching?: boolean;
};

function getUserInitials(user?: {
  firstName?: string;
  lastName?: string;
  email?: string;
} | null): string {
  if (!user) return "?";
  const first = user.firstName?.trim()?.[0];
  const last = user.lastName?.trim()?.[0];
  const initials = `${first || ""}${last || ""}`.trim();
  if (initials) return initials.toUpperCase();
  return (user.email?.trim()?.[0] || "?").toUpperCase();
}


/** Build a TimelineData object from a JourneyItem (DB record → UI model) */
function buildTimelineFromJourney(journey: JourneyItem): TimelineData {
  const fs = journey.context?.flight_status;
  const bookedFlights = Array.isArray(journey.booked_flights) ? journey.booked_flights : [];
  const bookedHotels = Array.isArray(journey.booked_hotels) ? journey.booked_hotels : [];
  const bookedCars = Array.isArray((journey as any).booked_cars) ? (journey as any).booked_cars : [];
  const origin = fs?.departure_airport || journey.context?.departure_airport_code || journey.context?.airport_code || "";
  const dest = fs?.arrival_airport || journey.context?.destination_airport_code || "";

  const fmtDate = (d?: string) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const airlineLabel = [fs?.airline, fs?.flight_number].filter(Boolean).join(" ");
  const depStr = fmtDate(fs?.departure_time);
  const arrStr = fmtDate(fs?.arrival_time);

  const flightDuration = (() => {
    if (!fs?.departure_time || !fs?.arrival_time) return "";
    try {
      const ms =
        new Date(fs.arrival_time).getTime() -
        new Date(fs.departure_time).getTime();
      const hrs = Math.floor(ms / 3_600_000);
      const mins = Math.round((ms % 3_600_000) / 60_000);
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    } catch {
      return "";
    }
  })();

  const segmentDescriptors: Record<string, Partial<TimelineSegment>> = {
    inspiration: {
      type: "activity",
      title: "Inspiration",
      subtitle: dest ? `Destination: ${dest}` : "Planning your journey",
      icon: "✨",
      confidence: 50,
    },
    home_to_airport: {
      type: "transport",
      title: origin ? `Home → ${origin} Airport` : "Home → Airport",
      subtitle: depStr ? `Departure: ${depStr}` : "Prepare for departure",
      startTime: fs?.departure_time || undefined,
      icon: "🚗",
      confidence: 90,
    },
    airport_to_flight: {
      type: "transport",
      title: origin ? `Check-in at ${origin}` : "Airport Check-in",
      subtitle: airlineLabel || "Proceed to gate",
      icon: "🛫",
      confidence: 85,
    },
    flight_to_hotel: {
      type: "transport",
      title:
        origin && dest
          ? `${origin} → ${dest}`
          : dest
            ? `Flight to ${dest}`
            : "In-Flight",
      subtitle:
        [airlineLabel, flightDuration].filter(Boolean).join(" · ") ||
        "En route to destination",
      startTime: fs?.departure_time || undefined,
      endTime: fs?.arrival_time || undefined,
      icon: "✈️",
      confidence: 80,
    },
    hotel_to_activities: {
      type: "accommodation",
      title: dest ? `Explore ${dest}` : "Hotel & Activities",
      subtitle: arrStr ? `Arriving ${arrStr}` : "Accommodation & sightseeing",
      icon: "🏨",
      confidence: 75,
    },
    return: {
      type: "transport",
      title: origin && dest ? `${dest} → ${origin}` : "Return Journey",
      subtitle: "Head back home",
      icon: "🏠",
      confidence: 70,
    },
  };

  return {
    journeyId: journey.journey_id,
    currentSegment: journey.current_segment,
    overallStatus: journey.status === "cancelled" ? "action_needed" : "on_track",
    reliability: 85,
    confidence: 90,
    segments: (journey.segments || []).map((seg) => {
      const desc = segmentDescriptors[seg.segment_type] || {};
      return {
        id: seg.segment_type,
        type: (desc.type as TimelineSegment["type"]) || "transport",
        title:
          desc.title ||
          seg.segment_type
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        subtitle: desc.subtitle,
        icon: desc.icon,
        startTime: desc.startTime,
        endTime: desc.endTime,
        status:
          seg.status === "active"
            ? ("in_progress" as const)
            : ((seg.status as TimelineSegment["status"]) || ("pending" as const)),
        confidence: seg.status === "completed" ? 100 : desc.confidence || 80,
      };
    }),
    origin: origin || undefined,
    destination: dest || undefined,
    destinations: dest ? [dest] : undefined,
    routeStops: origin && dest ? [origin, dest] : undefined,
    departureDate: fs?.departure_time || journey.context?.planned_departure_date || undefined,
    returnDate: fs?.arrival_time || undefined,
    flightPrice: fs?.price || undefined,
    currency: fs?.currency || journey.context?.budget?.currency || undefined,
    airline: fs?.airline || undefined,
    flightNo: fs?.flight_number || undefined,
    // Inspiration segment fields from journey context
    departureCity: journey.context?.departure_city || undefined,
    travelersCount: journey.context?.travelers_count || undefined,
    durationDays: journey.context?.duration_days || undefined,
    budgetMin: journey.context?.budget?.min || undefined,
    budgetMax: journey.context?.budget?.max || undefined,
    budgetCurrency: journey.context?.budget?.currency || undefined,
    savedFlights: (journey.saved_flights || []).map((flight: any, idx: number) => {
      if (flight.name && typeof flight.name === "string") {
        // Assume already formatted by the agent as a ComparisonItem
        return {
          ...flight,
          isBooked: isBookedFlight(flight, bookedFlights),
          journeyId: journey.journey_id,
        };
      }
      // Construct fallback ComparisonItem from generic flight metadata
      const originStr = flight.from || flight.departure_airport || flight.origin || origin || "?";
      const destStr = flight.to || flight.arrival_airport || flight.destination || dest || "?";
      const airlineStr = flight.airline || "Flight";
      const flightNoStr = flight.flightNo || flight.flightNumber || flight.flight_number || "";

      // Format pros — ensure we only pass strings (avoid objects as React children)
      let prosArr: string[] = [];
      if (Array.isArray(flight.pros) && flight.pros.length > 0) {
        prosArr = flight.pros.map((p: any) => (typeof p === "string" ? p : tryFormatBaggage(p)));
      } else if (flight.baggage) {
        prosArr = [tryFormatBaggage(flight.baggage)];
      }

      return {
        id: flight.id || flight.flightId || `saved_flight_${Date.now()}_${idx}`,
        type: "transport",
        name: `${airlineStr} ${flightNoStr} — ${originStr} → ${destStr}`.trim(),
        price: flight.price || flight.basePrice || flight.grandTotal,
        currency: flight.currency || journey.context?.budget?.currency || "USD",
        pros: prosArr,
        cons: flight.cons || [],
        metadata: flight.metadata || flight,
        imageUrl: flight.imageUrl || flight.imageUrls?.[0] || flight.airline_logo || undefined,
        isBooked: isBookedFlight(flight, bookedFlights),
        journeyId: journey.journey_id,
      };
    }),
    savedHotels: (journey.saved_hotels || []).map((hotel: any, idx: number) => {
      if (hotel.name && typeof hotel.name === "string") {
        return normalizeComparisonItem(hotel, {
          id: hotel.id || hotel.hotelId || `saved_hotel_${Date.now()}_${idx}`,
          type: "accommodation",
          name: hotel.name,
          currency: journey.context?.budget?.currency || "USD",
          pros: [],
          cons: [],
          metadata: hotel,
          isBooked: isBookedHotel(hotel, bookedHotels),
          journeyId: journey.journey_id,
          imageUrl: hotel.imageUrl || getComparisonFallbackImage({
            id: hotel.id || hotel.hotelId || "hotel",
            type: "accommodation",
            name: hotel.name,
            pros: [],
            cons: [],
            metadata: hotel
          }, idx),
        });
      }
      return normalizeComparisonItem(hotel, {
        id: hotel.id || hotel.hotelId || `saved_hotel_${Date.now()}_${idx}`,
        type: "accommodation",
        name: hotel.hotel_name || hotel.name || "Hotel",
        currency: hotel.currency || journey.context?.budget?.currency || "USD",
        pros: hotel.pros || [],
        cons: hotel.cons || [],
        metadata: hotel.metadata || hotel,
        price: hotel.price,
        isBooked: isBookedHotel(hotel, bookedHotels),
        imageUrl: hotel.imageUrl || getComparisonFallbackImage({
          id: hotel.id || hotel.hotelId || "hotel",
          type: "accommodation",
          name: hotel.hotel_name || hotel.name || "Hotel",
          pros: hotel.pros || [],
          cons: hotel.cons || [],
          metadata: hotel.metadata || hotel
        }, idx),
        journeyId: journey.journey_id,
      });
    }),
    savedCars: (((journey as any).saved_cars || [])).map((car: any, idx: number) => {
      const fallbackName =
        [car.brand, car.model].filter(Boolean).join(" ").trim() ||
        car.car_name ||
        car.name ||
        "Rental Car";
      const fallbackMetadata = car.metadata && typeof car.metadata === "object"
        ? car.metadata
        : car;

      return normalizeComparisonItem(car, {
        id: car.id || car.carId || car.amadeus_order_id || `saved_car_${Date.now()}_${idx}`,
        type: "car",
        name: fallbackName,
        price:
          typeof car.pricePerDay === "number"
            ? car.pricePerDay
            : typeof car.price === "number"
              ? car.price
              : undefined,
        currency: car.currency || journey.context?.budget?.currency || "USD",
        pros: [
          car.transmission,
          car.fuel,
          car.seats ? `${car.seats} seats` : null,
          car.bags ? `${car.bags} bags` : null,
        ].filter((value): value is string => typeof value === "string" && value.length > 0),
        cons: Array.isArray(car.cons) ? car.cons : [],
        metadata: fallbackMetadata,
        imageUrl: car.imageUrl || car.imageUrls?.[0],
        isBooked: isBookedCar(car, bookedCars),
        journeyId: journey.journey_id,
      });
    }),
  };
}

function getJourneySyncKey(journey: JourneyItem): string {
  return JSON.stringify({
    journeyId: journey.journey_id,
    status: journey.status,
    currentSegment: journey.current_segment,
    updatedAt: journey.updated_at,
    bookedFlights: Array.isArray(journey.booked_flights) ? journey.booked_flights.length : 0,
    bookedHotels: Array.isArray(journey.booked_hotels) ? journey.booked_hotels.length : 0,
    bookedCars: Array.isArray(journey.booked_cars) ? journey.booked_cars.length : 0,
    savedFlights: Array.isArray(journey.saved_flights) ? journey.saved_flights.length : 0,
    savedHotels: Array.isArray(journey.saved_hotels) ? journey.saved_hotels.length : 0,
    savedCars: Array.isArray(journey.saved_cars) ? journey.saved_cars.length : 0,
    recommendationCount: Array.isArray(journey.recommendations) ? journey.recommendations.length : 0,
  });
}

// Helper: format baggage or miscellaneous pros into a readable string
function tryFormatBaggage(baggage: any): string {
  if (!baggage && baggage !== 0) return "";
  if (typeof baggage === "string") return baggage;
  if (typeof baggage === "number") return String(baggage);
  if (typeof baggage === "object") {
    const parts: string[] = [];
    if (baggage.checked !== undefined && baggage.checked !== null) parts.push(`Checked: ${baggage.checked}`);
    if (baggage.cabin !== undefined && baggage.cabin !== null) parts.push(`Cabin: ${baggage.cabin}`);
    if (baggage.cabinKg !== undefined && baggage.cabinKg !== null) parts.push(`Cabin: ${baggage.cabinKg}`);
    if (parts.length > 0) return parts.join(", ");
    try {
      return JSON.stringify(baggage);
    } catch {
      return String(baggage);
    }
  }
  return String(baggage);
}

const JourneyHomePage: React.FC<JourneyHomePageProps> = ({
  journeyId,
  connectionStatus,
  contextUpdates,
  isConnected,
  recommendations,
  locationNotification,
  segmentTransition,
  onJourneyIdChange,
  onJourneyLocationOverrideChange,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Resolve the current user ID for server-backed hooks
  const currentUser = getLocalStorageValue("user") as any;
  const currentUserId: string | null = currentUser?._id ? String(currentUser._id) : null;

  // Profile dropdown state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileDropdownOpen]);

  const handleLogout = () => {
    setProfileDropdownOpen(false);
    dispatch(logout());
    removeLocalStorageValue("user");
    removeLocalStorageValue("token");
    removeLocalStorageValue("isLoggedIn");
    cookies.remove("jwt");
    navigate("/login");
  };

  const backendUrl =
    (process.env.REACT_APP_BACKEND_URL as string) || "http://localhost:4001";
  const avatarSrc = currentUser?.photo
    ? (currentUser.photo.startsWith("http") ? currentUser.photo : `${backendUrl}${currentUser.photo}`)
    : null;

  // Journey timeline state (populated after successful data fetch)
  const [journeyTimeline, setJourneyTimeline] = useState<TimelineData | null>(null);
  const [journeyAccessMode, setJourneyAccessMode] = useState<"owner" | "shared_viewer" | "none">("owner");
  const [sharedJourneyData, setSharedJourneyData] = useState<JourneyItem | null>(null);
  const [sharedJourneyOwner, setSharedJourneyOwner] = useState<any | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharedPresence, setSharedPresence] = useState<JourneySharePresence[]>([]);

  // Page-level loading state
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Per-journey monitoring toggle state (stored in localStorage)
  const [isJourneyMonitorEnabled, setIsJourneyMonitorEnabled] = useState<boolean>(false);
  const isSharedViewer = journeyAccessMode === "shared_viewer";
  const effectiveJourneyUserId = useMemo(() => {
    if (isSharedViewer) {
      const sharedOwnerId = sharedJourneyData?.user_id || sharedJourneyOwner?._id || null;
      return sharedOwnerId ? String(sharedOwnerId) : null;
    }
    return currentUserId;
  }, [currentUserId, isSharedViewer, sharedJourneyData?.user_id, sharedJourneyOwner?._id]);

  // Load persistence on change of journeyId or journeyTimeline
  useEffect(() => {
    if (isSharedViewer) {
      setIsJourneyMonitorEnabled(true);
      return;
    }
    const activeId = journeyId || journeyTimeline?.journeyId;
    if (activeId) {
      const saved = localStorage.getItem(`umoja_monitor_${activeId}`);
      setIsJourneyMonitorEnabled(saved === "true");
    }
  }, [isSharedViewer, journeyId, journeyTimeline?.journeyId]);

  // Save persistence on toggle change
  useEffect(() => {
    if (isSharedViewer) return;
    const activeId = journeyId || journeyTimeline?.journeyId;
    if (activeId) {
      localStorage.setItem(`umoja_monitor_${activeId}`, String(isJourneyMonitorEnabled));
    }
  }, [isJourneyMonitorEnabled, isSharedViewer, journeyId, journeyTimeline?.journeyId]);

  // Daily destination recommendations (replaces localStorage)
  const {
    comparisonItems,
    comparisonType,
    isLoading: recommendationsLoading,
    pushItems: pushComparisonItems,
    refetch: refetchDestinations,
  } = useDestinationRecommendations(effectiveJourneyUserId, journeyTimeline?.journeyId);

  // compute default budget from user preferences if available
  const defaultBudget: BudgetInfo = useMemo(() => {
    const pref = (currentUser && currentUser.budgetPreference) ? currentUser.budgetPreference : null;
    return pref || { min: 500, max: 3000, currency: 'USD' };
  }, [currentUser]);

  // All journeys for the user
  const {
    journeys: allJourneys,
    bookings: amadeusBookings,
    isLoading: allJourneysLoading,
    error: allJourneysError,
    refetch: refetchJourneys,
  } = useAllJourneys(currentUserId);

  // Track loading transitions so we can detect when the fetch actually completes
  const prevAllJourneysLoadingRef = useRef(false);
  const activeJourneySyncKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!journeyId || allJourneysLoading) return;

    const ownedJourney = allJourneys.find((item) => item.journey_id === journeyId);
    if (ownedJourney) {
      setJourneyAccessMode("owner");
      setSharedJourneyData(null);
      setSharedJourneyOwner(null);
      return;
    }

    const controller = new AbortController();

    const loadSharedJourney = async () => {
      try {
        setIsPageLoading(true);
        const token = getLocalStorageValue("token") as string | null;
        const response = await fetch(
          `${backendUrl}/api/client/journey-shares/journey/${encodeURIComponent(journeyId)}/access`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: controller.signal,
          }
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message || "Journey access denied");
        }

        const accessMode = data?.data?.accessMode;
        if (accessMode === "shared_viewer" && data?.data?.journey) {
          setJourneyAccessMode("shared_viewer");
          setSharedJourneyData(data.data.journey);
          setSharedJourneyOwner(data.data.sharer || null);
          setIsJourneyMonitorEnabled(true);
          onJourneyIdChange?.(journeyId);
        } else {
          setJourneyAccessMode("owner");
          setSharedJourneyData(null);
          setSharedJourneyOwner(null);
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          setJourneyAccessMode("none");
          setSharedJourneyData(null);
          setSharedJourneyOwner(null);
          setIsPageLoading(false);
        }
      }
    };

    loadSharedJourney();

    return () => controller.abort();
  }, [allJourneys, allJourneysLoading, backendUrl, journeyId, onJourneyIdChange]);

  // Helper to get auth headers for Node API calls
  const getAuthHeaders = useCallback(() => {
    const token = getLocalStorageValue("token") as string;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  useEffect(() => {
    const activeJourneyId = journeyTimeline?.journeyId;
    if (!activeJourneyId || isSharedViewer) {
      setSharedPresence([]);
      return;
    }

    let isDisposed = false;

    const fetchSharedPresence = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/client/journey-shares`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || isDisposed) return;

        const shares = Array.isArray(data?.data) ? data.data : [];
        setSharedPresence(
          shares.filter(
            (share: JourneySharePresence) =>
              String(share.journeyId) === String(activeJourneyId) &&
              share.status === "active"
          )
        );
      } catch {
        // ignore polling issues here; status card can stay stale briefly
      }
    };

    fetchSharedPresence();
    const interval = window.setInterval(fetchSharedPresence, 8000);

    return () => {
      isDisposed = true;
      window.clearInterval(interval);
    };
  }, [backendUrl, getAuthHeaders, isSharedViewer, journeyTimeline?.journeyId]);

  useEffect(() => {
    if (!journeyId || !isSharedViewer) return;

    let isDisposed = false;

    const pollSharedAccess = async () => {
      try {
        const token = getLocalStorageValue("token") as string | null;
        const response = await fetch(
          `${backendUrl}/api/client/journey-shares/journey/${encodeURIComponent(journeyId)}/access`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        const data = await response.json().catch(() => null);
        if (isDisposed) return;

        if (!response.ok || data?.data?.accessMode !== "shared_viewer") {
          setJourneyAccessMode("none");
          setSharedJourneyData(null);
          setSharedJourneyOwner(null);
          setJourneyTimeline(null);
          activeJourneySyncKeyRef.current = null;
          onJourneyIdChange?.(null);
          toast.error("This live journey is no longer shared with your account.");
          return;
        }

        if (data?.data?.journey) {
          setSharedJourneyData(data.data.journey);
          setSharedJourneyOwner(data.data.sharer || null);
        }
      } catch {
        // Keep the last visible state on transient polling failures.
      }
    };

    const interval = window.setInterval(pollSharedAccess, 8000);

    return () => {
      isDisposed = true;
      window.clearInterval(interval);
    };
  }, [backendUrl, isSharedViewer, journeyId, onJourneyIdChange]);

  // All Journeys drawer state
  const [allJourneysOpen, setAllJourneysOpen] = useState(false);
  const [drawerInitialFilter, setDrawerInitialFilter] = useState<"all" | "active" | "planning" | "in_progress" | "completed" | "cancelled">("all");
  const [activeTab, setActiveTab] = useState<"upcoming" | "active" | "archive">("active");
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState("");
  const [initialChatMessageSource, setInitialChatMessageSource] = useState<"text" | "voice">("text");
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);
  const [speechModalOpen, setSpeechModalOpen] = useState(false);
  const [conversationDrawerOpen, setConversationDrawerOpen] = useState(false);
  const [bookingsDrawerOpen, setBookingsDrawerOpen] = useState(false);
  const [timelineDrawerOpen, setTimelineDrawerOpen] = useState(false);

  // ComparisonModal state
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [comparisonModalInitialStep, setComparisonModalInitialStep] = useState<number | undefined>(undefined);
  const [comparisonModalInitialItem, setComparisonModalInitialItem] = useState<ComparisonItem | null>(null);
  const [comparisonModalItems, setComparisonModalItems] = useState<ComparisonItem[]>([]);
  const [comparisonModalType, setComparisonModalType] = useState<ComparisonType>("destination");
  const [activeComparisonTab, setActiveComparisonTab] = useState<"transport" | "accommodation" | "car">("transport");

  // FlightModal state
  const [flightModalOpen, setFlightModalOpen] = useState(false);
  const [flightForBooking, setFlightForBooking] = useState<Flight | null>(null);

  // Contextual Reply state
  const [replySource, setReplySource] = useState<any>(null);

  // Context update mapper for translating WebSocket data to UI types
  const {
    applyUpdatesToTimeline,
    generateBanners,
    computeRiskLevel,
    extractReliabilityFactors,
  } = useContextUpdateMapper();

  // Notifications modal state
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [milestoneLocationMode, setMilestoneLocationMode] =
    useState<JourneyLocationMode>("current_location");

  // Auto-switch comparison tab if only one category has data
  useEffect(() => {
    const availableTabs: Array<"transport" | "accommodation" | "car"> = [];
    if ((journeyTimeline?.savedFlights?.length || 0) > 0) availableTabs.push("transport");
    if ((journeyTimeline?.savedHotels?.length || 0) > 0) availableTabs.push("accommodation");
    if ((journeyTimeline?.savedCars?.length || 0) > 0) availableTabs.push("car");

    if (availableTabs.length > 0 && !availableTabs.includes(activeComparisonTab)) {
      setActiveComparisonTab(availableTabs[0]);
    }
  }, [journeyTimeline?.savedFlights?.length, journeyTimeline?.savedHotels?.length, journeyTimeline?.savedCars?.length, activeComparisonTab]);

  // New Journey drawer (hook manages state + creation logic)
  const newJourney = useNewJourney({
    userId: currentUserId,
    onTimelineCreated: (timeline) => setJourneyTimeline(timeline),
    onJourneyIdChange,
    refetchJourneys,
    onInspirationReceived: (inspiration, journeyId) => {
      // Push flight recommendations from journey creation into the ComparisonView
      // and save them to the Node server (same as session/new flow)
      const apiResponse = inspiration?.api_response || inspiration?.apiResponse;
      const items = apiResponse?.items;
      if (Array.isArray(items) && items.length > 0) {
        const type = apiResponse?.comparison_type || apiResponse?.comparisonType || "destination";
        const greeting = inspiration?.ai_generated || inspiration?.message || "";
        pushComparisonItems(items, type, { greeting, journeyId });
      } else {
        // No inspiration data came back — re-fetch destinations for the new journey
        refetchDestinations();
      }
    },
  });

  // Request geolocation permission on mount and persist location
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    const saveLocation = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const ts = Date.now();
      const base = { lat, lon, city: null as string | null, display_name: null as string | null, address: null as Record<string, any> | null, bounding_box: null, ts, ts_iso: new Date(ts).toISOString(), ts_locale: new Date(ts).toLocaleString() };
      localStorage.setItem("user_location", JSON.stringify(base));
      // Enrich with reverse geocode
      const backend = (process.env.REACT_APP_BACKEND_URL || "http://localhost:4001").replace(/\/$/, "");
      fetch(`${backend}/api/location/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { headers: { Accept: "application/json" } })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            localStorage.setItem("user_location", JSON.stringify({ ...base, city: data.city ?? null, display_name: data.display_name ?? null, address: data.address ?? null, bounding_box: data.bounding_box ?? null }));
          }
        })
        .catch(() => { });
    };

    // Always call getCurrentPosition on mount:
    // - "prompt"  → browser shows the Allow/Block popup
    // - "granted" → refreshes stored location silently
    // - "denied"  → fails silently (error callback)
    navigator.geolocation.getCurrentPosition(saveLocation, () => { }, { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 });
  }, []);

  // Track previous connection status to fire toast only on transition to "connected"
  const prevConnectionStatusRef = useRef<WebSocketConnectionStatus | undefined>(undefined);

  useEffect(() => {
    const prev = prevConnectionStatusRef.current;
    prevConnectionStatusRef.current = connectionStatus;

    if (connectionStatus === "connected" && prev !== "connected" && journeyTimeline?.journeyId) {
      toast.custom(
        (t) => (
          <CalmNotificationToast
            t={t}
            priority="info"
            title="Live Monitoring Active"
            message={`Real-time updates are now streaming for your journey.`}
          />
        ),
        { duration: 4000, position: "top-center" }
      );
    }
  }, [connectionStatus, journeyTimeline?.journeyId]);

  // Apply WebSocket context updates to the journey timeline
  useEffect(() => {
    if (!contextUpdates || Object.keys(contextUpdates).length === 0 || !journeyTimeline) return;

    const updatedTimeline = applyUpdatesToTimeline(journeyTimeline, contextUpdates);

    // Only update if something actually changed
    const changed =
      updatedTimeline.overallStatus !== journeyTimeline.overallStatus ||
      updatedTimeline.reliability !== journeyTimeline.reliability ||
      updatedTimeline.segments.some(
        (s, i) =>
          s.status !== journeyTimeline.segments[i]?.status ||
          s.confidence !== journeyTimeline.segments[i]?.confidence
      );

    if (changed) {
      setJourneyTimeline(updatedTimeline);
    }
  }, [contextUpdates, journeyTimeline, applyUpdatesToTimeline]);

  // Generate notification banners from real-time context updates and persist to Node
  useEffect(() => {
    if (!contextUpdates || Object.keys(contextUpdates).length === 0) return;

    const newBanners = generateBanners(contextUpdates);
    if (newBanners.length === 0) return;

    setNotifications((prev) => {
      const existingIds = new Set(prev.map((b) => b.id));

      // Separate "live" banners (stable IDs that should be replaced on update)
      // from one-shot banners (unique timestamp-based IDs).
      const liveIds = new Set(["traffic_update"]);
      const toReplace = newBanners.filter(
        (b) => liveIds.has(b.id) && existingIds.has(b.id)
      );
      const unique = newBanners.filter((b) => !existingIds.has(b.id));

      if (toReplace.length === 0 && unique.length === 0) return prev;

      // Build updated list: replace live banners in-place, append new ones
      let updated = prev;
      if (toReplace.length > 0) {
        const replaceMap = new Map(toReplace.map((b) => [b.id, b]));
        updated = updated.map((b) => replaceMap.get(b.id) ?? b);
      }
      if (unique.length > 0) {
        updated = [...updated, ...unique];
      }

      // Persist new + updated notifications to Node server (fire-and-forget)
      const toPersist = [...unique, ...toReplace];
      const jId = journeyTimeline?.journeyId;
      if (jId && toPersist.length > 0) {
        fetch(`${backendUrl}/api/client/journey-notifications/bulk`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            journeyId: jId,
            notifications: toPersist.map((b) => ({
              notificationId: b.id,
              priority: b.priority,
              title: b.title,
              message: b.message,
            })),
          }),
        }).catch((err) => console.warn("[Notifications] Persist error:", err));
      }

      // Show a toast for genuinely new banners so the user sees them immediately
      for (const banner of unique) {
        toast.custom(
          (t) => (
            <CalmNotificationToast
              t={t}
              priority={banner.priority}
              title={banner.title}
              message={banner.message}
              actionLabel={banner.actionLabel}
              onAction={banner.onAction}
            />
          ),
          { duration: 5000 }
        );
      }

      return updated;
    });
  }, [contextUpdates, generateBanners, journeyTimeline?.journeyId, backendUrl, getAuthHeaders]);

  useEffect(() => {
    if (!locationNotification) return;
    const jId = journeyTimeline?.journeyId;

    const zoneTitles: Record<LocationNotificationMessage["zone"], string> = {
      approaching: "Approaching Airport",
      nearby: "Near The Airport",
      arrived: "Arrived At Airport",
    };

    const banner: BannerConfig = {
      id: `location_${locationNotification.zone}`,
      priority:
        locationNotification.zone === "arrived"
          ? "info"
          : "reminder",
      title: zoneTitles[locationNotification.zone],
      message: locationNotification.message,
    };

    setNotifications((prev) => {
      const updated = [
        ...prev.filter((item) => item.id !== banner.id),
        banner,
      ];
      return updated;
    });

    if (jId) {
      fetch(`${backendUrl}/api/client/journey-notifications/bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          journeyId: jId,
          notifications: [
            {
              notificationId: banner.id,
              priority: banner.priority,
              title: banner.title,
              message: banner.message,
            },
          ],
        }),
      }).catch((err) =>
        console.warn("[Notifications] Failed to persist location notification:", err)
      );
    }

    toast.custom(
      (t) => (
        <CalmNotificationToast
          t={t}
          priority={banner.priority}
          title={banner.title}
          message={banner.message}
        />
      ),
      {
        duration: locationNotification.zone === "arrived" ? 6000 : 5000,
      }
    );
  }, [locationNotification, journeyTimeline?.journeyId, backendUrl, getAuthHeaders]);

  useEffect(() => {
    if (!segmentTransition) return;
    if (segmentTransition.journey_id !== journeyTimeline?.journeyId) return;

    activeJourneySyncKeyRef.current = null;
    refetchJourneys();
  }, [segmentTransition, journeyTimeline?.journeyId, refetchJourneys]);

  // Compute live risk and reliability from context updates (with mock fallbacks)
  const hasLiveUpdates = contextUpdates && Object.keys(contextUpdates).length > 0;

  const liveRisk = hasLiveUpdates
    ? computeRiskLevel(contextUpdates!)
    : { level: "watch" as const, message: "One segment needs attention", details: ["Flight prices increasing for Rome \u2192 Barcelona"] };

  // ---------------------------------------------------------------------------
  // Derived display values for the Journey Status Card
  // ---------------------------------------------------------------------------

  // Is this journey in the INSPIRATION segment?
  const isInspirationSegment =
    journeyTimeline?.currentSegment === "inspiration";

  // Route: "City (DEP) → City (TRANSIT) → City (ARR)" from itinerary stops
  const journeyRoute = (() => {
    if (!journeyTimeline) return "No active journey";

    // Inspiration segment: show departure city → destination from drawer
    if (isInspirationSegment) {
      const dep = journeyTimeline.departureCity;
      const dest = journeyTimeline.destination;
      if (dep && dest) return `${dep} → ${dest}`;
      if (dep) return `From ${dep}`;
      if (dest) return `To ${dest}`;
      return "Planning your journey";
    }

    // Prefer routeStops (extracted from Amadeus itinerary segments)
    if (journeyTimeline.routeStops?.length) {
      return formatRoute(journeyTimeline.routeStops);
    }
    // Fallback: origin → destination
    if (journeyTimeline.origin && journeyTimeline.destination) {
      return formatRoute([journeyTimeline.origin, journeyTimeline.destination]);
    }
    if (journeyTimeline.origin) {
      return `From ${formatAirportCity(journeyTimeline.origin)}`;
    }
    // Last resort: extract from segment titles
    const flightSeg = journeyTimeline.segments?.find((s) => s.id === "flight_to_hotel");
    const destMatch = flightSeg?.title?.match(/Flight to (\S+)/)?.[1];
    if (destMatch) return `Flight to ${formatAirportCity(destMatch)}`;
    return "Journey in progress";
  })();

  // Headline: "N Destinations, N Days" computed from dates and destinations
  const journeyHeadline = (() => {
    if (!journeyTimeline) return "Plan Your Next Trip";

    // Inspiration segment: show duration + travelers from drawer
    if (isInspirationSegment) {
      const parts: string[] = [];
      if (journeyTimeline.durationDays) {
        parts.push(
          `${journeyTimeline.durationDays} ${journeyTimeline.durationDays === 1 ? "Day" : "Days"}`
        );
      }
      if (journeyTimeline.travelersCount) {
        parts.push(
          `${journeyTimeline.travelersCount} ${journeyTimeline.travelersCount === 1 ? "Traveler" : "Travelers"}`
        );
      }
      return parts.length > 0 ? parts.join(", ") : "New Journey";
    }

    const destCount = journeyTimeline.destinations?.length || (journeyTimeline.destination ? 1 : 0);
    let dayCount: number | null = null;
    if (journeyTimeline.departureDate && journeyTimeline.returnDate) {
      const dep = new Date(journeyTimeline.departureDate);
      const ret = new Date(journeyTimeline.returnDate);
      dayCount = Math.max(1, Math.ceil((ret.getTime() - dep.getTime()) / 86_400_000));
    }
    const destPart = destCount > 0 ? `${destCount} ${destCount === 1 ? "Destination" : "Destinations"}` : "";
    const dayPart = dayCount ? `${dayCount} ${dayCount === 1 ? "Day" : "Days"}` : "";
    if (destPart && dayPart) return `${destPart}, ${dayPart}`;
    if (destPart) return destPart;
    if (dayPart) return dayPart;
    // Fallback: show airline + flight number if available
    const airlinePart = [journeyTimeline.airline, journeyTimeline.flightNo].filter(Boolean).join(" ");
    return airlinePart || "Active Journey";
  })();

  // Confirmed %: ratio of completed segments to total
  const confirmedPercent = (() => {
    const segs = journeyTimeline?.segments;
    if (!segs || segs.length === 0) return 0;
    const completed = segs.filter((s) => s.status === "completed").length;
    return Math.round((completed / segs.length) * 100);
  })();

  // Days until departure
  const daysUntilDeparture = (() => {
    if (!journeyTimeline?.departureDate) return null;
    const dep = new Date(journeyTimeline.departureDate);
    const now = new Date();
    const diff = Math.ceil((dep.getTime() - now.getTime()) / 86_400_000);
    return diff;
  })();

  const daysUntilLabel = (() => {
    if (daysUntilDeparture === null) return "Departure";
    if (daysUntilDeparture < 0) return "Days Ago";
    if (daysUntilDeparture === 0) return "Today!";
    return "Days Until";
  })();

  // Budget display: flight price formatted, fallback to budget max for inspiration
  const budgetDisplay = (() => {
    // Inspiration segment: show budget max from drawer
    if (isInspirationSegment && journeyTimeline?.budgetMax) {
      const curr = journeyTimeline.budgetCurrency || "USD";
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: curr,
          maximumFractionDigits: 0,
        }).format(journeyTimeline.budgetMax);
      } catch {
        return `$${Math.round(journeyTimeline.budgetMax)}`;
      }
    }

    const price = journeyTimeline?.flightPrice;
    if (price !== undefined && price !== null && price > 0) {
      const curr = journeyTimeline?.currency || "USD";
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: curr,
          maximumFractionDigits: 0,
        }).format(price);
      } catch {
        return `$${Math.round(price)}`;
      }
    }
    // No price but journey exists — show "Booked" instead of "—"
    if (journeyTimeline) return "Booked";
    return "—";
  })();

  // Start monitoring for a journey (segment-aware on the backend)
  const startMonitoring = useCallback(async (journeyId: string) => {
    if (isSharedViewer) return;
    try {
      const res = await fetchAiWithFallback(`/api/ai/journey/${journeyId}/monitor/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (data?.auto_transitioned_to) {
        refetchJourneys();
      }
    } catch (err) {
      console.warn("[JourneyHomePage] Failed to start monitoring:", err);
    }
  }, [isSharedViewer, refetchJourneys]);

  // Stop monitoring for a journey (used when switching to a new journey)
  const stopMonitoring = useCallback(async (journeyId: string) => {
    if (isSharedViewer) return;
    try {
      await fetchAiWithFallback(`/api/ai/journey/${journeyId}/monitor/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Non-fatal: backend will also auto-stop when WebSocket disconnects
    }
  }, [isSharedViewer]);

  // Check if monitoring is active and start it if not
  const ensureMonitoring = useCallback(
    async (journeyId: string) => {
      if (isSharedViewer) return;
      try {
        const res = await fetchAiWithFallback(
          `/api/ai/journey/${journeyId}/monitor/status`
        );
        const data = await res.json().catch(() => null);
        if (data?.auto_transitioned_to) {
          refetchJourneys();
        }
        if (data && !data.is_active) {
          await startMonitoring(journeyId);
        }
      } catch {
        // If status check fails, try to start monitoring anyway
        await startMonitoring(journeyId);
      }
    },
    [isSharedViewer, refetchJourneys, startMonitoring]
  );

  // Auto-start monitoring when the page loads with an active journey, IF enabled via toggle
  useEffect(() => {
    const activeId = journeyTimeline?.journeyId;
    if (activeId) {
      if (isSharedViewer) {
        onJourneyIdChange?.(activeId);
        return;
      }
      if (isJourneyMonitorEnabled) {
        ensureMonitoring(activeId);
        onJourneyIdChange?.(activeId);
      } else {
        // If disabled, ensure it's stopped and notify parent to disconnect WebSocket
        stopMonitoring(activeId);
        onJourneyIdChange?.(null);
      }
    }
  }, [journeyTimeline?.journeyId, isJourneyMonitorEnabled, isSharedViewer, ensureMonitoring, onJourneyIdChange, stopMonitoring]);

  /** Convert a ComparisonItem (destination) into a Flight object for the FlightModal */
  const comparisonItemToFlight = (item: ComparisonItem): Flight => {
    const meta = item.metadata || {};
    return {
      id: item.id,
      provider_offer_id:
        meta.provider_offer_id ||
        meta.offer_id ||
        (typeof item.id === "string" && item.id.startsWith("off_") ? item.id : undefined),
      metadata: meta,
      airline: meta.airline || item.name,
      flightNo: meta.flightNo || meta.flight_no || meta.flightNumber || "",
      from: meta.from || meta.origin || "",
      to: meta.to || meta.destination || "",
      stops: meta.stops || "Direct",
      travelTime: meta.travelTime || meta.travel_time || meta.duration || "",
      departure: meta.departure || "",
      arrival: meta.arrival || "",
      price: item.price || 0,
      basePrice: meta.basePrice || meta.base_price || item.price || 0,
      baggage: meta.baggage || "Cabin bag included",
      fareNotes: meta.fareNotes || meta.fare_notes || "",
      imageUrl: item.imageUrl,
      imageUrls: meta.imageUrls || meta.image_urls || (item.imageUrl ? [item.imageUrl] : []),
    };
  };

  /** When ComparisonModal "Done" is clicked with a selected destination */
  const handleComparisonDone = (item: ComparisonItem | null) => {
    setComparisonModalOpen(false);
    if (item && comparisonModalType === "transport") {
      toast.custom(
        (t) => (
          <CalmNotificationToast
            t={t}
            priority="action_required"
            title="Reserve a Seat?"
            message={`Do you wish to reserve a seat for the selected flight ${item.name}?`}
            actionLabel="Yes, reserve"
            onAction={() => {
              setFlightForBooking(comparisonItemToFlight(item));
              setFlightModalOpen(true);
            }}
          />
        ),
        { duration: Infinity, position: "top-center" }
      );
    }
  };

  /** Refresh journey state from the backend after a successful booking. */
  const handleBookingSuccess = async (result: any) => {
    const journey = result?.data?.journey;
    const booking = result?.data?.booking;
    if (!journey?.journey_id && !booking) return;

    // Stop monitoring for the old journey before switching
    const oldJourneyId = journeyTimeline?.journeyId;
    const journeyId = journey?.journey_id || booking?._id || `journey_${Date.now()}`;
    if (oldJourneyId && oldJourneyId !== journeyId) {
      stopMonitoring(oldJourneyId);
    }

    setIsPageLoading(true);

    

    /* const segments: TimelineSegment[] = [
      {
        id: "inspiration",
        type: "activity",
        title: "Inspiration",
        subtitle: "Flight booked",
        status: "completed",
        confidence: 100,
        icon: "✨",
      },
      {
        id: "home_to_airport",
        type: "transport",
        title: `Get to ${origin} Airport`,
        subtitle: departureStr ? `Departs ${new Date(departureStr.replace(" ", "T")).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : undefined,
        status: "in_progress",
        startTime: departureStr?.replace(" ", "T"),
        confidence: 90,
        icon: "🚗",
      },
      {
        id: "airport_to_flight",
        type: "transport",
        title: `${origin} Airport`,
        subtitle: `${flight?.airline || ""} ${flight?.flightNo || ""}`.trim(),
        status: "pending",
        confidence: 85,
        icon: "🛫",
      },
      {
        id: "flight_to_hotel",
        type: "transport",
        title: `Flight to ${dest}`,
        subtitle: flight?.travelTime || undefined,
        status: "pending",
        startTime: departureStr?.replace(" ", "T"),
        endTime: arrivalStr?.replace(" ", "T"),
        confidence: 80,
        icon: "✈️",
      },
      {
        id: "hotel_to_activities",
        type: "accommodation",
        title: `Stay in ${dest}`,
        subtitle: "Hotel & Activities",
        status: "pending",
        confidence: 75,
        icon: "🏨",
      },
      {
        id: "return",
        type: "transport",
        title: `Return to ${origin}`,
        subtitle: "Return journey",
        status: "pending",
        confidence: 70,
        icon: "🏠",
      },
    ];

    const timelineData: TimelineData = {
      journeyId: journeyId,
      currentSegment: "home_to_airport",
      overallStatus: "on_track",
      reliability: 85,
      confidence: 90,
      segments,
      origin,
      destination: dest,
      destinations: [dest],
      routeStops: routeStops.length > 0 ? routeStops : [origin, dest],
      departureDate: departureStr?.replace?.(" ", "T") || departureStr,
      returnDate: arrivalStr?.replace?.(" ", "T") || arrivalStr,
      flightPrice,
      currency,
      airline: flight?.airline || itinSegments[0]?.carrierCode,
      flightNo: flight?.flightNo || itinSegments[0]?.flightNumber,
    };

    setJourneyTimeline(timelineData);
    // Persist so it survives page refresh
    try {
      localStorage.setItem("umoja_active_journey", JSON.stringify(timelineData));
    } catch { ignore }
    */

    // Persist as active in DB (cross-device support)
    if (currentUserId) {
      try {
        await fetchAiWithFallback(
          `/api/ai/journey/${encodeURIComponent(journeyId)}/set-active`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: currentUserId }),
          }
        );
      } catch {
        // Non-fatal: the refetch below still reloads the latest backend state.
      }
    }

    // Notify parent container to start WebSocket connection (if enabled)
    if (isJourneyMonitorEnabled) {
      onJourneyIdChange?.(journeyId);
      window.dispatchEvent(new Event("umoja_journey_updated"));
      // Ensure monitoring is active
      await ensureMonitoring(journeyId);
    } else {
      onJourneyIdChange?.(null);
    }

    refetchJourneys();
  };

  /** All comparison items converted to Flight objects for the FlightModal list */
  const allFlightsFromComparison = comparisonItems.map(comparisonItemToFlight);

  // Destination recommendations are now fetched via useDestinationRecommendations hook
  // (replaces the old localStorage.getItem("umoja_greeting_comparison") approach)

  // Source of truth: once allJourneys fetch completes, resolve the active journey.
  // When a journeyId prop is provided (from URL param), use that specific journey.
  // Otherwise fall back to the DB is_active field.
  // Detects loading transition (true → false) so we don't act on the initial
  // render where isLoading=false and journeys=[] (fetch hasn't started yet).
  useEffect(() => {
    const wasLoading = prevAllJourneysLoadingRef.current;
    prevAllJourneysLoadingRef.current = allJourneysLoading;
    const shouldSyncAfterJourneyFetch = wasLoading && !allJourneysLoading;
    const shouldSyncSharedJourney =
      !allJourneysLoading &&
      Boolean(journeyId && sharedJourneyData && isSharedViewer);

    // Only act when a fetch just completed (loading: true → false)
    if (!shouldSyncAfterJourneyFetch && !shouldSyncSharedJourney) {
      if (allJourneysLoading) setIsPageLoading(true);
      return;
    }

    let foundTimeline = false;

    // If a specific journeyId is provided via URL param, use it
    if (journeyId) {
      const target = allJourneys.find((j) => j.journey_id === journeyId);
      const resolvedTarget = target || sharedJourneyData;
      if (resolvedTarget) {
        const nextSyncKey = getJourneySyncKey(resolvedTarget);
        if (activeJourneySyncKeyRef.current !== nextSyncKey) {
          const timelineData = buildTimelineFromJourney(resolvedTarget);
          setJourneyTimeline(timelineData);
          activeJourneySyncKeyRef.current = nextSyncKey;
          if (isSharedViewer) {
            onJourneyIdChange?.(resolvedTarget.journey_id);
          } else if (isJourneyMonitorEnabled) {
            onJourneyIdChange?.(resolvedTarget.journey_id);
            ensureMonitoring(resolvedTarget.journey_id);
          } else {
            onJourneyIdChange?.(null);
          }
        }
        foundTimeline = true;
      }
    } else {
      const activeJourney = allJourneys.find((j) => j.is_active);
      if (activeJourney) {
        const nextSyncKey = getJourneySyncKey(activeJourney);
        if (activeJourneySyncKeyRef.current !== nextSyncKey) {
          const timelineData = buildTimelineFromJourney(activeJourney);
          setJourneyTimeline(timelineData);
          activeJourneySyncKeyRef.current = nextSyncKey;
          if (isJourneyMonitorEnabled) {
            onJourneyIdChange?.(activeJourney.journey_id);
            ensureMonitoring(activeJourney.journey_id);
          } else {
            onJourneyIdChange?.(null);
          }
        }
        foundTimeline = true;
      } else if (journeyTimeline) {
        // No active journey in DB — clear state
        setJourneyTimeline(null);
        activeJourneySyncKeyRef.current = null;
        onJourneyIdChange?.(null);
      }
    }

    setIsPageLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allJourneys, allJourneysLoading, isJourneyMonitorEnabled, isSharedViewer, journeyId, sharedJourneyData]);

  useEffect(() => {
    if (allJourneysError) {
      setIsPageLoading(false);
    }
  }, [allJourneysError]);

  const [notifications, setNotifications] = useState<BannerConfig[]>([]);

  // Fetch persisted notifications from Node server on journey change
  useEffect(() => {
    const jId = journeyTimeline?.journeyId;
    if (!jId || !currentUserId || isSharedViewer) return;

    fetch(`${backendUrl}/api/client/journey-notifications/${encodeURIComponent(jId)}`, {
      headers: getAuthHeaders(),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const docs: any[] = Array.isArray(data?.data) ? data.data : [];
        if (docs.length > 0) {
          const persisted: BannerConfig[] = docs.map((d) => ({
            id: d.notificationId,
            priority: d.priority || "info",
            title: d.title,
            message: d.message,
            dismissible: true,
          }));
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((b) => b.id));
            const fresh = persisted.filter((b) => !existingIds.has(b.id));
            return fresh.length > 0 ? [...fresh, ...prev] : prev;
          });
        }
      })
      .catch((err) => console.warn("[Notifications] Fetch error:", err));
  }, [journeyTimeline?.journeyId, currentUserId, backendUrl, getAuthHeaders, isSharedViewer]);

  // Mock journey data
  const mockTimelineData: TimelineData = {
    journeyId: "journey_123",
    currentSegment: "seg_1",
    overallStatus: "watch",
    reliability: 82,
    confidence: 88,
    segments: [
      {
        id: "seg_1",
        type: "destination",
        title: "Paris",
        subtitle: "Jun 15 - Jun 20",
        status: "in_progress",
        confidence: 95,
        icon: "✈️",
      },
      {
        id: "seg_2",
        type: "destination",
        title: "Rome",
        subtitle: "Jun 21 - Jun 25",
        status: "pending",
        confidence: 88,
        icon: "🏛️",
      },
      {
        id: "seg_3",
        type: "destination",
        title: "Barcelona",
        subtitle: "Jun 26 - Jun 30",
        status: "pending",
        confidence: 82,
        icon: "🏖️",
      },
    ],
  };

  const mockReliabilityFactors: ReliabilityFactor[] = [
    {
      label: "Booking lead time",
      impact: "positive",
      description: "60 days ahead - optimal timing",
    },
    {
      label: "Confirmed bookings",
      impact: "positive",
      description: "40% of journey already confirmed",
    },
    {
      label: "Seasonal demand",
      impact: "negative",
      description: "Peak summer season pricing",
    },
  ];

  // Compute quick action counts from real journey data
  const quickActionCounts = useMemo(() => {
    // Bookings: use actual Amadeus bookings count
    const bookings = amadeusBookings.length;

    // Destinations: use the comparison items count from the recommendations hook
    const destinations = comparisonItems.length;

    // Upcoming: active journeys (planning or in_progress)
    const upcoming = allJourneys.filter(
      (j) => j.status === "planning" || j.status === "in_progress"
    ).length;

    // Archive: completed or cancelled journeys
    const archived = allJourneys.filter(
      (j) => j.status === "completed" || j.status === "cancelled"
    ).length;

    return { bookings, destinations, upcoming, archived };
  }, [allJourneys, amadeusBookings.length, comparisonItems.length]);

  const quickActions = [
    { icon: Calendar, label: "Bookings", count: quickActionCounts.bookings, color: "text-blue-600 bg-blue-50", action: "bookings" as const },
    { icon: MapPin, label: "Destinations", count: quickActionCounts.destinations, color: "text-emerald-600 bg-emerald-50", action: "destinations" as const },
    { icon: Clock, label: "Upcoming", count: quickActionCounts.upcoming, color: "text-orange-600 bg-orange-50", action: "upcoming" as const },
    { icon: Archive, label: "Archive", count: quickActionCounts.archived, color: "text-purple-600 bg-purple-50", action: "archive" as const },
  ];

  // Derive milestones from the active journey timeline segments
  const journeyMilestones: Milestone[] = useMemo(() => {
    const timeline = journeyTimeline || mockTimelineData;
    // Prefer explicit milestones if the timeline already has them
    if (timeline.milestones?.length) return timeline.milestones;
    // Otherwise derive from segments
    return timeline.segments.map((seg) => ({
      id: seg.id,
      title: seg.title,
      description: seg.subtitle || "",
      dueDate: seg.startTime || seg.endTime,
      completed: seg.status === "completed",
      critical: seg.status === "in_progress" || seg.status === "delayed",
    }));
  }, [journeyTimeline, mockTimelineData]);

  const activeJourney = useMemo(
    () =>
      allJourneys.find(
        (journey) => journey.journey_id === journeyTimeline?.journeyId
      ) || null,
    [allJourneys, journeyTimeline?.journeyId]
  );

  const homeToAirportDemoLocations = useMemo(() => {
    const journeyContext = activeJourney?.context;
    const anchorLatitude =
      journeyContext?.departure_airport_lat ??
      DEFAULT_ADD_AIRPORT_COORDINATES.latitude;
    const anchorLongitude =
      journeyContext?.departure_airport_lon ??
      DEFAULT_ADD_AIRPORT_COORDINATES.longitude;
    const city =
      journeyContext?.departure_city ||
      journeyContext?.location?.city ||
      "Addis Ababa";
    const airportCode =
      journeyContext?.departure_airport_code ||
      journeyContext?.airport_code ||
      "ADD";

    return {
      current_location: null,
      approaching: {
        mode: "approaching" as const,
        latitude: offsetLatitudeByKm(
          anchorLatitude,
          DEMO_APPROACHING_DISTANCE_KM
        ),
        longitude: anchorLongitude,
        city,
        displayName: `Demo: approaching ${airportCode} airport`,
      },
      nearby: {
        mode: "nearby" as const,
        latitude: offsetLatitudeByKm(anchorLatitude, DEMO_NEARBY_DISTANCE_KM),
        longitude: anchorLongitude,
        city,
        displayName: `Demo: nearby ${airportCode} airport`,
      },
      arrived: {
        mode: "arrived" as const,
        latitude: offsetLatitudeByKm(anchorLatitude, DEMO_ARRIVED_DISTANCE_KM),
        longitude: anchorLongitude,
        city,
        displayName: `Demo: arrived at ${airportCode} airport`,
      },
    } satisfies Record<JourneyLocationMode, JourneyLocationOverride | null>;
  }, [activeJourney]);

  useEffect(() => {
    setMilestoneLocationMode("current_location");
  }, [journeyTimeline?.journeyId]);

  useEffect(() => {
    const supportsLocationDemo =
      (journeyTimeline?.currentSegment || "").toLowerCase() === "home_to_airport" ||
      journeyMilestones.some((milestone) => milestone.id === "home_to_airport");

    if (!supportsLocationDemo && milestoneLocationMode !== "current_location") {
      setMilestoneLocationMode("current_location");
    }
  }, [journeyTimeline?.currentSegment, journeyMilestones, milestoneLocationMode]);

  useEffect(() => {
    onJourneyLocationOverrideChange?.(
      homeToAirportDemoLocations[milestoneLocationMode]
    );
  }, [
    homeToAirportDemoLocations,
    milestoneLocationMode,
    onJourneyLocationOverrideChange,
  ]);

  const handleReloadJourneys = useCallback(() => {
    setIsPageLoading(true);
    activeJourneySyncKeyRef.current = null;
    refetchJourneys();
  }, [refetchJourneys]);

  if (allJourneysError && !allJourneysLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-orange-50">
        <div className="mx-auto flex min-h-screen max-w-[480px] items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full overflow-hidden rounded-[32px] border border-rose-200/70 bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(244,114,182,0.18)] backdrop-blur"
          >
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 shadow-inner">
              <span className="text-5xl" aria-hidden="true">૮ ˶ᵔ ᵕ ᵔ˶ ა</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Journey data took a wrong turn</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              We couldn&apos;t finish loading your journey from the FastAPI service. A quick reload usually gets us back on track.
            </p>
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-left text-sm text-rose-700">
              {allJourneysError}
            </div>
            <button
              onClick={handleReloadJourneys}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isPageLoading}
            >
              <RefreshCcw className={`h-4 w-4 ${isPageLoading ? "animate-spin" : ""}`} />
              Reload Journey Data
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (journeyId && journeyAccessMode === "none" && !isPageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="mx-auto flex min-h-screen max-w-[480px] items-center justify-center p-6">
          <div className="w-full rounded-[28px] border border-border bg-card p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-foreground">Journey access unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This shared journey is no longer available for your account, or the link has expired.
            </p>
            <button
              onClick={() => navigate("/journey")}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Back to Journeys
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-muted/20 to-background lg:flex lg:h-screen lg:overflow-hidden lg:items-start lg:justify-center lg:px-6 lg:py-3 xl:px-8">
      {/* Page Loader Overlay */}
      <AnimatePresence>
        {isPageLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center gap-4"
          >
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/20" />
              <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-foreground">Loading Journey</p>
              <p className="text-sm text-muted-foreground animate-pulse">Syncing your travel plans...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute left-[6%] top-8 h-72 w-72 rounded-full bg-sky-300/12 blur-3xl" />
        <div className="absolute right-[12%] top-[14%] h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="absolute bottom-[12%] left-[30%] h-96 w-96 rounded-full bg-orange-300/10 blur-3xl" />
      </div>

      <section className="relative z-10 hidden h-[calc(100vh-1.5rem)] w-full max-w-[750px] flex-1 lg:flex lg:pr-6 xl:pr-8">
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[36px] border border-white/45 bg-white/80 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.08))]" />
          <div className="relative z-10 flex h-full flex-col p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">Journey Mission Control</p>
                <h1 className="mt-3 text-4xl font-semibold leading-tight text-foreground">{journeyHeadline}</h1>
                {/* <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Desktop now surfaces your active route, confidence, risks, and decisions in one calm workspace while the mobile journey flow stays unchanged.
                </p> */}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (!isSharedViewer) setNotificationsModalOpen(true);
                  }}
                  disabled={isSharedViewer}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card/80 shadow-sm transition ${
                    isSharedViewer ? "cursor-not-allowed opacity-50" : "hover:bg-muted/80"
                  }`}
                >
                  <Bell className="h-5 w-5 text-foreground" />
                  {notifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-torch-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                      {notifications.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!isSharedViewer) window.open("/journey/settings", "_blank");
                  }}
                  disabled={isSharedViewer}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card/80 shadow-sm transition ${
                    isSharedViewer ? "cursor-not-allowed opacity-50" : "hover:bg-muted/80"
                  }`}
                >
                  <Settings className="h-5 w-5 text-foreground" />
                </button>
                <button
                  onClick={handleLogout}
                  className="flex h-12 items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted/80"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="rounded-[28px] border border-border/60 bg-card/80 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Confidence</p>
                <p className="mt-3 text-4xl font-semibold text-foreground">{journeyTimeline?.confidence ?? 88}%</p>
                <p className="mt-2 text-sm text-muted-foreground">Signal quality across flights, timeline, and live context.</p>
              </div>
              <div className="rounded-[28px] border border-border/60 bg-card/80 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Departure</p>
                <p className="mt-3 text-4xl font-semibold text-foreground">{daysUntilDeparture ?? "—"}</p>
                <p className="mt-2 text-sm text-muted-foreground">{daysUntilLabel}</p>
              </div>
              <div className="rounded-[28px] border border-border/60 bg-card/80 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Budget</p>
                <p className="mt-3 text-4xl font-semibold text-foreground">{budgetDisplay}</p>
                <p className="mt-2 text-sm text-muted-foreground">Live snapshot of your current trip envelope.</p>
              </div>
            </div>

            <div className="mt-6 grid flex-1 grid-cols-[1.2fr_0.8fr] gap-4">
              <div className="rounded-[32px] border border-border/60 bg-card/85 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Route Overview</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">
                      {journeyTimeline?.origin || "Origin"} → {journeyTimeline?.destination || "Destination"}
                    </h2>
                  </div>
                  <ConfidenceBadge score={journeyTimeline?.confidence ?? 88} variant="pill" showIcon />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-primary/5 p-4">
                    <MapPin className="h-4 w-4 text-primary" />
                    <p className="mt-2 text-lg font-semibold text-foreground">{journeyTimeline?.routeStops?.length || 2}</p>
                    <p className="text-xs text-muted-foreground">Route stops</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/5 p-4">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <p className="mt-2 text-lg font-semibold text-foreground">{confirmedPercent}%</p>
                    <p className="text-xs text-muted-foreground">Confirmed</p>
                  </div>
                  <div className="rounded-2xl bg-amber-500/5 p-4">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <p className="mt-2 text-lg font-semibold text-foreground">{journeyTimeline?.segments?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Journey phases</p>
                  </div>
                </div>

                {/* <div className="mt-5 rounded-[28px] border border-border/60 bg-background/70 p-4">
                  <RiskIndicator
                    level={liveRisk.level}
                    message={liveRisk.message}
                    details={liveRisk.details}
                    compact
                  />
                </div> */}

                <div className="mt-5 rounded-[28px] border border-border/60 bg-background/70 p-4">
                  {hasLiveUpdates ? (
                    <LiveContextBar
                      contextUpdates={contextUpdates}
                      isConnected={isConnected ?? false}
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                          Live Monitoring
                        </p>
                        <p className="mt-2 text-base font-semibold text-foreground">
                          {isJourneyMonitorEnabled
                            ? "Monitoring is starting."
                            : "Journey Monitoring."}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isJourneyMonitorEnabled
                            ? "Real time contexts will be rendered."
                            : "Enable monitoring."}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-4 py-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {isSharedViewer ? "Live" : isJourneyMonitorEnabled ? "On" : "Off"}
                        </span>
                        {!isSharedViewer && (
                          <button
                            onClick={() => setIsJourneyMonitorEnabled(!isJourneyMonitorEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              isJourneyMonitorEnabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                                isJourneyMonitorEnabled ? "translate-x-5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-[32px] border border-border/60 bg-card/85 p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Quick Actions</p>
                  <div className="mt-4 grid gap-3">
                    {/* <button
                      onClick={() => setAllJourneysOpen(true)}
                      className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-muted/60"
                    >
                      <span className="flex items-center gap-3"><Archive className="h-4 w-4 text-primary" /> All journeys</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setTimelineDrawerOpen(true)}
                      className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-muted/60"
                    >
                      <span className="flex items-center gap-3"><Calendar className="h-4 w-4 text-primary" /> Timeline details</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button> */}
                    {!isSharedViewer && (
                      <button
                        onClick={() => setConversationDrawerOpen(true)}
                        className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-muted/60"
                      >
                        <span className="flex items-center gap-3"><MessageSquare className="h-4 w-4 text-primary" /> Journey conversations</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-[32px] border border-border/60 bg-card/85 p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Reliability</p>
                  <div className="mt-4">
                    <TimelineReliability
                      reliability={journeyTimeline?.reliability ?? 82}
                      factors={
                        hasLiveUpdates
                          ? extractReliabilityFactors(contextUpdates!)
                          : mockReliabilityFactors
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Container with mobile width constraint */}
      <div className="relative no-scrollbar z-10 mx-auto max-w-[480px] pb-0 lg:mx-0 lg:flex lg:h-[calc(100vh-1.5rem)] lg:max-w-[560px] lg:flex-[0_0_560px] lg:flex-col lg:overflow-hidden lg:rounded-[36px] lg:border lg:border-white/50 lg:bg-background/88 lg:shadow-[0_26px_80px_rgba(15,23,42,0.16)] lg:backdrop-blur-xl">
        <div className="lg:flex no-scrollbar lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/50"
        >
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/journey")}
                  className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                  title="All Journeys"
                >
                  <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    Journez
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Life is better with Journez.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNotificationsModalOpen(true)}
                  className="relative p-2 rounded-full hover:bg-muted/50 transition-colors"
                  disabled={isSharedViewer}
                >
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-torch-red-500 flex items-center justify-center text-[8px] font-bold text-white">
                      {notifications.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => window.open("/journey/settings", "_blank")}
                  className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                  disabled={isSharedViewer}
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </button>
                {!isSharedViewer && journeyTimeline?.journeyId && (
                  <Coachmark
                    id="journey_home_share_button"
                    title="New Share Feature!"
                    description="Share your live journey with trusted travelers so they can follow updates and trip progress."
                    position="bottom"
                    buttonText="Got it!"
                  >
                    <button
                      onClick={() => setShareDialogOpen(true)}
                      className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                      title="Share live journey"
                    >
                      <Share2 className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </Coachmark>
                )}

                {/* Profile avatar with dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen((p) => !p)}
                    className="h-9 w-9 rounded-full ring-2 ring-border hover:ring-primary/50 transition-all overflow-hidden flex items-center justify-center bg-muted"
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <img src={IMAGES.africanGirlProfile} alt="Profile" className="h-full w-full object-cover" />
                    )}
                  </button>

                  {/* Dropdown menu */}
                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50"
                      >
                        {/* User info header */}
                        <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {currentUser?.firstName || "Guest"} {currentUser?.lastName || ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {currentUser?.email || ""}
                          </p>
                        </div>

                        <div className="py-1">
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              window.open("/journey/settings", "_blank");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                          >
                            <User className="h-4 w-4 text-muted-foreground" />
                            User Profile
                          </button>
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              window.open("/journey/settings", "_blank");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                          >
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            Settings
                          </button>
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              window.open("/support", "_blank", "noopener,noreferrer");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                          >
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            Support
                          </button>
                        </div>

                        <div className="border-t border-border/50 py-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Live Context Bar — real-time location & weather from WebSocket */}
          {contextUpdates && (
            <LiveContextBar
              contextUpdates={contextUpdates}
              isConnected={isConnected ?? false}
            />
          )}
        </motion.header>

        {/* Main Content */}
        <div className="px-4 py-6 space-y-6">
          {/* Journey Status Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
            <div className="relative p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold text-primary">Active Journey</span>
                    {isSharedViewer && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                        Shared Live View
                      </span>
                    )}
                    {connectionStatus && (
                      <div
                        className="flex items-center gap-1"
                        title={`Live updates: ${connectionStatus}`}
                      >
                        <div
                          className={`h-2 w-2 rounded-full ${connectionStatus === "connected"
                            ? "bg-emerald-500 animate-pulse"
                            : connectionStatus === "connecting" ||
                              connectionStatus === "reconnecting"
                              ? "bg-amber-500 animate-pulse"
                              : connectionStatus === "error"
                                ? "bg-red-500"
                                : "bg-gray-400"
                            }`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {connectionStatus === "connected"
                            ? "Live"
                            : connectionStatus === "reconnecting"
                              ? "Reconnecting..."
                              : connectionStatus === "error"
                                ? "Offline"
                                : ""}
                        </span>
                      </div>
                    )}
                    {!isSharedViewer && (
                      <div className="flex items-center gap-2 ml-auto self-center">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Monitor</span>
                        <button
                          onClick={() => setIsJourneyMonitorEnabled(!isJourneyMonitorEnabled)}
                          className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${isJourneyMonitorEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                            }`}
                        >
                          <span
                            className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-sm transition-transform ${isJourneyMonitorEnabled ? 'translate-x-[14px]' : 'translate-x-0.5'
                              }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    {journeyHeadline}
                  </h2>
                  {isSharedViewer && sharedJourneyOwner && (
                    <p className="text-xs text-muted-foreground">
                      Shared by {sharedJourneyOwner.firstName || sharedJourneyOwner.email}
                    </p>
                  )}
                </div>
                <ConfidenceBadge score={journeyTimeline?.confidence ?? 88} variant="pill" showIcon />
              </div>
              {/* Airport logos for origin → destination */}
              {(() => {
                const stops = journeyTimeline?.routeStops;
                const originCode = stops?.length ? stops[0] : journeyTimeline?.origin;
                const destCode = stops?.length ? stops[stops.length - 1] : journeyTimeline?.destination;
                const originLogo = originCode ? getAirportLogo(originCode) : undefined;
                const destLogo = destCode ? getAirportLogo(destCode) : undefined;
                if (!originLogo && !destLogo) return null;
                return (
                  <div className="flex items-center gap-3 mb-3">
                    {originLogo && (
                      <div className="flex items-center gap-1.5">
                        <img
                          src={originLogo}
                          alt={originCode || ""}
                          className="h-7 w-7 rounded-full object-contain bg-white ring-1 ring-border"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <span className="text-xs font-semibold text-muted-foreground">{formatAirportCity(originCode!)}</span>
                      </div>
                    )}
                    {originLogo && destLogo && (
                      <div className="flex-1 flex items-center gap-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-muted-foreground text-xs">✈</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    {destLogo && (
                      <div className="flex items-center gap-1.5">
                        <img
                          src={destLogo}
                          alt={destCode || ""}
                          className="h-7 w-7 rounded-full object-contain bg-white ring-1 ring-border"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <span className="text-xs font-semibold text-muted-foreground">{formatAirportCity(destCode!)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* Progress Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {isInspirationSegment ? (
                  <>
                    <div className="rounded-xl bg-background/50 backdrop-blur-sm p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {daysUntilDeparture ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {daysUntilLabel}
                      </div>
                    </div>
                    <div className="rounded-xl bg-background/50 backdrop-blur-sm p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-600">
                        {journeyTimeline?.travelersCount ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(journeyTimeline?.travelersCount ?? 0) === 1
                          ? "Traveler"
                          : "Travelers"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-background/50 backdrop-blur-sm p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {budgetDisplay}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Budget
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl bg-background/50 backdrop-blur-sm p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-600">{confirmedPercent}%</div>
                      <div className="text-xs text-muted-foreground mt-1">Confirmed</div>
                    </div>
                    <div className="rounded-xl bg-background/50 backdrop-blur-sm p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{daysUntilDeparture ?? "—"}</div>
                      <div className="text-xs text-muted-foreground mt-1">{daysUntilLabel}</div>
                    </div>
                    <div className="rounded-xl bg-background/50 backdrop-blur-sm p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">{budgetDisplay}</div>
                      <div className="text-xs text-muted-foreground mt-1">Budget</div>
                    </div>
                  </>
                )}
              </div>

              {/* Current Status */}
              <RiskIndicator
                level={liveRisk.level}
                message={liveRisk.message}
                details={liveRisk.details}
                compact
              />

              {!isSharedViewer && sharedPresence.length > 0 && (
                <div className="mt-4 flex items-end justify-end">
                  <Coachmark
                    id="journey_home_shared_users"
                    title="Shared Journey Viewers"
                    description="These travelers have access to your shared journey. The status dot shows who is watching live."
                    position="top"
                    buttonText="Got it!"
                  >
                    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/55 px-3 py-2 backdrop-blur-sm">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Shared
                      </span>
                      <div className="flex -space-x-2">
                        {sharedPresence.slice(0, 5).map((share) => {
                          const user = share.recipientUserId;
                          const photoSrc =
                            user?.photo
                              ? user.photo.startsWith("http")
                                ? user.photo
                                : `${backendUrl}${user.photo}`
                              : null;

                          return (
                            <div
                              key={share._id}
                              className="relative"
                              title={`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || share.recipientEmail}
                            >
                              {photoSrc ? (
                                <img
                                  src={photoSrc}
                                  alt={user?.email || share.recipientEmail}
                                  className="h-9 w-9 rounded-full border-2 border-background object-cover shadow-sm"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-xs font-semibold text-primary shadow-sm">
                                  {getUserInitials(user)}
                                </div>
                              )}
                              <span
                                className={`absolute -bottom-0.5 left-0 h-3.5 w-3.5 rounded-full border-2 border-background ${
                                  share.isWatching ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                            </div>
                          );
                        })}
                        {sharedPresence.length > 5 && (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground shadow-sm">
                            +{sharedPresence.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  </Coachmark>
                </div>
              )}
            </div>
          </motion.div>

          {/* AI Recommended Insights Slider */}
          {recommendations && recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pl-0 py-2 px-4"
            >
              {recommendations.map((rec, idx) => (
                <div key={idx} className="w-[85%] flex-shrink-0 snap-center first:scroll-ml-4 last:scroll-mr-4">
                  <RecommendationMessage
                    recommendation={rec}
                    onAction={(rec) => {
                      setReplySource(rec);
                      setChatDrawerOpen(true);
                    }}
                  />
                </div>
              ))}
            </motion.div>
          )}


          {/* Saved Recommendations (Flights, Hotels & Cars) - Tabbed View */}
          {(journeyTimeline?.savedFlights?.length || 0) + (journeyTimeline?.savedHotels?.length || 0) + (journeyTimeline?.savedCars?.length || 0) > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="px-4 pt-4"
            >
              {/* Tab Header */}
              {([
                (journeyTimeline?.savedFlights?.length || 0) > 0,
                (journeyTimeline?.savedHotels?.length || 0) > 0,
                (journeyTimeline?.savedCars?.length || 0) > 0,
              ].filter(Boolean).length > 1) && (
                <div className="flex items-center gap-1 mb-3 bg-muted/40 p-1 rounded-xl w-fit">
                  {(journeyTimeline?.savedFlights?.length || 0) > 0 && (
                    <button
                      onClick={() => setActiveComparisonTab("transport")}
                      className={`relative px-4 py-1.5 text-xs font-medium transition-colors ${activeComparisonTab === "transport" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {activeComparisonTab === "transport" && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-primary rounded-lg"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10">Flights</span>
                    </button>
                  )}
                  {(journeyTimeline?.savedHotels?.length || 0) > 0 && (
                    <button
                      onClick={() => setActiveComparisonTab("accommodation")}
                      className={`relative px-4 py-1.5 text-xs font-medium transition-colors ${activeComparisonTab === "accommodation" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {activeComparisonTab === "accommodation" && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-primary rounded-lg"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10">Hotels</span>
                    </button>
                  )}
                  {(journeyTimeline?.savedCars?.length || 0) > 0 && (
                    <button
                      onClick={() => setActiveComparisonTab("car")}
                      className={`relative px-4 py-1.5 text-xs font-medium transition-colors ${activeComparisonTab === "car" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {activeComparisonTab === "car" && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-primary rounded-lg"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10">Cars</span>
                    </button>
                  )}
                </div>
              )}

              {/* Header Label (if only one category exists) */}
              {([
                (journeyTimeline?.savedFlights?.length || 0) > 0,
                (journeyTimeline?.savedHotels?.length || 0) > 0,
                (journeyTimeline?.savedCars?.length || 0) > 0,
              ].filter(Boolean).length === 1) && (
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {(journeyTimeline?.savedFlights?.length || 0) > 0
                        ? "Saved Flights"
                        : (journeyTimeline?.savedHotels?.length || 0) > 0
                          ? "Saved Hotels"
                          : "Saved Cars"}
                    </h3>
                  </div>
                )}

              <AnimatePresence mode="wait">
                {activeComparisonTab === "transport" && journeyTimeline?.savedFlights && journeyTimeline.savedFlights.length > 0 ? (
                  <motion.div
                    key="flights"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ComparisonView
                      items={journeyTimeline.savedFlights}
                      comparisonType="transport"
                      activeJourneyId={journeyTimeline.journeyId}
                      onExpandToModal={isSharedViewer ? undefined : () => {
                        setComparisonModalItems(journeyTimeline.savedFlights!);
                        setComparisonModalType("transport");
                        setComparisonModalInitialStep(undefined);
                        setComparisonModalInitialItem(null);
                        setComparisonModalOpen(true);
                      }}
                      onItemClick={isSharedViewer ? undefined : (item) => {
                        setComparisonModalItems(journeyTimeline.savedFlights!);
                        setComparisonModalType("transport");
                        setComparisonModalInitialStep(1);
                        setComparisonModalInitialItem(item);
                        setComparisonModalOpen(true);
                      }}
                      readOnly={isSharedViewer}
                    />
                  </motion.div>
                ) : activeComparisonTab === "accommodation" && journeyTimeline?.savedHotels && journeyTimeline.savedHotels.length > 0 ? (
                    <motion.div
                      key="hotels"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ComparisonView
                        items={journeyTimeline.savedHotels}
                        comparisonType="accommodation"
                        activeJourneyId={journeyTimeline.journeyId}
                        onExpandToModal={isSharedViewer ? undefined : () => {
                          setComparisonModalItems(journeyTimeline.savedHotels!);
                          setComparisonModalType("accommodation");
                          setComparisonModalInitialStep(undefined);
                          setComparisonModalInitialItem(null);
                          setComparisonModalOpen(true);
                        }}
                        onItemClick={isSharedViewer ? undefined : (item) => {
                          setComparisonModalItems(journeyTimeline.savedHotels!);
                          setComparisonModalType("accommodation");
                          setComparisonModalInitialStep(1);
                          setComparisonModalInitialItem(item);
                          setComparisonModalOpen(true);
                        }}
                        readOnly={isSharedViewer}
                      />
                    </motion.div>
                  ) : (
                  activeComparisonTab === "car" && journeyTimeline?.savedCars && journeyTimeline.savedCars.length > 0 && (
                    <motion.div
                      key="cars"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ComparisonView
                        items={journeyTimeline.savedCars}
                        comparisonType="car"
                        activeJourneyId={journeyTimeline.journeyId}
                        onExpandToModal={isSharedViewer ? undefined : () => {
                          setComparisonModalItems(journeyTimeline.savedCars!);
                          setComparisonModalType("car");
                          setComparisonModalInitialStep(undefined);
                          setComparisonModalInitialItem(null);
                          setComparisonModalOpen(true);
                        }}
                        onItemClick={isSharedViewer ? undefined : (item) => {
                          setComparisonModalItems(journeyTimeline.savedCars!);
                          setComparisonModalType("car");
                          setComparisonModalInitialStep(1);
                          setComparisonModalInitialItem(item);
                          setComparisonModalOpen(true);
                        }}
                        readOnly={isSharedViewer}
                      />
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </motion.div>
          )}



          {/* Journey Timeline */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-border bg-card shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Journey Timeline</h3>
              <button
                onClick={() => {
                  if (!isSharedViewer) setAllJourneysOpen(true);
                }}
                disabled={isSharedViewer}
                className={`flex items-center gap-1 text-xs ${
                  isSharedViewer
                    ? "cursor-not-allowed text-muted-foreground"
                    : "text-primary hover:underline"
                }`}
              >
                View All
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <JourneyTimeline data={journeyTimeline || mockTimelineData} />
          </motion.div>

          {/* Milestone Tracker */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-border bg-card shadow-sm p-6"
          >
            <MilestoneTracker
              milestones={journeyMilestones}
              onDetailsClick={isSharedViewer ? undefined : () => setTimelineDrawerOpen(true)}
              locationMode={milestoneLocationMode}
              onLocationModeChange={setMilestoneLocationMode}
              readOnly={isSharedViewer}
            />
          </motion.div>

          {/* Timeline Reliability */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-border bg-card shadow-sm p-6"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Journey Reliability
            </h3>
            <TimelineReliability
              reliability={journeyTimeline?.reliability ?? 82}
              factors={
                hasLiveUpdates
                  ? extractReliabilityFactors(contextUpdates!)
                  : mockReliabilityFactors
              }
            />
          </motion.div>

          {/* Route Map */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
          >
            <div className="p-4 pb-0">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Route Map
              </h3>
            </div>
            <MapView
              userLocation={
                contextUpdates?.location?.data as
                | { latitude: number; longitude: number }
                | undefined
              }
              routeStops={journeyTimeline?.routeStops}
              origin={journeyTimeline?.origin}
              destination={journeyTimeline?.destination}
            />
          </motion.div>

        </div>

        {/* Sticky Chat Bar — teal tint */}
        <div className="sticky bottom-0 z-40 bg-teal-500/[0.05] border-t border-teal-300/15 backdrop-blur-md">
          <HomeBottomChatBar
            onMapClick={() => { }} // Handle map click if needed or hide
            onConversationsClick={() => {
              if (!isSharedViewer) setConversationDrawerOpen(true);
            }}
            onNewJourneyClick={newJourney.open}
            onSupportClick={() => { window.open("/support", "_blank", "noopener,noreferrer"); }}
            onSendMessage={(msg: string) => {
              setInitialChatMessage(msg);
              setInitialChatMessageSource("text");
              setChatDrawerOpen(true);
            }}
            onMicClick={() => setSpeechModalOpen(true)}
            disabled={isPageLoading || isSharedViewer}
          />
        </div>
        </div>
      </div>

      <JourneyShareDialog
        open={shareDialogOpen}
        journeyId={journeyTimeline?.journeyId}
        onClose={() => setShareDialogOpen(false)}
      />

      {/* Comparison Modal */}
      <ComparisonModal
        open={comparisonModalOpen}
        items={comparisonModalItems.length > 0 ? comparisonModalItems : comparisonItems}
        comparisonType={comparisonModalItems.length > 0 ? comparisonModalType : comparisonType}
        initialStep={comparisonModalInitialStep}
        initialSelectedItem={comparisonModalInitialItem}
        onClose={() => {
          setComparisonModalOpen(false);
          setComparisonModalInitialStep(undefined);
          setComparisonModalInitialItem(null);
        }}
        onDone={handleComparisonDone}
      />

      {/* Flight Booking Modal (starts at Passenger Details with pre-selected flight) */}
      <FlightModal
        open={flightModalOpen}
        flights={allFlightsFromComparison}
        initialFlight={flightForBooking}
        onBookingSuccess={handleBookingSuccess}
        journeyId={journeyTimeline?.journeyId}
        onClose={() => {
          setFlightModalOpen(false);
          setFlightForBooking(null);
        }}
      />

      <HomeNewJourneyChatDrawer
        open={chatDrawerOpen}
        onClose={() => {
          setChatDrawerOpen(false);
          setResumeConversationId(null);
          setReplySource(null);
        }}
        initialMessage={initialChatMessage}
        initialMessageSource={initialChatMessageSource}
        replySource={replySource}
        onClearReply={() => setReplySource(null)}
        journeyId={journeyTimeline?.journeyId || null}
        journeyName={journeyHeadline}
        originCode={journeyTimeline?.routeStops?.length ? journeyTimeline.routeStops[0] : journeyTimeline?.origin}
        destCode={journeyTimeline?.routeStops?.length ? journeyTimeline.routeStops[journeyTimeline.routeStops.length - 1] : journeyTimeline?.destination}
        recommendations={recommendations}
        userId={currentUserId}
        userData={currentUser}
        resumeConversationId={resumeConversationId}
        onConversationsClick={() => {
          setChatDrawerOpen(false);
          setConversationDrawerOpen(true);
        }}
        disabled={isPageLoading || isSharedViewer}
      />
      <SpeechToTextModal
        open={speechModalOpen}
        onClose={() => setSpeechModalOpen(false)}
        onDone={(text) => {
          if (!text.trim()) {
            setSpeechModalOpen(false);
            return;
          }
          setInitialChatMessage(text.trim());
          setInitialChatMessageSource("voice");
          setConversationDrawerOpen(false);
          setChatDrawerOpen(true);
          setSpeechModalOpen(false);
        }}
      />
      {/* Conversation Drawer — journey-scoped chat history */}
      <HomeConversationDrawer
        open={conversationDrawerOpen}
        onClose={() => setConversationDrawerOpen(false)}
        journeyId={journeyTimeline?.journeyId || null}
        journeyName={journeyHeadline}
        userId={currentUserId}
        onConversationSelect={(convId: string) => {
          setResumeConversationId(convId);
          setInitialChatMessage("");
          setInitialChatMessageSource("text");
          setChatDrawerOpen(true);
        }}
        disabled={isPageLoading || isSharedViewer}
      />

      {/* New Journey Drawer */}
      <NewJourneyModal
        open={newJourney.isOpen}
        initialBudget={defaultBudget}
        isCreating={newJourney.isCreating}
        onClose={newJourney.close}
        onSubmit={newJourney.handleSubmit}
        onOpenSettings={() => window.open("/journey/settings", "_blank")}
      />

      {/* Notifications Modal — opened from bell icon */}
      <NotificationsModal
        open={notificationsModalOpen}
        notifications={notifications}
        onClose={() => setNotificationsModalOpen(false)}
        onDismiss={(id) => {
          setNotifications((prev) => prev.filter((b) => b.id !== id));
          const jId = journeyTimeline?.journeyId;
          if (jId) {
            fetch(`${backendUrl}/api/client/journey-notifications/${encodeURIComponent(jId)}/dismiss/${encodeURIComponent(id)}`, {
              method: "PATCH",
              headers: getAuthHeaders(),
            }).catch(() => { });
          }
        }}
        onClearAll={() => {
          setNotifications([]);
          setNotificationsModalOpen(false);
          const jId = journeyTimeline?.journeyId;
          if (jId) {
            fetch(`${backendUrl}/api/client/journey-notifications/${encodeURIComponent(jId)}/dismiss-all`, {
              method: "PATCH",
              headers: getAuthHeaders(),
            }).catch(() => { });
          }
        }}
      />

      {/* All Journeys Drawer — opened from "View All" on timeline section */}
      <AllJourneysDrawer
        isOpen={allJourneysOpen}
        onClose={() => setAllJourneysOpen(false)}
        journeys={allJourneys}
        isLoading={allJourneysLoading}
        activeJourneyId={journeyTimeline?.journeyId}
        initialFilter={drawerInitialFilter}
        onSelectJourney={(journey: JourneyItem) => {
          // Persist as active in DB (cross-device support)
          if (currentUserId) {
            fetchAiWithFallback(
              `/api/ai/journey/${encodeURIComponent(journey.journey_id)}/set-active`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: currentUserId }),
              }
            )
              .then(() => refetchJourneys())
              .catch((err) => console.warn("[JourneyHomePage] Failed to set active journey:", err));
          }

          const timelineData = buildTimelineFromJourney(journey);

          // Stop old monitoring, switch to new journey
          const oldId = journeyTimeline?.journeyId;
          if (oldId && oldId !== journey.journey_id) stopMonitoring(oldId);

          setJourneyTimeline(timelineData);
          onJourneyIdChange?.(journey.journey_id);
          ensureMonitoring(journey.journey_id);
          setAllJourneysOpen(false);
        }}
        onArchiveJourney={(journeyId: string) => {
          // Show red warning confirmation before archiving
          toast.custom(
            (t) => (
              <CalmNotificationToast
                t={t}
                priority="warning"
                title="Archive Journey?"
                message="This journey will be archived and moved to cancelled. This action cannot be undone."
                actionLabel="Yes, archive"
                onAction={async () => {
                  try {
                    const res = await fetchAiWithFallback(
                      `/api/ai/journey/${encodeURIComponent(journeyId)}/archive`,
                      { method: "PATCH" }
                    );
                    const data = await res.json().catch(() => null);
                    if (res.ok && data?.ok) {
                      refetchJourneys();
                      toast.custom(
                        (t2) => <CalmNotificationToast t={t2} priority="info" title="Journey Archived" message="The journey has been archived." />,
                        { duration: 3000, position: "top-center" }
                      );
                    } else {
                      toast.custom(
                        (t2) => <CalmNotificationToast t={t2} priority="action_required" title="Archive Failed" message={data?.detail || "Could not archive journey."} />,
                        { duration: 4000, position: "top-center" }
                      );
                    }
                  } catch (err: any) {
                    toast.custom(
                      (t2) => <CalmNotificationToast t={t2} priority="action_required" title="Archive Failed" message={err.message || "Network error"} />,
                      { duration: 4000, position: "top-center" }
                    );
                  }
                }}
              />
            ),
            { duration: Infinity, position: "top-center" }
          );
        }}
        onDeleteJourney={async (journeyId: string) => {
          try {
            const res = await fetchAiWithFallback(
              `/api/ai/journey/${encodeURIComponent(journeyId)}`,
              { method: "DELETE" }
            );
            const data = await res.json().catch(() => null);
            if (res.ok && data?.ok) {
              // If we deleted the active journey, clear it
              if (journeyTimeline?.journeyId === journeyId) {
                setJourneyTimeline(null);
                onJourneyIdChange?.(null);
                window.dispatchEvent(new Event("umoja_journey_updated"));
              }
              refetchJourneys();
              toast.custom(
                (t) => <CalmNotificationToast t={t} priority="info" title="Journey Deleted" message="The journey has been removed." />,
                { duration: 3000, position: "top-center" }
              );
            } else {
              toast.custom(
                (t) => <CalmNotificationToast t={t} priority="action_required" title="Delete Failed" message={data?.detail || "Could not delete journey."} />,
                { duration: 4000, position: "top-center" }
              );
            }
          } catch (err: any) {
            toast.custom(
              (t) => <CalmNotificationToast t={t} priority="action_required" title="Delete Failed" message={err.message || "Network error"} />,
              { duration: 4000, position: "top-center" }
            );
          }
        }}
        onDeleteAll={() => {
          // Show red warning confirmation before deleting all
          toast.custom(
            (t) => (
              <CalmNotificationToast
                t={t}
                priority="warning"
                title="Delete All Journeys?"
                message="This will permanently delete ALL your journey history. This action cannot be undone."
                actionLabel="Yes, delete everything"
                onAction={async () => {
                  if (!currentUserId) return;
                  try {
                    const res = await fetchAiWithFallback(
                      `/api/ai/journey/user/${encodeURIComponent(currentUserId)}/all`,
                      { method: "DELETE" }
                    );
                    const data = await res.json().catch(() => null);
                    if (res.ok && data?.ok) {
                      // Clear active journey from UI
                      setJourneyTimeline(null);
                      onJourneyIdChange?.(null);
                      window.dispatchEvent(new Event("umoja_journey_updated"));

                      refetchJourneys();
                      toast.custom(
                        (t2) => <CalmNotificationToast t={t2} priority="info" title="All Journeys Deleted" message={`Successfully removed ${data.deleted_count} journeys.`} />,
                        { duration: 3000, position: "top-center" }
                      );
                    } else {
                      toast.custom(
                        (t2) => <CalmNotificationToast t={t2} priority="action_required" title="Delete Failed" message={data?.detail || "Could not delete all journeys."} />,
                        { duration: 4000, position: "top-center" }
                      );
                    }
                  } catch (err: any) {
                    toast.custom(
                      (t2) => <CalmNotificationToast t={t2} priority="action_required" title="Delete Failed" message={err.message || "Network error"} />,
                      { duration: 4000, position: "top-center" }
                    );
                  }
                }}
              />
            ),
            { duration: Infinity, position: "top-center" }
          );
        }}
      />

      {/* Bookings Drawer — opened from "Bookings" quick action */}
      <BookingsDrawer
        isOpen={bookingsDrawerOpen}
        onClose={() => setBookingsDrawerOpen(false)}
        bookings={amadeusBookings}
        isLoading={allJourneysLoading}
      />

      {/* Timeline Drawer — opened from MilestoneTracker "Details" */}
      <TimelineDrawer
        timeline={journeyTimeline || mockTimelineData}
        isOpen={timelineDrawerOpen}
        onClose={() => setTimelineDrawerOpen(false)}
      />
    </div>
  );
};

export default JourneyHomePage;
