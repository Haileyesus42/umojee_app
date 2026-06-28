import React, { useMemo } from "react";
import { Flight, resolveImage } from "../utils";
import { Passenger } from "./PassengerDetailsForm";
import airlineImages from "../../utils/airlineImages.json";

type SelectedSeat = { row: number; seat: string };
type LuggageOption = { label: string; weight: string; price: number };

type ReviewDetailsProps = {
  flight: Flight;
  passengers: Passenger[];
  seats: SelectedSeat[];
  luggage: LuggageOption[];
  onBack: () => void;
  onSubmit: () => void;
  onEditFlight?: () => void;
  onEditPassengers?: () => void;
  onEditSeats?: () => void;
  onEditLuggage?: () => void;
  isBooking?: boolean;
  bookingError?: string | null;
};

const ReviewDetails: React.FC<ReviewDetailsProps> = ({
  flight,
  passengers,
  seats,
  luggage,
  onBack,
  onSubmit,
  onEditFlight,
  onEditPassengers,
  onEditSeats,
  onEditLuggage,
  isBooking = false,
  bookingError = null,
}) => {
  const totalLuggage = luggage.reduce((sum, item) => sum + (Number(item?.price) || 0), 0);
  const totalFare = Number(flight.price || 0) + totalLuggage;
  const coverImage = useMemo(() => {
    // Attempt to match the airline name or code against our static JSON
    const airlines = airlineImages as Record<string, any>;
    const matched = Object.values(airlines).find(
      (a) =>
        a.name?.toLowerCase() === flight.airline.toLowerCase() ||
        a.iata?.toLowerCase() === flight.airline.toLowerCase()
    );
    if (matched && matched.airline_image) {
      return matched.airline_image;
    }

    if (flight.imageUrls && flight.imageUrls.length > 0) return flight.imageUrls[0];
    if (flight.imageUrl) return flight.imageUrl;
    return "";
  }, [flight]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onEditFlight}
        className="group relative block w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-md shadow-black/10 transition hover:-translate-y-[1px] hover:shadow-lg"
      >
        <div className="relative h-40">
          <img
            src={resolveImage(coverImage)}
            alt={`${flight.airline} ${flight.flightNo}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {onEditFlight && (
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/80 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-tight text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Click to edit
            </span>
          )}
          <div className="absolute bottom-3 left-4 space-y-1 text-white drop-shadow">
            <p className="text-sm font-semibold">
              {flight.airline} - {flight.flightNo}
            </p>
            <p className="text-xs text-white/90">
              {flight.from} → {flight.to} • {flight.stops}
            </p>
          </div>
          <div className="absolute top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/40">
            ${Number(flight.price || 0).toFixed(2)}
          </div>
          <div className="absolute top-3 left-4 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white shadow">
            {flight.travelTime}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Review & confirm</p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
              Total ${Number(totalFare || 0).toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Verify passengers, seats, and extras before booking.
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onEditPassengers}
        className="group relative block w-full space-y-2 rounded-2xl border border-border bg-card/80 p-4 text-left shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
      >
        <p className="text-sm font-semibold text-foreground">Passengers</p>
        {onEditPassengers && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/80 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-tight text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Click to edit
          </span>
        )}
        <div className="space-y-2">
          {passengers.map((p, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {p.firstName} {p.lastName}
                </span>
                <span>{p.nationality || "-"}</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-foreground">
                <span className="truncate">Email: {p.email || "-"}</span>
                <span className="truncate">Phone: {p.phone || "-"}</span>
                <span className="truncate">DOB: {p.dateOfBirth || "-"}</span>
                <span className="truncate">Passport: {p.passport || "-"}</span>
              </div>
            </div>
          ))}
        </div>
      </button>

      <button
        type="button"
        onClick={onEditSeats}
        className="group relative block w-full space-y-2 rounded-2xl border border-border bg-card/80 p-4 text-left shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Seats</p>
          <span className="text-[11px] text-muted-foreground">{seats.length}</span>
        </div>
        {onEditSeats && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/80 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-tight text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Click to edit
          </span>
        )}
        {seats.length === 0 ? (
          <p className="text-xs text-muted-foreground">No seats selected.</p>
        ) : (
          <div className="flex flex-wrap gap-2 text-[12px] text-foreground">
            {seats.map((s, idx) => (
              <span
                key={idx}
                className="rounded-full border border-border bg-card px-2 py-1 shadow-sm"
              >
                Row {s.row}
                {s.seat}
              </span>
            ))}
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={onEditLuggage}
        className="group relative block w-full space-y-2 rounded-2xl border border-border bg-card/80 p-4 text-left shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Extra luggage</p>
          <span className="text-[11px] text-muted-foreground">${totalLuggage.toFixed(2)}</span>
        </div>
        {onEditLuggage && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/80 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-tight text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Click to edit
          </span>
        )}
        {luggage.length === 0 ? (
          <p className="text-xs text-muted-foreground">No extra luggage added.</p>
        ) : (
          <div className="space-y-2">
            {luggage.map((bag, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-border/70 bg-card px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-foreground">{bag.label}</p>
                  <p className="text-[11px] text-muted-foreground">{bag.weight}</p>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {bag.price === 0 ? "Included" : `$${bag.price}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </button>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isBooking}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBooking ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Booking...
            </span>
          ) : (
            "Confirm booking"
          )}
        </button>
      </div>

      {bookingError && (
        <p className="text-xs text-red-500 text-center">{bookingError}</p>
      )}
    </div>
  );
};

export default ReviewDetails;
