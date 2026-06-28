import flightsData from "./data.json";
import flightImg from "./images/flight.jpg";

export type Flight = {
  id: string;
  provider_offer_id?: string;
  metadata?: Record<string, any>;
  airline: string;
  flightNo: string;
  from: string;
  to: string;
  stops: string;
  travelTime: string;
  departure: string;
  arrival: string;
  price: number;
  basePrice: number;
  baggage: string;
  fareNotes: string;
  imageUrl?: string;
  imageUrls?: string[];
};

export const flightsList = flightsData as Flight[];

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const resolveImage = (url?: string) => {
  if (!url) return flightImg;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.includes("flight.jpg")) return flightImg;
  return url;
};

export const formatBaggage = (baggage: any): string => {
  if (!baggage) return "None";
  if (typeof baggage === "string") return baggage;
  if (typeof baggage === "object") {
    const parts = [];
    if (baggage.checked) parts.push(`Checked: ${baggage.checked}`);
    if (baggage.cabinKg) parts.push(`Cabin: ${baggage.cabinKg}`);
    if (baggage.cabin) parts.push(`Cabin: ${baggage.cabin}`);
    return parts.length > 0 ? parts.join(", ") : "Included";
  }
  return String(baggage);
};
