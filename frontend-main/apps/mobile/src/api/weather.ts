import { fetchNodeWithFallback } from './client';

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
  city?: string | null;
  current: {
    condition: string;
    description: string;
    icon: string;
    temp: number;
    feels_like: number;
    humidity: number | null;
    sunrise?: number | null;
    sunset?: number | null;
    timezone?: number | null;
  };
  hourly: HourlyForecast[];
  daily: DayForecast[];
}

export type WeatherForecastInput = {
  latitude: number;
  longitude: number;
  days?: number;
};

export async function fetchWeatherForecast({
  latitude,
  longitude,
  days = 3,
}: WeatherForecastInput): Promise<WeatherData> {
  const response = await fetchNodeWithFallback('/api/weather/forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude, days }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch weather: ${response.status}`);
  }

  return response.json() as Promise<WeatherData>;
}
