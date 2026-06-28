import React from "react";
import { Flight, formatDateTime, resolveImage, formatBaggage } from "../utils";
import airlineImages from "../../utils/airlineImages.json";

type FlightDetailProps = {
  flight: Flight;
  onBack: () => void;
  onSelect: () => void;
};

const FlightDetail: React.FC<FlightDetailProps> = ({ flight, onBack, onSelect }) => {
  const images = React.useMemo(() => {
    // Attempt to match the airline name or code against our static JSON
    const airlines = airlineImages as Record<string, any>;
    const matched = Object.values(airlines).find(
      (a) =>
        a.name?.toLowerCase() === flight.airline.toLowerCase() ||
        a.iata?.toLowerCase() === flight.airline.toLowerCase()
    );
    if (matched && matched.airline_image) {
      return [matched.airline_image];
    }

    if (flight.imageUrls && flight.imageUrls.length > 0) return flight.imageUrls;
    if (flight.imageUrl) return [flight.imageUrl];
    return [""];
  }, [flight]);

  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    setCurrentIndex(0);
  }, [flight.id]);

  const handlePrev = () => {
    if (!images.length) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    if (!images.length) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const hasMultipleImages = images.length > 1;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-muted/20 shadow-sm">
        <div className="relative h-48 w-full bg-card/60">
          <img
            src={resolveImage(images[currentIndex])}
            alt={`${flight.airline} flight`}
            className="h-full w-full object-cover transition-all duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg shadow-black/25 ring-1 ring-black/5 transition hover:-translate-y-[52%] hover:bg-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M15.5 5.5 9 12l6.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next image"
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg shadow-black/25 ring-1 ring-black/5 transition hover:-translate-y-[52%] hover:bg-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M8.5 18.5 15 12 8.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 w-1.5 rounded-full ${idx === currentIndex ? "bg-white" : "bg-white/40"}`}
                  />
                ))}
              </div>
            </>
          )}
          <div className="absolute bottom-3 left-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white shadow-md">
            {flight.airline} - {flight.flightNo}
          </div>
          <div className="absolute top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/40">
            ${Number(flight.price || 0).toFixed(2)}
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{flight.stops}</p>
              <p className="text-xs text-muted-foreground">Total travel time - {flight.travelTime}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Best pick
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-card p-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Departure</p>
              <p className="font-semibold leading-tight text-foreground">
                {flight.from} - {formatDateTime(flight.departure)}
              </p>
            </div>
            <div className="rounded-lg bg-card p-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Arrival</p>
              <p className="font-semibold leading-tight text-foreground">
                {flight.to} - {formatDateTime(flight.arrival)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-card p-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Base fare</p>
              <p className="font-semibold leading-tight text-foreground">
                ${Number(flight.basePrice || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Total: ${Number(flight.price || 0).toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-card p-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Baggage</p>
              <p className="font-semibold leading-tight text-foreground">{formatBaggage(flight.baggage)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card/80 p-3 text-sm shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Fare notes</p>
            <p className="mt-1 leading-tight text-foreground">{flight.fareNotes}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back to list
        </button>
        <button
          type="button"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90"
          onClick={onSelect}
        >
          Select flight
        </button>
      </div>
    </div>
  );
};

export default FlightDetail;
