import { useState, useCallback } from "react";
import type { JourneyDetails } from "../modals/NewJourneyModal";
import type { TimelineData } from "../types/phase7";
import { getLocalStorageValue } from "../../../../lib/utils";
import { fetchAiWithFallback } from "../utils/aiBackend";

interface UseNewJourneyOptions {
  userId: string | null;
  onTimelineCreated: (timeline: TimelineData) => void;
  onJourneyIdChange?: (journeyId: string | null) => void;
  refetchJourneys: () => void;
  onInspirationReceived?: (inspiration: any, journeyId?: string) => void;
}

export function useNewJourney({
  userId,
  onTimelineCreated,
  onJourneyIdChange,
  refetchJourneys,
  onInspirationReceived,
}: UseNewJourneyOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  /** Collect full user data from localStorage (profile + location). */
  const getUserData = useCallback(() => {
    try {
      const user = getLocalStorageValue("user");
      const locationRaw = localStorage.getItem("user_location");
      const location = locationRaw ? JSON.parse(locationRaw) : undefined;
      if (user) return { ...user, location };
      return location ? { location } : undefined;
    } catch {
      return undefined;
    }
  }, []);

  const createJourney = useCallback(
    async (details: JourneyDetails) => {
      if (!userId) return;

      setIsCreating(true);
      try {
        const payload: Record<string, any> = {
          user_id: userId,
          intent: "new journey",
          // Pass the full user data from localStorage
          user_data: getUserData(),
        };
        if (details.destination) payload.destination = details.destination;
        if (details.budget) {
          payload.budget_min = details.budget.min;
          payload.budget_max = details.budget.max;
          payload.currency = details.budget.currency;
        }
        if (details.departureCity)
          payload.departure_city = details.departureCity;
        if (details.departureAirportCode)
          payload.departure_airport_code = details.departureAirportCode;
        if (details.destinationAirportCode)
          payload.destination_airport_code = details.destinationAirportCode;
        if (details.travelersCount)
          payload.travelers_count = details.travelersCount;
        if (details.departureDate)
          payload.departure_date = details.departureDate;
        if (details.durationDays)
          payload.duration_days = details.durationDays;

        const res = await fetchAiWithFallback(`/api/ai/journey/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data?.ok && data.journey_id) {
          const segment = data.current_segment || "inspiration";
          const timeline: TimelineData = {
            journeyId: data.journey_id,
            currentSegment: segment,
            overallStatus: "on_track",
            reliability: 80,
            confidence: 50,
            segments: [
              {
                id: "inspiration",
                type: "activity",
                title: "Inspiration",
                subtitle: details.destination
                  ? `Destination: ${details.destination}`
                  : undefined,
                status: "in_progress",
                confidence: 50,
                icon: "✨",
              },
            ],
            origin: details.departureAirportCode || undefined,
            destination: details.destinationAirportCode || undefined,
            destinations: details.destination
              ? [details.destination]
              : undefined,
            routeStops:
              details.departureAirportCode && details.destinationAirportCode
                ? [details.departureAirportCode, details.destinationAirportCode]
                : undefined,
            // New fields from the creation drawer
            departureCity: details.departureCity || undefined,
            departureDate: details.departureDate || undefined,
            travelersCount: details.travelersCount || undefined,
            durationDays: details.durationDays || undefined,
            budgetMin: details.budget?.min,
            budgetMax: details.budget?.max,
            budgetCurrency: details.budget?.currency,
          };

          onTimelineCreated(timeline);
          onJourneyIdChange?.(data.journey_id);
          refetchJourneys();

          // Forward the inspiration / flight recommendation data.
          // Always call so the consumer can refetch destinations if needed.
          onInspirationReceived?.(data.inspiration || null, data.journey_id);
        }
      } catch (err) {
        console.warn("Failed to create journey:", err);
      } finally {
        setIsCreating(false);
      }
    },
    [userId, getUserData, onTimelineCreated, onJourneyIdChange, refetchJourneys, onInspirationReceived]
  );

  const handleSubmit = useCallback(
    async (details: JourneyDetails) => {
      close();
      await createJourney(details);
    },
    [close, createJourney]
  );

  return { isOpen, isCreating, open, close, handleSubmit };
}
