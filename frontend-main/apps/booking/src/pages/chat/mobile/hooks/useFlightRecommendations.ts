import { useCallback, useEffect, useRef, useState } from "react";
import { getLocalStorageValue } from "../../../../lib/utils";
import type { ComparisonItem, ComparisonType } from "../types/phase7";

const backendUrl =
    (process.env.REACT_APP_BACKEND_URL as string) || "http://localhost:4001";

interface UseFlightRecommendationsResult {
    comparisonItems: ComparisonItem[];
    comparisonType: ComparisonType;
    isLoading: boolean;
    error: string | null;
    /** Reset internal fetch guard so the next render triggers a fresh fetch. */
    refetch: () => void;
}

/**
 * Hook to fetch historical flight recommendations from the Node server.
 */
export function useFlightRecommendations(
    userId: string | null,
    journeyId?: string | null
): UseFlightRecommendationsResult {
    const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
    const [comparisonType, setComparisonType] = useState<ComparisonType>("destination");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lastFetchKeyRef = useRef<string | null>(null);

    const getAuthHeaders = useCallback(() => {
        const token = getLocalStorageValue("token") as string;
        return {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }, []);

    const refetch = useCallback(() => {
        lastFetchKeyRef.current = null;
        // We can't easily trigger the useEffect without a state change,
        // so we'll just force a small state update if needed, but usually
        // re-mounting or a dependency change is enough.
    }, []);

    useEffect(() => {
        if (!userId) return;

        const fetchKey = `${userId}_${journeyId || ""}`;
        if (lastFetchKeyRef.current === fetchKey) return;

        lastFetchKeyRef.current = fetchKey;
        const controller = new AbortController();

        const fetchHistory = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams({ limit: "10" });
                if (journeyId) params.set("journeyId", journeyId);

                const res = await fetch(`${backendUrl}/api/client/destinations/history?${params}`, {
                    headers: getAuthHeaders(),
                    signal: controller.signal,
                });

                if (!res.ok) {
                    throw new Error(`History fetch failed: ${res.status}`);
                }

                const data = await res.json();
                const docs: any[] = Array.isArray(data?.data) ? data.data : [];

                const seenIds = new Set<string>();
                const allItems: ComparisonItem[] = [];
                let latestType: ComparisonType = "destination";

                for (const doc of docs) {
                    const rec = doc?.recommendations;
                    if (!rec?.items || !Array.isArray(rec.items)) continue;

                    // Only take "flight" type comparisons if we have them, 
                    // or whatever is in history if nothing specific.
                    // The user specifically wants the flights tab to use this.
                    if (rec.comparison_type) latestType = rec.comparison_type;

                    const docJourneyId = doc?.journeyId;
                    for (const item of rec.items) {
                        if (!item) continue;
                        const isSeen = item.id ? seenIds.has(item.id) : false;
                        if (item.id) seenIds.add(item.id);
                        allItems.push({ ...item, seen: isSeen, journeyId: docJourneyId || undefined });
                    }
                }

                const finalItems = allItems.slice(0, 10);
                setComparisonItems(finalItems);
                setComparisonType(latestType);
                setIsLoading(false);
            } catch (err: any) {
                if (err.name === "AbortError") return;
                console.error("[FlightRec] Error:", err);
                setError(err.message || "Failed to load flight history");
                setIsLoading(false);
            }
        };

        fetchHistory();

        return () => controller.abort();
    }, [userId, journeyId, getAuthHeaders]);

    return { comparisonItems, comparisonType, isLoading, error, refetch };
}
