import { useCallback, useEffect, useRef, useState } from "react";
import { getLocalStorageValue } from "../../../../lib/utils";
import type { ComparisonItem, ComparisonType } from "../types/phase7";
import { fetchAiWithFallback } from "../utils/aiBackend";

const backendUrl =
  (process.env.REACT_APP_BACKEND_URL as string) || "http://localhost:4001";

interface UseDestinationRecommendationsResult {
  comparisonItems: ComparisonItem[];
  comparisonType: ComparisonType;
  isLoading: boolean;
  error: string | null;
  /** Prepend comparison items from an external source (e.g. journey inspiration)
   *  and persist them to the Node server so they show up in history. */
  pushItems: (
    items: ComparisonItem[],
    type?: ComparisonType,
    meta?: { greeting?: string; journeyId?: string },
  ) => void;
  /** Reset internal fetch guard so the next render triggers a fresh fetch. */
  refetch: (options?: { force?: boolean }) => void;
}

/**
 * Build the same user payload that useMobileChat sends to session/new.
 */
function buildUserPayload(userId: string) {
  const user = getLocalStorageValue("user") as any;
  const userName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User"
    : "Guest User";

  const getUserLocation = () => {
    try {
      const raw = localStorage.getItem("user_location");
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" ? parsed : undefined;
    } catch {
      return undefined;
    }
  };

  const location = getUserLocation();
  const userData = user ? { ...user, location } : location ? { location } : undefined;

  const loggedIn = getLocalStorageValue("isLoggedIn");
  const token = getLocalStorageValue("token");
  let isLoggedIn = false;
  if (loggedIn === true || loggedIn === "true") isLoggedIn = true;
  else if (typeof token === "string") isLoggedIn = !!token && token !== "undefined" && token !== "null";
  else isLoggedIn = !!token;

  return {
    user_id: userId,
    user_name: userName,
    username: (getLocalStorageValue("username") as string) || undefined,
    user_data: userData,
    is_logged_in: isLoggedIn,
  };
}

// ─── Parsing helpers (mirrors useMobileChat's parseAiPayload logic) ──────────

/**
 * Try to parse a single string as JSON. Handles markdown-fenced JSON and
 * leading text before the opening brace.
 */
function tryParseJson(raw: string): any | null {
  if (!raw) return null;
  let text = raw.trim();

  // Strip markdown code fences
  if (text.startsWith("```")) {
    text = text.split("\n", 1).length > 1 ? text.split("\n").slice(1).join("\n") : text.slice(3);
    if (text.endsWith("```")) text = text.slice(0, -3).trimEnd();
  }

  // Strategy 1: direct parse
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed;
  } catch { /* fall through */ }

  // Strategy 2: find the first '{' and parse from there
  const idx = text.indexOf("{");
  if (idx >= 0) {
    try {
      const parsed = JSON.parse(text.slice(idx));
      if (parsed && typeof parsed === "object") return parsed;
    } catch { /* fall through */ }
  }

  return null;
}

/**
 * Extract api_response / items from a parsed object.
 * Handles both snake_case (api_response) and camelCase (apiResponse).
 */
function extractApiResponse(obj: any): { apiResponse: any; greeting: string } | null {
  if (!obj || typeof obj !== "object") return null;

  const apiResponse = obj.api_response || obj.apiResponse;
  const items = apiResponse?.items;
  if (Array.isArray(items) && items.length > 0) {
    return {
      apiResponse,
      greeting: obj.ai_generated || obj.message || "",
    };
  }
  return null;
}

type ParsedResult = {
  items: ComparisonItem[];
  comparisonType: ComparisonType;
  greeting: string;
  apiResponse: any;
};

/**
 * Multi-strategy extraction of comparison data from the session/new response.
 * Mirrors the 3-layer parsing in useMobileChat.ts:
 *   1. Parse data.message (JSON string from backend)
 *   2. Parse data.warm_welcome (may also contain JSON)
 *   3. Scan data.messages[] array for AI messages with structured content
 *   4. Check top-level data for api_response
 */
function parseGreetingResponse(data: any): ParsedResult | null {
  if (!data) return null;

  const buildResult = (apiResponse: any, greeting: string): ParsedResult => ({
    items: apiResponse.items as ComparisonItem[],
    comparisonType: (apiResponse.comparison_type || apiResponse.comparisonType || "destination") as ComparisonType,
    greeting,
    apiResponse,
  });

  // Strategy 1: parse data.message
  const messageRaw = typeof data.message === "string" ? data.message : "";
  if (messageRaw) {
    const parsed = tryParseJson(messageRaw);
    const extracted = extractApiResponse(parsed);
    if (extracted) {
      console.log("[DestRec] Parsed from data.message");
      return buildResult(extracted.apiResponse, extracted.greeting);
    }
  }

  // Strategy 2: parse data.warm_welcome
  const warmRaw = typeof data.warm_welcome === "string"
    ? data.warm_welcome
    : Array.isArray(data.warm_welcome)
      ? data.warm_welcome.join("\n")
      : "";
  if (warmRaw) {
    const parsed = tryParseJson(warmRaw);
    const extracted = extractApiResponse(parsed);
    if (extracted) {
      console.log("[DestRec] Parsed from data.warm_welcome");
      return buildResult(extracted.apiResponse, extracted.greeting);
    }
  }

  // Strategy 3: scan data.messages array (AI message content)
  const msgs = Array.isArray(data.messages) ? data.messages : [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const entry = msgs[i];
    if (entry?.role !== "ai") continue;

    const content = entry?.content;
    if (typeof content === "string") {
      const parsed = tryParseJson(content);
      const extracted = extractApiResponse(parsed);
      if (extracted) {
        console.log("[DestRec] Parsed from messages[].content string");
        return buildResult(extracted.apiResponse, extracted.greeting);
      }
    } else if (content && typeof content === "object") {
      const extracted = extractApiResponse(content);
      if (extracted) {
        console.log("[DestRec] Parsed from messages[].content object");
        return buildResult(extracted.apiResponse, extracted.greeting);
      }
    }
  }

  // Strategy 4: top-level api_response on the data object itself
  const topLevel = extractApiResponse(data);
  if (topLevel) {
    console.log("[DestRec] Parsed from top-level data");
    return buildResult(topLevel.apiResponse, topLevel.greeting);
  }

  console.warn("[DestRec] Could not extract comparison data. Keys:", Object.keys(data));
  return null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDestinationRecommendations(
  userId: string | null,
  journeyId?: string | null,
): UseDestinationRecommendationsResult {
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
  const [comparisonType, setComparisonType] = useState<ComparisonType>("destination");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks the fetch key (userId + journeyId) we last fetched with.
  // Allows re-fetch when journeyId transitions from undefined → actual value
  // (e.g. after localStorage restores the active journey on reload).
  const lastFetchKeyRef = useRef<string | null>(null);
  // Tracks the journeyId that was explicitly pushed via pushItems so
  // we can avoid overwriting those items with a stale history fetch.
  const pushedJourneyIdRef = useRef<string | null>(null);
  // Bumped by refetch() to force the useEffect to re-run.
  const [fetchGeneration, setFetchGeneration] = useState(0);
  const forceRefetchRef = useRef(false);

  const getAuthHeaders = useCallback(() => {
    const token = getLocalStorageValue("token") as string;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  /** Force a re-fetch of destination recommendations (e.g. after journey creation). */
  const refetch = useCallback((options?: { force?: boolean }) => {
    forceRefetchRef.current = options?.force === true;
    lastFetchKeyRef.current = null;
    pushedJourneyIdRef.current = null;
    setFetchGeneration((g) => g + 1);
  }, []);

  /** Push new comparison items from an external source (e.g. journey inspiration)
   *  and persist them to the Node server for history. */
  const pushItems = useCallback(
    (
      items: ComparisonItem[],
      type?: ComparisonType,
      meta?: { greeting?: string; journeyId?: string },
    ) => {
      if (!items || items.length === 0) return;
      const resolvedType = type || "destination";

      // Mark this journeyId as pushed so the useEffect doesn't overwrite.
      if (meta?.journeyId) {
        pushedJourneyIdRef.current = meta.journeyId;
        // Also record the fetch key so the effect won't re-fetch for this journeyId
        lastFetchKeyRef.current = `${userId}_${meta.journeyId}`;
      }

      const taggedItems = meta?.journeyId
        ? items.map((i) => ({ ...i, journeyId: meta.journeyId }))
        : items;

      // Replace items entirely with the new journey-specific ones
      setComparisonItems(taggedItems);
      if (type) setComparisonType(resolvedType);

      // Persist to Node server (fire-and-forget)
      const apiResponse = {
        comparison_type: resolvedType,
        items,
      };
      fetch(`${backendUrl}/api/client/destinations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recommendations: apiResponse,
          greeting: meta?.greeting || "",
          journeyId: meta?.journeyId || undefined,
        }),
      })
        .then((res) => {
          if (!res.ok) console.warn("[DestRec] Save journey flights failed:", res.status);
        })
        .catch((err) => {
          console.warn("[DestRec] Save journey flights error:", err);
        });
    },
    [userId, getAuthHeaders]
  );

  useEffect(() => {
    if (!userId) return;

    const fetchKey = `${userId}_${journeyId || ""}`;

    // Already fetched for this exact userId+journeyId combination — skip.
    if (lastFetchKeyRef.current === fetchKey) return;

    // If pushItems already provided data for this journeyId, just record
    // the key so we don't re-fetch, but don't overwrite the pushed items.
    if (journeyId && pushedJourneyIdRef.current === journeyId) {
      lastFetchKeyRef.current = fetchKey;
      return;
    }

    lastFetchKeyRef.current = fetchKey;

    const controller = new AbortController();

    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Directly call the specific destination recommendation agent endpoint 
        // as requested, bypassing any conditional history checks.

        // No cached data — call the specific recommendation agent endpoint
        const payload = {
          ...buildUserPayload(userId),
          force_refetch: forceRefetchRef.current,
        };
        forceRefetchRef.current = false;
        const recommendRes = await fetchAiWithFallback(`/api/ai/recommend/destinations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const recommendData = await recommendRes.json().catch(() => null);
        console.log("[DestRec] Agent Raw Response:", recommendData);

        if (!recommendData || !recommendData.ok) {
          console.warn("[DestRec] Agent recommendation failed:", recommendData?.message);
          setIsLoading(false);
          return;
        }

        const parsed = parseGreetingResponse(recommendData);
        console.log("[DestRec] Parsed Recommendation data:", parsed);

        if (!parsed || parsed.items.length === 0) {
          console.warn("[DestRec] No items found in agent response");
          setIsLoading(false);
          return;
        }

        if (!pushedJourneyIdRef.current) {
          setComparisonItems(parsed.items);
          setComparisonType(parsed.comparisonType);
        }
        setIsLoading(false);
      } catch (err: any) {
        if (err.name === "AbortError") return; // Don't touch state on abort
        console.error("[DestRec] Error:", err);
        setError(err.message || "Failed to load recommendations");
        setIsLoading(false);
      }
    };

    fetchRecommendations();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, journeyId, getAuthHeaders, fetchGeneration]);

  return { comparisonItems, comparisonType, isLoading, error, pushItems, refetch };
}
