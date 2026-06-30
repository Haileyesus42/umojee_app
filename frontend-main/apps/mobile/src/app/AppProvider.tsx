import Constants from 'expo-constants';
import * as NavigationBar from 'expo-navigation-bar';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createNodeProxyWebSocketService, type WebSocketStatus } from '../api/websocket';
import {
  fetchJourneyNotifications,
  fetchUserJourneys,
  markJourneyNotificationsSeen,
  startJourneyMonitoring,
  stopJourneyMonitoring,
  type JourneyItem,
  type MobileJourneyPayloadV1,
  type NotificationItem,
} from '../api/notifications';
import { registerPushToken } from '../api/pushNotifications';
import { AppWhiteBackground } from '../components/layout/AppWhiteBackground';
import { initialSafeAreaMetrics } from '../constants/safeArea';
import { useAuthSession } from '../hooks/auth/useAuthSession';
import { useBiometricState } from '../hooks/useBiometricState';
import { useCurrentWeather } from '../hooks/useCurrentWeather';
import type { WeatherMode } from '../types/weather';
import { scheduleLocalNotification } from '../utils/notifications';
import type { RootRouteName } from './RootNavigator';
import { RootNavigator } from './RootNavigator';
import { useVolumeSOSTrigger } from '../hooks/useVolumeSOSTrigger';
import { triggerEmergencyWebhook } from '../api/emergency';
import VolumeSOSServiceModule from '../modules/VolumeSOSService/VolumeSOSServiceModule';



const LIVE_LOCATION_INTERVAL_MS = 60000;
const LIVE_MODE_STORAGE_KEY_PREFIX = 'umojee.liveJourneyMonitor';
const DEFAULT_ADD_AIRPORT_COORDINATES = {
  latitude: 8.9779,
  longitude: 38.7993,
};
const DEMO_APPROACHING_DISTANCE_KM = Number(
  process.env.EXPO_PUBLIC_JOURNEY_DEMO_APPROACHING_KM ?? '4',
);
const DEMO_NEARBY_DISTANCE_KM = Number(process.env.EXPO_PUBLIC_JOURNEY_DEMO_NEARBY_KM ?? '1.8');
const DEMO_ARRIVED_DISTANCE_KM = Number(process.env.EXPO_PUBLIC_JOURNEY_DEMO_ARRIVED_KM ?? '0');

type JourneyLocationMode = 'current_location' | 'approaching' | 'nearby' | 'arrived';

type JourneyLiveContextUpdate = {
  data?: Record<string, unknown>;
  event?: string;
  journey_id?: string;
  monitoring_type?: string;
  timestamp?: string;
  type?: string;
};

type JourneyLiveWebSocketMessage = JourneyLiveContextUpdate & {
  message?: string;
  recommendations?: unknown[];
  title?: string;
};

type JourneyLiveOutboundMessage = {
  data: {
    accuracy_meters?: number | null;
    address?: Record<string, string | null> | null;
    city?: string | null;
    country?: string | null;
    detected_at: string;
    display_name?: string | null;
    latitude: number;
    longitude: number;
    source: string;
  };
  type: 'location_update';
};

type JourneyLocationOverride = {
  city?: string | null;
  displayName?: string | null;
  latitude: number;
  longitude: number;
  mode: Exclude<JourneyLocationMode, 'current_location'>;
};

function getLiveModeStorageKey(journeyId: string) {
  return `${LIVE_MODE_STORAGE_KEY_PREFIX}.${journeyId}`;
}

function getActiveJourney(journeys: JourneyItem[]) {
  return (
    journeys.find((journey) => journey.mobile_payload_v1?.is_active) ||
    journeys.find((journey) => journey.is_active) ||
    journeys.find((journey) => journey.status === 'in_progress') ||
    journeys[0]
  );
}

function getString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function getNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function offsetLatitudeByKm(latitude: number, distanceKm: number) {
  return latitude - distanceKm / 111;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getJourneyDepartureAirport(journey: JourneyItem) {
  const context = getRecord(journey.context);
  const flightStatus = getRecord(context?.flight_status);
  const latitude =
    getNumber(context?.departure_airport_lat) ??
    getNumber(context?.departure_airport_latitude) ??
    DEFAULT_ADD_AIRPORT_COORDINATES.latitude;
  const longitude =
    getNumber(context?.departure_airport_lon) ??
    getNumber(context?.departure_airport_lng) ??
    getNumber(context?.departure_airport_longitude) ??
    DEFAULT_ADD_AIRPORT_COORDINATES.longitude;
  const code =
    getString(journey.home_payload?.trip?.departure_code) ||
    getString(journey.home_payload?.flight?.departure_airport_code) ||
    getString(context?.departure_airport_code) ||
    getString(context?.airport_code) ||
    getString(flightStatus?.departure_airport) ||
    'ADD';
  const city =
    getString(context?.departure_city) ||
    getString(getRecord(context?.location)?.city) ||
    'Addis Ababa';
  return { city, code, latitude, longitude };
}

function getDemoLocationForJourney(journey: JourneyItem, mode: JourneyLocationMode) {
  if (mode === 'current_location') {
    return null;
  }
  const airport = getJourneyDepartureAirport(journey);
  const distanceKm =
    mode === 'approaching'
      ? DEMO_APPROACHING_DISTANCE_KM
      : mode === 'nearby'
        ? DEMO_NEARBY_DISTANCE_KM
        : DEMO_ARRIVED_DISTANCE_KM;
  return {
    city: airport.city,
    displayName:
      mode === 'arrived'
        ? `Demo: arrived at ${airport.code} airport`
        : `Demo: ${mode} ${airport.code} airport`,
    latitude: offsetLatitudeByKm(airport.latitude, distanceKm),
    longitude: airport.longitude,
    mode,
  };
}

function formatJourneyEventLabel(value?: string) {
  return getString(value)
    .replace(/^journey\./, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getJourneyDisplayName(journey?: JourneyItem) {
  return (
    getString(journey?.mobile_payload_v1?.summary.title) ||
    getString(journey?.home_payload?.trip?.title) ||
    getString(journey?.mobile_payload_v1?.summary.destination) ||
    getString(journey?.home_payload?.trip?.destination) ||
    getString(journey?.context?.planned_destination) ||
    'your journey'
  );
}

function getCoordinateKey(record: unknown) {
  const value = getRecord(record);
  const latitude = getNumber(value?.latitude);
  const longitude = getNumber(value?.longitude);
  return latitude !== undefined && longitude !== undefined
    ? `${latitude.toFixed(5)},${longitude.toFixed(5)}`
    : '';
}

function shouldPreserveLiveRouteOrigin(nextJourney: JourneyItem, previousJourney?: JourneyItem) {
  const nextRouteMap = nextJourney.mobile_payload_v1?.live_mode.route_map;
  const previousRouteMap = previousJourney?.mobile_payload_v1?.live_mode.route_map;
  const previousOrigin = previousRouteMap?.origin;
  if (!previousOrigin) {
    return false;
  }
  const nextOriginKey = getCoordinateKey(nextRouteMap?.origin);
  const nextDestinationKey = getCoordinateKey(nextRouteMap?.destination);
  const contextLocationKey = getCoordinateKey(nextJourney.context?.location);
  return !nextOriginKey || nextOriginKey === nextDestinationKey || nextOriginKey === contextLocationKey;
}

function mergeJourneyLiveRouteState(
  currentJourneys: JourneyItem[],
  nextJourneys: JourneyItem[],
) {
  const currentJourneyById = new Map(
    currentJourneys.map((journey) => [journey.journey_id, journey]),
  );
  return nextJourneys.map((journey) => {
    const previousJourney = currentJourneyById.get(journey.journey_id);
    const previousRouteMap = previousJourney?.mobile_payload_v1?.live_mode.route_map;
    const nextRouteMap = journey.mobile_payload_v1?.live_mode.route_map;
    if (!journey.mobile_payload_v1 || !nextRouteMap || !previousRouteMap) {
      return journey;
    }
    const routeMap = {
      ...nextRouteMap,
      ...(shouldPreserveLiveRouteOrigin(journey, previousJourney)
        ? { origin: previousRouteMap.origin }
        : {}),
      ...(!nextRouteMap.current_position && previousRouteMap.current_position
        ? { current_position: previousRouteMap.current_position }
        : {}),
    };
    return {
      ...journey,
      mobile_payload_v1: {
        ...journey.mobile_payload_v1,
        live_mode: {
          ...journey.mobile_payload_v1.live_mode,
          route_map: routeMap,
        },
      },
    };
  });
}

function getMessageData(message: JourneyLiveWebSocketMessage) {
  return typeof message.data === 'object' && message.data !== null ? message.data : {};
}

function buildJourneyLiveNotification(
  journey: JourneyItem | undefined,
  message: JourneyLiveWebSocketMessage,
) {
  const messageType = message.type || message.event || 'journey.update';
  const data = getMessageData(message);
  const journeyName = getJourneyDisplayName(journey);
  const monitoringType = getString(message.monitoring_type || data.monitoring_type);
  const explicitTitle = getString(message.title || data.title);
  const explicitMessage = getString(message.message || data.message);
  const sourceLabel = formatJourneyEventLabel(monitoringType || messageType);
  if (messageType === 'journey_bridge_client_connected' || messageType === 'journey_bridge_connected') {
    return null;
  }
  return {
    body:
      explicitMessage ||
      getString(data.summary) ||
      getString(data.description) ||
      `${sourceLabel || 'Live context'} changed for ${journeyName}.`,
    key: [
      getString(message.journey_id || data.journeyId || data.journey_id || journey?.journey_id),
      messageType,
      monitoringType,
      getString(message.timestamp || data.timestamp || data.createdAt),
      explicitMessage || getString(data.message) || getString(data.summary),
    ].join(':'),
    title: explicitTitle || `${sourceLabel || 'Journey update'}: ${journeyName}`,
  };
}

function canUseExpoNotifications(): boolean {
  if (process.env.JEST_WORKER_ID) {
    return false;
  }
  return !(
    Platform.OS === 'web' ||
    (Platform.OS === 'android' && Constants.appOwnership === 'expo')
  );
}

function getExpoProjectId(): string | undefined {
  const constants = Constants as typeof Constants & {
    easConfig?: { projectId?: string };
  };
  return Constants.expoConfig?.extra?.eas?.projectId || constants.easConfig?.projectId;
}

export function AppProvider() {
  const authSession = useAuthSession();
  const biometricState = useBiometricState();

  const [whisperActive, setWhisperActive] = useState(false);

  useVolumeSOSTrigger(async () => {
    const token = authSession.token;
    if (!token) {
      console.warn('[VolumeSOSTrigger] No auth token available');
      return;
    }
    try {
      console.log('[VolumeSOSTrigger] 🚨 SOS triggered via volume button!');
      await triggerEmergencyWebhook(token, 'sos');
      console.log('[VolumeSOSTrigger] ✅ SOS webhook sent successfully');
      setWhisperActive(true);
    } catch (error) {
      console.error('[VolumeSOSTrigger] ❌ SOS webhook failed:', error);
    }
  });

  useEffect(() => {
    if (!authSession.token || Platform.OS !== 'android') return;
    try {
      VolumeSOSServiceModule.saveToken(authSession.token);
    } catch (e) {}
  }, [authSession.token]);


  const journeyWebSocketRef =
    useRef<
      ReturnType<
        typeof createNodeProxyWebSocketService<
          JourneyLiveWebSocketMessage,
          JourneyLiveOutboundMessage
        >
      > | null
    >(null);
  const liveLocationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const journeyLocationOverrideRef = useRef<JourneyLocationOverride | null>(null);
  const journeyLiveNotificationKeysRef = useRef<Set<string>>(new Set());
  const originalJourneyLocationContextRef = useRef<
    Record<
      string,
      {
        contextLocation?: JourneyItem['context'];
        routeMap?: MobileJourneyPayloadV1['live_mode']['route_map'] | null;
      }
    >
  >({});
  const {
    weather,
    weatherMode: liveWeatherMode,
    loading: weatherLoading,
    error: weatherError,
    refreshWeather,
    setCachedWeatherMode,
  } = useCurrentWeather();
  const [, setActiveScreen] = useState<RootRouteName>('welcome');
  const [fallbackWeatherMode, setFallbackWeatherMode] = useState<WeatherMode>('sunny');
  const [journeys, setJourneys] = useState<JourneyItem[]>([]);
  const [journeyNotifications, setJourneyNotifications] = useState<NotificationItem[]>([]);
  const [liveJourneyMonitorEnabled, setLiveJourneyMonitorEnabled] = useState(false);
  const [liveJourneyWebSocketStatus, setLiveJourneyWebSocketStatus] =
    useState<WebSocketStatus>('idle');
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const isWeatherFallback = !weatherLoading && Boolean(weatherError);
  const weatherMode = isWeatherFallback ? fallbackWeatherMode : liveWeatherMode;
  const notificationUnreadCount = journeyNotifications.filter(
    (notification) => !notification.seen,
  ).length;
  const activeJourney = getActiveJourney(journeys);
  const activeJourneyId = activeJourney?.journey_id;

  // ... existing biometric sync useEffect ...
  useEffect(() => {
    if (!authSession.user) return;
    
    const userId = (authSession.user as any)?._id || (authSession.user as any)?.id;
    if (!userId) return;
    
    console.log('[AppProvider] 🔄 Refreshing enrollment from Python backend...');
    biometricState.refreshEnrollmentFromBackend(userId);
  }, [authSession.user?._id, authSession.user?.id]); // Only run when user ID changes



  useEffect(() => {
    if (authSession.isAuthenticated && !authSession.loading) {
      console.log('[AppProvider] 🔄 Auto-syncing user data with backend...');
      void authSession.refreshUser?.();
    }
  }, [authSession.isAuthenticated, authSession.loading]);

  
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const hideNavigationBar = () => {
      void NavigationBar.setVisibilityAsync('hidden');
    };
    hideNavigationBar();
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        hideNavigationBar();
      }
    });
    return () => appStateSubscription.remove();
  }, []);

  useEffect(() => {
    if (!canUseExpoNotifications()) {
      return;
    }
    async function setupNotificationHandling() {
      const Notifications = await import('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
    void setupNotificationHandling();
  }, []);

  useEffect(() => {
    if (!authSession.isAuthenticated || !authSession.token || !canUseExpoNotifications()) {
      return;
    }
    let cancelled = false;
    const authToken = authSession.token;
    async function registerDeviceForPush() {
      const Notifications = await import('expo-notifications');
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          importance: Notifications.AndroidImportance.MAX,
          name: 'Default',
        });
      }
      const hasPermission = await Notifications.getPermissionsAsync().then(async (permission) => {
        if (permission.granted) {
          return true;
        }
        const requestedPermission = await Notifications.requestPermissionsAsync();
        return requestedPermission.granted;
      });
      if (!hasPermission || cancelled) {
        return;
      }
      const projectId = getExpoProjectId();
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (cancelled) {
        return;
      }
      await registerPushToken(authToken, {
        platform: Platform.OS,
        token,
      });
    }
    void registerDeviceForPush();
    return () => {
      cancelled = true;
    };
  }, [authSession.isAuthenticated, authSession.token]);

  const refreshJourneyNotifications = useCallback(async () => {
    if (!authSession.token) {
      setJourneys([]);
      setJourneyNotifications([]);
      setNotificationsError(null);
      setNotificationsLoading(false);
      return;
    }
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const nextJourneys = await fetchUserJourneys(authSession.token);
      const notifications = await fetchJourneyNotifications(authSession.token, nextJourneys);
      setJourneys((currentJourneys) => mergeJourneyLiveRouteState(currentJourneys, nextJourneys));
      setJourneyNotifications(notifications);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load journey notifications.';
      setNotificationsError(message);
    } finally {
      setNotificationsLoading(false);
    }
  }, [authSession.token]);

  const stopLiveLocationUpdates = useCallback(() => {
    if (liveLocationIntervalRef.current) {
      clearInterval(liveLocationIntervalRef.current);
      liveLocationIntervalRef.current = null;
    }
  }, []);

  const sendCurrentLocationUpdate = useCallback(async () => {
    const journeyWebSocket = journeyWebSocketRef.current;
    if (!journeyWebSocket?.isOpen) {
      return;
    }
    try {
      const override = journeyLocationOverrideRef.current;
      if (override) {
        if (!Number.isFinite(override.latitude) || !Number.isFinite(override.longitude)) {
          if (__DEV__) {
            console.warn('[JourneyLive] Demo location override has invalid coordinates:', override);
          }
          return;
        }
        const detectedAt = new Date().toISOString();
        journeyWebSocket.send({
          type: 'location_update',
          data: {
            accuracy_meters: null,
            address: {
              city: override.city || null,
              country: null,
            },
            city: override.city || null,
            country: null,
            detected_at: detectedAt,
            display_name: override.displayName || null,
            latitude: override.latitude,
            longitude: override.longitude,
            source: `demo_${override.mode}`,
          },
        });
        if (__DEV__) {
          console.log('[JourneyLive] Sent demo location_update:', {
            city: override.city,
            latitude: override.latitude,
            longitude: override.longitude,
            mode: override.mode,
          });
        }
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        if (__DEV__) {
          console.warn('[JourneyLive] Location permission denied; live location not sent.');
        }
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }).catch(() => []);
      const detectedAt = new Date().toISOString();
      const city = geocode?.city || geocode?.subregion || null;
      const country = geocode?.country || null;
      const displayName = [geocode?.name, city, country].filter(Boolean).join(', ') || null;
      journeyWebSocket.send({
        type: 'location_update',
        data: {
          accuracy_meters: position.coords.accuracy ?? null,
          address: geocode
            ? {
                city,
                country,
                district: geocode.district || null,
                isoCountryCode: geocode.isoCountryCode || null,
                name: geocode.name || null,
                postalCode: geocode.postalCode || null,
                region: geocode.region || null,
                street: geocode.street || null,
                subregion: geocode.subregion || null,
              }
            : null,
          city,
          country,
          detected_at: detectedAt,
          display_name: displayName,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: 'mobile_geolocation',
        },
      });
      if (__DEV__) {
        console.log('[JourneyLive] Sent mobile location_update:', {
          city,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[JourneyLive] Failed to send mobile location_update:', error);
      }
    }
  }, []);

  const handleJourneyLocationModeChange = useCallback(
    (mode: JourneyLocationMode) => {
      setJourneys((currentJourneys) => {
        const currentActiveJourney = getActiveJourney(currentJourneys);
        if (!currentActiveJourney?.journey_id) {
          return currentJourneys;
        }
        const journeyId = currentActiveJourney.journey_id;
        const demoLocation = getDemoLocationForJourney(currentActiveJourney, mode);
        journeyLocationOverrideRef.current = demoLocation
          ? {
              city: demoLocation.city,
              displayName: demoLocation.displayName,
              latitude: demoLocation.latitude,
              longitude: demoLocation.longitude,
              mode: demoLocation.mode,
            }
          : null;
        if (liveJourneyMonitorEnabled && journeyWebSocketRef.current?.isOpen) {
          requestAnimationFrame(() => {
            void sendCurrentLocationUpdate();
          });
        }
        if (!originalJourneyLocationContextRef.current[journeyId]) {
          originalJourneyLocationContextRef.current[journeyId] = {
            contextLocation: currentActiveJourney.context,
            routeMap: currentActiveJourney.mobile_payload_v1?.live_mode.route_map || null,
          };
        }
        const original = originalJourneyLocationContextRef.current[journeyId];
        return currentJourneys.map((journey) => {
          if (journey.journey_id !== journeyId) {
            return journey;
          }
          if (!demoLocation) {
            return {
              ...journey,
              context: original.contextLocation || journey.context,
              metadata: {
                ...journey.metadata,
                home_to_airport_demo_location_mode: mode,
              },
              mobile_payload_v1: journey.mobile_payload_v1
                ? {
                    ...journey.mobile_payload_v1,
                    live_mode: {
                      ...journey.mobile_payload_v1.live_mode,
                      route_map: original.routeMap || journey.mobile_payload_v1.live_mode.route_map,
                    },
                  }
                : journey.mobile_payload_v1,
            };
          }
          const routeMap = journey.mobile_payload_v1?.live_mode.route_map;
          const preservedOrigin =
            getRecord(routeMap?.origin) ||
            getRecord(original.routeMap?.origin) ||
            getRecord(original.contextLocation?.location) ||
            getRecord(journey.context?.location);
          const preservedOriginLatitude = getNumber(preservedOrigin?.latitude);
          const preservedOriginLongitude = getNumber(preservedOrigin?.longitude);
          const stableRouteOrigin =
            preservedOriginLatitude !== undefined && preservedOriginLongitude !== undefined
              ? {
                  code: getString(preservedOrigin?.code) || getString(preservedOrigin?.city) || 'YOU',
                  latitude: preservedOriginLatitude,
                  longitude: preservedOriginLongitude,
                  name:
                    getString(preservedOrigin?.name) ||
                    getString(preservedOrigin?.display_name) ||
                    getString(preservedOrigin?.city) ||
                    'Current location',
                }
              : undefined;
          const context = {
            ...(journey.context || {}),
            location: {
              ...(getRecord(journey.context?.location) || {}),
              city: demoLocation.city,
              display_name: demoLocation.displayName,
              latitude: demoLocation.latitude,
              longitude: demoLocation.longitude,
            },
            monitoring_location: {
              city: demoLocation.city,
              display_name: demoLocation.displayName,
              latitude: demoLocation.latitude,
              longitude: demoLocation.longitude,
              source: 'demo_location',
            },
          };
          return {
            ...journey,
            context,
            metadata: {
              ...journey.metadata,
              home_to_airport_demo_location_mode: mode,
            },
            mobile_payload_v1: journey.mobile_payload_v1
              ? {
                  ...journey.mobile_payload_v1,
                  live_mode: {
                    ...journey.mobile_payload_v1.live_mode,
                    route_map: {
                      ...(routeMap || {}),
                      coordinates: [],
                      current_position: {
                        code: 'YOU',
                        latitude: demoLocation.latitude,
                        longitude: demoLocation.longitude,
                        name: demoLocation.displayName,
                      },
                      ...(stableRouteOrigin ? { origin: stableRouteOrigin } : {}),
                    },
                  },
                }
              : journey.mobile_payload_v1,
          };
        });
      });
    },
    [liveJourneyMonitorEnabled, sendCurrentLocationUpdate],
  );

  const startLiveLocationUpdates = useCallback(async () => {
    stopLiveLocationUpdates();
    await sendCurrentLocationUpdate();
    liveLocationIntervalRef.current = setInterval(() => {
      void sendCurrentLocationUpdate();
    }, LIVE_LOCATION_INTERVAL_MS);
  }, [sendCurrentLocationUpdate, stopLiveLocationUpdates]);

  const handleJourneyWebSocketMessage = useCallback(
    (message: JourneyLiveWebSocketMessage) => {
      const messageType = message.type || message.event;
      if (__DEV__) {
        console.log('[JourneyLive] Journey websocket message:', messageType, message);
      }
      const localNotification = buildJourneyLiveNotification(activeJourney, message);
      if (localNotification && !journeyLiveNotificationKeysRef.current.has(localNotification.key)) {
        journeyLiveNotificationKeysRef.current.add(localNotification.key);
        if (journeyLiveNotificationKeysRef.current.size > 40) {
          const [oldestKey] = journeyLiveNotificationKeysRef.current;
          journeyLiveNotificationKeysRef.current.delete(oldestKey);
        }
        void scheduleLocalNotification({
          body: localNotification.body,
          seconds: 1,
          title: localNotification.title,
        }).catch((error) => {
          if (__DEV__) {
            console.warn('[JourneyLive] Failed to schedule local notification:', error);
          }
        });
      }
      if (
        messageType === 'context_update' ||
        messageType === 'journey.context_update' ||
        messageType === 'segment_transition' ||
        messageType === 'journey.segment_transition' ||
        messageType === 'location_notification' ||
        messageType === 'journey.notification' ||
        messageType === 'live_route_updated' ||
        messageType === 'journey.live_route.updated' ||
        messageType === 'live_log_updated' ||
        messageType === 'journey.live_log.updated'
      ) {
        void refreshJourneyNotifications();
      }
    },
    [activeJourney, refreshJourneyNotifications],
  );

  const toggleLiveJourneyMonitor = useCallback(() => {
    if (!activeJourneyId) {
      setLiveJourneyWebSocketStatus('error');
      return;
    }
    setLiveJourneyMonitorEnabled((currentValue) => {
      const nextValue = !currentValue;
      void AsyncStorage.setItem(getLiveModeStorageKey(activeJourneyId), String(nextValue)).catch(
        () => undefined,
      );
      if (!nextValue) {
        setLiveJourneyWebSocketStatus('closing');
        stopLiveLocationUpdates();
      }
      return nextValue;
    });
  }, [activeJourneyId, stopLiveLocationUpdates]);

  const markNotificationsRead = useCallback(async () => {
    const unreadCount = journeyNotifications.filter((notification) => !notification.seen).length;
    if (!authSession.token || unreadCount === 0) {
      return;
    }
    setJourneyNotifications((current) =>
      current.map((notification) => ({ ...notification, seen: true })),
    );
    try {
      await markJourneyNotificationsSeen(authSession.token);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to mark notifications as read.';
      setNotificationsError(message);
    }
  }, [authSession.token, journeyNotifications]);

  useEffect(() => {
    if (!isWeatherFallback) {
      setFallbackWeatherMode(liveWeatherMode);
    }
  }, [isWeatherFallback, liveWeatherMode]);

  const handleWeatherModeChange = useCallback(
    (nextWeatherMode: WeatherMode) => {
      setFallbackWeatherMode(nextWeatherMode);
      setCachedWeatherMode(nextWeatherMode);
    },
    [setCachedWeatherMode],
  );

  // ✅ FIXED: Only depend on resetBiometricState function, not the whole biometricState object
  useEffect(() => {
    if (authSession.loading) {
      return;
    }
    if (!authSession.isAuthenticated || !authSession.token) {
      setJourneys([]);
      setJourneyNotifications([]);
      setNotificationsError(null);
      setNotificationsLoading(false);
      biometricState.resetBiometricState();
      return;
    }
    void refreshJourneyNotifications();
  }, [
    authSession.isAuthenticated,
    authSession.loading,
    authSession.token,
    refreshJourneyNotifications,
    biometricState.resetBiometricState,
  ]);

  useEffect(() => {
    let cancelled = false;
    async function restoreLiveJourneyMonitorPreference() {
      if (!activeJourneyId) {
        setLiveJourneyMonitorEnabled(false);
        setLiveJourneyWebSocketStatus('idle');
        return;
      }
      try {
        const storedValue = await AsyncStorage.getItem(getLiveModeStorageKey(activeJourneyId));
        if (!cancelled) {
          setLiveJourneyMonitorEnabled(storedValue === 'true');
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[JourneyLive] Failed to restore live mode toggle:', error);
        }
      }
    }
    void restoreLiveJourneyMonitorPreference();
    return () => {
      cancelled = true;
    };
  }, [activeJourneyId]);

  useEffect(() => {
    if (!liveJourneyMonitorEnabled || !activeJourneyId || !authSession.token) {
      stopLiveLocationUpdates();
      return undefined;
    }
    journeyWebSocketRef.current?.disconnect();
    setLiveJourneyWebSocketStatus('connecting');
    const journeyWebSocket = createNodeProxyWebSocketService<
      JourneyLiveWebSocketMessage,
      JourneyLiveOutboundMessage
    >(`/ws/journey/${encodeURIComponent(activeJourneyId)}`, {
      label: 'Journey live mode',
      queryParams: { token: authSession.token },
      reconnect: true,
    });
    journeyWebSocketRef.current = journeyWebSocket;
    const removeMessageListener = journeyWebSocket.onMessage(handleJourneyWebSocketMessage);
    const removeStatusListener = journeyWebSocket.onStatusChange((status) => {
      setLiveJourneyWebSocketStatus(status);
      if (status === 'open') {
        void (async () => {
          await startLiveLocationUpdates();
          await startJourneyMonitoring(activeJourneyId, authSession.token);
          await refreshJourneyNotifications();
        })().catch((error) => {
          if (__DEV__) {
            console.warn('[JourneyLive] Failed to start journey monitoring:', error);
          }
        });
      }
      if (status === 'closed' || status === 'closing' || status === 'error') {
        stopLiveLocationUpdates();
      }
    });
    journeyWebSocket.connect();
    return () => {
      stopLiveLocationUpdates();
      void stopJourneyMonitoring(activeJourneyId, authSession.token).catch(() => undefined);
      journeyWebSocket.disconnect(1000, 'Journey live monitor stopped');
      removeMessageListener();
      removeStatusListener();
      if (journeyWebSocketRef.current === journeyWebSocket) {
        journeyWebSocketRef.current = null;
      }
      setLiveJourneyWebSocketStatus('closed');
    };
  }, [
    activeJourneyId,
    authSession.token,
    handleJourneyWebSocketMessage,
    liveJourneyMonitorEnabled,
    refreshJourneyNotifications,
    startLiveLocationUpdates,
    stopLiveLocationUpdates,
  ]);

  useEffect(() => {
    if (!authSession.isAuthenticated || !authSession.token) {
      return;
    }
    const notificationSocket = createNodeProxyWebSocketService<{
      data?: NotificationItem;
      event?: string;
    }>('/ws/notifications', {
      label: 'Notifications',
      queryParams: { token: authSession.token },
      reconnect: true,
    });
    const removeMessageListener = notificationSocket.onMessage((message) => {
      if (message?.event !== 'client_notification' || !message.data?._id) {
        return;
      }
      setJourneyNotifications((current) => {
        const existingIndex = current.findIndex((item) => item._id === message.data?._id);
        if (existingIndex >= 0) {
          return current.map((item, index) =>
            index === existingIndex ? { ...item, ...message.data } : item,
          );
        }
        return [message.data as NotificationItem, ...current];
      });
    });
    const removeStatusListener = notificationSocket.onStatusChange((status: WebSocketStatus) => {
      if (__DEV__ && status === 'error') {
        console.warn('[Notifications] websocket connection failed');
      }
    });
    notificationSocket.connect();
    return () => {
      removeMessageListener();
      removeStatusListener();
      notificationSocket.disconnect();
    };
  }, [authSession.isAuthenticated, authSession.token]);

  return (
    <SafeAreaProvider initialMetrics={initialSafeAreaMetrics}>
      <AppWhiteBackground>
        <StatusBar style="dark" />
        <RootNavigator
          authSession={authSession}
          biometricState={biometricState}
          journeys={journeys}
          liveJourneyMonitorEnabled={liveJourneyMonitorEnabled}
          liveJourneyWebSocketStatus={liveJourneyWebSocketStatus}
          notificationUnreadCount={notificationUnreadCount}
          notifications={journeyNotifications}
          notificationsError={notificationsError}
          notificationsLoading={notificationsLoading}
          onJourneyLocationModeChange={handleJourneyLocationModeChange}
          onLiveJourneyMonitorToggle={toggleLiveJourneyMonitor}
          onMarkNotificationsRead={markNotificationsRead}
          onRefreshNotifications={refreshJourneyNotifications}
          onActiveScreenChange={setActiveScreen}
          onRefreshWeather={refreshWeather}
          onWeatherModeChange={handleWeatherModeChange}
          weather={weather}
          weatherFallbackEnabled={isWeatherFallback}
          weatherMode={weatherMode}
          whisperActive={whisperActive}
          onWhisperActiveChange={setWhisperActive}
        />
      </AppWhiteBackground>
    </SafeAreaProvider>
  );
}