/**
 * useConversations
 *
 * Fetches and manages conversation history for:
 *   - JourneyHomePage: conversations linked to a specific journeyId
 *     → GET /api/ai/journey/{journeyId}/conversations
 *   - JourneyListingPage: general conversations (no journey)
 *     → POST /api/ai/session/list-general
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getLocalStorageValue } from "../../../../lib/utils";
import { fetchAiWithFallback } from "../utils/aiBackend";

export interface ConversationSummary {
    id: string;
    title: string | null;
    last_message: string | null;
    updated_at: string | null;
    journey_id?: string | null;
}

interface UseConversationsOptions {
    /** Journey id — if provided fetches journey-scoped conversations */
    journeyId?: string | null;
    /** userId — required for general (non-journey) conversations */
    userId?: string | null;
}

interface UseConversationsReturn {
    conversations: ConversationSummary[];
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
    deleteConversation: (convId: string) => Promise<void>;
}

export function useConversations({
    journeyId,
    userId,
}: UseConversationsOptions): UseConversationsReturn {
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Prevent duplicate loads on first mount
    const loadRef = useRef(false);

    // Resolve userId from props or localStorage
    const resolvedUserId =
        userId ||
        (() => {
            const u = getLocalStorageValue("user") as any;
            return u?._id ? String(u._id) : null;
        })();

    const load = useCallback(async () => {
        if (!resolvedUserId && !journeyId) return;
        setIsLoading(true);
        setError(null);
        try {
            let data: { conversations?: ConversationSummary[] };
            if (journeyId) {
                // Journey-scoped: GET endpoint
                const fallbackResp = await fetchAiWithFallback(
                    `/api/ai/journey/${encodeURIComponent(journeyId)}/conversations`,
                    { method: "GET" }
                );
                if (!fallbackResp.ok) throw new Error("Failed to fetch journey conversations");
                data = await fallbackResp.json();
            } else {
                // General: POST endpoint with user_id
                const resp = await fetchAiWithFallback(
                    `/api/ai/session/list-general`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ user_id: resolvedUserId }),
                    }
                );
                if (!resp.ok) throw new Error("Failed to fetch general conversations");
                data = await resp.json();
            }
            setConversations(data.conversations || []);
        } catch (err: any) {
            setError(err?.message || "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, [journeyId, resolvedUserId]);

    useEffect(() => {
        if (!loadRef.current) {
            loadRef.current = true;
            load();
        }
    }, [load]);

    const deleteConversation = useCallback(
        async (convId: string) => {
            if (!resolvedUserId) return;
            try {
                await fetchAiWithFallback(`/api/ai/session/delete`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: resolvedUserId,
                        conversation_id: convId,
                    }),
                });
                setConversations((prev) => prev.filter((c) => c.id !== convId));
            } catch {
                // silent
            }
        },
        [resolvedUserId]
    );

    return { conversations, isLoading, error, refresh: load, deleteConversation };
}
