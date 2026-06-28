import React from "react";
import {
  FiMapPin,
  FiCalendar,
  FiDollarSign,
  FiCheckCircle,
  FiXCircle,
  FiArchive,
} from "react-icons/fi";
import {
  Plane,
  Play,
  XCircle,
  Clock,
  Tag,
  Trash2,
} from "lucide-react";
import type { JourneyItem } from "../hooks/useAllJourneys";

interface TripCardProps {
  journey: JourneyItem;
  onClick?: (journey: JourneyItem) => void;
  onArchive?: (journeyId: string) => void;
  onCancel?: (journeyId: string) => void;
  onDelete?: (journeyId: string) => void;
  activeJourneyId?: string | null;
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDestination(journey: JourneyItem): string {
  const fs = journey.context?.flight_status;
  if (fs?.arrival_airport) return fs.arrival_airport;
  // Inspiration segment: fall back to planned_destination from context
  if (journey.context?.planned_destination) return journey.context.planned_destination;
  for (const seg of journey.segments || []) {
    if (seg.context?.destination_airport) return seg.context.destination_airport;
    if (seg.context?.arrival_airport) return seg.context.arrival_airport;
  }
  return "—";
}

function getOrigin(journey: JourneyItem): string {
  const fs = journey.context?.flight_status;
  if (fs?.departure_airport) return fs.departure_airport;
  if (journey.context?.airport_code) return journey.context.airport_code;
  // Inspiration segment: fall back to departure_city from context
  if (journey.context?.departure_city) return journey.context.departure_city;
  for (const seg of journey.segments || []) {
    if (seg.context?.origin_airport) return seg.context.origin_airport;
    if (seg.context?.departure_airport) return seg.context.departure_airport;
  }
  return "—";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatPrice(price?: number, currency?: string): string | null {
  if (!price) return null;
  const cur = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(price);
  } catch {
    return `${cur} ${price.toFixed(2)}`;
  }
}

const statusConfig: Record<
  string,
  { label: string; borderBg: string; badgeBg: string; badgeText: string; icon: React.ReactNode }
> = {
  planning: {
    label: "Planning",
    borderBg: "border-blue-200 bg-blue-50",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    icon: <Clock className="h-4 w-4 text-blue-500" />,
  },
  in_progress: {
    label: "In Progress",
    borderBg: "border-amber-200 bg-amber-50",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    icon: <Play className="h-4 w-4 text-amber-500" />,
  },
  completed: {
    label: "Completed",
    borderBg: "border-emerald-200 bg-emerald-50",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    icon: <FiCheckCircle className="h-4 w-4 text-emerald-500" />,
  },
  cancelled: {
    label: "Cancelled",
    borderBg: "border-destructive/20 bg-destructive/5",
    badgeBg: "bg-destructive/10",
    badgeText: "text-destructive",
    icon: <FiXCircle className="h-4 w-4 text-destructive" />,
  },
};

const segmentLabels: Record<string, string> = {
  inspiration: "Inspiration",
  home_to_airport: "Home → Airport",
  airport_to_flight: "Airport → Flight",
  flight_to_hotel: "Flight → Hotel",
  hotel_to_activities: "Hotel → Activities",
  return: "Return Journey",
};

const TripCard: React.FC<TripCardProps> = ({
  journey,
  onClick,
  onArchive,
  onCancel,
  onDelete,
  activeJourneyId,
  className = "",
}) => {
  const isActive = !!(activeJourneyId && journey.journey_id === activeJourneyId);
  const status = statusConfig[journey.status] || statusConfig.planning;
  const fs = journey.context?.flight_status;
  const isInspiration = journey.current_segment === "inspiration";
  const origin = getOrigin(journey);
  const destination = getDestination(journey);
  const priceStr = isInspiration
    ? formatPrice(journey.context?.budget?.max, journey.context?.budget?.currency)
    : formatPrice(fs?.price, fs?.currency);
  const bookingRef = fs?.booking_reference;
  const airline = fs?.airline;
  const flightNo = fs?.flight_number;
  const departureDate = fs?.departure_time || journey.context?.planned_departure_date || journey.created_at;

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-all hover:shadow-md cursor-pointer ${status.borderBg} ${className}`}
      onClick={() => onClick?.(journey)}
    >
      {/* Route header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Plane className="h-4 w-4 text-primary shrink-0" />
          <h3 className="font-semibold text-foreground text-sm truncate">
            {origin} → {destination}
          </h3>
        </div>
        {journey.status === "cancelled" && onDelete ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Delete this journey permanently?")) {
                onDelete(journey.journey_id);
              }
            }}
            className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
            title="Delete journey"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="p-1 shrink-0">{status.icon}</span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <FiMapPin className="h-3 w-3" />
          <span>{segmentLabels[journey.current_segment] || journey.current_segment}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <FiCalendar className="h-3 w-3" />
          <span>{formatDate(departureDate)}</span>
        </div>

        {(airline || flightNo) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
            <Plane className="h-3 w-3" />
            <span>{[airline, flightNo].filter(Boolean).join(" ")}</span>
          </div>
        )}

        {priceStr && (
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <FiDollarSign className="h-3 w-3" />
            <span>{isInspiration ? `Budget: ${priceStr}` : priceStr}</span>
          </div>
        )}

        {isInspiration && journey.context?.travelers_count && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" />
            <span>{journey.context.travelers_count} Traveler{journey.context.travelers_count > 1 ? "s" : ""}</span>
            {journey.context?.duration_days && (
              <span className="ml-1">· {journey.context.duration_days} Days</span>
            )}
          </div>
        )}

        {!isInspiration && bookingRef && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" />
            <span>PNR: {bookingRef}</span>
          </div>
        )}
      </div>

      {/* Status badge (centered) */}
      <div className="flex justify-center pt-3 mt-3 border-t border-border/50">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${status.badgeBg} ${status.badgeText}`}
        >
          {status.icon}
          {status.label}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center flex-wrap gap-1.5 mt-2">
        <button
          onClick={(e) => { e.stopPropagation(); if (!isActive) onArchive?.(journey.journey_id); }}
          disabled={isActive}
          className={`flex items-center gap-1 text-xs font-medium transition-colors px-2.5 py-1 rounded-lg ${isActive
              ? "text-muted-foreground bg-muted cursor-not-allowed opacity-60"
              : "text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10"
            }`}
        >
          <FiArchive className="h-3 w-3" />
          Archive
        </button>

        {(journey.status === "planning" || journey.status === "in_progress") && (
          <button
            onClick={(e) => { e.stopPropagation(); if (!isActive) onClick?.(journey); }}
            disabled={isActive}
            className={`flex items-center gap-1 text-xs font-medium transition-colors px-2.5 py-1 rounded-lg ${isActive
                ? "text-muted-foreground bg-muted cursor-not-allowed opacity-60"
                : "text-emerald-600 hover:text-emerald-500 bg-emerald-50 hover:bg-emerald-100"
              }`}
          >
            <FiMapPin className="h-3 w-3" />
            {isActive ? "Tracking" : "Track"}
          </button>
        )}

        {journey.status === "in_progress" && onCancel && (
          <button
            onClick={(e) => { e.stopPropagation(); onCancel(journey.journey_id); }}
            className="p-1 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-50 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TripCard;
