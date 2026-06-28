import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

import { fetchWeatherForecast, type WeatherData } from '../api/weather';
import type { WeatherMode } from '../types/weather';

type Coordinates = {
  latitude: number;
  longitude: number;
};

const DEFAULT_LOCATION: Coordinates = {
  latitude: 8.541,
  longitude: 39.269,
};

const WEATHER_STORAGE_KEY = 'umojee.weatherState.v1';
const WEATHER_REFRESH_COOLDOWN_MS = 60 * 1000;
const WEATHER_MODES = new Set<WeatherMode>([
  'sunny',
  'cloudy',
  'rainy',
  'stormy',
  'snowy',
  'sunset',
  'sunrise',
]);

type StoredWeatherState = {
  weather: WeatherData | null;
  weatherMode: WeatherMode;
  savedAt: string;
};

type WeatherStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

let weatherStoragePromise: Promise<WeatherStorage | null> | null = null;
let lastWeatherRefreshStartedAt = 0;

function hasNativeWeatherStorage() {
  const nativeModules = NativeModules as Record<string, unknown>;

  if (
    nativeModules.PlatformLocalStorage ||
    nativeModules.RNC_AsyncSQLiteDBStorage ||
    nativeModules.RNCAsyncStorage ||
    nativeModules.AsyncSQLiteDBStorage ||
    nativeModules.AsyncLocalStorage
  ) {
    return true;
  }

  return Boolean(
    TurboModuleRegistry.get('PlatformLocalStorage') ||
    TurboModuleRegistry.get('RNC_AsyncSQLiteDBStorage') ||
    TurboModuleRegistry.get('RNCAsyncStorage') ||
    TurboModuleRegistry.get('AsyncSQLiteDBStorage') ||
    TurboModuleRegistry.get('AsyncLocalStorage'),
  );
}

async function getWeatherStorage() {
  if (!weatherStoragePromise) {
    weatherStoragePromise = (async () => {
      if (Platform.OS === 'web') {
        return typeof globalThis.localStorage === 'undefined'
          ? null
          : {
              getItem: async (key: string) => globalThis.localStorage.getItem(key),
              setItem: async (key: string, value: string) => {
                globalThis.localStorage.setItem(key, value);
              },
            };
      }

      if (!hasNativeWeatherStorage()) {
        return null;
      }

      try {
        const storageModule = await import('@react-native-async-storage/async-storage');

        return storageModule.default;
      } catch {
        return null;
      }
    })();
  }

  return weatherStoragePromise;
}

function getWeatherMode(weather: WeatherData | null, now = new Date()): WeatherMode {
  if (!weather) {
    return 'sunny';
  }

  const sunrise = weather.current.sunrise;
  const sunset = weather.current.sunset;
  const condition = weather.current.condition.toLowerCase();
  const description = weather.current.description.toLowerCase();
  const icon = weather.current.icon.toLowerCase();
  const text = `${condition} ${description}`;

  if (typeof sunrise === 'number') {
    const sunriseTime = sunrise * 1000;
    const sunriseStart = sunriseTime - 30 * 60 * 1000;
    const sunriseEnd = sunriseTime + 60 * 60 * 1000;
    const currentTime = now.getTime();

    if (currentTime >= sunriseStart && currentTime <= sunriseEnd) {
      return 'sunrise';
    }
  }

  if (typeof sunset === 'number') {
    const sunsetTime = sunset * 1000;
    const goldenHourStart = sunsetTime - 60 * 60 * 1000;
    const goldenHourEnd = sunsetTime + 30 * 60 * 1000;
    const currentTime = now.getTime();

    if (currentTime >= goldenHourStart && currentTime <= goldenHourEnd) {
      return 'sunset';
    }
  } else if (icon.endsWith('n')) {
    return 'cloudy';
  }

  if (text.includes('thunder') || text.includes('storm') || text.includes('squall')) {
    return 'stormy';
  }

  if (
    text.includes('rain') ||
    text.includes('drizzle') ||
    text.includes('shower') ||
    text.includes('mist')
  ) {
    return 'rainy';
  }

  if (text.includes('snow') || text.includes('sleet')) {
    return 'snowy';
  }

  if (
    text.includes('cloud') ||
    text.includes('fog') ||
    text.includes('haze') ||
    text.includes('smoke') ||
    text.includes('dust')
  ) {
    return 'cloudy';
  }

  return 'sunny';
}

function parseStoredWeatherState(value: string | null): StoredWeatherState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredWeatherState>;

    if (
      !parsed ||
      typeof parsed.weatherMode !== 'string' ||
      !WEATHER_MODES.has(parsed.weatherMode as WeatherMode)
    ) {
      return null;
    }

    return {
      weather: parsed.weather ?? null,
      weatherMode: parsed.weatherMode as WeatherMode,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function useCurrentWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [storedWeatherMode, setStoredWeatherMode] = useState<WeatherMode>('sunny');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    async function loadStoredWeather() {
      try {
        const weatherStorage = await getWeatherStorage();
        const storedState = parseStoredWeatherState(
          weatherStorage ? await weatherStorage.getItem(WEATHER_STORAGE_KEY) : null,
        );

        if (storedState) {
          setWeather(storedState.weather);
          setStoredWeatherMode(storedState.weatherMode);
        }
      } catch (storageError) {
        const message =
          storageError instanceof Error ? storageError.message : 'Failed to load stored weather';

        if (__DEV__) {
          console.warn(`[Weather] ${message}`);
        }
      }
    }

    void loadStoredWeather();
  }, []);

  const persistWeatherState = useCallback(
    async (nextWeather: WeatherData | null, nextWeatherMode: WeatherMode) => {
      setStoredWeatherMode(nextWeatherMode);

      try {
        const weatherStorage = await getWeatherStorage();

        if (weatherStorage) {
          await weatherStorage.setItem(
            WEATHER_STORAGE_KEY,
            JSON.stringify({
              weather: nextWeather,
              weatherMode: nextWeatherMode,
              savedAt: new Date().toISOString(),
            } satisfies StoredWeatherState),
          );
        }
      } catch (storageError) {
        if (__DEV__) {
          const message =
            storageError instanceof Error ? storageError.message : 'Failed to store weather';

          console.warn(`[Weather] ${message}`);
        }
      }
    },
    [],
  );

  const refreshWeather = useCallback(async () => {
    const now = Date.now();

    if (
      refreshInFlightRef.current ||
      now - lastWeatherRefreshStartedAt < WEATHER_REFRESH_COOLDOWN_MS
    ) {
      return;
    }

    refreshInFlightRef.current = true;
    lastWeatherRefreshStartedAt = now;
    setLoading(true);

    try {
      if (__DEV__) {
        console.log('[Weather] Requesting foreground location permission');
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      const coordinates =
        permission.status === Location.PermissionStatus.GRANTED
          ? (
              await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              })
            ).coords
          : DEFAULT_LOCATION;

      if (__DEV__) {
        console.log(
          `[Weather] Fetching forecast for ${coordinates.latitude}, ${coordinates.longitude}`,
        );
      }

      const forecast = await fetchWeatherForecast({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        days: 3,
      });

      const nextWeatherMode = getWeatherMode(forecast);

      if (__DEV__) {
        console.log(
          `[Weather] Forecast loaded: ${forecast.current.condition}, ${forecast.current.temp}C`,
        );
      }

      setWeather(forecast);
      setError(
        permission.status === Location.PermissionStatus.GRANTED ? null : 'Location access denied',
      );
      void persistWeatherState(forecast, nextWeatherMode);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load weather';

      if (__DEV__) {
        console.warn(`[Weather] ${message}`);
      }

      setError(message);
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
    }
  }, [persistWeatherState]);

  const weatherMode = useMemo(
    () => (weather ? getWeatherMode(weather) : storedWeatherMode),
    [storedWeatherMode, weather],
  );

  const setCachedWeatherMode = useCallback(
    (nextWeatherMode: WeatherMode) => {
      void persistWeatherState(weather, nextWeatherMode);
    },
    [persistWeatherState, weather],
  );

  return { weather, weatherMode, loading, error, refreshWeather, setCachedWeatherMode };
}
