import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plane,
  Clock,
  CreditCard,
  Hash,
  User,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Shield,
  Luggage,
} from "lucide-react";
import type { AmadeusBooking } from "../hooks/useAllJourneys";
import { formatAirportCity } from "../utils/airportCityMap";
import airlineImagesData from "../utils/airlineImages.json";

const ITEMS_PER_PAGE = 5;

// ─── Airline Image Lookup ────────────────────────────────────────────────────

const AIRLINE_IMAGES = airlineImagesData as Record<
  string,
  { iata: string; name: string; airline_image: string }
>;

function getAirlineImage(carrierCode: string): string {
  return AIRLINE_IMAGES[carrierCode]?.airline_image || "";
}

function getAirlineName(carrierCode: string): string {
  return AIRLINE_IMAGES[carrierCode]?.name || "";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(iso?: string): string {
  if (!iso) return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const mins = match[2] ? parseInt(match[2]) : 0;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "--:--";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "--:--";
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatPrice(price?: { currency?: string; total?: string; grandTotal?: string }): string {
  if (!price) return "--";
  const amount = parseFloat(price.grandTotal || price.total || "0");
  if (!amount) return "--";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: price.currency || "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function maskDocument(num?: string): string {
  if (!num) return "";
  if (num.length <= 4) return num;
  return "****" + num.slice(-4);
}

function extractFareDetails(booking: AmadeusBooking) {
  const offer = booking.rawOrder?.data?.flightOffers?.[0];
  const travelerPricing = offer?.travelerPricings?.[0];
  const fareBySegment = travelerPricing?.fareDetailsBySegment || [];

  const cabin = fareBySegment[0]?.cabin || "";
  const brandedFare = fareBySegment[0]?.brandedFare || "";
  const fareClass = fareBySegment[0]?.class || "";

  const bags = fareBySegment[0]?.includedCheckedBags;
  let baggageStr = "";
  if (bags?.weight && bags?.weightUnit) {
    baggageStr = `${bags.weight}${bags.weightUnit.toLowerCase()}`;
  } else if (bags?.quantity) {
    baggageStr = `${bags.quantity} bag${bags.quantity > 1 ? "s" : ""}`;
  }

  const basePrice = travelerPricing?.price?.base
    ? parseFloat(travelerPricing.price.base)
    : null;
  const taxes = travelerPricing?.price?.taxes || [];
  const totalTaxes = taxes.reduce(
    (sum: number, t: any) => sum + (parseFloat(t.amount) || 0),
    0
  );

  return { cabin, brandedFare, fareClass, baggageStr, basePrice, totalTaxes, taxes };
}

function getRouteStops(booking: AmadeusBooking): string[] {
  const segments = booking.itineraries?.[0]?.segments || [];
  if (segments.length === 0) return [];
  const stops: string[] = [];
  if (segments[0]?.departure?.iataCode) stops.push(segments[0].departure.iataCode);
  for (const seg of segments) {
    const arr = seg.arrival?.iataCode;
    if (arr && !stops.includes(arr)) stops.push(arr);
  }
  return stops;
}

function getTotalDuration(booking: AmadeusBooking): string {
  const segments = booking.itineraries?.[0]?.segments || [];
  if (segments.length === 0) return "";
  const firstDep = segments[0]?.departure?.at;
  const lastArr = segments[segments.length - 1]?.arrival?.at;
  if (!firstDep || !lastArr) return "";
  try {
    const ms = new Date(lastArr).getTime() - new Date(firstDep).getTime();
    const hours = Math.floor(ms / 3_600_000);
    const mins = Math.round((ms % 3_600_000) / 60_000);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  } catch {
    return "";
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface BookingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: AmadeusBooking[];
  isLoading?: boolean;
}

// ─── Booking Card ────────────────────────────────────────────────────────────

const BookingCard: React.FC<{ booking: AmadeusBooking; index: number }> = ({
  booking,
  index,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const segments = booking.itineraries?.[0]?.segments || [];
  const routeStops = getRouteStops(booking);
  const fare = extractFareDetails(booking);
  const totalDuration = getTotalDuration(booking);
  const traveler = booking.travelers?.[0];
  const departureDate = segments[0]?.departure?.at;

  // Airline image for the hero header (use the primary carrier)
  const primaryCarrier = segments[0]?.carrierCode || "";
  const airlineName = getAirlineName(primaryCarrier);
  const heroImageUrl = getAirlineImage(primaryCarrier);
  const finalDestination = routeStops[routeStops.length - 1] || "";

  const flightStatus = useMemo(() => {
    if (!departureDate) return "unknown";
    const dep = new Date(departureDate);
    const now = new Date();
    const diffMs = dep.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 86_400_000);
    if (diffDays < 0) return "past";
    if (diffDays === 0) return "today";
    return "upcoming";
  }, [departureDate]);

  const statusConfig = {
    upcoming: { label: "Upcoming", bg: "bg-emerald-500", text: "text-white" },
    today: { label: "Today", bg: "bg-amber-500", text: "text-white" },
    past: { label: "Completed", bg: "bg-white/20 backdrop-blur-sm", text: "text-white" },
    unknown: { label: "Booked", bg: "bg-blue-500", text: "text-white" },
  };
  const status = statusConfig[flightStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* ── Hero Header with Destination Image ───────────────────────────── */}
      <div className="relative h-[160px] overflow-hidden">
        {/* Background image */}
        {heroImageUrl && !imgError ? (
          <img
            src={heroImageUrl}
            alt={airlineName || primaryCarrier || finalDestination}
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600" />
        )}

        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        {/* Content on top of image */}
        <div className="relative h-full flex flex-col justify-between px-4 pt-3 pb-3 text-white">
          {/* Top row: status + PNR */}
          <div className="flex items-center justify-between">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text}`}>
              {status.label}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/15 backdrop-blur-sm text-[10px] text-white/90 font-mono font-semibold">
              {booking.bookingReference || booking.referenceNumber || ""}
            </span>
          </div>

          {/* Bottom: Route visualization */}
          <div>
            {/* Route stops */}
            <div className="flex items-center gap-1.5 mb-1.5">
              {routeStops.map((stop, i) => (
                <React.Fragment key={stop}>
                  <div className="text-center min-w-0">
                    <div className="text-base font-bold leading-none drop-shadow-md">{stop}</div>
                    <div className="text-[9px] text-white/70 mt-0.5 leading-tight truncate max-w-[65px] drop-shadow">
                      {formatAirportCity(stop).replace(` (${stop})`, "")}
                    </div>
                  </div>
                  {i < routeStops.length - 1 && (
                    <div className="flex-1 flex items-center gap-0.5 px-0.5 min-w-[30px]">
                      <div className="flex-1 border-t border-dashed border-white/40" />
                      <Plane className="h-3 w-3 text-white/70 shrink-0" />
                      <div className="flex-1 border-t border-dashed border-white/40" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Info pills */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-white/15 backdrop-blur-sm text-white/90">
                {formatShortDate(departureDate)}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/15 backdrop-blur-sm text-white/90">
                {segments.length} seg{segments.length !== 1 ? "s" : ""}
                {totalDuration ? ` · ${totalDuration}` : ""}
              </span>
              <span className="ml-auto px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm font-bold text-white text-[11px]">
                {formatPrice(booking.price)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Flight Segments ──────────────────────────────────────────────── */}
      <div className="px-4 py-3 space-y-2.5">
        {segments.map((seg, segIdx) => {
          const carrier = seg.carrierCode || "";
          const flightNum = seg.flightNumber || "";
          return (
            <div key={`${seg.departure?.iataCode}-${seg.arrival?.iataCode}-${segIdx}`} className="relative">
              {/* Segment header */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                  <Plane className="h-2.5 w-2.5" />
                  {getAirlineName(carrier) || carrier} {flightNum}
                </div>
                {seg.aircraftCode && (
                  <span className="text-[10px] text-muted-foreground">{seg.aircraftCode}</span>
                )}
                {fare.cabin && segIdx === 0 && (
                  <span className="ml-auto text-[10px] font-medium text-primary capitalize">
                    {fare.cabin.toLowerCase()}
                    {fare.brandedFare ? ` · ${fare.brandedFare.replace(/([A-Z])/g, " $1").trim()}` : ""}
                  </span>
                )}
              </div>

              {/* Timeline row */}
              <div className="flex items-stretch gap-3">
                <div className="flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-bold text-foreground tabular-nums">
                      {formatTime(seg.departure?.at)}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{seg.departure?.iataCode}</span>
                    {seg.departure?.terminal && (
                      <span className="text-[10px] text-muted-foreground">T{seg.departure.terminal}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center min-w-[80px]">
                  <span className="text-[10px] text-muted-foreground">{formatDuration(seg.duration)}</span>
                  <div className="w-full flex items-center my-0.5">
                    <div className="h-[1.5px] flex-1 bg-border" />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mx-0.5" />
                    <div className="h-[1.5px] flex-1 bg-border" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {(seg.numberOfStops ?? 0) === 0 ? "Direct" : `${seg.numberOfStops} stop`}
                  </span>
                </div>

                <div className="flex-1 text-right">
                  <div className="flex items-baseline gap-1.5 justify-end">
                    {seg.arrival?.terminal && (
                      <span className="text-[10px] text-muted-foreground">T{seg.arrival.terminal}</span>
                    )}
                    <span className="text-xs font-semibold text-foreground">{seg.arrival?.iataCode}</span>
                    <span className="text-base font-bold text-foreground tabular-nums">
                      {formatTime(seg.arrival?.at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Layover indicator */}
              {segIdx < segments.length - 1 && (() => {
                const nextSeg = segments[segIdx + 1];
                const arrTime = seg.arrival?.at;
                const depTime = nextSeg?.departure?.at;
                if (!arrTime || !depTime) return null;
                try {
                  const layoverMs = new Date(depTime).getTime() - new Date(arrTime).getTime();
                  const layoverMins = Math.round(layoverMs / 60_000);
                  const hrs = Math.floor(layoverMins / 60);
                  const mins = layoverMins % 60;
                  const layoverStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                  return (
                    <div className="flex items-center justify-center gap-2 my-2 py-1.5 border-y border-dashed border-border/60">
                      <Clock className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] font-medium text-amber-600">
                        {layoverStr} layover in {formatAirportCity(seg.arrival?.iataCode || "")}
                      </span>
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}
            </div>
          );
        })}
      </div>

      {/* ── Details Grid ─────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-3 gap-2 py-2.5 border-t border-border/60">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">PNR</span>
            </div>
            <span className="text-xs font-bold text-foreground font-mono">
              {booking.bookingReference || "--"}
            </span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Luggage className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Baggage</span>
            </div>
            <span className="text-xs font-bold text-foreground">
              {fare.baggageStr || "--"}
            </span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <CreditCard className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Total</span>
            </div>
            <span className="text-xs font-bold text-primary">
              {formatPrice(booking.price)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Expand Toggle ────────────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 border-t border-border/40 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        {expanded ? "Less details" : "More details"}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {/* ── Expanded Details ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Traveler info */}
              {traveler && (
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Traveler</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {[traveler.firstName, traveler.lastName].filter(Boolean).join(" ")}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    {traveler.dateOfBirth && <span>DOB: {formatDate(traveler.dateOfBirth)}</span>}
                    {traveler.gender && <span className="capitalize">{traveler.gender.toLowerCase()}</span>}
                  </div>
                  {traveler.documents?.[0] && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <span>{traveler.documents[0].documentType || "Passport"}: {maskDocument(traveler.documents[0].number)}</span>
                      {traveler.documents[0].nationality && (
                        <span className="ml-1 px-1.5 py-0 rounded bg-muted text-[10px] font-mono font-semibold">
                          {traveler.documents[0].nationality}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Fare & Price breakdown */}
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Ticket className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Fare Details</span>
                </div>
                <div className="space-y-1.5">
                  {fare.cabin && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Cabin</span>
                      <span className="font-medium text-foreground capitalize">{fare.cabin.toLowerCase()}</span>
                    </div>
                  )}
                  {fare.brandedFare && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Fare</span>
                      <span className="font-medium text-foreground">{fare.brandedFare.replace(/([A-Z])/g, " $1").trim()}</span>
                    </div>
                  )}
                  {fare.fareClass && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Class</span>
                      <span className="font-mono font-semibold text-foreground">{fare.fareClass}</span>
                    </div>
                  )}
                  <div className="border-t border-border/50 pt-1.5 mt-1.5" />
                  {fare.basePrice !== null && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Base fare</span>
                      <span className="font-medium text-foreground">${fare.basePrice.toFixed(2)}</span>
                    </div>
                  )}
                  {fare.totalTaxes > 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Taxes & fees</span>
                      <span className="font-medium text-foreground">${fare.totalTaxes.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs font-bold border-t border-border/50 pt-1.5">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary">{formatPrice(booking.price)}</span>
                  </div>
                </div>
              </div>

              {/* Booking metadata */}
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Booking Info</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">PNR</span>
                    <span className="font-mono font-semibold text-foreground">{booking.bookingReference || "--"}</span>
                  </div>
                  {booking.referenceNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Ref#</span>
                      <span className="font-mono font-semibold text-foreground">{booking.referenceNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Booked</span>
                    <span className="font-medium text-foreground">{formatDate(booking.createdAt)}</span>
                  </div>
                  {booking.amadeusOrderId && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Order</span>
                      <span className="font-mono text-[10px] text-foreground truncate max-w-[100px]">{booking.amadeusOrderId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Drawer Component ───────────────────────────────────────────────────

const BookingsDrawer: React.FC<BookingsDrawerProps> = ({
  isOpen,
  onClose,
  bookings,
  isLoading,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when drawer opens
  React.useEffect(() => {
    if (isOpen) setCurrentPage(1);
  }, [isOpen]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const totalSpent = bookings.reduce((sum, b) => {
      return sum + (parseFloat(b.price?.grandTotal || b.price?.total || "0") || 0);
    }, 0);
    const now = new Date();
    const upcoming = bookings.filter((b) => {
      const dep = b.itineraries?.[0]?.segments?.[0]?.departure?.at;
      if (!dep) return false;
      return new Date(dep).getTime() > now.getTime();
    }).length;
    return { total, totalSpent, upcoming };
  }, [bookings]);

  const totalPages = Math.max(1, Math.ceil(bookings.length / ITEMS_PER_PAGE));

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return bookings.slice(start, start + ITEMS_PER_PAGE);
  }, [bookings, currentPage]);

  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bookings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="bookings-drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] rounded-t-2xl bg-background border-t border-border shadow-2xl flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-600/10 flex items-center justify-center">
                  <Plane className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">My Bookings</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {stats.total} booking{stats.total !== 1 ? "s" : ""}
                    {stats.upcoming > 0 ? ` · ${stats.upcoming} upcoming` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading bookings...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
                    <Plane className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No bookings yet</p>
                  <p className="text-xs text-muted-foreground text-center max-w-[240px]">
                    Book a flight through the AI assistant to see your reservations here
                  </p>
                </div>
              ) : (
                <>
                  {/* Stats summary */}
                  <div className="grid grid-cols-3 gap-2.5 mb-5">
                    <div className="rounded-xl border border-border bg-card p-3 text-center">
                      <div className="text-lg font-bold text-blue-600 leading-none">{stats.total}</div>
                      <div className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Total</div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3 text-center">
                      <div className="text-lg font-bold text-emerald-600 leading-none">{stats.upcoming}</div>
                      <div className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Upcoming</div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3 text-center">
                      <div className="text-lg font-bold text-primary leading-none">
                        ${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Spent</div>
                    </div>
                  </div>

                  {/* Booking cards (paginated) */}
                  <div className="space-y-4">
                    {paginatedBookings.map((booking, index) => (
                      <BookingCard key={booking._id} booking={booking} index={index} />
                    ))}
                  </div>

                  {/* Results summary */}
                  <div className="mt-4 text-center text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    {" "}-{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, bookings.length)} of{" "}
                    {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
                  </div>
                </>
              )}
            </div>

            {/* Pagination footer */}
            {bookings.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BookingsDrawer;
