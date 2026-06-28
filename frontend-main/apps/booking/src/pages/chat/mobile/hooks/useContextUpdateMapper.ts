import { useCallback } from "react";
import type {
  TimelineData,
  TimelineSegment,
  RiskLevel,
  BannerConfig,
  ReliabilityFactor,
  NotificationPriority,
  MonitoringType,
  ContextUpdateMessage,
} from "../types/phase7";

// =============================================================================
// Helpers
// =============================================================================

function isFlightSegment(segment: TimelineSegment): boolean {
  return (
    segment.id === "airport_to_flight" ||
    segment.id === "flight_to_hotel" ||
    (segment.type === "transport" &&
      (segment.title?.toLowerCase().includes("flight") ?? false))
  );
}

function isTransportSegment(segment: TimelineSegment): boolean {
  return (
    segment.type === "transport" ||
    segment.id === "home_to_airport" ||
    segment.id === "return"
  );
}

function isActivityOrAccommodationSegment(segment: TimelineSegment): boolean {
  return (
    segment.type === "activity" ||
    segment.type === "accommodation" ||
    segment.id === "hotel_to_activities"
  );
}

function isSevereWeather(current: any): boolean {
  if (!current) return false;
  const condition = (current.condition || "").toLowerCase();
  const severe = [
    "thunderstorm",
    "tornado",
    "hurricane",
    "blizzard",
    "heavy rain",
    "heavy snow",
  ];
  return (
    severe.some((s) => condition.includes(s)) ||
    (current.wind_speed_kmh ?? 0) > 60
  );
}

const RISK_ORDER: RiskLevel[] = ["on_track", "watch", "action_needed"];

function escalateRisk(current: RiskLevel, candidate: RiskLevel): RiskLevel {
  return RISK_ORDER.indexOf(candidate) > RISK_ORDER.indexOf(current)
    ? candidate
    : current;
}

// =============================================================================
// Hook
// =============================================================================

export function useContextUpdateMapper() {
  const applyUpdatesToTimeline = useCallback(
    (
      timeline: TimelineData,
      updates: Partial<Record<MonitoringType, ContextUpdateMessage>>
    ): TimelineData => {
      const updatedSegments = timeline.segments.map((segment) => {
        const updated = { ...segment };

        // Flight status -> flight-related segments
        const flightUpdate = updates.flight_status;
        if (flightUpdate && isFlightSegment(segment)) {
          const d = flightUpdate.data;
          const statusLower = (d.status || "").toLowerCase();
          const flightLabel = [d.airline, d.flight_number]
            .filter(Boolean)
            .join(" ");

          if (statusLower === "cancelled") {
            updated.status = "cancelled";
            updated.subtitle = "Flight cancelled";
            updated.confidence = 0;
          } else if (d.delay_minutes > 30) {
            updated.status = "delayed";
            updated.subtitle = `Delayed ${d.delay_minutes} min — ${d.status}`;
          } else if (d.delay_minutes > 0) {
            updated.status = "delayed";
            updated.subtitle = `Minor delay ~${d.delay_minutes} min`;
          } else if (statusLower === "landed" || statusLower === "arrived") {
            updated.status = "completed";
            updated.subtitle = `${flightLabel} arrived`;
            updated.confidence = 100;
          } else if (
            statusLower === "active" ||
            statusLower === "airborne" ||
            statusLower === "departed" ||
            statusLower === "in air"
          ) {
            updated.status = "in_progress";
            updated.subtitle = `${flightLabel} in the air`;
            updated.confidence = 95;
          } else if (statusLower === "boarding") {
            updated.status = "in_progress";
            updated.subtitle = `${flightLabel} boarding`;
          } else if (statusLower === "check-in open") {
            updated.status = "in_progress";
            updated.subtitle = `${flightLabel} — check-in open`;
          } else if (statusLower === "upcoming") {
            updated.subtitle = `${flightLabel} — departing soon`;
          } else if (
            statusLower === "scheduled" ||
            statusLower === "on_time" ||
            statusLower === "confirmed"
          ) {
            updated.subtitle = `${flightLabel} confirmed`;
          }

          // Gate & terminal details
          const gate =
            d.gate && d.gate !== "TBD" ? d.gate : "";
          const terminal =
            d.terminal && d.terminal !== "Unknown" ? d.terminal : "";
          if (gate || terminal) {
            updated.details = [
              ...(updated.details || []).filter(
                (x: string) =>
                  !x.startsWith("Gate:") && !x.startsWith("Terminal:")
              ),
              ...(gate ? [`Gate: ${gate}`] : []),
              ...(terminal ? [`Terminal: ${terminal}`] : []),
            ];
          }

          if (d.delay_minutes > 0) {
            updated.confidence = Math.max(
              50,
              (updated.confidence ?? 85) - d.delay_minutes / 2
            );
          }
        }

        // Traffic -> transport segments
        const trafficUpdate = updates.traffic;
        if (trafficUpdate && isTransportSegment(segment)) {
          const d = trafficUpdate.data;
          if (d.conditions === "heavy") {
            updated.confidence = Math.max(
              50,
              (updated.confidence ?? 85) - 15
            );
            updated.subtitle = `Heavy traffic - ${d.current_duration_minutes} min (+${d.delay_minutes} min delay)`;
          } else if (d.conditions === "moderate") {
            updated.confidence = Math.max(
              60,
              (updated.confidence ?? 85) - 5
            );
          }
        }

        // Weather -> activity/accommodation segments
        const weatherUpdate = updates.weather;
        if (weatherUpdate && isActivityOrAccommodationSegment(segment)) {
          const current = weatherUpdate.data.current;
          if (current && isSevereWeather(current)) {
            updated.confidence = Math.max(
              40,
              (updated.confidence ?? 80) - 20
            );
          }
        }

        return updated;
      });

      // Recalculate overall reliability
      const avgConfidence =
        updatedSegments.reduce((sum, s) => sum + (s.confidence ?? 80), 0) /
        updatedSegments.length;

      const hasDelayed = updatedSegments.some((s) => s.status === "delayed");
      const hasCancelled = updatedSegments.some(
        (s) => s.status === "cancelled"
      );
      const hasBlocked = updatedSegments.some((s) => s.status === "blocked");

      let overallStatus: RiskLevel = "on_track";
      if (hasCancelled || hasBlocked) {
        overallStatus = "action_needed";
      } else if (hasDelayed || avgConfidence < 75) {
        overallStatus = "watch";
      }

      return {
        ...timeline,
        segments: updatedSegments,
        reliability: Math.round(avgConfidence),
        confidence: Math.round(avgConfidence),
        overallStatus,
      };
    },
    []
  );

  const generateBanners = useCallback(
    (
      updates: Partial<Record<MonitoringType, ContextUpdateMessage>>
    ): BannerConfig[] => {
      const banners: BannerConfig[] = [];

      const flight = updates.flight_status;
      if (flight) {
        const d = flight.data;
        const flightLabel = [d.airline, d.flight_number]
          .filter(Boolean)
          .join(" ");
        const routeLabel = [d.departure_airport, d.arrival_airport]
          .filter(Boolean)
          .join(" → ");

        // Helper: format an ISO datetime to a short readable string
        const fmtTime = (iso?: string) => {
          if (!iso) return "";
          try {
            const dt = new Date(iso);
            return dt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch {
            return iso;
          }
        };

        const status = (d.status || "").toLowerCase();
        const delayMin = d.delay_minutes ?? 0;
        const gate = d.gate && d.gate !== "TBD" ? d.gate : "";
        const terminal =
          d.terminal && d.terminal !== "Unknown" ? d.terminal : "";

        if (status === "cancelled") {
          banners.push({
            id: "flight_status",
            priority: "action_required" as NotificationPriority,
            title: `${flightLabel || "Flight"} Cancelled`,
            message: `Your flight${routeLabel ? ` (${routeLabel})` : ""} has been cancelled. Please contact the airline for rebooking options.`,
            actionLabel: "Get Help",
          });
        } else if (delayMin > 30) {
          const newDep = fmtTime(d.estimated_departure);
          banners.push({
            id: "flight_status",
            priority: "action_required" as NotificationPriority,
            title: `${flightLabel || "Flight"} Delayed ${delayMin} min`,
            message: `${routeLabel ? `${routeLabel} — ` : ""}New departure: ${newDep || "TBD"}${gate ? `. Gate ${gate}` : ""}${terminal ? ` (Terminal ${terminal})` : ""}`,
          });
        } else if (delayMin > 0) {
          const newDep = fmtTime(d.estimated_departure);
          banners.push({
            id: "flight_status",
            priority: "reminder" as NotificationPriority,
            title: `${flightLabel || "Flight"} — Minor Delay`,
            message: `${routeLabel ? `${routeLabel} — ` : ""}Delayed ~${delayMin} min. Est. departure: ${newDep || "TBD"}${gate ? `. Gate ${gate}` : ""}`,
          });
        } else if (status === "landed" || status === "arrived") {
          const arrTime = fmtTime(d.estimated_arrival || d.scheduled_arrival);
          banners.push({
            id: "flight_status",
            priority: "info" as NotificationPriority,
            title: `${flightLabel || "Flight"} Arrived`,
            message: `Arrived at ${d.arrival_airport || "destination"}${arrTime ? ` at ${arrTime}` : ""}${terminal ? `. Terminal ${terminal}` : ""}. Welcome!`,
          });
        } else if (
          status === "active" ||
          status === "airborne" ||
          status === "in_air" ||
          status === "in air" ||
          status === "departed"
        ) {
          const depTime = fmtTime(d.actual_departure || d.estimated_departure);
          const arrTime = fmtTime(d.estimated_arrival);
          banners.push({
            id: "flight_status",
            priority: "info" as NotificationPriority,
            title: `${flightLabel || "Flight"} In the Air`,
            message: `${routeLabel ? `${routeLabel} — ` : ""}Departed${depTime ? ` at ${depTime}` : ""}${arrTime ? `. Expected arrival: ${arrTime}` : ""}`,
          });
        } else if (status === "boarding") {
          banners.push({
            id: "flight_status",
            priority: "reminder" as NotificationPriority,
            title: `${flightLabel || "Flight"} Boarding Now`,
            message: `${routeLabel ? `${routeLabel} — ` : ""}Boarding is in progress${gate ? ` at Gate ${gate}` : ""}${terminal ? ` (Terminal ${terminal})` : ""}. Head to the gate!`,
          });
        } else if (status === "check-in open") {
          const depTime = fmtTime(d.scheduled_departure);
          banners.push({
            id: "flight_status",
            priority: "reminder" as NotificationPriority,
            title: `${flightLabel || "Flight"} — Check-in Open`,
            message: `${routeLabel ? `${routeLabel} — ` : ""}Departing${depTime ? ` at ${depTime}` : ""}. Online check-in is now available!`,
          });
        } else if (status === "upcoming") {
          const depTime = fmtTime(d.scheduled_departure);
          banners.push({
            id: "flight_status",
            priority: "info" as NotificationPriority,
            title: `${flightLabel || "Flight"} — Upcoming`,
            message: `${routeLabel ? `${routeLabel} — ` : ""}Departing${depTime ? ` at ${depTime}` : ""}. Departing within 48 hours.${d.booking_reference ? ` Ref: ${d.booking_reference}` : ""}`,
          });
        } else if (
          status === "scheduled" ||
          status === "on_time" ||
          status === "confirmed"
        ) {
          const depTime = fmtTime(d.scheduled_departure);
          const depDate = d.scheduled_departure
            ? (() => {
                try {
                  return new Date(d.scheduled_departure).toLocaleDateString(
                    [],
                    { month: "short", day: "numeric", year: "numeric" }
                  );
                } catch {
                  return "";
                }
              })()
            : "";
          banners.push({
            id: "flight_status",
            priority: "info" as NotificationPriority,
            title: `${flightLabel || "Flight"} Confirmed`,
            message: `${routeLabel ? `${routeLabel} — ` : ""}${depDate ? `${depDate}` : ""}${depTime ? ` at ${depTime}` : ""}${d.booking_reference ? `. Ref: ${d.booking_reference}` : ""}${d.is_connecting ? ` (${d.segments_count} segments)` : ""}`,
          });
        } else {
          // Generic fallback for any other status
          const depTime = fmtTime(
            d.estimated_departure || d.scheduled_departure
          );
          banners.push({
            id: "flight_status",
            priority: "info" as NotificationPriority,
            title: `${flightLabel || "Flight"} — ${d.status || "Update"}`,
            message: `${routeLabel ? `${routeLabel}` : ""}${depTime ? ` — Departure: ${depTime}` : ""}${gate ? `. Gate ${gate}` : ""}${terminal ? ` (Terminal ${terminal})` : ""}`,
          });
        }

        // Separate gate notification only when it's a meaningful update
        if (gate) {
          banners.push({
            id: "gate_info",
            priority: "reminder" as NotificationPriority,
            title: "Gate Assignment",
            message: `${flightLabel || "Your flight"}: Gate ${gate}${terminal ? `, Terminal ${terminal}` : ""}`,
          });
        }
      }

      const traffic = updates.traffic;
      if (traffic && traffic.data.conditions) {
        const cond = traffic.data.conditions;
        const route = traffic.data.recommended_route;
        const etaMin = traffic.data.current_duration_minutes;
        const distKm = traffic.data.distance_km;
        const delayMin = traffic.data.delay_minutes ?? 0;

        if (cond === "heavy") {
          banners.push({
            id: "traffic_update",
            priority: "warning" as NotificationPriority,
            title: "Heavy Traffic Alert",
            message: `Expect ${delayMin} min extra travel time${route ? ` via ${route}` : ""}. ETA ${etaMin} min (${distKm} km). Leave earlier if possible.`,
          });
        } else if (cond === "moderate") {
          banners.push({
            id: "traffic_update",
            priority: "reminder" as NotificationPriority,
            title: "Moderate Traffic",
            message: `ETA ${etaMin} min (+${delayMin} min delay)${route ? ` via ${route}` : ""}. Distance: ${distKm} km.`,
          });
        } else {
          banners.push({
            id: "traffic_update",
            priority: "info" as NotificationPriority,
            title: "Traffic Clear",
            message: `ETA ${etaMin} min${route ? ` via ${route}` : ""}. Distance: ${distKm} km. Roads are clear.`,
          });
        }
      }

      const weather = updates.weather;
      if (weather) {
        const current = weather.data.current;
        if (current && isSevereWeather(current)) {
          banners.push({
            id: `weather_severe_${weather.timestamp}`,
            priority: "reminder" as NotificationPriority,
            title: "Weather Advisory",
            message: `${current.condition}: ${current.description}. Temperature ${current.temperature_celsius}\u00B0C.`,
          });
        }
      }

      const airport = updates.airport_conditions;
      if (airport) {
        const security = airport.data.security;
        if (security && security.average_wait_minutes > 30) {
          banners.push({
            id: `airport_security_${airport.timestamp}`,
            priority: "reminder" as NotificationPriority,
            title: "Long Security Wait",
            message: `Estimated security wait: ${security.average_wait_minutes} minutes. Arrive early.`,
          });
        }
      }

      return banners;
    },
    []
  );

  const computeRiskLevel = useCallback(
    (
      updates: Partial<Record<MonitoringType, ContextUpdateMessage>>
    ): { level: RiskLevel; message: string; details: string[] } => {
      const details: string[] = [];
      let highestRisk: RiskLevel = "on_track";

      const flight = updates.flight_status;
      if (flight) {
        const flightStatus = (flight.data.status || "").toLowerCase();
        const delayMin = flight.data.delay_minutes ?? 0;
        if (flightStatus === "cancelled") {
          highestRisk = escalateRisk(highestRisk, "action_needed");
          details.push("Flight has been cancelled");
        } else if (delayMin > 60) {
          highestRisk = escalateRisk(highestRisk, "action_needed");
          details.push(`Flight delayed ${delayMin} minutes`);
        } else if (delayMin > 15) {
          highestRisk = escalateRisk(highestRisk, "watch");
          details.push(`Flight delayed ${delayMin} minutes`);
        } else if (
          flightStatus === "landed" ||
          flightStatus === "arrived"
        ) {
          details.push("Flight has arrived");
        } else if (
          flightStatus === "active" ||
          flightStatus === "airborne" ||
          flightStatus === "departed" ||
          flightStatus === "in air"
        ) {
          details.push("Flight is in the air");
        } else if (flightStatus === "check-in open") {
          details.push("Check-in is open — departs within 24h");
        } else if (flightStatus === "upcoming") {
          details.push("Flight departing within 48 hours");
        } else if (
          flightStatus === "confirmed" ||
          flightStatus === "scheduled"
        ) {
          details.push("Booking confirmed");
        } else if (delayMin > 0) {
          details.push(`Flight has a minor delay (~${delayMin} min)`);
        } else {
          details.push(`Flight status: ${flight.data.status || "confirmed"}`);
        }
      }

      const traffic = updates.traffic;
      if (traffic) {
        if (traffic.data.conditions === "heavy") {
          highestRisk = escalateRisk(highestRisk, "watch");
          details.push(`Heavy traffic: +${traffic.data.delay_minutes} min`);
        }
      }

      const weather = updates.weather;
      if (weather?.data?.current && isSevereWeather(weather.data.current)) {
        highestRisk = escalateRisk(highestRisk, "watch");
        details.push(`Severe weather: ${weather.data.current.condition}`);
      }

      const messages: Record<RiskLevel, string> = {
        on_track: "Everything looks good",
        watch: "Some conditions need monitoring",
        action_needed: "Immediate attention required",
      };

      return { level: highestRisk, message: messages[highestRisk], details };
    },
    []
  );

  const extractReliabilityFactors = useCallback(
    (
      updates: Partial<Record<MonitoringType, ContextUpdateMessage>>
    ): ReliabilityFactor[] => {
      const factors: ReliabilityFactor[] = [];

      const flight = updates.flight_status;
      if (flight) {
        const delay = flight.data.delay_minutes ?? 0;
        const flightStatus = (flight.data.status || "").toLowerCase();
        const flightLabel = [flight.data.airline, flight.data.flight_number]
          .filter(Boolean)
          .join(" ");

        if (flightStatus === "cancelled") {
          factors.push({
            label: "Flight Status",
            impact: "negative",
            description: `${flightLabel || "Flight"} cancelled`,
          });
        } else if (flightStatus === "landed" || flightStatus === "arrived") {
          factors.push({
            label: "Flight Status",
            impact: "positive",
            description: `${flightLabel || "Flight"} arrived`,
          });
        } else if (delay === 0) {
          const statusDesc =
            flightStatus === "active" || flightStatus === "departed" || flightStatus === "in air"
              ? "in the air"
              : flightStatus === "check-in open"
                ? "check-in open"
                : flightStatus === "upcoming"
                  ? "departing soon"
                  : "confirmed";
          factors.push({
            label: "Flight Status",
            impact: "positive",
            description: `${flightLabel || "Flight"} — ${statusDesc}`,
          });
        } else if (delay <= 30) {
          factors.push({
            label: "Flight Status",
            impact: "neutral",
            description: `${flightLabel || "Flight"} — minor delay: ${delay} min`,
          });
        } else {
          factors.push({
            label: "Flight Status",
            impact: "negative",
            description: `${flightLabel || "Flight"} — delayed ${delay} min`,
          });
        }
      }

      const traffic = updates.traffic;
      if (traffic) {
        const cond = traffic.data.conditions;
        factors.push({
          label: "Traffic Conditions",
          impact:
            cond === "light"
              ? "positive"
              : cond === "moderate"
                ? "neutral"
                : "negative",
          description: `${cond} traffic - ${traffic.data.current_duration_minutes} min ETA`,
        });
      }

      const weather = updates.weather;
      if (weather?.data?.current) {
        const current = weather.data.current;
        const severe = isSevereWeather(current);
        factors.push({
          label: "Weather",
          impact: severe ? "negative" : "positive",
          description: `${current.condition}, ${current.temperature_celsius}\u00B0C`,
        });
      }

      const airport = updates.airport_conditions;
      if (airport) {
        const wait = airport.data.security?.average_wait_minutes ?? 0;
        factors.push({
          label: "Airport Conditions",
          impact: wait > 30 ? "negative" : wait > 15 ? "neutral" : "positive",
          description: `Security wait: ~${wait} min, ${airport.data.congestion?.overall_level ?? "unknown"} congestion`,
        });
      }

      return factors;
    },
    []
  );

  return {
    applyUpdatesToTimeline,
    generateBanners,
    computeRiskLevel,
    extractReliabilityFactors,
  };
}
