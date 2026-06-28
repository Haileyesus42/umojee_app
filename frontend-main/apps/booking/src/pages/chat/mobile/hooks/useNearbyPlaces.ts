import { useEffect, useRef, useState } from "react";
import { fetchAiWithFallback } from "../utils/aiBackend";

export interface NearbyPlace {
  place_id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  user_ratings_total: number | null;
  vicinity: string;
  photo_url: string | null;
  icon: string;
  open_now: boolean | null;
}

export function useNearbyPlaces() {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;

    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        fetchedRef.current = true;

        try {
          const res = await fetchAiWithFallback(`/api/ai/nearby-places`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // ask for one result per type; backend will fetch each category
            // and trim accordingly.
            body: JSON.stringify({ latitude, longitude, radius: 3000, limit: 1 }),
          });
          if (!res.ok) throw new Error("Failed to fetch nearby places");
          const data = await res.json();
          setPlaces(data.places || []);
        } catch (err: any) {
          setError(err.message || "Failed to load nearby places");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location access denied");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { places, loading, error, userLocation };
}
