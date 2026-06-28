import * as Location from 'expo-location';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import NativeMapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Svg, { Circle, G, Path } from 'react-native-svg';

import RightArrowIcon from '../../../assets/icons/right-arrow.svg';
import { LightBulbIcon } from '../../assets/icons';
import { ScreenFrame } from '../../components/layout/ScreenFrame';
import { colors } from '../../constants/colors';
import { styles } from '../../theme/styles';
import { fetchNodeWithFallback } from '../../api/client';

type LiveModeScreenProps = {
  onBack: () => void;
  onOpenAssistant?: () => void;
  notificationUnreadCount?: number;
  onOpenHome: () => void;
  onOpenChat: () => void;
  onOpenJourneys?: () => void;
  onOpenNotifications: () => void;
  onOpenTravelSupport?: () => void;
  onLogout?: () => void;
  profileImageUri?: string | null;
};

type LiveLogIcon = 'home' | 'airport' | 'flight' | 'stays' | 'activities';
type LiveLogRowState = 'passed' | 'active' | 'upcoming';

type LiveLogRow = {
  title: string;
  meta: string;
  state: LiveLogRowState;
};

type LiveLogState = {
  percent: number;
  from: {
    icon: LiveLogIcon;
    label: string;
  };
  to: {
    icon: LiveLogIcon;
    label: string;
  };
  rows: LiveLogRow[];
};

const flightPlaneIcon = require('../../../assets/icons/flight_navigation_icons/Icon-1.png');
const securityCheckInIcon = require('../../../assets/images/security_check-in.png');

type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

const DEFAULT_HOME_LOCATION: RouteCoordinate = {
  latitude: 8.541,
  longitude: 39.269,
};

const ADDIS_ABABA_BOLE_AIRPORT: RouteCoordinate = {
  latitude: 8.9779,
  longitude: 38.7993,
};

const DUBAI_INTERNATIONAL_AIRPORT: RouteCoordinate = {
  latitude: 25.2532,
  longitude: 55.3657,
};

const FLIGHT_ANIMATION_START = 0.04;
const FLIGHT_ANIMATION_END = 0.82;

type RoutePhase = 'drive' | 'flight';

const ROUTE_PHASE_SEQUENCE: RoutePhase[] = ['drive', 'flight'];
const ROUTE_PHASE_STEPS: Record<RoutePhase, number> = {
  drive: 0.012,
  flight: 0.006,
};

const DARK_GOOGLE_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d293d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#d9e4ff' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172b' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2d3a54' }] },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0f172b' }, { weight: 1 }],
  },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#22304a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e3d59' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#172036' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9fb2d8' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#263752' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#081528' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6f8dba' }] },
];

const LIGHT_GOOGLE_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#28b8d0' }] },
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#38c3d8' }, { visibility: 'simplified' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#2ab7cf' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#27abc3' }, { visibility: 'simplified' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#5bd2e4' }, { visibility: 'simplified' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#24aec7' }],
  },
];

function getRoutePoint(start: RouteCoordinate, end: RouteCoordinate, progress: number) {
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * progress,
    longitude: start.longitude + (end.longitude - start.longitude) * progress,
  };
}

function getCurvedFlightRoute(
  start: RouteCoordinate,
  end: RouteCoordinate,
  pointCount = 52,
): RouteCoordinate[] {
  const latitudeDistance = end.latitude - start.latitude;
  const longitudeDistance = end.longitude - start.longitude;
  const controlPoint = {
    latitude: (start.latitude + end.latitude) / 2 + Math.abs(longitudeDistance) * 0.34,
    longitude: (start.longitude + end.longitude) / 2 - Math.abs(latitudeDistance) * 0.16,
  };
  const route: RouteCoordinate[] = [];

  for (let index = 0; index <= pointCount; index += 1) {
    const progress = index / pointCount;
    const inverseProgress = 1 - progress;

    route.push({
      latitude:
        inverseProgress * inverseProgress * start.latitude +
        2 * inverseProgress * progress * controlPoint.latitude +
        progress * progress * end.latitude,
      longitude:
        inverseProgress * inverseProgress * start.longitude +
        2 * inverseProgress * progress * controlPoint.longitude +
        progress * progress * end.longitude,
    });
  }

  return route;
}

function sliceRoute(
  route: RouteCoordinate[],
  startProgress: number,
  endProgress: number,
): RouteCoordinate[] {
  const startIndex = Math.max(0, Math.floor((route.length - 1) * startProgress));
  const endIndex = Math.min(route.length - 1, Math.ceil((route.length - 1) * endProgress));

  return route.slice(startIndex, endIndex + 1);
}

function getRouteCoordinateAtProgress(route: RouteCoordinate[], progress: number): RouteCoordinate {
  if (route.length === 0) {
    return ADDIS_ABABA_BOLE_AIRPORT;
  }

  if (route.length === 1) {
    return route[0];
  }

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const exactIndex = clampedProgress * (route.length - 1);
  const startIndex = Math.floor(exactIndex);
  const endIndex = Math.min(route.length - 1, startIndex + 1);
  const segmentProgress = exactIndex - startIndex;

  return getRoutePoint(route[startIndex], route[endIndex], segmentProgress);
}

function getRouteBearing(from: RouteCoordinate, to: RouteCoordinate) {
  const startLatitude = (from.latitude * Math.PI) / 180;
  const endLatitude = (to.latitude * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
  const x =
    Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(longitudeDelta);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function getRouteRegion(coordinates: RouteCoordinate[]): Region {
  const minLatitude = Math.min(...coordinates.map((coordinate) => coordinate.latitude));
  const maxLatitude = Math.max(...coordinates.map((coordinate) => coordinate.latitude));
  const minLongitude = Math.min(...coordinates.map((coordinate) => coordinate.longitude));
  const maxLongitude = Math.max(...coordinates.map((coordinate) => coordinate.longitude));
  const latitudeDelta = Math.max((maxLatitude - minLatitude) * 1.35, 0.05);
  const longitudeDelta = Math.max((maxLongitude - minLongitude) * 1.35, 0.05);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

function parseDrivingRouteCoordinate(value: unknown): RouteCoordinate | null {
  if (Array.isArray(value) && value.length >= 2) {
    const latitude = Number(value[0]);
    const longitude = Number(value[1]);

    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  }

  if (value && typeof value === 'object') {
    const coordinate = value as {
      lat?: unknown;
      latitude?: unknown;
      lng?: unknown;
      longitude?: unknown;
    };
    const latitude = Number(coordinate.latitude ?? coordinate.lat);
    const longitude = Number(coordinate.longitude ?? coordinate.lng);

    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  }

  return null;
}

async function fetchDrivingRouteCoordinates(
  from: RouteCoordinate,
  to: RouteCoordinate,
): Promise<RouteCoordinate[]> {
  const response = await fetchNodeWithFallback('/api/client/maps/driving-route', {
    body: JSON.stringify({
      from_lat: from.latitude,
      from_lng: from.longitude,
      to_lat: to.latitude,
      to_lng: to.longitude,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    timeoutMs: 12000,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { detail?: string; message?: string };
    const detail = data.detail || data.message || `status ${response.status}`;

    throw new Error(`Driving route request failed: ${detail}`);
  }

  const data = (await response.json()) as { route?: unknown[] };
  const route = Array.isArray(data.route)
    ? data.route.map(parseDrivingRouteCoordinate).filter((coordinate) => coordinate !== null)
    : [];

  if (route.length <= 1) {
    throw new Error('Driving route response did not include enough coordinates');
  }

  return route;
}

function useLiveNavigationLocation() {
  const [homeLocation, setHomeLocation] = useState<RouteCoordinate>(DEFAULT_HOME_LOCATION);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== Location.PermissionStatus.GRANTED) {
          return;
        }

        const currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setHomeLocation({
            latitude: currentPosition.coords.latitude,
            longitude: currentPosition.coords.longitude,
          });
        }
      } catch (locationError) {
        if (__DEV__) {
          const message =
            locationError instanceof Error
              ? locationError.message
              : 'Failed to load live navigation location';

          console.warn(`[LiveNavigation] ${message}`);
        }
      }
    }

    void loadCurrentLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  return homeLocation;
}

const LIVE_LOG_STATES: LiveLogState[] = [
  {
    percent: 0,
    from: { icon: 'home', label: 'Home' },
    to: { icon: 'airport', label: 'Airport' },
    rows: [
      { title: 'Getting ready to leave', meta: 'Check documents and bags', state: 'active' },
      { title: 'Leaving home', meta: 'Estimated drive: 25 mins', state: 'upcoming' },
      { title: 'On the road', meta: 'Traffic: moderate', state: 'upcoming' },
      { title: 'Approaching airport', meta: 'Follow terminal signs', state: 'upcoming' },
      { title: 'Arrived at airport', meta: 'Head to check-in counter', state: 'upcoming' },
    ],
  },
  {
    percent: 10,
    from: { icon: 'airport', label: 'Airport' },
    to: { icon: 'flight', label: 'Flight' },
    rows: [
      {
        title: 'Wait at check-in counter queue',
        meta: 'Estimated wait time: 5 mins',
        state: 'passed',
      },
      { title: 'Check-In at counter B22', meta: 'Low traffic at counter', state: 'active' },
      { title: 'Head through security', meta: 'Wait time: 8-12 mins', state: 'upcoming' },
      { title: 'Go to departure gate', meta: 'Starts at: 9:50', state: 'upcoming' },
      { title: 'Boarding in progress', meta: 'Current boarding group:', state: 'upcoming' },
    ],
  },
  {
    percent: 25,
    from: { icon: 'flight', label: 'Flight' },
    to: { icon: 'airport', label: 'Airport' },
    rows: [
      { title: 'Boarding complete', meta: 'Doors closed', state: 'active' },
      { title: 'Taxiing for departure', meta: 'Awaiting takeoff', state: 'upcoming' },
      { title: 'In the air', meta: 'Altitude reached', state: 'upcoming' },
      { title: 'Descending soon', meta: 'Prepare for landing', state: 'upcoming' },
      { title: 'Landed at airport', meta: 'Taxiing to gate', state: 'upcoming' },
    ],
  },
  {
    percent: 40,
    from: { icon: 'airport', label: 'Airport' },
    to: { icon: 'stays', label: 'Stays' },
    rows: [
      { title: 'Exited airport', meta: 'Heading to pickup zone', state: 'active' },
      { title: 'Waiting for ride', meta: 'Driver arriving in 3 mins', state: 'upcoming' },
      { title: 'On the way', meta: 'Estimated time: 20 mins', state: 'upcoming' },
      { title: 'Approaching stay', meta: '2 mins away', state: 'upcoming' },
      { title: 'Arrived at stay', meta: 'Check-in ready', state: 'upcoming' },
    ],
  },
  {
    percent: 50,
    from: { icon: 'stays', label: 'Stays' },
    to: { icon: 'activities', label: 'Activities' },
    rows: [
      { title: 'Checked in', meta: 'Stay ready', state: 'active' },
      { title: 'Settled in', meta: 'Unpacked and refreshed', state: 'upcoming' },
      { title: 'Planning activities', meta: "Today's options ready", state: 'upcoming' },
      { title: 'Heading out', meta: 'Next activity starts soon', state: 'upcoming' },
      { title: 'Enjoying activity', meta: 'Live experience underway', state: 'upcoming' },
    ],
  },
  {
    percent: 70,
    from: { icon: 'activities', label: 'Activities' },
    to: { icon: 'airport', label: 'Airport' },
    rows: [
      { title: 'Getting ready to leave', meta: 'Check documents and bags', state: 'active' },
      { title: 'Leaving home', meta: 'Estimated drive: 25 mins', state: 'upcoming' },
      { title: 'On the road', meta: 'Traffic: moderate', state: 'upcoming' },
      { title: 'Approaching airport', meta: 'Follow terminal signs', state: 'upcoming' },
      { title: 'Arrived at airport', meta: 'Head to check-in counter', state: 'upcoming' },
    ],
  },
  {
    percent: 80,
    from: { icon: 'airport', label: 'Airport' },
    to: { icon: 'flight', label: 'Flight' },
    rows: [
      {
        title: 'Wait at check-in counter queue',
        meta: 'Estimated wait time: 5 mins',
        state: 'active',
      },
      { title: 'Check-In at counter', meta: 'Check for check-in counter', state: 'upcoming' },
      { title: 'Head through security', meta: 'Wait time: 8-12 mins', state: 'upcoming' },
      { title: 'Go to departure gate', meta: 'Starts at: 9:50', state: 'upcoming' },
      { title: 'Boarding in progress', meta: 'Current boarding group:', state: 'upcoming' },
    ],
  },
  {
    percent: 90,
    from: { icon: 'flight', label: 'Flight' },
    to: { icon: 'airport', label: 'Airport' },
    rows: [
      { title: 'Boarding complete', meta: 'Doors closed', state: 'active' },
      { title: 'Taxiing for departure', meta: 'Awaiting takeoff', state: 'upcoming' },
      { title: 'In the air', meta: 'Altitude reached', state: 'upcoming' },
      { title: 'Descending soon', meta: 'Prepare for landing', state: 'upcoming' },
      { title: 'Landed at airport', meta: 'Taxiing to gate', state: 'upcoming' },
    ],
  },
  {
    percent: 100,
    from: { icon: 'airport', label: 'Airport' },
    to: { icon: 'home', label: 'Home' },
    rows: [
      { title: 'Exited airport', meta: 'Heading to pickup zone', state: 'active' },
      { title: 'Waiting for ride', meta: 'Driver arriving in 3 mins', state: 'upcoming' },
      { title: 'On the way', meta: 'Estimated time: 20 mins', state: 'upcoming' },
      { title: 'Approaching stay', meta: '2 mins away', state: 'upcoming' },
      { title: 'Arrived at stay', meta: 'Check-in ready', state: 'upcoming' },
    ],
  },
];

export function LiveModeScreen({
  onBack,
  onOpenAssistant,
  notificationUnreadCount = 0,
  onOpenHome,
  onOpenChat,
  onOpenJourneys,
  onOpenNotifications,
  onOpenTravelSupport,
  onLogout,
  profileImageUri,
}: LiveModeScreenProps) {
  const [progressPercent, setProgressPercent] = useState(10);
  const [isFlightNavigationExpanded, setIsFlightNavigationExpanded] = useState(false);
  const { height } = useWindowDimensions();
  const headerGap = Math.min(52, Math.max(20, height * 0.035));

  return (
    <ScreenFrame
      footerSource="liveMode"
      notificationUnreadCount={notificationUnreadCount}
      onOpenAssistant={onOpenAssistant}
      onOpenHome={onOpenHome}
      onOpenChat={onOpenChat}
      onOpenNotifications={onOpenNotifications}
      onOpenJourneys={onOpenJourneys}
      onOpenTravelSupport={onOpenTravelSupport}
      onLogout={onLogout}
      profileImageUri={profileImageUri}
    >
      <LinearGradient
        colors={['#FFFFFF', '#FFFFFF']}
        style={[drawerStyles.page, { marginTop: headerGap }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch to normal mode"
          onPress={onBack}
          style={({ pressed }) => [drawerStyles.modeButton, pressed && styles.pressedFeedback]}
        >
          <View style={drawerStyles.modeDot} />
          <Text style={drawerStyles.modeText}>Switch to Normal Mode</Text>
        </Pressable>

        <FlightNavigationView edgeToEdge onExpand={() => setIsFlightNavigationExpanded(true)} />

        <TripCompletionRate value={progressPercent} />

        <LiveLog onProgressChange={setProgressPercent} progressPercent={progressPercent} />

        <LiveTipsSection />

        <LivePageIndicator />
      </LinearGradient>
      <Modal
        animationType="fade"
        onRequestClose={() => setIsFlightNavigationExpanded(false)}
        transparent
        visible={isFlightNavigationExpanded}
      >
        <Pressable
          accessibilityLabel="Close expanded flight navigation"
          accessibilityRole="button"
          onPress={() => setIsFlightNavigationExpanded(false)}
          style={flightStyles.expandedOverlay}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={flightStyles.expandedNavigationOnly}
          >
            <FlightNavigationView edgeToEdge expanded />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenFrame>
  );
}

function BuildingIcon({ color = colors.ink }: { color?: string }) {
  return (
    <Svg height={16} viewBox="0 0 16 16" width={16}>
      <Path
        d="M14 13.3333H15.3333V14.6667H0.666656V13.3333H1.99999V2.00001C1.99999 1.63182 2.29847 1.33334 2.66666 1.33334H13.3333C13.7015 1.33334 14 1.63182 14 2.00001V13.3333ZM12.6667 13.3333V2.66668H3.33332V13.3333H12.6667ZM5.33332 7.33334H7.33332V8.66668H5.33332V7.33334ZM5.33332 4.66668H7.33332V6.00001H5.33332V4.66668ZM5.33332 10H7.33332V11.3333H5.33332V10ZM8.66666 10H10.6667V11.3333H8.66666V10ZM8.66666 7.33334H10.6667V8.66668H8.66666V7.33334ZM8.66666 4.66668H10.6667V6.00001H8.66666V4.66668Z"
        fill={color}
      />
    </Svg>
  );
}

function PlaneIcon({ color = colors.ink }: { color?: string }) {
  return (
    <Svg height={16} viewBox="0 0 16 16" width={16}>
      <Path
        d="M11.8667 12.8L10.6667 7.33333L13 5C14 4 14.3333 2.66667 14 2C13.3333 1.66667 12 2 11 3L8.66667 5.33333L3.2 4.13333C2.86667 4.06667 2.6 4.2 2.46667 4.46667L2.26667 4.8C2.13333 5.13333 2.2 5.46667 2.46667 5.66667L6 8L4.66667 10H2.66667L2 10.6667L4 12L5.33333 14L6 13.3333V11.3333L8 10L10.3333 13.5333C10.5333 13.8 10.8667 13.8667 11.2 13.7333L11.5333 13.6C11.8 13.4 11.9333 13.1333 11.8667 12.8Z"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.33}
      />
    </Svg>
  );
}

function HomeIcon({ color = colors.ink }: { color?: string }) {
  return (
    <Svg height={16} viewBox="0 0 16 16" width={16}>
      <Path
        d="M14 14.0001C14 14.4143 13.6642 14.7501 13.25 14.7501H2.75C2.33579 14.7501 2 14.4143 2 14.0001V7.25007H-0.25L7.49547 0.208713C7.78152 -0.0513419 8.21848 -0.0513419 8.50453 0.208713L16.25 7.25007H14V14.0001ZM12.5 13.2501V5.86818L8 1.77726L3.5 5.86818V13.2501H12.5ZM8 11.7501L5.48093 9.23097C4.82192 8.57202 4.82192 7.5035 5.48093 6.84455C6.13994 6.18551 7.20837 6.18551 7.8674 6.84455L8 6.97707L8.1326 6.84455C8.79163 6.18551 9.86007 6.18551 10.5191 6.84455C11.1781 7.5035 11.1781 8.57202 10.5191 9.23097L8 11.7501Z"
        fill={color}
      />
    </Svg>
  );
}

function StaysIcon({ color = colors.ink }: { color?: string }) {
  return (
    <Svg height={16} viewBox="0 0 16 16" width={16}>
      <Path
        d="M13.25 13.2499V6.34897L8 2.20747L2.75 6.34897V13.2499H13.25ZM14.75 13.9999C14.75 14.4142 14.4142 14.7499 14 14.7499H2C1.58579 14.7499 1.25 14.4142 1.25 13.9999V5.98534C1.25 5.75571 1.3552 5.53873 1.53549 5.3965L7.53553 0.663359C7.80785 0.448477 8.19215 0.448477 8.46447 0.663359L14.4645 5.3965C14.6448 5.53873 14.75 5.75571 14.75 5.98534V13.9999ZM4.25 7.99993H5.75C5.75 9.2426 6.75733 10.2499 8 10.2499C9.24267 10.2499 10.25 9.2426 10.25 7.99993H11.75C11.75 10.071 10.071 11.7499 8 11.7499C5.92894 11.7499 4.25 10.071 4.25 7.99993Z"
        fill={color}
      />
    </Svg>
  );
}

function ActivitiesIcon({ color = colors.ink }: { color?: string }) {
  return (
    <Svg height={16} viewBox="0 0 16 16" width={16}>
      <Path
        d="M14.1819 2.56802C15.879 4.26854 15.9372 6.97775 14.3589 8.74475L7.99992 15.1138L1.64103 8.74475C0.0627862 6.97775 0.121781 4.26426 1.81802 2.56802C3.51618 0.869863 6.23389 0.812653 8.00075 2.3964C9.7625 0.815001 12.485 0.8675 14.1819 2.56802ZM2.87868 3.62868C1.76137 4.74598 1.70528 6.53548 2.73495 7.7174L7.99992 12.9907L13.2651 7.7174C14.2951 6.53503 14.2392 4.74894 13.1202 3.62758C12.0048 2.50984 10.2093 2.45605 9.03072 3.48782L5.87868 6.64018L4.81802 5.57948L6.9365 3.4595L6.87515 3.40776C5.69409 2.45898 3.96741 2.53995 2.87868 3.62868Z"
        fill={color}
      />
    </Svg>
  );
}

function LiveLogIconView({ icon }: { icon: LiveLogIcon }) {
  if (icon === 'home') {
    return <HomeIcon />;
  }

  if (icon === 'flight') {
    return <PlaneIcon />;
  }

  if (icon === 'stays') {
    return <StaysIcon />;
  }

  if (icon === 'activities') {
    return <ActivitiesIcon />;
  }

  return <BuildingIcon />;
}

function CheckCircleIcon() {
  return (
    <Svg height={15} viewBox="0 0 14 15" width={14}>
      <Path
        d="M6.78796 13.75C3.66388 13.75 1.13132 10.9517 1.13132 7.5C1.13132 4.04822 3.66388 1.25 6.78796 1.25C9.91201 1.25 12.4446 4.04822 12.4446 7.5C12.4446 10.9517 9.91201 13.75 6.78796 13.75ZM6.78796 12.5C9.28724 12.5 11.3133 10.2614 11.3133 7.5C11.3133 4.73857 9.28724 2.5 6.78796 2.5C4.2887 2.5 2.26265 4.73857 2.26265 7.5C2.26265 10.2614 4.2887 12.5 6.78796 12.5ZM6.22377 10L3.82387 7.34837L4.62385 6.46444L6.22377 8.23225L9.42368 4.6967L10.2236 5.58058L6.22377 10Z"
        fill={colors.green}
      />
    </Svg>
  );
}

function TimeIcon({ color = 'rgba(0,0,0,0.4)' }: { color?: string }) {
  return (
    <Svg height={15} viewBox="0 0 14 15" width={14}>
      <Path
        d="M6.78799 13.75C3.66391 13.75 1.13135 10.9517 1.13135 7.5C1.13135 4.04822 3.66391 1.25 6.78799 1.25C9.91205 1.25 12.4446 4.04822 12.4446 7.5C12.4446 10.9517 9.91205 13.75 6.78799 13.75ZM6.78799 12.5C9.28727 12.5 11.3133 10.2614 11.3133 7.5C11.3133 4.73857 9.28727 2.5 6.78799 2.5C4.28873 2.5 2.26268 4.73857 2.26268 7.5C2.26268 10.2614 4.28873 12.5 6.78799 12.5ZM7.35366 7.5H9.61632V8.75H6.22233V4.375H7.35366V7.5Z"
        fill={color}
      />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg height={17} viewBox="0 0 17 17" width={17}>
      <Path
        d="M8.50002 4.25002V8.50002L11.3334 9.91669M15.5834 8.50002C15.5834 12.412 12.412 15.5834 8.50002 15.5834C4.588 15.5834 1.41669 12.412 1.41669 8.50002C1.41669 4.588 4.588 1.41669 8.50002 1.41669C12.412 1.41669 15.5834 4.588 15.5834 8.50002Z"
        fill="none"
        stroke={colors.ink}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function ChevronUpIcon() {
  return (
    <Svg height={20} viewBox="0 0 20 20" width={20}>
      <Path
        d="M5 12.5L10 7.5L15 12.5"
        fill="none"
        stroke={colors.ink}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function getLiveLogState(progressPercent: number) {
  return LIVE_LOG_STATES.reduce((currentState, state) => {
    if (progressPercent >= state.percent) {
      return state;
    }

    return currentState;
  }, LIVE_LOG_STATES[0]);
}

function TripCompletionRate({ value }: { value: number }) {
  return (
    <View
      accessibilityLabel={`Trip completion rate ${value}%`}
      style={drawerStyles.tripCompletionRate}
    >
      <Text style={drawerStyles.tripCompletionEta}>ETA: 20 minutes</Text>
      <View style={drawerStyles.tripCompletionClock}>
        <ClockIcon />
      </View>
      <View style={drawerStyles.progressTrack} />
      <LinearGradient
        colors={['#002AFF', '#77F2F6']}
        end={{ x: 1, y: 0 }}
        locations={[0, 0.95]}
        start={{ x: 0, y: 0 }}
        style={drawerStyles.progressFill}
      />
    </View>
  );
}

function LiveTipsSection() {
  return (
    <LinearGradient
      colors={[colors.blue, colors.cyan]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={drawerStyles.liveTipsBorder}
    >
      <Pressable
        accessibilityLabel="Open new tips"
        accessibilityRole="button"
        style={({ pressed }) => [drawerStyles.liveTips, pressed && styles.pressedFeedback]}
      >
        <LightBulbIcon height={20} width={20} />
        <Text style={drawerStyles.liveTipsText}>New Tips</Text>
        <View style={drawerStyles.liveTipsChevron}>
          <ChevronUpIcon />
        </View>
      </Pressable>
    </LinearGradient>
  );
}

function LivePageIndicator() {
  return (
    <View accessibilityLabel="Page 1 of 3" style={drawerStyles.pageIndicator}>
      <View style={[drawerStyles.pageIndicatorDot, drawerStyles.pageIndicatorDotActive]} />
      <View style={drawerStyles.pageIndicatorDot} />
      <View style={drawerStyles.pageIndicatorDot} />
    </View>
  );
}

function LiveLog({
  progressPercent,
  onProgressChange,
}: {
  progressPercent: number;
  onProgressChange: (value: number) => void;
}) {
  const liveLogState = getLiveLogState(progressPercent);
  const progressTrackWidth = useRef(134);

  const updateProgressFromEvent = useCallback(
    (event: GestureResponderEvent) => {
      const nextValue = Math.max(
        0,
        Math.min(100, Math.round((event.nativeEvent.locationX / progressTrackWidth.current) * 100)),
      );

      onProgressChange(nextValue);
    },
    [onProgressChange],
  );

  const progressPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: updateProgressFromEvent,
        onPanResponderMove: updateProgressFromEvent,
      }),
    [updateProgressFromEvent],
  );

  const handleProgressLayout = (event: LayoutChangeEvent) => {
    progressTrackWidth.current = event.nativeEvent.layout.width;
  };

  return (
    <View style={drawerStyles.liveLog}>
      <View style={drawerStyles.liveBadge}>
        <View style={drawerStyles.liveDot} />
        <Text style={drawerStyles.liveBadgeText}>LIVE</Text>
      </View>

      <View style={drawerStyles.segmentRow}>
        <View style={drawerStyles.segmentLabel}>
          <LiveLogIconView icon={liveLogState.from.icon} />
          <Text style={drawerStyles.segmentText}>{liveLogState.from.label}</Text>
        </View>
        <View
          accessibilityLabel={`Live log progress ${progressPercent}%`}
          accessibilityRole="adjustable"
          onLayout={handleProgressLayout}
          style={drawerStyles.segmentProgress}
          {...progressPanResponder.panHandlers}
        >
          <Text
            style={[
              drawerStyles.percentText,
              { left: `${Math.max(0, Math.min(88, progressPercent))}%` },
            ]}
          >
            {progressPercent}%
          </Text>
          <LinearGradient
            colors={[colors.green, '#004030']}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={drawerStyles.segmentProgressLine}
          />
          <View
            style={[
              drawerStyles.progressKnob,
              { left: `${Math.max(0, Math.min(92, progressPercent))}%` },
            ]}
          />
        </View>
        <View style={[drawerStyles.segmentLabel, drawerStyles.segmentLabelEnd]}>
          <LiveLogIconView icon={liveLogState.to.icon} />
          <Text style={drawerStyles.segmentText}>{liveLogState.to.label}</Text>
        </View>
      </View>

      <View style={drawerStyles.logRows}>
        <View style={drawerStyles.logDivider} />
        {liveLogState.rows.map((row) => (
          <LogRow key={`${liveLogState.percent}-${row.title}`} row={row} />
        ))}
      </View>
    </View>
  );
}

function LogRow({ row }: { row: LiveLogRow }) {
  if (row.state === 'active') {
    return (
      <View style={drawerStyles.activeCard}>
        <Image resizeMode="contain" source={securityCheckInIcon} style={drawerStyles.activeIcon} />
        <Text style={drawerStyles.activeTitle}>{row.title}</Text>
        <View style={drawerStyles.trafficGroup}>
          <Text style={drawerStyles.trafficText}>{row.meta}</Text>
          {row.meta === 'Low traffic at counter' && (
            <View style={drawerStyles.trafficBars}>
              <View>
                <Text style={drawerStyles.trafficPointer}>▾</Text>
                <LinearGradient colors={['#51FF00', '#FFE500']} style={drawerStyles.trafficBar} />
              </View>
              <LinearGradient
                colors={['#FFE600', '#FF7700']}
                style={[drawerStyles.trafficBar, drawerStyles.fadedTrafficBar]}
              />
              <LinearGradient
                colors={['#FF7700', '#DF1A21']}
                style={[drawerStyles.trafficBar, drawerStyles.fadedTrafficBar]}
              />
            </View>
          )}
        </View>
      </View>
    );
  }

  if (row.state === 'passed') {
    return (
      <View style={drawerStyles.completedRow}>
        <View style={drawerStyles.logTask}>
          <CheckCircleIcon />
          <Text style={[drawerStyles.logTaskText, drawerStyles.completedText]}>{row.title}</Text>
        </View>
        <View style={drawerStyles.logMeta}>
          <TimeIcon color={colors.green} />
          <Text style={[drawerStyles.logMetaText, drawerStyles.completedMetaText]}>{row.meta}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={drawerStyles.futureRow}>
      <View style={drawerStyles.logTask}>
        <TimeIcon />
        <Text style={drawerStyles.futureText}>{row.title}</Text>
      </View>
      <View style={drawerStyles.logMeta}>
        <TimeIcon />
        <Text style={drawerStyles.futureMetaText}>{row.meta}</Text>
      </View>
    </View>
  );
}

function ExpandFlightIcon() {
  return (
    <Svg height={17} viewBox="0 0 17 17" width={17}>
      <Path
        d="M11.3334 2.125H15.5834V6.375H14.1667V3.54167H11.3334V2.125ZM1.41669 2.125H5.66669V3.54167H2.83335V6.375H1.41669V2.125ZM14.1667 13.4583V10.625H15.5834V14.875H11.3334V13.4583H14.1667ZM2.83335 13.4583H5.66669V14.875H1.41669V10.625H2.83335V13.4583Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function FlightViewToggleIcon({ isDayView }: { isDayView: boolean }) {
  if (isDayView) {
    return (
      <Svg height={16} viewBox="0 0 24 24" width={16}>
        <Path
          d="M21 13.1C20.2 13.4 19.3 13.5 18.4 13.5C14 13.5 10.5 10 10.5 5.6C10.5 4.7 10.6 3.8 10.9 3C6.9 3.5 3.8 6.9 3.8 11C3.8 15.5 7.5 19.2 12 19.2C16.1 19.2 19.5 16.1 20 12.1Z"
          fill="none"
          stroke={flightColors.gray100}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </Svg>
    );
  }

  return (
    <Svg height={16} viewBox="0 0 24 24" width={16}>
      <Path
        d="M12 7.5A4.5 4.5 0 1 1 12 16.5A4.5 4.5 0 0 1 12 7.5ZM12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93"
        fill="none"
        stroke={flightColors.gray100}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function CarRouteIcon({ color = '#FFFFFF' }: { color?: string }) {
  return (
    <G>
      <Path
        d="M4.2 11.2H19.8C20.5 11.2 21 11.7 21 12.4V16.7H19.2C19 17.8 18 18.7 16.8 18.7C15.6 18.7 14.6 17.8 14.4 16.7H9.6C9.4 17.8 8.4 18.7 7.2 18.7C6 18.7 5 17.8 4.8 16.7H3V12.4C3 11.7 3.5 11.2 4.2 11.2ZM6.1 7H15.8L18.5 10.2H4.7L6.1 7ZM7.2 17.2C7.7 17.2 8.1 16.8 8.1 16.3C8.1 15.8 7.7 15.4 7.2 15.4C6.7 15.4 6.3 15.8 6.3 16.3C6.3 16.8 6.7 17.2 7.2 17.2ZM16.8 17.2C17.3 17.2 17.7 16.8 17.7 16.3C17.7 15.8 17.3 15.4 16.8 15.4C16.3 15.4 15.9 15.8 15.9 16.3C15.9 16.8 16.3 17.2 16.8 17.2Z"
        fill={color}
        stroke="#020618"
        strokeLinejoin="round"
        strokeWidth={1.15}
      />
    </G>
  );
}

function RouteMapMarker({ children, bearing = 0 }: { children: ReactNode; bearing?: number }) {
  return (
    <View style={[flightStyles.routeMarker, { transform: [{ rotate: `${bearing}deg` }] }]}>
      <Svg height={21} viewBox="0 0 24 24" width={21}>
        {children}
      </Svg>
    </View>
  );
}

function RouteEndpointMarker({
  color,
  ringColor,
  size = 24,
}: {
  color: string;
  ringColor: string;
  size?: number;
}) {
  return (
    <View
      style={[
        flightStyles.flightEndpointHalo,
        {
          backgroundColor: ringColor,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      <View style={[flightStyles.flightEndpointDot, { backgroundColor: color }]} />
    </View>
  );
}

function FlightPlaneMapMarker({ bearing }: { bearing: number }) {
  return (
    <View
      style={[
        flightStyles.flightPlaneMapMarker,
        { transform: [{ rotate: `${bearing + 121}deg` }] },
      ]}
    >
      <Image resizeMode="contain" source={flightPlaneIcon} style={flightStyles.flightPlaneIcon} />
    </View>
  );
}

function HomeLocationIndicatorIcon() {
  return (
    <Svg height={26} viewBox="0 0 24 24" width={26}>
      <Circle
        cx={12}
        cy={12}
        fill="none"
        r={8.8}
        stroke="rgba(255, 255, 255, 0.88)"
        strokeWidth={2.4}
      />
      <Circle cx={12} cy={12} fill="#77F2F6" r={4.6} />
    </Svg>
  );
}

function HomeLocationMapMarker() {
  return (
    <View style={flightStyles.homeLocationMapMarker}>
      <HomeLocationIndicatorIcon />
    </View>
  );
}

function RouteGradientHighlight({
  route,
  rgb,
  reverse = false,
  intensity = 1,
}: {
  route: RouteCoordinate[];
  rgb: string;
  reverse?: boolean;
  intensity?: number;
}) {
  const gradientRoute = reverse ? [...route].reverse() : route;
  const segmentCount = Math.max(1, gradientRoute.length - 1);
  const clampedIntensity = Math.max(0.35, Math.min(1, intensity));

  return (
    <>
      {gradientRoute.slice(0, -1).map((coordinate, index) => {
        const progress = index / segmentCount;
        const glowOpacity = (0.3 - progress * 0.24) * clampedIntensity;

        return (
          <Polyline
            key={`route-gradient-glow-${rgb}-${index}`}
            coordinates={[coordinate, gradientRoute[index + 1]]}
            strokeColor={`rgba(${rgb}, ${Math.max(0.04, glowOpacity)})`}
            strokeWidth={5 + clampedIntensity * 2}
          />
        );
      })}
      {gradientRoute.slice(0, -1).map((coordinate, index) => {
        const progress = index / segmentCount;
        const coreOpacity = (0.62 - progress * 0.48) * clampedIntensity;

        return (
          <Polyline
            key={`route-gradient-core-${rgb}-${index}`}
            coordinates={[coordinate, gradientRoute[index + 1]]}
            strokeColor={`rgba(${rgb}, ${Math.max(0.1, coreOpacity)})`}
            strokeWidth={3}
          />
        );
      })}
    </>
  );
}

function RouteEndpointDashHighlight({
  route,
  rgb,
  reverse = false,
}: {
  route: RouteCoordinate[];
  rgb: string;
  reverse?: boolean;
}) {
  const indicatorRoute = reverse ? [...route].reverse() : route;
  const segmentCount = Math.max(1, indicatorRoute.length - 1);

  return (
    <>
      {indicatorRoute.slice(0, -1).map((coordinate, index) => {
        const progress = index / segmentCount;
        const opacity = Math.max(0.16, 0.78 - progress * 0.54);
        const strokeWidth = Math.max(2, 5 - progress * 2.4);

        return (
          <Polyline
            key={`route-endpoint-dash-${rgb}-${index}`}
            coordinates={[coordinate, indicatorRoute[index + 1]]}
            lineDashPattern={[5, 7]}
            strokeColor={`rgba(${rgb}, ${opacity})`}
            strokeWidth={strokeWidth}
          />
        );
      })}
    </>
  );
}

function StyledRoutePolylines({
  route,
  progress = 0.38,
}: {
  route: RouteCoordinate[];
  progress?: number;
}) {
  const clampedProgress = Math.max(0.08, Math.min(0.86, progress));
  const highlightRadius = Math.max(0.08, 0.22 - clampedProgress * 0.12);
  const highlightIntensity = Math.max(0.45, 1 - clampedProgress * 0.45);
  const completedRoute = sliceRoute(
    route,
    Math.max(0, clampedProgress - highlightRadius),
    clampedProgress,
  );
  const completedDashedRoute = sliceRoute(route, 0, clampedProgress);
  const upcomingRoute = sliceRoute(route, clampedProgress, 1);
  const upcomingHighlightRoute = sliceRoute(
    route,
    clampedProgress,
    Math.min(1, clampedProgress + highlightRadius),
  );
  const startIndicatorRoute = sliceRoute(route, 0, 0.16);
  const endIndicatorRoute = sliceRoute(route, 0.84, 1);

  return (
    <>
      <Polyline coordinates={route} strokeColor="rgba(119, 242, 246, 0.08)" strokeWidth={5} />
      <Polyline
        coordinates={completedDashedRoute}
        lineDashPattern={[7, 8]}
        strokeColor="rgba(119, 242, 246, 0.28)"
        strokeWidth={3}
      />
      <Polyline
        coordinates={upcomingRoute}
        lineDashPattern={[7, 8]}
        strokeColor="rgba(119, 242, 246, 0.46)"
        strokeWidth={3}
      />
      <RouteGradientHighlight
        intensity={highlightIntensity}
        rgb="119, 242, 246"
        route={completedRoute}
      />
      <RouteGradientHighlight
        intensity={highlightIntensity}
        reverse
        rgb="0, 42, 255"
        route={upcomingHighlightRoute}
      />
      <RouteEndpointDashHighlight rgb="119, 242, 246" route={startIndicatorRoute} />
      <RouteEndpointDashHighlight reverse rgb="0, 42, 255" route={endIndicatorRoute} />
    </>
  );
}

function FlightRouteMap({
  homeLocation,
  isDayView,
}: {
  homeLocation: RouteCoordinate;
  isDayView: boolean;
}) {
  const mapRef = useRef<NativeMapView | null>(null);
  const [drivingRoute, setDrivingRoute] = useState<RouteCoordinate[]>([]);
  const flightRoute = useMemo(
    () => getCurvedFlightRoute(ADDIS_ABABA_BOLE_AIRPORT, DUBAI_INTERNATIONAL_AIRPORT),
    [],
  );
  const [routePhase, setRoutePhase] = useState<RoutePhase>('drive');
  const [routeProgress, setRouteProgress] = useState(0);
  const activeRoutePhaseIndex = ROUTE_PHASE_SEQUENCE.indexOf(routePhase);
  const activeRoute = useMemo(() => {
    if (routePhase === 'drive') {
      return drivingRoute;
    }

    return flightRoute;
  }, [drivingRoute, flightRoute, routePhase]);
  const activeRouteStart = activeRoute[0];
  const initialRegion = useMemo(() => getRouteRegion(flightRoute), [flightRoute]);
  const canRenderDrivingRoute = drivingRoute.length > 1;
  const canAnimateActiveRoute = activeRoute.length > 1;
  const carMarker = getRouteCoordinateAtProgress(drivingRoute, routeProgress);
  const nextCarMarker = getRouteCoordinateAtProgress(
    drivingRoute,
    Math.min(1, routeProgress + 0.04),
  );
  const carBearing = getRouteBearing(carMarker, nextCarMarker);
  const flightProgress =
    FLIGHT_ANIMATION_START + routeProgress * (FLIGHT_ANIMATION_END - FLIGHT_ANIMATION_START);
  const flightMarker = getRouteCoordinateAtProgress(flightRoute, flightProgress);
  const nextFlightMarker = getRouteCoordinateAtProgress(
    flightRoute,
    Math.min(FLIGHT_ANIMATION_END, flightProgress + 0.02),
  );
  const flightBearing = getRouteBearing(flightMarker, nextFlightMarker);

  const fitActiveRouteToMap = useCallback(() => {
    if (activeRoute.length <= 1) {
      return;
    }

    mapRef.current?.fitToCoordinates(activeRoute, {
      animated: true,
      edgePadding: {
        bottom: 10,
        left: 24,
        right: 24,
        top: 10,
      },
    });
  }, [activeRoute]);

  useEffect(() => {
    let cancelled = false;
    const fallbackDrivingRoute = getCurvedFlightRoute(homeLocation, ADDIS_ABABA_BOLE_AIRPORT, 36);

    setDrivingRoute(fallbackDrivingRoute);
    setRoutePhase('drive');
    setRouteProgress(0);

    fetchDrivingRouteCoordinates(homeLocation, ADDIS_ABABA_BOLE_AIRPORT)
      .then((route) => {
        if (!cancelled) {
          setDrivingRoute(route);
        }
      })
      .catch((error) => {
        if (__DEV__) {
          const message = error instanceof Error ? error.message : 'Failed to load driving route';

          console.warn(`[LiveNavigation] ${message}`);
        }

        if (!cancelled) {
          setDrivingRoute(fallbackDrivingRoute);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [homeLocation]);

  useEffect(() => {
    const fitTimer = setTimeout(fitActiveRouteToMap, 300);

    return () => clearTimeout(fitTimer);
  }, [fitActiveRouteToMap]);

  useEffect(() => {
    const animationInterval = setInterval(() => {
      setRouteProgress((currentProgress) => {
        if (!canAnimateActiveRoute) {
          return currentProgress;
        }

        const nextProgress = currentProgress + ROUTE_PHASE_STEPS[routePhase];

        if (nextProgress < 1) {
          return nextProgress;
        }

        setRoutePhase((currentPhase) => {
          const currentIndex = ROUTE_PHASE_SEQUENCE.indexOf(currentPhase);

          return ROUTE_PHASE_SEQUENCE[(currentIndex + 1) % ROUTE_PHASE_SEQUENCE.length];
        });

        return 0;
      });
    }, 80);

    return () => clearInterval(animationInterval);
  }, [canAnimateActiveRoute, routePhase]);

  return (
    <View style={flightStyles.routeMapLayer}>
      <NativeMapView
        ref={mapRef}
        customMapStyle={isDayView ? LIGHT_GOOGLE_MAP_STYLE : DARK_GOOGLE_MAP_STYLE}
        initialRegion={initialRegion}
        loadingEnabled
        mapType="standard"
        maxZoomLevel={20}
        minZoomLevel={2}
        onMapReady={fitActiveRouteToMap}
        pitchEnabled={false}
        provider={PROVIDER_GOOGLE}
        rotateEnabled={false}
        scrollEnabled
        showsCompass={false}
        showsScale
        style={flightStyles.googleMap}
        toolbarEnabled={false}
        zoomControlEnabled={false}
        zoomEnabled
      >
        {canRenderDrivingRoute &&
          activeRoutePhaseIndex <= ROUTE_PHASE_SEQUENCE.indexOf('drive') && (
            <StyledRoutePolylines
              progress={routePhase === 'drive' ? routeProgress : 0.38}
              route={drivingRoute}
            />
          )}
        {activeRoutePhaseIndex <= ROUTE_PHASE_SEQUENCE.indexOf('flight') && (
          <StyledRoutePolylines
            progress={routePhase === 'flight' ? flightProgress : 0.38}
            route={flightRoute}
          />
        )}
        <Marker
          anchor={{ x: 0.5, y: 0.5 }}
          coordinate={homeLocation}
          tracksViewChanges={false}
          zIndex={40}
        >
          <HomeLocationMapMarker />
        </Marker>
        {routePhase !== 'drive' && activeRouteStart && (
          <Marker coordinate={activeRouteStart} tracksViewChanges={false} zIndex={19}>
            <RouteEndpointMarker color="#002AFF" ringColor="rgba(0, 42, 255, 0.34)" size={28} />
          </Marker>
        )}
        {routePhase === 'drive' && canRenderDrivingRoute && (
          <Marker anchor={{ x: 0.2, y: 0.2 }} coordinate={carMarker} tracksViewChanges zIndex={30}>
            <RouteMapMarker bearing={carBearing - 90}>
              <CarRouteIcon />
            </RouteMapMarker>
          </Marker>
        )}
        {routePhase === 'flight' && (
          <Marker
            anchor={{ x: 0.3, y: 0.3 }}
            coordinate={flightMarker}
            tracksViewChanges
            zIndex={30}
          >
            <FlightPlaneMapMarker bearing={flightBearing} />
          </Marker>
        )}
      </NativeMapView>
    </View>
  );
}

function FlightNavigationView({
  edgeToEdge = false,
  expanded = false,
  onExpand,
}: {
  edgeToEdge?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  const [isDayView, setIsDayView] = useState(false);
  const homeLocation = useLiveNavigationLocation();
  const flightTheme = isDayView ? flightNavigationThemes.day : flightNavigationThemes.night;

  return (
    <View
      style={[
        flightStyles.flightNavigationView,
        edgeToEdge && flightStyles.flightNavigationEdgeToEdge,
        expanded && flightStyles.flightNavigationExpanded,
      ]}
    >
      <LinearGradient
        colors={flightBorderGradient}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={flightStyles.background}
      >
        <View style={[flightStyles.backgroundFill, { backgroundColor: flightTheme.background }]}>
          <View style={[flightStyles.backgroundNight, flightStyles.backgroundPosition]} />
          <View style={[flightStyles.backgroundDay, flightStyles.backgroundPosition]} />
        </View>
      </LinearGradient>
      <View style={[flightStyles.flightNavigation, flightStyles.iconPosition]}>
        <LinearGradient
          colors={flightTheme.cardGradient}
          locations={[0, 0.5, 1]}
          style={flightStyles.container}
        >
          <View style={[flightStyles.icon, flightStyles.iconLayout]} />
          <View style={[flightStyles.containerIcon, flightStyles.iconPosition]} />
        </LinearGradient>
        <FlightRouteMap homeLocation={homeLocation} isDayView={isDayView} />
        <View style={flightStyles.containerWrapper}>
          <LinearGradient
            colors={flightTheme.headerGradient}
            locations={[0, 1]}
            style={flightStyles.container2}
          >
            <View style={flightStyles.container3}>
              <View style={flightStyles.container4}>
                <View style={flightStyles.container5}>
                  <Text style={[flightStyles.routeCode, flightStyles.jfkLaxTypo]}>JFK</Text>
                  <RightArrowIcon
                    color="#FFFFFF"
                    height={8}
                    style={flightStyles.routeArrow}
                    width={8}
                  />
                  <Text style={[flightStyles.routeCode, flightStyles.jfkLaxTypo]}>LAX</Text>
                </View>
                <View style={[flightStyles.container6, flightStyles.containerSpaceBlock]}>
                  <Text style={[flightStyles.americanAirlines, flightStyles.onTimeTypo]}>
                    American Airlines {'\u00b7'} AA2451
                  </Text>
                </View>
              </View>
              <View style={flightStyles.container7}>
                <View style={[flightStyles.container8, flightStyles.containerFlexBox1]}>
                  <Text style={[flightStyles.m, flightStyles.mTypo]}>20m</Text>
                </View>
                <Text style={[flightStyles.onTime, flightStyles.onTimeTypo]}>On Time</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        <View style={flightStyles.flightDataContainer}>
          <View
            style={[
              flightStyles.container9,
              { backgroundColor: flightTheme.dataBackground, borderColor: flightTheme.dataBorder },
            ]}
          >
            <View style={flightStyles.container10}>
              <View style={flightStyles.container11}>
                <View style={flightStyles.containerFlexBox}>
                  <Text style={[flightStyles.cruisingAt35000, flightStyles.miLayout1]}>
                    Cruising at 35,000 ft
                  </Text>
                </View>
                <View style={flightStyles.container13}>
                  <Text style={flightStyles.speed850Kmh}>Speed: 850 km/h</Text>
                </View>
              </View>
              <View style={flightStyles.container14}>
                <View style={[flightStyles.container15, flightStyles.containerFlexBox1]}>
                  <Text style={[flightStyles.distance, flightStyles.miLayout]}>Distance</Text>
                </View>
                <View style={[flightStyles.container16, flightStyles.containerFlexBox]}>
                  <Text style={[flightStyles.mi, flightStyles.miLayout]}>1,245 mi</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
      {!expanded && (
        <Pressable
          accessibilityLabel="Expand flight navigation"
          accessibilityRole="button"
          onPress={onExpand}
          style={({ pressed }) => [
            flightStyles.fullscreenButton,
            pressed && styles.pressedFeedback,
          ]}
        >
          <ExpandFlightIcon />
        </Pressable>
      )}
      <LinearGradient
        colors={flightBorderGradient}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={flightStyles.viewToggleBorder}
      >
        <Pressable
          accessibilityLabel={`Switch to ${isDayView ? 'night' : 'day'} flight navigation view`}
          accessibilityRole="button"
          onPress={() => setIsDayView((currentValue) => !currentValue)}
          style={({ pressed }) => [flightStyles.viewToggle, pressed && styles.pressedFeedback]}
        >
          <FlightViewToggleIcon isDayView={isDayView} />
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const drawerStyles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E5EA',
    borderRadius: 28,
    borderWidth: 1.5,
    elevation: 14,
    overflow: 'hidden',
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    width: '100%',
  },
  modeButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 3,
    flexDirection: 'row',
    gap: 6,
    height: 28,
    marginBottom: 40,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  modeDot: {
    backgroundColor: colors.blue,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  modeText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '500',
  },
  tripCompletionRate: {
    alignSelf: 'center',
    height: 58,
    marginTop: 24,
    position: 'relative',
    width: 255,
  },
  tripCompletionEta: {
    color: colors.ink,
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    fontWeight: '400',
    left: 79,
    lineHeight: 24,
    position: 'absolute',
    top: 0,
  },
  tripCompletionClock: {
    height: 17,
    left: 56,
    position: 'absolute',
    top: 3,
    width: 17,
  },
  progressTrack: {
    backgroundColor: '#D5D5D5',
    borderRadius: 10,
    height: 25,
    left: 0,
    position: 'absolute',
    top: 33,
    width: 255,
  },
  progressFill: {
    borderRadius: 999,
    height: 6,
    left: 9,
    position: 'absolute',
    top: 43,
    width: 174,
  },
  liveBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(217,217,217,0.57)',
    borderRadius: 4,
    flexDirection: 'row',
    gap: 4,
    marginLeft: 10,
    marginTop: 28,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  liveDot: {
    backgroundColor: '#DF1A21',
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  liveBadgeText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  segmentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  segmentText: {
    color: colors.ink,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  segmentLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 5,
    minWidth: 0,
  },
  segmentLabelEnd: {
    justifyContent: 'flex-end',
  },
  segmentProgress: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
    marginHorizontal: 6,
    maxWidth: 134,
    minWidth: 64,
  },
  percentText: {
    color: colors.ink,
    fontSize: 11,
    left: 7,
    lineHeight: 20,
    position: 'absolute',
    top: -15,
  },
  segmentProgressLine: {
    borderRadius: 999,
    height: 4,
    width: '100%',
  },
  progressKnob: {
    backgroundColor: colors.blue,
    borderRadius: 7,
    height: 14,
    left: 10,
    position: 'absolute',
    top: 5,
    width: 14,
  },
  liveLog: {
    alignSelf: 'center',
    borderTopColor: '#E5E5E5',
    borderTopWidth: 1,
    marginTop: 28,
    maxWidth: 320,
    width: '100%',
  },
  logRows: {
    marginTop: 26,
    position: 'relative',
  },
  logDivider: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    bottom: 0,
    left: '55%',
    position: 'absolute',
    top: 0,
    width: 1,
  },
  completedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  logTask: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 5,
    paddingRight: 8,
  },
  logTaskText: {
    color: colors.green,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  logMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 10,
    width: '45%',
  },
  logMetaText: {
    color: colors.green,
    flex: 1,
    fontSize: 11,
    lineHeight: 20,
  },
  completedMetaText: {
    lineHeight: 14,
  },
  activeCard: {
    backgroundColor: colors.blue,
    borderRadius: 20,
    height: 59,
    marginTop: 18,
    position: 'relative',
  },
  activeIcon: {
    height: 28,
    left: 15,
    position: 'absolute',
    top: 16,
    width: 28,
  },
  activeTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    left: 56,
    lineHeight: 17,
    position: 'absolute',
    top: 14,
    width: 93,
  },
  trafficGroup: {
    left: 184,
    position: 'absolute',
    top: 9,
    width: 112,
  },
  trafficText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 20,
  },
  trafficBars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
    paddingLeft: 1,
  },
  trafficPointer: {
    color: colors.blue,
    fontSize: 10,
    height: 8,
    lineHeight: 10,
    marginBottom: -1,
    marginLeft: 2,
  },
  trafficBar: {
    borderRadius: 999,
    height: 4,
    width: 13,
  },
  fadedTrafficBar: {
    opacity: 0.5,
  },
  futureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 20,
    marginTop: 10,
  },
  futureText: {
    color: 'rgba(0,0,0,0.4)',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  futureMetaText: {
    color: 'rgba(0,0,0,0.4)',
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
  },
  liveTipsBorder: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 7,
    height: 36,
    justifyContent: 'center',
    marginTop: 64,
    padding: 1,
    width: 213,
  },
  liveTips: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 6,
    flexDirection: 'row',
    flex: 1,
    paddingLeft: 21,
    paddingRight: 19,
    position: 'relative',
    width: '100%',
  },
  liveTipsText: {
    color: colors.ink,
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginLeft: 4,
  },
  liveTipsChevron: {
    height: 20,
    marginLeft: 'auto',
    width: 20,
  },
  pageIndicator: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 2,
    height: 8,
    marginTop: 40,
    width: 28,
  },
  pageIndicatorDot: {
    borderColor: colors.blue,
    borderRadius: 4,
    borderWidth: 0.5,
    height: 8,
    width: 8,
  },
  pageIndicatorDotActive: {
    backgroundColor: colors.blue,
  },
});

const flightColors = {
  blue: '#002aff',
  deepskyblue: '#26c3ee',
  gray100: '#020618',
  gray200: 'rgba(255, 255, 255, 0.8)',
  gray300: 'rgba(255, 255, 255, 0.6)',
  gray400: 'rgba(255, 255, 255, 0.1)',
  gray500: 'rgba(0, 0, 0, 0.5)',
  gray600: 'rgba(255, 255, 255, 0.2)',
  gray700: 'rgba(0, 0, 0, 0.4)',
  gray800: 'rgba(255, 255, 255, 0.7)',
  mediumturquoise: '#77f2f6',
  white: '#fff',
};

const flightBorderGradient = ['#002aff', '#77f2f6'] as const;

const flightNavigationThemes = {
  night: {
    background: flightColors.gray100,
    border: flightColors.blue,
    cardGradient: ['#0f172b', '#1d293d', '#0f172b'] as const,
    controlBackground: flightColors.gray700,
    controlBorder: flightColors.gray600,
    dataBackground: flightColors.gray500,
    dataBorder: flightColors.gray400,
    headerGradient: ['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0)'] as const,
  },
  day: {
    background: flightColors.deepskyblue,
    border: flightColors.blue,
    cardGradient: [
      flightColors.deepskyblue,
      flightColors.mediumturquoise,
      flightColors.deepskyblue,
    ] as const,
    controlBackground: flightColors.gray700,
    controlBorder: flightColors.gray600,
    dataBackground: flightColors.gray500,
    dataBorder: flightColors.gray400,
    headerGradient: ['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0)'] as const,
  },
};

const flightStyles = StyleSheet.create({
  buttonBorder: {
    borderStyle: 'solid',
    borderWidth: 1,
  },
  backgroundPosition: {
    bottom: '0%',
    display: 'none',
    overflow: 'hidden',
    position: 'absolute',
    right: '0%',
  },
  iconPosition: {
    position: 'absolute',
    zIndex: 1,
  },
  iconLayout: {
    height: 153,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  jfkLaxTypo: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontWeight: '500',
    textAlign: 'left',
    textShadowColor: 'rgba(255, 255, 255, 0.25)',
    textShadowRadius: 1,
  },
  containerSpaceBlock: {
    height: 12,
    paddingBottom: 0,
    paddingTop: 0,
  },
  onTimeTypo: {
    color: flightColors.gray800,
    fontFamily: 'DMSans-Regular',
    fontSize: 8,
    height: 12,
    lineHeight: 12,
  },
  containerFlexBox1: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    paddingRight: 0,
  },
  mTypo: {
    color: flightColors.mediumturquoise,
    fontFamily: 'DMSans-Medium',
    fontWeight: '500',
  },
  miLayout1: {
    fontSize: 9,
    height: 14,
    lineHeight: 14,
  },
  miLayout: {
    textAlign: 'right',
    width: 37,
  },
  containerFlexBox: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    height: 14,
    paddingTop: 0,
  },
  flightNavigationView: {
    alignSelf: 'center',
    height: 246,
    width: 300,
  },
  flightNavigationEdgeToEdge: {
    alignSelf: 'stretch',
    marginHorizontal: -15,
    marginTop: -15,
    width: 'auto',
  },
  flightNavigationExpanded: {
    alignSelf: 'stretch',
    transform: [{ scale: 1.12 }],
    width: 'auto',
  },
  viewToggle: {
    alignItems: 'center',
    backgroundColor: flightColors.white,
    borderRadius: 999,
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  viewToggleBorder: {
    alignSelf: 'flex-end',
    bottom: 0,
    borderRadius: 999,
    height: 28,
    padding: 1,
    position: 'absolute',
    right: 0,
    width: 28,
  },
  expandedOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  expandedNavigationOnly: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
  },
  fullscreenButton: {
    alignItems: 'center',
    bottom: 45,
    marginBottom: 8,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    width: 24,
    zIndex: 5,
  },
  background: {
    borderRadius: 20,
    bottom: '14.17%',
    height: '85.83%',
    left: '0%',
    padding: 1,
    position: 'absolute',
    right: '0%',
    top: '0%',
    width: '100%',
  },
  backgroundFill: {
    borderRadius: 19,
    flex: 1,
    overflow: 'hidden',
  },
  backgroundNight: {
    backgroundColor: flightColors.gray100,
    borderColor: 'transparent',
    borderRadius: 20,
    borderStyle: 'solid',
    borderWidth: 1,
    bottom: '0%',
    display: 'none',
    height: '100%',
    left: '0%',
    top: '0%',
    width: '100%',
  },
  backgroundDay: {
    backgroundColor: flightColors.deepskyblue,
    borderColor: 'transparent',
    borderRadius: 20,
    borderStyle: 'solid',
    borderWidth: 1,
    bottom: '0%',
    display: 'none',
    height: '100%',
    left: '0%',
    top: '0%',
    width: '100%',
  },
  flightNavigation: {
    borderRadius: 10,
    bottom: '14.58%',
    gap: 53,
    height: '85%',
    left: 1,
    overflow: 'hidden',
    paddingLeft: 9,
    paddingRight: 1,
    paddingTop: 10,
    right: 1,
    top: 1,
    width: 'auto',
    zIndex: 1,
  },
  container: {
    backgroundColor: 'transparent',
    borderRadius: 19,
    height: 204,
    left: '50%',
    marginLeft: -149,
    marginTop: -102,
    opacity: 0,
    position: 'absolute',
    top: '50%',
    width: 298,
    zIndex: 0,
  },
  icon: {
    alignSelf: 'stretch',
    height: 153,
    maxWidth: '100%',
    width: '100%',
    zIndex: 0,
  },
  containerIcon: {
    backgroundColor: flightColors.white,
    borderRadius: 10,
    bottom: 89,
    height: 20,
    left: 109,
    width: 20,
  },
  icon2: {
    bottom: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    width: 300,
    zIndex: 1,
  },
  routeMapLayer: {
    bottom: 50,
    left: -9,
    overflow: 'hidden',
    position: 'absolute',
    right: -1,
    top: 50,
    zIndex: 1,
  },
  googleMap: {
    height: '100%',
    width: '100%',
  },
  homeMarker: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  homeMarkerOuter: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  homeMarkerInner: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  routeMarker: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 24, 0.28)',
    borderRadius: 12,
    elevation: 8,
    height: 23,
    justifyContent: 'center',
    shadowColor: '#77F2F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    width: 23,
  },
  homeLocationMapMarker: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 24, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 8,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#77F2F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    width: 40,
  },
  flightEndpointHalo: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  flightEndpointDot: {
    borderColor: 'rgba(255,255,255,0.68)',
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    shadowColor: '#77F2F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    width: 12,
  },
  flightPlaneMapMarker: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 24, 0.28)',
    borderRadius: 30,
    elevation: 8,
    height: 30,
    justifyContent: 'center',
    shadowColor: '#77F2F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    width: 30,
  },
  flightPlaneIcon: {
    height: 48,
    width: 48,
  },
  airportMarker: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#002AFF',
    borderRadius: 7,
    borderWidth: 1.5,
    height: 21,
    justifyContent: 'center',
    minWidth: 34,
    paddingHorizontal: 5,
  },
  airportMarkerText: {
    color: '#002AFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
  gateMarker: {
    backgroundColor: '#51FF00',
    borderColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  flightPlaneMarker: {
    height: 40,
    left: 102,
    position: 'absolute',
    top: 86,
    width: 40,
    zIndex: 2,
  },
  flightPlaneGlow: {
    opacity: 0.55,
    transform: [{ scale: 1.12 }],
    zIndex: 1,
  },
  containerWrapper: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    height: 45,
    marginRight: 8,
    marginLeft: 0,
    position: 'relative',
    zIndex: 4,
  },
  container2: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    flex: 1,
    height: 45,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  container3: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 20,
    height: 29,
    justifyContent: 'space-between',
  },
  container4: {
    gap: 2,
    height: 29,
    width: 52,
  },
  container5: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 3,
    height: 15,
  },
  routeCode: {
    fontSize: 10,
    height: 15,
    letterSpacing: 0.25,
    lineHeight: 15,
    textAlign: 'left',
  },
  routeArrow: {
    marginTop: 1,
  },
  container6: {
    alignSelf: 'stretch',
    flexDirection: 'row',
  },
  americanAirlines: {
    textAlign: 'left',
    width: 102,
  },
  container7: {
    gap: 2,
    height: 29,
    width: 31,
  },
  container8: {
    height: 15,
    paddingLeft: 9,
  },
  m: {
    fontSize: 10,
    height: 15,
    lineHeight: 15,
    textAlign: 'right',
    width: 25,
  },
  onTime: {
    textAlign: 'right',
    width: 34,
  },
  flightDataContainer: {
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    gap: 28,
    height: 98,
    position: 'relative',
    zIndex: 4,
  },
  container9: {
    backgroundColor: flightColors.gray500,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderColor: flightColors.gray400,
    borderStyle: 'solid',
    borderTopWidth: 1,
    flexDirection: 'row',
    height: 50,
    left: -9,
    right: -1,
    paddingBottom: 13,
    paddingHorizontal: 8,
    paddingTop: 7,
    position: 'absolute',
    top: 52,
    zIndex: 2,
  },
  container10: {
    alignItems: 'flex-end',
    flex: 1,
    flexDirection: 'row',
    height: 26,
    justifyContent: 'space-between',
    paddingBottom: 0,
    paddingLeft: 10,
    paddingRight: 42,
    paddingTop: 3,
  },
  container11: {
    gap: 2,
    height: 26,
    width: 88,
  },
  cruisingAt35000: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontWeight: '500',
    textAlign: 'left',
    textShadowColor: 'rgba(255, 255, 255, 0.25)',
    textShadowRadius: 1,
    width: 92,
  },
  container13: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    height: 11,
    paddingTop: 0,
  },
  speed850Kmh: {
    color: flightColors.gray300,
    fontFamily: 'DMSans-Regular',
    fontSize: 7,
    height: 11,
    lineHeight: 11,
    textAlign: 'left',
    width: 59,
  },
  container14: {
    height: 26,
    width: 33,
  },
  container15: {
    height: 12,
    paddingBottom: 0,
    paddingTop: 0,
  },
  distance: {
    color: flightColors.mediumturquoise,
    fontFamily: 'DMSans-Medium',
    fontSize: 8,
    fontWeight: '500',
    height: 12,
    lineHeight: 12,
    width: 37,
  },
  container16: {
    paddingHorizontal: 0,
  },
  mi: {
    color: flightColors.gray200,
    fontFamily: 'DMSans-Regular',
    fontSize: 9,
    height: 14,
    lineHeight: 14,
  },
  viewSwitchClickableFrame: {
    bottom: '0%',
    display: 'none',
    height: '11.67%',
    left: '90.67%',
    top: '88.33%',
    width: '9.33%',
  },
});
