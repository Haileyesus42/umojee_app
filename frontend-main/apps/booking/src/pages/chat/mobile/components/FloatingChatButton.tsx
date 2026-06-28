/**
 * Floating Chat Button (FAB)
 *
 * A modern floating action button that opens the chat interface.
 * Features:
 * - Smooth animations and hover effects
 * - Pulse animation to draw attention
 * - Badge for unread messages
 * - Mobile-optimized positioning
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

interface FloatingChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
  isOpen?: boolean;
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  onClick,
  unreadCount = 0,
  isOpen = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* Main Button */}
      <motion.button
        onClick={onClick}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileTap={{ scale: 0.9 }}
        className="relative h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg hover:shadow-xl transition-shadow group"
      >
        {/* Pulse Animation */}
        {!isOpen && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary opacity-75"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.7, 0, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Icon */}
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <MessageCircle className="h-6 w-6 text-white" />
            )}
          </motion.div>
        </div>

        {/* Unread Badge */}
        {unreadCount > 0 && !isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-torch-red-500 border-2 border-background flex items-center justify-center"
          >
            <span className="text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </motion.div>
        )}

        {/* Hover Glow */}
        {isHovered && (
          <motion.div
            layoutId="glow"
            className="absolute inset-0 rounded-full bg-primary/30 blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && !isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute right-16 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap shadow-lg"
          >
            Chat with AI Assistant
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45 h-2 w-2 bg-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FloatingChatButton;
