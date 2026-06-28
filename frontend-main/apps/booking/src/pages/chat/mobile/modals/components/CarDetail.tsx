import React, { useEffect, useMemo, useState } from "react";
import { Car } from "./CarCard";

type CarDetailProps = {
  car: Car;
  onBack: () => void;
  onSelect: () => void;
};

const CarDetail: React.FC<CarDetailProps> = ({ car, onBack, onSelect }) => {
  const images = useMemo(() => {
    if (car.imageUrls && car.imageUrls.length > 0) return car.imageUrls;
    return [""];
  }, [car]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [car.id]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const hasMultipleImages = images.length > 1;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-muted/20 shadow-sm">
        <div className="relative h-48 w-full bg-card/60">
          <img
            src={images[currentIndex]}
            alt={`${car.brand} ${car.model}`}
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
            {car.brand} - {car.model}
          </div>
          <div className="absolute top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/40">
            ${car.pricePerDay.toFixed(0)}/day
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">
                {car.brand} {car.model}
              </p>
              <p className="text-xs text-muted-foreground">
                {car.pickup} • Drop-off: {car.dropoff}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Instant confirm
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{car.description}</p>
          <div className="grid grid-cols-2 gap-2 text-[12px] text-foreground">
            <span className="rounded-full bg-muted/50 px-3 py-1 font-semibold">Seats: {car.seats}</span>
            <span className="rounded-full bg-muted/50 px-3 py-1 font-semibold">Bags: {car.bags}</span>
            <span className="rounded-full bg-muted/50 px-3 py-1 font-semibold">{car.transmission}</span>
            <span className="rounded-full bg-muted/50 px-3 py-1 font-semibold">{car.fuel}</span>
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
          Select car
        </button>
      </div>
    </div>
  );
};

export default CarDetail;
