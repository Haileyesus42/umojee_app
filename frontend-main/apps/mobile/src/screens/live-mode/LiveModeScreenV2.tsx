import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import NativeMapView, { Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Svg, { Circle, Path, Polyline as SvgPolyline } from 'react-native-svg';

import { fetchNodeWithFallback } from '../../api/client';
import { ScreenFrame } from '../../components/layout/ScreenFrame';
import { colors } from '../../constants/colors';
import { styles } from '../../theme/styles';
import type { WebSocketStatus } from '../../api/websocket';
import type {
  LiveAlert,
  LiveFlightSummary,
  LiveLog,
  LiveProgress,
  LiveStat,
  JourneyItem,
  MobileJourneyPayloadV1,
} from '../../api/notifications';

type LiveModeScreenV2Props = {
  onBack: () => void;
  onOpenRoutes?: () => void;
  onOpenAssistant?: () => void;
  notificationUnreadCount?: number;
  onOpenHome: () => void;
  onOpenChat: () => void;
  onOpenJourneys?: () => void;
  onOpenNotifications: () => void;
  onOpenProfile?: () => void;
  onOpenWallet?: () => void;
  onOpenTravelSupport?: () => void;
  onLogout?: () => void;
  profileImageUri?: string | null;
  mobilePayload?: MobileJourneyPayloadV1;
  journey?: JourneyItem;
  liveJourneyMonitorEnabled?: boolean;
  liveJourneyWebSocketStatus?: WebSocketStatus;
  onLiveJourneyMonitorToggle?: () => void;
};

const airlineLogo = require('../../../assets/images/american-airlines-logo.png');
const securityCheckInIcon = require('../../../assets/images/security_check-in.png');

type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

type MapScreenPoint = {
  x: number;
  y: number;
};

const JFK_AIRPORT: RouteCoordinate = {
  latitude: 40.6413,
  longitude: -73.7781,
};

const LAX_AIRPORT: RouteCoordinate = {
  latitude: 33.9416,
  longitude: -118.4085,
};

const flightMapRegion: Region = {
  latitude: (JFK_AIRPORT.latitude + LAX_AIRPORT.latitude) / 2,
  latitudeDelta: 18,
  longitude: (JFK_AIRPORT.longitude + LAX_AIRPORT.longitude) / 2,
  longitudeDelta: 58,
};

const flightMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#101A35' }] },
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1F3050' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#152040' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D1528' }] },
];

const flightRouteCoordinates = createFlightRouteCoordinates();

const ADD_AIRPORT: RouteCoordinate = {
  latitude: 8.9779,
  longitude: 38.7993,
};

const AIRPORT_COORDINATES: Record<string, RouteCoordinate> = {
  ADD: ADD_AIRPORT,
  JFK: JFK_AIRPORT,
  LAX: LAX_AIRPORT,
};

type LiveLogIcon = 'activities' | 'airport' | 'flight' | 'home' | 'stays';
type LiveLogRowState = 'active' | 'passed' | 'upcoming';
type LiveLogRowItem = {
  title: string;
  meta: string;
  state: LiveLogRowState;
};
type LiveLogState = {
  percent: number;
  from: { icon: LiveLogIcon; label: string };
  to: { icon: LiveLogIcon; label: string };
  rows: LiveLogRowItem[];
};

const liveLogStates: LiveLogState[] = [
  {
    percent: 0,
    from: { icon: 'home', label: 'Home' },
    to: { icon: 'airport', label: 'Airport' },
    rows: [
      { title: 'Getting ready to leave', meta: 'Check documents and bags', state: 'active' },
      { title: 'Leaving home', meta: 'Estimated drive: 25 mins', state: 'upcoming' },
      { title: 'On the road', meta: 'Traffic: moderate', state: 'upcoming' },
      { title: 'Approaching airport', meta: 'Follow terminal signs', state: 'upcoming' },
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
    ],
  },
  {
    percent: 80,
    from: { icon: 'airport', label: 'Airport' },
    to: { icon: 'flight', label: 'Flight' },
    rows: [
      {
        title: 'Wait at check-in counter queue',
        meta: 'Check for check-in counter',
        state: 'active',
      },
      { title: 'Check-In at counter', meta: 'Check for check-in counter', state: 'upcoming' },
      { title: 'Head through security', meta: 'Wait time: 8-12 mins', state: 'upcoming' },
      { title: 'Go to departure gate', meta: 'Starts at: 9:50', state: 'upcoming' },
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
      { title: 'Approaching home', meta: '2 mins away', state: 'upcoming' },
    ],
  },
];

const flightStats = [
  { icon: 'altitude', value: '35,000 ft', label: 'Altitude' },
  { icon: 'speed', value: '850 km/h', label: 'Ground Speed' },
  { icon: 'wind', value: '42 km/h', label: 'Tail Wind' },
  { icon: 'temp', value: '-48\u00B0C', label: 'Outside Temp' },
] as const;

export function LiveModeScreenV2({
  onBack,
  onOpenRoutes,
  onOpenAssistant,
  notificationUnreadCount = 0,
  onOpenHome,
  onOpenChat,
  onOpenJourneys,
  onOpenNotifications,
  onOpenProfile,
  onOpenWallet,
  onOpenTravelSupport,
  onLogout,
  profileImageUri,
  mobilePayload,
  journey,
  liveJourneyMonitorEnabled = false,
  liveJourneyWebSocketStatus = 'idle',
  onLiveJourneyMonitorToggle,
}: LiveModeScreenV2Props) {
  const liveMode = mobilePayload?.live_mode;
  const flightSummary = useMemo(
    () => getLiveFlightSummary(mobilePayload, journey),
    [journey, mobilePayload],
  );
  const currentJourneySegment = getCurrentJourneySegment(
    mobilePayload,
    journey,
    liveMode?.progress || undefined,
  );
  const flightNotDeparted = isFlightDepartureInFuture(flightSummary.departure_time);
  const flightTimelinePercent = getFlightTimelinePercent(
    flightSummary,
    currentJourneySegment,
    liveMode?.progress || undefined,
  );
  const headerStatus =
    liveJourneyWebSocketStatus === 'open'
      ? 'live'
      : liveJourneyMonitorEnabled
        ? 'connecting'
        : 'offline';
  const headerSubtitle =
    headerStatus === 'live'
      ? 'Real-time flight updates'
      : headerStatus === 'connecting'
        ? 'Connecting...'
        : 'Offline';
  const headerDotColor =
    headerStatus === 'live' ? '#22C55E' : headerStatus === 'connecting' ? '#FACC15' : '#6B7280';

  return (
    <ScreenFrame
      footerSource="liveMode"
      fullBleedContent
      notificationUnreadCount={notificationUnreadCount}
      onOpenAssistant={onOpenAssistant}
      onOpenHome={onOpenHome}
      onOpenChat={onOpenChat}
      onOpenNotifications={onOpenNotifications}
      onOpenProfile={onOpenProfile}
      onOpenWallet={onOpenWallet}
      onOpenJourneys={onOpenJourneys}
      onOpenTravelSupport={onOpenTravelSupport}
      onLogout={onLogout}
      profileImageUri={profileImageUri}
    >
      <LinearGradient colors={['#070A1C', '#111735', '#070A1C']} style={liveModeV2Styles.screen}>
        <View style={liveModeV2Styles.modeHeader}>
          <View>
            <View style={liveModeV2Styles.liveTitleRow}>
              <View style={[liveModeV2Styles.liveDot, { backgroundColor: headerDotColor }]} />
              <Text style={liveModeV2Styles.liveTitle}>Live Mode</Text>
            </View>
            <Text style={liveModeV2Styles.liveSubtitle}>{headerSubtitle}</Text>
          </View>
          <View style={liveModeV2Styles.normalModeButton}>
            <Pressable
              accessibilityLabel={
                liveJourneyMonitorEnabled ? 'Turn off live monitoring' : 'Turn on live monitoring'
              }
              accessibilityRole="switch"
              accessibilityState={{ checked: liveJourneyMonitorEnabled }}
              disabled={!onLiveJourneyMonitorToggle}
              onPress={onLiveJourneyMonitorToggle}
              style={({ pressed }) => [
                liveModeV2Styles.switchButton,
                pressed && styles.pressedFeedback,
              ]}
            >
              <View
                style={[
                  liveModeV2Styles.switchTrack,
                  liveJourneyMonitorEnabled && liveModeV2Styles.switchTrackActive,
                  liveJourneyWebSocketStatus === 'open' && liveModeV2Styles.switchTrackConnected,
                ]}
              >
                <View
                  style={[
                    liveModeV2Styles.switchKnob,
                    liveJourneyMonitorEnabled && liveModeV2Styles.switchKnobActive,
                  ]}
                />
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel="Switch to normal mode"
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [
                liveModeV2Styles.normalModeAction,
                pressed && styles.pressedFeedback,
              ]}
            >
              <Text style={liveModeV2Styles.normalModeText}>Switch to Normal Mode</Text>
            </Pressable>
          </View>
        </View>

        <FlightSummaryCard
          flight={flightSummary}
          progress={liveMode?.progress || undefined}
        />
        <ArrivalCard
          flight={flightSummary}
          progress={liveMode?.progress || undefined}
          timelinePercent={flightTimelinePercent}
        />
        <FlightProgressCard
          flight={flightSummary}
          progress={liveMode?.progress || undefined}
          notDeparted={flightNotDeparted}
        />
        <FlightStatsRow stats={liveMode?.stats} />
        <RouteSearchBar onPress={onOpenRoutes} />
        <LiveRouteMapCard
          journey={journey}
          mobilePayload={mobilePayload}
          progress={liveMode?.progress || undefined}
        />
        <AlertCard alerts={liveMode?.alerts} />
        <LiveLogCard currentSegment={currentJourneySegment} journey={journey} />
      </LinearGradient>
    </ScreenFrame>
  );
}

function FlightStatsRow({ stats }: { stats?: LiveStat[] }) {
  const displayStats =
    stats && stats.length
      ? stats.slice(0, 4).map((stat) => ({
          icon: stat.key || 'altitude',
          label: stat.label,
          value: stat.value,
        }))
      : flightStats;

  return (
    <View style={liveModeV2Styles.statsRow}>
      {displayStats.map((stat) => (
        <View key={stat.label} style={liveModeV2Styles.statCard}>
          <FlightStatIcon name={stat.icon as (typeof flightStats)[number]['icon']} />
          <Text style={liveModeV2Styles.statValue}>{stat.value}</Text>
          <Text style={liveModeV2Styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

function RouteSearchBar({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Search airports or routes"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [liveModeV2Styles.searchBar, pressed && styles.pressedFeedback]}
    >
      <SearchIcon color="#7B8DB8" size={15} />
      <Text style={liveModeV2Styles.searchText}>Search airports or routes...</Text>
      <PinIcon color="#2E7DFF" size={16} />
    </Pressable>
  );
}

function createFlightRouteCoordinates(
  origin: RouteCoordinate = JFK_AIRPORT,
  destination: RouteCoordinate = LAX_AIRPORT,
) {
  const latitudeSpan = destination.latitude - origin.latitude;
  const longitudeSpan = destination.longitude - origin.longitude;
  const curveLift = Math.max(0.08, Math.min(8, Math.abs(longitudeSpan) * 0.12));
  const controlOne: RouteCoordinate = {
    latitude: origin.latitude + latitudeSpan * 0.42 + curveLift,
    longitude: origin.longitude + longitudeSpan * 0.28,
  };
  const controlTwo: RouteCoordinate = {
    latitude: origin.latitude + latitudeSpan * 0.58 + curveLift,
    longitude: origin.longitude + longitudeSpan * 0.72,
  };

  return Array.from({ length: 64 }, (_, index) => {
    const progress = index / 63;
    const inverseProgress = 1 - progress;

    return {
      latitude:
        inverseProgress ** 3 * origin.latitude +
        3 * inverseProgress ** 2 * progress * controlOne.latitude +
        3 * inverseProgress * progress ** 2 * controlTwo.latitude +
        progress ** 3 * destination.latitude,
      longitude:
        inverseProgress ** 3 * origin.longitude +
        3 * inverseProgress ** 2 * progress * controlOne.longitude +
        3 * inverseProgress * progress ** 2 * controlTwo.longitude +
        progress ** 3 * destination.longitude,
    };
  });
}

function getCoordinateDistance(start: RouteCoordinate, end: RouteCoordinate) {
  const latitudeDistance = end.latitude - start.latitude;
  const longitudeDistance = end.longitude - start.longitude;

  return Math.sqrt(latitudeDistance ** 2 + longitudeDistance ** 2);
}

function getRouteCoordinateAtProgress(route: RouteCoordinate[], progress: number) {
  if (!route.length) {
    return JFK_AIRPORT;
  }

  if (route.length === 1) {
    return route[0];
  }

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const segmentDistances = route
    .slice(0, -1)
    .map((coordinate, index) =>
      getCoordinateDistance(coordinate, route[index + 1]),
    );
  const totalDistance = segmentDistances.reduce((sum, distance) => sum + distance, 0);
  let remainingDistance = clampedProgress * totalDistance;

  for (let index = 0; index < segmentDistances.length; index += 1) {
    const segmentDistance = segmentDistances[index];

    if (remainingDistance <= segmentDistance || index === segmentDistances.length - 1) {
      const start = route[index];
      const end = route[index + 1];
      const segmentProgress = segmentDistance === 0 ? 0 : remainingDistance / segmentDistance;

      return {
        latitude: start.latitude + (end.latitude - start.latitude) * segmentProgress,
        longitude: start.longitude + (end.longitude - start.longitude) * segmentProgress,
      };
    }

    remainingDistance -= segmentDistance;
  }

  return route[route.length - 1];
}

function getRouteProgressForCoordinate(route: RouteCoordinate[], coordinate?: RouteCoordinate | null) {
  if (!coordinate || route.length < 2) {
    return null;
  }

  const segmentDistances = route
    .slice(0, -1)
    .map((routeCoordinate, index) =>
      getCoordinateDistance(routeCoordinate, route[index + 1]),
    );
  const totalDistance = segmentDistances.reduce((sum, distance) => sum + distance, 0);

  if (totalDistance <= 0) {
    return null;
  }

  let bestDistance = Number.POSITIVE_INFINITY;
  let bestDistanceAlongRoute = 0;
  let traversedDistance = 0;

  for (let index = 0; index < segmentDistances.length; index += 1) {
    const start = route[index];
    const end = route[index + 1];
    const segmentDistance = segmentDistances[index];

    if (segmentDistance <= 0) {
      continue;
    }

    const latitudeDelta = end.latitude - start.latitude;
    const longitudeDelta = end.longitude - start.longitude;
    const rawProjection =
      ((coordinate.latitude - start.latitude) * latitudeDelta +
        (coordinate.longitude - start.longitude) * longitudeDelta) /
      segmentDistance ** 2;
    const segmentProgress = Math.max(0, Math.min(1, rawProjection));
    const projectedCoordinate = {
      latitude: start.latitude + latitudeDelta * segmentProgress,
      longitude: start.longitude + longitudeDelta * segmentProgress,
    };
    const projectedDistance = getCoordinateDistance(coordinate, projectedCoordinate);

    if (projectedDistance < bestDistance) {
      bestDistance = projectedDistance;
      bestDistanceAlongRoute = traversedDistance + segmentDistance * segmentProgress;
    }

    traversedDistance += segmentDistance;
  }

  return Math.max(0, Math.min(1, bestDistanceAlongRoute / totalDistance));
}

function getRouteVisualPointString(points: MapScreenPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function sampleRouteForOverlay(route: RouteCoordinate[], maxPoints = 56) {
  if (route.length <= maxPoints) {
    return route;
  }

  return Array.from({ length: maxPoints }, (_, index) =>
    getRouteCoordinateAtProgress(route, index / (maxPoints - 1)),
  );
}

type LiveRouteModel = {
  currentPosition?: RouteCoordinate | null;
  destination: RouteCoordinate;
  destinationCode: string;
  destinationLabel: string;
  isDummy: boolean;
  isGroundRoute: boolean;
  label: string;
  origin: RouteCoordinate;
  originCode: string;
  originLabel: string;
  route: RouteCoordinate[];
  segment: string;
};

function parseRouteCoordinate(value: unknown): RouteCoordinate | null {
  if (Array.isArray(value) && value.length >= 2) {
    const latitude = Number(value[0]);
    const longitude = Number(value[1]);

    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const latitude = Number(record.latitude ?? record.lat);
    const longitude = Number(record.longitude ?? record.lng ?? record.lon);

    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  }

  return null;
}

function getCoordinateFromRecord(record: unknown): RouteCoordinate | null {
  return record && typeof record === 'object' ? parseRouteCoordinate(record) : null;
}

function getContextCoordinate(context: JourneyItem['context'] | undefined, key: string) {
  const record = context as Record<string, unknown> | undefined;
  const latitude = Number(record?.[`${key}_lat`] ?? record?.[`${key}_latitude`]);
  const longitude = Number(record?.[`${key}_lon`] ?? record?.[`${key}_lng`] ?? record?.[`${key}_longitude`]);

  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

function getAirportCoordinate(code?: string | null, fallback?: RouteCoordinate | null) {
  const normalizedCode = getString(code).toUpperCase();

  return fallback || AIRPORT_COORDINATES[normalizedCode] || null;
}

function formatRouteLabel(value?: string | null) {
  return getString(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getRouteCoordinatesFromPayload(mobilePayload?: MobileJourneyPayloadV1) {
  const routeMap = mobilePayload?.live_mode.route_map;
  const coordinates = Array.isArray(routeMap?.coordinates)
    ? routeMap.coordinates.map(parseRouteCoordinate).filter((coordinate) => coordinate !== null)
    : [];

  return coordinates as RouteCoordinate[];
}

function buildLiveRouteModel(
  mobilePayload?: MobileJourneyPayloadV1,
  journey?: JourneyItem,
  progress?: LiveProgress,
): LiveRouteModel {
  const payloadRoute = getRouteCoordinatesFromPayload(mobilePayload);
  const context = journey?.context;
  const routeMap = mobilePayload?.live_mode.route_map;
  const currentSegment =
    progress?.current_segment ||
    mobilePayload?.current_segment ||
    journey?.current_segment ||
    'demo_route';
  const departureCode =
    mobilePayload?.summary.departure_code ||
    journey?.home_payload?.trip?.departure_code ||
    journey?.home_payload?.flight?.departure_airport_code ||
    context?.flight_status?.departure_airport ||
    getString((context as Record<string, unknown> | undefined)?.airport_code) ||
    'JFK';
  const arrivalCode =
    mobilePayload?.summary.arrival_code ||
    journey?.home_payload?.trip?.arrival_code ||
    journey?.home_payload?.flight?.arrival_airport_code ||
    context?.flight_status?.arrival_airport ||
    'LAX';
  const currentLocation =
    getCoordinateFromRecord(context?.location) ||
    getCoordinateFromRecord((context as Record<string, unknown> | undefined)?.monitoring_location);
  const departureAirportCoordinate = getAirportCoordinate(
    departureCode,
    getContextCoordinate(context, 'departure_airport'),
  );
  const arrivalAirportCoordinate = getAirportCoordinate(
    arrivalCode,
    getContextCoordinate(context, 'arrival_airport') || getContextCoordinate(context, 'destination_airport'),
  );
  const payloadOrigin = getCoordinateFromRecord(routeMap?.origin);
  const payloadDestination = getCoordinateFromRecord(routeMap?.destination);
  const payloadCurrentPosition = getCoordinateFromRecord(routeMap?.current_position);
  const segmentLabel = formatRouteLabel(currentSegment) || 'Live Route';

  if (payloadRoute.length > 1) {
    const origin = payloadOrigin || payloadRoute[0];
    const destination = payloadDestination || payloadRoute[payloadRoute.length - 1];

    return {
      currentPosition: payloadCurrentPosition || currentLocation,
      destination,
      destinationCode: getString(routeMap?.destination?.code) || arrivalCode,
      destinationLabel: getString(routeMap?.destination?.name) || 'Destination',
      isDummy: false,
      isGroundRoute: true,
      label: `${segmentLabel} · Live Route`,
      origin,
      originCode: getString(routeMap?.origin?.code) || 'YOU',
      originLabel: getString(routeMap?.origin?.name) || 'Current location',
      route: payloadRoute,
      segment: currentSegment,
    };
  }

  if (currentSegment === 'home_to_airport' && currentLocation && departureAirportCoordinate) {
    const originCode = getString(context?.location?.city) || 'YOU';
    const destinationCode = departureCode || 'APT';
    const origin = payloadOrigin || currentLocation;
    const currentPosition = payloadCurrentPosition || currentLocation;

    return {
      currentPosition,
      destination: departureAirportCoordinate,
      destinationCode,
      destinationLabel: `${destinationCode} Airport`,
      isDummy: false,
      isGroundRoute: true,
      label: 'Home To Airport · Live Route',
      origin,
      originCode,
      originLabel: 'Current location',
      route: createFlightRouteCoordinates(origin, departureAirportCoordinate),
      segment: currentSegment,
    };
  }

  if (departureAirportCoordinate && arrivalAirportCoordinate) {
    return {
      currentPosition: payloadCurrentPosition || currentLocation,
      destination: arrivalAirportCoordinate,
      destinationCode: arrivalCode,
      destinationLabel: `${arrivalCode} Airport`,
      isDummy: false,
      isGroundRoute: false,
      label: `${segmentLabel} · Live Route`,
      origin: departureAirportCoordinate,
      originCode: departureCode,
      originLabel: `${departureCode} Airport`,
      route: createFlightRouteCoordinates(departureAirportCoordinate, arrivalAirportCoordinate),
      segment: currentSegment,
    };
  }

  return {
    currentPosition: null,
    destination: LAX_AIRPORT,
    destinationCode: 'LAX',
    destinationLabel: 'Los Angeles',
    isDummy: true,
    isGroundRoute: false,
    label: 'Demo Route',
    origin: JFK_AIRPORT,
    originCode: 'JFK',
    originLabel: 'New York',
    route: flightRouteCoordinates,
    segment: 'demo_route',
  };
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
    throw new Error(`Driving route request failed with ${response.status}`);
  }

  const data = (await response.json().catch(() => ({}))) as { route?: unknown[] };
  const route = Array.isArray(data.route)
    ? data.route.map(parseRouteCoordinate).filter((coordinate) => coordinate !== null)
    : [];

  if (route.length <= 1) {
    throw new Error('Driving route response did not include enough coordinates');
  }

  return route as RouteCoordinate[];
}

function getRouteRegion(route: RouteCoordinate[]): Region {
  const coordinates = route.length > 1 ? route : flightRouteCoordinates;
  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    latitudeDelta: Math.max(0.02, (maxLatitude - minLatitude) * 1.8),
    longitude: (minLongitude + maxLongitude) / 2,
    longitudeDelta: Math.max(0.02, (maxLongitude - minLongitude) * 1.8),
  };
}

function LiveRouteMapCard({
  journey,
  mobilePayload,
  progress,
}: {
  journey?: JourneyItem;
  mobilePayload?: MobileJourneyPayloadV1;
  progress?: LiveProgress;
}) {
  const mapRef = useRef<NativeMapView | null>(null);
  const isResettingMapRef = useRef(false);
  const projectionFrameRef = useRef<number | null>(null);
  const projectionRequestRef = useRef(0);
  const resetLayerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetLayerFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeModel = useMemo(
    () => buildLiveRouteModel(mobilePayload, journey, progress),
    [journey, mobilePayload, progress?.current_segment],
  );
  const [resolvedRoute, setResolvedRoute] = useState<RouteCoordinate[]>(routeModel.route);
  const [routeScreenPoints, setRouteScreenPoints] = useState<MapScreenPoint[]>([]);
  const [originScreenPoint, setOriginScreenPoint] = useState<MapScreenPoint | null>(null);
  const [destinationScreenPoint, setDestinationScreenPoint] = useState<MapScreenPoint | null>(null);
  const [progressScreenPoint, setProgressScreenPoint] = useState<MapScreenPoint | null>(null);
  const [isMapDetailMode, setIsMapDetailMode] = useState(false);
  const modelProgress = Math.max(0, Math.min(1, (progress?.percent ?? 0) / 100));
  const [routeProgress, setRouteProgress] = useState(routeModel.isDummy ? 0.7 : modelProgress);
  const displayRoute = resolvedRoute.length > 1 ? resolvedRoute : routeModel.route;
  const currentPositionProgress = useMemo(
    () => getRouteProgressForCoordinate(displayRoute, routeModel.currentPosition),
    [displayRoute, routeModel.currentPosition],
  );
  const targetRouteProgress = routeModel.isDummy
    ? 0.7
    : currentPositionProgress ?? modelProgress;
  const overlayRoute = useMemo(() => sampleRouteForOverlay(displayRoute), [displayRoute]);
  const routeRegion = useMemo(() => getRouteRegion(displayRoute), [displayRoute]);
  const routeProgressIndex = Math.max(
    1,
    Math.round(routeProgress * (routeScreenPoints.length - 1)),
  );
  const completedRoutePoints = routeScreenPoints.slice(0, routeProgressIndex + 1);
  const remainingRoutePoints = routeScreenPoints.slice(routeProgressIndex);
  const progressCoordinate = useMemo(
    () => getRouteCoordinateAtProgress(displayRoute, routeProgress),
    [displayRoute, routeProgress],
  );
  const routePercent = Math.round(routeProgress * 100);
  const projectCoordinate = useCallback(async (coordinate: RouteCoordinate) => {
    const point = await mapRef.current?.pointForCoordinate(coordinate);

    return point ? { x: point.x, y: point.y } : null;
  }, []);
  const updateProjectedRoute = useCallback(async () => {
    if (!mapRef.current) {
      return;
    }

    const requestId = projectionRequestRef.current + 1;
    projectionRequestRef.current = requestId;
    const projectedRoutePoints = await Promise.all(overlayRoute.map(projectCoordinate));
    const projectedOriginPoint = await projectCoordinate(routeModel.origin);
    const projectedDestinationPoint = await projectCoordinate(routeModel.destination);
    const projectedProgressPoint = await projectCoordinate(progressCoordinate);

    if (projectionRequestRef.current !== requestId) {
      return;
    }

    setRouteScreenPoints(
      projectedRoutePoints.filter((point): point is MapScreenPoint => point !== null),
    );
    setOriginScreenPoint(projectedOriginPoint);
    setDestinationScreenPoint(projectedDestinationPoint);
    setProgressScreenPoint(projectedProgressPoint);
  }, [
    overlayRoute,
    progressCoordinate,
    projectCoordinate,
    routeModel.destination,
    routeModel.origin,
  ]);
  const scheduleProjectedRouteUpdate = useCallback(() => {
    if (projectionFrameRef.current !== null) {
      return;
    }

    projectionFrameRef.current = requestAnimationFrame(() => {
      projectionFrameRef.current = null;
      void updateProjectedRoute();
    });
  }, [updateProjectedRoute]);
  const completeFlightRouteReset = useCallback(() => {
    if (!isResettingMapRef.current) {
      return;
    }

    if (resetLayerTimeoutRef.current !== null) {
      clearTimeout(resetLayerTimeoutRef.current);
      resetLayerTimeoutRef.current = null;
    }

    resetLayerTimeoutRef.current = setTimeout(() => {
      setIsMapDetailMode(false);
      resetLayerTimeoutRef.current = null;
      isResettingMapRef.current = false;
      requestAnimationFrame(() => {
        updateProjectedRoute();
      });
    }, 90);
  }, [updateProjectedRoute]);
  const resetFlightRouteViewport = useCallback(
    (animated = true) => {
      if (resetLayerTimeoutRef.current !== null) {
        clearTimeout(resetLayerTimeoutRef.current);
        resetLayerTimeoutRef.current = null;
      }
      if (resetLayerFallbackRef.current !== null) {
        clearTimeout(resetLayerFallbackRef.current);
        resetLayerFallbackRef.current = null;
      }

      isResettingMapRef.current = true;
      if (!animated) {
        setIsMapDetailMode(false);
      }

      mapRef.current?.fitToCoordinates(displayRoute, {
        animated,
        edgePadding: {
          bottom: 28,
          left: 24,
          right: 24,
          top: 22,
        },
      });
      requestAnimationFrame(() => {
        updateProjectedRoute();
      });

      resetLayerFallbackRef.current = setTimeout(
        completeFlightRouteReset,
        animated ? 900 : 120,
      );
    },
    [completeFlightRouteReset, displayRoute, updateProjectedRoute],
  );
  const handleMapRegionChange = useCallback(() => {
    if (!isResettingMapRef.current) {
      setIsMapDetailMode(true);
    }

    scheduleProjectedRouteUpdate();
  }, [scheduleProjectedRouteUpdate]);
  const handleMapRegionChangeComplete = useCallback(() => {
    if (isResettingMapRef.current) {
      if (resetLayerFallbackRef.current !== null) {
        clearTimeout(resetLayerFallbackRef.current);
        resetLayerFallbackRef.current = null;
      }
      completeFlightRouteReset();
    }

    void updateProjectedRoute();
  }, [completeFlightRouteReset, updateProjectedRoute]);

  useEffect(() => {
    requestAnimationFrame(() => {
      resetFlightRouteViewport(false);
    });
  }, [resetFlightRouteViewport]);

  useEffect(() => {
    scheduleProjectedRouteUpdate();
  }, [routeProgress, scheduleProjectedRouteUpdate]);

  useEffect(
    () => () => {
      if (projectionFrameRef.current !== null) {
        cancelAnimationFrame(projectionFrameRef.current);
      }
      if (resetLayerTimeoutRef.current !== null) {
        clearTimeout(resetLayerTimeoutRef.current);
      }
      if (resetLayerFallbackRef.current !== null) {
        clearTimeout(resetLayerFallbackRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!routeModel.isDummy) {
      return undefined;
    }

    const animationInterval = setInterval(() => {
      setRouteProgress((currentProgress) => (currentProgress >= 1 ? 0 : currentProgress + 0.006));
    }, 90);

    return () => clearInterval(animationInterval);
  }, [routeModel.isDummy]);

  useEffect(() => {
    let cancelled = false;
    setRouteProgress(routeModel.isDummy ? 0.7 : modelProgress);
    setResolvedRoute(routeModel.route);

    if (!routeModel.isGroundRoute || routeModel.isDummy) {
      return () => {
        cancelled = true;
      };
    }

    void fetchDrivingRouteCoordinates(routeModel.origin, routeModel.destination)
      .then((route) => {
        if (!cancelled) {
          setResolvedRoute(route);
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.warn('[LiveRouteMap] Falling back to generated route:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [modelProgress, routeModel]);

  useEffect(() => {
    if (!routeModel.isDummy) {
      setRouteProgress(targetRouteProgress);
    }
  }, [routeModel.isDummy, targetRouteProgress]);

  return (
    <View style={liveModeV2Styles.routeCard}>
      <View style={liveModeV2Styles.routeMapGlass}>
        <LinearGradient
          colors={['rgba(25, 84, 132, 0.52)', 'rgba(10, 18, 43, 0.76)']}
          style={StyleSheet.absoluteFillObject}
        />
        <NativeMapView
          ref={mapRef}
          customMapStyle={isMapDetailMode ? [] : flightMapStyle}
          initialRegion={routeRegion}
          mapType="standard"
          onLayout={() => resetFlightRouteViewport(false)}
          onMapReady={() => resetFlightRouteViewport(false)}
          onPanDrag={() => setIsMapDetailMode(true)}
          onRegionChange={handleMapRegionChange}
          onRegionChangeComplete={handleMapRegionChangeComplete}
          pitchEnabled={false}
          provider={PROVIDER_GOOGLE}
          rotateEnabled={false}
          scrollEnabled
          showsCompass={false}
          showsScale={false}
          style={[
            liveModeV2Styles.routeGoogleMap,
            isMapDetailMode && liveModeV2Styles.routeGoogleMapDetail,
          ]}
          toolbarEnabled={false}
          zoomControlEnabled={false}
          zoomEnabled
        >
          <Polyline
            coordinates={displayRoute}
            lineCap="round"
            lineJoin="round"
            strokeColor="transparent"
            strokeWidth={3}
            zIndex={1}
          />
        </NativeMapView>
        <View
          pointerEvents="none"
          style={[liveModeV2Styles.routeMapTint, isMapDetailMode && liveModeV2Styles.routeMapTintDetail]}
        />
        <View
          pointerEvents="none"
          style={[liveModeV2Styles.routeGrid, isMapDetailMode && liveModeV2Styles.routeGridDetail]}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <View
              key={`v-${index}`}
              style={[liveModeV2Styles.routeGridLine, { left: `${index * 25}%` }]}
            />
          ))}
          {Array.from({ length: 4 }).map((_, index) => (
            <View
              key={`h-${index}`}
              style={[liveModeV2Styles.routeGridLineHorizontal, { top: `${index * 32}%` }]}
            />
          ))}
        </View>
        <View
          pointerEvents="none"
          style={[liveModeV2Styles.skylineBarOne, isMapDetailMode && liveModeV2Styles.routeDecorHidden]}
        />
        <View
          pointerEvents="none"
          style={[liveModeV2Styles.skylineBarTwo, isMapDetailMode && liveModeV2Styles.routeDecorHidden]}
        />
        <View
          pointerEvents="none"
          style={[liveModeV2Styles.skylineBarThree, isMapDetailMode && liveModeV2Styles.routeDecorHidden]}
        />
        <View
          pointerEvents="none"
          style={[liveModeV2Styles.skylineBarFour, isMapDetailMode && liveModeV2Styles.routeDecorHidden]}
        />
        <Svg
          height="100%"
          pointerEvents="none"
          style={liveModeV2Styles.routeCurveLayer}
          width="100%"
        >
          {remainingRoutePoints.length > 1 ? (
            <SvgPolyline
              fill="none"
              opacity="0.62"
              points={getRouteVisualPointString(remainingRoutePoints)}
              stroke="#5AA9FF"
              strokeDasharray="7 8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          ) : null}
          {completedRoutePoints.length > 1 ? (
            <SvgPolyline
              fill="none"
              points={getRouteVisualPointString(completedRoutePoints)}
              stroke="#5AA9FF"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          ) : null}
          {originScreenPoint ? (
            <>
              <Circle
                cx={originScreenPoint.x}
                cy={originScreenPoint.y}
                fill="#3B82F6"
                opacity="0.22"
                r="21"
              />
              <Circle
                cx={originScreenPoint.x}
                cy={originScreenPoint.y}
                fill="#3B82F6"
                opacity="0.28"
                r="13"
              />
              <Circle
                cx={originScreenPoint.x}
                cy={originScreenPoint.y}
                fill={colors.blue}
                r="6"
                stroke="#60A5FA"
                strokeWidth="2"
              />
              <Circle cx={originScreenPoint.x} cy={originScreenPoint.y} fill="#FFFFFF" r="2.6" />
            </>
          ) : null}
          {progressScreenPoint ? (
            <>
              <Circle
                cx={progressScreenPoint.x}
                cy={progressScreenPoint.y}
                fill="#60A5FA"
                opacity="0.18"
                r="17"
              />
              <Circle
                cx={progressScreenPoint.x}
                cy={progressScreenPoint.y}
                fill="#60A5FA"
                opacity="0.24"
                r="10"
              />
              <Circle
                cx={progressScreenPoint.x}
                cy={progressScreenPoint.y}
                fill="#60A5FA"
                r="4"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              <Circle
                cx={progressScreenPoint.x}
                cy={progressScreenPoint.y}
                fill="#FFFFFF"
                r="1.8"
              />
            </>
          ) : null}
          {destinationScreenPoint ? (
            <>
              <Circle
                cx={destinationScreenPoint.x}
                cy={destinationScreenPoint.y}
                fill="#4ADE80"
                opacity="0.2"
                r="21"
              />
              <Circle
                cx={destinationScreenPoint.x}
                cy={destinationScreenPoint.y}
                fill="#4ADE80"
                opacity="0.26"
                r="13"
              />
              <Circle
                cx={destinationScreenPoint.x}
                cy={destinationScreenPoint.y}
                fill="#22C55E"
                r="6"
                stroke="#77F2F6"
                strokeWidth="2"
              />
              <Circle
                cx={destinationScreenPoint.x}
                cy={destinationScreenPoint.y}
                fill="#FFFFFF"
                r="2.6"
              />
            </>
          ) : null}
        </Svg>
        <View
          pointerEvents="none"
          style={[
            liveModeV2Styles.routeOrigin,
            originScreenPoint
              ? {
                  left: Math.max(8, originScreenPoint.x - 6),
                  top: Math.max(8, originScreenPoint.y - 49),
                }
              : null,
          ]}
        >
          <Text style={liveModeV2Styles.routeCode}>{routeModel.originCode}</Text>
          <Text style={liveModeV2Styles.routeCity}>{routeModel.originLabel}</Text>
        </View>
        <View
          pointerEvents="none"
          style={[
            liveModeV2Styles.routeDestination,
            destinationScreenPoint
              ? {
                  left: Math.max(8, destinationScreenPoint.x - 70),
                  top: Math.max(8, destinationScreenPoint.y - 43),
                }
              : { right: 13, top: 24 },
          ]}
        >
          <Text style={liveModeV2Styles.routeCode}>{routeModel.destinationCode}</Text>
          <Text style={liveModeV2Styles.routeCity}>{routeModel.destinationLabel}</Text>
        </View>
        <Pressable
          accessibilityLabel="Recenter flight route north up"
          accessibilityRole="button"
          onPress={() => resetFlightRouteViewport(true)}
          style={({ pressed }) => [
            liveModeV2Styles.routeNavigateButton,
            pressed && styles.pressedFeedback,
          ]}
        >
          <NavigationIcon color="#FFFFFF" size={19} />
        </Pressable>
      </View>
      <View style={liveModeV2Styles.routeFooterBand}>
        <View style={liveModeV2Styles.routeFooter}>
          <View>
            <Text style={liveModeV2Styles.routeFooterCode}>{routeModel.originCode}</Text>
            <Text style={liveModeV2Styles.routeCity}>{routeModel.originLabel}</Text>
          </View>
          <View style={liveModeV2Styles.routeCompleteCopy}>
            <Text style={liveModeV2Styles.routeCompleteValue}>{routePercent}%</Text>
            <Text style={liveModeV2Styles.routeCity}>complete</Text>
          </View>
          <View style={liveModeV2Styles.routeFooterRight}>
            <Text style={liveModeV2Styles.routeFooterCode}>{routeModel.destinationCode}</Text>
            <Text style={liveModeV2Styles.routeCity}>{routeModel.destinationLabel}</Text>
          </View>
        </View>
        <View style={liveModeV2Styles.routeProgressTrack}>
          <LinearGradient
            colors={[colors.blue, '#60A5FA', colors.cyan]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={[liveModeV2Styles.routeProgressFill, { width: `${routePercent}%` }]}
          />
        </View>
      </View>
    </View>
  );
}

function formatLiveTime(value?: string | null, fallback = '') {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatLiveDate(value?: string | null, fallback = '') {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function isFlightDepartureInFuture(value?: string | null) {
  if (!value) {
    return false;
  }

  const departureDate = new Date(value);

  return !Number.isNaN(departureDate.getTime()) && departureDate.getTime() > Date.now();
}

function getTimeValue(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  const time = date.getTime();

  return Number.isNaN(time) ? null : time;
}

function getCurrentJourneySegment(
  mobilePayload?: MobileJourneyPayloadV1,
  journey?: JourneyItem,
  progress?: LiveProgress,
) {
  return (
    progress?.current_segment ||
    mobilePayload?.current_segment ||
    journey?.current_segment ||
    ''
  ).toLowerCase();
}

function getFlightTimelinePercent(
  flight: LiveFlightSummary,
  currentSegment?: string,
  progress?: LiveProgress,
) {
  const departureTime = getTimeValue(flight.departure_time);
  const arrivalTime = getTimeValue(flight.arrival_time);

  if (departureTime && arrivalTime && arrivalTime > departureTime) {
    const now = Date.now();

    if (now <= departureTime) {
      return 0;
    }

    if (now >= arrivalTime) {
      return 100;
    }

    return Math.round(((now - departureTime) / (arrivalTime - departureTime)) * 100);
  }

  const normalizedSegment = (currentSegment || '').toLowerCase();

  if (normalizedSegment === 'flight_to_hotel') {
    return Math.max(8, Math.min(92, Math.round(progress?.percent ?? 50)));
  }

  if (
    normalizedSegment === 'hotel_to_activities' ||
    normalizedSegment === 'return' ||
    normalizedSegment === 'completed'
  ) {
    return 100;
  }

  return 0;
}

function getLiveLogPercentForSegment(currentSegment?: string) {
  switch ((currentSegment || '').toLowerCase()) {
    case 'airport_to_flight':
      return 10;
    case 'flight_to_hotel':
      return 40;
    case 'hotel_to_activities':
      return 50;
    case 'return':
    case 'return_journey':
      return 70;
    case 'completed':
      return 100;
    case 'inspiration':
    case 'home_to_airport':
    default:
      return 0;
  }
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function formatMinutes(value: number) {
  const rounded = Math.max(0, Math.round(value));

  return `${rounded} min${rounded === 1 ? '' : 's'}`;
}

function calculateGeoDistanceKm(start: RouteCoordinate, end: RouteCoordinate) {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((end.latitude - start.latitude) * Math.PI) / 180;
  const longitudeDelta = ((end.longitude - start.longitude) * Math.PI) / 180;
  const startLatitude = (start.latitude * Math.PI) / 180;
  const endLatitude = (end.latitude * Math.PI) / 180;
  const halfChord =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord));
}

function getHomeToAirportTrafficContext(journey?: JourneyItem) {
  const context = getRecord(journey?.context);
  const metadata = getRecord(journey?.metadata);
  const homePayload = journey?.home_payload;
  const monitoring =
    getRecord(context?.monitoring) ||
    getRecord(metadata?.monitoring) ||
    getRecord(metadata?.monitoring_data);
  const traffic =
    getRecord(monitoring?.traffic) ||
    getRecord(context?.traffic) ||
    getRecord(metadata?.traffic);

  if (!traffic) {
    return null;
  }

  const departureCode =
    homePayload?.trip?.departure_code ||
    homePayload?.flight?.departure_airport_code ||
    getString(context?.airport_code) ||
    getString(getRecord(context?.flight_status)?.departure_airport);
  const currentLocation =
    getCoordinateFromRecord(context?.location) ||
    getCoordinateFromRecord(context?.monitoring_location);
  const departureAirport = getAirportCoordinate(
    departureCode,
    getContextCoordinate(journey?.context, 'departure_airport'),
  );
  const currentDuration =
    getNumber(traffic.current_duration_minutes) ||
    getNumber(traffic.currentDurationMinutes) ||
    getNumber(traffic.duration_minutes) ||
    getNumber(traffic.durationMinutes) ||
    getNumber(traffic.travel_duration_minutes) ||
    getNumber(traffic.travelDurationMinutes) ||
    getNumber(traffic.duration_in_traffic_minutes) ||
    getNumber(traffic.durationInTrafficMinutes) ||
    getNumber(traffic.eta_minutes) ||
    getNumber(traffic.etaMinutes) ||
    getNumber(metadata?.traffic_duration_minutes) ||
    getNumber(metadata?.traffic_current_duration_minutes) ||
    getNumber(metadata?.travel_duration_minutes);
  const delay =
    getNumber(traffic.delay_minutes) ||
    getNumber(traffic.delayMinutes) ||
    getNumber(traffic.eta_impact_minutes) ||
    getNumber(metadata?.traffic_delay_minutes);
  const distanceKm =
    getNumber(traffic.distance_km) ||
    getNumber(traffic.distanceKm) ||
    getNumber(metadata?.distance_km) ||
    getNumber(metadata?.home_to_airport_distance_km) ||
    (currentLocation && departureAirport
      ? calculateGeoDistanceKm(currentLocation, departureAirport)
      : undefined);
  const estimatedDuration = currentDuration || (distanceKm ? distanceKm * 1.2 + (delay || 0) : undefined);
  const conditions = getString(traffic.conditions);
  const formattedConditions = conditions ? formatRouteLabel(conditions) : '';

  return {
    estimatedDrive: estimatedDuration
      ? `Estimated drive: ${formatMinutes(estimatedDuration)}`
      : null,
    traffic: formattedConditions
      ? `Traffic: ${formattedConditions}${delay && delay > 0 ? `, +${formatMinutes(delay)}` : ''}`
      : delay && delay > 0
        ? `Traffic: +${formatMinutes(delay)}`
        : null,
  };
}

function getString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function getFirstObject(items: unknown[] | undefined): Record<string, unknown> | null {
  return Array.isArray(items) && typeof items[0] === 'object' && items[0] !== null
    ? (items[0] as Record<string, unknown>)
    : null;
}

function getLiveFlightSummary(
  mobilePayload?: MobileJourneyPayloadV1,
  journey?: JourneyItem,
): LiveFlightSummary {
  const liveFlight = mobilePayload?.live_mode.flight_summary;
  const payloadFlight = journey?.home_payload?.flight;
  const payloadTrip = journey?.home_payload?.trip;
  const contextFlight = journey?.context?.flight_status;
  const flightRecord = getFirstObject(journey?.booked_flights) || getFirstObject(journey?.saved_flights);

  const departureCode =
    liveFlight?.departure_code ||
    mobilePayload?.summary.departure_code ||
    payloadTrip?.departure_code ||
    payloadFlight?.departure_airport_code ||
    contextFlight?.departure_airport ||
    getString(flightRecord?.from_code) ||
    getString(flightRecord?.from) ||
    getString(flightRecord?.origin) ||
    'JFK';
  const arrivalCode =
    liveFlight?.arrival_code ||
    mobilePayload?.summary.arrival_code ||
    payloadTrip?.arrival_code ||
    payloadFlight?.arrival_airport_code ||
    contextFlight?.arrival_airport ||
    getString(flightRecord?.to_code) ||
    getString(flightRecord?.to) ||
    getString(flightRecord?.destination) ||
    getString(journey?.context?.planned_destination) ||
    'LAX';
  const airline =
    liveFlight?.airline ||
    payloadFlight?.airline ||
    contextFlight?.airline ||
    getString(flightRecord?.airline) ||
    'American Airlines';
  const flightNumber =
    liveFlight?.flight_number ||
    payloadFlight?.flight_number ||
    contextFlight?.flight_number ||
    getString(flightRecord?.flight_number) ||
    getString(flightRecord?.flightNumber) ||
    'AA2451';
  const departureTime =
    liveFlight?.departure_time ||
    payloadFlight?.departure_time ||
    contextFlight?.departure_time ||
    getString(flightRecord?.departure) ||
    getString(flightRecord?.departureTime) ||
    journey?.context?.planned_departure_date ||
    payloadTrip?.start_date ||
    null;
  const arrivalTime =
    liveFlight?.arrival_time ||
    payloadFlight?.arrival_time ||
    contextFlight?.arrival_time ||
    getString(flightRecord?.arrival) ||
    getString(flightRecord?.arrivalTime) ||
    payloadTrip?.end_date ||
    null;

  return {
    airline,
    arrival_code: arrivalCode,
    arrival_time: arrivalTime,
    departure_code: departureCode,
    departure_time: departureTime,
    flight_number: flightNumber,
    gate: liveFlight?.gate || payloadFlight?.gate || null,
    status_label:
      liveFlight?.status_label ||
      payloadFlight?.status_label ||
      contextFlight?.status ||
      (journey?.status === 'in_progress' ? 'In Progress' : 'On Time'),
    terminal: liveFlight?.terminal || payloadFlight?.terminal || null,
  };
}

function FlightSummaryCard({
  flight,
  progress,
}: {
  flight?: LiveFlightSummary;
  progress?: LiveProgress;
}) {
  const departureCode = flight?.departure_code || 'JFK';
  const arrivalCode = flight?.arrival_code || 'LAX';
  const statusLabel = flight?.status_label || 'On Time';
  const airlineName = flight?.airline || 'American Airlines';
  const flightNumber = flight?.flight_number || 'AA2451';

  return (
    <View style={liveModeV2Styles.card}>
      <View style={liveModeV2Styles.airportRow}>
        <View>
          <Text style={liveModeV2Styles.airportCode}>{departureCode}</Text>
          <Text style={liveModeV2Styles.cityText}>{progress?.from_label || 'Departure'}</Text>
        </View>
        <View style={liveModeV2Styles.airportRight}>
          <Text style={liveModeV2Styles.airportCode}>{arrivalCode}</Text>
          <Text style={liveModeV2Styles.cityText}>{progress?.to_label || 'Arrival'}</Text>
        </View>
      </View>

      <View style={liveModeV2Styles.flightTrack}>
        <LinearGradient
          colors={['#002AFF', '#77F2F6']}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          style={liveModeV2Styles.trackFill}
        />
        <View style={liveModeV2Styles.planeThumb}>
          <RouteTrackPlaneIcon color="#FFFFFF" size={11} />
        </View>
      </View>

      <View style={liveModeV2Styles.onTimeBadge}>
        <View style={liveModeV2Styles.onTimeDot} />
        <Text style={liveModeV2Styles.onTimeText}>{statusLabel}</Text>
      </View>

      <View style={liveModeV2Styles.divider} />

      <View style={liveModeV2Styles.airlineRow}>
        <View style={liveModeV2Styles.airlineLogoCircle}>
          <Image resizeMode="contain" source={airlineLogo} style={liveModeV2Styles.airlineLogo} />
        </View>
        <View style={liveModeV2Styles.airlineCopy}>
          <Text style={liveModeV2Styles.airlineName}>{airlineName}</Text>
          <Text style={liveModeV2Styles.airlineMeta}>{flightNumber}</Text>
        </View>
        <View style={liveModeV2Styles.cruiseCopy}>
          <Text style={liveModeV2Styles.smallMeta}>Cruising at 35,000 ft</Text>
          <Text style={liveModeV2Styles.smallMeta}>Speed 850 km/h</Text>
        </View>
        <View style={liveModeV2Styles.distanceCopy}>
          <Text style={liveModeV2Styles.smallMeta}>Distance</Text>
          <Text style={liveModeV2Styles.distanceText}>1,245 mi</Text>
        </View>
      </View>
    </View>
  );
}

function ArrivalCard({
  flight,
  progress,
  timelinePercent = 72,
}: {
  flight?: LiveFlightSummary;
  progress?: LiveProgress;
  timelinePercent?: number;
}) {
  const arrivalTime = formatLiveTime(flight?.arrival_time, '2:45 PM');
  const arrivalDate = formatLiveDate(flight?.arrival_time, 'Today, Mar 04');
  const departureTime = formatLiveTime(flight?.departure_time, '10:30 AM');
  const percent = Math.max(0, Math.min(100, Math.round(timelinePercent)));
  const planeLeftPercent = Math.max(0, Math.min(92, percent));

  return (
    <View style={[liveModeV2Styles.card, liveModeV2Styles.arrivalCard]}>
      <Text style={liveModeV2Styles.cardEyebrow}>Estimated Arrival</Text>
      <Text style={liveModeV2Styles.arrivalTime}>{arrivalTime}</Text>
      <Text style={liveModeV2Styles.arrivalDate}>{arrivalDate}</Text>
      <View style={liveModeV2Styles.etaPill}>
        <ClockIcon color="#FFFFFF" size={13} />
        <Text style={liveModeV2Styles.etaText}>ETA: {progress?.eta_text || '20 minutes'}</Text>
      </View>
      <View style={liveModeV2Styles.timelineLabels}>
        <Text style={liveModeV2Styles.timelineLabel}>{departureTime}</Text>
        <Text style={liveModeV2Styles.timelineLabel}>{arrivalTime}</Text>
      </View>
      <View style={liveModeV2Styles.arrivalTrack}>
        <LinearGradient
          colors={[colors.blue, '#60A5FA', colors.cyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[liveModeV2Styles.arrivalTrackFill, { width: `${percent}%` }]}
        />
        <View style={[liveModeV2Styles.arrivalPlane, { left: `${planeLeftPercent}%` }]}>
          <RouteTrackPlaneIcon color="#FFFFFF" size={16} />
        </View>
      </View>
      <View style={liveModeV2Styles.timelineLabels}>
        <Text style={liveModeV2Styles.timelineLabel}>Departed</Text>
        <Text style={liveModeV2Styles.timelineLabel}>Estimated</Text>
      </View>
    </View>
  );
}

function FlightProgressCard({
  flight,
  notDeparted = false,
  progress,
}: {
  flight?: LiveFlightSummary;
  notDeparted?: boolean;
  progress?: LiveProgress;
}) {
  const percent = notDeparted ? 0 : Math.max(0, Math.min(100, Math.round(progress?.percent ?? 70)));
  const planeLeftPercent = Math.max(0, Math.min(92, percent));
  const stops = [
    {
      code: flight?.departure_code || 'JFK',
      time: formatLiveTime(flight?.departure_time, '10:30 AM'),
      active: true,
    },
    {
      code: flight?.arrival_code || 'LAX',
      time: formatLiveTime(flight?.arrival_time, '2:45 PM'),
      active: false,
    },
  ];

  return (
    <View style={liveModeV2Styles.card}>
      <View style={liveModeV2Styles.progressHeader}>
        <Text style={liveModeV2Styles.sectionTitle}>Live Flight Progress</Text>
        <View style={[liveModeV2Styles.livePill, notDeparted && liveModeV2Styles.notDepartedPill]}>
          <View style={[liveModeV2Styles.livePillDot, notDeparted && liveModeV2Styles.notDepartedPillDot]} />
          <Text style={[liveModeV2Styles.livePillText, notDeparted && liveModeV2Styles.notDepartedPillText]}>
            {notDeparted ? 'NOT DEPARTED' : 'LIVE'}
          </Text>
        </View>
      </View>
      <View style={liveModeV2Styles.progressTrack}>
        <LinearGradient
          colors={[colors.blue, '#60A5FA', colors.cyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[liveModeV2Styles.progressTrackFill, { width: `${percent}%` }]}
        />
        <View style={[liveModeV2Styles.progressPlane, { left: `${planeLeftPercent}%` }]}>
          <RouteTrackPlaneIcon color="#FFFFFF" size={11} />
        </View>
      </View>
      <Text style={liveModeV2Styles.progressText}>
        {notDeparted ? 'Not departed' : `${percent}% Completed`}
      </Text>
      <View style={liveModeV2Styles.stopRow}>
        {stops.map((stop) => (
          <View key={stop.code} style={liveModeV2Styles.stopCard}>
            <View style={[liveModeV2Styles.stopIcon, !stop.active && liveModeV2Styles.stopIconAlt]}>
              <RouteTrackPlaneIcon
                color="#FFFFFF"
                rotationDegrees={stop.code === 'JFK' ? -45 : 135}
                size={15}
              />
            </View>
            <View>
              <Text style={liveModeV2Styles.stopCode}>{stop.code}</Text>
              <Text style={liveModeV2Styles.stopTime}>{stop.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function AlertCard({ alerts }: { alerts?: LiveAlert[] }) {
  const alert = alerts?.[0];

  return (
    <View style={liveModeV2Styles.alertCard}>
      <View style={liveModeV2Styles.alertIcon}>
        <BellIcon color="#00C97B" size={18} />
      </View>
      <View style={liveModeV2Styles.alertCopy}>
        <Text style={liveModeV2Styles.alertTitle}>{alert?.title || 'Stay updated'}</Text>
        <Text style={liveModeV2Styles.alertText}>
          {alert?.message || "We'll notify you about any changes to your journey."}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Enable journey alerts"
        accessibilityRole="button"
        style={({ pressed }) => [liveModeV2Styles.alertButton, pressed && styles.pressedFeedback]}
      >
        <Text style={liveModeV2Styles.alertButtonText}>Enable Alerts</Text>
      </Pressable>
    </View>
  );
}

function LiveLogCard({
  currentSegment,
  journey,
}: {
  currentSegment?: string;
  journey?: JourneyItem;
}) {
  const segmentProgressPercent = getLiveLogPercentForSegment(currentSegment);
  const [progressPercent, setProgressPercent] = useState(segmentProgressPercent);
  const progressTrackWidth = useRef(1);

  const updateProgressFromEvent = useCallback((event: GestureResponderEvent) => {
    const nextValue = Math.max(
      0,
      Math.min(100, Math.round((event.nativeEvent.locationX / progressTrackWidth.current) * 100)),
    );

    setProgressPercent(nextValue);
  }, []);

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

  useEffect(() => {
    setProgressPercent(segmentProgressPercent);
  }, [segmentProgressPercent]);

  const clampedPercent = Math.max(0, Math.min(100, progressPercent));
  const liveLogState = getLiveLogState(clampedPercent);
  const homeToAirportTraffic = useMemo(
    () => getHomeToAirportTrafficContext(journey),
    [journey],
  );
  const liveLogRows = useMemo(() => {
    if (!homeToAirportTraffic || liveLogState.percent !== 0) {
      return liveLogState.rows;
    }

    return liveLogState.rows.map((row) => {
      if (row.title === 'Leaving home' && homeToAirportTraffic.estimatedDrive) {
        return { ...row, meta: homeToAirportTraffic.estimatedDrive };
      }

      if (row.title === 'On the road' && homeToAirportTraffic.traffic) {
        return { ...row, meta: homeToAirportTraffic.traffic };
      }

      return row;
    });
  }, [homeToAirportTraffic, liveLogState]);

  return (
    <View style={liveModeV2Styles.logCard}>
      <View style={liveModeV2Styles.liveBadge}>
        <View style={liveModeV2Styles.liveBadgeDot} />
        <Text style={liveModeV2Styles.liveBadgeText}>LIVE</Text>
      </View>

      <View style={liveModeV2Styles.logSegmentRow}>
        <View style={liveModeV2Styles.logSegmentLabel}>
          <LiveLogIconView icon={liveLogState.from.icon} />
          <Text style={liveModeV2Styles.logSegmentText}>{liveLogState.from.label}</Text>
        </View>
        <View
          accessibilityLabel={`Live log progress ${clampedPercent}%`}
          accessibilityRole="adjustable"
          onLayout={handleProgressLayout}
          style={liveModeV2Styles.logSegmentTrack}
          {...progressPanResponder.panHandlers}
        >
          <Text
            style={[
              liveModeV2Styles.logPercent,
              { left: `${Math.max(0, Math.min(88, clampedPercent))}%` },
            ]}
          >
            {clampedPercent}%
          </Text>
          <LinearGradient
            colors={[colors.green, '#004031']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={liveModeV2Styles.logSegmentFill}
          />
          <View
            style={[
              liveModeV2Styles.logKnob,
              { left: `${Math.max(0, Math.min(92, clampedPercent))}%` },
            ]}
          />
        </View>
        <View style={liveModeV2Styles.logSegmentLabel}>
          <LiveLogIconView icon={liveLogState.to.icon} />
          <Text style={liveModeV2Styles.logSegmentText}>{liveLogState.to.label}</Text>
        </View>
      </View>

      <View style={liveModeV2Styles.logRows}>
        <View style={liveModeV2Styles.logDivider} />
        {liveLogRows.map((row) => (
          <LiveLogRow key={`${liveLogState.percent}-${row.title}`} row={row} />
        ))}
      </View>
    </View>
  );
}

function LiveLogRow({ row }: { row: LiveLogRowItem }) {
  if (row.state === 'active') {
    return (
      <View style={liveModeV2Styles.activeLogCard}>
        <View style={liveModeV2Styles.activeLogGlyph}>
          <Image
            resizeMode="contain"
            source={securityCheckInIcon}
            style={liveModeV2Styles.activeLogIcon}
          />
        </View>
        <Text style={liveModeV2Styles.activeLogTitle}>{row.title}</Text>
        <View style={liveModeV2Styles.activeLogMetaGroup}>
          <Text style={liveModeV2Styles.activeLogMeta}>{row.meta}</Text>
          {row.meta === 'Low traffic at counter' ? (
            <View style={liveModeV2Styles.trafficBars}>
              <LinearGradient colors={['#51FF00', '#FFE500']} style={liveModeV2Styles.trafficBar} />
              <LinearGradient
                colors={['#FFE600', '#FF7700']}
                style={[liveModeV2Styles.trafficBar, liveModeV2Styles.trafficBarFaded]}
              />
              <LinearGradient
                colors={['#FF7700', '#DF1A21']}
                style={[liveModeV2Styles.trafficBar, liveModeV2Styles.trafficBarFaded]}
              />
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  if (row.state === 'passed') {
    return (
      <View style={liveModeV2Styles.completedLogRow}>
        <View style={liveModeV2Styles.logTaskSide}>
          <CheckIcon color={colors.green} size={15} />
          <Text style={[liveModeV2Styles.logTaskText, liveModeV2Styles.completedLogText]}>
            {row.title}
          </Text>
        </View>
        <View style={liveModeV2Styles.logMetaSide}>
          <CheckIcon color={colors.green} size={15} />
          <Text style={[liveModeV2Styles.logMetaText, liveModeV2Styles.completedLogText]}>
            {row.meta}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={liveModeV2Styles.futureLogRow}>
      <View style={liveModeV2Styles.logTaskSide}>
        <ClockIcon color="rgba(0,0,0,0.4)" size={15} />
        <Text style={liveModeV2Styles.futureLogText}>{row.title}</Text>
      </View>
      <View style={liveModeV2Styles.logMetaSide}>
        <ClockIcon color="rgba(0,0,0,0.4)" size={15} />
        <Text style={liveModeV2Styles.futureLogMeta}>{row.meta}</Text>
      </View>
    </View>
  );
}

function getLiveLogState(progressPercent: number) {
  return liveLogStates.reduce((currentState, state) => {
    if (progressPercent >= state.percent) {
      return state;
    }

    return currentState;
  }, liveLogStates[0]);
}

function LiveLogIconView({ icon }: { icon: LiveLogIcon }) {
  if (icon === 'home') {
    return <HomeIcon color={colors.ink} size={16} />;
  }

  if (icon === 'flight') {
    return <FlowPlaneIcon color={colors.ink} size={16} />;
  }

  if (icon === 'stays') {
    return <StaysIcon color={colors.ink} size={16} />;
  }

  if (icon === 'activities') {
    return <ActivitiesIcon color={colors.ink} size={16} />;
  }

  return <AirportIcon color={colors.ink} size={16} />;
}

function RouteTrackPlaneIcon({
  color,
  rotationDegrees = 0,
  size,
}: {
  color: string;
  rotationDegrees?: number;
  size: number;
}) {
  return (
    <Svg height={size} viewBox="0 0 20 20" width={size}>
      <Path
        d="M14.8333 16L13.3333 9.16667L16.25 6.25C17.5 5 17.9167 3.33333 17.5 2.5C16.6667 2.08333 15 2.5 13.75 3.75L10.8333 6.66667L4 5.16667C3.58333 5.08333 3.25 5.25 3.08333 5.58333L2.83333 6C2.66667 6.41667 2.75 6.83333 3.08333 7.08333L7.5 10L5.83333 12.5H3.33333L2.5 13.3333L5 15L6.66667 17.5L7.5 16.6667V14.1667L10 12.5L12.9167 16.9167C13.1667 17.25 13.5833 17.3333 14 17.1667L14.4167 17C14.75 16.75 14.9167 16.4167 14.8333 16Z"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        transform={`rotate(${45 + rotationDegrees} 10 10)`}
      />
    </Svg>
  );
}

function ClockIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx="12" cy="12" fill="none" r="8" stroke={color} strokeWidth="2" />
      <Path d="M12 7v5l3 2" fill="none" stroke={color} strokeLinecap="round" strokeWidth="2" />
    </Svg>
  );
}

function CheckIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx="12" cy="12" fill="none" r="8" stroke={color} strokeWidth="2" />
      <Path
        d="m8 12 2.5 2.5L16 9"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

function AirportIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 16 16" width={size}>
      <Path
        d="M14 13.3333H15.3333V14.6666H0.666656V13.3333H1.99999V1.99998C1.99999 1.63179 2.29847 1.33331 2.66666 1.33331H13.3333C13.7015 1.33331 14 1.63179 14 1.99998V13.3333ZM12.6667 13.3333V2.66665H3.33332V13.3333H12.6667ZM5.33332 7.33331H7.33332V8.66665H5.33332V7.33331ZM5.33332 4.66665H7.33332V5.99998H5.33332V4.66665ZM5.33332 9.99998H7.33332V11.3333H5.33332V9.99998ZM8.66666 9.99998H10.6667V11.3333H8.66666V9.99998ZM8.66666 7.33331H10.6667V8.66665H8.66666V7.33331ZM8.66666 4.66665H10.6667V5.99998H8.66666V4.66665Z"
        fill={color}
      />
    </Svg>
  );
}

function HomeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 16 16" width={size}>
      <Path
        d="M14 14.0001C14 14.4143 13.6642 14.7501 13.25 14.7501H2.75C2.33579 14.7501 2 14.4143 2 14.0001V7.25007H-0.25L7.49547 0.208713C7.78152 -0.0513419 8.21848 -0.0513419 8.50453 0.208713L16.25 7.25007H14V14.0001ZM12.5 13.2501V5.86818L8 1.77726L3.5 5.86818V13.2501H12.5ZM8 11.7501L5.48093 9.23097C4.82192 8.57202 4.82192 7.5035 5.48093 6.84455C6.13994 6.18551 7.20837 6.18551 7.8674 6.84455L8 6.97707L8.1326 6.84455C8.79163 6.18551 9.86007 6.18551 10.5191 6.84455C11.1781 7.5035 11.1781 8.57202 10.5191 9.23097L8 11.7501Z"
        fill={color}
      />
    </Svg>
  );
}

function StaysIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 16 16" width={size}>
      <Path
        d="M13.25 13.2499V6.34897L8 2.20747L2.75 6.34897V13.2499H13.25ZM14.75 13.9999C14.75 14.4142 14.4142 14.7499 14 14.7499H2C1.58579 14.7499 1.25 14.4142 1.25 13.9999V5.98534C1.25 5.75571 1.3552 5.53873 1.53549 5.3965L7.53553 0.663359C7.80785 0.448477 8.19215 0.448477 8.46447 0.663359L14.4645 5.3965C14.6448 5.53873 14.75 5.75571 14.75 5.98534V13.9999ZM4.25 7.99993H5.75C5.75 9.2426 6.75733 10.2499 8 10.2499C9.24267 10.2499 10.25 9.2426 10.25 7.99993H11.75C11.75 10.071 10.071 11.7499 8 11.7499C5.92894 11.7499 4.25 10.071 4.25 7.99993Z"
        fill={color}
      />
    </Svg>
  );
}

function ActivitiesIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 16 16" width={size}>
      <Path
        d="M14.1819 2.56802C15.879 4.26854 15.9372 6.97775 14.3589 8.74475L7.99992 15.1138L1.64103 8.74475C0.0627862 6.97775 0.121781 4.26426 1.81802 2.56802C3.51618 0.869863 6.23389 0.812653 8.00075 2.3964C9.7625 0.815001 12.485 0.8675 14.1819 2.56802ZM2.87868 3.62868C1.76137 4.74598 1.70528 6.53548 2.73495 7.7174L7.99992 12.9907L13.2651 7.7174C14.2951 6.53503 14.2392 4.74894 13.1202 3.62758C12.0048 2.50984 10.2093 2.45605 9.03072 3.48782L5.87868 6.64018L4.81802 5.57948L6.9365 3.4595L6.87515 3.40776C5.69409 2.45898 3.96741 2.53995 2.87868 3.62868Z"
        fill={color}
      />
    </Svg>
  );
}

function FlowPlaneIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 18 18" width={size}>
      <Path
        d="M13.35 14.4L12 8.25L14.625 5.625C15.75 4.5 16.125 3 15.75 2.25C15 1.875 13.5 2.25 12.375 3.375L9.75 6L3.6 4.65C3.225 4.575 2.925 4.725 2.775 5.025L2.55 5.4C2.4 5.775 2.475 6.15 2.775 6.375L6.75 9L5.25 11.25H3L2.25 12L4.5 13.5L6 15.75L6.75 15V12.75L9 11.25L11.625 15.225C11.85 15.525 12.225 15.6 12.6 15.45L12.975 15.3C13.275 15.075 13.425 14.775 13.35 14.4Z"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.35}
      />
    </Svg>
  );
}

function BellIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 21a2.7 2.7 0 0 0 2.6-2h-5.2A2.7 2.7 0 0 0 12 21Zm7-5-1.8-2.2V10a5.2 5.2 0 0 0-4-5.1V4a1.2 1.2 0 0 0-2.4 0v.9a5.2 5.2 0 0 0-4 5.1v3.8L5 16v1h14v-1Z"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function FlightStatIcon({ name }: { name: (typeof flightStats)[number]['icon'] }) {
  if (name === 'altitude') {
    return <BarsIcon color="#2E7DFF" size={17} />;
  }

  if (name === 'speed') {
    return <GaugeIcon color="#2E7DFF" size={17} />;
  }

  if (name === 'wind') {
    return <WindIcon color="#2E7DFF" size={17} />;
  }

  return <ThermometerIcon color="#2E7DFF" size={17} />;
}

function BarsIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M6 19V9M12 19V5M18 19v-7" stroke={color} strokeLinecap="round" strokeWidth="2" />
    </Svg>
  );
}

function GaugeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M5 15a7 7 0 0 1 14 0M12 15l4-4"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

function WindIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M4 8h10a2 2 0 1 0-2-2M4 12h15M4 16h11a2 2 0 1 1-2 2"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

function ThermometerIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

function SearchIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx="11" cy="11" fill="none" r="6" stroke={color} strokeWidth="2" />
      <Path d="m16 16 4 4" stroke={color} strokeLinecap="round" strokeWidth="2" />
    </Svg>
  );
}

function PinIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 21s6-5.3 6-11a6 6 0 0 0-12 0c0 5.7 6 11 6 11Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      <Circle cx="12" cy="10" fill="none" r="2" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

function NavigationIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="m20 4-7 16-2-7-7-2 16-7Z"
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

const liveModeV2Styles = StyleSheet.create({
  screen: {
    alignSelf: 'stretch',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    minHeight: 1210,
    overflow: 'hidden',
    paddingBottom: 42,
    paddingHorizontal: 12,
    paddingTop: 54,
    width: '100%',
  },
  modeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 18,
  },
  liveTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  liveDot: {
    backgroundColor: '#22C55E',
    borderRadius: 5,
    height: 9,
    marginRight: 7,
    width: 9,
  },
  liveTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  liveSubtitle: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
    marginTop: 3,
  },
  normalModeButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    flexDirection: 'row',
    height: 36,
    paddingLeft: 12,
    paddingRight: 16,
  },
  normalModeAction: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    paddingLeft: 6,
  },
  switchButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
  },
  switchTrack: {
    alignItems: 'center',
    backgroundColor: '#D1D5DB',
    borderRadius: 999,
    flexDirection: 'row',
    height: 14,
    justifyContent: 'flex-start',
    paddingHorizontal: 1.75,
    width: 26,
  },
  switchTrackActive: {
    backgroundColor: colors.blue,
    justifyContent: 'flex-end',
  },
  switchTrackConnected: {
    backgroundColor: colors.green,
    justifyContent: 'flex-end',
  },
  switchKnob: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 11,
    width: 11,
  },
  switchKnobActive: {
    backgroundColor: '#FFFFFF',
  },
  normalModeText: {
    color: colors.blue,
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#171B39',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  airportRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  airportRight: {
    alignItems: 'flex-end',
  },
  airportCode: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 39,
    fontWeight: '700',
    lineHeight: 45,
  },
  cityText: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
  },
  flightTrack: {
    backgroundColor: '#233058',
    borderRadius: 999,
    height: 4,
    left: 92,
    position: 'absolute',
    right: 96,
    top: 56,
  },
  trackFill: {
    backgroundColor: colors.blue,
    borderRadius: 999,
    height: 4,
    width: '70%',
  },
  planeThumb: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    elevation: 8,
    height: 23,
    justifyContent: 'center',
    left: '62%',
    position: 'absolute',
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    top: -10,
    width: 23,
  },
  onTimeBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 201, 123, 0.14)',
    borderColor: 'rgba(0, 201, 123, 0.48)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    height: 23,
    paddingHorizontal: 10,
    position: 'absolute',
    top: 17,
  },
  onTimeDot: {
    backgroundColor: '#00C97B',
    borderRadius: 3,
    height: 6,
    marginRight: 5,
    width: 6,
  },
  onTimeText: {
    color: '#00C97B',
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    height: 1,
    marginTop: 12,
  },
  airlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    paddingTop: 12,
  },
  airlineLogoCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  airlineLogo: {
    height: 21,
    width: 21,
  },
  airlineCopy: {
    flex: 1,
    minWidth: 78,
  },
  airlineName: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  airlineMeta: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 9,
    fontWeight: '400',
    lineHeight: 12,
  },
  cruiseCopy: {
    alignItems: 'center',
    width: 92,
  },
  distanceCopy: {
    alignItems: 'flex-end',
    width: 58,
  },
  smallMeta: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 9,
    fontWeight: '400',
    lineHeight: 12,
  },
  distanceText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  arrivalCard: {
    minHeight: 202,
  },
  cardEyebrow: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
  },
  arrivalTime: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 45,
    fontWeight: '700',
    lineHeight: 54,
    marginTop: 2,
  },
  arrivalDate: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
  },
  etaPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#26304D',
    borderRadius: 13,
    flexDirection: 'row',
    height: 28,
    marginTop: 13,
    paddingHorizontal: 11,
  },
  etaText: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
    marginLeft: 6,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  timelineLabel: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 13,
  },
  arrivalTrack: {
    backgroundColor: '#273050',
    borderRadius: 999,
    height: 4,
    marginTop: 8,
    position: 'relative',
  },
  arrivalTrackFill: {
    borderRadius: 999,
    height: 4,
    width: '72%',
  },
  arrivalPlane: {
    alignItems: 'center',
    borderRadius: 9,
    height: 22,
    justifyContent: 'center',
    left: '70.5%',
    position: 'absolute',
    top: -9,
    width: 22,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  livePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(251,44,54,0.14)',
    borderColor: 'rgba(251,44,54,0.40)',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 24,
    paddingHorizontal: 10,
  },
  livePillDot: {
    backgroundColor: '#FB2C36',
    borderRadius: 3,
    height: 5,
    marginRight: 6,
    width: 5,
  },
  livePillText: {
    color: '#FB2C36',
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  notDepartedPill: {
    backgroundColor: 'rgba(148,163,184,0.16)',
    borderColor: 'rgba(148,163,184,0.45)',
  },
  notDepartedPillDot: {
    backgroundColor: '#94A3B8',
  },
  notDepartedPillText: {
    color: '#CBD5E1',
  },
  progressTrack: {
    backgroundColor: '#273050',
    borderRadius: 999,
    height: 3,
    marginTop: 17,
    position: 'relative',
  },
  progressTrackFill: {
    borderRadius: 999,
    height: 3,
  },
  progressPlane: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    elevation: 8,
    height: 23,
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    top: -10,
    width: 23,
  },
  progressText: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  stopRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  stopCard: {
    alignItems: 'center',
    backgroundColor: '#242842',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    height: 58,
    paddingHorizontal: 12,
  },
  stopIcon: {
    alignItems: 'center',
    backgroundColor: '#1F4D85',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  stopIconAlt: {
    backgroundColor: '#245F68',
  },
  stopCode: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  stopTime: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 17,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#171B39',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    height: 67,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 6,
    textAlign: 'center',
  },
  statLabel: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 9,
    fontWeight: '400',
    lineHeight: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#0A1029',
    borderColor: 'rgba(96,165,250,0.28)',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 39,
    marginBottom: 18,
    paddingHorizontal: 13,
  },
  searchText: {
    color: '#8892AA',
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    marginLeft: 9,
  },
  routeCard: {
    backgroundColor: '#0D1635',
    borderColor: 'rgba(96,165,250,0.28)',
    borderRadius: 16,
    borderWidth: 1,
    height: 176,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  routeMapGlass: {
    backgroundColor: 'rgba(16, 33, 64, 0.56)',
    borderBottomColor: 'rgba(96,165,250,0.12)',
    borderBottomWidth: 1,
    height: 116,
    overflow: 'hidden',
    position: 'relative',
  },
  routeGoogleMap: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.38,
  },
  routeGoogleMapDetail: {
    opacity: 0.92,
  },
  routeMapTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 14, 30, 0.48)',
  },
  routeMapTintDetail: {
    backgroundColor: 'rgba(8, 14, 30, 0.08)',
  },
  routeGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.34,
  },
  routeGridDetail: {
    opacity: 0.08,
  },
  routeGridLine: {
    backgroundColor: '#2A4671',
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 1,
  },
  routeGridLineHorizontal: {
    backgroundColor: '#2A4671',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  skylineBarOne: {
    backgroundColor: 'rgba(96,165,250,0.09)',
    height: 48,
    left: 34,
    position: 'absolute',
    top: 16,
    width: 16,
  },
  skylineBarTwo: {
    backgroundColor: 'rgba(96,165,250,0.10)',
    height: 57,
    left: 65,
    position: 'absolute',
    top: 9,
    width: 42,
  },
  skylineBarThree: {
    backgroundColor: 'rgba(96,165,250,0.09)',
    height: 41,
    left: 143,
    position: 'absolute',
    top: 21,
    width: 10,
  },
  skylineBarFour: {
    backgroundColor: 'rgba(96,165,250,0.08)',
    height: 52,
    right: 31,
    position: 'absolute',
    top: 18,
    width: 14,
  },
  routeDecorHidden: {
    opacity: 0,
  },
  routeCurveLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  routeOrigin: {
    left: 13,
    position: 'absolute',
    top: 24,
    zIndex: 45,
  },
  routeDestination: {
    alignItems: 'flex-end',
    position: 'absolute',
    width: 70,
    zIndex: 45,
  },
  routeCode: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 10,
  },
  routeCity: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 7,
    fontWeight: '400',
    lineHeight: 9,
  },
  routeNavigateButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 13, 31, 0.72)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    zIndex: 50,
  },
  routeFooterBand: {
    backgroundColor: '#0B1225',
    flex: 1,
    paddingHorizontal: 17,
    paddingTop: 13,
  },
  routeFooter: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeFooterCode: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  routeFooterRight: {
    alignItems: 'flex-end',
  },
  routeCompleteCopy: {
    alignItems: 'center',
  },
  routeCompleteValue: {
    color: '#60A5FA',
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  routeProgressTrack: {
    backgroundColor: '#172544',
    borderRadius: 999,
    height: 3,
    marginTop: 10,
  },
  routeProgressFill: {
    borderRadius: 999,
    height: 3,
  },
  alertCard: {
    alignItems: 'center',
    backgroundColor: '#0D1635',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 85,
    marginBottom: 18,
    marginTop: 8,
    paddingHorizontal: 17,
    paddingVertical: 16,
  },
  alertIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,201,123,0.12)',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  alertCopy: {
    flex: 1,
    minWidth: 0,
  },
  alertTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  alertText: {
    color: '#7B8DB8',
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  },
  alertButton: {
    alignItems: 'center',
    backgroundColor: '#00C97B',
    borderRadius: 14,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    minHeight: 500,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  liveBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(217,217,217,0.57)',
    borderRadius: 4,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  liveBadgeDot: {
    backgroundColor: '#DF1A21',
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  notDepartedBadge: {
    backgroundColor: 'rgba(148,163,184,0.30)',
  },
  notDepartedBadgeDot: {
    backgroundColor: '#94A3B8',
  },
  liveBadgeText: {
    color: colors.ink,
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  logSegmentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  logSegmentLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 5,
    minWidth: 0,
  },
  logSegmentText: {
    color: colors.ink,
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  logSegmentTrack: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
    marginHorizontal: 6,
    maxWidth: 134,
    minWidth: 64,
  },
  logSegmentFill: {
    borderRadius: 999,
    height: 4,
    width: '100%',
  },
  logKnob: {
    backgroundColor: colors.green,
    borderRadius: 7,
    height: 14,
    left: 10,
    position: 'absolute',
    top: 5,
    width: 14,
  },
  logPercent: {
    color: colors.ink,
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    left: 7,
    lineHeight: 20,
    position: 'absolute',
    top: -16,
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
  completedLogRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  logTaskSide: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    paddingRight: 8,
  },
  logTaskText: {
    color: colors.green,
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
  },
  logMetaSide: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 10,
    width: '45%',
  },
  logMetaText: {
    color: colors.green,
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 11,
    lineHeight: 14,
  },
  completedLogText: {
    textDecorationLine: 'line-through',
  },
  activeLogCard: {
    backgroundColor: colors.blue,
    borderRadius: 20,
    height: 59,
    marginTop: 18,
    position: 'relative',
  },
  activeLogGlyph: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    left: 15,
    position: 'absolute',
    top: 16,
    width: 28,
  },
  activeLogIcon: {
    height: 28,
    width: 28,
  },
  activeLogTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    left: 56,
    lineHeight: 17,
    position: 'absolute',
    top: 14,
    width: 112,
  },
  activeLogMetaGroup: {
    left: 184,
    position: 'absolute',
    top: 9,
    width: 112,
  },
  activeLogMeta: {
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 20,
  },
  trafficBars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
    paddingLeft: 1,
  },
  trafficBar: {
    borderRadius: 999,
    height: 4,
    width: 13,
  },
  trafficBarFaded: {
    opacity: 0.5,
  },
  futureLogRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
    minHeight: 20,
  },
  futureLogText: {
    color: 'rgba(0,0,0,0.40)',
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
  },
  futureLogMeta: {
    color: 'rgba(0,0,0,0.40)',
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 11,
    lineHeight: 14,
  },
});
