import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Wallet,
  ChevronRight,
  Sparkles,
  Home,
  Users,
  Calendar,
  Clock,
  Settings,
} from "lucide-react";
import NavigationSteps from "./components/NavigationSteps";
import CityAirportSelect from "./components/CityAirportSelect";
import { getLocalStorageValue } from "../../../../lib/utils";
import { findAirportByCity, formatCityAirport } from "../utils/airportCityUtils";
import type { SettingsSection } from "../JourneySettingsPage";

export interface BudgetInfo {
  min: number;
  max: number;
  currency: string;
}

export interface JourneyDetails {
  destination: string;
  budget: BudgetInfo;
  departureCity: string;
  travelersCount: number;
  departureDate: string;
  durationDays: number;
  departureAirportCode?: string;
  destinationAirportCode?: string;
}

interface NewJourneyModalProps {
  open: boolean;
  initialDestination?: string;
  initialBudget?: BudgetInfo;
  isCreating?: boolean;
  onClose: () => void;
  onSubmit: (details: JourneyDetails) => void;
  onOpenSettings?: (section?: SettingsSection) => void;
}

const NewJourneyModal: React.FC<NewJourneyModalProps> = ({
  open,
  initialDestination = "",
  initialBudget,
  isCreating,
  onClose,
  onSubmit,
  onOpenSettings,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [destination, setDestination] = useState(initialDestination);
  const [destinationAirportCode, setDestinationAirportCode] = useState<string | null>(null);
  const [departureCity, setDepartureCity] = useState("");
  const [departureAirportCode, setDepartureAirportCode] = useState<string | null>(null);
  const [useHomeLocation, setUseHomeLocation] = useState(false);
  const [travelersCount, setTravelersCount] = useState(1);
  const [departureDate, setDepartureDate] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [budget, setBudget] = useState<BudgetInfo>(
    initialBudget || { min: 500, max: 3000, currency: "USD" }
  );

  const stepLabels = ["Trip Details", "Preferences", "Review"];

  // Detect user's home location from settings
  const userHomeCity = (() => {
    try {
      const user = getLocalStorageValue("user") as any;
      return user?.homeLocation?.city || "";
    } catch {
      return "";
    }
  })();

  // Only reset form state when the drawer transitions from closed -> open
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setCurrentStep(0);
      if (initialDestination) {
        setDestination(initialDestination);
        const match = findAirportByCity(initialDestination);
        if (match) {
          setDestination(formatCityAirport(match.code));
          setDestinationAirportCode(match.code);
        } else {
          setDestinationAirportCode(null);
        }
      } else {
        setDestination("");
        setDestinationAirportCode(null);
      }
      if (initialBudget) setBudget(initialBudget);
      setTravelersCount(1);
      setDepartureDate("");
      setDurationDays(7);

      // Pre-fill departure city from home location if available
      if (userHomeCity) {
        const match = findAirportByCity(userHomeCity);
        if (match) {
          setDepartureCity(formatCityAirport(match.code));
          setDepartureAirportCode(match.code);
        } else {
          setDepartureCity(userHomeCity);
          setDepartureAirportCode(null);
        }
        setUseHomeLocation(true);
      } else {
        setDepartureCity("");
        setDepartureAirportCode(null);
        setUseHomeLocation(false);
      }
    }
    prevOpenRef.current = open;
  }, [open, initialDestination, initialBudget, userHomeCity]);

  // Sync departure city when checkbox changes
  useEffect(() => {
    if (useHomeLocation && userHomeCity) {
      const match = findAirportByCity(userHomeCity);
      if (match) {
        setDepartureCity(formatCityAirport(match.code));
        setDepartureAirportCode(match.code);
      } else {
        setDepartureCity(userHomeCity);
        setDepartureAirportCode(null);
      }
    }
  }, [useHomeLocation, userHomeCity]);

  const handleNext = () => {
    if (currentStep < stepLabels.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onSubmit({
        destination,
        budget,
        departureCity,
        travelersCount,
        departureDate,
        durationDays,
        departureAirportCode: departureAirportCode || undefined,
        destinationAirportCode: destinationAirportCode || undefined,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const canProceed =
    currentStep === 0
      ? destination.trim().length > 0
      : currentStep === 1
        ? true
        : true;

  // Format departure date for display
  const formattedDepartureDate = (() => {
    if (!departureDate) return "Not set";
    try {
      return new Date(departureDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return departureDate;
    }
  })();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="new-journey-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="new-journey-drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] rounded-t-2xl bg-background border-t border-border shadow-2xl flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    New Journey
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Plan your next adventure
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="px-5 py-4 border-b border-border/50">
              <NavigationSteps
                currentStep={currentStep}
                labels={stepLabels}
                onStepClick={(step) => {
                  if (step <= currentStep) setCurrentStep(step);
                }}
              />
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Step 0: Trip Details */}
              {currentStep === 0 && (
                <div className="space-y-5">
                  {/* Departure City */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Home className="h-4 w-4 text-primary" />
                      <label className="text-sm font-semibold text-foreground">
                        Departure City
                      </label>
                    </div>
                    <CityAirportSelect
                      value={departureCity}
                      onSelect={(display, code) => {
                        setDepartureCity(display);
                        setDepartureAirportCode(code);
                        if (useHomeLocation) setUseHomeLocation(false);
                      }}
                      onClear={() => {
                        setDepartureCity("");
                        setDepartureAirportCode(null);
                        if (useHomeLocation) setUseHomeLocation(false);
                      }}
                      placeholder="e.g. New York, USA"
                      disabled={useHomeLocation && !!userHomeCity}
                      autoFocus
                    />

                    {/* Use home location checkbox */}
                    <div className="mt-2">
                      {userHomeCity ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useHomeLocation}
                            onChange={(e) =>
                              setUseHomeLocation(e.target.checked)
                            }
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
                          />
                          <span className="text-xs text-muted-foreground">
                            Use my home location ({userHomeCity})
                          </span>
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenSettings?.("location")}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Settings className="h-3 w-3" />
                          Set your home location in Settings
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Destination */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <label className="text-sm font-semibold text-foreground">
                        Destination
                      </label>
                    </div>
                    <CityAirportSelect
                      value={destination}
                      onSelect={(display, code) => {
                        setDestination(display);
                        setDestinationAirportCode(code);
                      }}
                      onClear={() => {
                        setDestination("");
                        setDestinationAirportCode(null);
                      }}
                      placeholder="e.g. Rome, Italy"
                    />
                  </div>
                </div>
              )}

              {/* Step 1: Preferences */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  {/* Departure Date */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <label className="text-sm font-semibold text-foreground">
                        Departure Date
                      </label>
                    </div>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Duration & Travelers */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <label className="text-sm font-semibold text-foreground">
                          Duration (days)
                        </label>
                      </div>
                      <input
                        type="number"
                        value={durationDays}
                        onChange={(e) =>
                          setDurationDays(
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                        min={1}
                        max={365}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-primary" />
                        <label className="text-sm font-semibold text-foreground">
                          Travelers
                        </label>
                      </div>
                      <input
                        type="number"
                        value={travelersCount}
                        onChange={(e) =>
                          setTravelersCount(
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                        min={1}
                        max={20}
                      />
                    </div>
                  </div>

                  {/* Budget Range */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <label className="text-sm font-semibold text-foreground">
                        Budget range ({budget.currency})
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">
                          Min
                        </label>
                        <input
                          type="number"
                          value={budget.min}
                          onChange={(e) =>
                            setBudget((b) => ({
                              ...b,
                              min: Number(e.target.value),
                            }))
                          }
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                          min={0}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">
                          Max
                        </label>
                        <input
                          type="number"
                          value={budget.max}
                          onChange={(e) =>
                            setBudget((b) => ({
                              ...b,
                              max: Number(e.target.value),
                            }))
                          }
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">
                      Currency
                    </label>
                    <select
                      value={budget.currency}
                      onChange={(e) =>
                        setBudget((b) => ({ ...b, currency: e.target.value }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (&euro;)</option>
                      <option value="GBP">GBP (&pound;)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 2: Review */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Review Journey Details
                  </h3>

                  {/* Route */}
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Route
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {departureCity && destination
                        ? `${departureCity} → ${destination}`
                        : destination ||
                        departureCity || (
                          <span className="text-muted-foreground italic">
                            Not specified
                          </span>
                        )}
                    </p>
                  </div>

                  {/* Date & Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Departure
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {formattedDepartureDate}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Duration
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {durationDays} {durationDays === 1 ? "Day" : "Days"}
                      </p>
                    </div>
                  </div>

                  {/* Travelers */}
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Travelers
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {travelersCount}{" "}
                      {travelersCount === 1 ? "Traveler" : "Travelers"}
                    </p>
                  </div>

                  {/* Budget */}
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Budget
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {budget.currency} {budget.min.toLocaleString()} &ndash;{" "}
                      {budget.max.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-border">
              <button
                type="button"
                onClick={currentStep === 0 ? onClose : handleBack}
                className="flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                {currentStep === 0 ? "Cancel" : "Back"}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || isCreating}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : currentStep === stepLabels.length - 1 ? (
                  <>
                    Create Journey
                    <Sparkles className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NewJourneyModal;
