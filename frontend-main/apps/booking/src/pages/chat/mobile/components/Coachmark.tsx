import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiX, FiStar } from "react-icons/fi";

interface CoachmarkProps {
  /** Unique ID to persist dismissed state in localStorage */
  id: string;
  /** Title of the coachmark */
  title: string;
  /** Description text */
  description: string;
  /** Position of the tooltip relative to children */
  position?: "top" | "bottom";
  /** Button text (default: "Got it") */
  buttonText?: string;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Children to wrap (the element to highlight) */
  children: React.ReactNode;
  /** Additional class for the wrapper */
  className?: string;
}

const STORAGE_KEY_PREFIX = "coachmark_dismissed_";
const TOOLTIP_WIDTH = 288;
const VIEWPORT_PADDING = 16;

const Coachmark: React.FC<CoachmarkProps> = ({
  id,
  title,
  description,
  position = "top",
  buttonText = "Got it",
  onDismiss,
  children,
  className = "",
}) => {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({
    left: 0,
    top: 0,
    arrowLeft: TOOLTIP_WIDTH / 2,
  });
  const targetRef = React.useRef<HTMLDivElement | null>(null);

  // Check localStorage on mount
  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${id}`;
    const wasDismissed = localStorage.getItem(storageKey) === "true";
    setIsDismissed(wasDismissed);

    // Delay showing for smooth entrance animation
    if (!wasDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [id]);

  const handleDismiss = () => {
    setIsVisible(false);

    // Delay setting dismissed to allow exit animation
    setTimeout(() => {
      const storageKey = `${STORAGE_KEY_PREFIX}${id}`;
      localStorage.setItem(storageKey, "true");
      setIsDismissed(true);
      onDismiss?.();
    }, 200);
  };

  useEffect(() => {
    if (isDismissed || typeof window === "undefined") return;

    const updatePosition = () => {
      const target = targetRef.current;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const targetCenter = rect.left + rect.width / 2;
      const minLeft = VIEWPORT_PADDING + TOOLTIP_WIDTH / 2;
      const maxLeft = window.innerWidth - VIEWPORT_PADDING - TOOLTIP_WIDTH / 2;
      const left = Math.min(Math.max(targetCenter, minLeft), maxLeft);
      const top = position === "top" ? rect.top - 12 : rect.bottom + 12;
      const tooltipLeftEdge = left - TOOLTIP_WIDTH / 2;
      const arrowLeft = Math.min(
        Math.max(targetCenter - tooltipLeftEdge, 16),
        TOOLTIP_WIDTH - 16
      );

      setTooltipPosition({ left, top, arrowLeft });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isDismissed, position]);

  // If dismissed, just render children
  if (isDismissed) {
    if (className) {
      return <div className={`relative ${className}`}>{children}</div>;
    }

    return <>{children}</>;
  }

  const tooltip = (
    <>
      {/* Tooltip */}
      <div
        className={`fixed z-[10000] w-72 -translate-x-1/2 transform transition-all duration-300 ${
          position === "top" ? "-translate-y-full" : ""
        } ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
      >
        {/* Tooltip card */}
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/95 to-primary shadow-xl shadow-primary/25">
          {/* Decorative corner */}
          <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/10" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white/80 transition-colors hover:bg-white/30 hover:text-white"
            aria-label="Dismiss"
          >
            <FiX className="h-3.5 w-3.5" />
          </button>

          {/* Content */}
          <div className="p-4">
            {/* Header with icon */}
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <FiStar className="h-3.5 w-3.5 text-white" />
              </div>
              <h4 className="text-sm font-bold text-white">{title}</h4>
            </div>

            {/* Description */}
            <p className="mb-3 text-xs leading-relaxed text-white/90">
              {description}
            </p>

            {/* Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-white/90 hover:shadow-md active:scale-[0.98]"
            >
              {buttonText}
            </button>
          </div>
        </div>

        {/* Arrow pointing to element */}
        <div
          className={`absolute -translate-x-1/2 ${
            position === "top" ? "bottom-0 translate-y-full" : "top-0 -translate-y-full"
          }`}
          style={{ left: tooltipPosition.arrowLeft }}
        >
          <div
            className={`h-0 w-0 border-l-8 border-r-8 border-l-transparent border-r-transparent ${
              position === "top"
                ? "border-t-8 border-t-primary"
                : "border-b-8 border-b-primary"
            }`}
          />
        </div>
      </div>

      {/* Backdrop overlay (subtle) */}
      {isVisible && (
        <div
          className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[1px] transition-opacity"
          onClick={handleDismiss}
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Highlight ring around children */}
      <div
        ref={targetRef}
        className={`relative transition-all duration-300 ${
          isVisible ? "z-[9999] ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl" : ""
        }`}
      >
        {children}
      </div>

      {typeof document !== "undefined" && createPortal(tooltip, document.body)}
    </div>
  );
};

export default Coachmark;
