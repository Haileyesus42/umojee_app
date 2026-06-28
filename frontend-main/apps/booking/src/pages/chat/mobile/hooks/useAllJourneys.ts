import { useCallback, useEffect, useRef, useState } from "react";
import { getLocalStorageValue } from "../../../../lib/utils";
import { fetchAiWithFallback } from "../utils/aiBackend";

const backendUrl =
  (process.env.REACT_APP_BACKEND_URL as string) || "http://localhost:4001";

// ─── Amadeus booking shape (subset we need) ──────────────────────────────────

export interface AmadeusBooking {
  _id: string;
  amadeusOrderId?: string;
  bookingReference?: string;
  referenceNumber?: string;
  journeyId?: string;
  userId: string;
  conversationId?: string;
  orderCreationDate?: string;
  itineraries?: Array<{
    duration?: string;
    segments?: Array<{
      departure?: { iataCode?: string; at?: string; terminal?: string };
      arrival?: { iataCode?: string; at?: string; terminal?: string };
      carrierCode?: string;
      flightNumber?: string;
      aircraftCode?: string;
      duration?: string;
      numberOfStops?: number;
      cabin?: string;
    }>;
  }>;
  travelers?: Array<{
    travelerId?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    documents?: Array<{
      documentType?: string;
      number?: string;
      expiryDate?: string;
      issuanceCountry?: string;
      nationality?: string;
    }>;
  }>;
  price?: {
    currency?: string;
    total?: string;
    grandTotal?: string;
  };
  rawOrder?: Record<string, any>;
  selectedSeats?: any[];
  createdAt?: string;
}

// ─── Journey item shape ──────────────────────────────────────────────────────

export interface JourneyItem {
  journey_id: string;
  user_id: string;
  conversation_id?: string;
  status: "planning" | "in_progress" | "completed" | "cancelled";
  current_segment: string;
  segments: Array<{
    segment_type: string;
    status: string;
    context?: Record<string, any>;
    activated_at?: string;
    completed_at?: string;
  }>;
  context: {
    location?: { city?: string; country?: string };
    airport_code?: string;
    flight_status?: {
      flight_number?: string;
      status?: string;
      departure_time?: string;
      arrival_time?: string;
      departure_airport?: string;
      arrival_airport?: string;
      airline?: string;
      booking_reference?: string;
      amadeus_order_id?: string;
      currency?: string;
      price?: number;
    };
    [key: string]: any;
  };
  timeline: {
    events?: any[];
    flight_departure?: string;
    flight_arrival?: string;
    departure_from_home?: string;
    arrival_home?: string;
    [key: string]: any;
  };
  recommendations?: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    action_url?: string;
    context_data?: Record<string, any>;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  saved_flights?: any[];
  saved_hotels?: any[];
  saved_cars?: any[];
  booked_flights?: any[];
  booked_hotels?: any[];
  booked_cars?: any[];
  // Enriched from Amadeus booking (merged on frontend)
  booking?: AmadeusBooking;
}

interface UseAllJourneysResult {
  journeys: JourneyItem[];
  bookings: AmadeusBooking[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}


// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAllJourneys(userId: string | null): UseAllJourneysResult {
  const [journeys, setJourneys] = useState<JourneyItem[]>([]);
  const [bookings, setBookings] = useState<AmadeusBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchJourneys = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getLocalStorageValue("token") as string | null;
      let resolvedUserId = userId;

      if (token) {
        const meRes = await fetch(`${backendUrl}/api/client/user/getMe`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const meData = await meRes.json();

        if (!meRes.ok || meData?.status !== "success" || !meData?.data?._id) {
          throw new Error(meData?.message || "Failed to resolve current user from token");
        }

        resolvedUserId = String(meData.data._id);
      }

      if (!resolvedUserId) {
        setJourneys([]);
        return;
      }

      const journeyRes = await fetchAiWithFallback(
        `/api/ai/journey/user/${encodeURIComponent(resolvedUserId)}`
      );
      const data = await journeyRes.json();

      console.log("[useAllJourneys] Raw journey response:", JSON.stringify(data, null, 2));

      if (data?.ok && Array.isArray(data.journeys)) {
        console.log("[useAllJourneys] Fetched", data.journeys.length, "journeys");
        setJourneys(data.journeys);
      } else {
        console.warn("[useAllJourneys] Unexpected response shape:", data);
        setJourneys([]);
      }
    } catch (err: any) {
      console.error("[useAllJourneys] Error:", err);
      setError(err.message || "Failed to fetch journeys");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const token = getLocalStorageValue("token") as string | null;
    if ((!userId && !token) || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchJourneys();
  }, [userId, fetchJourneys]);

  const refetch = useCallback(() => {
    fetchedRef.current = false;
    fetchJourneys();
  }, [fetchJourneys]);

  return { journeys, bookings, isLoading, error, refetch };
}
