import React from "react";
import { Car } from "./CarCard";
import { CarDriverInfo } from "./CarDriverDetails";

type CarBookingSummaryProps = {
  car: Car;
  driver: CarDriverInfo;
  onBack: () => void;
  onConfirm: () => void;
  onEditCar?: () => void;
  onEditDriver?: () => void;
};

const CarBookingSummary: React.FC<CarBookingSummaryProps> = ({
  car,
  driver,
  onBack,
  onConfirm,
  onEditCar,
  onEditDriver,
}) => {
  const coverImage = car.imageUrls && car.imageUrls.length ? car.imageUrls[0] : "";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onEditCar}
        className="group relative block w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-md shadow-black/10 transition hover:-translate-y-[1px] hover:shadow-lg"
      >
        <div className="relative h-40">
          <img
            src={coverImage}
            alt={`${car.brand} ${car.model}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {onEditCar && (
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/80 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-tight text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Click to edit
            </span>
          )}
          <div className="absolute bottom-3 left-4 space-y-1 text-white drop-shadow">
            <p className="text-sm font-semibold">
              {car.brand} {car.model}
            </p>
            <p className="text-xs text-white/90">
              {car.pickup} • Drop-off: {car.dropoff}
            </p>
          </div>
          <div className="absolute top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/40">
            ${car.pricePerDay.toFixed(0)}/day
          </div>
          <div className="absolute top-3 left-4 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white shadow">
            {car.transmission} • {car.fuel}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Review & confirm</p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
              Flexible policy
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Verify driver details before completing your car booking.
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onEditDriver}
        className="group relative block w-full space-y-2 rounded-2xl border border-border bg-card/80 p-4 text-left shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
      >
        <p className="text-sm font-semibold text-foreground">Driver</p>
        {onEditDriver && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/80 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-tight text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Click to edit
          </span>
        )}
        <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {driver.title} {driver.firstName} {driver.lastName}
            </span>
            <span>{driver.nationality}</span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-foreground">
            <span className="truncate">Email: {driver.email}</span>
            <span className="truncate">
              Phone: {driver.phoneCountryCode} {driver.phoneNumber}
            </span>
            <span className="truncate">DOB: {driver.dateOfBirth}</span>
          </div>
        </div>
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
          onClick={onConfirm}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90"
        >
          Confirm booking
        </button>
      </div>
    </div>
  );
};

export default CarBookingSummary;
