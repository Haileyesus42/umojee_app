/**
 * ConversationDrawer
 *
 * Slides in from the right side and displays a list of conversations.
 *
 * - On JourneyHomePage: pass journeyId → shows journey-linked conversations
 * - On JourneyListingPage: omit journeyId → shows general conversations
 *
 * When a conversation is tapped, calls onConversationSelect(convId) so the
 * parent page can open the correct chat drawer at the right z-index.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    MessageSquare,
    Trash2,
    RefreshCw,
    ChevronRight,
    Clock,
    Sparkles,
    Loader2,
} from "lucide-react";
import { useConversations } from "../hooks/useConversations";

interface ConversationDrawerProps {
    open: boolean;
    onClose: () => void;
    /** If provided, shows journey-specific conversations */
    journeyId?: string | null;
    journeyName?: string | null;
    userId?: string | null;
    userData?: Record<string, any> | null;
    /** Called when the user taps a conversation so the parent can open the chat drawer */
    onConversationSelect?: (convId: string) => void;
}

function formatRelativeTime(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60_000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
        return "";
    }
}

function normalizeLastMessage(msg: string | null | undefined): string {
    if (!msg) return "";
    const trimmed = msg.trim();
    if (trimmed.startsWith("{")) {
        try {
            const parsed = JSON.parse(trimmed);
            return parsed.ai_generated || parsed.message || trimmed;
        } catch {
            // Fallback for truncated JSON previews
            const aiGenMatch = trimmed.match(/"ai_generated":\s*"([^"]*)/);
            if (aiGenMatch && aiGenMatch[1]) return aiGenMatch[1];

            const msgMatch = trimmed.match(/"message":\s*"([^"]*)/);
            if (msgMatch && msgMatch[1]) return msgMatch[1];
        }
    }
    return msg;
}

const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
    open,
    onClose,
    journeyId,
    journeyName,
    userId,
    userData,
    onConversationSelect,
}) => {
    const { conversations, isLoading, error, refresh, deleteConversation } =
        useConversations({ journeyId, userId });

    const label = journeyId
        ? journeyName
            ? `${journeyName} Chats`
            : "Journey Chats"
        : "My Conversations";

    const handleOpen = (convId: string) => {
        onClose(); // close conversation list first
        setTimeout(() => {
            onConversationSelect?.(convId); // let parent open the chat drawer
        }, 150); // small delay allows closing animation to start
    };

    const handleDelete = async (e: React.MouseEvent, convId: string) => {
        e.stopPropagation();
        await deleteConversation(convId);
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="conv-drawer-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Drawer — slides from the right */}
                    <motion.div
                        key="conv-drawer-panel"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        className="fixed top-0 right-0 bottom-0 z-50 w-[85vw] max-w-sm bg-background border-l border-border shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/70 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground leading-tight">
                                        {label}
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground">
                                        {conversations.length} conversation
                                        {conversations.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={refresh}
                                    className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                                    title="Refresh"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                                    aria-label="Close"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                                    <Loader2 className="h-7 w-7 animate-spin text-primary/50" />
                                    <p className="text-sm">Loading conversations…</p>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                                    <p className="text-sm text-destructive/80">{error}</p>
                                    <button
                                        onClick={refresh}
                                        className="text-xs text-primary underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : conversations.length === 0 ? (
                                /* Empty state */
                                <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
                                    <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center">
                                        <Sparkles className="h-7 w-7 text-primary/30" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-foreground">
                                            No conversations yet
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Start a chat from the bottom bar and your conversations will
                                            appear here.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {conversations.map((conv) => (
                                        <li key={conv.id}>
                                            <button
                                                onClick={() => handleOpen(conv.id)}
                                                className="w-full text-left px-5 py-4 hover:bg-muted/40 active:bg-muted/60 transition-colors flex items-start gap-3 group"
                                            >
                                                {/* Icon */}
                                                <div className="h-9 w-9 rounded-full bg-primary/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                                                    <MessageSquare className="h-4 w-4 text-primary/60" />
                                                </div>

                                                {/* Text */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline justify-between gap-2">
                                                        <span className="text-sm font-medium text-foreground truncate">
                                                            {conv.title || "Untitled Chat"}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                                                            <Clock className="h-3 w-3" />
                                                            {formatRelativeTime(conv.updated_at)}
                                                        </span>
                                                    </div>
                                                    {conv.last_message && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                                                            {normalizeLastMessage(conv.last_message)}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Actions — revealed on hover */}
                                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleDelete(e, conv.id)}
                                                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                        title="Delete conversation"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Footer hint */}
                        <div className="px-5 py-3 border-t border-border shrink-0 bg-card/40">
                            <p className="text-[11px] text-muted-foreground text-center">
                                Tap a conversation to continue it
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConversationDrawer;
