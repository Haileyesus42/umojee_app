/**
 * Mobile App Container
 *
 * Manages the state and transitions between:
 * - JourneyHomePage (default dashboard view)
 * - MobileChatPage (chat interface)
 * - JourneySettingsPage (settings)
 *
 * Features:
 * - Smooth slide transitions
 * - Persistent chat state
 * - Floating chat button on home page
 * - Back navigation from chat to home
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import JourneyHomePage from "./JourneyHomePage";
import MobileChatPage from "./MobileChatPage";
import JourneySettingsPage from "./JourneySettingsPage";
import { initializeTheme } from "./JourneySettingsPage";
import type { SettingsSection } from "./JourneySettingsPage";
import {
  useJourneyWebSocket,
  type JourneyLocationOverride,
} from "./hooks/useJourneyWebSocket";
import { getLocalStorageValue } from "../../../lib/utils";
import type { TimelineData } from "./types/phase7";

interface MobileAppContainerProps {
  userId?: string;
  userName?: string;
}

type ViewType = "home" | "chat" | "settings";

function isJourneyMonitoringEnabled(journeyId: string | null | undefined): boolean {
  if (!journeyId) return false;
  try {
    return localStorage.getItem(`umoja_monitor_${journeyId}`) === "true";
  } catch {
    return false;
  }
}

const MobileAppContainer: React.FC<MobileAppContainerProps> = ({
  userId,
  userName,
}) => {
  const navigate = useNavigate();
  const { id: journeyIdParam } = useParams<{ id: string }>();

  // Auth guard: redirect to login if user is not authenticated
  useEffect(() => {
    const loggedIn = getLocalStorageValue("isLoggedIn");
    const token = getLocalStorageValue("token");
    const isAuthenticated =
      loggedIn === true ||
      loggedIn === "true" ||
      (typeof token === "string" && !!token && token !== "undefined" && token !== "null");

    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/journey" } }, replace: true });
    }
  }, [navigate]);

  // Apply the saved color theme on mount
  useEffect(() => {
    initializeTheme();
  }, []);

  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);
  const [journeyLocationOverride, setJourneyLocationOverride] =
    useState<JourneyLocationOverride | null>(null);

  // Read active journey ID from URL param (preferred) or localStorage fallback
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(() => {
    if (journeyIdParam) {
      return journeyIdParam;
    }
    try {
      const stored = localStorage.getItem("umoja_active_journey");
      if (stored) {
        const parsed = JSON.parse(stored) as TimelineData;
        const storedJourneyId = parsed?.journeyId || null;
        return isJourneyMonitoringEnabled(storedJourneyId) ? storedJourneyId : null;
      }
    } catch { /* ignore */ }
    return null;
  });

  useEffect(() => {
    if (journeyIdParam) {
      setActiveJourneyId(journeyIdParam);
    }
  }, [journeyIdParam]);

  // Listen for localStorage changes (cross-tab) and custom event (same-tab)
  useEffect(() => {
    const handleJourneyChange = () => {
      try {
        const stored = localStorage.getItem("umoja_active_journey");
        if (stored) {
          const parsed = JSON.parse(stored) as TimelineData;
          const storedJourneyId = parsed?.journeyId || null;
          setActiveJourneyId(
            isJourneyMonitoringEnabled(storedJourneyId) ? storedJourneyId : null
          );
        } else {
          setActiveJourneyId(null);
        }
      } catch { /* ignore */ }
    };

    window.addEventListener("storage", handleJourneyChange);
    window.addEventListener("umoja_journey_updated", handleJourneyChange);
    return () => {
      window.removeEventListener("storage", handleJourneyChange);
      window.removeEventListener("umoja_journey_updated", handleJourneyChange);
    };
  }, []);

  // Connect WebSocket when a journey is active
  const {
    connectionStatus,
    contextUpdates,
    isConnected,
    recommendations,
    locationNotification,
    segmentTransition,
  } = useJourneyWebSocket(activeJourneyId, journeyLocationOverride);


  const handleBackToHome = () => {
    setCurrentView("home");
  };

  // Slide animation variants
  const slideVariants = {
    home: {
      initial: { x: "-100%", opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: "-100%", opacity: 0 },
    },
    forward: {
      initial: { x: "100%", opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: "100%", opacity: 0 },
    },
  };

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {currentView === "home" && (
          <motion.div
            key="home"
            initial={slideVariants.home.initial}
            animate={slideVariants.home.animate}
            exit={slideVariants.home.exit}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <JourneyHomePage
              journeyId={journeyIdParam}
              connectionStatus={connectionStatus}
              contextUpdates={contextUpdates}
              isConnected={isConnected}
              recommendations={recommendations}
              locationNotification={locationNotification}
              segmentTransition={segmentTransition}
              onJourneyIdChange={setActiveJourneyId}
              onJourneyLocationOverrideChange={setJourneyLocationOverride}
            />
          </motion.div>
        )}

        {currentView === "chat" && (
          <motion.div
            key="chat"
            initial={slideVariants.forward.initial}
            animate={slideVariants.forward.animate}
            exit={slideVariants.forward.exit}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0"
          >
            {/* Back to Home Button - Positioned above chat */}
            <div className="absolute top-0 left-0 right-0 z-50 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
              <div className="mx-auto max-w-[480px]">
                <button
                  onClick={handleBackToHome}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Journey
                </button>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="h-full pt-14">
              <MobileChatPage />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileAppContainer;
