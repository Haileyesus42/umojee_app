import type { ComparisonItem } from "../types/phase7";

type MetadataValue = unknown;

function toTitleCase(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCoordinate(value: unknown): string | null {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num.toFixed(4) : null;
}

function formatAddress(value: MetadataValue): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);

  const raw = value as Record<string, any>;
  const parts: string[] = [];

  if (Array.isArray(raw.lines)) {
    parts.push(...raw.lines.filter((line: unknown) => typeof line === "string" && line.trim()));
  }

  [
    raw.line1,
    raw.line2,
    raw.street,
    raw.district,
    raw.cityName,
    raw.city,
    raw.stateCode,
    raw.state,
    raw.postalCode,
    raw.countryCode,
    raw.country,
  ].forEach((part) => {
    if (typeof part === "string" && part.trim()) {
      parts.push(part);
    }
  });

  return parts.length > 0 ? Array.from(new Set(parts)).join(", ") : null;
}

function formatGeoCode(value: MetadataValue): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);

  const raw = value as Record<string, any>;
  const latitude = formatCoordinate(raw.latitude ?? raw.lat);
  const longitude = formatCoordinate(raw.longitude ?? raw.lng ?? raw.lon);

  if (latitude && longitude) {
    return `${latitude}, ${longitude}`;
  }

  const fallback = Object.values(raw)
    .map((entry) => (typeof entry === "string" || typeof entry === "number" ? String(entry) : ""))
    .filter(Boolean);

  return fallback.length > 0 ? fallback.join(", ") : null;
}

export function formatComparisonMetadataValue(key: string, value: MetadataValue): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (key === "address") {
    return formatAddress(value);
  }

  if (key === "geoCode") {
    return formatGeoCode(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map((entry) => (typeof entry === "string" || typeof entry === "number" ? String(entry) : ""))
      .filter(Boolean);
    return items.length > 0 ? items.join(", ") : null;
  }

  if (typeof value === "object") {
    return null;
  }

  return String(value);
}

export function getFormattedMetadataEntries(metadata: Record<string, any>): Array<{ key: string; label: string; value: string }> {
  return Object.entries(metadata)
    .map(([key, value]) => {
      const formattedValue = formatComparisonMetadataValue(key, value);
      return formattedValue
        ? {
            key,
            label: toTitleCase(key),
            value: formattedValue,
          }
        : null;
    })
    .filter((entry): entry is { key: string; label: string; value: string } => entry !== null);
}

export function getComparisonPreviewEntries(item: ComparisonItem): Array<{ key: string; label: string; value: string }> {
  const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
  const formattedEntries = getFormattedMetadataEntries(metadata);

  if (item.type !== "accommodation") {
    return formattedEntries.slice(0, 2);
  }

  const addressEntry = formattedEntries.find((entry) => entry.key === "address");
  return addressEntry ? [addressEntry] : [];
}
