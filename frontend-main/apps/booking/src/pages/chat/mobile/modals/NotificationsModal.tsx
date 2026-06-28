import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiBell, FiTrash2 } from "react-icons/fi";
import NotificationBanner from "../components/NotificationBanner";
import type { BannerConfig } from "../types/phase7";

interface NotificationsModalProps {
  open: boolean;
  notifications: BannerConfig[];
  onClose: () => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onBannerClick?: (banner: BannerConfig) => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  open,
  notifications,
  onClose,
  onDismiss,
  onClearAll,
  onBannerClick,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal panel - slides down from top-right */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-2 right-2 left-2 z-50 mx-auto max-w-[460px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <FiBell className="h-5 w-5 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Notifications
                </h3>
                {notifications.length > 0 && (
                  <span className="rounded-full bg-torch-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {notifications.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                  >
                    <FiTrash2 className="h-3 w-3" />
                    Clear all
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notification list — uses the existing NotificationBanner component */}
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <FiBell className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No notifications</p>
                  <p className="text-xs opacity-60">You're all caught up</p>
                </div>
              ) : (
                notifications.map((banner) => (
                  <div key={banner.id} onClick={() => onBannerClick?.(banner)} className="cursor-pointer">
                    <NotificationBanner
                      key={banner.id}
                      banner={banner}
                      onDismiss={onDismiss}
                    />
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationsModal;
