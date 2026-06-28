import React from "react";
import { Flight, resolveImage, formatBaggage } from "../utils";
import airlineImages from "../../utils/airlineImages.json";

type FlightCardProps = {
  flight: Flight;
  onSelect: (flight: Flight) => void;
};

const FlightCard: React.FC<FlightCardProps> = ({ flight, onSelect }) => {
  const coverImage = React.useMemo(() => {
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
    <button
      type="button"
      onClick={() => onSelect(flight)}
      className="group w-full overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-lg shadow-black/10 transition-all hover:-translate-y-[2px] hover:shadow-xl"
    >
      <div className="relative h-[90px] w-full overflow-hidden">
        <img
          src={resolveImage(coverImage)}
          alt={`${flight.airline} flight`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/45 via-black/15 to-transparent" />
        <div className="absolute left-3 bottom-3 rounded-full bg-black/65 px-3 py-1 text-[11px] font-semibold text-white shadow-md shadow-black/30">
          {flight.airline} - {flight.flightNo}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/40">
          ${Number(flight.price || 0).toFixed(2)}
        </div>
      </div>
      <div className="flex gap-3 p-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>{flight.from}</span>
            <span className="text-muted-foreground">-&gt;</span>
            <span>{flight.to}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {flight.stops} - {flight.travelTime}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-foreground">
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Base fare
              </p>
              <p className="font-medium leading-tight">
                ${Number(flight.basePrice || 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Baggage
              </p>
              <p className="font-medium leading-tight">{formatBaggage(flight.baggage)}</p>
            </div>
          </div>
        </div>
        <div className="flex h-full flex-col items-end justify-between text-right text-[11px] text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
            Save ${Math.max(40, Math.round(flight.price * 0.08))}
          </span>
          <span className="text-[10px]">Tap to view</span>
        </div>
      </div>
    </button>
  );
};

export default FlightCard;
