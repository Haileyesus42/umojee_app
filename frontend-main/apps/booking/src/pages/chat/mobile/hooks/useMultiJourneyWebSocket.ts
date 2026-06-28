import { useCallback, useEffect, useRef, useState } from "react";
import type {
    WebSocketConnectionStatus,
    MonitoringType,
    ContextUpdateMessage,
} from "../types/phase7";
import { getAiWebSocketBaseUrls } from "../utils/aiBackend";

export interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

const WS_BASE_URLS = getAiWebSocketBaseUrls();

/**
 * useMultiJourneyWebSocket
 * 
 * Manages multiple WebSocket connections for a list of journey IDs to receive
 * real-time context updates (flight, traffic, weather, etc.) for all of them.
 */
export function useMultiJourneyWebSocket(journeyIds: string[]) {
    const [contextUpdates, setContextUpdates] = useState<Record<string, Partial<Record<MonitoringType, ContextUpdateMessage>>>>({});
    const wsRefs = useRef<Record<string, WebSocket>>({});

    const connect = useCallback((journeyId: string) => {
        if (wsRefs.current[journeyId]) return;

        const wsBaseUrl = WS_BASE_URLS[0] || "ws://localhost:8000";
        const url = `${wsBaseUrl}/ws/journey/${journeyId}`;
        try {
            const ws = new WebSocket(url);
            wsRefs.current[journeyId] = ws;

            ws.onmessage = (event: MessageEvent) => {
                try {
                    const parsed: WebSocketMessage = JSON.parse(event.data);
                    if (parsed.type === "context_update") {
                        const update = parsed as unknown as ContextUpdateMessage;
                        setContextUpdates((prev) => ({
                            ...prev,
                            [journeyId]: {
                                ...(prev[journeyId] || {}),
                                [update.monitoring_type]: update,
                            },
                        }));
                    }
                } catch (e) {
                    console.warn(`[useMultiJourneyWebSocket] Error parsing message for ${journeyId}`, e);
                }
            };

            ws.onclose = () => {
                delete wsRefs.current[journeyId];
            };

            ws.onerror = () => {
                console.warn(`[useMultiJourneyWebSocket] WebSocket error for ${journeyId}`);
            };
        } catch (e) {
            console.error(`[useMultiJourneyWebSocket] Connection failed for ${journeyId}`, e);
        }
    }, []);

    const disconnect = useCallback((journeyId: string) => {
        const ws = wsRefs.current[journeyId];
        if (ws) {
            ws.close();
            delete wsRefs.current[journeyId];
        }
    }, []);

    useEffect(() => {
        // Connect to new journey IDs
        journeyIds.forEach((id) => {
            if (!wsRefs.current[id]) {
                connect(id);
            }
        });

        // Cleanup connections for removed journey IDs
        Object.keys(wsRefs.current).forEach((id) => {
            if (!journeyIds.includes(id)) {
                disconnect(id);
            }
        });
    }, [journeyIds, connect, disconnect]);

    // Global cleanup
    useEffect(() => {
        return () => {
            Object.keys(wsRefs.current).forEach((id) => {
                wsRefs.current[id].close();
            });
            wsRefs.current = {};
        };
    }, []);

    return { contextUpdates };
}
