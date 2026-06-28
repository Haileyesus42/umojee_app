import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, X, Sparkles } from "lucide-react";
import MessageBubble from "../components/MessageBubble";
import MobileComposer from "../components/MobileComposer";
import { useHomeChat, ChatMessage } from "../hooks/useHomeChat";
import { formatAirportCity, getAirportLogo } from "../utils/airportCityMap";
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

interface HomeNewJourneyChatDrawerProps {
    open: boolean;
    onClose: () => void;
    initialMessage?: string;
    initialMessageSource?: "text" | "voice";
    journeyId: string | null;
    journeyName?: string | null;
    originCode?: string | null;
    destCode?: string | null;
    recommendations?: any[];
    userId?: string | null;
    userData?: Record<string, any> | null;
    resumeConversationId?: string | null;
    onConversationsClick?: () => void;
    /** Disable interactions if page is loading */
    disabled?: boolean;
    replySource?: any;
    onClearReply?: () => void;
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

const HomeNewJourneyChatDrawer: React.FC<HomeNewJourneyChatDrawerProps> = ({
    open,
    onClose,
    initialMessage,
    initialMessageSource = "text",
    journeyId,
    journeyName,
    originCode,
    destCode,
    recommendations,
    userId,
    userData,
    resumeConversationId,
    onConversationsClick,
    disabled = false,
    replySource,
    onClearReply,
}) => {
    const {
        messages,
        setMessages,
        isLoading,
        sendMessage,
        loadConversation,
        resetChat,
        conversationId,
    } = useHomeChat({ journeyId, userId, userData, enabled: open && !disabled });

    const [inputValue, setInputValue] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    // Reset minimized state when drawer fully closes from parent
    useEffect(() => {
        if (!open) {
            setIsMinimized(false);
        }
    }, [open]);

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

    // Initialize with initialMessage when drawer opens
    useEffect(() => {
        if (open && initialMessage && messages.length === 0 && !disabled) {
            sendMessage(initialMessage, {
                inputMethod: initialMessageSource,
                autoSpeakResponse: initialMessageSource === "voice",
            });
        }
    }, [open, initialMessage, initialMessageSource, disabled]);

    // Handle reset when drawer closes
    useEffect(() => {
        if (!open) {
            resetChat();
            setInputValue("");
        }
    }, [open, resetChat]);

    // Resume conversation
    useEffect(() => {
        if (open && resumeConversationId && messages.length === 0 && !disabled) {
            loadConversation(resumeConversationId);
        }
    }, [open, resumeConversationId, disabled]);


    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSendMessage = async (
        msg: string,
        inputMethod: "text" | "voice" = "text",
        speechLocale?: string
    ) => {
        if (!msg.trim()) return;

        let finalMessage = msg;
        if (replySource) {
            const title = replySource.title || "Recommendation";
            const content = replySource.content || "";
            // Prefix message with detailed context for the AI
            finalMessage = `[Replying to Recommendation: "${title}"\nContent: ${content}]\n\nUser: ${msg}`;

            // Clear the reply context visually after sending
            if (onClearReply) onClearReply();
        }

        setInputValue("");
        sendMessage(finalMessage, {
            inputMethod,
            autoSpeakResponse: inputMethod === "voice",
            speechLocale: inputMethod === "voice" ? speechLocale : undefined,
        });
    };

    const handleOpenPopup = (messageId: string) => {
        const target = messages.find((m) => m.id === messageId) as ChatMessage | undefined;
        if (!target) return;

        // Basic normalization/parsing for popups (re-using logic from original)
        const normalizeFlights = (apiResponse: any): Flight[] | undefined => {
            if (!Array.isArray(apiResponse)) return undefined;
            return apiResponse.map((item, idx) => ({ ...item, id: String(item.id ?? idx) }));
        };

        if (target.apiResponseType === "flights_list") {
            setFlightModalData(normalizeFlights(target.apiResponse));
            setFlightModalOpen(true);
        } else if (target.apiResponseType === "hotels_list") {
            setHotelModalData(target.apiResponse);
            setHotelModalOpen(true);
        } else if (target.apiResponseType === "cars_list") {
            setCarModalData(target.apiResponse);
            setCarModalOpen(true);
        } else if (target.apiResponseType?.includes("comparison") || target.apiResponseType?.includes("compare")) {
            setComparisonModalData(target.apiResponse?.items || []);
            setComparisonType(target.apiResponse?.comparison_type || "destination");
            setComparisonModalOpen(true);
        }
    };

    return (
        <>
            <AnimatePresence>
                {open && !isMinimized && (
                    <>
                        <motion.div
                            key="home-chat-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                            onClick={() => setIsMinimized(true)}
                        />

                        <motion.div
                            key="home-chat-drawer"
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={`fixed inset-x-0 bottom-0 z-[602] mx-auto flex h-[85vh] w-[98vw] max-w-[98vw] flex-col rounded-t-[1.75rem] border border-border bg-background shadow-2xl sm:max-w-[620px] lg:bottom-4 lg:h-[82vh] lg:max-w-[660px] lg:rounded-[1.75rem] ${disabled ? "pointer-events-none opacity-80" : ""}`}
                        >
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                            </div>

                            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-base font-semibold text-foreground truncate">
                                            {journeyName || "Journey Assistant"}
                                        </h2>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            {disabled ? "Loading journey context..." : "Active Journey Support"}
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
                                    <button onClick={() => setIsMinimized(true)} className="p-2 rounded-lg hover:bg-muted/50 transition-colors" aria-label="Minimize chat">
                                        <X className="h-5 w-5 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 no-scrollbar">
                                {messages.length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-center px-8">
                                        <div className="space-y-3">
                                            <div className="mx-auto h-12 w-12 rounded-full bg-primary/5 flex items-center justify-center">
                                                <Sparkles className="h-6 w-6 text-primary/40" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {disabled ? "Connecting to journey..." : "How can I help with your journey today?"}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((msg) => (
                                            <MessageBubble
                                                key={msg.id}
                                                message={msg as any}
                                                onOpenPopup={() => handleOpenPopup(msg.id)}
                                                onRetry={() => (msg as any).retryMessage && handleSendMessage((msg as any).retryMessage)}
                                            />
                                        ))}
                                        {isLoading && (
                                            <div className="flex justify-start">
                                                <div className="max-w-[90%] rounded-2xl border border-border bg-card px-4 py-3">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <div className="flex gap-1 animate-pulse">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                                            <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                                            <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                                        </div>
                                                        <span>Thinking...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={bottomRef} className="h-2" />
                                    </>
                                )}
                            </div>

                            <div className="px-4 py-4 border-t border-border bg-card/50">
                                {/* Reply Context Preview UI */}
                                <AnimatePresence>
                                    {replySource && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: "auto" }}
                                            exit={{ opacity: 0, y: 10, height: 0 }}
                                            className="mb-3 overflow-hidden"
                                        >
                                            <div className="relative p-3 bg-primary/10 border-l-4 border-primary rounded-r-xl">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                                                        Replying to Recommendation
                                                    </span>
                                                    <button
                                                        onClick={onClearReply}
                                                        className="p-1 rounded-full hover:bg-primary/20 transition-colors"
                                                    >
                                                        <X className="h-3 w-3 text-primary" />
                                                    </button>
                                                </div>
                                                <h4 className="text-xs font-bold text-foreground truncate mb-1">
                                                    {replySource.title || "Smart Suggestion"}
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                                                    "{replySource.content}"
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <MobileComposer
                                    draft={inputValue}
                                    setDraft={setInputValue}
                                    onSend={(msg) => handleSendMessage(msg, "text")}
                                    isLoading={isLoading || disabled}
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
                        className="fixed inset-x-0 bottom-[48px] mb-1 z-[9999] mx-auto flex w-[98vw] max-w-[98vw] items-center justify-between rounded-full border border-white/10 bg-gradient-to-r from-primary/95 to-primary/80 px-4 py-0 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all transform-gpu active:scale-[0.98] sm:max-w-[620px] lg:max-w-[560px]"
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

            {open && (
                <>
                    <HotelModal open={hotelModalOpen} hotels={hotelModalData} onClose={() => setHotelModalOpen(false)} />
                    <FlightModal
                        open={flightModalOpen}
                        flights={flightModalData}
                        onClose={() => setFlightModalOpen(false)}
                        journeyId={journeyId || undefined}
                        userId={userId || undefined}
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
                        conversationId={conversationId}
                        onClose={() => setSpeechModalOpen(false)}
                        onDone={(text, language) => {
                            const finalText = text.trim();
                            if (!finalText) {
                                setSpeechModalOpen(false);
                                return;
                            }
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

export default HomeNewJourneyChatDrawer;
