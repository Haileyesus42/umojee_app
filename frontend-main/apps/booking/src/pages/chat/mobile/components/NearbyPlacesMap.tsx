import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  OverlayView,
  OverlayViewF,
  useJsApiLoader,
  StandaloneSearchBox,
} from "@react-google-maps/api";
import { X, Star, MapPin, Navigation, Loader2, Search } from "lucide-react";
import { fetchAiWithFallback } from "../utils/aiBackend";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
import type { NearbyPlace } from "../hooks/useNearbyPlaces";
export type { NearbyPlace };

interface NearbyPlacesMapProps {
  open: boolean;
  onClose: () => void;
  externalPlaces?: NearbyPlace[];
  externalUserLocation?: { lat: number; lng: number } | null;
  externalLoading?: boolean;
  focusedPlace?: NearbyPlace | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GOOGLE_MAPS_API_KEY =
  (process.env.REACT_APP_GOOGLE_MAPS_API_KEY as string) || "";

const TYPE_COLORS: Record<string, string> = {
  restaurant: "#ef4444",
  lodging: "#3b82f6",
  library: "#8b5cf6",
  park: "#22c55e",
  cafe: "#f59e0b",
  museum: "#ec4899",
};

const LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurants",
  lodging: "Hotels",
  library: "Libraries",
  park: "Parks",
  cafe: "Cafés",
  museum: "Museums",
};

const MAP_CONTAINER_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
};

const MAP_OPTIONS: google.maps.MapOptions = {
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: "greedy",
  mapTypeId: "roadmap",
};

// ---------------------------------------------------------------------------
// Place marker overlay
// ---------------------------------------------------------------------------
function PlaceMarker({
  place,
  selected,
  onClick,
}: {
  place: NearbyPlace;
  selected: boolean;
  onClick: () => void;
}) {
  const color = TYPE_COLORS[place.type] || "#6b7280";

  return (
    <OverlayViewF
      position={{ lat: place.latitude, lng: place.longitude }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        onClick={onClick}
        style={{
          transform: "translate(-50%, -100%)",
          cursor: "pointer",
          transition: "transform 0.15s ease",
          ...(selected ? { transform: "translate(-50%, -100%) scale(1.15)", zIndex: 10 } : {}),
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50% 50% 50% 0",
            background: color,
            transform: "rotate(-45deg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: selected
              ? `0 0 0 2px white, 0 0 0 4px ${color}`
              : "0 1px 4px rgba(0,0,0,0.3)",
          }}
        >
          <span
            style={{
              transform: "rotate(45deg)",
              fontSize: 10,
              lineHeight: 1,
            }}
          >
            {place.type === "restaurant" && "🍽️"}
            {place.type === "lodging" && "🏨"}
            {place.type === "library" && "📚"}
            {place.type === "park" && "🌳"}
            {place.type === "cafe" && "☕"}
            {place.type === "museum" && "🏛️"}
          </span>
        </div>
      </div>
    </OverlayViewF>
  );
}

// ---------------------------------------------------------------------------
// User location pulsing dot
// ---------------------------------------------------------------------------
function UserDot({ position }: { position: google.maps.LatLngLiteral }) {
  return (
    <OverlayViewF
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div style={{ transform: "translate(-50%, -50%)" }}>
        <div className="nearby-pulse-dot" style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#3b82f6",
          border: "3px solid white",
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
        }} />
      </div>
    </OverlayViewF>
  );
}

// ---------------------------------------------------------------------------
// Place card (selected info)
// ---------------------------------------------------------------------------
function PlaceCard({ place, onClose }: { place: NearbyPlace; onClose: () => void }) {
  const color = TYPE_COLORS[place.type] || "#6b7280";

  return (
    <OverlayViewF
      position={{ lat: place.latitude, lng: place.longitude }}
      mapPaneName={OverlayView.FLOAT_PANE}
    >
      <div
        style={{
          transform: "translate(-50%, calc(-100% - 32px))",
          width: 240,
          background: "white",
          borderRadius: 14,
          boxShadow: "0 8px 28px rgba(0,0,0,0.2)",
          overflow: "hidden",
          animation: "nearby-slide-up 0.2s ease",
          zIndex: 30,
        }}
      >
        {place.photo_url && (
          <div style={{ width: "100%", height: 100, overflow: "hidden" }}>
            <img
              src={place.photo_url}
              alt={place.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
        <div style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {place.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: "white",
                    background: color,
                    padding: "1px 7px",
                    borderRadius: 10,
                    textTransform: "capitalize",
                  }}
                >
                  {TYPE_LABELS[place.type] || place.type}
                </span>
                {place.open_now !== null && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: place.open_now ? "#16a34a" : "#dc2626",
                  }}>
                    {place.open_now ? "Open" : "Closed"}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "none",
                background: "#f3f4f6",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginLeft: 4,
              }}
            >
              <X size={12} color="#6b7280" />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#6b7280" }}>
            <MapPin size={10} />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.vicinity}</span>
          </div>

          {place.rating && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4, fontSize: 11 }}>
              <Star size={10} color="#f59e0b" fill="#f59e0b" />
              <span style={{ fontWeight: 600, color: "#111827" }}>{place.rating}</span>
              {place.user_ratings_total && (
                <span style={{ color: "#9ca3af" }}>
                  ({place.user_ratings_total.toLocaleString()})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Arrow pointing down to marker */}
        <div style={{
          position: "absolute",
          bottom: -8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "8px solid white",
        }} />
      </div>
    </OverlayViewF>
  );
}

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------
function FilterChips({
  activeTypes,
  onToggle,
}: {
  activeTypes: Set<string>;
  onToggle: (type: string) => void;
}) {
  const allTypes = Object.keys(TYPE_LABELS);

  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        left: 0,
        right: 0,
        zIndex: 15,
        display: "flex",
        gap: 6,
        padding: "0 12px",
        overflowX: "auto",
      }}
      className="no-scrollbar"
    >
      {allTypes.map((type) => {
        const active = activeTypes.has(type);
        const color = TYPE_COLORS[type];
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: 20,
              border: `1.5px solid ${active ? color : "#d1d5db"}`,
              background: active ? color : "white",
              color: active ? "white" : "#374151",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            {TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const NearbyPlacesMap: React.FC<NearbyPlacesMapProps> = ({
  open,
  onClose,
  externalPlaces,
  externalUserLocation,
  externalLoading,
  focusedPlace,
}) => {
  const hasExternal = externalPlaces !== undefined;

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [internalPlaces, setInternalPlaces] = useState<NearbyPlace[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalUserLocation, setInternalUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(
    new Set(["restaurant", "lodging", "library", "park", "cafe", "museum"])
  );
  const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);
  const fetchedRef = useRef(false);

  const places = hasExternal ? externalPlaces : internalPlaces;
  const loading = hasExternal ? (externalLoading ?? false) : internalLoading;
  const userLocation = hasExternal ? (externalUserLocation ?? null) : internalUserLocation;

  // Self-fetch only when no external data provided
  useEffect(() => {
    if (hasExternal || !open) {
      fetchedRef.current = false;
      return;
    }
    if (fetchedRef.current) return;

    setInternalLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setInternalLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setInternalUserLocation({ lat: latitude, lng: longitude });
        fetchedRef.current = true;

        try {
          const res = await fetchAiWithFallback(`/api/ai/nearby-places`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude, radius: 3000, limit: 1 }),
          });
          if (!res.ok) throw new Error("Failed to fetch nearby places");
          const data = await res.json();
          setInternalPlaces(data.places || []);
        } catch (err: any) {
          setError(err.message || "Failed to load nearby places");
        } finally {
          setInternalLoading(false);
        }
      },
      () => {
        setError("Unable to get your location. Please enable location access.");
        setInternalLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [open, hasExternal]);

  // Auto-select & center on focused place when popup opens
  useEffect(() => {
    if (!open || !focusedPlace) return;
    setSelectedPlace(focusedPlace);
    // Turn off all filters — only the focused place marker will show
    setActiveTypes(new Set());
  }, [open, focusedPlace]);

  // Center map on focused place
  useEffect(() => {
    if (!map || !focusedPlace || !open) return;
    map.panTo({ lat: focusedPlace.latitude, lng: focusedPlace.longitude });
    map.setZoom(16);
  }, [map, focusedPlace, open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onMapLoad = useCallback((m: google.maps.Map) => setMap(m), []);

  const onSearchBoxLoad = useCallback((ref: google.maps.places.SearchBox) => {
    setSearchBox(ref);
  }, []);

  const onPlacesChanged = useCallback(() => {
    if (!searchBox || !map) return;
    const places = searchBox.getPlaces();
    if (!places || places.length === 0) return;

    const place = places[0];
    if (!place.geometry || !place.geometry.location) return;

    map.panTo(place.geometry.location);
    map.setZoom(16);

    // Create a temporary NearbyPlace from search result to show info card
    const searchNearby: NearbyPlace = {
      place_id: place.place_id || String(Math.random()),
      name: place.name || "Search Result",
      type: place.types?.[0] || "point_of_interest",
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
      rating: place.rating || null,
      user_ratings_total: place.user_ratings_total || null,
      vicinity: place.vicinity || place.formatted_address || "",
      photo_url: place.photos?.[0]?.getUrl() || null,
      icon: place.icon || "",
      open_now: (place as any).opening_hours?.isOpen() ?? null,
    };

    setSelectedPlace(searchNearby);
  }, [searchBox, map]);

  const handleSearchThisArea = useCallback(async () => {
    if (!map) return;
    const center = map.getCenter();
    if (!center) return;

    const latitude = center.lat();
    const longitude = center.lng();

    setInternalLoading(true);
    try {
      const res = await fetchAiWithFallback(`/api/ai/nearby-places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, radius: 3000, limit: 1 }),
      });
      if (!res.ok) throw new Error("Failed to fetch nearby places");
      const data = await res.json();
      setInternalPlaces(data.places || []);
      setInternalUserLocation({ lat: latitude, lng: longitude });
    } catch (err: any) {
      setError(err.message || "Failed to search this area");
    } finally {
      setInternalLoading(false);
    }
  }, [map]);

  // Fit bounds when places loaded
  useEffect(() => {
    if (!map || !userLocation) return;
    if (places.length === 0) {
      map.setCenter(userLocation);
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(userLocation);
    places.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
    map.fitBounds(bounds, { top: 80, right: 30, bottom: 120, left: 30 });
  }, [map, places, userLocation]);

  const filteredPlaces = useMemo(
    () => places.filter((p) => activeTypes.has(p.type)),
    [places, activeTypes]
  );

  const handleToggleType = useCallback((type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
    setSelectedPlace(null);
  }, []);

  if (!open) return null;

  return (
    <>
      <style>{`
        .nearby-modal-backdrop {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          padding: 0;
          animation: nearby-fade-in 0.2s ease;
        }
        .nearby-modal-card {
          position: relative;
          width: 100%; height: 100%;
          max-width: 480px;
          overflow: hidden;
          background: white;
          animation: nearby-slide-up 0.25s ease;
          display: flex; flex-direction: column;
        }
        .nearby-pulse-dot {
          position: relative;
        }
        .nearby-pulse-dot::after {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          background: #3b82f6;
          opacity: 0.25;
          animation: nearby-pulse-ring 2s ease-out infinite;
        }
        @keyframes nearby-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.4; }
          100% { transform: scale(2.5); opacity: 0;   }
        }
        @keyframes nearby-fade-in {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes nearby-slide-up {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div className="nearby-modal-backdrop" onClick={onClose}>
        <div className="nearby-modal-card" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0.8))",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Navigation size={18} color="#3b82f6" />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                Nearby Places
              </span>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "none",
                background: "rgba(0,0,0,0.06)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} color="#374151" />
            </button>
          </div>

          {/* Filter chips */}
          {places.length > 0 && (
            <FilterChips activeTypes={activeTypes} onToggle={handleToggleType} />
          )}

          {/* Map */}
          <div style={{ flex: 1, position: "relative" }}>
            {!isLoaded || loading ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 12,
              }}>
                <Loader2 size={32} color="#3b82f6" className="animate-spin" />
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {!isLoaded ? "Loading map..." : "Finding places near you..."}
                </span>
              </div>
            ) : error ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 8,
                padding: 24,
                textAlign: "center",
              }}>
                <MapPin size={32} color="#dc2626" />
                <span style={{ fontSize: 13, color: "#dc2626" }}>{error}</span>
              </div>
            ) : (
              <>
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={userLocation || { lat: 0, lng: 0 }}
                  zoom={15}
                  options={MAP_OPTIONS}
                  onLoad={onMapLoad}
                >
                  {userLocation && <UserDot position={userLocation} />}
                  {/* Always show the focused place marker */}
                  {focusedPlace && !filteredPlaces.some((p) => p.place_id === focusedPlace.place_id) && (
                    <PlaceMarker
                      key={focusedPlace.place_id}
                      place={focusedPlace}
                      selected={selectedPlace?.place_id === focusedPlace.place_id}
                      onClick={() =>
                        setSelectedPlace(
                          selectedPlace?.place_id === focusedPlace.place_id ? null : focusedPlace
                        )
                      }
                    />
                  )}
                  {filteredPlaces.map((place) => (
                    <PlaceMarker
                      key={place.place_id}
                      place={place}
                      selected={selectedPlace?.place_id === place.place_id}
                      onClick={() =>
                        setSelectedPlace(
                          selectedPlace?.place_id === place.place_id ? null : place
                        )
                      }
                    />
                  ))}
                  {selectedPlace && (
                    <PlaceCard
                      place={selectedPlace}
                      onClose={() => setSelectedPlace(null)}
                    />
                  )}
                </GoogleMap>

                {/* Place count badge */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 80,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(0,0,0,0.7)",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 12px",
                    borderRadius: 16,
                    zIndex: 10,
                  }}
                >
                  {filteredPlaces.length} places found nearby
                </div>

                {/* Bottom Search Bar */}
                {isLoaded && (
                  <div style={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    right: 56,
                    zIndex: 20,
                  }}>
                    <StandaloneSearchBox
                      onLoad={onSearchBoxLoad}
                      onPlacesChanged={onPlacesChanged}
                    >
                      <div style={{ position: "relative" }}>
                        <Search
                          size={16}
                          color="#9ca3af"
                          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
                        />
                        <input
                          type="text"
                          placeholder="Search for any place..."
                          style={{
                            width: "100%",
                            padding: "12px 16px 12px 42px",
                            fontSize: 14,
                            fontWeight: 500,
                            borderRadius: 14,
                            border: "1px solid #e5e7eb",
                            outline: "none",
                            background: "white",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                            transition: "all 0.25s ease",
                            color: "#111827",
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = "#3b82f6";
                            e.target.style.boxShadow = "0 8px 32px rgba(59, 130, 246, 0.2)";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "#e5e7eb";
                            e.target.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                          }}
                        />
                      </div>
                    </StandaloneSearchBox>
                  </div>
                )}

                {/* Search this area button */}
                <button
                  onClick={handleSearchThisArea}
                  style={{
                    position: "absolute",
                    top: 100,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "white",
                    color: "#3b82f6",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "8px 16px",
                    borderRadius: 20,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(-50%) scale(1.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateX(-50%) scale(1.0)"; }}
                >
                  <MapPin size={14} />
                  Search this area
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default NearbyPlacesMap;
