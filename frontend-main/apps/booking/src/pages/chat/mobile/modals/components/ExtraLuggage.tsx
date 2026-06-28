import React, { useMemo, useState } from "react";
import { Passenger } from "./PassengerDetailsForm";

type LuggageOption = {
  label: string;
  weight: string;
  price: number;
};

type ExtraLuggageProps = {
  passengers: Passenger[];
  onBack: () => void;
  onSubmit: (luggagePerPassenger: LuggageOption[]) => void;
  initialLuggage?: LuggageOption[];
};

const options: LuggageOption[] = [
  { label: "No extra bag", weight: "Included", price: 0 },
  { label: "+10kg extra", weight: "10 kg", price: 35 },
  { label: "+20kg extra", weight: "20 kg", price: 60 },
  { label: "Sports equipment", weight: "Up to 15 kg", price: 50 },
];

const ExtraLuggage: React.FC<ExtraLuggageProps> = ({ passengers, onBack, onSubmit, initialLuggage }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<LuggageOption[]>(
    initialLuggage && initialLuggage.length === passengers.length
      ? initialLuggage
      : passengers.map(() => options[0])
  );

  const currentPassenger = useMemo(() => passengers[activeIndex], [activeIndex, passengers]);
  const currentOption = selectedOptions[activeIndex];

  const handleSelect = (opt: LuggageOption) => {
    setSelectedOptions((prev) => {
      const next = [...prev];
      next[activeIndex] = opt;
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Extra luggage</p>
          <p className="text-xs text-muted-foreground">Assign bags per passenger</p>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {activeIndex + 1}/{passengers.length}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {passengers.map((p, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {p.firstName || "Passenger"} {idx + 1}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-muted/10 p-3 shadow-sm">
        <p className="text-xs font-semibold text-foreground">
          {currentPassenger?.firstName || "Passenger"} {currentPassenger?.lastName || activeIndex + 1}
        </p>
        <p className="text-[11px] text-muted-foreground">Choose one option:</p>

        <div className="mt-3 grid gap-2">
          {options.map((opt) => {
            const isActive = currentOption?.label === opt.label;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                <div>
                  <p className="font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.weight}</p>
                </div>
                <span className="text-sm font-semibold">
                  {opt.price === 0 ? "Included" : `$${opt.price}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back to seats
        </button>
        <button
          type="button"
          onClick={() => onSubmit(selectedOptions)}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90"
        >
          Confirm luggage
        </button>
      </div>
    </div>
  );
};

export default ExtraLuggage;
