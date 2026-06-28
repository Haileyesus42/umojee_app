import React from "react";
import { motion } from "framer-motion";
import { MapPin, Cloud, CloudRain, Sun, CloudSnow, Wind, Thermometer, CloudLightning, CloudDrizzle, Loader2 } from "lucide-react";
import type { ContextUpdateMessage, MonitoringType } from "../types/phase7";

interface LiveContextBarProps {
  contextUpdates: Partial<Record<MonitoringType, ContextUpdateMessage>>;
  isConnected: boolean;
}

/** Map OWM condition strings to Lucide icons */
function getWeatherIcon(condition: string | undefined) {
  if (!condition) return <Cloud className="h-3.5 w-3.5" />;
  const c = condition.toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return <CloudLightning className="h-3.5 w-3.5" />;
  if (c.includes("snow") || c.includes("sleet")) return <CloudSnow className="h-3.5 w-3.5" />;
  if (c.includes("rain") || c.includes("shower")) return <CloudRain className="h-3.5 w-3.5" />;
  if (c.includes("drizzle")) return <CloudDrizzle className="h-3.5 w-3.5" />;
  if (c.includes("clear") || c.includes("sunny")) return <Sun className="h-3.5 w-3.5" />;
  if (c.includes("wind")) return <Wind className="h-3.5 w-3.5" />;
  return <Cloud className="h-3.5 w-3.5" />;
}

const LiveContextBar: React.FC<LiveContextBarProps> = ({
  contextUpdates,
  isConnected,
}) => {
  const locationUpdate = contextUpdates?.location;
  const weatherUpdate = contextUpdates?.weather;

  const locationData = locationUpdate?.data;
  const weatherData = weatherUpdate?.data;
  const currentWeather = weatherData?.current;

  const city = locationData?.city;
  const country = locationData?.country;
  const locationSource = locationData?.source;
  const isApproxLocation = locationSource === "ipinfo" || locationSource === "mock_data";
  const temp = currentWeather?.temperature_celsius;
  const condition = currentWeather?.condition;
  const humidity = currentWeather?.humidity_percent;
  const windSpeed = currentWeather?.wind_speed_kmh;

  const hasLocation = !!city;
  const hasWeather = temp !== undefined && temp !== null;

  // Nothing to show yet — display a subtle loading state
  if (!hasLocation && !hasWeather) {
    if (!isConnected) return null;
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-[11px] text-muted-foreground/60">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Fetching live data...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden"
    >
      {/* Gradient background with subtle shimmer */}
      <div className="relative bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-emerald-500/10 border-b border-sky-200/20">
        {/* Animated shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse opacity-50" />

        <div className="relative flex items-center justify-between px-4 py-2">
          {/* Location pill */}
          {hasLocation && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5"
            >
              <div className={`flex items-center justify-center h-5 w-5 rounded-full ${isApproxLocation ? "bg-amber-500/15" : "bg-emerald-500/15"}`}>
                <MapPin className={`h-3 w-3 ${isApproxLocation ? "text-amber-600" : "text-emerald-600"}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-foreground leading-tight">
                  {isApproxLocation ? "~ " : ""}{city}{country ? `, ${country}` : ""}
                </span>
                <span className="text-[9px] text-muted-foreground/60 leading-tight">
                  {isApproxLocation ? "Approximate · Enable location" : locationData?.detected_at ? formatTimeAgo(locationData.detected_at) : ""}
                </span>
              </div>
            </motion.div>
          )}

          {/* Weather section */}
          {hasWeather && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              {/* Condition icon + temp */}
              <div className="flex items-center gap-1">
                <div className="text-sky-600">
                  {getWeatherIcon(condition)}
                </div>
                <span className="text-[12px] font-bold text-foreground tabular-nums">
                  {Math.round(temp)}°C
                </span>
              </div>

              {/* Divider */}
              <div className="h-3 w-px bg-border/50" />

              {/* Condition text */}
              <span className="text-[10px] text-muted-foreground capitalize max-w-[80px] truncate">
                {condition || "—"}
              </span>

              {/* Humidity / wind as tiny pills */}
              {(humidity !== undefined || windSpeed !== undefined) && (
                <>
                  <div className="h-3 w-px bg-border/50" />
                  <div className="flex items-center gap-1.5">
                    {humidity !== undefined && (
                      <span className="text-[9px] text-muted-foreground/70 tabular-nums">
                        {humidity}%
                      </span>
                    )}
                    {windSpeed !== undefined && (
                      <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/70 tabular-nums">
                        <Wind className="h-2.5 w-2.5" />
                        {Math.round(windSpeed)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Fallback: only location, no weather yet */}
          {hasLocation && !hasWeather && isConnected && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
              <Thermometer className="h-3 w-3" />
              <span>Loading weather...</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/** Format ISO date to a relative "X ago" string */
function formatTimeAgo(isoDate: string): string {
  try {
    const diff = Date.now() - new Date(isoDate).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  } catch {
    return "";
  }
}

export default LiveContextBar;
