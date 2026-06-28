import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, X, Sparkles } from "lucide-react";
import MessageBubble from "../components/MessageBubble";
import MobileComposer from "../components/MobileComposer";
import { ChatMessage } from "../hooks/useMobileChat";
import { formatAirportCity, getAirportLogo } from "../utils/airportCityMap";
import { getLocalStorageValue } from "../../../../lib/utils";
import FlightModal from "./FlightModal";
import HotelModal from "./HotelModal";
import CarModal from "./CarModal";
import ComparisonModal from "./ComparisonModal";
import SpeechToTextModal from "./SpeechToTextModal";
import VoiceSettingsModal, { TTS_VOICE_OPTIONS, TtsVoiceOption } from "./VoiceSettingsModal";
import { Flight } from "./utils";
import { Hotel } from "./HotelModal";
import { Car } from "./components/CarCard";
import type { ComparisonItem, ComparisonType } from "../types/phase7";
import { fetchAiWithFallback } from "../utils/aiBackend";

// Ensure any price-like value (e.g., "193.95 USD") is converted to a usable number
const parsePrice = (value: any) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const match = value.match(/-?\d+(\.\d+)?/);
        if (match) return Number(match[0]);
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

const normalizeFlights = (apiResponse: any): Flight[] | undefined => {
    if (!Array.isArray(apiResponse)) return undefined;
    return apiResponse.map((item, idx) => {
        const baggageValue = item?.baggage;
        let baggage = "";
        if (typeof baggageValue === "string") {
            baggage = baggageValue;
        } else if (baggageValue && typeof baggageValue === "object") {
            const checked = (baggageValue as any).checked;
            const cabin = (baggageValue as any).cabin;
            const parts: string[] = [];
            if (checked !== undefined && checked !== null) parts.push(`checked: ${checked}`);
            if (cabin !== undefined && cabin !== null) parts.push(`cabin: ${cabin}`);
            baggage = parts.length > 0 ? parts.join(", ") : JSON.stringify(baggageValue);
        }
        const stopsValue = item?.stops;
        const stops = typeof stopsValue === "number" ? `${stopsValue} stop${stopsValue === 1 ? "" : "s"}` : String(stopsValue ?? "");
        return {
            id: String(item?.id ?? idx),
            airline: String(item?.airline ?? ""),
            flightNo: String(item?.flightNo || item?.flight_no || item?.flightNumber || ""),
            from: String(item?.from ?? ""),
            to: String(item?.to ?? ""),
            stops,
            travelTime: String(item?.travelTime ?? ""),
            departure: String(item?.departure ?? ""),
            arrival: String(item?.arrival ?? ""),
            price: parsePrice(item?.price),
            basePrice: parsePrice(item?.basePrice),
            baggage,
            fareNotes: item?.fareNotes ? String(item.fareNotes) : "",
            imageUrl: typeof item?.imageUrl === "string" ? item.imageUrl : undefined,
            imageUrls: Array.isArray(item?.imageUrls) ? item.imageUrls.filter((u: any) => typeof u === "string") : undefined,
        };
    });
};

const normalizeHotels = (apiResponse: any): Hotel[] | undefined => {
    if (!Array.isArray(apiResponse)) return undefined;
    return apiResponse.map((item, idx) => ({
        id: String(item?.id ?? idx),
        name: String(item?.name ?? ""),
        cityCode: String(item?.cityCode ?? ""),
        address: String(item?.address ?? ""),
        rating: Number(item?.rating ?? 0),
        price: Number(item?.price ?? 0),
        currency: String(item?.currency ?? ""),
        imageUrl: typeof item?.imageUrl === "string" ? item.imageUrl : "",
        imageUrls: Array.isArray(item?.imageUrls) ? item.imageUrls.filter((u: any) => typeof u === "string") : undefined,
        description: String(item?.description ?? ""),
        amenities: Array.isArray(item?.amenities) ? item.amenities.filter((a: any) => typeof a === "string") : [],
    }));
};

const normalizeCars = (apiResponse: any): Car[] | undefined => {
    if (!Array.isArray(apiResponse)) return undefined;
    return apiResponse.map((item, idx) => ({
        id: String(item?.id ?? idx),
        brand: String(item?.brand ?? ""),
        model: String(item?.model ?? ""),
        imageUrls: Array.isArray(item?.imageUrls) ? item.imageUrls.filter((u: any) => typeof u === "string") : undefined,
        pricePerDay: Number(item?.pricePerDay ?? item?.price ?? 0),
        seats: Number(item?.seats ?? 0),
        bags: Number(item?.bags ?? 0),
        transmission: String(item?.transmission ?? ""),
        fuel: String(item?.fuel ?? ""),
        pickup: String(item?.pickup ?? ""),
        dropoff: String(item?.dropoff ?? ""),
        description: String(item?.description ?? ""),
    }));
};

const normalizeComparisons = (apiResponse: any): ComparisonItem[] | undefined => {
    if (!apiResponse || !apiResponse.items || !Array.isArray(apiResponse.items)) {
        return undefined;
    }
    return apiResponse.items.map((item: any, idx: number) => ({
        id: String(item?.id ?? idx),
        type: item?.type ?? "destination",
        name: String(item?.name ?? ""),
        imageUrl: typeof item?.imageUrl === "string" ? item.imageUrl : undefined,
        price: item?.price !== undefined ? parsePrice(item.price) : undefined,
        currency: item?.currency ? String(item.currency) : undefined,
        matchConfidence: item?.matchConfidence !== undefined ? Number(item.matchConfidence) : undefined,
        pros: Array.isArray(item?.pros) ? item.pros.filter((p: any) => typeof p === "string") : [],
        cons: Array.isArray(item?.cons) ? item.cons.filter((c: any) => typeof c === "string") : [],
        metadata: item?.metadata && typeof item.metadata === "object" ? item.metadata : {},
    }));
};

interface NewJourneyChatDrawerProps {
    open: boolean;
    onClose: () => void;
    initialMessage?: string;
    initialMessageSource?: "text" | "voice";
    journeyId?: string | null;
    journeyName?: string | null;
    originCode?: string | null;
    destCode?: string | null;
    recommendations?: any[];
    /** MongoDB user _id — used for conversation persistence */
    userId?: string | null;
    /** Full user object from localStorage — sent as user_data for personalization */
    userData?: Record<string, any> | null;
    /** Resume an existing conversation by its ID (used by ConversationDrawer) */
    resumeConversationId?: string | null;
}

const TTS_VOICE_STORAGE_KEY = "umoja_tts_voice";

const getInitialTtsVoice = (): TtsVoiceOption => {
    if (typeof window === "undefined") return TTS_VOICE_OPTIONS[0];

    try {
        const storedVoice = window.localStorage.getItem(TTS_VOICE_STORAGE_KEY);
        if (
            storedVoice &&
            (TTS_VOICE_OPTIONS as readonly string[]).includes(storedVoice)
        ) {
            return storedVoice as TtsVoiceOption;
        }
    } catch {
        // ignore localStorage access issues
    }

    return TTS_VOICE_OPTIONS[0];
};

const NewJourneyChatDrawer: React.FC<NewJourneyChatDrawerProps> = ({
    open,
    onClose,
    initialMessage,
    initialMessageSource = "text",
    journeyId,
    journeyName,
    originCode,
    destCode,
    recommendations,
    userId: userIdProp,
    userData: userDataProp,
    resumeConversationId,
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    // Stable conversation_id for the duration of this drawer session
    const conversationIdRef = useRef<string | null>(null);

    // Modal states
    const [hotelModalOpen, setHotelModalOpen] = useState(false);
    const [flightModalOpen, setFlightModalOpen] = useState(false);
    const [carModalOpen, setCarModalOpen] = useState(false);
    const [comparisonModalOpen, setComparisonModalOpen] = useState(false);

    const [flightModalData, setFlightModalData] = useState<Flight[] | undefined>();
    const [hotelModalData, setHotelModalData] = useState<Hotel[] | undefined>();
    const [carModalData, setCarModalData] = useState<Car[] | undefined>();
    const [comparisonModalData, setComparisonModalData] = useState<ComparisonItem[] | undefined>();
    const [comparisonType, setComparisonType] = useState<ComparisonType | undefined>();
    const [speechModalOpen, setSpeechModalOpen] = useState(false);
    const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
    const [selectedTtsVoice, setSelectedTtsVoice] = useState<TtsVoiceOption>(getInitialTtsVoice);
    const pendingResponseInputMethodRef = useRef<"text" | "voice">("text");

    const handleOpenSpeechModal = useCallback(() => {
        setIsMinimized(true);
        setSpeechModalOpen(true);
    }, []);

    const handleVoiceSelection = useCallback((voice: TtsVoiceOption) => {
        setSelectedTtsVoice(voice);
        try {
            window.localStorage.setItem(TTS_VOICE_STORAGE_KEY, voice);
        } catch {
            // ignore localStorage access issues
        }
    }, []);

    // Resolve user identity — prefer explicit props, fall back to localStorage
    const resolvedUserId = userIdProp || (() => {
        const u = getLocalStorageValue("user") as any;
        return u?._id ? String(u._id) : null;
    })();
    const resolvedUserData = userDataProp || (getLocalStorageValue("user") as any) || {};

    const normalizeMessage = useCallback((raw: any, role: "human" | "ai"): ChatMessage => {
        let content: any = "";
        if (typeof raw === "string") {
            content = raw;
        } else if (raw && typeof raw === "object") {
            if (typeof raw.ai_generated === "string") content = raw.ai_generated;
            else if (typeof raw.message === "string") content = raw.message;
            else if (raw.ai_generated !== undefined || raw.message !== undefined) content = String(raw.ai_generated ?? raw.message);
            else {
                try {
                    content = JSON.stringify(raw);
                } catch {
                    content = String(raw);
                }
            }
        } else {
            content = String(raw || "");
        }
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
            apiResponse,
            apiResponseType,
            triggerPopup,
        };
    }, []);

    const handleLoadConversation = useCallback(async (convId: string) => {
        setIsLoading(true);
        conversationIdRef.current = convId;
        try {
            const res = await fetchAiWithFallback(`/api/ai/session/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...{
                        user_id: resolvedUserId || "anonymous",
                        user_name: "User",
                        user_data: resolvedUserData || {}
                    },
                    conversation_id: convId
                }),
            });
            const data = await res.json().catch(() => null);
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
    }, [resolvedUserId, resolvedUserData, normalizeMessage]);

    // Initialize with initialMessage when drawer opens
    useEffect(() => {
        if (open && initialMessage && messages.length === 0) {
            handleSendMessage(initialMessage, initialMessageSource);
        }
    }, [open, initialMessage, initialMessageSource]);

    // Reset minimized state when drawer fully closes from parent
    useEffect(() => {
        if (!open) {
            setMessages([]);
            setInputValue("");
            setIsLoading(false);
            // Reset conversation for next open — new session
            conversationIdRef.current = null;
            setIsMinimized(false);
        }
    }, [open]);

    // When reopening to resume a conversation, seed the conversationId ref and load history
    useEffect(() => {
        if (open && resumeConversationId && messages.length === 0) {
            handleLoadConversation(resumeConversationId);
        }
    }, [open, resumeConversationId, handleLoadConversation]);

    useEffect(() => {
        if (recommendations && recommendations.length > 0) {
            const recMsg: ChatMessage = {
                id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                type: "recommendation",
                content: "I've found some smart recommendations for this part of your journey:",
                recommendations: recommendations,
            };
            setMessages((prev) => [...prev, recMsg]);
        }
    }, [recommendations]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleOpenPopup = (messageId: string) => {
        const target = messages.find((m) => m.id === messageId && m.type === "ai") as ChatMessage | undefined;
        if (!target) return;

        if (target.apiResponseType === "flights_list") {
            setFlightModalData(normalizeFlights(target.apiResponse));
            setFlightModalOpen(true);
        } else if (target.apiResponseType === "hotels_list") {
            setHotelModalData(normalizeHotels(target.apiResponse));
            setHotelModalOpen(true);
        } else if (target.apiResponseType === "cars_list") {
            setCarModalData(normalizeCars(target.apiResponse));
            setCarModalOpen(true);
        } else if (target.apiResponseType === "comparison_list") {
            setComparisonModalData(normalizeComparisons(target.apiResponse));
            setComparisonType(target.apiResponse?.comparison_type || "destination");
            setComparisonModalOpen(true);
        } else if (target.apiResponseType === "compare_flights") {
            setComparisonModalData(normalizeComparisons(target.apiResponse));
            setComparisonType(target.apiResponse?.comparison_type || "destination");
            setComparisonModalOpen(true);
        }
    };

    const handleSendMessage = async (
        msg: string,
        inputMethod: "text" | "voice" = "text",
        speechLocale?: string
    ) => {
        if (!msg.trim()) return;
        pendingResponseInputMethodRef.current = inputMethod;
        const userMsg: ChatMessage = {
            id: `u_${Date.now()}`,
            type: "human",
            content: msg,
            inputMethod,
        };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);

        try {
            // Use journey-specific endpoint when journeyId is available (JourneyHomePage),
            // otherwise use the generic orchestrator endpoint (JourneyListingPage).
            const body: Record<string, any> = {
                message: msg,
                user_id: resolvedUserId || "anonymous",
                user_data: resolvedUserData || {},
                input_method: inputMethod,
                speech_locale: inputMethod === "voice" ? speechLocale : undefined,
                voice_output_requested: inputMethod === "voice",
            };

            // Include stable conversation_id so all turns in this session share history
            if (conversationIdRef.current) {
                body.conversation_id = conversationIdRef.current;
            }

            const response = await fetchAiWithFallback(
                journeyId
                    ? `/api/ai/journey/${encodeURIComponent(journeyId)}/respond`
                    : `/api/ai/respond`,
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
            aiMsg.inputMethod = pendingResponseInputMethodRef.current;
            aiMsg.autoSpeak = Boolean(data?.auto_play_voice || pendingResponseInputMethodRef.current === "voice");
            (aiMsg as any).ttsText = typeof data?.tts_text === "string" ? data.tts_text : undefined;
            (aiMsg as any).voiceEnabled = Boolean(data?.voice_enabled || pendingResponseInputMethodRef.current === "voice");
            setMessages((prev) => [...prev, aiMsg]);
        } catch (error) {
            console.error("Chat error:", error);
            const errorMsg: ChatMessage = {
                id: `e_${Date.now()}`,
                type: "ai",
                content: "Sorry, I'm having trouble connecting right now.",
                isError: true,
                retryMessage: msg,
                inputMethod: pendingResponseInputMethodRef.current,
                autoSpeak: pendingResponseInputMethodRef.current === "voice",
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            pendingResponseInputMethodRef.current = "text";
        }
    };

    return (
        <>
            <AnimatePresence>
                {open && !isMinimized && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="chat-drawer-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                            onClick={() => setIsMinimized(true)}
                        />

                        {/* Drawer */}
                        <motion.div
                            key="chat-drawer-content"
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed inset-x-0 bottom-0 z-[602] h-[85vh] rounded-t-2xl bg-background border-t border-border shadow-2xl flex flex-col"
                        >
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {journeyId && (originCode || destCode) ? (
                                            <div className="flex items-center gap-3">
                                                {(() => {
                                                    const originLogo = originCode ? getAirportLogo(originCode) : undefined;
                                                    const destLogo = destCode ? getAirportLogo(destCode) : undefined;
                                                    return (
                                                        <div className="flex-1 flex items-center gap-2 min-w-0">
                                                            {originLogo && (
                                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                    <img
                                                                        src={originLogo}
                                                                        alt={originCode || ""}
                                                                        className="h-6 w-6 rounded-full object-contain bg-white ring-1 ring-border"
                                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                                    />
                                                                    <span className="text-sm font-bold text-foreground truncate">{formatAirportCity(originCode!)}</span>
                                                                </div>
                                                            )}
                                                            {originLogo && destLogo && (
                                                                <div className="flex-1 flex items-center gap-1 min-w-[30px]">
                                                                    <div className="flex-1 h-px bg-border" />
                                                                    <span className="text-muted-foreground text-xs flex-shrink-0">✈</span>
                                                                    <div className="flex-1 h-px bg-border" />
                                                                </div>
                                                            )}
                                                            {destLogo && (
                                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                    <img
                                                                        src={destLogo}
                                                                        alt={destCode || ""}
                                                                        className="h-6 w-6 rounded-full object-contain bg-white ring-1 ring-border"
                                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                                    />
                                                                    <span className="text-sm font-bold text-foreground truncate">{formatAirportCity(destCode!)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <h2 className="text-base font-semibold text-foreground truncate">
                                                {journeyId ? `Chat about ${journeyName || 'Journey'}` : 'Plan New Journey'}
                                            </h2>
                                        )}
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            {journeyId ? 'Journey Assistant' : 'Chat with Umoja Assistant'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setVoiceSettingsOpen(true)}
                                        className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                        aria-label="Open voice settings"
                                    >
                                        <Settings2 className="h-5 w-5 text-muted-foreground" />
                                    </button>
                                    <button
                                        onClick={() => setIsMinimized(true)}
                                        className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                        aria-label="Minimize chat"
                                    >
                                        <X className="h-5 w-5 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>

                            {/* Chat history section */}
                            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 no-scrollbar">
                                {messages.length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-center px-8">
                                        <div className="space-y-3">
                                            <div className="mx-auto h-12 w-12 rounded-full bg-primary/5 flex items-center justify-center">
                                                <Sparkles className="h-6 w-6 text-primary/40" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Tell me about your dream destination or what kind of experience you're after.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((msg) => (
                                            <MessageBubble
                                                key={msg.id}
                                                message={msg}
                                                onOpenPopup={() => handleOpenPopup(msg.id)}
                                                onRetry={() => msg.retryMessage && handleSendMessage(msg.retryMessage)}
                                            />
                                        ))}
                                        {isLoading && (
                                            <div className="flex justify-start">
                                                <div className="max-w-[90%] rounded-2xl border border-border bg-card px-4 py-3 shadow shadow-black/10">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <div className="flex gap-1">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                        </div>
                                                        <span>Typing...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={bottomRef} className="h-2" />
                                    </>
                                )}
                            </div>

                            {/* Input section */}
                            <div className="px-4 py-4 border-t border-border bg-card/50">
                                <MobileComposer
                                    draft={inputValue}
                                    setDraft={setInputValue}
                                    onSend={(msg) => handleSendMessage(msg, "text")}
                                    isLoading={isLoading}
                                    onMicClick={handleOpenSpeechModal}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {open && isMinimized && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed inset-x-8 bottom-[48px] z-[9999] bg-gradient-to-r from-primary/95 to-primary/80 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.2)] border border-white/10 backdrop-blur-md rounded-full py-0 px-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all transform-gpu"
                        onClick={() => setIsMinimized(false)}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <Sparkles className="h-3 w-3 text-white/90 shrink-0" />
                            <span className="text-[9px] font-medium text-white/90 truncate mt-[1px]">Tap to resume chat...</span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="p-1 -mr-1.5 rounded-full hover:bg-white/20 transition-colors shrink-0"
                            aria-label="Close chat"
                        >
                            <X className="h-3 w-3 text-white/90" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Render modals outside the AnimatePresence so they overlay the drawer */}
            {open && (
                <>
                    <HotelModal open={hotelModalOpen} hotels={hotelModalData} onClose={() => setHotelModalOpen(false)} />
                    <FlightModal
                        open={flightModalOpen}
                        flights={flightModalData}
                        onClose={() => setFlightModalOpen(false)}
                        journeyId={journeyId || undefined}
                        userId={resolvedUserId || undefined}
                        conversationId={conversationIdRef.current || undefined}
                    />
                    <CarModal open={carModalOpen} cars={carModalData} onClose={() => setCarModalOpen(false)} />
                    <ComparisonModal
                        open={comparisonModalOpen}
                        items={comparisonModalData || []}
                        comparisonType={comparisonType || "destination"}
                        onClose={() => setComparisonModalOpen(false)}
                    />
                    <SpeechToTextModal
                        open={speechModalOpen}
                        conversationId={conversationIdRef.current}
                        onClose={() => setSpeechModalOpen(false)}
                        onDone={(text, language) => {
                            const finalText = text.trim();
                            if (!finalText) {
                                setSpeechModalOpen(false);
                                return;
                            }
                            setInputValue("");
                            handleSendMessage(finalText, "voice", language);
                            setIsMinimized(false);
                            setSpeechModalOpen(false);
                        }}
                    />
                    <VoiceSettingsModal
                        open={voiceSettingsOpen}
                        selectedVoice={selectedTtsVoice}
                        onClose={() => setVoiceSettingsOpen(false)}
                        onSelectVoice={handleVoiceSelection}
                    />
                </>
            )}
        </>
    );
};

export default NewJourneyChatDrawer;
