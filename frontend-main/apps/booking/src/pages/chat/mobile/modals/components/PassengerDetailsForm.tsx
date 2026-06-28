import React, { FormEvent, useMemo, useEffect, useState } from "react";
import { Flight } from "../utils";

export type Passenger = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  passport: string;
  nationality: string;
};

type PassengerDetailsFormProps = {
  flight?: Flight | null;
  onBack: () => void;
  onSubmit: (passengers: Passenger[]) => void;
  initialPassengers?: Passenger[];
};

const blankPassenger: Passenger = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  passport: "",
  nationality: "",
};

const PassengerDetailsForm: React.FC<PassengerDetailsFormProps> = ({
  flight,
  onBack,
  onSubmit,
  initialPassengers,
}) => {
  const [passengers, setPassengers] = useState<Passenger[]>(initialPassengers?.length ? initialPassengers : [blankPassenger]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (initialPassengers && initialPassengers.length > 0) {
      setPassengers(initialPassengers);
      setActiveIndex((prev) => Math.min(prev, initialPassengers.length - 1));
    }
  }, [initialPassengers]);

  const current = passengers[activeIndex] || blankPassenger;

  const title = useMemo(() => {
    if (!flight) return "Passenger details";
    return `${flight.from} → ${flight.to} • ${flight.airline}`;
  }, [flight]);

  const handleChange = (field: keyof Passenger, value: string) => {
    setPassengers((prev) => {
      const next = [...prev];
      next[activeIndex] = { ...next[activeIndex], [field]: value };
      return next;
    });
  };

  const addPassenger = () => {
    setPassengers((prev) => [...prev, blankPassenger]);
    setActiveIndex(passengers.length);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(passengers);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">Add traveler information</p>
        </div>
        <button
          type="button"
          onClick={addPassenger}
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          + Passenger
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {passengers.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              Passenger {index + 1}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            First name
            <input
              required
              value={current.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Last name
            <input
              required
              value={current.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Email
            <input
              type="email"
              required
              value={current.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Phone
            <input
              required
              value={current.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Date of birth
            <input
              type="date"
              required
              value={current.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Nationality
            <input
              required
              value={current.nationality}
              onChange={(e) => handleChange("nationality", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Passport / ID number
            <input
              required
              value={current.passport}
              onChange={(e) => handleChange("passport", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back to flight
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90"
          >
            Submit passengers
          </button>
        </div>
      </form>
    </div>
  );
};

export default PassengerDetailsForm;
