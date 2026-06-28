import { AnimatePresence, motion } from "framer-motion";
import React, { FormEvent, useRef, useState, useEffect } from "react";
import botIcon from "../../assets/icon/chatbot-icon.svg";
import ChatBoxHeader from "./ChatBoxHeader";
import FloatingChatbotButton from "./FloatingChatBotButton";
// import BookingChecklistPanel from "./BookingChecklistPanel";
import BookingChecklistProgress from "./BookingChecklistProgress";
import ThreadsPanel from "./ThreadsPanel";
import { getLocalStorageValue } from "../../lib/utils";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const ChatBot = () => {
  const [isChatBoxOpen, setIsChatBoxOpen] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = getLocalStorageValue("user");
  const getGuestId = () => {
    try {
      const key = "guestId";
      const stored = localStorage.getItem(key);
      if (stored) return stored;
      const id = `guest_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      localStorage.setItem(key, id);
      return id;
    } catch {
      return `guest_${Date.now()}`;
    }
  };
  const userId = user?._id || getGuestId();
  const userName = user ? `${user.firstName} ${user.lastName}` : "Guest User";
  const aiBackendUrl =
    (process.env.REACT_APP_AI_BACKEND_URL as string) || "http://localhost:8000";
  type ChatMessage = { id: string; type: "human" | "ai"; content: string; loginUrl?: string };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [bookingWelcomeActive, setBookingWelcomeActive] = useState(false);
  const [bookingProgressActive, setBookingProgressActive] = useState(false);
  const [bookingChecklistItems, setBookingChecklistItems] = useState<any[]>([]);
  const [bookingChecklistTitle, setBookingChecklistTitle] = useState<string>("Booking Requirements");
  const [bookingProgress, setBookingProgress] = useState<{ [key: string]: boolean }>({});
  const [threadsOpen, setThreadsOpen] = useState<boolean>(false);
  const [threads, setThreads] = useState<{ id: string; updated_at: string; title?: string | null; last_message?: string | null }[]>([]);
  const [showChecklist, setShowChecklist] = useState<boolean>(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [liveMode, setLiveMode] = useState(false);
  const [voiceVisualizerBars, setVoiceVisualizerBars] = useState<number[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const userAvatarUrl = React.useMemo(() => {
    const p = (user && (user.photo || (user as any)?.data?.photo)) as string | undefined;
    if (!p) return undefined;
    if (/^https?:\/\//i.test(p)) return p;
    const base = (process.env.REACT_APP_BACKEND_URL as string) || "";
    if (!base) return p;
    return p.startsWith("/") ? `${base}${p}` : `${base}/${p}`;
  }, [user]);

  const bodyHeightClass = React.useMemo(() => {
    const count = messages.length;
    if (count >= 10) return "h-[520px]"; // grow a bit more
    if (count >= 5) return "h-[460px]";  // slightly taller than default
    return "h-[400px]";                  // original height
  }, [messages.length]);
  
  const computeIsLoggedIn = () => {
    const v = getLocalStorageValue("isLoggedIn");
    const t = getLocalStorageValue("token");
    return v === true || v === "true" || (typeof t === "string" ? !!t && t !== "undefined" && t !== "null" : !!t);
  };

  const getUserLocation = () => {
    try {
      const raw = localStorage.getItem('user_location');
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
    return undefined;
  };

  const enrichUserData = () => {
    const loc = getUserLocation();
    try {
      if (user) return { ...user, location: loc };
      return loc ? { location: loc } : undefined;
    } catch {
      return user;
    }
  };

  // Prompt for geolocation when opening chat if not yet granted/stored
  const requestLocationIfMissing = async () => {
    try {
      if (localStorage.getItem('user_location')) return;
      if (!('geolocation' in navigator)) return;

      const backend = (process.env.REACT_APP_BACKEND_URL as string) || 'http://localhost:4001';

      const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
        try {
          const res = await fetch(`${backend}/api/location/reverse?lat=${lat}&lon=${lon}`, {
            headers: { 'Accept': 'application/json' },
          });
          if (!res.ok) return null;
          const data = await res.json();
          return data?.city || null;
        } catch {
          return null;
        }
      };

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const city = await reverseGeocode(lat, lon);
            localStorage.setItem('user_location', JSON.stringify({ lat, lon, city: city || null, ts: Date.now() }));
            // Persist preference if logged in
            try {
              const userRaw = localStorage.getItem('user');
              const u = userRaw ? JSON.parse(userRaw) : null;
              const uid = u?._id || u?.id;
              if (uid && city) {
                await fetch(`${backend.replace(/\/$/, '')}/api/ai/user/preferences/update/${uid}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ destinations: [city] }),
                });
              }
            } catch {}
          } catch {}
        },
        () => {
          // Denied or error: do nothing. We’ll prompt again next time.
        },
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 15000 }
      );
    } catch {}
  };

  const checkLoginAndMaybePrompt = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${aiBackendUrl}/api/ai/session/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, user_name: userName, username: (getLocalStorageValue("username") as string) || undefined, user_data: enrichUserData(), is_logged_in: computeIsLoggedIn() }),
      });
      const data = await res.json().catch(() => null);
      if (data) {
        if (data.conversation_id) setConversationId(data.conversation_id as string);
        console.log("[AI] Started new conversation:", data?.conversation_id);
        // new chat starts empty by default
        // fetch threads list for Threads panel
        try {
          const listRes = await fetch(`${aiBackendUrl}/api/ai/session/list`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, user_name: userName, username: (getLocalStorageValue("username") as string) || undefined, user_data: enrichUserData(), is_logged_in: computeIsLoggedIn() }),
          });
                                  const listData = await listRes.json().catch(() => null);
          if (listData?.conversations) {
            console.log("[AI] Conversations list:", listData.conversations);
            const filtered = (listData.conversations as any[]).filter(
              (c) => c && c.last_message != null && c.last_message !== ""
            );
            setThreads(filtered);
          }
        } catch (e) {
          console.warn("[AI] Failed to fetch conversations list:", e);
        }
        if (data.login_url) {
          const aiMsg: ChatMessage = {
            id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: "ai",
            content: String(data.message || "Please login to continue. Click the link below."),
            loginUrl: String(data.login_url),
          };
          setMessages((prev) => [...prev, aiMsg]);
        }
      }
    } catch (err) {
      const aiMsg: ChatMessage = {
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "ai",
        content: `Error contacting AI backend: ${(err as any)?.message || String(err)}`,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const {
    transcript: speechTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Generate random voice visualizer bars
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        const bars = Array.from({ length: 8 }, () => 
          Math.floor(Math.random() * 70) + 10
        );
        setVoiceVisualizerBars(bars);
      }, 150);
      
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isListening]);

  useEffect(() => {
    if (listening) {
      setIsListening(true);
      setLiveMode(true);
    } else {
      setIsListening(false);
    }
  }, [listening]);

  useEffect(() => {
    if (speechTranscript) {
      setTranscript(speechTranscript);
    }
  }, [speechTranscript]);

  const handleVoiceInput = () => {
    if (!isListening) {
      SpeechRecognition.startListening({ continuous: true });
      setLiveMode(true);
    } else {
      SpeechRecognition.stopListening();
      setLiveMode(false);
      if (transcript.trim()) {
        // Send captured transcript to FastAPI and render response
        sendMessage(transcript);
        setTranscript("");
        resetTranscript();
      }
    }
  };

  const cancelVoiceMode = () => {
    SpeechRecognition.stopListening();
    setLiveMode(false);
    setTranscript("");
    resetTranscript();
  };

  // Helper: emphasize emails and "use that" phrase inside text
  const emphasizeInline = (text: string, keyPrefix: string) => {
    const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
    const useThatRegex = /(\buse that\b)/gi;
    // Split by email first, then split non-email chunks by 'use that'
    const chunks: React.ReactNode[] = [];
    let lastIndex = 0;
    const pushText = (t: string, baseKey: string) => {
      let last = 0;
      const parts: React.ReactNode[] = [];
      t.replace(useThatRegex, (m, _g, offset) => {
        if (offset > last) {
          parts.push(<React.Fragment key={`${baseKey}-t-${last}`}>{t.slice(last, offset)}</React.Fragment>);
        }
        parts.push(
          <strong key={`${baseKey}-b-${offset}`} className="font-semibold">
            {m}
          </strong>
        );
        last = offset + m.length;
        return m;
      });
      if (last < t.length) {
        parts.push(<React.Fragment key={`${baseKey}-t-end`}>{t.slice(last)}</React.Fragment>);
      }
      return parts;
    };
    text.replace(emailRegex, (m, offset) => {
      if (offset > lastIndex) {
        const plain = text.slice(lastIndex, offset);
        chunks.push(...pushText(plain, `${keyPrefix}-pre-${lastIndex}`));
      }
      chunks.push(
        <strong key={`${keyPrefix}-email-${offset}`} className="font-semibold">
          {m}
        </strong>
      );
      lastIndex = offset + m.length;
      return m;
    });
    if (lastIndex < text.length) {
      const rest = text.slice(lastIndex);
      chunks.push(...pushText(rest, `${keyPrefix}-post-${lastIndex}`));
    }
    return chunks;
  };

  // Helper: linkify a single line into JSX with clickable URLs and emphasis
  const renderLineWithLinks = (line: string, keyPrefix: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    // If line is of the form "Label: value" (e.g., Payment link: ...), bold the label
    const labelMatch = line.match(/^(Trip type|Departure|Arrival|Outbound flight|Return flight|Passengers|Total baggages|Contact email|Payment link):\s*(.*)$/i);
    const buildInline = (t: string) => {
      const parts = t.split(urlRegex);
      return parts.map((part, idx) => {
        const isUrl = /^https?:\/\/[^\s]+$/i.test(part);
        if (isUrl) {
          const isStripe = /https?:\/\/checkout\.stripe\.com\//i.test(part);
          return (
            <a
              key={`${keyPrefix}-a-${idx}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline break-all"
            >
              {isStripe ? 'Stripe Payment Link' : part}
            </a>
          );
        }
        return <React.Fragment key={`${keyPrefix}-t-${idx}`}>{emphasizeInline(part, `${keyPrefix}-e-${idx}`)}</React.Fragment>;
      });
    };
    if (labelMatch) {
      const label = labelMatch[1];
      const rest = labelMatch[2] || "";
      return (
        <p key={keyPrefix} className="leading-relaxed">
          <strong className="font-semibold">{label}:</strong> {buildInline(rest)}
        </p>
      );
    }
    return (
      <p key={keyPrefix} className="leading-relaxed">
        {buildInline(line)}
      </p>
    );
  };

  // Simple helper to send a message to FastAPI and append both sides
  const sendMessage = async (rawMessage: string) => {
    const trimmed = rawMessage.trim();
    if (!trimmed) return;
    const userMsg = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: "human" as const,
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    try {
      // Let backend booking agent classify readiness / continue flow
      const res = await fetch(`${aiBackendUrl}/api/ai/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          user_name: userName,
          username: (getLocalStorageValue("username") as string) || undefined,
          user_data: enrichUserData(),
          message: trimmed,
          is_logged_in: computeIsLoggedIn(),
          conversation_id: conversationId || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.conversation_id && !conversationId) setConversationId(String(data.conversation_id));
      let text = data?.message ? String(data.message) : JSON.stringify(data ?? { ok: false }, null, 2);
      // Detect structured booking payloads and reflect server-side progress
      try {
        const maybe = JSON.parse(text);
        if (maybe && (maybe.type === 'booking_welcome' || maybe.type === 'booking_progress_start' || maybe.type === 'booking_summary' || maybe.type === 'booking_payment')) {
          // Sync checklist items/title if provided
          if (Array.isArray(maybe.items)) setBookingChecklistItems(maybe.items);
          if (typeof maybe.title === 'string') setBookingChecklistTitle(maybe.title);
          // Turn on progress panel during booking lifecycle
          setBookingWelcomeActive(maybe.type === 'booking_welcome');
          setBookingProgressActive(maybe.type !== 'booking_welcome');
          // If backend sent completed map, prefer it over heuristics
          if (maybe.completed && typeof maybe.completed === 'object') {
            setBookingProgress(maybe.completed as Record<string, boolean>);
          }
        }
        if (maybe && maybe.type === 'booking_welcome') {
          setBookingWelcomeActive(true);
          text = (maybe.greeting || 'Booking started. Are you ready?') + "\n\nTip: Use the Checklist button (top-right) to view progress.";
        }
        if (maybe && (maybe.type === 'booking_progress_start' || maybe.type === 'booking_summary')) {
          text = (maybe.prompt || 'First, please choose your trip type: oneway or roundtrip.') + "\n\nTip: Use the Checklist button (top-right) to view progress.";
        }
        if (maybe && maybe.type === 'booking_payment') {
          text = (maybe.prompt || 'Payment link generated.') + "\n\nTip: Use the Checklist button (top-right) to view progress.";
        }
      } catch {}
      // Remove tip lines from AI text to keep messages concise
      try {
        const lines = text.split("\n");
        const cleaned = lines.filter(
          (l) => !/^\s*Tip:\s*Use the Checklist button/i.test(l.trim())
        );
        text = cleaned.join("\n");
      } catch {}
      // Heuristic backup (only if backend didn't send completed)
      try {
        const low = text.toLowerCase();
        setBookingProgress((prev) => {
          const next = { ...prev };
          if (low.includes('trip type set to')) next['tripType'] = true;
          if (low.startsWith('flight selected:')) next['flightId'] = true;
          return next;
        });
      } catch {}
      const aiMsg: ChatMessage = {
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "ai",
        content: text,
        loginUrl: data?.login_url ? String(data.login_url) : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const aiMsg = {
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "ai" as const,
        content: `Error contacting AI backend: ${
          (err as any)?.message || String(err)
        }`,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Normalize legacy AI JSON messages when loading history
  const parseAiPayload = (raw: string): { text: string; meta?: any } => {
    let text = String(raw || "");
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === 'object' && typeof obj.prompt === 'string') {
        text = obj.prompt as string;
        // Keep meta so we can sync checklist state
        return { text, meta: obj };
      }
    } catch {}
    return { text };
  };

  const stripTips = (t: string) => {
    try {
      const lines = t.split("\n");
      return lines.filter((l) => !/^\s*Tip:\s*Use the Checklist button/i.test(l.trim())).join("\n");
    } catch {
      return t;
    }
  };

  // Function to log all user information
  const logUserInfo = () => {
    console.log("=== User Information ===");
    console.log("User Object:", user);
    console.log("User ID:", userId);
    console.log("User Name:", userName);
    console.log("Is Logged In:", getLocalStorageValue("isLoggedIn"));
    console.log("Token:", getLocalStorageValue("token"));
    console.log("Username (email):", getLocalStorageValue("username"));
    console.log("=====================");
  };

  // Call logUserInfo when component mounts and ping AI backend
  React.useEffect(() => {
    logUserInfo();
    // Simple ping to the FastAPI AI backend
    fetch(`${aiBackendUrl}/api/ai/hello`)
      .then((res) => res.json())
      .then((data) => {
        console.debug("AI backend hello:", data);
      })
      .catch((err) => {
        console.warn("AI backend not reachable:", err?.message || err);
      });
  }, []);

  // When the chat opens, check login state and prompt if needed
  useEffect(() => {
    if (isChatBoxOpen) {
      checkLoginAndMaybePrompt();
    }
  }, [isChatBoxOpen]);

  // Always scroll to the bottom when messages change or chat opens
  useEffect(() => {
    // Prefer end marker for smooth behavior
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    // Also force scroll container if needed
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isChatBoxOpen]);

  function handleToggleChatBox(isOpen: boolean) {
    if (isOpen) {
      // Fire the permission prompt as the user opens the chatbot
      requestLocationIfMissing();
    }
    setIsChatBoxOpen(isOpen);
  }

  return (
    <div>
      {isChatBoxOpen && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0, transformOrigin: "bottom right" }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-full max-w-[350px] rounded-2xl overflow-hidden shadow-[0px_6px_12px_rgba(0,0,0,0.2)]">
              {/* Chatbot Header */}
              <ChatBoxHeader
                onClose={() => {
                  handleToggleChatBox(false);
                }}
                isloading={isLoading}
                userName={userName}
              />
              {/* Chatbot Body */}
              <div className={`relative ${bodyHeightClass} p-3 flex flex-col justify-between gap-2 transition-colors duration-300 ${liveMode ? 'bg-gray-900' : 'bg-[#DCE9FF] bg-opacity-75 backdrop-blur-sm'}`}>
                {/* Live Mode UI */}
                {liveMode && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900 bg-opacity-95 backdrop-blur-sm rounded-b-2xl">
                    <div className="flex flex-col items-center justify-center space-y-6 p-4 w-full">
                      <div className="relative">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-blue-600 ${isListening ? 'animate-pulse' : ''}`}>
                          {isListening ? (
                            <div className="flex items-end justify-center h-12 space-x-1">
                              {voiceVisualizerBars.map((height, index) => (
                                <div 
                                  key={index}
                                  style={{ height: `${height}%` }}
                                  className="w-1 bg-white rounded-t-sm transition-all duration-150"
                                ></div>
                              ))}
                            </div>
                          ) : (
                            <svg
                              className="w-12 h-12 text-white"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12 2C10.3431 2 9 3.34315 9 5V11C9 12.6569 10.3431 14 12 14C13.6569 14 15 12.6569 15 11V5C15 3.34315 13.6569 2 12 2Z"
                                fill="currentColor"
                              />
                              <path
                                d="M19 11C19 14.866 15.866 18 12 18C8.13401 18 5 14.866 5 11M12 22V18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="absolute -inset-1">
                          <div className={`w-[calc(100%+8px)] h-[calc(100%+8px)] rounded-full ${isListening ? 'animate-ping-slow opacity-75 bg-blue-500' : 'opacity-0'}`}></div>
                        </div>
                        
                        {/* Animated rings */}
                        {isListening && (
                          <>
                            <div className="absolute -inset-3 opacity-20">
                              <div className="w-[calc(100%+24px)] h-[calc(100%+24px)] rounded-full animate-ping-slow bg-blue-400" style={{ animationDelay: '0.5s' }}></div>
                            </div>
                            <div className="absolute -inset-5 opacity-10">
                              <div className="w-[calc(100%+40px)] h-[calc(100%+40px)] rounded-full animate-ping-slow bg-blue-300" style={{ animationDelay: '1s' }}></div>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="text-center">
                        <p className="text-gray-300 font-medium text-lg">
                          {isListening ? "Listening..." : "Processing..."}
                        </p>
                        {transcript && (
                          <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-white font-medium text-xl mt-2 max-w-[280px] break-words"
                          >
                            {transcript}
                          </motion.p>
                        )}
                      </div>
                      
                      <button 
                        onClick={cancelVoiceMode}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    
                    {/* Small dots floating around - decorative effect */}
                    {isListening && Array.from({ length: 10 }).map((_, i) => (
                      <motion.div 
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-blue-400 opacity-70"
                        initial={{ 
                          x: Math.random() * 300 - 150, 
                          y: Math.random() * 300 - 150,
                          opacity: 0
                        }}
                        animate={{ 
                          x: Math.random() * 300 - 150, 
                          y: Math.random() * 300 - 150,
                          opacity: [0, 0.7, 0] 
                        }}
                        transition={{ 
                          duration: Math.random() * 3 + 2, 
                          repeat: Infinity, 
                          repeatType: "loop",
                          delay: Math.random() * 2
                        }}
                      />
                    ))}
                  </div>
                )}
                
                {/* Chatting Area */}
                <div ref={scrollContainerRef} className="relative flex-1 flex flex-col gap-4 overflow-y-scroll hide-scrollbar">
                  {(() => {
                    // Find the last human message index
                    let lastHumanIndex = -1;
                    for (let i = messages.length - 1; i >= 0; i--) {
                      if (messages[i].type === 'human') { lastHumanIndex = i; break; }
                    }
                    const elements: JSX.Element[] = [];
                    messages.forEach((message, index) => {
                      const uniqueKey = `${message.id}-${index}`;
                      elements.push(
                        <div
                          key={uniqueKey}
                          className={`flex items-end ${message.type === "human" ? "justify-end" : "justify-start"}`}
                        >
                          {message.type === "ai" && (
                            <img src={botIcon} alt="AI" className="w-7 h-7 rounded-full mr-2" />
                          )}
                          <div className={`flex flex-col ${message.type === "human" ? "items-end" : "items-start"} max-w-[85%]`}>
                            <div
                              className={`w-full bg-white text-sm rounded-2xl ${
                                message.type === "ai" ? "rounded-bl-none" : "rounded-br-none"
                              } px-4 py-2`}
                            >
                              <div className="whitespace-pre-wrap break-words">
                                {message.content.split("\n").map((line, i) => (
                                  renderLineWithLinks(line, `${message.id}-ln-${i}`)
                                ))}
                                {message.loginUrl && (
                                  <div className="mt-2">
                                    <a
                                      href={message.loginUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 underline"
                                    >
                                      Login
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {message.type === "human" && (
                            userAvatarUrl ? (
                              <img src={userAvatarUrl} alt="You" className="w-7 h-7 rounded-full ml-2 object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full ml-2 bg-gray-400 flex items-center justify-center text-white text-xs">U</div>
                            )
                          )}
                        </div>
                      );
                      // Inject checklist right after the latest user message
                      if ((bookingProgressActive || bookingWelcomeActive) && showChecklist && index === lastHumanIndex) {
                        elements.push(
                          <div key={`checklist-${index}`} className="mt-2">
                      <BookingChecklistProgress title={bookingChecklistTitle} items={bookingChecklistItems} completedKeys={Object.keys(bookingProgress).filter((k)=>bookingProgress[k])} />
                          </div>
                        );
                      }
                    });
                    return elements;
                  })()}
                  <div ref={bottomRef} />
                </div>
                {/* Chat Input */}
                <div className="p-3">
                  <form
                    onSubmit={(e: FormEvent<HTMLFormElement>) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const message = formData.get("message") as string;
                      const trimmedMessage = message.trim();
                      if (!trimmedMessage) return;
                      e.currentTarget.reset();
                      // Send to FastAPI backend and show response
                      sendMessage(trimmedMessage);
                    }}
                    className="border border-[#2152A3] border-opacity-50 rounded-xl overflow-hidden bg-white flex items-center justify-between gap-1"
                  >
                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      className={`p-2 transition-all duration-300 ${
                        isListening ? "text-red-500 animate-pulse" : "text-[#2152A3]"
                      }`}
                      disabled={!browserSupportsSpeechRecognition}
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 2C10.3431 2 9 3.34315 9 5V11C9 12.6569 10.3431 14 12 14C13.6569 14 15 12.6569 15 11V5C15 3.34315 13.6569 2 12 2Z"
                          fill="currentColor"
                        />
                        <path
                          d="M19 11C19 14.866 15.866 18 12 18C8.13401 18 5 14.866 5 11M12 22V18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <input
                      type="text"
                      name="message"
                      ref={inputRef}
                      placeholder={isListening ? "Listening..." : "Ask me anything..."}
                      className="grow h-11 indent-2 bg-transparent text-sm outline-none -mt-1"
                      disabled={isLoading || isListening}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || isListening}
                      className="pl-1 pr-2"
                    >
                      {isLoading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      ) : (
                        <svg
                          className="text-[#2152A3] text-2xl active:scale-95"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M22 2L11 13"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M22 2L15 22L11 13L2 9L22 2Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    {/* moved Checklist and Threads buttons below View User Info */}
                  </form>
                  {threadsOpen && (
                    <div className="mt-2">
                      <ThreadsPanel
                        threads={threads}
                        loading={isLoading}
                        onNew={async () => {
                          setIsLoading(true);
                          try {
                            const res = await fetch(`${aiBackendUrl}/api/ai/session/new`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ user_id: userId, user_name: userName, username: (getLocalStorageValue('username') as string) || undefined, user_data: enrichUserData(), is_logged_in: computeIsLoggedIn() }),
                            });
                            const data = await res.json();
                            if (data?.conversation_id) {
                              setConversationId(String(data.conversation_id));
                              setMessages([]);
                              try {
                                const listRes = await fetch(`${aiBackendUrl}/api/ai/session/list`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ user_id: userId, user_name: userName, username: (getLocalStorageValue('username') as string) || undefined, user_data: enrichUserData(), is_logged_in: computeIsLoggedIn() }),
                                });
                                const listData = await listRes.json().catch(() => null);
                                if (listData?.conversations) {
                                  const filtered = (listData.conversations as any[]).filter(
                                    (c) => c && c.last_message != null && c.last_message !== ""
                                  );
                                  setThreads(filtered);
                                }
                              } catch (e: any) {
                                setMessages(prev => [...prev, { id: `a_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, type: 'ai', content: `Error loading threads: ${e?.message || e}` }]);
                              }
                            }
                          } catch (e: any) {
                            setMessages(prev => [...prev, { id: `a_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, type: 'ai', content: `Error creating new chat: ${e?.message || e}` }]);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        onSelect={async (id: string) => {
                          try {
                            setIsLoading(true);
                            const res = await fetch(`${aiBackendUrl}/api/ai/session/start`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ user_id: userId, user_name: userName, username: (getLocalStorageValue("username") as string) || undefined, user_data: enrichUserData(), is_logged_in: computeIsLoggedIn(), conversation_id: id }),
                            });
                            const data = await res.json();
                            if (data?.conversation_id) setConversationId(String(data.conversation_id));
                            if (Array.isArray(data?.messages)) {
                              console.log("[AI] Loaded conversation", id, "messages:", data.messages);
                              // Map and normalize AI JSON payloads to readable text
                              let lastMeta: any = null;
                              const hist = (data.messages as any[]).map((m, idx) => {
                                const role = m.role === 'human' ? 'human' : 'ai';
                                let content = String(m.content || '');
                                if (role === 'ai') {
                                  const parsed = parseAiPayload(content);
                                  content = stripTips(parsed.text);
                                  if (parsed.meta) lastMeta = parsed.meta;
                                }
                                return {
                                  id: `h_${idx}_${Date.now()}`,
                                  type: role,
                                  content,
                                } as ChatMessage;
                              });
                              setMessages(hist);
                              // If last AI message had structured meta, sync checklist/UI state
                              if (lastMeta) {
                                try {
                                  if (Array.isArray(lastMeta.items)) setBookingChecklistItems(lastMeta.items);
                                  if (typeof lastMeta.title === 'string') setBookingChecklistTitle(lastMeta.title);
                                  if (lastMeta.completed && typeof lastMeta.completed === 'object') {
                                    setBookingProgress(lastMeta.completed as Record<string, boolean>);
                                  }
                                  const t = String(lastMeta.type || '');
                                  setBookingWelcomeActive(t === 'booking_welcome');
                                  setBookingProgressActive(t !== 'booking_welcome');
                                } catch {}
                              }
                            }
                            setThreadsOpen(false);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                      />
                    </div>
                  )}
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={logUserInfo}
                      className="text-[0.65rem] text-blue-500 hover:text-blue-700"
                    >
                      View User Info
                    </button>
                  </div>
                  {/* Action buttons placed below View User Info */}
                  <div className="mt-2 flex items-center justify-center gap-2">
                    {(bookingWelcomeActive || bookingProgressActive) && (
                      <button
                        type="button"
                        onClick={() => setShowChecklist(!showChecklist)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          showChecklist ? 'bg-[#2152A3] text-white border-[#2152A3]' : 'bg-white text-[#2152A3] border-[#2152A3]'
                        }`}
                        title={showChecklist ? 'Hide booking checklist' : 'Show booking checklist'}
                      >
                        {showChecklist ? 'Hide Checklist' : 'Checklist'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setThreadsOpen(!threadsOpen)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-[#2152A3] border-[#2152A3]"
                      title={threadsOpen ? 'Hide conversations' : 'Show conversations'}
                    >
                      {threadsOpen ? 'Hide Threads' : 'Threads'}
                    </button>
                  </div>
                  <p className="mt-1 text-[0.65rem] font-light text-center">
                    Umoja Chatbot V 0.1.05 all right reserved.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
      {!isChatBoxOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, transformOrigin: "bottom right" }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5, transformOrigin: "bottom right" }}
          transition={{ duration: 0.3 }}
        >
          <div className="">
            <FloatingChatbotButton onClick={() => handleToggleChatBox(true)} />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ChatBot;

