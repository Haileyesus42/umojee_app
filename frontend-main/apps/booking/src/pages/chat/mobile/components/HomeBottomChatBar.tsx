import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Mic, Menu, Headset } from "lucide-react";

interface HomeBottomChatBarProps {
    onMapClick: () => void;
    onConversationsClick: () => void;
    onNewJourneyClick: () => void;
    onSupportClick: () => void;
    onSendMessage: (msg: string) => void;
    onMicClick?: () => void;
    onChatToggle?: () => void;
    /** Disable input and buttons during loading */
    disabled?: boolean;
}

const HomeBottomChatBar: React.FC<HomeBottomChatBarProps> = ({
    onMapClick,
    onConversationsClick,
    onNewJourneyClick,
    onSupportClick,
    onSendMessage,
    onMicClick,
    onChatToggle,
    disabled = false,
}) => {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (e.key === "Enter" && inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue("");
        }
    };

    return (
        <div className={`px-5 pb-1 pt-1 shrink-0 relative ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-3">
                <div className="relative group shrink-0">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onSupportClick}
                        disabled={disabled}
                        className="h-10 w-10 flex items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
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
                        placeholder={disabled ? "Loading journey..." : "What do you want?"}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                    />
                    <button
                        type="button"
                        onClick={onMicClick}
                        disabled={disabled || !onMicClick}
                        className="shrink-0 rounded-full p-1 text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Open voice input"
                    >
                        <Mic className="h-5 w-5" />
                    </button>
                </motion.div>

                <div className="flex items-center gap-2">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onConversationsClick()}
                        disabled={disabled}
                        className="h-10 w-10 flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:border-primary/50 shadow-md transition-all shrink-0 disabled:opacity-50"
                        title="Open Conversations"
                    >
                        <Menu className="h-5 w-5 text-primary" />
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default HomeBottomChatBar;
