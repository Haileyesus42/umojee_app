import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  Polyline,
  OverlayView,
  OverlayViewF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { Maximize2, X, Car, Plane, MapPin, Clock, Route } from "lucide-react";
import { getAirportCoords } from "../utils/airportCoordinates";
import { formatAirportCity } from "../utils/airportCityMap";
import { fetchAiWithFallback } from "../utils/aiBackend";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MapViewProps {
  userLocation?: { latitude: number; longitude: number } | null;
  routeStops?: string[];
  origin?: string;
  destination?: string;
}

interface SegmentLabel {
  position: { lat: number; lng: number };
  distanceKm: number;
  durationMin: number;
  type: "drive" | "flight";
}

interface RouteSegment {
  type: "drive" | "flight";
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
}

// ---------------------------------------------------------------------------
// Read theme --primary CSS variable and convert HSL → hex
// ---------------------------------------------------------------------------
function getThemePrimaryHex(): string {
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim();
    const parts = raw.match(/([\d.]+)\s+([\d.]+)%?\s+([\d.]+)%?/);
    if (!parts) return "#10b981";
    const h = parseFloat(parts[1]);
    const s = parseFloat(parts[2]) / 100;
    const l = parseFloat(parts[3]) / 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  } catch {
    return "#10b981";
  }
}

function getThemePrimaryHexLight(): string {
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim();
    const parts = raw.match(/([\d.]+)\s+([\d.]+)%?\s+([\d.]+)%?/);
    if (!parts) return "#ecfdf5";
    const h = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    return `hsl(${h}, ${s}%, 93%)`;
  } catch {
    return "#ecfdf5";
  }
}

const GOOGLE_MAPS_API_KEY =
  (process.env.REACT_APP_GOOGLE_MAPS_API_KEY as string) || "";

const AVG_DRIVE_SPEED_KMH = 60;
const AVG_FLIGHT_SPEED_KMH = 850;

const DRIVE_COLOR = "#64748b";
const DRIVE_BG_TINT = "#f1f5f9";

const LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

// ---------------------------------------------------------------------------
// Haversine distance (km)
// ---------------------------------------------------------------------------
function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

// Convert [lat, lng] tuple to Google Maps LatLngLiteral
function toLatLng(coord: [number, number]): google.maps.LatLngLiteral {
  return { lat: coord[0], lng: coord[1] };
}

// ---------------------------------------------------------------------------
// Great-circle interpolation
// ---------------------------------------------------------------------------
function interpolateGreatCircle(
  start: [number, number],
  end: [number, number],
  numPoints = 50
): [number, number][] {
  const [lat1, lng1] = [toRad(start[0]), toRad(start[1])];
  const [lat2, lng2] = [toRad(end[0]), toRad(end[1])];
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat1 - lat2) / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng1 - lng2) / 2) ** 2
      )
    );
  if (d < 1e-10) return [start, end];
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    points.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
  }
  return points;
}

// ---------------------------------------------------------------------------
// Driving route fetcher (via FastAPI proxy → Google Maps Directions)
// ---------------------------------------------------------------------------
async function fetchDrivingRoute(
  from: [number, number],
  to: [number, number]
): Promise<[number, number][]> {
  const straightLine: [number, number][] = [from, to];
  try {
    const res = await fetchAiWithFallback(`/api/ai/driving-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_lat: from[0],
        from_lng: from[1],
        to_lat: to[0],
        to_lng: to[1],
      }),
    });
    if (!res.ok) return straightLine;
    const data = await res.json();
    const route: [number, number][] = data?.route ?? [];
    return route.length > 1 ? route : straightLine;
  } catch {
    return straightLine;
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function fmtDist(km: number): string {
  return km >= 1000 ? `${(km / 1000).toFixed(1)}k km` : `${Math.round(km)} km`;
}

function fmtDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Google Maps default styles (subtle, clean)
// ---------------------------------------------------------------------------
const MAP_CONTAINER_STYLE_INLINE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "0 0 1rem 1rem",
};

const MAP_CONTAINER_STYLE_MODAL: React.CSSProperties = {
  width: "100%",
  height: "100%",
};

const MAP_OPTIONS_INLINE: google.maps.MapOptions = {
  disableDefaultUI: true,
  gestureHandling: "cooperative",
  mapTypeId: "roadmap",
};

const MAP_OPTIONS_MODAL: google.maps.MapOptions = {
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: "greedy",
  mapTypeId: "roadmap",
};

// ---------------------------------------------------------------------------
// Overlay markers (HTML overlays on the Google Map)
// ---------------------------------------------------------------------------
function AirportMarker({ code, position, primaryHex }: { code: string; position: google.maps.LatLngLiteral; primaryHex: string }) {
  return (
    <OverlayViewF
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        style={{
          background: primaryHex,
          color: "white",
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          textAlign: "center",
          transform: "translate(-50%, -50%)",
        }}
      >
        {code}
      </div>
    </OverlayViewF>
  );
}

function RulerLabel({ dist, dur, color, position }: { dist: string; dur: string; color: string; position: google.maps.LatLngLiteral }) {
  return (
    <OverlayViewF
      position={position}
      mapPaneName={OverlayView.OVERLAY_LAYER}
    >
      <div
        style={{
          transform: "translate(-50%, -50%)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: color,
          color: "white",
          fontSize: 10,
          fontWeight: 600,
          padding: "3px 8px",
          borderRadius: 10,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          pointerEvents: "none",
        }}
      >
        <span>{dist}</span>
        <span style={{ opacity: 0.6 }}>|</span>
        <span>{dur}</span>
      </div>
    </OverlayViewF>
  );
}

function UserLocationOverlay({ position, primaryHex }: { position: google.maps.LatLngLiteral; primaryHex: string }) {
  return (
    <OverlayViewF
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: "translate(-50%, -100%)" }}>
        <div
          style={{
            background: primaryHex,
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 8,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            marginBottom: 4,
          }}
        >
          My Location
        </div>
        <div className="mapview-pulse-dot" style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: primaryHex,
          border: "3px solid white",
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
        }} />
      </div>
    </OverlayViewF>
  );
}

// ---------------------------------------------------------------------------
// Map content rendered inside GoogleMap
// ---------------------------------------------------------------------------
function MapContent({
  map,
  stopCoords,
  arcs,
  allCoords,
  userLocation,
  drivingRoute,
  segmentLabels,
}: {
  map: google.maps.Map | null;
  stopCoords: { code: string; coords: [number, number] }[];
  arcs: [number, number][][];
  allCoords: [number, number][];
  userLocation?: { latitude: number; longitude: number } | null;
  drivingRoute: [number, number][] | null;
  segmentLabels: SegmentLabel[];
}) {
  const primaryHex = getThemePrimaryHex();
  const prevBoundsKey = useRef("");

  // Fit bounds when coords change
  useEffect(() => {
    if (!map || allCoords.length === 0) return;
    const key = allCoords.map((c) => `${c[0].toFixed(3)},${c[1].toFixed(3)}`).join("|");
    if (key === prevBoundsKey.current) return;
    prevBoundsKey.current = key;

    const bounds = new google.maps.LatLngBounds();
    allCoords.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
  }, [map, allCoords]);

  return (
    <>
      {/* Driving route line */}
      {drivingRoute && drivingRoute.length > 1 && (
        <Polyline
          path={drivingRoute.map(toLatLng)}
          options={{ strokeColor: DRIVE_COLOR, strokeWeight: 3, strokeOpacity: 0.8 }}
        />
      )}

      {/* Flight arcs */}
      {arcs.map((arc, i) => (
        <Polyline
          key={`arc-${i}`}
          path={arc.map(toLatLng)}
          options={{
            strokeColor: primaryHex,
            strokeWeight: 2.5,
            strokeOpacity: 0,
            icons: [{
              icon: { path: "M 0,-1 0,1", strokeOpacity: 0.85, scale: 3 },
              offset: "0",
              repeat: "16px",
            }],
          }}
        />
      ))}

      {/* Ruler labels at midpoint of each segment */}
      {segmentLabels.map((seg, i) => (
        <RulerLabel
          key={`ruler-${i}`}
          position={seg.position}
          dist={fmtDist(seg.distanceKm)}
          dur={fmtDuration(seg.durationMin)}
          color={seg.type === "drive" ? DRIVE_COLOR : primaryHex}
        />
      ))}

      {/* Airport markers */}
      {stopCoords.map(({ code, coords }) => (
        <AirportMarker key={code} code={code} position={toLatLng(coords)} primaryHex={primaryHex} />
      ))}

      {/* User live location */}
      {userLocation?.latitude && userLocation?.longitude && (
        <UserLocationOverlay
          position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
          primaryHex={DRIVE_COLOR}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Route info sidebar (bottom panel in modal)
// ---------------------------------------------------------------------------
function RouteSidebar({ segments, totalKm, totalMin }: {
  segments: RouteSegment[];
  totalKm: number;
  totalMin: number;
}) {
  if (segments.length === 0) return null;

  const primaryHex = getThemePrimaryHex();
  const primaryBgTint = getThemePrimaryHexLight();

  return (
    <div className="mapview-sidebar">
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Route size={16} color="#6b7280" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Route Details</span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#6b7280" }}>
          <span>{fmtDist(totalKm)} total</span>
          <span>{fmtDuration(totalMin)} est.</span>
        </div>
      </div>

      <div style={{ display: "flex", overflowX: "auto", padding: "12px 8px", gap: 0, flex: 1, alignItems: "stretch" }}>
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            <div style={{
              flex: "1 0 0",
              minWidth: 140,
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 6,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: seg.type === "drive" ? DRIVE_BG_TINT : primaryBgTint,
              }}>
                {seg.type === "drive" ? <Car size={16} color={DRIVE_COLOR} /> : <Plane size={16} color={primaryHex} />}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#111827", lineHeight: 1.4 }}>
                {seg.from}
              </div>
              <div style={{ fontSize: 9, color: "#9ca3af" }}>to</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#111827", lineHeight: 1.4 }}>
                {seg.to}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 10, color: "#6b7280" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <MapPin size={9} /> {fmtDist(seg.distanceKm)}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Clock size={9} /> {fmtDuration(seg.durationMin)}
                </span>
              </div>
            </div>
            {i < segments.length - 1 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 2px", color: "#d1d5db", fontSize: 16, flexShrink: 0,
              }}>
                ›
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const MapView: React.FC<MapViewProps> = ({
  userLocation,
  routeStops,
  origin,
  destination,
}) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [drivingRoute, setDrivingRoute] = useState<[number, number][] | null>(null);
  const [inlineMap, setInlineMap] = useState<google.maps.Map | null>(null);
  const [modalMap, setModalMap] = useState<google.maps.Map | null>(null);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const onInlineLoad = useCallback((map: google.maps.Map) => setInlineMap(map), []);
  const onModalLoad = useCallback((map: google.maps.Map) => setModalMap(map), []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  // Resolve stops
  const stops: string[] = useMemo(() => {
    if (routeStops && routeStops.length >= 2) return routeStops;
    if (origin && destination) return [origin, destination];
    if (origin) return [origin];
    if (destination) return [destination];
    return [];
  }, [routeStops, origin, destination]);

  const stopCoords = useMemo(
    () =>
      stops
        .map((code) => ({ code, coords: getAirportCoords(code) }))
        .filter((s): s is { code: string; coords: [number, number] } => s.coords !== null),
    [stops]
  );

  const departureCoords = stopCoords.length > 0 ? stopCoords[0].coords : null;

  // Fetch driving route
  const prevRouteKey = useRef("");
  useEffect(() => {
    if (!userLocation?.latitude || !userLocation?.longitude || !departureCoords) {
      setDrivingRoute(null);
      return;
    }
    const userPos: [number, number] = [userLocation.latitude, userLocation.longitude];
    const key = `${userPos[0].toFixed(4)},${userPos[1].toFixed(4)}|${departureCoords[0].toFixed(4)},${departureCoords[1].toFixed(4)}`;
    if (key === prevRouteKey.current) return;
    prevRouteKey.current = key;
    setDrivingRoute([userPos, departureCoords]);
    let cancelled = false;
    fetchDrivingRoute(userPos, departureCoords).then((route) => {
      if (!cancelled) setDrivingRoute(route);
    });
    return () => { cancelled = true; };
  }, [userLocation, departureCoords]);

  const arcs = useMemo(() => {
    const result: [number, number][][] = [];
    for (let i = 0; i < stopCoords.length - 1; i++) {
      result.push(interpolateGreatCircle(stopCoords[i].coords, stopCoords[i + 1].coords));
    }
    return result;
  }, [stopCoords]);

  const allCoords = useMemo(() => {
    const pts: [number, number][] = stopCoords.map((s) => s.coords);
    if (userLocation?.latitude && userLocation?.longitude) {
      pts.push([userLocation.latitude, userLocation.longitude]);
    }
    return pts;
  }, [stopCoords, userLocation]);

  // Build midpoint ruler labels
  const segmentLabels: SegmentLabel[] = useMemo(() => {
    const labels: SegmentLabel[] = [];

    if (userLocation?.latitude && userLocation?.longitude && departureCoords) {
      const userPos: [number, number] = [userLocation.latitude, userLocation.longitude];
      const km = haversineKm(userPos, departureCoords) * 1.3;
      const mid = drivingRoute && drivingRoute.length > 2
        ? drivingRoute[Math.floor(drivingRoute.length / 2)]
        : midpoint(userPos, departureCoords);
      labels.push({
        position: toLatLng(mid),
        distanceKm: km,
        durationMin: (km / AVG_DRIVE_SPEED_KMH) * 60,
        type: "drive",
      });
    }

    for (let i = 0; i < stopCoords.length - 1; i++) {
      const arc = arcs[i];
      const km = haversineKm(stopCoords[i].coords, stopCoords[i + 1].coords);
      const mid = arc && arc.length > 2
        ? arc[Math.floor(arc.length / 2)]
        : midpoint(stopCoords[i].coords, stopCoords[i + 1].coords);
      labels.push({
        position: toLatLng(mid),
        distanceKm: km,
        durationMin: (km / AVG_FLIGHT_SPEED_KMH) * 60,
        type: "flight",
      });
    }

    return labels;
  }, [userLocation, departureCoords, stopCoords, arcs, drivingRoute]);

  // Build route segments for sidebar
  const segments: RouteSegment[] = useMemo(() => {
    const segs: RouteSegment[] = [];
    if (userLocation?.latitude && userLocation?.longitude && departureCoords) {
      const userPos: [number, number] = [userLocation.latitude, userLocation.longitude];
      const km = haversineKm(userPos, departureCoords) * 1.3;
      segs.push({
        type: "drive",
        from: "My Location",
        to: formatAirportCity(stopCoords[0]?.code || ""),
        distanceKm: km,
        durationMin: (km / AVG_DRIVE_SPEED_KMH) * 60,
      });
    }
    for (let i = 0; i < stopCoords.length - 1; i++) {
      const km = haversineKm(stopCoords[i].coords, stopCoords[i + 1].coords);
      segs.push({
        type: "flight",
        from: formatAirportCity(stopCoords[i].code),
        to: formatAirportCity(stopCoords[i + 1].code),
        distanceKm: km,
        durationMin: (km / AVG_FLIGHT_SPEED_KMH) * 60,
      });
    }
    return segs;
  }, [userLocation, departureCoords, stopCoords]);

  const totalKm = segments.reduce((s, seg) => s + seg.distanceKm, 0);
  const totalMin = segments.reduce((s, seg) => s + seg.durationMin, 0);

  const defaultCenter: google.maps.LatLngLiteral = allCoords.length > 0
    ? toLatLng(allCoords[0])
    : { lat: 0, lng: 20 };
  const hasContent = allCoords.length > 0;
  const sharedProps = { stopCoords, arcs, allCoords, userLocation, drivingRoute, segmentLabels };

  if (!isLoaded) {
    return (
      <div className="relative w-full flex items-center justify-center bg-muted/40" style={{ height: 250, borderRadius: "0 0 1rem 1rem" }}>
        <p className="text-xs text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes mapview-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0;   }
        }
        .mapview-pulse-dot {
          position: relative;
        }
        .mapview-pulse-dot::after {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.2;
          animation: mapview-pulse-ring 2s ease-out infinite;
        }
        .mapview-modal-backdrop {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: mapview-fade-in 0.2s ease;
        }
        .mapview-modal-card {
          position: relative;
          width: 100%; max-width: 1100px; height: 85vh;
          border-radius: 1rem; overflow: hidden;
          background: white;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          animation: mapview-slide-up 0.25s ease;
          display: flex; flex-direction: column;
        }
        .mapview-sidebar {
          width: 100%;
          display: flex; flex-direction: column;
          border-top: 1px solid #e5e7eb;
          background: #fafafa;
          overflow: hidden;
          max-height: 35%;
        }
        @keyframes mapview-fade-in {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes mapview-slide-up {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Inline map */}
      <div className="relative w-full" style={{ height: 250 }}>
        <button
          onClick={openModal}
          className="absolute top-3 right-3 z-[500] flex items-center justify-center h-8 w-8 rounded-lg bg-white/90 border border-border shadow-md hover:bg-white transition-colors"
          aria-label="Expand map"
        >
          <Maximize2 className="h-4 w-4 text-foreground" />
        </button>

        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE_INLINE}
          center={defaultCenter}
          zoom={hasContent ? 4 : 2}
          options={MAP_OPTIONS_INLINE}
          onLoad={onInlineLoad}
        >
          <MapContent map={inlineMap} {...sharedProps} />
        </GoogleMap>

        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 rounded-b-2xl pointer-events-none">
            <p className="text-xs text-muted-foreground">No route data yet</p>
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {modalOpen && (
        <div className="mapview-modal-backdrop" onClick={closeModal}>
          <div className="mapview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <button
                onClick={closeModal}
                className="absolute top-3 right-3 z-[600] flex items-center justify-center h-9 w-9 rounded-full bg-white/90 border border-border shadow-md hover:bg-white transition-colors"
                aria-label="Close map"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>

              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE_MODAL}
                center={defaultCenter}
                zoom={hasContent ? 4 : 2}
                options={MAP_OPTIONS_MODAL}
                onLoad={onModalLoad}
              >
                <MapContent map={modalMap} {...sharedProps} />
              </GoogleMap>
            </div>

            <RouteSidebar segments={segments} totalKm={totalKm} totalMin={totalMin} />
          </div>
        </div>
      )}
    </>
  );
};

export default MapView;
