/**
 * useHomeConversations
 * 
 * Specialized hook for JourneyHomePage to fetch and manage 
 * conversations strictly scoped to a journeyId.
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

interface UseHomeConversationsOptions {
    /** Required journey id for scoping */
    journeyId: string | null;
    /** userId — optional but used for deletion */
    userId?: string | null;
    enabled?: boolean;
}

interface UseHomeConversationsReturn {
    conversations: ConversationSummary[];
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
    deleteConversation: (convId: string) => Promise<void>;
}

export function useHomeConversations({
    journeyId,
    userId,
    enabled = true,
}: UseHomeConversationsOptions): UseHomeConversationsReturn {
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loadRef = useRef(false);

    const resolvedUserId =
        userId ||
        (() => {
            const u = getLocalStorageValue("user") as any;
            return u?._id ? String(u._id) : null;
        })();

    const load = useCallback(async () => {
        if (!enabled || !journeyId) return;
        setIsLoading(true);
        setError(null);
        try {
            const resp = await fetchAiWithFallback(
                `/api/ai/journey/${encodeURIComponent(journeyId)}/conversations`,
                { method: "GET" }
            );
            if (!resp.ok) throw new Error("Failed to fetch journey conversations");
            const data = await resp.json();
            setConversations(data.conversations || []);
        } catch (err: any) {
            setError(err?.message || "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, [enabled, journeyId]);

    useEffect(() => {
        // Only load if journeyId is present
        if (enabled && journeyId) {
            load();
        }
    }, [enabled, journeyId, load]);

    const deleteConversation = useCallback(
        async (convId: string) => {
            if (!enabled || !resolvedUserId) return;
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
        [enabled, resolvedUserId]
    );

    return { conversations, isLoading, error, refresh: load, deleteConversation };
}
