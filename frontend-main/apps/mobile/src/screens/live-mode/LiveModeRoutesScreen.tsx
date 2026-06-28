import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import NativeMapView, { Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Svg, { Circle, Path, Polyline as SvgPolyline } from 'react-native-svg';

import TrainRouteIcon from '../../../assets/icons/livemode-routes/TrainIcon.svg';
import WalkRouteIcon from '../../../assets/icons/livemode-routes/WalkIcon.svg';
import { RightArrowIcon } from '../../assets/icons';
import { ScreenFrame } from '../../components/layout/ScreenFrame';
import { colors } from '../../constants/colors';
import { styles } from '../../theme/styles';
import type {
  LiveAlert,
  LiveDirectionStep,
  LiveRouteLeg,
  LiveStat,
  MobileJourneyPayloadV1,
} from '../../api/notifications';
import { fetchNodeWithFallback } from '../../api/client';

type LiveModeRoutesScreenProps = {
  onBack: () => void;
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
};

type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

type RouteVisualPoint = {
  x: number;
  y: number;
};

type MapScreenPoint = {
  x: number;
  y: number;
};

const summaryStats = [
  { icon: 'clock', label: 'Estimated Arrival', value: '11:44 AM', helper: 'On time', accent: true },
  { icon: 'walk', label: 'Walk Progress', value: '0%', helper: 'Just started' },
  { icon: 'send', label: 'Distance Remaining', value: '0.6 mi', helper: '~12 min' },
] as const;

const walkStats = [
  { value: '12 min', label: 'Walk Time' },
  { value: '0.6 mi', label: 'Distance' },
  { value: '1,250', label: 'Est. Steps' },
  { value: '65', label: 'Cal Burn' },
] as const;

const directionSteps = [
  {
    distance: '200 ft',
    helper: 'Follow signs toward exit',
    icon: 'walk',
    primary: true,
    title: 'Exit Union Station',
  },
  {
    distance: '0.2 mi',
    icon: 'turn',
    title: 'Turn left onto N Alameda St',
  },
  {
    distance: '0.5 mi',
    icon: 'straight',
    title: 'Continue straight on N Alameda St',
  },
] as const;

const mapGridVerticalPositions = [38, 82, 126, 170, 214, 258, 302, 346];
const mapGridHorizontalPositions = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];
const walkRoutePath = 'M80 193 C83 142 124 96 178 73 C219 56 260 48 310 50';
const showOriginalSvgRoute = false;

const unionStationCoordinate: RouteCoordinate = {
  latitude: 34.0562,
  longitude: -118.2365,
};

const olveraStreetCoordinate: RouteCoordinate = {
  latitude: 34.0576,
  longitude: -118.237,
};

const walkRouteCoordinates: RouteCoordinate[] = [
  unionStationCoordinate,
  {
    latitude: 34.05654,
    longitude: -118.23667,
  },
  {
    latitude: 34.05693,
    longitude: -118.23682,
  },
  {
    latitude: 34.05727,
    longitude: -118.23693,
  },
  olveraStreetCoordinate,
];

const walkMapRegion: Region = {
  latitude: (unionStationCoordinate.latitude + olveraStreetCoordinate.latitude) / 2,
  latitudeDelta: 0.006,
  longitude: (unionStationCoordinate.longitude + olveraStreetCoordinate.longitude) / 2,
  longitudeDelta: 0.006,
};

const walkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0B1725' }] },
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#172D44' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0F2135' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#17314A' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#203B58' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#13283E' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#07111F' }] },
];

const walkRouteVisualPoints = createWalkRouteVisualPoints();

export function LiveModeRoutesScreen({
  onBack,
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
}: LiveModeRoutesScreenProps) {
  const [walkProgress, setWalkProgress] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const liveRoutes = mobilePayload?.live_routes;

  useEffect(() => {
    if (!isWalking) {
      return undefined;
    }

    const animationInterval = setInterval(() => {
      setWalkProgress((currentProgress) => {
        const nextProgress = Math.min(1, currentProgress + 0.008);

        if (nextProgress >= 1) {
          setIsWalking(false);
        }

        return nextProgress;
      });
    }, 90);

    return () => clearInterval(animationInterval);
  }, [isWalking]);

  const handleStartWalking = () => {
    setWalkProgress(0);
    setIsWalking(true);
  };

  return (
    <ScreenFrame
      footerSource="liveModeRoutes"
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
      <LinearGradient colors={['#07091E', '#0B1030', '#080B22']} style={routeStyles.screen}>
        <View style={routeStyles.headerRow}>
          <Pressable
            accessibilityLabel="Back to live mode"
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [routeStyles.backButton, pressed && styles.pressedFeedback]}
          >
            <RightArrowIcon style={routeStyles.backIcon} />
          </Pressable>
          <View style={routeStyles.modeHeader}>
            <View style={routeStyles.liveTitleRow}>
              <View style={routeStyles.liveDot} />
              <Text style={routeStyles.liveTitle}>Live Mode</Text>
            </View>
            <Text style={routeStyles.liveSubtitle}>Real-time flight updates</Text>
          </View>
          <Pressable
            accessibilityLabel="Switch to normal mode"
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              routeStyles.normalModeButton,
              pressed && styles.pressedFeedback,
            ]}
          >
            <View style={routeStyles.switchTrack}>
              <View style={routeStyles.switchKnob} />
            </View>
            <Text style={routeStyles.normalModeText}>Switch to Normal Mode</Text>
          </Pressable>
        </View>

        <ArrivalStationCard
          isWalking={isWalking}
          legs={liveRoutes?.legs}
          onStartWalking={handleStartWalking}
        />
        <SummaryStatsCard walkProgress={walkProgress} />
        <RouteMapPanel walkProgress={walkProgress} />
        <DirectionsCard directions={liveRoutes?.directions} />
        <WalkStatsCard stats={liveRoutes?.stats} />
        <AlertCard alerts={liveRoutes?.alerts} />
      </LinearGradient>
    </ScreenFrame>
  );
}

function ArrivalStationCard({
  isWalking,
  legs,
  onStartWalking,
}: {
  isWalking: boolean;
  legs?: LiveRouteLeg[];
  onStartWalking: () => void;
}) {
  const activeLeg = legs?.[0];
  const nextLeg = legs?.[1] || activeLeg;

  return (
    <View style={routeStyles.arrivalCard}>
      <Text style={routeStyles.successText}>{"You've arrived!"}</Text>
      <Text style={routeStyles.stationTitle}>
        {activeLeg?.origin?.name || activeLeg?.title || 'Los Angeles Union Station'}
      </Text>
      <View style={routeStyles.arrivalTimeRow}>
        <View style={routeStyles.trainIconWrap}>
          <TrainIcon color="#0097FF" size={18} />
        </View>
        <Text style={routeStyles.arrivalTime}>
          {formatRouteTime(activeLeg?.starts_at, '11:32 AM')}
        </Text>
        <View style={routeStyles.onTimeBadge}>
          <Text style={routeStyles.onTimeBadgeText}>On time</Text>
        </View>
      </View>
      <View style={routeStyles.nextCard}>
        <View style={routeStyles.walkIconWrap}>
          <WalkIcon color="#0097FF" size={15} />
        </View>
        <View style={routeStyles.nextCopy}>
          <Text style={routeStyles.nextTitle}>
            {nextLeg?.title || 'Next: Walk to Olvera Street - 845 N Alameda St'}
          </Text>
          <Text style={routeStyles.nextMeta}>
            {nextLeg?.mode ? nextLeg.mode.replace(/_/g, ' ') : '0.8 mi - 12 min walk'}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Start walking"
          accessibilityRole="button"
          onPress={onStartWalking}
          style={({ pressed }) => [routeStyles.walkButton, pressed && styles.pressedFeedback]}
        >
          <Text style={routeStyles.walkButtonText}>
            {isWalking ? 'Walking...' : 'Start Walking'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SummaryStatsCard({ walkProgress }: { walkProgress: number }) {
  const walkProgressPercent = Math.round(walkProgress * 100);

  return (
    <View style={routeStyles.summaryCard}>
      {summaryStats.map((stat, index) => (
        <View
          key={stat.label}
          style={[
            routeStyles.summaryItem,
            index < summaryStats.length - 1 && routeStyles.summaryItemDivider,
          ]}
        >
          <View style={routeStyles.summaryLabelRow}>
            <SummaryIcon name={stat.icon} />
            <Text style={routeStyles.summaryLabel}>{stat.label}</Text>
          </View>
          <Text style={routeStyles.summaryValue}>
            {stat.icon === 'walk' ? `${walkProgressPercent}%` : stat.value}
          </Text>
          <Text
            style={[
              routeStyles.summaryHelper,
              'accent' in stat && stat.accent && routeStyles.summaryHelperAccent,
            ]}
          >
            {stat.helper}
          </Text>
        </View>
      ))}
    </View>
  );
}

function getCubicBezierPoint(
  start: RouteVisualPoint,
  controlOne: RouteVisualPoint,
  controlTwo: RouteVisualPoint,
  end: RouteVisualPoint,
  progress: number,
) {
  const inverseProgress = 1 - progress;

  return {
    x:
      inverseProgress ** 3 * start.x +
      3 * inverseProgress ** 2 * progress * controlOne.x +
      3 * inverseProgress * progress ** 2 * controlTwo.x +
      progress ** 3 * end.x,
    y:
      inverseProgress ** 3 * start.y +
      3 * inverseProgress ** 2 * progress * controlOne.y +
      3 * inverseProgress * progress ** 2 * controlTwo.y +
      progress ** 3 * end.y,
  };
}

function createWalkRouteVisualPoints() {
  const firstSegment = Array.from({ length: 38 }, (_, index) =>
    getCubicBezierPoint(
      { x: 80, y: 193 },
      { x: 83, y: 142 },
      { x: 124, y: 96 },
      { x: 178, y: 73 },
      index / 37,
    ),
  );
  const secondSegment = Array.from({ length: 35 }, (_, index) =>
    getCubicBezierPoint(
      { x: 178, y: 73 },
      { x: 219, y: 56 },
      { x: 260, y: 48 },
      { x: 310, y: 50 },
      index / 34,
    ),
  );

  return [...firstSegment, ...secondSegment.slice(1)];
}

function getWalkRouteVisualPointAtProgress(progress: number) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const exactIndex = clampedProgress * (walkRouteVisualPoints.length - 1);
  const startIndex = Math.floor(exactIndex);
  const endIndex = Math.min(walkRouteVisualPoints.length - 1, startIndex + 1);
  const segmentProgress = exactIndex - startIndex;
  const start = walkRouteVisualPoints[startIndex];
  const end = walkRouteVisualPoints[endIndex];

  return {
    x: start.x + (end.x - start.x) * segmentProgress,
    y: start.y + (end.y - start.y) * segmentProgress,
  };
}

function getWalkRouteVisualPointString(points: RouteVisualPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function getCoordinateDistance(start: RouteCoordinate, end: RouteCoordinate) {
  const latitudeDistance = end.latitude - start.latitude;
  const longitudeDistance = end.longitude - start.longitude;

  return Math.sqrt(latitudeDistance ** 2 + longitudeDistance ** 2);
}

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

async function fetchWalkingRouteCoordinates(
  from: RouteCoordinate,
  to: RouteCoordinate,
): Promise<RouteCoordinate[]> {
  const response = await fetchNodeWithFallback('/api/client/maps/driving-route', {
    body: JSON.stringify({
      from_lat: from.latitude,
      from_lng: from.longitude,
      mode: 'walking',
      to_lat: to.latitude,
      to_lng: to.longitude,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    timeoutMs: 12000,
  });

  if (!response.ok) {
    throw new Error(`Walking route request failed with ${response.status}`);
  }

  const data = (await response.json().catch(() => ({}))) as { route?: unknown[] };
  const route = Array.isArray(data.route)
    ? data.route.map(parseRouteCoordinate).filter((coordinate) => coordinate !== null)
    : [];

  if (route.length <= 1) {
    throw new Error('Walking route response did not include enough coordinates');
  }

  return route as RouteCoordinate[];
}

function getRouteRegion(route: RouteCoordinate[]): Region {
  const coordinates = route.length > 1 ? route : walkRouteCoordinates;
  const minLatitude = Math.min(...coordinates.map((coordinate) => coordinate.latitude));
  const maxLatitude = Math.max(...coordinates.map((coordinate) => coordinate.latitude));
  const minLongitude = Math.min(...coordinates.map((coordinate) => coordinate.longitude));
  const maxLongitude = Math.max(...coordinates.map((coordinate) => coordinate.longitude));
  const latitudeDelta = Math.max((maxLatitude - minLatitude) * 1.9, 0.004);
  const longitudeDelta = Math.max((maxLongitude - minLongitude) * 1.9, 0.004);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    latitudeDelta,
    longitude: (minLongitude + maxLongitude) / 2,
    longitudeDelta,
  };
}

function getWalkRouteCoordinateAtProgress(route: RouteCoordinate[], progress: number) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const routeCoordinates = route.length > 1 ? route : walkRouteCoordinates;
  const segmentDistances = routeCoordinates
    .slice(0, -1)
    .map((coordinate, index) => getCoordinateDistance(coordinate, routeCoordinates[index + 1]));
  const totalDistance = segmentDistances.reduce((sum, distance) => sum + distance, 0);
  let remainingDistance = clampedProgress * totalDistance;

  for (let index = 0; index < segmentDistances.length; index += 1) {
    const segmentDistance = segmentDistances[index];

    if (remainingDistance <= segmentDistance || index === segmentDistances.length - 1) {
      const start = routeCoordinates[index];
      const end = routeCoordinates[index + 1];
      const segmentProgress = segmentDistance === 0 ? 0 : remainingDistance / segmentDistance;

      return {
        latitude: start.latitude + (end.latitude - start.latitude) * segmentProgress,
        longitude: start.longitude + (end.longitude - start.longitude) * segmentProgress,
      };
    }

    remainingDistance -= segmentDistance;
  }

  return routeCoordinates[routeCoordinates.length - 1] || olveraStreetCoordinate;
}

function RouteMapPanel({ walkProgress }: { walkProgress: number }) {
  const mapRef = useRef<NativeMapView | null>(null);
  const isResettingMapRef = useRef(false);
  const projectionFrameRef = useRef<number | null>(null);
  const resetLayerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resolvedWalkRoute, setResolvedWalkRoute] = useState<RouteCoordinate[]>(walkRouteCoordinates);
  const [routeScreenPoints, setRouteScreenPoints] = useState<MapScreenPoint[]>([]);
  const [startScreenPoint, setStartScreenPoint] = useState<MapScreenPoint | null>(null);
  const [endScreenPoint, setEndScreenPoint] = useState<MapScreenPoint | null>(null);
  const [progressScreenPoint, setProgressScreenPoint] = useState<MapScreenPoint | null>(null);
  const [isMapDetailMode, setIsMapDetailMode] = useState(false);
  const currentWalkRoute = resolvedWalkRoute.length > 1 ? resolvedWalkRoute : walkRouteCoordinates;
  const routeRegion = useMemo(() => getRouteRegion(currentWalkRoute), [currentWalkRoute]);
  const startCoordinate = currentWalkRoute[0] || unionStationCoordinate;
  const endCoordinate = currentWalkRoute[currentWalkRoute.length - 1] || olveraStreetCoordinate;
  const routeVisualProgressIndex = Math.max(
    1,
    Math.round(walkProgress * (walkRouteVisualPoints.length - 1)),
  );
  const completedRoutePoints = walkRouteVisualPoints.slice(0, routeVisualProgressIndex + 1);
  const progressPoint = getWalkRouteVisualPointAtProgress(walkProgress);
  const nativeProgressCoordinate = useMemo(
    () => getWalkRouteCoordinateAtProgress(currentWalkRoute, walkProgress),
    [currentWalkRoute, walkProgress],
  );
  const routeScreenProgressIndex =
    routeScreenPoints.length > 1 ? Math.floor(walkProgress * (routeScreenPoints.length - 1)) : 0;
  const completedNativeRoutePoints =
    routeScreenPoints.length > 1 && progressScreenPoint
      ? [...routeScreenPoints.slice(0, routeScreenProgressIndex + 1), progressScreenPoint]
      : [];
  const upcomingNativeRoutePoints =
    routeScreenPoints.length > 1 && progressScreenPoint
      ? [progressScreenPoint, ...routeScreenPoints.slice(routeScreenProgressIndex + 1)]
      : routeScreenPoints;
  const projectCoordinate = useCallback(async (coordinate: RouteCoordinate) => {
    const point = await mapRef.current?.pointForCoordinate(coordinate);

    return point ? { x: point.x, y: point.y } : null;
  }, []);
  const updateProjectedRoute = useCallback(async () => {
    if (!mapRef.current) {
      return;
    }

    const projectedRoutePoints = await Promise.all(currentWalkRoute.map(projectCoordinate));
    const projectedStartPoint = await projectCoordinate(startCoordinate);
    const projectedEndPoint = await projectCoordinate(endCoordinate);
    const projectedProgressPoint = await projectCoordinate(nativeProgressCoordinate);

    setRouteScreenPoints(
      projectedRoutePoints.filter((point): point is MapScreenPoint => point !== null),
    );
    setStartScreenPoint(projectedStartPoint);
    setEndScreenPoint(projectedEndPoint);
    setProgressScreenPoint(projectedProgressPoint);
  }, [currentWalkRoute, endCoordinate, nativeProgressCoordinate, projectCoordinate, startCoordinate]);
  const scheduleProjectedRouteUpdate = useCallback(() => {
    if (projectionFrameRef.current !== null) {
      return;
    }

    projectionFrameRef.current = requestAnimationFrame(() => {
      projectionFrameRef.current = null;
      void updateProjectedRoute();
    });
  }, [updateProjectedRoute]);
  const resetNativeRouteViewport = useCallback(
    (animated = true) => {
      isResettingMapRef.current = true;
      setIsMapDetailMode(false);

      mapRef.current?.animateCamera(
        {
          center: {
            latitude: routeRegion.latitude,
            longitude: routeRegion.longitude,
          },
          heading: 0,
          pitch: 0,
        },
        { duration: animated ? 180 : 0 },
      );
      mapRef.current?.fitToCoordinates(currentWalkRoute, {
        animated,
        edgePadding: {
          bottom: 72,
          left: 56,
          right: 56,
          top: 56,
        },
      });
      if (resetLayerTimeoutRef.current !== null) {
        clearTimeout(resetLayerTimeoutRef.current);
      }

      resetLayerTimeoutRef.current = setTimeout(() => {
        isResettingMapRef.current = false;
        setIsMapDetailMode(false);
        resetLayerTimeoutRef.current = null;
        void updateProjectedRoute();
      }, animated ? 520 : 80);
    },
    [currentWalkRoute, routeRegion.latitude, routeRegion.longitude, updateProjectedRoute],
  );
  const handleMapRegionChange = useCallback(() => {
    if (!isResettingMapRef.current) {
      setIsMapDetailMode(true);
    }
    scheduleProjectedRouteUpdate();
  }, [scheduleProjectedRouteUpdate]);
  const handleMapRegionChangeComplete = useCallback(() => {
    if (isResettingMapRef.current) {
      isResettingMapRef.current = false;
      setIsMapDetailMode(false);
    }

    void updateProjectedRoute();
  }, [updateProjectedRoute]);

  useEffect(() => {
    let cancelled = false;

    void fetchWalkingRouteCoordinates(unionStationCoordinate, olveraStreetCoordinate)
      .then((route) => {
        if (!cancelled) {
          setResolvedWalkRoute(route);
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.warn('[LiveModeRoutes] Failed to load Google walking route:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      resetNativeRouteViewport(false);
    });
  }, [resetNativeRouteViewport]);

  useEffect(() => {
    updateProjectedRoute();
  }, [updateProjectedRoute, walkProgress]);

  useEffect(
    () => () => {
      if (projectionFrameRef.current !== null) {
        cancelAnimationFrame(projectionFrameRef.current);
      }
      if (resetLayerTimeoutRef.current !== null) {
        clearTimeout(resetLayerTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <View style={routeStyles.mapPanel}>
      <NativeMapView
        customMapStyle={isMapDetailMode ? [] : walkMapStyle}
        initialRegion={routeRegion}
        mapType="standard"
        onLayout={() => resetNativeRouteViewport(false)}
        onMapReady={() => resetNativeRouteViewport(false)}
        onPanDrag={() => setIsMapDetailMode(true)}
        onRegionChange={handleMapRegionChange}
        onRegionChangeComplete={handleMapRegionChangeComplete}
        pitchEnabled={false}
        provider={PROVIDER_GOOGLE}
        ref={mapRef}
        rotateEnabled={false}
        scrollEnabled
        showsCompass={false}
        showsScale={false}
        style={[
          routeStyles.walkGoogleMap,
          isMapDetailMode && routeStyles.walkGoogleMapDetail,
        ]}
        toolbarEnabled={false}
        zoomControlEnabled={false}
        zoomEnabled
      >
        <Polyline
          coordinates={currentWalkRoute}
          lineCap="round"
          lineJoin="round"
          strokeColor="transparent"
          strokeWidth={14}
          zIndex={1}
        />
        <Polyline
          coordinates={currentWalkRoute}
          lineCap="round"
          lineDashPattern={[1, 11]}
          lineJoin="round"
          strokeColor="transparent"
          strokeWidth={7}
          zIndex={2}
        />
      </NativeMapView>
      <View
        pointerEvents="none"
        style={[routeStyles.walkMapTint, isMapDetailMode && routeStyles.walkMapTintDetail]}
      />
      <View pointerEvents="none" style={[routeStyles.mapGrid, isMapDetailMode && routeStyles.mapGridDetail]}>
        {mapGridVerticalPositions.map((position) => (
          <View key={`mv-${position}`} style={[routeStyles.mapGridVertical, { left: position }]} />
        ))}
        {mapGridHorizontalPositions.map((position) => (
          <View key={`mh-${position}`} style={[routeStyles.mapGridHorizontal, { top: position }]} />
        ))}
        <View style={routeStyles.mapGridDiagonal} />
      </View>
      <View pointerEvents="none" style={routeStyles.liveRoutePill}>
        <View style={routeStyles.liveRouteDot} />
        <Text style={routeStyles.liveRouteText}>Live Walk Route</Text>
      </View>
      {routeScreenPoints.length > 1 ? (
        <Svg
          height="100%"
          pointerEvents="none"
          style={routeStyles.nativeRouteOverlayLayer}
          width="100%"
        >
          {upcomingNativeRoutePoints.length > 1 ? (
            <>
              <SvgPolyline
                fill="none"
                opacity="0.1"
                points={getWalkRouteVisualPointString(upcomingNativeRoutePoints)}
                stroke="#0097FF"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="18"
              />
              <SvgPolyline
                fill="none"
                opacity="0.2"
                points={getWalkRouteVisualPointString(upcomingNativeRoutePoints)}
                stroke="#0097FF"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="14"
              />
              <SvgPolyline
                fill="none"
                opacity="0.6"
                points={getWalkRouteVisualPointString(upcomingNativeRoutePoints)}
                stroke="#0097FF"
                strokeDasharray="1 11"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="7"
              />
            </>
          ) : null}
          {completedNativeRoutePoints.length > 1 ? (
            <>
              <SvgPolyline
                fill="none"
                opacity="0.35"
                points={getWalkRouteVisualPointString(completedNativeRoutePoints)}
                stroke="#0097FF"
                strokeDasharray="1 11"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="12"
              />
              <SvgPolyline
                fill="none"
                points={getWalkRouteVisualPointString(completedNativeRoutePoints)}
                stroke="#0097FF"
                strokeDasharray="1 11"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="7"
              />
            </>
          ) : null}
        </Svg>
      ) : null}
      {startScreenPoint ? (
        <View
          pointerEvents="none"
          style={[
            routeStyles.nativeStartPlaceOverlay,
            {
              left: startScreenPoint.x - 14,
              top: startScreenPoint.y - 28,
            },
          ]}
        >
          <View style={routeStyles.nativeStartMarkerOuter}>
            <View style={routeStyles.nativeStartMarkerInner} />
          </View>
          <View style={routeStyles.nativeLocationCard}>
            <View style={routeStyles.locationIconWrap}>
              <TrainIcon color="#0097FF" size={17} />
            </View>
            <View style={routeStyles.locationCopy}>
              <Text style={routeStyles.locationTitle}>Los Angeles Union Station</Text>
              <Text style={routeStyles.locationMeta}>You are here</Text>
            </View>
          </View>
        </View>
      ) : null}
      {endScreenPoint ? (
        <View
          pointerEvents="none"
          style={[
            routeStyles.nativeEndPlaceOverlay,
            {
              left: endScreenPoint.x - 105,
              top: endScreenPoint.y - 34,
            },
          ]}
        >
          <View style={routeStyles.nativeDestinationCallout}>
            <Text style={routeStyles.destinationTitle}>Olvera</Text>
            <Text style={routeStyles.destinationTitle}>Street</Text>
            <Text style={routeStyles.destinationMeta}>11:44 AM ETA</Text>
          </View>
          <View style={routeStyles.nativeEndMarkerOuter}>
            <View style={routeStyles.nativeEndMarkerMiddle}>
              <View style={routeStyles.nativeEndMarkerInner} />
            </View>
          </View>
        </View>
      ) : null}
      {progressScreenPoint ? (
        <View
          pointerEvents="none"
          style={[
            routeStyles.nativeRouteProgressMarker,
            {
              left: progressScreenPoint.x - 14,
              position: 'absolute',
              top: progressScreenPoint.y - 14,
              zIndex: 47,
            },
          ]}
        >
          <WalkIcon color="#FFFFFF" size={14} />
        </View>
      ) : null}
      {/* Original SVG path and markers are disabled while we use the native map route. */}
      {showOriginalSvgRoute ? (
        <>
          <Svg
            height={240}
            pointerEvents="none"
            style={routeStyles.mapPathLayer}
            viewBox="0 0 370 240"
            width="100%"
          >
            <Path
              d={walkRoutePath}
              fill="none"
              stroke="#1B3156"
              strokeLinecap="round"
              strokeWidth="16"
            />
            <Path
              d={walkRoutePath}
              fill="none"
              opacity="0"
              stroke="#5BA3FF"
              strokeDasharray="1 11"
              strokeLinecap="round"
              strokeWidth="12"
            />
            <Path
              d={walkRoutePath}
              fill="none"
              stroke="#5BA3FF"
              strokeDasharray="1 11"
              strokeLinecap="round"
              strokeWidth="6"
            />
            {completedRoutePoints.length > 1 ? (
              <>
                <SvgPolyline
                  fill="none"
                  opacity="0.35"
                  points={getWalkRouteVisualPointString(completedRoutePoints)}
                  stroke="#0097FF"
                  strokeDasharray="1 11"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="12"
                />
                <SvgPolyline
                  fill="none"
                  points={getWalkRouteVisualPointString(completedRoutePoints)}
                  stroke="#0097FF"
                  strokeDasharray="1 11"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="7"
                />
              </>
            ) : null}
            <Circle cx="80" cy="193" fill="#0B1725" r="13" stroke="#5BA3FF" strokeWidth="2.8" />
            <Circle cx="80" cy="193" fill="#5BA3FF" r="6" />
            <Circle cx="310" cy="50" fill="#0097FF" opacity="0.24" r="20" />
            <Circle cx="310" cy="50" fill="#0097FF" r="15.5" />
            <Circle cx="310" cy="50" fill="#FFFFFF" r="8.8" />
          </Svg>
          <View
            pointerEvents="none"
            style={[
              routeStyles.routeProgressMarker,
              { left: progressPoint.x - 20, top: progressPoint.y - 19 },
            ]}
          >
            <WalkIcon color="#FFFFFF" size={14} />
          </View>
        </>
      ) : null}
      <Pressable
        accessibilityLabel="Recenter route north up"
        accessibilityRole="button"
        onPress={() => resetNativeRouteViewport(true)}
        style={({ pressed }) => [routeStyles.mapCompass, pressed && styles.pressedFeedback]}
      >
        <NavigationIcon color="#FFFFFF" size={14} />
      </Pressable>
      <View pointerEvents="none" style={routeStyles.mapLayersButton}>
        <LayersIcon color="#FFFFFF" size={14} />
      </View>
    </View>
  );
}

function formatRouteTime(value?: string | null, fallback = '') {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function WalkStatsCard({ stats }: { stats?: LiveStat[] }) {
  const displayStats =
    stats && stats.length
      ? stats.slice(0, 4).map((stat) => ({ label: stat.label, value: stat.value }))
      : walkStats;

  return (
    <View style={routeStyles.walkStatsCard}>
      {displayStats.map((stat, index) => (
        <View
          key={stat.label}
          style={[
            routeStyles.walkStat,
            index < walkStats.length - 1 && routeStyles.walkStatDivider,
          ]}
        >
          <Text style={routeStyles.walkStatValue}>{stat.value}</Text>
          <Text style={routeStyles.walkStatLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

function DirectionsCard({ directions }: { directions?: LiveDirectionStep[] }) {
  const displaySteps =
    directions && directions.length
      ? directions.slice(0, 5).map((step, index) => ({
          distance: step.distance || '',
          helper: step.helper || '',
          icon: step.icon || (index === 0 ? 'walk' : 'straight'),
          primary: index === 0,
          title: step.title,
        }))
      : directionSteps;

  return (
    <View style={routeStyles.directionsCard}>
      {displaySteps.map((step, index) => (
        <View
          key={step.title}
          style={[
            routeStyles.directionRow,
            index < directionSteps.length - 1 && routeStyles.directionRowDivider,
          ]}
        >
          <View
            style={[
              routeStyles.directionIconWrap,
              'primary' in step && step.primary && routeStyles.directionIconWrapPrimary,
              step.icon === 'turn' && routeStyles.directionTurnIconWrap,
            ]}
          >
            <DirectionIcon
              name={step.icon as (typeof directionSteps)[number]['icon']}
              color="#0097FF"
              size={18}
            />
          </View>
          <View style={routeStyles.directionCopy}>
            <Text style={routeStyles.directionTitle}>{step.title}</Text>
            {'helper' in step && step.helper ? (
              <Text style={routeStyles.directionHelper}>{step.helper}</Text>
            ) : null}
          </View>
          <View style={routeStyles.directionDistanceRow}>
            <Text
              style={[
                routeStyles.directionDistance,
                'primary' in step && step.primary && routeStyles.directionDistancePrimary,
              ]}
            >
              {step.distance}
            </Text>
            {'primary' in step && step.primary ? (
              <ChevronRightIcon color="#7B8DB8" size={14} />
            ) : null}
          </View>
        </View>
      ))}
      <View style={routeStyles.directionPager}>
        <View style={[routeStyles.directionPagerDot, routeStyles.directionPagerDotActive]} />
        <View style={routeStyles.directionPagerDot} />
        <View style={routeStyles.directionPagerDot} />
      </View>
    </View>
  );
}

function AlertCard({ alerts }: { alerts?: LiveAlert[] }) {
  const alert = alerts?.[0];

  return (
    <View style={routeStyles.alertCard}>
      <View style={routeStyles.alertIcon}>
        <BellIcon color="#00C97B" size={18} />
      </View>
      <View style={routeStyles.alertCopy}>
        <Text style={routeStyles.alertTitle}>{alert?.title || 'Stay updated'}</Text>
        <Text style={routeStyles.alertText}>
          {alert?.message || "We'll notify you about any changes to your journey."}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Enable journey alerts"
        accessibilityRole="button"
        style={({ pressed }) => [routeStyles.alertButton, pressed && styles.pressedFeedback]}
      >
        <Text style={routeStyles.alertButtonText}>Enable Alerts</Text>
      </Pressable>
    </View>
  );
}

function SummaryIcon({ name }: { name: (typeof summaryStats)[number]['icon'] }) {
  if (name === 'clock') {
    return <ClockIcon color="#7B8DB8" size={11} />;
  }

  if (name === 'walk') {
    return <WalkIcon color="#7B8DB8" size={11} />;
  }

  return <NavigationIcon color="#7B8DB8" size={11} />;
}

function DirectionIcon({
  color,
  name,
  size,
}: {
  color: string;
  name: (typeof directionSteps)[number]['icon'];
  size: number;
}) {
  if (name === 'walk') {
    return <DirectionWalkIcon color={color} size={size} />;
  }

  if (name === 'turn') {
    return <TurnLeftIcon color={color} size={size} />;
  }

  return <ArrowUpIcon color={color} size={size} />;
}

function DirectionWalkIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M7.61713 8.71233L10.8222 6.38373C11.174 6.12735 11.6087 5.98543 12.065 6.0008C13.1764 6.02813 14.1524 6.75668 14.4919 7.82036C14.6782 8.40431 14.8481 8.79836 15.0017 9.0025C15.914 10.2155 17.3655 11 19.0002 11V13C16.8255 13 14.8825 12.0083 13.5986 10.4526L12.901 14.4085L14.9621 16.138L17.1853 22.246L15.3059 22.93L13.266 17.3256L9.87576 14.4808C9.32821 14.0382 9.03139 13.3192 9.16231 12.5767L9.67091 9.6923L8.99407 10.1841L6.86706 13.1116L5.24902 11.9361L7.60016 8.7L7.61713 8.71233ZM13.5002 5.5C12.3956 5.5 11.5002 4.60457 11.5002 3.5C11.5002 2.39543 12.3956 1.5 13.5002 1.5C14.6047 1.5 15.5002 2.39543 15.5002 3.5C15.5002 4.60457 14.6047 5.5 13.5002 5.5ZM10.5286 18.6813L7.31465 22.5116L5.78257 21.226L8.75774 17.6803L9.50426 15.5L11.2954 17L10.5286 18.6813Z"
        fill={color}
      />
    </Svg>
  );
}

function TrainIcon({ color, size }: { color: string; size: number }) {
  if (color === '#0097FF') {
    return <TrainRouteIcon height={size} width={size} />;
  }

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M7 3h10a3 3 0 0 1 3 3v8a4 4 0 0 1-4 4l2 3h-2.4l-1.3-2h-4.6l-1.3 2H6l2-3a4 4 0 0 1-4-4V6a3 3 0 0 1 3-3Zm0 4v4h10V7H7Zm2 8h2v-2H9v2Zm4 0h2v-2h-2v2Z"
        fill={color}
      />
    </Svg>
  );
}

function WalkIcon({ color, size }: { color: string; size: number }) {
  if (color === '#0097FF' || color === '#60A5FA') {
    return <WalkRouteIcon height={size} width={size} />;
  }

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx="12" cy="5" fill={color} r="2" />
      <Path
        d="m10 9 3 2 3 1M13 11l-2 4-3 4M13 11l1 4 3 4M10 9l-2 4"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="2"
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

function TurnLeftIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M7 7h7a4 4 0 0 1 4 4v6M7 7l4-4M7 7l4 4"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.3"
      />
    </Svg>
  );
}

function ArrowUpIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 19V5M12 5l-5 5M12 5l5 5"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.3"
      />
    </Svg>
  );
}

function ChevronRightIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="m9 6 6 6-6 6"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

function LayersIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="m12 4 8 4-8 4-8-4 8-4ZM4 12l8 4 8-4M4 16l8 4 8-4"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

function BellIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M15 18a3 3 0 0 1-6 0M18 14.5V10a6 6 0 1 0-12 0v4.5L4.5 17h15L18 14.5Z"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

const routeStyles = StyleSheet.create({
  screen: {
    alignSelf: 'stretch',
    minHeight: 1045,
    overflow: 'hidden',
    paddingBottom: 42,
    paddingHorizontal: 16,
    paddingTop: 53,
    width: '100%',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 31,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 20,
    height: 39,
    justifyContent: 'center',
    width: 39,
  },
  backIcon: {
    color: '#FFFFFF',
    height: 20,
    transform: [{ rotate: '180deg' }],
    width: 20,
  },
  modeHeader: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
    minWidth: 0,
  },
  liveTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  liveDot: {
    backgroundColor: '#4ADE80',
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    width: 8,
  },
  liveTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  liveSubtitle: {
    color: '#8892AA',
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
  },
  normalModeButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    flexDirection: 'row',
    height: 36,
    paddingHorizontal: 16,
    width: 186,
  },
  switchTrack: {
    alignItems: 'flex-end',
    backgroundColor: colors.blue,
    borderRadius: 999,
    height: 14,
    justifyContent: 'center',
    marginRight: 6,
    paddingHorizontal: 2,
    width: 26,
  },
  switchKnob: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    height: 11,
    width: 11,
  },
  normalModeText: {
    color: colors.blue,
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  arrivalCard: {
    backgroundColor: '#0D1635',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    height: 212,
    marginBottom: 12,
    padding: 16,
  },
  successText: {
    color: '#00C97B',
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  stationTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 4,
  },
  arrivalTimeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 14,
  },
  trainIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,151,255,0.15)',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    marginRight: 8,
    width: 32,
  },
  arrivalTime: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 33,
    marginRight: 10,
  },
  onTimeBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,201,123,0.15)',
    borderRadius: 999,
    height: 19,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  onTimeBadgeText: {
    color: '#00C97B',
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 15,
  },
  nextCard: {
    alignItems: 'center',
    backgroundColor: '#111B40',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    height: 75,
    marginTop: 12,
    paddingHorizontal: 13,
  },
  walkIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,151,255,0.15)',
    borderRadius: 10,
    height: 28,
    justifyContent: 'center',
    marginRight: 8,
    width: 28,
  },
  nextCopy: {
    flex: 1,
    minWidth: 0,
  },
  nextTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  nextMeta: {
    color: '#7B8DB8',
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
  },
  walkButton: {
    alignItems: 'center',
    backgroundColor: '#0097FF',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    marginLeft: 9,
    width: 102,
  },
  walkButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: '#0D1635',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    height: 82,
    marginBottom: 12,
    overflow: 'hidden',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  summaryItemDivider: {
    borderRightColor: 'rgba(255,255,255,0.06)',
    borderRightWidth: 1,
  },
  summaryLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 5,
  },
  summaryLabel: {
    color: '#7B8DB8',
    fontFamily: 'DMSans-Medium',
    fontSize: 9.5,
    fontWeight: '500',
    lineHeight: 14,
    marginLeft: 4,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  summaryHelper: {
    color: '#7B8DB8',
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 15,
  },
  summaryHelperAccent: {
    color: '#00C97B',
  },
  mapPanel: {
    backgroundColor: '#0B1725',
    height: 235,
    marginBottom: 12,
    marginHorizontal: -8,
    overflow: 'hidden',
    position: 'relative',
  },
  walkGoogleMap: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.42,
  },
  walkGoogleMapDetail: {
    opacity: 0.92,
  },
  walkMapTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 15, 28, 0.50)',
  },
  walkMapTintDetail: {
    backgroundColor: 'rgba(7, 15, 28, 0.08)',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  mapGridDetail: {
    opacity: 0.08,
  },
  mapGridVertical: {
    backgroundColor: '#172D44',
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 1.2,
  },
  mapGridHorizontal: {
    backgroundColor: '#172D44',
    height: 1.2,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  mapGridDiagonal: {
    backgroundColor: '#172D44',
    height: 1.2,
    left: 64,
    opacity: 0.85,
    position: 'absolute',
    top: 118,
    transform: [{ rotate: '-47deg' }],
    width: 338,
  },
  liveRoutePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(9, 17, 30, 0.86)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    height: 26,
    left: 12,
    paddingHorizontal: 10,
    position: 'absolute',
    top: 12,
  },
  liveRouteDot: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    height: 15,
    marginRight: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 7,
    width: 15,
  },
  liveRouteText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 13,
  },
  mapPathLayer: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  nativeRouteOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  nativeStartPlaceOverlay: {
    alignItems: 'center',
    flexDirection: 'row',
    position: 'absolute',
    zIndex: 45,
  },
  nativeEndPlaceOverlay: {
    alignItems: 'center',
    flexDirection: 'row',
    position: 'absolute',
    zIndex: 46,
  },
  nativeStartPlaceMarker: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  nativeEndPlaceMarker: {
    alignItems: 'center',
  },
  nativeStartMarkerOuter: {
    alignItems: 'center',
    backgroundColor: '#0B1725',
    borderColor: '#5BA3FF',
    borderRadius: 13,
    borderWidth: 2.8,
    height: 26,
    justifyContent: 'center',
    marginRight: 8,
    width: 26,
  },
  nativeStartMarkerInner: {
    backgroundColor: '#5BA3FF',
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  nativeEndMarkerOuter: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 151, 255, 0.24)',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginLeft: 8,
    width: 40,
  },
  nativeEndMarkerMiddle: {
    alignItems: 'center',
    backgroundColor: '#0097FF',
    borderRadius: 15.5,
    height: 31,
    justifyContent: 'center',
    width: 31,
  },
  nativeEndMarkerInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8.8,
    height: 17.6,
    width: 17.6,
  },
  nativeRouteProgressMarker: {
    alignItems: 'center',
    backgroundColor: '#5BA3FF',
    borderColor: '#0B1725',
    borderRadius: 14,
    borderWidth: 3,
    height: 28,
    justifyContent: 'center',
    shadowColor: '#5BA3FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 9,
    width: 28,
  },
  routeProgressMarker: {
    alignItems: 'center',
    backgroundColor: '#5BA3FF',
    borderColor: '#0B1725',
    borderRadius: 14,
    borderWidth: 3,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#5BA3FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 9,
    width: 28,
  },
  destinationCallout: {
    backgroundColor: 'rgba(9, 17, 30, 0.90)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 61,
    paddingHorizontal: 11,
    paddingVertical: 13,
    position: 'absolute',
    right: 30,
    top: 77,
    width: 77,
  },
  nativeDestinationCallout: {
    backgroundColor: 'rgba(9, 17, 30, 0.90)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 61,
    paddingHorizontal: 11,
    paddingVertical: 13,
    width: 77,
  },
  destinationTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
  destinationMeta: {
    color: '#0097FF',
    fontFamily: 'DM Sans',
    fontSize: 8,
    fontWeight: '400',
    lineHeight: 12,
    marginTop: 2,
  },
  mapCompass: {
    alignItems: 'center',
    backgroundColor: 'rgba(9, 17, 30, 0.88)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 166,
    width: 28,
  },
  mapLayersButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(9, 17, 30, 0.88)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 202,
    width: 28,
  },
  locationCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(9, 17, 30, 0.90)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    height: 56,
    left: 101,
    paddingHorizontal: 11,
    position: 'absolute',
    top: 159,
    width: 121,
  },
  nativeLocationCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(9, 17, 30, 0.90)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    height: 56,
    paddingHorizontal: 11,
    width: 121,
  },
  locationIconWrap: {
    alignItems: 'center',
    borderColor: '#5BA3FF',
    borderRadius: 13,
    borderWidth: 1.6,
    height: 26,
    justifyContent: 'center',
    marginRight: 8,
    width: 26,
  },
  locationCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 12,
  },
  locationMeta: {
    color: '#00C97B',
    fontFamily: 'DM Sans',
    fontSize: 8,
    marginTop: 2,
    fontWeight: '400',
    lineHeight: 11,
  },
  directionsCard: {
    backgroundColor: '#0D1635',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 4,
    position: 'relative',
  },
  directionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
  },
  directionRowDivider: {
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
  },
  directionIconWrap: {
    alignItems: 'center',
    backgroundColor: '#063A75',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    marginRight: 12,
    width: 30,
  },
  directionIconWrapPrimary: {
    backgroundColor: '#064584',
  },
  directionTurnIconWrap: {
    transform: [{ rotate: '180deg' }],
  },
  directionCopy: {
    flex: 1,
    minWidth: 0,
  },
  directionTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  directionHelper: {
    color: '#7B8DB8',
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  },
  directionDistanceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 10,
  },
  directionDistance: {
    color: '#7B8DB8',
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  directionDistancePrimary: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginRight: 4,
  },
  directionPager: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 67,
    justifyContent: 'center',
  },
  directionPagerDot: {
    backgroundColor: '#5A668D',
    borderRadius: 2,
    height: 3,
    opacity: 0.45,
    width: 3,
  },
  directionPagerDotActive: {
    opacity: 0.85,
  },
  walkStatsCard: {
    backgroundColor: '#0D1635',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    height: 59,
    marginBottom: 12,
    overflow: 'hidden',
  },
  walkStat: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  walkStatDivider: {
    borderRightColor: 'rgba(255,255,255,0.06)',
    borderRightWidth: 1,
  },
  walkStatValue: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  walkStatLabel: {
    color: '#7B8DB8',
    fontFamily: 'DM Sans',
    fontSize: 9.5,
    fontWeight: '400',
    lineHeight: 14,
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
    paddingHorizontal: 17,
    paddingVertical: 16,
  },
  alertIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,201,123,0.14)',
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
    borderRadius: 16,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
});
