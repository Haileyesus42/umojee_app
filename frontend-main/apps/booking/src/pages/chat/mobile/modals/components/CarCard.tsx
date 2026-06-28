import React, { useMemo } from "react";

export type Car = {
  id: string;
  brand: string;
  model: string;
  imageUrls?: string[];
  pricePerDay: number;
  seats: number;
  bags: number;
  transmission: string;
  fuel: string;
  pickup: string;
  dropoff: string;
  description: string;
};

type CarCardProps = {
  car: Car;
  onSelect: (car: Car) => void;
};

const CarCard: React.FC<CarCardProps> = ({ car, onSelect }) => {
  const coverImage = useMemo(() => {
    if (car.imageUrls && car.imageUrls.length > 0) return car.imageUrls[0];
    return "";
  }, [car]);

  return (
    <button
      type="button"
      onClick={() => onSelect(car)}
      className="group w-full overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-lg shadow-black/10 transition-all hover:-translate-y-[2px] hover:shadow-xl"
    >
      <div className="relative h-[110px] w-full overflow-hidden">
        <img
          src={coverImage}
          alt={`${car.brand} ${car.model}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/45 via-black/15 to-transparent" />
        <div className="absolute left-3 bottom-3 rounded-full bg-black/65 px-3 py-1 text-[11px] font-semibold text-white shadow-md shadow-black/30">
          {car.brand} • {car.model}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/40">
          ${car.pricePerDay.toFixed(0)}/day
        </div>
      </div>
      <div className="flex gap-3 p-4">
        <div className="flex-1 space-y-1">
          <p className="text-xs text-muted-foreground">{car.description}</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2 py-[2px] font-semibold text-primary">
              {car.transmission}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-[2px] font-semibold text-primary">
              {car.fuel}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-[2px] font-semibold text-primary">
              {car.seats} seats
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-[2px] font-semibold text-primary">
              {car.bags} bags
            </span>
          </div>
        </div>
        <div className="flex items-center text-right text-[11px] text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">View</span>
        </div>
      </div>
    </button>
  );
};

export default CarCard;
