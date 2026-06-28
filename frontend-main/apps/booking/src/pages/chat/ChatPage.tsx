import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiMaximize2,
  FiPlus,
  FiSend,
  FiToggleLeft,
  FiToggleRight,
  FiTrash2,
} from "react-icons/fi";
import { RxHamburgerMenu } from "react-icons/rx";
import { Link } from "react-router-dom";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import Logo from "../../common/Logo";
import DarkModeSwitcher from "../Header/DarkModeSwitcher";
import DropdownNotification from "../Header/DropdownNotification";
import DropdownUser from "../Header/DropdownUser";
import toast from "react-hot-toast";
import {
  getLocalStorageValue,
  removeLocalStorageValue,
} from "../../lib/utils";
import AssistantResponseModal from "./AssistantResponseModal";

type Thread = {
  id: string;
  updated_at: string;
  title?: string | null;
  last_message?: string | null;
};

type ChatMessage = {
  id: string;
  type: "human" | "ai";
  content: string;
  loginUrl?: string;
  agent?: string;
};

const aiBackendUrl =
  (process.env.REACT_APP_AI_BACKEND_URL as string) || "http://localhost:8000";

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

const parseAiPayload = (raw: string): { text: string } => {
  let text = String(raw ?? "");
  try {
    const candidate = JSON.parse(text);
    if (candidate && typeof candidate === "object") {
      if ("prompt" in candidate && typeof candidate.prompt === "string") {
        text = candidate.prompt;
      } else if ("message" in candidate && typeof candidate.message === "string") {
        text = candidate.message;
      }
    }
  } catch {
    // ignore – fallback to plain string
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

const getAssistantContentFromPayload = (payload: any): string => {
  if (payload && Array.isArray(payload.messages) && payload.messages[-1]) {
    const firstEntry = payload.messages[-1];
    if (firstEntry && typeof firstEntry.content === "string") {
      const parsed = parseAiPayload(firstEntry.content);
      return parsed.text || "";
    }
  }
  const fallback = parseAiPayload(String(payload?.message ?? ""));
  return fallback.text || "";
};

const getAgentLabelFromPayload = (payload: any): string => {
  const rawRoute = typeof payload?.route === "string" ? payload.route.trim() : "";
  return rawRoute || "Orchestrator";
};

const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes || {}),
    img: [
      ...((defaultSchema.attributes?.img as any[]) || []),
      ["width"],
      ["height"],
    ],
    td: [
      ...((defaultSchema.attributes?.td as any[]) || []),
      ["align"],
    ],
    th: [
      ...((defaultSchema.attributes?.th as any[]) || []),
      ["align"],
    ],
  },
} as typeof defaultSchema;

const ChatPage: React.FC = () => {
  const user = getLocalStorageValue("user") as any;
  const [userId] = useState<string>(() => String(user?._id || ensureGuestId()));
  const userName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User"
    : "Guest User";
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expandedMessage, setExpandedMessage] = useState<ChatMessage | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const bootstrapped = useRef(false);
  const [assistantFirst, setAssistantFirst] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(assistantFirstStorageKey);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return false;
  });

  // Refresh geolocation on every mount so cached location + timestamp stay current.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) return;

    const backend =
      (process.env.REACT_APP_BACKEND_URL as string) || "http://localhost:4001";

    const reverseGeocode = async (
      lat: number,
      lon: number
    ): Promise<{
      city: string | null;
      display_name: string | null;
      address: Record<string, any> | null;
      bounding_box: any;
    } | null> => {
      try {
        const res = await fetch(
          `${backend.replace(/\/$/, "")}/api/location/reverse?lat=${encodeURIComponent(
            lat
          )}&lon=${encodeURIComponent(lon)}`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return {
          city: data?.city ?? null,
          display_name: data?.display_name ?? null,
          address: data?.address ?? null,
          bounding_box: data?.bounding_box ?? null,
        };
      } catch {
        return null;
      }
    };

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const reverseData = await reverseGeocode(lat, lon);
            const city = reverseData?.city ?? null;
            const ts = Date.now();
            const tsIso = new Date(ts).toISOString();
            const tsLocale = new Date(ts).toLocaleString();
            localStorage.setItem(
              "user_location",
              JSON.stringify({
                lat,
                lon,
                city,
                display_name: reverseData?.display_name ?? null,
                address: reverseData?.address ?? null,
                bounding_box: reverseData?.bounding_box ?? null,
                ts,
                ts_iso: tsIso,
                ts_locale: tsLocale,
              })
            );
            // If user is logged in, try to sync a preference hint.
            try {
              const userRaw = localStorage.getItem("user");
              const parsedUser = userRaw ? JSON.parse(userRaw) : null;
            const userId = parsedUser?._id || parsedUser?.id;
            if (userId && city) {
              await fetch(
                `${backend.replace(/\/$/, "")}/api/ai/user/preferences/update/${userId}`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ destinations: [city] }),
                }
              );
            }
          } catch {}
        } catch {}
      },
      () => {
        // Denied or errored; next visit will prompt again.
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    setIsSidebarOpen(media.matches);
    const handler = (event: MediaQueryListEvent) => {
      setIsSidebarOpen(event.matches);
    };
    if (media.addEventListener) {
      media.addEventListener("change", handler);
    } else {
      media.addListener(handler);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", handler);
      } else {
        media.removeListener(handler);
      }
    };
  }, []);

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

  const isLoggedIn = computeIsLoggedIn();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(assistantFirstStorageKey, String(assistantFirst));
    } catch {
      // ignore storage errors
    }
  }, [assistantFirst]);

  const renderComposer = (centered: boolean) => (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        sendMessage(draft);
      }}
      className={`flex w-full items-end gap-3 ${centered ? "justify-center" : ""}`}
    >
      <div
        className={`flex items-end gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm ${
          centered ? "w-full max-w-3xl" : "w-full"
        }`}
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type your message in markdown..."
          rows={2}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
              return;
            }
            event.preventDefault();
            if (!isLoading && draft.trim()) {
              sendMessage(draft);
            }
          }}
          className="flex-1 resize-none border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          disabled={isLoading}
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={isLoading || !draft.trim()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-[1.02] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiSend className="text-lg" />
        </button>
      </div>
    </form>
  );

  const sidebarClassNames = [
    "flex flex-col h-full overflow-hidden border-r border-border/80 bg-card/95 backdrop-blur shadow-sm transition-all duration-300",
    "absolute inset-y-0 left-0 z-40 w-72 max-w-full lg:relative lg:z-auto lg:flex-shrink-0",
    "lg:translate-x-0",
    isSidebarOpen
      ? "translate-x-0 opacity-100 lg:w-80 lg:opacity-100 lg:pointer-events-auto lg:border-border/80"
      : "-translate-x-full opacity-0 pointer-events-none lg:w-0 lg:opacity-0 lg:pointer-events-none lg:border-transparent"
  ].join(" ");
  const deleteButtonsDisabled = Boolean(deletingConversationId);

  const loadThreads = useCallback(async (): Promise<Thread[]> => {
    setThreadsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${aiBackendUrl}/api/ai/session/list`, {
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
            const title =
              typeof thread.title === "string" ? thread.title.trim() : "";
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
      setError(message);
      return [];
    } finally {
      setThreadsLoading(false);
    }
  }, [requesterPayload]);

  const openConversation = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setIsAwaitingResponse(false);
      setError(null);
      setConversationId(id);
      try {
        const res = await fetch(`${aiBackendUrl}/api/ai/session/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...requesterPayload, conversation_id: id }),
        });
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.messages)) {
          const history = (data.messages as any[]).map((entry, index) => {
            const role = entry?.role === "human" ? "human" : "ai";
            let content = String(entry?.content ?? "");
            if (role === "ai") {
              const parsed = parseAiPayload(content);
              content = stripTips(parsed.text);
            }
            return {
              id: `hist_${index}_${Date.now()}`,
              type: role,
              content,
            } as ChatMessage;
          });
          setMessages(history);
        } else {
          setMessages([]);
        }
      } catch (err) {
        const message =
          (err as any)?.message || "Unable to open this conversation.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [requesterPayload]
  );

  const startNewConversation = useCallback(async () => {
    setIsLoading(true);
    setIsAwaitingResponse(false);
    setError(null);
    try {
      const res = await fetch(`${aiBackendUrl}/api/ai/session/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...requesterPayload,
          warm_welcome: assistantFirst,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.conversation_id) {
        const newId = String(data.conversation_id);
        setConversationId(newId);
        setMessages([]);
        await loadThreads();
      }
      const agentLabel = getAgentLabelFromPayload(data);
      const warmWelcomeRaw =
        typeof data?.warm_welcome === "string"
          ? data.warm_welcome
          : Array.isArray(data?.warm_welcome)
          ? data.warm_welcome.join("\n")
          : "";
      const warmWelcome = stripTips(warmWelcomeRaw);
      const assistantContent = stripTips(
        getAssistantContentFromPayload(data)
      );
      const initialContent =
        (isLoggedIn && warmWelcome.trim()) || assistantContent;

      if (initialContent || data?.login_url) {
        setMessages([
          {
            id: `ai_${Date.now()}`,
            type: "ai",
            content: initialContent,
            loginUrl: data?.login_url ? String(data.login_url) : undefined,
            agent: agentLabel,
          },
        ]);
      }
    } catch (err) {
      const message =
        (err as any)?.message || "Unable to create a new conversation.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [assistantFirst, isLoggedIn, loadThreads, requesterPayload]);

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
        const res = await fetch(`${aiBackendUrl}/api/ai/session/delete`, {
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
        toast.success("Conversation deleted.");
      } catch (err) {
        const message =
          (err as any)?.message || "Unable to delete this conversation.";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
        setDeletingConversationId(null);
      }
    },
    [
      conversationId,
      loadThreads,
      openConversation,
      requesterPayload,
      startNewConversation,
    ]
  );

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    loadThreads().finally(() => {
      startNewConversation();
    });
  }, [loadThreads, startNewConversation]);

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const trimmed = rawMessage.trim();
      if (!trimmed) return;
      const userMsg: ChatMessage = {
        id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "human",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setDraft("");
      setIsLoading(true);
      setIsAwaitingResponse(true);
      setError(null);
      try {
        const res = await fetch(`${aiBackendUrl}/api/ai/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...requesterPayload,
            message: trimmed,
            conversation_id: conversationId || undefined,
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.conversation_id && !conversationId) {
          setConversationId(String(data.conversation_id));
        }
        console.log("AI response data:", data);
        const agentLabel = getAgentLabelFromPayload(data);
        const assistantContent = getAssistantContentFromPayload(data);
        const aiMsg: ChatMessage = {
          id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "ai",
          content: stripTips(assistantContent),
          loginUrl: data?.login_url ? String(data.login_url) : undefined,
          agent: agentLabel,
        };
        setMessages((prev) => [...prev, aiMsg]);
        loadThreads();
      } catch (err) {
        const message =
          (err as any)?.message || "Something went wrong. Please try again.";
        setError(message);
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            type: "ai",
            content: message,
          },
        ]);
      } finally {
        setIsLoading(false);
        setIsAwaitingResponse(false);
      }
    },
    [conversationId, loadThreads, requesterPayload]
  );

  const handleExpandMessage = useCallback((message: ChatMessage) => {
    setExpandedMessage(message);
  }, []);

  const closeExpandedMessage = useCallback(() => {
    setExpandedMessage(null);
  }, []);

  return (
    <div className="h-screen min-h-screen w-full overflow-hidden flex flex-col bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-card/90 backdrop-blur">
        <div className="flex w-full items-center justify-between px-10 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label="Toggle conversations"
              aria-expanded={isSidebarOpen}
              aria-controls="chat-sidebar"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-md border border-border/80 bg-card shadow-sm transition-colors hover:bg-muted ${isSidebarOpen ? "ring-2 ring-primary/40" : ""}`}
            >
              <RxHamburgerMenu className="text-lg" />
            </button>
            <Logo />
            <div className="hidden sm:flex flex-col">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Umoja Assistant
              </span>
              <span className="text-base font-semibold">
                Intelligent Chat Console
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <ul className="flex items-center gap-2">
                  <DarkModeSwitcher />
                  <DropdownNotification />
                </ul>
                <DropdownUser />
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => {
                  removeLocalStorageValue("isLoggedIn");
                  removeLocalStorageValue("user");
                }}
                className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-card px-4 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-primary/10"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden bg-background">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Hide conversations"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
          />
        )}
        <aside id="chat-sidebar" className={sidebarClassNames}>
          <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border/70">
            <button
              type="button"
              onClick={startNewConversation}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 transition-colors text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-50"
              disabled={isLoading}
            >
              <FiPlus className="text-base" />
              New Chat
            </button>
            <button
              type="button"
              onClick={() => setAssistantFirst((prev) => !prev)}
              className={`flex items-center justify-center text-2xl transition-colors ${
                assistantFirst
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={assistantFirst}
              aria-label="Let AI start the conversation"
              title="Let AI start the conversation"
            >
              {assistantFirst ? (
                <FiToggleRight className="text-4xl" />
              ) : (
                <FiToggleLeft className="text-4xl" />
              )}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {threadsLoading && threads.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Loading conversations...
              </div>
            ) : threads.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground/80">
                No conversations yet. Start a new chat to begin.
              </div>
            ) : (
              threads.map((thread) => {
                const isActive = conversationId === thread.id;
                const isDeletingThis = deletingConversationId === thread.id;
                const subtitle =
                  thread.last_message ||
                  "No messages yet. Say hello to kick things off.";
                const normalizedSubtitle = subtitle.replace(/\s+/g, " ").trim();
                const truncatedSubtitle =
                  normalizedSubtitle.length > 140
                    ? `${normalizedSubtitle.slice(0, 137)}...`
                    : normalizedSubtitle;
                const displayTitle =
                  (thread.title && thread.title.trim()) ||
                  truncatedSubtitle.slice(0, 48) ||
                  "Conversation";
                return (
                  <div
                    key={thread.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openConversation(thread.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openConversation(thread.id);
                      }
                    }}
                    className={`relative w-full rounded-xl border px-4 py-3 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 ${
                      isActive
                        ? "border-primary/60 bg-primary/10 shadow-lg shadow-primary/20 text-foreground"
                        : "border-border hover:bg-muted/70"
                    }`}
                  >
                    {isDeletingThis && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-background/80 text-xs font-semibold text-pink-500 backdrop-blur-sm">
                        <span className="h-4 w-4 rounded-full border-2 border-pink-400 border-t-transparent animate-spin" />
                        Deleting...
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isActive ? "text-primary" : "text-foreground"
                        }`}
                        title={displayTitle}
                      >
                        {displayTitle}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {thread.updated_at
                            ? new Date(thread.updated_at).toLocaleString()
                            : ""}
                        </span>
                        <button
                          type="button"
                          className={`rounded-md p-1 transition-colors ${
                            deleteButtonsDisabled
                              ? "cursor-not-allowed text-muted-foreground/40"
                              : "text-muted-foreground/80 hover:text-red-500 hover:bg-red-500/10"
                          }`}
                          aria-label="Delete conversation"
                          aria-disabled={deleteButtonsDisabled}
                          aria-busy={isDeletingThis}
                          disabled={deleteButtonsDisabled}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteConversation(thread.id);
                          }}
                        >
                          <FiTrash2 className="text-base" />
                        </button>
                      </div>
                    </div>
                    <p
                      className={`mt-1 text-xs truncate ${
                        isActive ? "text-muted-foreground/90" : "text-muted-foreground"
                      }`}
                    >
                      {truncatedSubtitle}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <section className="flex-1 overflow-y-auto px-10 py-8 space-y-6 bg-gradient-to-b from-background via-muted/30 to-background">
            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {error}
              </div>
            )}
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[320px] items-center justify-center">
                {renderComposer(true)}
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.type === "human" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`relative max-w-3xl rounded-2xl border px-5 py-4 shadow transition-all ${
                        msg.type === "human"
                          ? "bg-primary text-primary-foreground border-primary/70 shadow-lg shadow-primary/30"
                          : "bg-card border-border text-foreground shadow-black/10"
                      }`}
                    >
                      {msg.type === "ai" && (
                        <button
                          type="button"
                          onClick={() => handleExpandMessage(msg)}
                          className="absolute -top-3 -right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/50 bg-background/90 text-primary shadow-lg shadow-primary/30 transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                          aria-label="Expand assistant response"
                        >
                          <FiMaximize2 className="text-base" />
                        </button>
                      )}
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
                        className="chat-markdown"
                        components={{
                          img: ({ node, ...props }) => {
                            const widthValue =
                              typeof props.width === "number"
                                ? (Number.isFinite(props.width)
                                    ? props.width
                                    : undefined)
                                : typeof props.width === "string"
                                ? (() => {
                                    const parsed = parseInt(props.width, 10);
                                    return Number.isNaN(parsed)
                                      ? undefined
                                      : parsed;
                                  })()
                                : undefined;
                            const mergedStyle: React.CSSProperties = {
                              ...(props.style
                                ? (props.style as React.CSSProperties)
                                : {}),
                              height: "auto",
                            };
                            if (widthValue) {
                              mergedStyle.maxWidth = `${widthValue}px`;
                            } else if (!mergedStyle.maxWidth) {
                              mergedStyle.maxWidth = "100%";
                            }
                            return (
                              <img
                                {...props}
                                loading="lazy"
                                style={mergedStyle}
                              />
                            );
                          },
                        }}
                      >
                        {msg.content || "_Empty response_"}
                      </ReactMarkdown>
                      {msg.type === "ai" && msg.agent && (
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                          Handled by {msg.agent}
                        </p>
                      )}
                      {msg.loginUrl && (
                        <a
                          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/60 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          href={msg.loginUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Continue to secure login
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {isAwaitingResponse && (
                  <div className="flex justify-start">
                    <div className="max-w-3xl rounded-2xl border border-border bg-card px-5 py-4 shadow shadow-black/10 transition-all">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status" aria-live="polite">
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
          </section>

          {messages.length > 0 && (
            <footer className="flex-shrink-0 border-t border-border/80 bg-card/90 backdrop-blur px-10 py-6 shadow-inner">
              {renderComposer(false)}
            </footer>
          )}
        </main>

        <AssistantResponseModal
          open={Boolean(expandedMessage)}
          onClose={closeExpandedMessage}
          title={
            expandedMessage?.agent
              ? `${expandedMessage.agent} · Assistant response`
              : "Assistant response"
          }
          subtitle={
            expandedMessage?.agent
              ? "Expanded immersive view"
              : "Immersive answer view"
          }
        >
          {expandedMessage && (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
                className="chat-markdown space-y-4 text-base"
                components={{
                  img: ({ node, ...props }) => {
                    const widthValue =
                      typeof props.width === "number"
                        ? (Number.isFinite(props.width) ? props.width : undefined)
                        : typeof props.width === "string"
                        ? (() => {
                            const parsed = parseInt(props.width, 10);
                            return Number.isNaN(parsed) ? undefined : parsed;
                          })()
                        : undefined;
                    const mergedStyle: React.CSSProperties = {
                      ...(props.style ? (props.style as React.CSSProperties) : {}),
                      height: "auto",
                    };
                    if (widthValue) {
                      mergedStyle.maxWidth = `${widthValue}px`;
                    } else if (!mergedStyle.maxWidth) {
                      mergedStyle.maxWidth = "100%";
                    }
                    return (
                      <img
                        {...props}
                        loading="lazy"
                        style={mergedStyle}
                      />
                    );
                  },
                }}
              >
                {expandedMessage.content || "_Empty response_"}
              </ReactMarkdown>
              {expandedMessage.loginUrl && (
                <a
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/60 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  href={expandedMessage.loginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Continue to secure login
                </a>
              )}
            </>
          )}
        </AssistantResponseModal>
      </div>
    </div>
  );
};

export default ChatPage;
