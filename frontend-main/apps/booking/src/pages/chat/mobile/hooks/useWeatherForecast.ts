import { useEffect, useRef, useState } from "react";
import { fetchAiWithFallback } from "../utils/aiBackend";

export interface HourlyForecast {
  time: string;
  condition: string;
  icon: string;
  temp: number;
}

export interface DayForecast {
  date: string;
  condition: string;
  icon: string;
  high: number | null;
  low: number | null;
}

export interface WeatherData {
  current: {
    condition: string;
    description: string;
    icon: string;
    temp: number;
    feels_like: number;
    humidity: number | null;
  };
  hourly: HourlyForecast[];
  daily: DayForecast[];
}

export function useWeatherForecast(userLocation: { lat: number; lng: number } | null) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!userLocation || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);

    fetchAiWithFallback(`/api/ai/weather-forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: userLocation.lat, longitude: userLocation.lng, days: 3 }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch weather");
        return res.json();
      })
      .then((data) => setWeather(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userLocation]);

  return { weather, loading };
}
