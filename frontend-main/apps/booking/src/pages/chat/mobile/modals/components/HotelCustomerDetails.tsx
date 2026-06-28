import React, { useMemo, useState } from "react";

export type HotelCustomerInfo = {
  title: "MR" | "MS" | "MRS" | "MISS" | "DR";
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  nationality: string;
  dateOfBirth: string;
  addressLine: string;
  cityName: string;
  postalCode: string;
  countryCode: string;
};

type HotelCustomerDetailsProps = {
  onBack: () => void;
  onSubmit: (info: HotelCustomerInfo[]) => void;
  defaultInfo?: HotelCustomerInfo[];
};

const titles: HotelCustomerInfo["title"][] = ["MR", "MS", "MRS", "MISS", "DR"];

const blankGuest: HotelCustomerInfo = {
  title: "MR",
  firstName: "",
  lastName: "",
  email: "",
  phoneCountryCode: "+1",
  phoneNumber: "",
  nationality: "US",
  dateOfBirth: "",
  addressLine: "",
  cityName: "",
  postalCode: "",
  countryCode: "US",
};

const HotelCustomerDetails: React.FC<HotelCustomerDetailsProps> = ({
  onBack,
  onSubmit,
  defaultInfo,
}) => {
  const [guests, setGuests] = useState<HotelCustomerInfo[]>(defaultInfo?.length ? defaultInfo : [blankGuest]);
  const [activeIndex, setActiveIndex] = useState(0);
  const current = guests[activeIndex] || blankGuest;

  const handleChange = (field: keyof HotelCustomerInfo, value: string) => {
    setGuests((prev) => {
      const next = [...prev];
      next[activeIndex] = { ...next[activeIndex], [field]: value };
      return next;
    });
  };

  const addGuest = () => {
    setGuests((prev) => [...prev, blankGuest]);
    setActiveIndex(guests.length);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(guests);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {guests.map((_, index) => {
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
                Guest {index + 1}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addGuest}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          + Guest
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Title
            <select
              className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground appearance-none focus:border-primary focus:outline-none"
              value={current.title}
              onChange={(e) => handleChange("title", e.target.value)}
            >
              {titles.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </label>

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

          <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Email
            <input
              type="email"
              required
              value={current.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>

          <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Phone
            <div className="flex gap-2">
              <input
                required
                value={current.phoneCountryCode}
                onChange={(e) => handleChange("phoneCountryCode", e.target.value)}
                className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <input
                required
                value={current.phoneNumber}
                onChange={(e) => handleChange("phoneNumber", e.target.value)}
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Address
            <input
              required
              value={current.addressLine}
              onChange={(e) => handleChange("addressLine", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
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
            City
            <input
              required
              value={current.cityName}
              onChange={(e) => handleChange("cityName", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Postal code
            <input
              value={current.postalCode}
              onChange={(e) => handleChange("postalCode", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Nationality (ISO)
            <input
              required
              value={current.nationality}
              onChange={(e) => handleChange("nationality", e.target.value.toUpperCase())}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Country (ISO)
            <input
              required
              value={current.countryCode}
              onChange={(e) => handleChange("countryCode", e.target.value.toUpperCase())}
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
            Back to hotel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90"
          >
            Submit guests
          </button>
        </div>
      </form>
    </div>
  );
};

export default HotelCustomerDetails;
