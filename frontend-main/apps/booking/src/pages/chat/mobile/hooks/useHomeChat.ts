/**
 * useHomeChat
 * 
 * Specialized hook for JourneyHomePage to handle real-time chat
 * with the AI agent, strictly scoped to a specific journeyId.
 * No localStorage dependencies for journey state.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getLocalStorageValue } from "../../../../lib/utils";
import { fetchAiWithFallback } from "../utils/aiBackend";

export type ChatMessage = {
    id: string;
    type: "human" | "ai" | "recommendation";
    content: string;
    inputMethod?: "text" | "voice";
    autoSpeak?: boolean;
    ttsText?: string;
    voiceEnabled?: boolean;
    aiGenerated?: string;
    apiResponse?: any;
    apiResponseType?: string | null;
    triggerPopup?: boolean;
    recommendations?: any[];
    agent?: string;
    isError?: boolean;
    retryMessage?: string;
};

interface UseHomeChatOptions {
    journeyId: string | null;
    userId?: string | null;
    userData?: Record<string, any> | null;
    enabled?: boolean;
}

export const useHomeChat = ({
    journeyId,
    userId: userIdProp,
    userData: userDataProp,
    enabled = true,
}: UseHomeChatOptions) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const conversationIdRef = useRef<string | null>(null);

    const resolvedUserId = userIdProp || (() => {
        const u = getLocalStorageValue("user") as any;
        return u?._id ? String(u._id) : "anonymous";
    })();
    const resolvedUserData = userDataProp || (getLocalStorageValue("user") as any) || {};

    const normalizeMessage = useCallback((raw: any, role: "human" | "ai"): ChatMessage => {
        let content = typeof raw === "string" ? raw : (raw?.message || raw?.ai_generated || "");
        let apiResponse = raw?.api_response;
        let apiResponseType = raw?.api_response_type;
        let triggerPopup = raw?.trigger_popup;

        if (typeof content === "string" && content.trim().startsWith("{")) {
            try {
                const parsed = JSON.parse(content);
                content = parsed?.ai_generated || parsed?.message || content;
                if (parsed.api_response_type && !apiResponseType) apiResponseType = parsed.api_response_type;
                if (parsed.api_response && !apiResponse) apiResponse = parsed.api_response;
                if (parsed.trigger_popup !== undefined && triggerPopup === undefined) triggerPopup = parsed.trigger_popup;
            } catch { /* ignore */ }
        }

        return {
            id: `${role === "human" ? "u" : "a"}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: role,
            content,
            ttsText: raw?.tts_text,
            voiceEnabled: Boolean(raw?.voice_enabled),
            apiResponse,
            apiResponseType,
            triggerPopup,
            agent: raw?.route || (role === "ai" ? "Journey Assistant" : undefined),
        };
    }, []);

    const sendMessage = useCallback(async (
        msg: string,
        options?: { inputMethod?: "text" | "voice"; autoSpeakResponse?: boolean; speechLocale?: string }
    ) => {
        if (!enabled || !msg.trim() || !journeyId) return;

        const userMsg: ChatMessage = {
            id: `u_${Date.now()}`,
            type: "human",
            content: msg,
            inputMethod: options?.inputMethod || "text",
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const body: Record<string, any> = {
                message: msg,
                user_id: resolvedUserId,
                user_data: resolvedUserData,
                input_method: options?.inputMethod || "text",
                speech_locale: options?.speechLocale,
                voice_output_requested: Boolean(options?.autoSpeakResponse),
            };

            if (conversationIdRef.current) {
                body.conversation_id = conversationIdRef.current;
            }

            const response = await fetchAiWithFallback(
                `/api/ai/journey/${encodeURIComponent(journeyId)}/respond`,
                {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                }
            );

            if (!response.ok) throw new Error("Failed to get response");
            const data = await response.json();

            if (data?.conversation_id && !conversationIdRef.current) {
                conversationIdRef.current = data.conversation_id;
            }

            const aiMsg = normalizeMessage(data, "ai");
            aiMsg.autoSpeak = Boolean(data?.auto_play_voice ?? options?.autoSpeakResponse);
            aiMsg.inputMethod = options?.inputMethod || "text";
            aiMsg.ttsText = typeof data?.tts_text === "string" ? data.tts_text : aiMsg.ttsText;
            aiMsg.voiceEnabled = Boolean(data?.voice_enabled ?? aiMsg.voiceEnabled);
            setMessages((prev) => [...prev, aiMsg]);
        } catch (error) {
            console.error("Home chat error:", error);
            setMessages((prev) => [...prev, {
                id: `e_${Date.now()}`,
                type: "ai",
                content: "Sorry, I'm having trouble connecting.",
                isError: true,
                retryMessage: msg,
                autoSpeak: Boolean(options?.autoSpeakResponse),
                inputMethod: options?.inputMethod || "text",
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [enabled, journeyId, resolvedUserId, resolvedUserData, normalizeMessage]);

    const loadConversation = useCallback(async (convId: string) => {
        if (!enabled || !journeyId) return;
        setIsLoading(true);
        conversationIdRef.current = convId;
        try {
            const res = await fetchAiWithFallback(`/api/ai/session/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: resolvedUserId,
                    conversation_id: convId,
                    journey_id: journeyId // ensure scoped
                }),
            });
            const data = await res.json();
            if (Array.isArray(data?.messages)) {
                const history: ChatMessage[] = data.messages.map((m: any) =>
                    normalizeMessage(m.content, m.role === "human" ? "human" : "ai")
                );
                setMessages(history);
            }
        } catch (err) {
            console.error("Failed to load conversation:", err);
        } finally {
            setIsLoading(false);
        }
    }, [enabled, journeyId, resolvedUserId, normalizeMessage]);

    const resetChat = useCallback(() => {
        setMessages([]);
        conversationIdRef.current = null;
        setIsLoading(false);
    }, []);

    return {
        messages,
        setMessages,
        isLoading,
        sendMessage,
        loadConversation,
        resetChat,
        conversationId: conversationIdRef.current
    };
};
