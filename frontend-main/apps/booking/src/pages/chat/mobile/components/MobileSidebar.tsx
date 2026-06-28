import React from "react";
import { FiPlus, FiToggleLeft, FiToggleRight, FiTrash2 } from "react-icons/fi";
import { Thread } from "../hooks/useMobileChat";

type MobileSidebarProps = {
  isOpen: boolean;
  threads: Thread[];
  threadsLoading: boolean;
  conversationId: string | null;
  deletingConversationId: string | null;
  deleteButtonsDisabled: boolean;
  assistantFirst: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onToggleAssistantFirst: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  onOpenFlightModal: () => void;
  onOpenHotelModal: () => void;
  onOpenCarModal?: () => void;
};

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  threads,
  threadsLoading,
  conversationId,
  deletingConversationId,
  deleteButtonsDisabled,
  assistantFirst,
  onClose,
  onNewChat,
  onToggleAssistantFirst,
  onSelectThread,
  onDeleteThread,
  onOpenFlightModal,
  onOpenHotelModal,
  onOpenCarModal,
}) => {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-full flex-col border-r border-border bg-card/95 shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <button
            type="button"
            onClick={onNewChat}
            className="inline-flex items-center gap-0.5 justify-center rounded-lg border border-primary/70 bg-transparent px-2 py-1.5 text-[11px] font-semibold text-primary shadow-md shadow-primary/20 transition-colors hover:bg-primary/10 disabled:opacity-50"
          >
            <FiPlus className="text-xs" />
            New Chat
          </button>
          <button
            type="button"
            onClick={onToggleAssistantFirst}
            className={`flex h-111 w-11 items-center justify-center rounded-md transition-colors ${
              assistantFirst
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={assistantFirst}
            aria-label="Let AI start the conversation"
            title="Let AI start the conversation"
          >
            {assistantFirst ? <FiToggleRight className="text-[28px]" /> : <FiToggleLeft className="text-[28px]" />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {threadsLoading && threads.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading conversations...
            </div>
          ) : threads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              No conversations yet. Start a new chat to begin.
            </div>
          ) : (
            threads.map((thread) => {
              const isActive = conversationId === thread.id;
              const isDeleting = deletingConversationId === thread.id;
              const subtitle =
                thread.last_message ||
                "No messages yet. Say hello to kick things off.";
              const normalizedSubtitle = subtitle.replace(/\s+/g, " ").trim();
              const truncatedSubtitle =
                normalizedSubtitle.length > 110
                  ? `${normalizedSubtitle.slice(0, 107)}...`
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
                  onClick={() => onSelectThread(thread.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectThread(thread.id);
                    }
                  }}
                  className={`relative w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 ${
                    isActive
                      ? "border-primary/60 bg-primary/10 text-foreground shadow-lg shadow-primary/20"
                      : "border-border bg-card/70 hover:bg-muted/60"
                  }`}
                >
                  {isDeleting && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-background/80 text-[11px] font-semibold text-red-500 backdrop-blur-sm">
                      <span className="h-4 w-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                      Deleting...
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-[13px] font-semibold ${
                        isActive ? "text-primary" : "text-foreground"
                      }`}
                      title={displayTitle}
                    >
                      {displayTitle}
                    </p>
                    <button
                      type="button"
                      className={`rounded-md p-1 transition-colors ${
                        deleteButtonsDisabled
                          ? "cursor-not-allowed text-muted-foreground/40"
                          : "text-muted-foreground/80 hover:text-red-500 hover:bg-red-500/10"
                      }`}
                      aria-label="Delete conversation"
                      aria-disabled={deleteButtonsDisabled}
                      aria-busy={isDeleting}
                      disabled={deleteButtonsDisabled}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteThread(thread.id);
                      }}
                    >
                      <FiTrash2 className="text-base" />
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">
                    {truncatedSubtitle}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    {thread.updated_at ? new Date(thread.updated_at).toLocaleString() : ""}
                  </p>
                </div>
              );
            })
          )}
        </div>
        <div className="border-t border-border/70 px-2 py-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onOpenFlightModal}
              className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Open flight modal"
              title="Flights"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="mx-auto h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m3 10 8 2 10-6" />
                <path d="M6 19h2l2-4 6-3 3 1.5" />
                <path d="m3 13 3.5 1 3-3 1.5 2" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onOpenHotelModal}
              className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Open hotel modal"
              title="Hotels"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="mx-auto h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 11 12 5l8 6" />
                <path d="M6 11v7h4v-4h4v4h4v-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onOpenCarModal}
              className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label="Open car modal"
              title="Cars"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="mx-auto h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M3 14h14l2-4h2" />
                <path d="M5 14 7 9h7l2 5" />
                <circle cx="7" cy="17" r="1.3" />
                <circle cx="17" cy="17" r="1.3" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default MobileSidebar;
