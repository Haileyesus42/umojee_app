import React, { useEffect, useMemo, useState } from "react";

export type CarDriverInfo = {
  title: "MR" | "MS" | "MRS" | "MISS" | "DR";
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  nationality: string;
  dateOfBirth: string;
};

type CarDriverDetailsProps = {
  onBack: () => void;
  onSubmit: (driver: CarDriverInfo) => void;
  initialDriver?: CarDriverInfo;
};

const titles: CarDriverInfo["title"][] = ["MR", "MS", "MRS", "MISS", "DR"];

const CarDriverDetails: React.FC<CarDriverDetailsProps> = ({ onBack, onSubmit, initialDriver }) => {
  const [driver, setDriver] = useState<CarDriverInfo>(
    initialDriver || {
      title: "MR",
      firstName: "",
      lastName: "",
      email: "",
      phoneCountryCode: "+1",
      phoneNumber: "",
      nationality: "US",
      dateOfBirth: "",
    }
  );

  useEffect(() => {
    if (initialDriver) setDriver(initialDriver);
  }, [initialDriver]);

  const isValid = useMemo(
    () =>
      driver.firstName.trim() &&
      driver.lastName.trim() &&
      /\S+@\S+\.\S+/.test(driver.email) &&
      driver.phoneNumber.trim() &&
      driver.dateOfBirth.trim() &&
      driver.nationality.trim(),
    [driver]
  );

  const handleChange = (field: keyof CarDriverInfo, value: string) => {
    setDriver((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    onSubmit(driver);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Driver details</p>
          <p className="text-xs text-muted-foreground">Primary driver information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Title
            <select
              className="w-24 rounded-lg appearance-none border border-border bg-card px-3 pr-6 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              value={driver.title}
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
              value={driver.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Last name
            <input
              required
              value={driver.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>

          <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Email
            <input
              type="email"
              required
              value={driver.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>

          <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Phone
            <div className="flex gap-2">
              <input
                required
                value={driver.phoneCountryCode}
                onChange={(e) => handleChange("phoneCountryCode", e.target.value)}
                className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <input
                required
                value={driver.phoneNumber}
                onChange={(e) => handleChange("phoneNumber", e.target.value)}
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Date of birth
            <input
              type="date"
              required
              value={driver.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Nationality (ISO)
            <input
              required
              value={driver.nationality}
              onChange={(e) => handleChange("nationality", e.target.value.toUpperCase())}
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
            Back to car
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default CarDriverDetails;
