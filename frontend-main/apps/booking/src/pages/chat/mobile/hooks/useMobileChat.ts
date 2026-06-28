import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getLocalStorageValue } from "../../../../lib/utils";
import CalmNotificationToast from "../components/CalmNotificationToast";
import { BannerConfig, NotificationConfig } from "../types/phase7";
import { fetchAiWithFallback } from "../utils/aiBackend";

export type Thread = {
  id: string;
  updated_at: string;
  title?: string | null;
  last_message?: string | null;
};

export type ChatMessage = {
  id: string;
  type: "human" | "ai" | "recommendation";
  content: string;
  inputMethod?: "text" | "voice";
  autoSpeak?: boolean;
  ttsText?: string;
  voiceEnabled?: boolean;
  aiGenerated?: string;
  // structured payloads from the agent (snake_case on the wire)
  apiResponse?: any;
  apiResponseType?: string | null;
  triggerPopup?: boolean;
  loginUrl?: string;
  agent?: string;
  recommendations?: any[];
  isError?: boolean;
  retryMessage?: string;
};

const assistantFirstStorageKey = "assistant_first_preference";

const ensureGuestId = () => {
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

type ParsedAiPayload = {
  text: string;
  aiGenerated?: string;
  ttsText?: string;
  apiResponse?: any;
  apiResponseType?: string | null;
  toolRaw?: any;
  triggerPopup?: boolean;
};

const normalizeApiResponse = (apiResponse: any, apiResponseType?: string | null) => {
  if (!apiResponse) return apiResponse;
  if (apiResponseType === "flights_list" && Array.isArray(apiResponse)) {
    return apiResponse.map((item) => {
      const baggageValue = item?.baggage;
      let baggage = baggageValue;
      if (baggageValue && typeof baggageValue === "object") {
        const checked = (baggageValue as any).checked;
        const cabin = (baggageValue as any).cabin;
        const parts = [];
        if (checked !== undefined) parts.push(`checked: ${checked}`);
        if (cabin !== undefined) parts.push(`cabin: ${cabin}`);
        baggage = parts.length > 0 ? parts.join(", ") : JSON.stringify(baggageValue);
      }
      return { ...item, baggage };
    });
  }
  return apiResponse;
};

const parseAiPayload = (raw: string): ParsedAiPayload => {
  const text = String(raw ?? "");
  try {
    const candidate = JSON.parse(text);
    if (candidate && typeof candidate === "object") {
      const aiGenerated =
        typeof (candidate as any).ai_generated === "string"
          ? (candidate as any).ai_generated
          : typeof (candidate as any).message === "string"
            ? (candidate as any).message
            : undefined;
      return {
        text: aiGenerated || text,
        aiGenerated,
        ttsText: aiGenerated || undefined,
        apiResponseType: (candidate as any).api_response_type ?? null,
        apiResponse: normalizeApiResponse(
          (candidate as any).api_response,
          (candidate as any).api_response_type
        ),
        toolRaw: (candidate as any).tool_raw,
        triggerPopup: Boolean((candidate as any).trigger_popup),
      };
    }
  } catch {
    // fall through to plain text
  }
  return { text };
};

const stripTips = (value: string) => {
  try {
    return value
      .split("\n")
      .filter(
        (line) => !/^\s*Tip:\s*Use the Checklist button/i.test(line.trim())
      )
      .join("\n");
  } catch {
    return value;
  }
};

const safeStringify = (value: any) => {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
};

const getAssistantContentFromPayload = (payload: any): ParsedAiPayload => {
  // Prefer the latest AI message that carries structured fields
  const msgs = Array.isArray(payload?.messages) ? payload.messages : [];
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const entry = msgs[i];
    if (entry?.role !== "ai") continue;
    const content = entry?.content;
    if (typeof content === "string") {
      const parsed = parseAiPayload(content);
      if (parsed.aiGenerated || parsed.apiResponse || parsed.apiResponseType) {
        return parsed;
      }
      // if this AI message is plain text (e.g., "Handled by ..."), keep scanning earlier ones
      continue;
    }
    if (content && typeof content === "object") {
      const aiGenerated =
        typeof content.ai_generated === "string"
          ? content.ai_generated
          : typeof content.message === "string"
            ? content.message
            : "";
      const candidate: ParsedAiPayload = {
        text: aiGenerated,
        aiGenerated: aiGenerated || undefined,
        ttsText: aiGenerated || undefined,
        apiResponseType: (content as any).api_response_type ?? null,
        apiResponse: normalizeApiResponse(
          (content as any).api_response,
          (content as any).api_response_type
        ),
        toolRaw: (content as any).tool_raw,
        triggerPopup: Boolean((content as any).trigger_popup),
      };
      if (candidate.aiGenerated || candidate.apiResponse || candidate.apiResponseType) {
        return candidate;
      }
    }
  }
  // fallback to top-level message string
  if (typeof payload?.message === "string") {
    return parseAiPayload(payload.message);
  }
  return parseAiPayload(String(payload?.message ?? ""));
};

const getAgentLabelFromPayload = (payload: any): string => {
  const rawRoute = typeof payload?.route === "string" ? payload.route.trim() : "";
  return rawRoute || "Orchestrator";
};

const extractHandledByLabel = (value: string): string | null => {
  const match = value.match(/^\s*handled by\s+(.+)$/i);
  return match ? match[1].trim() : null;
};

export const useMobileChat = (initialConversationId?: string) => {
  const user = getLocalStorageValue("user") as any;
  const [userId] = useState<string>(() => String(user?._id || ensureGuestId()));
  const userName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User"
    : "Guest User";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [assistantFirst, setAssistantFirst] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(assistantFirstStorageKey);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return false;
  });

  const [banners, setBanners] = useState<BannerConfig[]>([]);

  const bootstrapped = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const computeIsLoggedIn = useCallback(() => {
    const loggedIn = getLocalStorageValue("isLoggedIn");
    const token = getLocalStorageValue("token");
    if (loggedIn === true || loggedIn === "true") return true;
    if (typeof token === "string") {
      return !!token && token !== "undefined" && token !== "null";
    }
    return !!token;
  }, []);

  const enrichUserData = useCallback(() => {
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
    try {
      const location = getUserLocation();
      if (user) return { ...user, location };
      return location ? { location } : undefined;
    } catch {
      return user;
    }
  }, [user]);

  const requesterPayload = useMemo(
    () => ({
      user_id: userId,
      user_name: userName,
      username: (getLocalStorageValue("username") as string) || undefined,
      user_data: enrichUserData(),
      is_logged_in: computeIsLoggedIn(),
    }),
    [computeIsLoggedIn, enrichUserData, userId, userName]
  );

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isAwaitingResponse) {
      scrollToBottom();
    }
  }, [isAwaitingResponse, scrollToBottom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(assistantFirstStorageKey, String(assistantFirst));
    } catch {
      // ignore storage errors
    }
  }, [assistantFirst]);

  const showCalmNotification = useCallback((config: NotificationConfig) => {
    toast.custom((t) =>
      React.createElement(CalmNotificationToast, {
        t,
        priority: config.priority,
        title: config.title,
        message: config.message,
        actionLabel: config.actionLabel,
        onAction: config.onAction,
      }),
      {
        duration: config.autoDismiss === false ? Infinity : 5000,
      }
    );
  }, []);

  const showBanner = useCallback((config: BannerConfig) => {
    setBanners((prev) => {
      if (prev.some((b) => b.id === config.id)) return prev;
      return [...prev, config];
    });
  }, []);

  const dismissBanner = useCallback((id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const notifyError = useCallback(
    (message: string) => {
      showCalmNotification({
        priority: "info",
        title: "System Update",
        message: message,
      });
      setError(null);
    },
    [showCalmNotification]
  );

  const loadThreads = useCallback(async (): Promise<Thread[]> => {
    setThreadsLoading(true);
    setError(null);
    try {
      const res = await fetchAiWithFallback(`/api/ai/session/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requesterPayload),
      });
      const data = await res.json().catch(() => null);
      if (data?.conversations && Array.isArray(data.conversations)) {
        const normalized = (data.conversations as Thread[])
          .filter((thread) => {
            if (!thread || !thread.id) return false;
            const lastMessage =
              typeof thread.last_message === "string"
                ? thread.last_message.trim()
                : "";
            const title = typeof thread.title === "string" ? thread.title.trim() : "";
            return lastMessage.length > 0 || title.length > 0;
          })
          .sort((a, b) => {
            const aTime = new Date(a.updated_at).getTime();
            const bTime = new Date(b.updated_at).getTime();
            return bTime - aTime;
          });
        setThreads(normalized);
        return normalized;
      }
      setThreads([]);
      return [];
    } catch (err) {
      const message =
        (err as any)?.message || "Unable to load conversations right now.";
      notifyError(message);
      return [];
    } finally {
      setThreadsLoading(false);
    }
  }, [notifyError, requesterPayload]);

  const openConversation = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setIsAwaitingResponse(false);
      setError(null);
      setConversationId(id);
      try {
        const res = await fetchAiWithFallback(`/api/ai/session/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...requesterPayload, conversation_id: id }),
        });
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.messages)) {
          const history: ChatMessage[] = [];
          const dedupeIndex = new Map<string, number>();
          (data.messages as any[]).forEach((entry, index) => {
            const role = entry?.role === "human" ? "human" : "ai";
            let rawContent = String(entry?.content ?? "");
            let parsed = parseAiPayload(rawContent);
            let content = rawContent;
            const agentRoute = typeof entry?.route === "string" ? entry.route : undefined;
            if (role === "ai" && entry?.content && typeof entry.content === "object") {
              const aiGenerated =
                typeof entry.content.ai_generated === "string"
                  ? entry.content.ai_generated
                  : typeof entry.content.message === "string"
                    ? entry.content.message
                    : "";
              content = aiGenerated || content;
              parsed = {
                text: aiGenerated || parsed.text,
                aiGenerated: aiGenerated || parsed.aiGenerated,
                apiResponse: (entry.content as any).api_response ?? parsed.apiResponse,
                apiResponseType: (entry.content as any).api_response_type ?? parsed.apiResponseType ?? null,
                toolRaw: (entry.content as any).tool_raw ?? parsed.toolRaw,
                triggerPopup:
                  typeof (entry.content as any).trigger_popup === "boolean"
                    ? (entry.content as any).trigger_popup
                    : parsed.triggerPopup,
              };
            }
            if (role === "ai") {
              content = stripTips(parsed.aiGenerated || parsed.text);
              const handledBy = extractHandledByLabel(content);
              if (handledBy && history.length > 0 && history[history.length - 1].type === "ai") {
                history[history.length - 1].agent = handledBy || agentRoute;
                return;
              }
            }
            const normalizedContent =
              role === "ai" ? (parsed.aiGenerated || parsed.text || content) : content;
            const structuredKey =
              role === "ai" && parsed.apiResponseType
                ? `ai_struct|${parsed.apiResponseType}|${safeStringify(parsed.apiResponse)}`
                : null;
            const dedupeKey =
              structuredKey ||
              `${role}|${normalizedContent.trim()}|${role === "ai" ? parsed.apiResponseType ?? "" : ""
              }|${role === "ai" ? safeStringify(parsed.apiResponse) : ""}`;

            const msg: ChatMessage = {
              id: `hist_${index}_${Date.now()}`,
              type: role,
              content,
              aiGenerated: role === "ai" ? content : undefined,
              apiResponse: role === "ai" ? parsed.apiResponse : undefined,
              apiResponseType: role === "ai" ? parsed.apiResponseType : undefined,
              triggerPopup: role === "ai" ? parsed.triggerPopup : undefined,
              agent: role === "ai" ? (agentRoute || undefined) : undefined,
            };

            if (dedupeIndex.has(dedupeKey)) {
              const existingIdx = dedupeIndex.get(dedupeKey)!;
              history[existingIdx] = { ...msg, id: history[existingIdx].id };
            } else {
              dedupeIndex.set(dedupeKey, history.length);
              history.push(msg);
            }
          });
          setMessages(history);
        } else {
          setMessages([]);
        }
      } catch (err) {
        const message =
          (err as any)?.message || "Unable to open this conversation.";
        notifyError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [notifyError, requesterPayload]
  );

  const startNewConversation = useCallback(async () => {
    setIsLoading(true);
    setIsAwaitingResponse(false);
    setError(null);
    try {
      const res = await fetchAiWithFallback(`/api/ai/session/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...requesterPayload,
          warm_welcome: assistantFirst,
        }),
      });
      console.log("Greeter Response", res)
      const data = await res.json().catch(() => null);
      if (data?.conversation_id) {
        const newId = String(data.conversation_id);
        setConversationId(newId);
        setMessages([]);
        await loadThreads();
      }
      console.log("Greeter Parsed Data", data)
      const agentLabel = getAgentLabelFromPayload(data);

      // Try to extract structured data from the full JSON message first,
      // then fall back to warm_welcome.  The backend sets resp["message"]
      // to the full greeting JSON (with api_response, trigger_popup, etc.)
      // and resp["warm_welcome"] to the display text.
      const messageRaw = typeof data?.message === "string" ? data.message : "";
      const warmWelcomeRaw =
        typeof data?.warm_welcome === "string"
          ? data.warm_welcome
          : Array.isArray(data?.warm_welcome)
            ? data.warm_welcome.join("\n")
            : "";

      // Parse structured payload — prefer data.message, fall back to warm_welcome
      let structuredPayload = messageRaw ? parseAiPayload(messageRaw) : null;
      if (!structuredPayload?.apiResponse && warmWelcomeRaw) {
        const fromWelcome = parseAiPayload(warmWelcomeRaw);
        if (fromWelcome.apiResponse || fromWelcome.triggerPopup) {
          structuredPayload = fromWelcome;
        }
      }
      // Also try getAssistantContentFromPayload for /respond-style responses
      if (!structuredPayload?.apiResponse) {
        const fromMessages = getAssistantContentFromPayload(data);
        if (fromMessages.apiResponse || fromMessages.triggerPopup) {
          structuredPayload = fromMessages;
        }
      }

      const displayText = stripTips(
        structuredPayload?.aiGenerated || warmWelcomeRaw || structuredPayload?.text || ""
      );
      const initialContent = (computeIsLoggedIn() && displayText.trim()) || displayText;

      // Destination recommendations are now stored server-side via useDestinationRecommendations hook.
      // The localStorage "umoja_greeting_comparison" write has been removed.

      if (initialContent || data?.login_url) {
        setMessages([
          {
            id: `ai_${Date.now()}`,
            type: "ai",
            content: initialContent,
            aiGenerated: displayText,
            apiResponse: structuredPayload?.apiResponse,
            apiResponseType: structuredPayload?.apiResponseType,
            triggerPopup: structuredPayload?.triggerPopup,
            loginUrl: data?.login_url ? String(data.login_url) : undefined,
            agent: agentLabel,
          },
        ]);
      }
    } catch (err) {
      const message =
        (err as any)?.message || "Unable to create a new conversation.";
      notifyError(message);
    } finally {
      setIsLoading(false);
    }
  }, [assistantFirst, computeIsLoggedIn, loadThreads, notifyError, requesterPayload]);

  const deleteConversation = useCallback(
    async (id: string) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          "Are you sure you want to delete this conversation? This action cannot be undone."
        );
        if (!confirmed) return;
      }
      setDeletingConversationId(id);
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchAiWithFallback(`/api/ai/session/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...requesterPayload,
            conversation_id: id,
          }),
        });
        if (!res.ok) {
          throw new Error("Unable to delete this conversation.");
        }
        const updated = await loadThreads();
        if (conversationId === id) {
          if (updated.length > 0) {
            openConversation(updated[0].id);
          } else {
            setConversationId(null);
            setMessages([]);
            startNewConversation();
          }
        }
        showCalmNotification({
          priority: "info",
          title: "Conversation Deleted",
          message: "The conversation has been successfully removed.",
        });
      } catch (err) {
        const message =
          (err as any)?.message || "Unable to delete this conversation.";
        notifyError(message);
      } finally {
        setIsLoading(false);
        setDeletingConversationId(null);
      }
    },
    [conversationId, loadThreads, notifyError, openConversation, requesterPayload, showCalmNotification, startNewConversation]
  );

  const sendMessage = useCallback(
    async (
      rawMessage: string,
      options?: { inputMethod?: "text" | "voice"; speechLocale?: string; voiceOutputRequested?: boolean }
    ) => {
      const trimmed = rawMessage.trim();
      if (!trimmed) return;
      const inputMethod = options?.inputMethod || "text";
      const userMsg: ChatMessage = {
        id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "human",
        content: trimmed,
        inputMethod,
      };
      setMessages((prev) => [...prev, userMsg]);
      setDraft("");
      setIsLoading(true);
      setIsAwaitingResponse(true);
      setError(null);
      try {
        const res = await fetchAiWithFallback(`/api/ai/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...requesterPayload,
            message: trimmed,
            conversation_id: conversationId || undefined,
            input_method: inputMethod,
            speech_locale: options?.speechLocale,
            voice_output_requested: options?.voiceOutputRequested ?? inputMethod === "voice",
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.conversation_id && !conversationId) {
          setConversationId(String(data.conversation_id));
        }
        const agentLabel = getAgentLabelFromPayload(data);
        const assistantParsed = getAssistantContentFromPayload(data);
        const assistantContent = assistantParsed.aiGenerated || assistantParsed.text;
        const aiMsg: ChatMessage = {
          id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "ai",
          content: stripTips(assistantContent),
          inputMethod,
          autoSpeak: Boolean(data?.auto_play_voice || inputMethod === "voice"),
          ttsText:
            typeof data?.tts_text === "string"
              ? data.tts_text
              : assistantParsed.ttsText,
          voiceEnabled: Boolean(data?.voice_enabled || inputMethod === "voice"),
          aiGenerated: stripTips(assistantContent),
          apiResponse: assistantParsed.apiResponse,
          apiResponseType: assistantParsed.apiResponseType,
          triggerPopup: assistantParsed.triggerPopup,
          loginUrl: data?.login_url ? String(data.login_url) : undefined,
          agent: agentLabel,
        };
        setMessages((prev) => [...prev, aiMsg]);
        loadThreads();
      } catch (err) {
        const message =
          (err as any)?.message || "Something went wrong. Please try again.";
        notifyError(message);
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            type: "ai",
            content: message,
            isError: true,
            retryMessage: trimmed,
            inputMethod,
          },
        ]);
      } finally {
        setIsLoading(false);
        setIsAwaitingResponse(false);
      }
    },
    [conversationId, loadThreads, notifyError, requesterPayload]
  );

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    loadThreads().finally(() => {
      if (initialConversationId) {
        openConversation(initialConversationId);
      } else {
        startNewConversation();
      }
    });
  }, [initialConversationId, loadThreads, openConversation, startNewConversation]);

  return {
    userId,
    userName,
    isLoggedIn: computeIsLoggedIn(),
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
    error,
    bottomRef,
    deleteButtonsDisabled: Boolean(deletingConversationId),
    deletingConversationId,
    assistantFirst,
    toggleAssistantFirst: () => setAssistantFirst((prev) => !prev),
    banners,
    showCalmNotification,
    showBanner,
    dismissBanner,
    loadThreads,
    openConversation,
    startNewConversation,
    deleteConversation,
    sendMessage,
    addMessage: (msg: ChatMessage) => setMessages((prev) => [...prev, msg]),
  };
};
