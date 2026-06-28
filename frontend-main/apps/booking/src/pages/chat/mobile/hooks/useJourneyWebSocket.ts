import { useCallback, useEffect, useRef, useState } from "react";
import type {
  WebSocketConnectionStatus,
  MonitoringType,
  ContextUpdateMessage,
  LocationNotificationMessage,
  SegmentTransitionMessage,
} from "../types/phase7";
import { getAiWebSocketBaseUrls } from "../utils/aiBackend";
import { getLocalStorageValue } from "../../../../lib/utils";

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface UseJourneyWebSocketReturn {
  connectionStatus: WebSocketConnectionStatus;
  lastMessage: WebSocketMessage | null;
  contextUpdates: Partial<Record<MonitoringType, ContextUpdateMessage>>;
  recommendations: any[];
  locationNotification: LocationNotificationMessage | null;
  segmentTransition: SegmentTransitionMessage | null;
  sendMessage: (message: string) => void;
  reconnect: () => void;
  disconnect: () => void;
  isConnected: boolean;
}

export type JourneyLocationMode =
  | "current_location"
  | "approaching"
  | "nearby"
  | "arrived";

export interface JourneyLocationOverride {
  mode: JourneyLocationMode;
  latitude?: number;
  longitude?: number;
  city?: string;
  displayName?: string;
}

const NODE_BACKEND_URL =
  (process.env.REACT_APP_BACKEND_URL as string) || "http://localhost:4001";
const WS_BASE_URLS = getAiWebSocketBaseUrls();

// Reconnection config
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const RECONNECT_BACKOFF_MULTIPLIER = 2;
const MAX_RECONNECT_ATTEMPTS = 10;

// Location tracking config
const LOCATION_INTERVAL_MS = 60_000; // Send location every 60 seconds
const LOCATION_PROMPT_EVERY_N_TICKS = 5; // Prompt for permission every 5th tick if not granted

// =============================================================================
// Location helpers (uses Node server proxy to avoid CORS with Nominatim)
// =============================================================================

/**
 * Reverse geocode via the Node Express server proxy at /api/location/reverse.
 * Matches the pattern from ChatPage.tsx.
 */
async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{
  city: string | null;
  display_name: string | null;
  address: Record<string, any> | null;
  bounding_box: any;
} | null> {
  const backend = NODE_BACKEND_URL.replace(/\/$/, "");
  try {
    const res = await fetch(
      `${backend}/api/location/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      city: data?.city ?? null,
      display_name: data?.display_name ?? null,
      address: data?.address ?? null,
      bounding_box: data?.bounding_box ?? null,
    };
  } catch {
    return null;
  }
}

/** Check the current geolocation permission state without triggering a prompt. */
async function checkGeolocationPermission(): Promise<
  "granted" | "denied" | "prompt"
> {
  try {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({
        name: "geolocation",
      });
      return result.state;
    }
  } catch {
    // permissions API not supported
  }
  // Fallback: check if we already have cached location
  const cached = localStorage.getItem("user_location");
  return cached ? "granted" : "prompt";
}

/** Get the current position as a promise. */
function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 15_000,
    });
  });
}

// =============================================================================
// Hook
// =============================================================================

export function useJourneyWebSocket(
  journeyId: string | null | undefined,
  locationOverride?: JourneyLocationOverride | null
): UseJourneyWebSocketReturn {
  const [connectionStatus, setConnectionStatus] =
    useState<WebSocketConnectionStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [contextUpdates, setContextUpdates] = useState<
    Partial<Record<MonitoringType, ContextUpdateMessage>>
  >({});
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [locationNotification, setLocationNotification] =
    useState<LocationNotificationMessage | null>(null);
  const [segmentTransition, setSegmentTransition] =
    useState<SegmentTransitionMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const shouldReconnectRef = useRef(true);
  const journeyIdRef = useRef(journeyId);
  const locationOverrideRef = useRef<JourneyLocationOverride | null>(
    locationOverride ?? null
  );

  // Location tracking refs
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const locationTickRef = useRef(0);

  useEffect(() => {
    journeyIdRef.current = journeyId;
  }, [journeyId]);

  useEffect(() => {
    locationOverrideRef.current = locationOverride ?? null;
  }, [locationOverride]);

  // -------------------------------------------------------------------------
  // Location tracking
  // -------------------------------------------------------------------------

  /**
   * Fetch browser location, reverse geocode via Node server,
   * send through WebSocket, and update localStorage.
   */
  const fetchAndSendLocation = useCallback(async () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      const override = locationOverrideRef.current;
      let lat: number;
      let lon: number;
      let city: string | null = null;
      let reverseData: Awaited<ReturnType<typeof reverseGeocode>> = null;
      let accuracyMeters: number | null = null;
      let source = "browser_geolocation";

      if (override?.mode && override.mode !== "current_location") {
        lat = override.latitude ?? 8.9779;
        lon = override.longitude ?? 38.7993;
        city = override.city ?? "Addis Ababa";
        source = `demo_${override.mode}`;
      } else {
        if (!("geolocation" in navigator)) return;
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        reverseData = await reverseGeocode(lat, lon);
        city = reverseData?.city ?? null;
        accuracyMeters = pos.coords.accuracy;
      }

      if (!reverseData) {
        reverseData = await reverseGeocode(lat, lon);
      }
      city = city ?? reverseData?.city ?? null;
      const ts = Date.now();
      const tsIso = new Date(ts).toISOString();
      const tsLocale = new Date(ts).toLocaleString();

      // Update localStorage (same format as ChatPage.tsx)
      localStorage.setItem(
        "user_location",
        JSON.stringify({
          lat,
          lon,
            city,
            display_name: override?.displayName ?? reverseData?.display_name ?? null,
            address: reverseData?.address ?? null,
            bounding_box: reverseData?.bounding_box ?? null,
            ts,
            ts_iso: tsIso,
            ts_locale: tsLocale,
            source,
          })
      );

      // Send enriched location to FastAPI WebSocket
      ws.send(
        JSON.stringify({
          type: "location_update",
          data: {
            latitude: lat,
            longitude: lon,
            city,
            display_name: override?.displayName ?? reverseData?.display_name ?? null,
            address: reverseData?.address ?? null,
            bounding_box: reverseData?.bounding_box ?? null,
            accuracy_meters: accuracyMeters,
            detected_at: tsIso,
            source,
          },
        })
      );

      // Also try to sync preference hint if logged in
      try {
        const userRaw = localStorage.getItem("user");
        const parsedUser = userRaw ? JSON.parse(userRaw) : null;
        const userId = parsedUser?._id || parsedUser?.id;
        if (userId && city && !source.startsWith("demo_")) {
          const backend = NODE_BACKEND_URL.replace(/\/$/, "");
          await fetch(
            `${backend}/api/ai/user/preferences/update/${userId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ destinations: [city] }),
            }
          );
        }
      } catch {
        /* ignore preference sync errors */
      }
    } catch {
      // Permission denied or position unavailable -- silent
    }
  }, []);

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      fetchAndSendLocation();
    }
  }, [fetchAndSendLocation, locationOverride]);

  /** One tick of the location interval: check permission, send or prompt. */
  const locationTick = useCallback(async () => {
    if (!("geolocation" in navigator)) return;

    locationTickRef.current += 1;
    const permission = await checkGeolocationPermission();

    if (permission === "granted" || permission === "prompt") {
      // "granted": send location immediately
      // "prompt": triggers the browser Allow/Block popup via getCurrentPosition
      await fetchAndSendLocation();
    } else if (permission === "denied") {
      // User previously denied — retry every N-th tick in case they
      // reset the permission via browser settings
      if (locationTickRef.current % LOCATION_PROMPT_EVERY_N_TICKS === 0) {
        await fetchAndSendLocation();
      }
    }
  }, [fetchAndSendLocation]);

  /** Start the periodic location sender. */
  const startLocationTracking = useCallback(() => {
    // Clear any existing interval
    if (locationIntervalRef.current !== null) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    locationTickRef.current = 0;

    // Send immediately on connect
    locationTick();

    // Then every LOCATION_INTERVAL_MS
    locationIntervalRef.current = setInterval(() => {
      locationTick();
    }, LOCATION_INTERVAL_MS);
  }, [locationTick]);

  /** Stop the periodic location sender. */
  const stopLocationTracking = useCallback(() => {
    if (locationIntervalRef.current !== null) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // WebSocket connection management
  // -------------------------------------------------------------------------

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const closeExistingConnection = useCallback(() => {
    stopLocationTracking();
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close(1000, "Client closing");
      }
    }
  }, [stopLocationTracking]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionStatus("error");
      return;
    }

    setConnectionStatus("reconnecting");
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS *
      Math.pow(
        RECONNECT_BACKOFF_MULTIPLIER,
        reconnectAttemptRef.current
      ),
      MAX_RECONNECT_DELAY_MS
    );

    reconnectAttemptRef.current += 1;

    reconnectTimeoutRef.current = setTimeout(() => {
      connectInternal();
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectInternal = useCallback(() => {
    const currentJourneyId = journeyIdRef.current;
    if (!currentJourneyId) return;

    closeExistingConnection();
    clearReconnectTimeout();

    const wsBaseUrl =
      WS_BASE_URLS[
        WS_BASE_URLS.length > 0
          ? reconnectAttemptRef.current % WS_BASE_URLS.length
          : 0
      ] || "ws://localhost:8000";
    const token = getLocalStorageValue("token") as string | null;
    const url = `${wsBaseUrl}/ws/journey/${currentJourneyId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    setConnectionStatus("connecting");

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("connected");
        reconnectAttemptRef.current = 0;
        // Start sending location once connected
        startLocationTracking();
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const parsed: WebSocketMessage = JSON.parse(event.data);
          console.log("[useJourneyWebSocket] Message received:", parsed.type, parsed);
          setLastMessage(parsed);

          if (parsed.type === "context_update") {
            const update = parsed as unknown as ContextUpdateMessage;
            console.log(
              `[useJourneyWebSocket] Context update [${update.monitoring_type}]:`,
              JSON.stringify(update.data, null, 2)
            );
            setContextUpdates((prev) => ({
              ...prev,
              [update.monitoring_type]: update,
            }));
          } else if (parsed.type === "location_notification") {
            setLocationNotification(parsed as LocationNotificationMessage);
          } else if (parsed.type === "segment_transition") {
            setSegmentTransition(parsed as SegmentTransitionMessage);
          } else if (parsed.type === "recommendations") {
            console.log("[useJourneyWebSocket] Recommendations received:", parsed.recommendations);
            if (Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
              setRecommendations((prev) => {
                const newRecs = parsed.recommendations.filter(
                  (nr: any) => !prev.some((pr: any) => pr.title === nr.title && pr.content === nr.content)
                );
                // Prepend new recommendations (to show latest first) and slice to latest 10
                const combined = [...newRecs, ...prev].slice(0, 10);
                return combined;
              });
            }
          }
        } catch {
          console.warn(
            "[useJourneyWebSocket] Non-JSON message received:",
            event.data
          );
        }
      };

      ws.onerror = () => {
        setConnectionStatus("error");
      };

      ws.onclose = () => {
        wsRef.current = null;
        stopLocationTracking();
        if (shouldReconnectRef.current && journeyIdRef.current) {
          scheduleReconnect();
        } else {
          setConnectionStatus("disconnected");
        }
      };
    } catch {
      setConnectionStatus("error");
      if (shouldReconnectRef.current) {
        scheduleReconnect();
      }
    }
  }, [
    closeExistingConnection,
    clearReconnectTimeout,
    scheduleReconnect,
    startLocationTracking,
    stopLocationTracking,
  ]);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    }
  }, []);

  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true;
    reconnectAttemptRef.current = 0;
    connectInternal();
  }, [connectInternal]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimeout();
    closeExistingConnection();
    setConnectionStatus("disconnected");
    setLastMessage(null);
    setContextUpdates({});
    setRecommendations([]);
    setLocationNotification(null);
    setSegmentTransition(null);
  }, [clearReconnectTimeout, closeExistingConnection]);

  // Connect when journeyId changes, disconnect on unmount
  useEffect(() => {
    if (journeyId) {
      shouldReconnectRef.current = true;
      reconnectAttemptRef.current = 0;
      setContextUpdates({});
      setLastMessage(null);
      setLocationNotification(null);
      setSegmentTransition(null);
      connectInternal();
    } else {
      disconnect();
    }

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimeout();
      closeExistingConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId]);

  return {
    connectionStatus,
    lastMessage,
    contextUpdates,
    recommendations,
    locationNotification,
    segmentTransition,
    sendMessage,
    reconnect,
    disconnect,
    isConnected: connectionStatus === "connected",
  };
}
