import AIRPORT_CITY_MAP from "./airportCityMap";
import AIRPORT_COORDS from "./airportCoordinates";

export interface AirportEntry {
  code: string; // IATA code, e.g. "JFK"
  cityName: string; // Full display name, e.g. "New York JFK"
  baseCity: string; // Extracted base city, e.g. "New York"
  coords: [number, number] | null;
}

export interface CityGroup {
  city: string; // Base city name
  airports: AirportEntry[];
}

/**
 * Explicit mapping for airports whose base city differs from their display name prefix.
 * e.g. "Newark" (EWR) belongs to the "New York" metro area.
 */
const METRO_AREA_ALIASES: Record<string, string> = {
  EWR: "New York",
  OAK: "San Francisco",
  SJC: "San Francisco",
  CIA: "Rome",
  SAW: "Istanbul",
  PKX: "Beijing",
  SHA: "Shanghai",
  ORY: "Paris",
  LGW: "London",
  LTN: "London",
  STN: "London",
  EZE: "Buenos Aires",
};

/**
 * Known airport-name suffixes to strip when extracting the base city.
 * Order matters — longer / more specific suffixes first.
 */
const AIRPORT_SUFFIXES = [
  "Sheremetyevo",
  "Fiumicino",
  "Ciampino",
  "Malpensa",
  "Heathrow",
  "Gatwick",
  "Stansted",
  "Luton",
  "LaGuardia",
  "Incheon",
  "Kansai",
  "Haneda",
  "Narita",
  "Capital",
  "Daxing",
  "Pudong",
  "Hongqiao",
  "Sabiha",
  "Ezeiza",
  "Reagan",
  "Dulles",
  "O'Hare",
  "CDG",
  "Orly",
  "JFK",
  "CR",
];

function extractBaseCity(code: string, displayName: string): string {
  // Check explicit aliases first
  if (METRO_AREA_ALIASES[code]) return METRO_AREA_ALIASES[code];

  // Try stripping known suffixes
  for (const suffix of AIRPORT_SUFFIXES) {
    if (displayName.endsWith(` ${suffix}`)) {
      return displayName.slice(0, -(suffix.length + 1)).trim();
    }
  }

  // Fallback: the full display name IS the city name
  return displayName;
}

// Build the city index once at module load
function buildCityIndex(): Map<string, AirportEntry[]> {
  const index = new Map<string, AirportEntry[]>();

  for (const [code, cityName] of Object.entries(AIRPORT_CITY_MAP)) {
    const baseCity = extractBaseCity(code, cityName);
    const entry: AirportEntry = {
      code,
      cityName,
      baseCity,
      coords: AIRPORT_COORDS[code] ?? null,
    };

    const existing = index.get(baseCity);
    if (existing) {
      existing.push(entry);
    } else {
      index.set(baseCity, [entry]);
    }
  }

  // Sort airports within each city alphabetically by display name
  Array.from(index.keys()).forEach((key) => {
    const airports = index.get(key)!;
    airports.sort((a: AirportEntry, b: AirportEntry) => a.cityName.localeCompare(b.cityName));
  });

  return index;
}

const CITY_INDEX = buildCityIndex();

/** All city groups, sorted alphabetically by city name. */
export const ALL_CITY_GROUPS: CityGroup[] = Array.from(CITY_INDEX.keys())
  .map((city) => ({ city, airports: CITY_INDEX.get(city)! }))
  .sort((a: CityGroup, b: CityGroup) => a.city.localeCompare(b.city));

/**
 * Search cities/airports by query string. Matches against:
 * - Base city name (prefix + substring)
 * - IATA code (exact prefix)
 * - Full airport display name (substring)
 *
 * Returns matching CityGroups, prefix matches first.
 */
export function searchCities(query: string): CityGroup[] {
  if (!query.trim()) return ALL_CITY_GROUPS.slice(0, 15); // Show top 15 when empty

  const q = query.toLowerCase().trim();

  const prefixMatches: CityGroup[] = [];
  const substringMatches: CityGroup[] = [];

  for (const group of ALL_CITY_GROUPS) {
    const cityLower = group.city.toLowerCase();

    // Check if the base city starts with the query (strongest match)
    if (cityLower.startsWith(q)) {
      prefixMatches.push(group);
      continue;
    }

    // Check if the city contains the query as a substring
    if (cityLower.includes(q)) {
      substringMatches.push(group);
      continue;
    }

    // Check IATA code prefix match
    const codeMatch = group.airports.some((a) =>
      a.code.toLowerCase().startsWith(q)
    );
    if (codeMatch) {
      substringMatches.push(group);
      continue;
    }

    // Check full airport display name
    const nameMatch = group.airports.some((a) =>
      a.cityName.toLowerCase().includes(q)
    );
    if (nameMatch) {
      substringMatches.push(group);
    }
  }

  return [...prefixMatches, ...substringMatches].slice(0, 20);
}

/**
 * Format an airport code as "City (CODE)".
 * e.g. "JFK" → "New York (JFK)"
 */
export function formatCityAirport(code: string): string {
  const upperCode = code.toUpperCase().trim();
  for (const group of ALL_CITY_GROUPS) {
    const airport = group.airports.find((a) => a.code === upperCode);
    if (airport) {
      // For multi-airport cities, use the specific airport name
      if (group.airports.length > 1) {
        return `${airport.cityName} (${airport.code})`;
      }
      return `${group.city} (${airport.code})`;
    }
  }
  return code;
}

/**
 * Parse a display string like "New York (JFK)" into { city, code }.
 * Returns null if the string doesn't match the expected pattern.
 */
export function parseAirportSelection(
  value: string
): { city: string; code: string } | null {
  const match = value.match(/^(.+?)\s*\(([A-Z]{3})\)$/);
  if (!match) return null;
  return { city: match[1].trim(), code: match[2] };
}

/**
 * Check if a display value corresponds to a valid airport in our database.
 */
export function isValidAirportSelection(value: string): boolean {
  const parsed = parseAirportSelection(value);
  if (!parsed) return false;
  return AIRPORT_CITY_MAP[parsed.code] !== undefined;
}

/**
 * Try to find an airport code from a city name string.
 * Useful for resolving a home location city to its nearest airport.
 * Returns the first matching airport entry, or null.
 */
export function findAirportByCity(cityName: string): AirportEntry | null {
  if (!cityName) return null;
  const q = cityName.toLowerCase().trim();

  // Exact match on base city
  for (const group of ALL_CITY_GROUPS) {
    if (group.city.toLowerCase() === q) {
      return group.airports[0];
    }
  }

  // Prefix match
  for (const group of ALL_CITY_GROUPS) {
    if (group.city.toLowerCase().startsWith(q)) {
      return group.airports[0];
    }
  }

  // Substring match
  for (const group of ALL_CITY_GROUPS) {
    if (group.city.toLowerCase().includes(q)) {
      return group.airports[0];
    }
  }

  return null;
}
