import { getLocalStorageValue } from "../../../../lib/utils";

const DEFAULT_FASTAPI_URL = "http://localhost:8000";

function normalizeBaseUrl(value?: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/$/, "");
}

function unique(values: Array<string | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    result.push(value);
  });

  return result;
}

export function getAiBackendCandidates(): string[] {
  const proxyCandidates = [
    normalizeBaseUrl(process.env.REACT_APP_BACKEND_URL as string),
  ];

  const explicitDirect = [
    normalizeBaseUrl(process.env.REACT_APP_FASTAPI_BACKEND_URL as string),
    normalizeBaseUrl(process.env.REACT_APP_FASTAPI_URL as string),
    normalizeBaseUrl(process.env.REACT_APP_AI_BACKEND_DIRECT_URL as string),
    normalizeBaseUrl(process.env.REACT_APP_AI_BACKEND_FALLBACK_URL as string),
  ];

  const configured = normalizeBaseUrl(
    (process.env.REACT_APP_AI_BACKEND_URL as string) || DEFAULT_FASTAPI_URL
  );

  const localFallback =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? DEFAULT_FASTAPI_URL
      : null;

  return unique([
    ...proxyCandidates,
    ...explicitDirect,
    configured,
    localFallback,
  ]);
}

export function getPreferredAiBackendUrl(): string {
  return getAiBackendCandidates()[0] || DEFAULT_FASTAPI_URL;
}

export function toWebSocketUrl(httpUrl: string): string {
  return httpUrl
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");
}

export function getAiWebSocketBaseUrls(): string[] {
  return unique(getAiBackendCandidates().map(toWebSocketUrl));
}

export async function fetchAiWithFallback(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const candidates = getAiBackendCandidates();
  const token =
    typeof window !== "undefined"
      ? (getLocalStorageValue("token") as string | null)
      : null;
  const headers = new Headers(init?.headers || undefined);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${normalizedPath}`, {
        ...init,
        headers,
      });
      if (response.ok) return response;

      lastResponse = response;

      // Retry only when the route is probably missing on an intermediate proxy.
      if (response.status !== 404) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error("AI backend request failed");
}
