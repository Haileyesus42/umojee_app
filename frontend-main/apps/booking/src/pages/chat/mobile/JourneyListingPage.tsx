/**
 * Journey Listing Page
 *
 * Full-viewport, no-scroll mobile page.
 * Top 65% is a dome-shaped hero with greeting, departure & location/weather widgets.
 * Bottom 35% has tabs + three poker-stacked card decks that fan out on tap.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Sparkles,
  Sun,
  Luggage,
  Plus,
  X,
  Plane,
  MapPin,
  Ticket,
  Navigation,
  Building2,
  Car,
  Globe,
  Star,
  ChevronRight,
  Droplets,
  Settings,
  User,
  LogOut,
  Menu,
  Map,
  MessageSquare,
  Mic,
  ChevronLeft,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Heart,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import { useAllJourneys } from "./hooks/useAllJourneys";
import type { JourneyItem, AmadeusBooking } from "./hooks/useAllJourneys";
import { useDestinationRecommendations } from "./hooks/useDestinationRecommendations";
import { useFlightRecommendations } from "./hooks/useFlightRecommendations";
import { getAirlineImage, getComparisonFallbackImage, DEFAULT_FLIGHT_IMAGES } from "./types/phase7";
import type { ComparisonItem } from "./types/phase7";
import { getLocalStorageValue } from "../../../lib/utils";
import { removeLocalStorageValue } from "../../../lib/utils";
import { IMAGES } from "../../../assets";
import { initializeTheme } from "./JourneySettingsPage";
import { cookies } from "../../..";
import { logout } from "../../../store/auth/authSlice";
import NotificationBanner from "./components/NotificationBanner";
import type { BannerConfig } from "./types/phase7";
import NotificationsModal from "./modals/NotificationsModal";
import NewJourneyModal from "./modals/NewJourneyModal";
import NewJourneyChatDrawer from "./modals/NewJourneyChatDrawer";
import SpeechToTextModal from "./modals/SpeechToTextModal";
import ConversationDrawer from "./components/ConversationDrawer";
import BottomChatBar from "./components/BottomChatBar";
import { useNewJourney } from "./hooks/useNewJourney";
import { formatAirportCity } from "./utils/airportCityMap";
import { getPlaceCategoryImage } from "./utils/placeCategoryImages";
import { getHotelCategoryImage } from "./utils/hotelCategoryImages";
import NearbyPlacesMap from "./components/NearbyPlacesMap";
import { useUserLocation } from "./hooks/useUserLocation";
import type { NearbyPlace } from "./hooks/useNearbyPlaces";
import { useWeatherForecast } from "./hooks/useWeatherForecast";
import type { WeatherData } from "./hooks/useWeatherForecast";
import CalmNotificationToast from "./components/CalmNotificationToast";
import { fetchAiWithFallback } from "./utils/aiBackend";


const backendUrl =
  (process.env.REACT_APP_BACKEND_URL as string) || "http://localhost:4001";
// ─── Helpers ────────────────────────────────────────────────────────────────

function getDestinationLabel(journey: JourneyItem): string {
  const fs = journey.context?.flight_status;
  if (fs?.arrival_airport) {
    const city = formatAirportCity(fs.arrival_airport);
    return city !== fs.arrival_airport ? city : fs.arrival_airport;
  }
  if (journey.context?.planned_destination) return journey.context.planned_destination;
  for (const seg of journey.segments || []) {
    if (seg.context?.destination_airport) return formatAirportCity(seg.context.destination_airport);
    if (seg.context?.arrival_airport) return formatAirportCity(seg.context.arrival_airport);
  }
  return "New Journey";
}

function getOriginLabel(journey: JourneyItem): string {
  const fs = journey.context?.flight_status;
  if (fs?.departure_airport) return fs.departure_airport;
  if (journey.context?.departure_city) return journey.context.departure_city;
  if (journey.context?.airport_code) return journey.context.airport_code;
  return "";
}

function formatPrice(price?: number, currency?: string): string | null {
  if (!price) return null;
  const cur = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${cur} ${price.toFixed(0)}`;
  }
}

function getBookingDestinationLabel(booking?: AmadeusBooking | null, journey?: JourneyItem | null): string {
  if (booking) {
    const segments = booking.itineraries?.[0]?.segments || [];
    if (segments.length === 0) return "Flight Booking";
    const origin = segments[0].departure?.iataCode || "???";
    const stops = segments.slice(0, -1).map(s => s.arrival?.iataCode).filter(Boolean);
    const destination = segments[segments.length - 1].arrival?.iataCode || "???";
    if (stops.length > 0) return `${origin} → ${stops.join(" → ")} → ${destination}`;
    return `${origin} → ${destination}`;
  }

  const fs = journey?.context?.flight_status;
  if (fs?.departure_airport && fs?.arrival_airport) {
    return `${fs.departure_airport} → ${fs.arrival_airport}`;
  }

  if (journey) return getDestinationLabel(journey);
  return "Flight Booking";
}

function getBookingDates(booking?: AmadeusBooking | null, journey?: JourneyItem | null): string {
  let dAt: string | undefined;
  let aAt: string | undefined;

  if (booking) {
    dAt = booking.itineraries?.[0]?.segments?.[0]?.departure?.at;
    aAt = booking.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.at;
  } else if (journey?.context?.flight_status) {
    const fs = journey.context.flight_status;
    dAt = fs.departure_time;
    aAt = fs.arrival_time;
  }

  if (dAt && aAt) {
    const dDate = new Date(dAt);
    const aDate = new Date(aAt);
    const dStr = dDate.toLocaleDateString("en", { month: "short", day: "numeric" });
    const dTime = dDate.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
    const aStr = aDate.toLocaleDateString("en", { month: "short", day: "numeric" });
    const aTime = aDate.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });

    if (dStr === aStr) return `${dStr}, ${dTime} – ${aTime}`;
    return `${dStr} ${dTime} – ${aStr} ${aTime}`;
  }

  if (journey?.context?.start_date && journey?.context?.end_date) {
    const start = new Date(journey.context.start_date).toLocaleDateString("en", { month: "short", day: "numeric" });
    const end = new Date(journey.context.end_date).toLocaleDateString("en", { month: "short", day: "numeric" });
    return `${start} — ${end}`;
  }

  return "Dates TBD";
}

function getUserCity(): string {
  try {
    const raw = localStorage.getItem("user_location");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.city || parsed?.address?.city || "Your Location";
    }
  } catch { /* ignore */ }
  return "Your Location";
}

function getBookedFlightImageUrl(bookedFlight: any, index: number): string {
  if (!bookedFlight || typeof bookedFlight !== "object") {
    return DEFAULT_FLIGHT_IMAGES[index % DEFAULT_FLIGHT_IMAGES.length];
  }

  const directImage =
    bookedFlight.imageUrl ||
    bookedFlight.image_url ||
    bookedFlight.airline_image ||
    bookedFlight.airline_logo ||
    (Array.isArray(bookedFlight.imageUrls) ? bookedFlight.imageUrls[0] : undefined) ||
    (Array.isArray(bookedFlight.image_urls) ? bookedFlight.image_urls[0] : undefined);

  if (typeof directImage === "string" && directImage.trim().length > 0) {
    return directImage;
  }

  const mappedBooking: AmadeusBooking = {
    _id:
      bookedFlight.amadeus_order_id ||
      bookedFlight.booking_reference ||
      bookedFlight.id ||
      `journey_booked_flight_${index}`,
    userId: "",
    itineraries: [
      {
        segments: [
          {
            departure: { iataCode: bookedFlight.from_code, at: bookedFlight.departure },
            arrival: { iataCode: bookedFlight.to_code, at: bookedFlight.arrival },
            carrierCode: bookedFlight.airline,
            flightNumber:
              bookedFlight.flight_number?.replace(bookedFlight.airline || "", "").trim() ||
              bookedFlight.flight_number,
          },
        ],
      },
    ],
    rawOrder: bookedFlight.rawOrder,
  };

  return getBookingImageUrl(mappedBooking, index);
}

function getJourneyImageUrl(journey: JourneyItem, index: number): string {
  const savedFlights = Array.isArray((journey as any).saved_flights)
    ? (journey as any).saved_flights
    : [];
  const bookedFlights = Array.isArray((journey as any).booked_flights)
    ? (journey as any).booked_flights
    : [];

  if (journey.status === "planning" && savedFlights.length > 0) {
    return getFlightImageUrl(
      {
        id: savedFlights[0].flight_id || savedFlights[0].id || `${journey.journey_id}_saved_flight_0`,
        airline: savedFlights[0].airline || "",
        flightNumber: savedFlights[0].flight_number || "",
        departure: savedFlights[0].from_code || savedFlights[0].from || savedFlights[0].origin || "",
        arrival: savedFlights[0].to_code || savedFlights[0].to || savedFlights[0].destination || "",
        departureTime: savedFlights[0].departure || "",
        arrivalTime: savedFlights[0].arrival || "",
        price: Number(savedFlights[0].price || 0),
        currency: savedFlights[0].currency || "USD",
        stops: Number(savedFlights[0].stops || 0),
        duration: savedFlights[0].duration || "",
      },
      index,
    );
  }

  if (journey.status === "in_progress" && bookedFlights.length > 0) {
    return getBookedFlightImageUrl(bookedFlights[0], index);
  }

  const fs = journey.context?.flight_status;
  const carrier = fs?.airline || "";
  const flightNo = fs?.flight_number || "";
  if (carrier || flightNo) {
    const fakeItem = {
      id: journey.journey_id, type: "transport" as const, name: `${carrier}${flightNo}`,
      pros: [] as string[], cons: [] as string[],
      metadata: { flightNumber: `${carrier} ${flightNo}`, airline: carrier },
    };
    return getComparisonFallbackImage(fakeItem, index);
  }
  // Fallback to hotel image if present
  if (journey.saved_hotels && journey.saved_hotels.length > 0) {
    const hotel = journey.saved_hotels[0];
    return hotel.imageUrl || getHotelCategoryImage(hotel.name || hotel.hotel_name || "", hotel.id || `hotel_${index}`);
  }
  return DEFAULT_FLIGHT_IMAGES[index % DEFAULT_FLIGHT_IMAGES.length];
}

function getBookingImageUrl(booking: AmadeusBooking, index: number): string {
  const firstSeg = booking.itineraries?.[0]?.segments?.[0];
  const carrier = firstSeg?.carrierCode || "";
  const flightNo = firstSeg?.flightNumber || "";
  if (carrier) {
    const fakeItem = {
      id: booking._id, type: "transport" as const, name: `${carrier}${flightNo}`,
      pros: [] as string[], cons: [] as string[],
      metadata: { flightNumber: `${carrier} ${flightNo}`, airline: carrier },
    };
    return getComparisonFallbackImage(fakeItem, index);
  }
  return DEFAULT_FLIGHT_IMAGES[index % DEFAULT_FLIGHT_IMAGES.length];
}

function getFlightImageUrl(flight: FlightItem, index: number): string {
  const carrier = flight.airline || "";
  const flightNo = flight.flightNumber || "";
  if (carrier || flightNo) {
    const fakeItem = {
      id: flight.id, type: "transport" as const, name: `${carrier}${flightNo}`,
      pros: [] as string[], cons: [] as string[],
      metadata: { flightNumber: `${carrier} ${flightNo}`, airline: carrier },
    };
    return getComparisonFallbackImage(fakeItem, index);
  }
  return DEFAULT_FLIGHT_IMAGES[index % DEFAULT_FLIGHT_IMAGES.length];
}

// ─── Tab types ──────────────────────────────────────────────────────────────

export interface FlightItem {
  id: string;
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency: string;
  stops: number;
  duration: string;
  itineraries?: any[];
  createdAt?: string;
  journeyId?: string;
}

type TabKey = "journeys" | "bookings" | "flights" | "places" | "aspirations" | "hotels" | "cars";

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "journeys", label: "Journeys", icon: <Luggage className="h-3.5 w-3.5" /> },
  { key: "bookings", label: "Bookings", icon: <Ticket className="h-3.5 w-3.5" /> },
  { key: "flights", label: "Flights", icon: <Plane className="h-3.5 w-3.5" /> },
  { key: "places", label: "Places", icon: <Globe className="h-3.5 w-3.5" /> },
  { key: "aspirations", label: "Aspirations", icon: <Heart className="h-3.5 w-3.5" /> },
  { key: "hotels", label: "Hotels", icon: <Building2 className="h-3.5 w-3.5" /> },
  { key: "cars", label: "Cars", icon: <Car className="h-3.5 w-3.5" /> },
];

// ─── Status styling ─────────────────────────────────────────────────────────

const journeyAccents: Record<string, { bg: string; border: string; badge: string; badgeText: string }> = {
  planning: { bg: "bg-gradient-to-br from-blue-50 to-blue-100/60", border: "border-blue-200/80", badge: "bg-blue-100", badgeText: "text-blue-700" },
  in_progress: { bg: "bg-gradient-to-br from-amber-50 to-amber-100/60", border: "border-amber-200/80", badge: "bg-amber-100", badgeText: "text-amber-700" },
  completed: { bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/60", border: "border-emerald-200/80", badge: "bg-emerald-100", badgeText: "text-emerald-700" },
  cancelled: { bg: "bg-gradient-to-br from-gray-50 to-gray-100/60", border: "border-gray-200/80", badge: "bg-gray-100", badgeText: "text-gray-600" },
};

const statusLabels: Record<string, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ─── Hotel type ──────────────────────────────────────────────────────────────

type HotelItem = {
  id: string;
  name: string;
  cityCode: string;
  address: string;
  rating: number;
  price: number;
  currency: string;
  description: string;
  amenities: string[];
  imageUrl: string;
  /** Journey this hotel came from */
  journeyId?: string;
};

type CarItem = {
  id: string;
  brand: string;
  model: string;
  pricePerDay: number;
  seats: number;
  bags: number;
  transmission: string;
  fuel: string;
  pickup: string;
  dropoff: string;
  description: string;
  imageUrl: string;
};

type PlaceItem = {
  id: string;
  name: string;
  country: string;
  description: string;
  category: string;
  rating: number;
  imageUrl: string;
};

type AspirationItem = PlaceItem & {
  aspirationId: string;
  likedAt?: string;
};

// ─── Dummy data for Cars & Places (until real API data is available) ─────────

const DUMMY_CARS: CarItem[] = [
  { id: "car-1", brand: "Tesla", model: "Model 3", pricePerDay: 95, seats: 5, bags: 3, transmission: "Automatic", fuel: "Electric", pickup: "CDG Airport", dropoff: "CDG Airport", description: "Electric sedan with Autopilot", imageUrl: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=400&q=80" },
  { id: "car-2", brand: "BMW", model: "X3", pricePerDay: 110, seats: 5, bags: 4, transmission: "Automatic", fuel: "Hybrid", pickup: "Downtown", dropoff: "Downtown", description: "Comfortable SUV for family trips", imageUrl: "https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=400&q=80" },
  { id: "car-3", brand: "Volkswagen", model: "Golf", pricePerDay: 65, seats: 5, bags: 2, transmission: "Manual", fuel: "Petrol", pickup: "Train Station", dropoff: "Train Station", description: "Compact hatchback, easy to park", imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80" },
];

// CSS variable overrides for white text on image backgrounds
const imageCardVars = {
  "--foreground": "0 0% 100%",
  "--muted-foreground": "0 0% 85%",
} as React.CSSProperties;

const PLACE_REFETCH_LIMIT_PER_DAY = 3;

function getLocalDateKey(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function getPlaceRefetchStorageKey(userId: string | null): string {
  return `place_recs_refetch_${userId || "guest"}`;
}

// ─── Card content renderers ─────────────────────────────────────────────────

const JourneyCardContent: React.FC<{ journey: JourneyItem }> = ({ journey }) => {
  const fs = journey.context?.flight_status;
  const destination = getDestinationLabel(journey);
  const origin = getOriginLabel(journey);
  const isInspiration = journey.current_segment === "inspiration";
  const priceStr = isInspiration
    ? formatPrice(journey.context?.budget?.max, journey.context?.budget?.currency)
    : formatPrice(fs?.price, fs?.currency);
  const accent = journeyAccents[journey.status] || journeyAccents.planning;

  return (
    <>
      <h4 className="text-sm font-bold text-foreground leading-tight truncate">{destination}</h4>
      {origin && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{origin}</p>}
      {priceStr && (
        <p className="text-[10px] text-emerald-600 font-semibold mt-1">
          {isInspiration ? `Budget: ${priceStr}` : `from ${priceStr}`}
        </p>
      )}
      <div className="mt-auto pt-1 overflow-hidden">
        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold truncate max-w-full ${accent.badge} ${accent.badgeText}`}>
          {statusLabels[journey.status] || journey.status}
        </span>
      </div>
    </>
  );
};

const BookingCardContent: React.FC<{ booking: AmadeusBooking }> = ({ booking }) => {
  const firstSeg = booking.itineraries?.[0]?.segments?.[0];
  const lastSeg = booking.itineraries?.[0]?.segments?.slice(-1)[0];
  const dep = firstSeg?.departure?.iataCode || "—";
  const arr = lastSeg?.arrival?.iataCode || "—";
  const carrier = firstSeg?.carrierCode || "";
  const flightNo = firstSeg?.flightNumber || "";
  const price = booking.price?.grandTotal || booking.price?.total;
  const currency = booking.price?.currency || "USD";
  const ref = booking.bookingReference || booking.referenceNumber;

  return (
    <>
      <h4 className="text-sm font-bold text-foreground leading-tight truncate">
        {formatAirportCity(dep)} → {formatAirportCity(arr)}
      </h4>
      {(carrier || flightNo) && (
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
          <Plane className="h-2.5 w-2.5" />
          {carrier}{flightNo}
        </p>
      )}
      {price && (
        <p className="text-[10px] text-emerald-600 font-semibold mt-1">
          {formatPrice(parseFloat(price), currency)}
        </p>
      )}
      {ref && <p className="text-[9px] text-muted-foreground mt-0.5 truncate">PNR: {ref}</p>}
      <div className="mt-auto pt-1 overflow-hidden">
        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-primary/10 text-primary truncate max-w-full">
          Booked
        </span>
      </div>
    </>
  );
};

const FlightCardContent: React.FC<{ item: FlightItem }> = ({ item }) => {
  const price = item.price;
  const currency = item.currency || "USD";
  const airline = item.airline;
  const flightNumber = item.flightNumber;

  return (
    <>
      <h4 className="text-sm font-bold text-foreground leading-tight truncate">
        {item.departure} → {item.arrival}
      </h4>
      {(airline || flightNumber) && (
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
          <Plane className="h-2.5 w-2.5" />
          {airline} {flightNumber}
        </p>
      )}
      {price != null && (
        <p className="text-[10px] text-emerald-600 font-semibold mt-1">
          from {formatPrice(price, currency)}
        </p>
      )}
      {item.duration && (
        <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{item.duration}</p>
      )}
      <div className="mt-auto pt-1 overflow-hidden">
        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-violet-100 text-violet-700 truncate max-w-full">
          Flight
        </span>
      </div>
    </>
  );
};

const PlaceCardContent: React.FC<{ place: PlaceItem }> = ({ place }) => (
  <>
    <h4 className="text-sm font-bold text-foreground leading-tight truncate">{place.name}</h4>
    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{place.country}</p>
    <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{place.description}</p>
    <div className="mt-auto pt-1 flex items-center justify-between gap-1 overflow-hidden">
      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-teal-100 text-teal-700 truncate max-w-[60px]">
        {place.category}
      </span>
      <span className="flex items-center gap-0.5 text-[9px] text-amber-600">
        <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
        {place.rating}
      </span>
    </div>
  </>
);

const HotelCardContent: React.FC<{ hotel: HotelItem }> = ({ hotel }) => (
  <>
    <h4 className="text-sm font-bold text-foreground leading-tight truncate">{hotel.name}</h4>
    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hotel.address}</p>
    <p className="text-[10px] text-emerald-600 font-semibold mt-1 relative z-10 drop-shadow-sm">
      {formatPrice(hotel.price, hotel.currency)}/night
    </p>
    <div className="mt-auto pt-1 flex items-center justify-between gap-1 overflow-hidden">
      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-white/20 text-white backdrop-blur-sm truncate max-w-[60px]">
        {hotel.amenities[0]}
      </span>
      <span className="flex items-center gap-0.5 text-[9px] text-amber-400 shrink-0 drop-shadow-sm">
        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
        {hotel.rating || 0}
      </span>
    </div>
  </>
);

const CarCardContent: React.FC<{ car: CarItem }> = ({ car }) => (
  <>
    <h4 className="text-sm font-bold text-foreground leading-tight truncate">
      {car.brand} {car.model}
    </h4>
    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{car.pickup}</p>
    <p className="text-[10px] text-emerald-600 font-semibold mt-1">
      {formatPrice(car.pricePerDay, "USD")}/day
    </p>
    <div className="mt-auto pt-1 flex items-center justify-between gap-1 overflow-hidden">
      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-cyan-100 text-cyan-700 truncate max-w-[60px]">
        {car.transmission}
      </span>
      <span className="text-[9px] text-muted-foreground shrink-0">{car.seats} seats</span>
    </div>
  </>
);

// ─── Single poker stack ─────────────────────────────────────────────────────

const STACK_CARD_W = "clamp(76px, 20vw, 88px)";
const STACK_CARD_H = "clamp(102px, 25vw, 116px)";
const SPREAD_CARD_W = "clamp(74px, 19vw, 84px)";
const SPREAD_CARD_H = "clamp(98px, 23vw, 108px)";

const PokerStack: React.FC<{
  count: number;
  accentBg: string;
  accentBorder: string;
  topCard: React.ReactNode;
  imageUrl?: string;
  onClick: () => void;
}> = ({ count, accentBg, accentBorder, topCard, imageUrl, onClick }) => {
  const maxVisible = Math.min(count, 4);

  return (
    <div
      onClick={onClick}
      className="relative mt-2 shrink-0 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={{ width: `calc(${STACK_CARD_W} + 16px)`, height: `calc(${STACK_CARD_H} + 16px)` }}
    >
      {Array.from({ length: maxVisible }).map((_, i) => {
        if (i === maxVisible - 1) return null;
        const stackPos = maxVisible - 1 - i;
        return (
          <motion.div
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{
              y: stackPos * -5,
              x: stackPos * 3,
              opacity: 0.6 + i * 0.1,
              rotate: (stackPos - 1) * 1.5,
            }}
            transition={{ type: "spring", stiffness: 280, damping: 22, delay: i * 0.04 }}
            className={`absolute top-2 left-2 rounded-xl border ${accentBorder} overflow-hidden shadow-sm`}
            style={{ width: STACK_CARD_W, height: STACK_CARD_H }}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            ) : (
              <div className={`absolute inset-0 ${accentBg}`} />
            )}
          </motion.div>
        );
      })}

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, x: 0, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.1 }}
        className={`absolute top-2 left-2 rounded-xl border ${accentBorder} shadow-md overflow-hidden`}
        style={{ width: STACK_CARD_W, height: STACK_CARD_H, zIndex: maxVisible }}
      >
        {imageUrl ? (
          <>
            <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
            <div className="relative z-10 p-2 flex flex-col h-full" style={imageCardVars}>
              {topCard}
            </div>
          </>
        ) : (
          <div className={`${accentBg} p-2 flex flex-col h-full`}>
            {topCard}
          </div>
        )}
      </motion.div>

      {count > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
          className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-0.5 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-primary-foreground shadow-sm z-50"
        >
          {count}
        </motion.div>
      )}
    </div>
  );
};

// ─── Spread horizontal carousel ─────────────────────────────────────────────

const SpreadCarousel: React.FC<{
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  count: number;
}> = ({ children, onClose, title, count }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex-1 flex flex-col justify-end min-h-0 pb-1"
    >
      <div className="flex items-center justify-between px-5 mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          {title} ({count})
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div
        ref={scrollRef}
        className="flex items-center overflow-x-auto overflow-y-hidden no-scrollbar pl-1 pr-5 gap-3"
      >
        {children}
      </div>
    </motion.div>
  );
};

const SpreadCard: React.FC<{
  index: number;
  accentBg: string;
  accentBorder: string;
  imageUrl?: string;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ index, accentBg, accentBorder, imageUrl, onClick, children }) => (
  <motion.div
    initial={{ x: -40, opacity: 0, scale: 0.85 }}
    animate={{ x: 0, opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 300, damping: 25, delay: index * 0.04 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`shrink-0 relative rounded-xl border ${accentBorder} shadow-md cursor-pointer hover:shadow-lg transition-shadow overflow-hidden`}
    style={{ width: SPREAD_CARD_W, height: SPREAD_CARD_H }}
  >
    {imageUrl ? (
      <>
        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
        <div className="relative z-10 p-2 flex flex-col h-full" style={imageCardVars}>
          {children}
        </div>
      </>
    ) : (
      <div className={`${accentBg} p-2 flex flex-col h-full`}>
        {children}
      </div>
    )}
  </motion.div>
);

// ─── Three-deck section ─────────────────────────────────────────────────────

const CardDeckSection: React.FC<{
  activeTab: TabKey | null;
  onTabChange: (tab: TabKey | null) => void;
  journeys: JourneyItem[];
  bookings: AmadeusBooking[];
  flights: FlightItem[];
  places: PlaceItem[];
  aspirations: AspirationItem[];
  hotels: HotelItem[];
  cars: CarItem[];
  isLoading: boolean;
  onJourneyClick: (j: JourneyItem) => void;
  onBookingClick: (b: AmadeusBooking) => void;
  onFlightClick: (f: FlightItem) => void;
  onPlaceClick: (p: PlaceItem) => void;
  onAspirationClick: (p: AspirationItem) => void;
  onHotelClick?: (h: HotelItem) => void;
  onNewJourney: () => void;
}> = ({
  activeTab, onTabChange, journeys, bookings, flights, places, aspirations, hotels, cars,
  isLoading, onJourneyClick, onBookingClick, onFlightClick, onPlaceClick, onAspirationClick, onHotelClick, onNewJourney,
}) => {
    if (isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      );
    }

    const allEmpty = journeys.length === 0 && bookings.length === 0 && flights.length === 0 && places.length === 0 && aspirations.length === 0 && hotels.length === 0 && cars.length === 0;
    if (allEmpty && !activeTab) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5">
          <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center">
            <Plane className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-foreground">No journeys yet</p>
            <p className="text-sm text-muted-foreground mt-1">Start planning your first adventure</p>
          </div>
          <button
            onClick={onNewJourney}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg"
          >
            <Plus className="h-4 w-4" />
            New Journey
          </button>
        </div>
      );
    }

    // ── Spread view ─────────────────────────────────────────────────────────
    if (activeTab) {
      return (
        <AnimatePresence mode="wait">
          {activeTab === "journeys" && (
            <SpreadCarousel key="j" onClose={() => onTabChange(null)} title="Journeys" count={journeys.length}>
              {journeys.map((j, i) => (
                <SpreadCard key={j.journey_id} index={i}
                  accentBg={journeyAccents[j.status]?.bg || journeyAccents.planning.bg}
                  accentBorder={journeyAccents[j.status]?.border || journeyAccents.planning.border}
                  imageUrl={getJourneyImageUrl(j, i)}
                  onClick={() => onJourneyClick(j)}
                >
                  <JourneyCardContent journey={j} />
                </SpreadCard>
              ))}
              <SpreadCard key="new" index={journeys.length} accentBg="bg-card/30" accentBorder="border-dashed border-border/80">
                <div className="flex-1 flex flex-col items-center justify-center gap-2" onClick={onNewJourney}>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">New Journey</span>
                </div>
              </SpreadCard>
            </SpreadCarousel>
          )}
          {activeTab === "bookings" && (
            <SpreadCarousel key="b" onClose={() => onTabChange(null)} title="Bookings" count={bookings.length}>
              {bookings.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No bookings yet</p>
                </div>
              ) : bookings.map((b, i) => (
                <SpreadCard key={b._id} index={i}
                  accentBg="bg-gradient-to-br from-sky-50 to-sky-100/60"
                  accentBorder="border-sky-200/80"
                  imageUrl={getBookingImageUrl(b, i)}
                  onClick={() => onBookingClick(b)}
                >
                  <BookingCardContent booking={b} />
                </SpreadCard>
              ))}
            </SpreadCarousel>
          )}
          {activeTab === "flights" && (
            <SpreadCarousel key="f" onClose={() => onTabChange(null)} title="Recommended Flights" count={flights.length}>
              {flights.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No flight recommendations yet</p>
                </div>
              ) : flights.map((f, i) => (
                <SpreadCard key={f.id} index={i}
                  accentBg="bg-gradient-to-br from-violet-50 to-violet-100/60"
                  accentBorder="border-violet-200/80"
                  imageUrl={getFlightImageUrl(f, i)}
                  onClick={() => onFlightClick(f)}
                >
                  <FlightCardContent item={f} />
                </SpreadCard>
              ))}
            </SpreadCarousel>
          )}
          {activeTab === "places" && (
            <SpreadCarousel key="p" onClose={() => onTabChange(null)} title="Places" count={places.length}>
              {places.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No place recommendations yet</p>
                </div>
              ) : places.map((p, i) => (
                <SpreadCard key={p.id} index={i}
                  accentBg="bg-gradient-to-br from-teal-50 to-teal-100/60"
                  accentBorder="border-teal-200/80"
                  imageUrl={p.imageUrl}
                  onClick={() => onPlaceClick(p)}
                >
                  <PlaceCardContent place={p} />
                </SpreadCard>
              ))}
            </SpreadCarousel>
          )}
          {activeTab === "aspirations" && (
            <SpreadCarousel key="a" onClose={() => onTabChange(null)} title="Aspirations" count={aspirations.length}>
              {aspirations.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No aspirations yet</p>
                </div>
              ) : aspirations.map((p, i) => (
                <SpreadCard key={p.aspirationId} index={i}
                  accentBg="bg-gradient-to-br from-rose-50 to-rose-100/60"
                  accentBorder="border-rose-200/80"
                  imageUrl={p.imageUrl}
                  onClick={() => onAspirationClick(p)}
                >
                  <PlaceCardContent place={p} />
                </SpreadCard>
              ))}
            </SpreadCarousel>
          )}
          {activeTab === "hotels" && (
            <SpreadCarousel key="h" onClose={() => onTabChange(null)} title="Hotels" count={hotels.length}>
              {hotels.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No hotels yet</p>
                </div>
              ) : hotels.map((h, i) => (
                <SpreadCard key={h.id} index={i}
                  accentBg="bg-gradient-to-br from-orange-50 to-orange-100/60"
                  accentBorder="border-orange-200/80"
                  imageUrl={h.imageUrl}
                  onClick={() => onHotelClick?.(h)}
                >
                  <HotelCardContent hotel={h} />
                </SpreadCard>
              ))}
            </SpreadCarousel>
          )}
          {activeTab === "cars" && (
            <SpreadCarousel key="c" onClose={() => onTabChange(null)} title="Cars" count={cars.length}>
              {cars.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No cars yet</p>
                </div>
              ) : cars.map((c, i) => (
                <SpreadCard key={c.id} index={i}
                  accentBg="bg-gradient-to-br from-cyan-50 to-cyan-100/60"
                  accentBorder="border-cyan-200/80"
                  imageUrl={c.imageUrl}
                >
                  <CarCardContent car={c} />
                </SpreadCard>
              ))}
            </SpreadCarousel>
          )}
        </AnimatePresence>
      );
    }

    // ── Stacked view (6 decks, horizontally scrollable) ─────────────────────
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-end pb-3">
        <div className="flex w-full items-center gap-2 overflow-x-auto no-scrollbar pl-0 pr-2">
          <PokerStack
            count={journeys.length}
            accentBg={journeyAccents[journeys[0]?.status]?.bg || "bg-gradient-to-br from-blue-50 to-blue-100/60"}
            accentBorder={journeyAccents[journeys[0]?.status]?.border || "border-blue-200/80"}
            imageUrl={journeys[0] ? getJourneyImageUrl(journeys[0], 0) : undefined}
            topCard={journeys[0] ? <JourneyCardContent journey={journeys[0]} /> : <EmptyStackLabel label="Journeys" />}
            onClick={() => onTabChange("journeys")}
          />
          <PokerStack
            count={bookings.length}
            accentBg="bg-gradient-to-br from-sky-50 to-sky-100/60"
            accentBorder="border-sky-200/80"
            imageUrl={bookings[0] ? getBookingImageUrl(bookings[0], 0) : undefined}
            topCard={bookings[0] ? <BookingCardContent booking={bookings[0]} /> : <EmptyStackLabel label="Bookings" />}
            onClick={() => onTabChange("bookings")}
          />
          <PokerStack
            count={flights.length}
            accentBg="bg-gradient-to-br from-violet-50 to-violet-100/60"
            accentBorder="border-violet-200/80"
            imageUrl={flights[0] ? getFlightImageUrl(flights[0], 0) : undefined}
            topCard={flights[0] ? <FlightCardContent item={flights[0]} /> : <EmptyStackLabel label="Flights" />}
            onClick={() => onTabChange("flights")}
          />
          <PokerStack
            count={places.length}
            accentBg="bg-gradient-to-br from-teal-50 to-teal-100/60"
            accentBorder="border-teal-200/80"
            imageUrl={places[0]?.imageUrl}
            topCard={places[0] ? <PlaceCardContent place={places[0]} /> : <EmptyStackLabel label="Places" />}
            onClick={() => onTabChange("places")}
          />
          <PokerStack
            count={aspirations.length}
            accentBg="bg-gradient-to-br from-rose-50 to-rose-100/60"
            accentBorder="border-rose-200/80"
            imageUrl={aspirations[0]?.imageUrl}
            topCard={aspirations[0] ? <PlaceCardContent place={aspirations[0]} /> : <EmptyStackLabel label="Aspirations" />}
            onClick={() => onTabChange("aspirations")}
          />
          <PokerStack
            count={hotels.length}
            accentBg="bg-gradient-to-br from-orange-50 to-orange-100/60"
            accentBorder="border-orange-200/80"
            imageUrl={hotels[0]?.imageUrl}
            topCard={hotels[0] ? <HotelCardContent hotel={hotels[0]} /> : <EmptyStackLabel label="Hotels" />}
            onClick={() => onTabChange("hotels")}
          />
          <PokerStack
            count={cars.length}
            accentBg="bg-gradient-to-br from-cyan-50 to-cyan-100/60"
            accentBorder="border-cyan-200/80"
            imageUrl={cars[0]?.imageUrl}
            topCard={cars[0] ? <CarCardContent car={cars[0]} /> : <EmptyStackLabel label="Cars" />}
            onClick={() => onTabChange("cars")}
          />
        </div>
      </motion.div>
    );
  };

const EmptyStackLabel: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-1">
    <Plane className="h-5 w-5 text-muted-foreground/30" />
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);

// ─── Tabs ───────────────────────────────────────────────────────────────────

const TabBar: React.FC<{
  activeTab: TabKey | null;
  onTabChange: (tab: TabKey | null) => void;
  counts: Record<TabKey, number>;
}> = ({ activeTab, onTabChange, counts }) => (
  <div className="px-5 mt-auto pb-2 pt-3 shrink-0">
    <div className="flex items-center gap-1 rounded-xl bg-card/60 backdrop-blur border border-border/50 p-1 overflow-x-auto no-scrollbar">
      {TAB_CONFIG.map(({ key, label, icon }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => onTabChange(isActive ? null : key)}
            className={`shrink-0 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition-all ${isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
          >
            {icon}
            <span>{label}</span>
            {counts[key] > 0 && (
              <span className={`ml-0.5 text-[9px] font-bold ${isActive ? "text-primary-foreground/80" : "text-muted-foreground/60"}`}>
                {counts[key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Dome Hero Section (65% of viewport) ────────────────────────────────────

/** Map OpenWeatherMap icon code → emoji */
function weatherEmoji(icon: string): string {
  const code = icon.replace(/[dn]$/, "");
  const map: Record<string, string> = {
    "01": "☀️", "02": "⛅", "03": "☁️", "04": "☁️",
    "09": "🌧️", "10": "🌦️", "11": "⛈️", "13": "🌨️", "50": "🌫️",
  };
  return map[code] || "☀️";
}

/** Format forecast date to short day label (Today, Mon, Tue…) */
function forecastDayLabel(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "short" });
}

const PreviewComponent: React.FC<{
  journey?: JourneyItem | null;
  booking?: AmadeusBooking | null;
  flight?: FlightItem | null;
  place?: PlaceItem | null;
  isAspirationPreview?: boolean;
  isPlaceLiked?: boolean;
  hotel?: HotelItem | null;
  imageUrl: string;
  onExplore?: (j: JourneyItem) => void;
  onShowJourney?: (journeyId: string) => void;
  onNextPlace?: () => void;
  onPrevPlace?: () => void;
  onPlanNow?: (p: PlaceItem) => void;
  onShowDetails?: (p: PlaceItem) => void;
  onLikePlace?: (p: PlaceItem) => void;
  onRefetchPlaces?: () => void;
  placeRefetchesRemaining?: number;
  isRefetchingPlaces?: boolean;
  onDeleteJourney?: (journeyId: string) => void;
}> = ({
  journey,
  booking,
  flight,
  place,
  isAspirationPreview = false,
  isPlaceLiked = false,
  hotel,
  imageUrl,
  onExplore,
  onShowJourney,
  onNextPlace,
  onPrevPlace,
  onPlanNow,
  onShowDetails,
  onLikePlace,
  onRefetchPlaces,
  placeRefetchesRemaining = 0,
  isRefetchingPlaces = false,
  onDeleteJourney,
}) => {
    const [journeyActionsOpen, setJourneyActionsOpen] = useState(false);
    const journeyActionsRef = useRef<HTMLDivElement | null>(null);
    const fs = journey?.context?.flight_status;
    const isBooked = !!booking || !!fs;

    const destination = hotel ? hotel.name : place ? place.name : flight ? `${flight.departure} → ${flight.arrival}` : getBookingDestinationLabel(booking, journey);
    const dates = hotel ? hotel.cityCode : place ? place.country : flight ? `${flight.departureTime}` : getBookingDates(booking, journey);

    const label = hotel ? "Saved Hotel" : place ? "Recommended Place" : flight ? "Recommended Flight" : (isBooked ? "Flight Booking" : (journey ? "Planning Journey" : "Booking Preview"));
    const ownerJourneyId = hotel?.journeyId || flight?.journeyId || booking?.journeyId;
    const canShowActions = !!(journey && onDeleteJourney) || !!(place && !isAspirationPreview && onRefetchPlaces);
    const canRefetchPlaces = placeRefetchesRemaining > 0 && !isRefetchingPlaces;

    // Extract common details for the "boarding pass" section
    const reference = booking?.bookingReference || booking?.referenceNumber || fs?.booking_reference || fs?.amadeus_order_id;
    const travelerName = booking?.travelers?.[0]
      ? `${booking.travelers[0].firstName} ${booking.travelers[0].lastName}`
      : (fs ? "User" : null);

    useEffect(() => {
      if (!journeyActionsOpen) return;

      const handlePointerDown = (event: MouseEvent | TouchEvent) => {
        const target = event.target as Node | null;
        if (journeyActionsRef.current && target && !journeyActionsRef.current.contains(target)) {
          setJourneyActionsOpen(false);
        }
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);

      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("touchstart", handlePointerDown);
      };
    }, [journeyActionsOpen]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative w-full h-52 rounded-[1.5rem] overflow-hidden shadow-xl border border-white/10"
      >
        <img src={imageUrl} alt={destination} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {place && !isAspirationPreview && onNextPlace && onPrevPlace && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <button
              onClick={(e) => { e.stopPropagation(); onPrevPlace(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-black/10 backdrop-blur-sm border border-white/5 text-white/50 hover:bg-black/25 hover:text-white/80 active:scale-90 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onNextPlace(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-black/10 backdrop-blur-sm border border-white/5 text-white/50 hover:bg-black/25 hover:text-white/80 active:scale-90 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {canShowActions && (
          <div
            ref={journeyActionsRef}
            className="absolute top-3 right-3 z-30 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <button
              type="button"
              aria-label={place ? "Open place actions" : "Open journey actions"}
              aria-expanded={journeyActionsOpen}
              onClick={(e) => {
                e.stopPropagation();
                setJourneyActionsOpen((prev) => !prev);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white/85 backdrop-blur-md transition-all hover:bg-black/35 active:scale-95"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            <AnimatePresence>
              {journeyActionsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute top-8 right-0 min-w-[132px] overflow-hidden rounded-xl border border-white/15 bg-black/70 p-1 shadow-2xl backdrop-blur-xl"
                >
                  {place && onRefetchPlaces ? (
                    <button
                      type="button"
                      disabled={!canRefetchPlaces}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!canRefetchPlaces) return;
                        setJourneyActionsOpen(false);
                        onRefetchPlaces();
                      }}
                      className={`flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                        canRefetchPlaces
                          ? "text-white hover:bg-white/12"
                          : "cursor-not-allowed text-white/35"
                      }`}
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefetchingPlaces ? "animate-spin" : ""}`} />
                      <span>Refetch</span>
                      <span className="ml-auto text-[10px] text-white/45">{placeRefetchesRemaining}/3</span>
                    </button>
                  ) : journey && onDeleteJourney ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setJourneyActionsOpen(false);
                        onDeleteJourney(journey.journey_id);
                      }}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold text-red-100 transition-colors hover:bg-red-500/15 hover:text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="absolute inset-0 p-6 flex flex-col justify-end">
          {place && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-white/10 backdrop-blur-md border border-white/15 px-2.5 py-1 rounded-full">
              {isAspirationPreview ? (
                <Heart className="h-2.5 w-2.5 fill-rose-300 text-rose-300" />
              ) : (
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
              )}
              <span className="text-[9px] font-semibold text-white/80 tracking-wide">
                {isAspirationPreview ? "Previously liked destination" : "Fresh daily picks"}
              </span>
            </div>
          )}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest mb-1 block">{label}</span>
              <h2 className="text-xl font-bold text-white leading-tight mb-1 drop-shadow-md truncate">
                {destination}
              </h2>
              <p className="text-[11px] font-medium text-white/70 drop-shadow-sm flex items-center gap-1.5">
                {place ? <MapPin className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                {dates}
              </p>
            </div>

            {!place && (
              <div className="flex items-center gap-2">
                {ownerJourneyId && onShowJourney && (
                  <button
                    onClick={() => onShowJourney(ownerJourneyId)}
                    className="shrink-0 group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-[11px] font-semibold tracking-wide text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/18 hover:shadow-[0_14px_34px_rgba(0,0,0,0.24)] active:translate-y-0 active:scale-[0.98]"
                  >
                    <span className="uppercase tracking-[0.18em] text-white/90">Journey</span>
                    <ChevronRight className="h-3.5 w-3.5 text-white/80 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white" />
                  </button>
                )}
                {journey && onExplore && (
                  <button
                    onClick={() => onExplore(journey)}
                    className="shrink-0 group flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full text-xs font-bold shadow-lg active:scale-95 transition-all"
                  >
                    <span>Explore</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            )}

            {place && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onShowDetails?.(place)}
                  className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2.5 rounded-full text-xs font-bold hover:bg-white/20 active:scale-95 transition-all"
                >
                  Details
                </button>
                {isAspirationPreview ? (
                  <button
                    onClick={() => onPlanNow?.(place)}
                    className="bg-primary text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all"
                  >
                    Plan Now
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={isPlaceLiked ? "Destination liked" : "Like destination"}
                    onClick={() => onLikePlace?.(place)}
                    disabled={isPlaceLiked}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-white shadow-lg backdrop-blur-md transition-all active:scale-95 ${
                      isPlaceLiked
                        ? "border-rose-300/40 bg-rose-500/80"
                        : "border-white/20 bg-white/10 hover:bg-rose-500/70 hover:border-rose-300/50"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isPlaceLiked ? "fill-white" : ""}`} />
                  </button>
                )}
              </div>
            )}
          </div>

          {hotel ? (
            <div className="flex items-center gap-4 border-t border-white/10 pt-3 mt-1">
              <div className="flex flex-col flex-1">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Address</span>
                <span className="text-[10px] font-medium text-white/90 line-clamp-1">
                  {hotel.address || "TBD"}
                </span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Price</span>
                <span className="text-[10px] font-bold text-white">{formatPrice(hotel.price, hotel.currency)}/night</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="h-2.5 w-2.5 fill-amber-300 text-amber-300" />
                  <span className="text-[10px] font-bold text-white/90">{hotel.rating || "N/A"}</span>
                </div>
              </div>
            </div>
          ) : place ? (
            <div className="flex items-center gap-4 border-t border-white/10 pt-3 mt-1">
              <div className="flex flex-col flex-1">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Description</span>
                <span className="text-[10px] font-medium text-white/90 line-clamp-1">
                  {place.description}
                </span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Category</span>
                <span className="text-[10px] font-bold text-white">{place.category}</span>
              </div>
            </div>
          ) : flight ? (
            <div className="flex items-center gap-4 border-t border-white/10 pt-3 mt-1">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Airline</span>
                <span className="text-[10px] font-bold text-white">{flight.airline} {flight.flightNumber}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Duration</span>
                <span className="text-[10px] font-bold text-white truncate">
                  {flight.duration || "TBD"}
                </span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Price</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-white">{formatPrice(flight.price, flight.currency)}</span>
                </div>
              </div>
            </div>
          ) : isBooked ? (
            <div className="flex items-center gap-4 border-t border-white/10 pt-3 mt-1">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Reference</span>
                <span className="text-[10px] font-bold text-white">{reference || "TBD"}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Traveler</span>
                <span className="text-[10px] font-bold text-white truncate">
                  {travelerName || "TBD"}
                </span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Status</span>
                <div className="flex items-center gap-1">
                  <div className="h-1 w-1 rounded-full bg-green-400" />
                  <span className="text-[10px] font-bold text-white">Booked</span>
                </div>
              </div>
            </div>
          ) : journey ? (
            <div className="flex items-center gap-4 border-t border-white/10 pt-3 mt-1">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Travelers</span>
                <span className="text-[10px] font-bold text-white">{journey.context?.travelers_count || "1"} Person</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Budget</span>
                <span className="text-[10px] font-bold text-white truncate">
                  {journey.context?.budget_max ? formatPrice(journey.context.budget_max, journey.context.budget_currency) : "TBD"}
                </span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-tight">Phase</span>
                <div className="flex items-center gap-1">
                  <div className="h-1 w-1 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-bold text-white capitalize">{journey.status}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    );
  };

const DomeHero: React.FC<{
  userName: string;
  avatarSrc: string | null;
  notificationCount: number;
  onNotificationsClick: () => void;
  onOpenSettings?: (section?: string) => void;
  onOpenSupport?: () => void;
  onLogout?: () => void;
  weather: WeatherData | null;
  previewJourney: JourneyItem | null;
  previewBooking?: AmadeusBooking | null;
  previewFlight?: FlightItem | null;
  previewPlace?: PlaceItem | null;
  isAspirationPreview?: boolean;
  isPlaceLiked?: boolean;
  previewHotel?: HotelItem | null;
  onExplore: (j: JourneyItem) => void;
  onShowJourney?: (journeyId: string) => void;
  onNextPlace?: () => void;
  onPrevPlace?: () => void;
  onPlanNow?: (p: PlaceItem) => void;
  onShowDetails?: (p: PlaceItem) => void;
  onLikePlace?: (p: PlaceItem) => void;
  onRefetchPlaces?: () => void;
  placeRefetchesRemaining?: number;
  isRefetchingPlaces?: boolean;
  onDeleteJourney?: (journeyId: string) => void;
  // Tabs props
  activeTab: TabKey | null;
  onTabChange: (tab: TabKey | null) => void;
  tabCounts: Record<TabKey, number>;
}> = ({
  userName,
  avatarSrc,
  notificationCount,
  onNotificationsClick,
  onOpenSettings,
  onOpenSupport,
  onLogout,
  weather,
  previewJourney,
  previewBooking,
  previewFlight,
  previewPlace,
  isAspirationPreview,
  isPlaceLiked,
  previewHotel,
  onExplore,
  onShowJourney,
  onNextPlace,
  onPrevPlace,
  onPlanNow,
  onShowDetails,
  onLikePlace,
  onRefetchPlaces,
  placeRefetchesRemaining,
  isRefetchingPlaces,
  onDeleteJourney,
  activeTab,
  onTabChange,
  tabCounts,
}) => {
    const imageUrl = useMemo(() => {
      if (previewHotel) return previewHotel.imageUrl;
      if (previewPlace) return previewPlace.imageUrl;
      if (previewFlight) return getFlightImageUrl(previewFlight, 0);
      if (previewBooking) return getBookingImageUrl(previewBooking, 0);
      if (previewJourney) return getJourneyImageUrl(previewJourney, 0);
      return DEFAULT_FLIGHT_IMAGES[0];
    }, [previewHotel, previewPlace, previewFlight, previewBooking, previewJourney]);
    const userCity = useMemo(() => getUserCity(), []);
    const [weatherExpanded, setWeatherExpanded] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setProfileDropdownOpen(false);
        }
      };
      if (profileDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [profileDropdownOpen]);

    return (
      <motion.div
        layout
        className="shrink-0 relative flex flex-col"
        style={{ height: "70vh" }}
      >
        {/* ── Top bar: bell + avatar ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 pt-2">
          <button
            onClick={onNotificationsClick}
            className="relative h-10 w-10 rounded-full bg-card/80 border border-border/60 flex items-center justify-center shadow-sm hover:bg-muted/50 transition-colors backdrop-blur"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-background">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen((p) => !p)}
              className="h-11 w-11 rounded-full overflow-hidden ring-2 ring-border/60 shadow-md"
            >
              <img
                src={avatarSrc || IMAGES.africanGirlProfile}
                alt="User"
                className="h-full w-full object-cover"
              />
            </button>

            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                    <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setProfileDropdownOpen(false); onOpenSettings?.('profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      User Profile
                    </button>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); onOpenSettings?.('security'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Settings
                    </button>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); onOpenSupport?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Support
                    </button>
                  </div>
                  <div className="border-t border-border/50 py-1">
                    <button
                      onClick={() => { setProfileDropdownOpen(false); onLogout?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
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

        {/* ── Location & weather ──────────────────────────────────────── */}
        <div className="px-5 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="inline-flex items-center gap-2 rounded-2xl bg-card/80 backdrop-blur border border-border/50 px-3 py-1.5 shadow-sm cursor-pointer"
              onClick={() => setWeatherExpanded((v) => !v)}
            >
              <Navigation className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">{userCity}</span>
              <div className="h-3.5 w-px bg-border/60" />
              {weather ? (
                <>
                  <span className="text-sm">{weatherEmoji(weather.current.icon)}</span>
                  <span className="text-xs font-bold text-foreground">{weather.current.temp}°</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{weather.current.description}</span>
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground">Loading...</span>
              )}
              <ChevronRight
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${weatherExpanded ? "rotate-90" : ""}`}
              />
            </div>
          </div>

          <AnimatePresence>
            {weatherExpanded && weather && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-2"
              >
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  <div className="shrink-0 flex flex-col items-center gap-0.5 rounded-xl bg-primary/5 border border-primary/20 px-3 py-1.5">
                    <span className="text-[9px] text-primary font-semibold">Now</span>
                    <div className="flex items-center gap-1">
                      <Droplets className="h-2.5 w-2.5 text-blue-400" />
                      <span className="text-[9px] text-foreground">{weather.current.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">Feels {weather.current.feels_like}°</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <div className="w-px h-8 bg-border/60" />
                  </div>
                  {weather.hourly.map((h) => {
                    const time = h.time.split(" ")[1]?.slice(0, 5) || h.time;
                    return (
                      <div key={h.time} className="shrink-0 flex flex-col items-center gap-0.5 rounded-xl bg-card/70 border border-border/40 px-3 py-1.5">
                        <span className="text-[9px] text-muted-foreground font-medium">{time}</span>
                        <span className="text-sm">{weatherEmoji(h.icon)}</span>
                        <span className="text-[10px] font-bold text-foreground">{h.temp}°</span>
                      </div>
                    );
                  })}
                  <div className="shrink-0 flex items-center">
                    <div className="w-px h-8 bg-border/60" />
                  </div>
                  {weather.daily.map((day, i) => (
                    <div key={day.date} className="shrink-0 flex flex-col items-center gap-0.5 rounded-xl bg-card/70 border border-border/40 px-3 py-1.5">
                      <span className="text-[9px] text-muted-foreground font-medium">{forecastDayLabel(day.date, i)}</span>
                      <span className="text-sm">{weatherEmoji(day.icon)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-foreground">{day.high ?? "—"}°</span>
                        <span className="text-[9px] text-muted-foreground">{day.low ?? "—"}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <h1 className="text-2xl font-bold text-foreground leading-tight">Hey {userName},</h1>
          <p className="text-base text-foreground/60 mt-0.5">Welcome back!</p>
        </div>

        {/* ── Tabs section ─────────────────────────────────────────── */}
        <TabBar activeTab={activeTab} onTabChange={onTabChange} counts={tabCounts} />

        {/* ── Journey Preview (Bottom of Dome Hero) ───────────────────── */}
        <div className="px-4 p-2">
          <AnimatePresence mode="wait">
            {previewFlight ? (
              <PreviewComponent
                key={`flight-${previewFlight.id}`}
                flight={previewFlight}
                imageUrl={imageUrl}
                onShowJourney={onShowJourney}
              />
            ) : previewHotel ? (
              <PreviewComponent
                key={`hotel-${previewHotel.id}`}
                hotel={previewHotel}
                imageUrl={imageUrl}
                onShowJourney={onShowJourney}
              />
            ) : previewPlace ? (
              <PreviewComponent
                key={`place-${previewPlace.id}`}
                place={previewPlace}
                isAspirationPreview={isAspirationPreview}
                isPlaceLiked={isPlaceLiked}
                imageUrl={imageUrl}
                onNextPlace={onNextPlace}
                onPrevPlace={onPrevPlace}
                onPlanNow={onPlanNow}
                onShowDetails={onShowDetails}
                onLikePlace={onLikePlace}
                onRefetchPlaces={onRefetchPlaces}
                placeRefetchesRemaining={placeRefetchesRemaining}
                isRefetchingPlaces={isRefetchingPlaces}
              />
            ) : previewJourney ? (
              <PreviewComponent
                key={`journey-${previewJourney.journey_id}`}
                journey={previewJourney}
                imageUrl={imageUrl}
                onExplore={onExplore}
                onDeleteJourney={onDeleteJourney}
              />
            ) : previewBooking ? (
              <PreviewComponent
                key={`booking-${previewBooking._id}`}
                booking={previewBooking}
                imageUrl={imageUrl}
                onShowJourney={onShowJourney}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-44 rounded-[2.5rem] bg-card/40 backdrop-blur border border-dashed border-border/50 flex flex-col items-center justify-center gap-2"
              >
                <Plane className="h-6 w-6 text-muted-foreground/40" />
                <span className="text-xs text-muted-foreground/60 font-medium">Select an item to preview</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="min-h-0" />
      </motion.div>
    );
  };

// ─── Bottom Chat Bar ────────────────────────────────────────────────────────
// (Removed local BottomChatBar, now using shared component)


// ─── Place Details Drawer ───────────────────────────────────────────────────

interface PlaceDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  onPlanTrip: (place: PlaceItem) => void;
  onLikePlace?: (place: PlaceItem) => void;
  place: PlaceItem | null;
  isAspiration?: boolean;
  isLiked?: boolean;
}

const PlaceDetailsDrawer: React.FC<PlaceDetailsDrawerProps> = ({
  open,
  onClose,
  onPlanTrip,
  onLikePlace,
  place,
  isAspiration = false,
  isLiked = false,
}) => {
  if (!place) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 max-w-[96%] z-[60] bg-background rounded-t-[2.5rem] overflow-hidden max-w-[450px] mx-auto shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Grab Handle */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-white/30 backdrop-blur-md z-10" />

            {/* Header / Image Section */}
            <div className="relative h-72 shrink-0">
              <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-bold tracking-tight uppercase">
                    {place.category}
                  </span>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-white text-xs font-bold">{place.rating}</span>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">{place.name}</h2>
                <div className="flex items-center gap-2 text-white/80 mt-1">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-medium">{place.country}</span>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-card/30">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  About this destination
                </h3>
                <p className="text-lg leading-relaxed text-foreground/80 font-medium italic">
                  "{place.description}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/50 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Region</p>
                  <p className="text-sm font-semibold">{place.country}</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/50 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                  <p className="text-sm font-semibold">{place.category}</p>
                </div>
              </div>

              {isAspiration ? (
                <div className="">
                  <button
                    onClick={() => onPlanTrip(place)}
                    className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="h-5 w-5 pb-1" />
                    Plan a trip to {place.name}
                  </button>
                </div>
              ) : (
                <div className="">
                  <button
                    type="button"
                    onClick={() => onLikePlace?.(place)}
                    disabled={isLiked}
                    className={`w-full py-4 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                      isLiked
                        ? "bg-rose-500/10 text-rose-600 border border-rose-200 cursor-default"
                        : "bg-card text-foreground border border-border hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isLiked ? "fill-rose-500 text-rose-500" : "text-rose-500"}`} />
                    {isLiked ? "Saved to aspirations" : "Add to aspirations"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const JourneyListingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const loggedIn = getLocalStorageValue("isLoggedIn");
    const token = getLocalStorageValue("token");
    const isAuthenticated =
      loggedIn === true ||
      loggedIn === "true" ||
      (typeof token === "string" && !!token && token !== "undefined" && token !== "null");
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/journey" } }, replace: true });
    }
  }, [navigate]);

  useEffect(() => { initializeTheme(); }, []);

  useEffect(() => {
    const storedUserData = getLocalStorageValue("user") as any;
    const user = storedUserData.data
    console.log("user", user)
    const token = getLocalStorageValue("token") as string;
    if (user && (user._id || user.id) && user.journeyMonitoringPreference) {
      fetch(`${backendUrl}/api/ai/monitoring/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: String(user._id || user.id),
          journeyMonitoringPreference: user.journeyMonitoringPreference,
        }),
      }).catch((err) => console.error("Failed to sync monitoring preference", err));
    }
  }, []);

  const currentUser = getLocalStorageValue("user") as any;
  const currentUserId: string | null = currentUser?._id ? String(currentUser._id) : null;
  const userName = currentUser?.firstName || "Traveler";
  const avatarSrc = currentUser?.photo
    ? currentUser.photo.startsWith("http") ? currentUser.photo : `${backendUrl}${currentUser.photo}`
    : null;

  const { journeys, isLoading: journeysLoading, refetch: refetchAllJourneys } = useAllJourneys(currentUserId);
  const {
    comparisonItems: recommendationItems,
    isLoading: destLoading,
    refetch: refetchDestinationRecommendations,
  } = useDestinationRecommendations(currentUserId);
  const { userLocation } = useUserLocation();
  const { weather } = useWeatherForecast(userLocation);
  const [placeRefetchCount, setPlaceRefetchCount] = useState(0);
  const [aspirations, setAspirations] = useState<AspirationItem[]>([]);
  const [aspirationsLoading, setAspirationsLoading] = useState(false);
  const isLoading = journeysLoading || destLoading || aspirationsLoading;
  const placeRefetchesRemaining = Math.max(0, PLACE_REFETCH_LIMIT_PER_DAY - placeRefetchCount);

  useEffect(() => {
    const storageKey = getPlaceRefetchStorageKey(currentUserId);
    const today = getLocalDateKey();
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      setPlaceRefetchCount(parsed?.date === today ? Number(parsed.count || 0) : 0);
    } catch {
      setPlaceRefetchCount(0);
    }
  }, [currentUserId]);

  const recommendedPlaces = useMemo(() => {
    if (!recommendationItems || recommendationItems.length === 0) return [];
    return recommendationItems.map(item => {
      const cat = (item as any).category || item.metadata?.category || "Destination";
      const id = item.id;
      return {
        id,
        name: item.name,
        country: (item as any).country || item.metadata?.country || "",
        description: (item as any).description || item.metadata?.description || "",
        category: cat,
        rating: (item as any).rating || item.metadata?.rating || 4.5,
        // Always use category-mapped image — avoids broken API-provided URLs
        imageUrl: getPlaceCategoryImage(cat, id),
      };
    }) as PlaceItem[];
  }, [recommendationItems]);

  /** Flatten saved_hotels from all journeys into HotelItem[] */
  const savedHotels = useMemo<HotelItem[]>(() => {
    const results: HotelItem[] = [];
    const seen = new Set<string>();
    for (const journey of journeys) {
      const hotels = (journey as any).saved_hotels || [];
      if (!Array.isArray(hotels) || hotels.length === 0) continue;
      for (let i = 0; i < hotels.length; i++) {
        const h = hotels[i];
        const id = h.id || h.hotelId || h.hotel_id || `${journey.journey_id}_h${i}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const name = h.hotel_name || h.name || "Hotel";
        results.push({
          id,
          name,
          cityCode: h.city_code || h.cityCode || h.city || "",
          address: (() => {
            const raw = h.address || h.location || "";
            if (!raw) return h.city_code || h.cityCode || "";
            if (typeof raw === "string") return raw;
            // Amadeus address object: { cityName, countryCode, lines, postalCode }
            if (typeof raw === "object") {
              const parts: string[] = [];
              if (Array.isArray(raw.lines) && raw.lines.length > 0) parts.push(...raw.lines);
              if (raw.cityName) parts.push(raw.cityName);
              if (raw.postalCode) parts.push(raw.postalCode);
              if (raw.countryCode) parts.push(raw.countryCode);
              return parts.join(", ");
            }
            return String(raw);
          })(),

          rating: typeof h.rating === "number" ? h.rating : parseFloat(h.rating) || 0,
          price: typeof h.price === "number" ? h.price : parseFloat(h.price) || 0,
          currency: h.currency || journey.context?.budget?.currency || "USD",
          description: h.description || h.room_description || "",
          amenities: Array.isArray(h.amenities) && h.amenities.length > 0
            ? h.amenities
            : Array.isArray(h.pros) && h.pros.length > 0
              ? h.pros
              : ["Hotel"],
          imageUrl: h.imageUrl || h.imageUrls?.[0] || getHotelCategoryImage(name, id),
          journeyId: journey.journey_id,
        });
      }
    }
    return results;
  }, [journeys]);

  /** Filter and map booked_flights from journeys into AmadeusBooking[] */
  const bookedFlights = useMemo<AmadeusBooking[]>(() => {
    const results: AmadeusBooking[] = [];
    const seen = new Set<string>();
    for (const journey of journeys) {
      const flights = (journey as any).booked_flights || [];
      if (!Array.isArray(flights) || flights.length === 0) continue;
      for (const f of flights) {
        const id = f.amadeus_order_id || f.booking_reference || `${journey.journey_id}_f`;
        if (seen.has(id)) continue;
        seen.add(id);

        // Map simplified flight record to AmadeusBooking shape
        results.push({
          _id: id,
          bookingReference: f.booking_reference,
          amadeusOrderId: f.amadeus_order_id,
          journeyId: journey.journey_id,
          userId: currentUserId || "",
          price: {
            grandTotal: String(f.price || 0),
            total: String(f.price || 0),
            currency: f.currency || "USD"
          },
          itineraries: [{
            segments: [{
              departure: { iataCode: f.from_code, at: f.departure },
              arrival: { iataCode: f.to_code, at: f.arrival },
              carrierCode: f.airline,
              flightNumber: f.flight_number?.replace(f.airline || "", "").trim() || f.flight_number,
            }]
          }],
          createdAt: f.booked_at || new Date().toISOString(),
        } as AmadeusBooking);
      }
    }
    return results;
  }, [journeys, currentUserId]);

  /** Filter and map saved_flights from all journeys into FlightItem[] */
  const savedFlights = useMemo<FlightItem[]>(() => {
    const results: FlightItem[] = [];
    for (const journey of journeys) {
      const flights = (journey as any).saved_flights || [];
      if (!Array.isArray(flights) || flights.length === 0) continue;
      for (let index = 0; index < flights.length; index += 1) {
        const f = flights[index];
        const persistedId = f.flight_id || f.id || f._id;
        const id = persistedId
          ? `${journey.journey_id}_${persistedId}`
          : `${journey.journey_id}_sf_${index}`;
        results.push({
          id,
          airline: f.airline || "",
          flightNumber: f.flight_number || "",
          departure:
            f.from_code ||
            f.from ||
            f.origin ||
            f.departure_airport ||
            "",
          arrival:
            f.to_code ||
            f.to ||
            f.destination ||
            f.arrival_airport ||
            "",
          departureTime: f.departure_time || f.departure || "",
          arrivalTime: f.arrival_time || f.arrival || "",
          price: typeof f.price === "number" ? f.price : parseFloat(f.price) || 0,
          currency: f.currency || "USD",
          stops: typeof f.stops === "number" ? f.stops : parseInt(f.stops) || 0,
          duration: f.duration || "",
          itineraries: f.itineraries || [],
          journeyId: journey.journey_id,
          createdAt: f.saved_at || new Date().toISOString(),
        } as FlightItem);
      }
    }
    return results;
  }, [journeys]);

  const sortedFlights = useMemo(() => {
    return [...savedFlights].sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [savedFlights]);

  const {
    isOpen: newJourneyModalOpen,
    isCreating: isCreatingJourney,
    open: openNewJourneyModal,
    close: closeNewJourneyModal,
    handleSubmit: handleNewJourneySubmit
  } = useNewJourney({
    userId: currentUserId,
    onTimelineCreated: (timeline) => {
      // For now, on the listing page, we just want to refetch and show the new journey in the list
      // If we wanted to go to the journey detail immediately, we could navigate here.
      if (timeline.journeyId) navigate(`/journey/${timeline.journeyId}`);
    },
    refetchJourneys: refetchAllJourneys,
    onInspirationReceived: () => {
      // Optional: could trigger a refresh of destination recommendations
    }
  });

  const sortedJourneys = useMemo(() => {
    return [...journeys].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [journeys]);

  const dispatch = useDispatch();
  const [notificationsAll, setNotificationsAll] = useState<BannerConfig[]>([]);
  const [showNotificationsAll, setShowNotificationsAll] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationCount = notificationsAll.length;
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  const [nearbyPlacesOpen, setNearbyPlacesOpen] = useState(false);
  const [focusedPlace, setFocusedPlace] = useState<NearbyPlace | null>(null);

  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState("");
  const [initialChatMessageSource, setInitialChatMessageSource] = useState<"text" | "voice">("text");
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);
  const [conversationDrawerOpen, setConversationDrawerOpen] = useState(false);
  const [speechModalOpen, setSpeechModalOpen] = useState(false);

  const [selectedPlaceDetail, setSelectedPlaceDetail] = useState<PlaceItem | null>(null);
  const [selectedPlaceDetailIsAspiration, setSelectedPlaceDetailIsAspiration] = useState(false);
  const [isPlaceDrawerOpen, setIsPlaceDrawerOpen] = useState(false);
  const [prefilledDestination, setPrefilledDestination] = useState<string>("");
  const [selectedJourneyForPreview, setSelectedJourneyForPreview] = useState<JourneyItem | null>(null);
  const [selectedBookingForPreview, setSelectedBookingForPreview] = useState<AmadeusBooking | null>(null);
  const [selectedHotelForPreview, setSelectedHotelForPreview] = useState<HotelItem | null>(null);
  const [selectedFlightForPreview, setSelectedFlightForPreview] = useState<FlightItem | null>(null);
  const [selectedAspirationForPreview, setSelectedAspirationForPreview] = useState<AspirationItem | null>(null);
  const [isPreviewingPlace, setIsPreviewingPlace] = useState(true);
  const [currentPreviewPlaceIndex, setCurrentPreviewPlaceIndex] = useState(0);
  const aspirationKeys = useMemo(() => {
    const keys = new Set<string>();
    aspirations.forEach((item) => {
      keys.add(item.id);
      keys.add(`${item.name.toLowerCase()}_${item.country.toLowerCase()}`);
    });
    return keys;
  }, [aspirations]);

  const defaultActiveJourney = useMemo(() => {
    return sortedJourneys.find(j => j.is_active === true) || null;
  }, [sortedJourneys]);

  const previewJourney = selectedJourneyForPreview || (!selectedBookingForPreview && !selectedHotelForPreview && !selectedFlightForPreview && !selectedAspirationForPreview && !isPreviewingPlace ? defaultActiveJourney : null);
  const previewBooking = selectedBookingForPreview;
  const previewHotel = selectedHotelForPreview;
  const previewFlight = selectedFlightForPreview;
  const previewPlace = selectedAspirationForPreview || (isPreviewingPlace && recommendedPlaces.length > 0 ? recommendedPlaces[currentPreviewPlaceIndex] : null);
  const isAspirationPreview = !!selectedAspirationForPreview;
  const isPreviewPlaceLiked = !!previewPlace && (
    aspirationKeys.has(previewPlace.id) ||
    aspirationKeys.has(`${previewPlace.name.toLowerCase()}_${previewPlace.country.toLowerCase()}`)
  );

  const sortedBookings = useMemo(() => {
    return [...bookedFlights].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [bookedFlights]);


  const handleTabChange = useCallback((tab: TabKey | null) => { setActiveTab(tab); }, []);
  const handleJourneyClick = useCallback((j: JourneyItem) => {
    setIsPreviewingPlace(false);
    setSelectedAspirationForPreview(null);
    setSelectedHotelForPreview(null);
    setSelectedBookingForPreview(null);
    setSelectedFlightForPreview(null);
    setSelectedJourneyForPreview(j);
  }, []);
  const handleBookingClick = useCallback((b: AmadeusBooking) => {
    setIsPreviewingPlace(false);
    setSelectedAspirationForPreview(null);
    setSelectedHotelForPreview(null);
    setSelectedJourneyForPreview(null);
    setSelectedFlightForPreview(null);
    setSelectedBookingForPreview(b);
  }, []);
  const handleHotelClick = useCallback((h: HotelItem) => {
    setIsPreviewingPlace(false);
    setSelectedAspirationForPreview(null);
    setSelectedBookingForPreview(null);
    setSelectedJourneyForPreview(null);
    setSelectedFlightForPreview(null);
    setSelectedHotelForPreview(h);
  }, []);
  const handleFlightClick = useCallback((f: FlightItem) => {
    setIsPreviewingPlace(false);
    setSelectedAspirationForPreview(null);
    setSelectedBookingForPreview(null);
    setSelectedJourneyForPreview(null);
    setSelectedHotelForPreview(null);
    setSelectedFlightForPreview(f);
  }, []);
  const handleShowJourneyPreview = useCallback((journeyId: string) => {
    const ownerJourney = sortedJourneys.find((item) => item.journey_id === journeyId);
    if (!ownerJourney) return;
    setIsPreviewingPlace(false);
    setSelectedAspirationForPreview(null);
    setSelectedBookingForPreview(null);
    setSelectedHotelForPreview(null);
    setSelectedFlightForPreview(null);
    setSelectedJourneyForPreview(ownerJourney);
  }, [sortedJourneys]);
  const handlePlaceDetailClick = useCallback((p: PlaceItem) => {
    const idx = recommendedPlaces.findIndex(rp => rp.id === p.id);
    if (idx !== -1) {
      setCurrentPreviewPlaceIndex(idx);
      setIsPreviewingPlace(true);
      setSelectedAspirationForPreview(null);
      setSelectedHotelForPreview(null);
      setSelectedJourneyForPreview(null);
      setSelectedBookingForPreview(null);
      setSelectedFlightForPreview(null);
    }
  }, [recommendedPlaces]);

  const handleAspirationClick = useCallback((p: AspirationItem) => {
    setIsPreviewingPlace(false);
    setSelectedAspirationForPreview(p);
    setSelectedHotelForPreview(null);
    setSelectedJourneyForPreview(null);
    setSelectedBookingForPreview(null);
    setSelectedFlightForPreview(null);
  }, []);

  useEffect(() => {
    if (!selectedJourneyForPreview) return;
    const stillExists = journeys.some((item) => item.journey_id === selectedJourneyForPreview.journey_id);
    if (!stillExists) {
      setSelectedJourneyForPreview(null);
    }
  }, [journeys, selectedJourneyForPreview]);

  const handleDeleteJourney = useCallback(async (journeyId: string) => {
    try {
      const res = await fetchAiWithFallback(
        `/api/ai/journey/${encodeURIComponent(journeyId)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setSelectedJourneyForPreview((prev) => prev?.journey_id === journeyId ? null : prev);
        window.dispatchEvent(new Event("umoja_journey_updated"));
        refetchAllJourneys();
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
  }, [refetchAllJourneys]);

  const handleNextPlace = useCallback(() => {
    setCurrentPreviewPlaceIndex(prev => (prev + 1) % recommendedPlaces.length);
  }, [recommendedPlaces.length]);

  const handlePrevPlace = useCallback(() => {
    setCurrentPreviewPlaceIndex(prev => (prev - 1 + recommendedPlaces.length) % recommendedPlaces.length);
  }, [recommendedPlaces.length]);

  const handleRefetchPlaces = useCallback(() => {
    if (destLoading || placeRefetchesRemaining <= 0) return;
    const today = getLocalDateKey();
    const storageKey = getPlaceRefetchStorageKey(currentUserId);
    const nextCount = Math.min(PLACE_REFETCH_LIMIT_PER_DAY, placeRefetchCount + 1);

    setPlaceRefetchCount(nextCount);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ date: today, count: nextCount }));
    } catch { /* ignore */ }

    setCurrentPreviewPlaceIndex(0);
    setSelectedAspirationForPreview(null);
    refetchDestinationRecommendations({ force: true });
    toast.custom(
      (t) => <CalmNotificationToast t={t} priority="info" title="Refreshing Places" message="Fetching a fresh set of destination ideas." />,
      { duration: 2500, position: "top-center" }
    );
  }, [currentUserId, destLoading, placeRefetchCount, placeRefetchesRemaining, refetchDestinationRecommendations]);

  const handlePlanTripFromPlace = useCallback((p: PlaceItem) => {
    setPrefilledDestination(p.name);
    setIsPlaceDrawerOpen(false);
    openNewJourneyModal();
  }, [openNewJourneyModal]);

  const handleNewJourney = useCallback(() => {
    setPrefilledDestination("");
    openNewJourneyModal();
  }, [openNewJourneyModal]);
  const getAuthHeaders = useCallback(() => {
    const token = getLocalStorageValue("token") as string;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const loadAspirations = useCallback(async () => {
    if (!currentUserId) {
      setAspirations([]);
      return;
    }
    setAspirationsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/destinations/aspirations?limit=30`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const docs: any[] = Array.isArray(data?.data) ? data.data : [];
      setAspirations(docs.map((doc, index) => {
        const place = doc.place || {};
        const cat = place.category || "Destination";
        const id = place.id || doc.placeId || doc._id || `aspiration_${index}`;
        return {
          id,
          aspirationId: doc._id || `${id}_${index}`,
          name: place.name || "Destination",
          country: place.country || "",
          description: place.description || "",
          category: cat,
          rating: typeof place.rating === "number" ? place.rating : parseFloat(place.rating) || 4.5,
          imageUrl: place.imageUrl || getPlaceCategoryImage(cat, id),
          likedAt: doc.createdAt,
        } as AspirationItem;
      }));
    } catch (err) {
      console.warn("[Aspirations] failed to load", err);
    } finally {
      setAspirationsLoading(false);
    }
  }, [currentUserId, getAuthHeaders]);

  useEffect(() => {
    loadAspirations();
  }, [loadAspirations]);

  const handleLikePlace = useCallback(async (place: PlaceItem) => {
    if (!currentUserId) return;
    const placeKey = `${place.name.toLowerCase()}_${place.country.toLowerCase()}`;
    if (aspirationKeys.has(place.id) || aspirationKeys.has(placeKey)) return;

    try {
      const res = await fetch(`${backendUrl}/api/client/destinations/aspirations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ place, source: "journey_listing_places" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to save aspiration");

      await loadAspirations();
      toast.custom(
        (t) => <CalmNotificationToast t={t} priority="info" title="Aspiration Saved" message={`${place.name} is now in your travel aspirations.`} />,
        { duration: 2500, position: "top-center" }
      );
    } catch (err: any) {
      toast.custom(
        (t) => <CalmNotificationToast t={t} priority="warning" title="Could Not Save" message={err?.message || "Please try again."} />,
        { duration: 3000, position: "top-center" }
      );
    }
  }, [aspirationKeys, currentUserId, getAuthHeaders, loadAspirations]);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    removeLocalStorageValue("user");
    removeLocalStorageValue("token");
    removeLocalStorageValue("isLoggedIn");
    try { cookies.remove("jwt"); } catch { }
    navigate("/login");
  }, [dispatch, navigate]);

  const fetchAllNotifications = useCallback(async (showModal: boolean = false) => {
    if (!currentUserId || journeys.length === 0) return;
    setLoadingNotifications(true);
    try {
      const aggregated: BannerConfig[] = [];
      await Promise.all(journeys.map(async (j) => {
        try {
          const res = await fetch(`${backendUrl}/api/client/journey-notifications/${encodeURIComponent(j.journey_id)}`, { headers: getAuthHeaders() });
          if (!res.ok) return;
          const data = await res.json();
          const docs: any[] = Array.isArray(data?.data) ? data.data : [];
          for (const d of docs) {
            const banner: BannerConfig & { journeyId?: string } = {
              id: d.notificationId || d._id || String(Math.random()),
              priority: d.priority || "info",
              title: d.title,
              message: d.message,
              dismissible: true,
            } as BannerConfig & { journeyId?: string };
            banner.journeyId = j.journey_id;
            aggregated.push(banner as BannerConfig);
          }
        } catch (err) {
          console.warn("[Notifications] error fetching for journey", j.journey_id, err);
        }
      }));
      setNotificationsAll(aggregated);
      if (showModal) {
        setShowNotificationsAll(false);
        setNotificationsModalOpen(true);
      }
    } finally {
      setLoadingNotifications(false);
    }
  }, [journeys, currentUserId, getAuthHeaders]);

  // Auto-fetch notifications when journeys are loaded
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!isLoading && journeys.length > 0 && !initialFetchDone.current) {
      fetchAllNotifications(false);
      initialFetchDone.current = true;
    }
  }, [isLoading, journeys.length, fetchAllNotifications]);

  const handleNotificationsClick = useCallback(() => {
    // Fetch all notifications across journeys and show them as banners
    fetchAllNotifications(true);
  }, [fetchAllNotifications]);

  const tabCounts = useMemo(() => ({
    journeys: journeys.length,
    bookings: sortedBookings.length,
    flights: sortedFlights.length,
    places: recommendedPlaces.length,
    aspirations: aspirations.length,
    hotels: savedHotels.length,
    cars: DUMMY_CARS.length,
  }), [journeys.length, sortedBookings.length, sortedFlights.length, recommendedPlaces.length, aspirations.length, savedHotels.length]);

  const desktopPreviewTitle = useMemo(() => {
    if (previewJourney) return getDestinationLabel(previewJourney);
    if (previewBooking) return getBookingDestinationLabel(previewBooking, null);
    if (previewFlight) return `${formatAirportCity(previewFlight.departure)} → ${formatAirportCity(previewFlight.arrival)}`;
    if (previewHotel) return previewHotel.name;
    if (previewPlace) return previewPlace.name;
    return "Your next journey";
  }, [previewJourney, previewBooking, previewFlight, previewHotel, previewPlace]);

  const desktopPreviewSubtitle = useMemo(() => {
    if (previewJourney) return getBookingDates(null, previewJourney);
    if (previewBooking) return getBookingDates(previewBooking, null);
    if (previewFlight) return `${previewFlight.airline || "Flight"} ${previewFlight.flightNumber || ""}`.trim();
    if (previewHotel) return previewHotel.address || previewHotel.cityCode || "Stay recommendation";
    if (previewPlace) return `${previewPlace.country} • ${previewPlace.category}`;
    return "Curated travel intelligence across every stage of your trip.";
  }, [previewJourney, previewBooking, previewFlight, previewHotel, previewPlace]);

  const desktopPreviewImage = useMemo(() => {
    if (previewHotel) return previewHotel.imageUrl;
    if (previewPlace) return previewPlace.imageUrl;
    if (previewFlight) return getFlightImageUrl(previewFlight, 0);
    if (previewBooking) return getBookingImageUrl(previewBooking, 0);
    if (previewJourney) return getJourneyImageUrl(previewJourney, 0);
    return DEFAULT_FLIGHT_IMAGES[0];
  }, [previewJourney, previewBooking, previewFlight, previewPlace, previewHotel]);

  return (
    <div
      className="relative h-screen overflow-hidden bg-gradient-to-br from-background via-muted/20 to-background lg:flex lg:items-stretch lg:justify-center lg:px-6 lg:py-2 xl:px-8"
      style={{ background: `linear-gradient(135deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--background)) 38%, hsl(var(--muted) / 0.35) 68%, hsl(var(--background)) 100%)` }}
    >
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute left-[8%] top-10 h-64 w-64 rounded-full bg-cyan-400/14 blur-3xl" />
        <div className="absolute right-[12%] top-[18%] h-72 w-72 rounded-full bg-amber-300/16 blur-3xl" />
        <div className="absolute bottom-[8%] left-[38%] h-80 w-80 rounded-full bg-rose-300/10 blur-3xl" />
      </div>

      <section className="relative z-10 hidden min-h-0 w-full max-w-[720px] flex-1 lg:flex lg:pr-6 xl:pr-8">
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[36px] border border-white/45 bg-white/78 shadow-[0_30px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl">
          <div className="absolute inset-0">
            <img src={desktopPreviewImage} alt={desktopPreviewTitle} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.42),transparent_35%),linear-gradient(180deg,rgba(7,11,24,0.16),rgba(7,11,24,0.82))]" />
          </div>
          <div className="relative z-10 flex h-full flex-col p-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Journey Workspace</p>
                <h1 className="mt-3 text-4xl font-semibold leading-tight">{userName}, your travel desk is live.</h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleNotificationsClick}
                  className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/12 backdrop-blur-md transition hover:bg-white/20"
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => window.open('/journey/settings', '_blank')}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/12 backdrop-blur-md transition hover:bg-white/20"
                >
                  <Settings className="h-5 w-5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 text-sm font-medium backdrop-blur-md transition hover:bg-white/20"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Navigation className="h-4 w-4" />
                  {getUserCity()}
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-semibold">{weather?.current.temp ?? "--"}°</p>
                    <p className="mt-1 text-sm capitalize text-white/75">{weather?.current.description || "Live local weather"}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3 py-2 text-right text-xs text-white/75">
                    <p>Feels like {weather?.current.feels_like ?? "--"}°</p>
                    <p>Humidity {weather?.current.humidity ?? "--"}%</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <p className="text-sm text-white/75">Portfolio snapshot</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-3xl font-semibold">{journeys.length}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">Journeys</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold">{sortedBookings.length + sortedFlights.length}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">Air items</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold">{savedHotels.length}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">Hotels</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold">{recommendedPlaces.length}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">Ideas</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-5 pb-3">
              <div className="rounded-[32px] border border-white/15 bg-black/25 p-7 backdrop-blur-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">Now Focused</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">{desktopPreviewTitle}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/72">{desktopPreviewSubtitle}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    if (previewJourney) navigate(`/journey/${previewJourney.journey_id}`);
                    else if (previewPlace) handlePlanTripFromPlace(previewPlace);
                    else if (previewFlight?.journeyId) handleShowJourneyPreview(previewFlight.journeyId);
                    else if (previewHotel?.journeyId) handleShowJourneyPreview(previewHotel.journeyId);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:scale-[1.01]"
                >
                  <ChevronRight className="h-4 w-4" />
                  {previewJourney ? "Open journey" : previewPlace ? "Plan this trip" : "Show related journey"}
                </button>
                <button
                  onClick={handleNewJourney}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/18"
                >
                  <Plus className="h-4 w-4" />
                  New journey
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {TAB_CONFIG.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                      activeTab === tab.key
                        ? "bg-white text-slate-900"
                        : "bg-white/10 text-white/80 hover:bg-white/16"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] text-inherit">{tabCounts[tab.key]}</span>
                  </button>
                ))}
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        className="relative z-10 mx-auto flex h-full max-w-[450px] flex-col overflow-hidden rounded-t-[3rem] border border-border/40 shadow-sm shadow-black/30 lg:mx-0 lg:max-w-[520px] lg:flex-[0_0_520px] lg:rounded-[36px] lg:border-white/50 lg:bg-background/85 lg:shadow-[0_26px_80px_rgba(15,23,42,0.18)] lg:backdrop-blur-xl"
        style={{ background: `linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--card)) 45%, hsl(var(--card)) 100%)` }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        {/* Dome hero — greeting & widgets */}
        <DomeHero
          userName={userName}
          avatarSrc={avatarSrc}
          notificationCount={notificationCount}
          onNotificationsClick={handleNotificationsClick}
          onOpenSettings={() => { window.open('/journey/settings', '_blank'); }}
          onOpenSupport={() => { window.open('/support', '_blank', 'noopener,noreferrer'); }}
          onLogout={handleLogout}
          weather={weather}
          previewJourney={previewJourney}
          previewBooking={previewBooking}
          previewFlight={previewFlight}
          previewPlace={previewPlace}
          isAspirationPreview={isAspirationPreview}
          isPlaceLiked={isPreviewPlaceLiked}
          previewHotel={previewHotel}
          onExplore={(j) => navigate(`/journey/${j.journey_id}`)}
          onShowJourney={handleShowJourneyPreview}
          onNextPlace={handleNextPlace}
          onPrevPlace={handlePrevPlace}
          onPlanNow={handlePlanTripFromPlace}
          onLikePlace={handleLikePlace}
          onRefetchPlaces={handleRefetchPlaces}
          placeRefetchesRemaining={placeRefetchesRemaining}
          isRefetchingPlaces={destLoading}
          onDeleteJourney={handleDeleteJourney}
          onShowDetails={(p) => {
            setSelectedPlaceDetail(p);
            setSelectedPlaceDetailIsAspiration(isAspirationPreview);
            setIsPlaceDrawerOpen(true);
          }}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabCounts={tabCounts}
        />

        {/* Notification banners are shown in a modal (reuses JourneyHome styles) */}
        {/* Cards section — warm rose tint */}
        <div className="flex-1 min-h-0 flex flex-col bg-rose-500/[0.03]">
          <CardDeckSection
            activeTab={activeTab}
            onTabChange={handleTabChange}
            journeys={sortedJourneys}
            bookings={sortedBookings}
            flights={sortedFlights}
            places={recommendedPlaces}
            aspirations={aspirations}
            hotels={savedHotels}
            cars={DUMMY_CARS}
            isLoading={isLoading}
            onJourneyClick={handleJourneyClick}
            onBookingClick={handleBookingClick}
            onFlightClick={handleFlightClick}
            onPlaceClick={handlePlaceDetailClick}
            onAspirationClick={handleAspirationClick}
            onHotelClick={handleHotelClick}
            onNewJourney={handleNewJourney}
          />
        </div>

        {/* Chat bar — soft teal tint */}
        <div className="shrink-0 bg-teal-500/[0.05] border-t border-teal-300/15">
          <BottomChatBar
            onMapClick={() => setNearbyPlacesOpen(true)}
            onConversationsClick={() => setConversationDrawerOpen(true)}
            onNewJourneyClick={handleNewJourney}
            onSupportClick={() => { window.open('/support', '_blank', 'noopener,noreferrer'); }}
            onSendMessage={(msg) => {
              setInitialChatMessage(msg);
              setInitialChatMessageSource("text");
              setChatDrawerOpen(true);
            }}
            onMicClick={() => setSpeechModalOpen(true)}
          />
        </div>

        <PlaceDetailsDrawer
          open={isPlaceDrawerOpen}
          onClose={() => setIsPlaceDrawerOpen(false)}
          onPlanTrip={handlePlanTripFromPlace}
          onLikePlace={handleLikePlace}
          place={selectedPlaceDetail}
          isAspiration={selectedPlaceDetailIsAspiration}
          isLiked={
            !!selectedPlaceDetail && (
              aspirationKeys.has(selectedPlaceDetail.id) ||
              aspirationKeys.has(`${selectedPlaceDetail.name.toLowerCase()}_${selectedPlaceDetail.country.toLowerCase()}`)
            )
          }
        />

        <NearbyPlacesMap
          open={nearbyPlacesOpen}
          onClose={() => { setNearbyPlacesOpen(false); setFocusedPlace(null); }}
          focusedPlace={focusedPlace}
        />

        <NewJourneyModal
          open={newJourneyModalOpen}
          initialDestination={prefilledDestination}
          onClose={closeNewJourneyModal}
          onSubmit={handleNewJourneySubmit}
          isCreating={isCreatingJourney}
          onOpenSettings={() => {
            closeNewJourneyModal();
            window.open('/journey/settings', '_blank');
          }}
        />

        <NewJourneyChatDrawer
          open={chatDrawerOpen}
          onClose={() => {
            setChatDrawerOpen(false);
            setResumeConversationId(null);
          }}
          initialMessage={initialChatMessage}
          initialMessageSource={initialChatMessageSource}
          userId={currentUserId}
          userData={currentUser}
          resumeConversationId={resumeConversationId}
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

        {/* Conversation Drawer — general (non-journey-linked) chat history */}
        <ConversationDrawer
          open={conversationDrawerOpen}
          onClose={() => setConversationDrawerOpen(false)}
          userId={currentUserId}
          userData={currentUser}
          onConversationSelect={(convId) => {
            setResumeConversationId(convId);
            setInitialChatMessage("");
            setInitialChatMessageSource("text");
            setChatDrawerOpen(true);
          }}
        />
      </div>

      <NotificationsModal
        open={notificationsModalOpen}
        notifications={notificationsAll}
        onClose={() => setNotificationsModalOpen(false)}
        onDismiss={async (id: string) => {
          try {
            const item = notificationsAll.find((n) => n.id === id) as any;
            const jid = item?.journeyId;
            if (jid) {
              await fetch(`${backendUrl}/api/client/journey-notifications/${encodeURIComponent(jid)}/dismiss/${encodeURIComponent(id)}`, { method: "PATCH", headers: getAuthHeaders() });
            }
          } catch (err) { console.warn(err); }
          setNotificationsAll((prev) => prev.filter((x) => x.id !== id));
        }}
        onClearAll={async () => {
          try {
            await Promise.all(notificationsAll.map(async (n) => {
              const jid = (n as any).journeyId;
              if (jid) {
                await fetch(`${backendUrl}/api/client/journey-notifications/${encodeURIComponent(jid)}/dismiss/${encodeURIComponent(n.id)}`, { method: "PATCH", headers: getAuthHeaders() });
              }
            }));
          } catch (err) { console.warn(err); }
          setNotificationsAll([]);
          setNotificationsModalOpen(false);
        }}
        onBannerClick={(b) => {
          const jid = (b as any).journeyId;
          if (jid) window.open(`/journey/${jid}`, "_blank");
        }}
      />
    </div>
  );
};

export default JourneyListingPage;
