import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MobileComposer from "./components/MobileComposer";
import MobileHeader from "./components/MobileHeader";
import MobileSidebar from "./components/MobileSidebar";
import MessageBubble from "./components/MessageBubble";
import NotificationBanner from "./components/NotificationBanner";
import { useMobileChat } from "./hooks/useMobileChat";
import FlightModal from "./modals/FlightModal";
import HotelModal from "./modals/HotelModal";
import CarModal from "./modals/CarModal";
import SpeechToTextModal from "./modals/SpeechToTextModal";
import ComparisonModal from "./modals/ComparisonModal";
import { Flight } from "./modals/utils";
import { Hotel } from "./modals/HotelModal";
import { Car } from "./modals/components/CarCard";
import { ChatMessage } from "./hooks/useMobileChat";
import type { ComparisonItem, ComparisonType, BannerConfig } from "./types/phase7";

const MobileChatPage: React.FC = () => {
  const { conversationId: paramConversationId } = useParams<{
    conversationId?: string;
  }>();
  const navigate = useNavigate();

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
      const stops =
        typeof stopsValue === "number"
          ? `${stopsValue} stop${stopsValue === 1 ? "" : "s"}`
          : String(stopsValue ?? "");
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
        imageUrls: Array.isArray(item?.imageUrls)
          ? item.imageUrls.filter((u: any) => typeof u === "string")
          : undefined,
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
      imageUrls: Array.isArray(item?.imageUrls)
        ? item.imageUrls.filter((u: any) => typeof u === "string")
        : undefined,
      description: String(item?.description ?? ""),
      amenities: Array.isArray(item?.amenities)
        ? item.amenities.filter((a: any) => typeof a === "string")
        : [],
    }));
  };

  const normalizeCars = (apiResponse: any): Car[] | undefined => {
    if (!Array.isArray(apiResponse)) return undefined;
    return apiResponse.map((item, idx) => ({
      id: String(item?.id ?? idx),
      brand: String(item?.brand ?? ""),
      model: String(item?.model ?? ""),
      imageUrls: Array.isArray(item?.imageUrls)
        ? item.imageUrls.filter((u: any) => typeof u === "string")
        : undefined,
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

  // Phase 7: Normalize comparison data
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

  const {
    userId,
    isLoggedIn,
    isSidebarOpen,
    setIsSidebarOpen,
    threads,
    threadsLoading,
    messages,
    conversationId,
    isLoading,
    isAwaitingResponse,
    draft,
    setDraft,
    bottomRef,
    deleteButtonsDisabled,
    deletingConversationId,
    assistantFirst,
    toggleAssistantFirst,
    banners,
    dismissBanner,
    openConversation,
    startNewConversation,
    deleteConversation,
    sendMessage,
  } = useMobileChat(paramConversationId);

  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [flightModalOpen, setFlightModalOpen] = useState(false);
  const [carModalOpen, setCarModalOpen] = useState(false);
  const [flightModalData, setFlightModalData] = useState<Flight[] | undefined>();
  const [hotelModalData, setHotelModalData] = useState<Hotel[] | undefined>();
  const [carModalData, setCarModalData] = useState<Car[] | undefined>();
  const [speechModalOpen, setSpeechModalOpen] = useState(false);

  // Phase 7: Comparison modal state
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [comparisonModalData, setComparisonModalData] = useState<ComparisonItem[] | undefined>();
  const [comparisonType, setComparisonType] = useState<ComparisonType | undefined>();


  const handleOpenCarModal = () => {
    setCarModalOpen(true);
    setIsSidebarOpen(false);
  };

  const handleOpenPopup = (messageId: string) => {
    const target = messages.find((m) => m.id === messageId && m.type === "ai") as
      | (ChatMessage & { apiResponseType?: string | null })
      | undefined;
    if (!target) return;
    if (target.apiResponseType === "flights_list") {
      setFlightModalData(normalizeFlights(target.apiResponse));
      setFlightModalOpen(true);
      setIsSidebarOpen(false);
    } else if (target.apiResponseType === "hotels_list") {
      setHotelModalData(normalizeHotels(target.apiResponse));
      setHotelModalOpen(true);
      setIsSidebarOpen(false);
    } else if (target.apiResponseType === "cars_list") {
      setCarModalData(normalizeCars(target.apiResponse));
      setCarModalOpen(true);
      setIsSidebarOpen(false);
    } else if (target.apiResponseType === "comparison_list") {
      // Phase 7: Handle comparison modal
      setComparisonModalData(normalizeComparisons(target.apiResponse));
      setComparisonType(target.apiResponse?.comparison_type || "destination");
      setComparisonModalOpen(true);
      setIsSidebarOpen(false);
    } else if (target.apiResponseType === "compare_flights") {
      // Greeting recommended flights — expand into ComparisonModal
      setComparisonModalData(normalizeComparisons(target.apiResponse));
      setComparisonType(target.apiResponse?.comparison_type || "destination");
      setComparisonModalOpen(true);
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    if (conversationId && conversationId !== paramConversationId) {
      navigate(`/chat/mobile/${conversationId}`, { replace: !paramConversationId });
    }
    // if (!conversationId && paramConversationId) {
    //   navigate(`/chat/mobile`, { replace: true });
    // }
  }, [conversationId, navigate, paramConversationId]);

  return (
    <div className="flex h-screen w-full justify-center overflow-hidden bg-background text-foreground">
      <div className="relative flex h-full w-full max-w-[480px] flex-col bg-background shadow-2xl shadow-black/10">
        <MobileHeader
          isMenuOpen={isSidebarOpen}
          onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
          isLoggedIn={isLoggedIn}
        />

        <MobileSidebar
          isOpen={isSidebarOpen}
          threads={threads}
          threadsLoading={threadsLoading}
          conversationId={conversationId}
          deletingConversationId={deletingConversationId}
          deleteButtonsDisabled={deleteButtonsDisabled}
          assistantFirst={assistantFirst}
          onClose={() => setIsSidebarOpen(false)}
          onNewChat={() => {
            startNewConversation();
            setIsSidebarOpen(false);
          }}
          onToggleAssistantFirst={toggleAssistantFirst}
          onSelectThread={(id) => {
            openConversation(id);
            setIsSidebarOpen(false);
            navigate(`/chat/mobile/${id}`, { replace: false });
          }}
          onDeleteThread={(id) => deleteConversation(id)}
          onOpenFlightModal={() => {
            setFlightModalOpen(true);
            setIsSidebarOpen(false);
          }}
          onOpenHotelModal={() => {
            setHotelModalOpen(true);
            setIsSidebarOpen(false);
          }}
          onOpenCarModal={handleOpenCarModal}
        />

        {banners.length > 0 && (
          <div className="flex flex-col">
            {banners.map((banner: BannerConfig) => (
              <NotificationBanner
                key={banner.id}
                banner={banner}
                onDismiss={dismissBanner}
              />
            ))}
          </div>
        )}

        <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <section className="flex flex-1 min-h-0 flex-col px-4 py-4">
            <div
              className={`no-scrollbar flex flex-1 min-h-0 flex-col gap-5 sm:gap-5 overflow-y-auto rounded-2xl bg-card/60 px-4 py-4 ${messages.length === 0 ? "border border-dashed border-border" : "shadow-sm shadow-black/10 py-0.5"
                }`}
            >
              {threadsLoading && messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                    <p className="text-sm text-muted-foreground">Loading your chats...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                  <p>Start a new conversation to chat with Umoja Assistant.</p>
                  <p className="text-xs">Tap the composer below to begin.</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onOpenPopup={() => handleOpenPopup(msg.id)}
                    />
                  ))}
                  {isAwaitingResponse && (
                    <div className="flex justify-start">
                      <div className="max-w-[90%] rounded-2xl border border-border bg-card px-4 py-3 shadow shadow-black/10 transition-all">
                        <div
                          className="flex items-center gap-3 text-sm text-muted-foreground"
                          role="status"
                          aria-live="polite"
                        >
                          <div className="flex items-center gap-1">
                            <span
                              className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                          <span>Assistant is typing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>
          </section>

          <footer className="sticky bottom-0 z-20 flex-shrink-0 bg-card/95 px-4 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
            <MobileComposer
              draft={draft}
              setDraft={setDraft}
              onSend={sendMessage}
              isLoading={isLoading}
              onMicClick={() => setSpeechModalOpen(true)}
            />
          </footer>
        </main>

        {/* Journey Navigation Button */}
        <div className="fixed bottom-20 right-6 z-50">
          {/* Animated pulse ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 opacity-75 animate-ping" />

          <button
            type="button"
            onClick={() => navigate("/journey")}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 animate-bounce"
            style={{ animationDuration: '2s' }}
            title="Go to Journey"
            aria-label="Go to Journey"
          >
            {/* Icon with subtle rotation animation */}
            <svg className="h-6 w-6 transition-transform duration-300 hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
        </div>

        <HotelModal open={hotelModalOpen} hotels={hotelModalData} onClose={() => setHotelModalOpen(false)} />
        <FlightModal open={flightModalOpen} flights={flightModalData} onClose={() => setFlightModalOpen(false)} />
        <CarModal open={carModalOpen} cars={carModalData} onClose={() => setCarModalOpen(false)} />
        <SpeechToTextModal
          open={speechModalOpen}
          conversationId={conversationId}
          onClose={() => setSpeechModalOpen(false)}
          onDone={(text, language) => {
            if (text.trim()) {
              sendMessage(text, {
                inputMethod: "voice",
                speechLocale: language,
                voiceOutputRequested: true,
              });
            }
            setSpeechModalOpen(false);
          }}
        />
        <ComparisonModal
          open={comparisonModalOpen}
          items={comparisonModalData || []}
          comparisonType={comparisonType || "destination"}
          onClose={() => setComparisonModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default MobileChatPage;
