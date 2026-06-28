import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mic, Map, MessageSquare, Plus, Menu, Headset } from "lucide-react";

interface BottomChatBarProps {
    onMapClick: () => void;
    onConversationsClick: () => void;
    onNewJourneyClick: () => void;
    onSupportClick: () => void;
    onSendMessage: (msg: string) => void;
    onMicClick?: () => void;
}

const BottomChatBar: React.FC<BottomChatBarProps> = ({
    onMapClick,
    onConversationsClick,
    onNewJourneyClick,
    onSupportClick,
    onSendMessage,
    onMicClick,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue("");
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    return (
        <div className="px-5 pb-1 shrink-0 relative">
            <div className="flex items-center gap-3">
                <div className="relative group shrink-0">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onSupportClick}
                        className="h-10 w-10 flex items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-all hover:border-primary/50 hover:bg-primary/5"
                        aria-label="Open support in new tab"
                        title="Support"
                    >
                        <Headset className="h-5 w-5 text-primary" />
                    </motion.button>
                    <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-[11px] font-medium text-background opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                        Support
                    </span>
                </div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex-1 flex items-center gap-3 rounded-full border border-border/80 bg-card px-5 py-2 shadow-lg"
                >
                    <Sparkles className="h-5 w-5 text-primary shrink-0" />
                    <input
                        type="text"
                        className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                        placeholder="What do you want?"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        type="button"
                        onClick={onMicClick}
                        className="shrink-0 rounded-full p-1 text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Open voice input"
                        disabled={!onMicClick}
                    >
                        <Mic className="h-5 w-5" />
                    </button>
                </motion.div>

                <div className="relative flex items-center gap-2" ref={menuRef}>
                    <AnimatePresence>
                        {menuOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: -10 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute bottom-full right-0 mb-2 w-48 rounded-2xl border border-border bg-card shadow-xl overflow-hidden z-50 p-1"
                            >
                                <button
                                    onClick={() => {
                                        onMapClick();
                                        setMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                                >
                                    <Map className="h-4 w-4 text-primary" />
                                    Nearby Places
                                </button>
                                <button
                                    onClick={() => {
                                        onConversationsClick();
                                        setMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                                >
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                    Conversations
                                </button>
                                <button
                                    onClick={() => {
                                        onNewJourneyClick();
                                        setMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                                >
                                    <Plus className="h-4 w-4 text-primary" />
                                    New Journey
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`h-10 w-10 flex items-center justify-center rounded-full border transition-all shadow-md shrink-0 ${menuOpen
                            ? "bg-primary border-primary text-primary-foreground rotate-90"
                            : "bg-card border-border text-foreground hover:border-primary/50"
                            }`}
                    >
                        <Menu className={`h-5 w-5 text-primary ${menuOpen ? "text-white" : "text-primary"}`} />
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default BottomChatBar;
