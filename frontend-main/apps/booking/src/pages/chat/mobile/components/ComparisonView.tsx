import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMaximize2, FiMapPin, FiDollarSign, FiInfo, FiEye } from "react-icons/fi";
import ConfidenceBadge from "./ConfidenceBadge";
import { getComparisonFallbackImage } from "../types/phase7";
import type { ComparisonItem, ComparisonType } from "../types/phase7";
import { getComparisonPreviewEntries } from "../utils/comparisonMetadata";

// --- Animation variants ---
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

interface ComparisonViewProps {
  items: ComparisonItem[];
  comparisonType: ComparisonType;
  onExpandToModal?: () => void;
  onItemClick?: (item: ComparisonItem) => void;
  className?: string;
  /** When set, shows an "Active Journey" badge on all cards */
  activeJourneyId?: string | null;
  readOnly?: boolean;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({
  items,
  comparisonType,
  onExpandToModal,
  onItemClick,
  className = "",
  activeJourneyId,
  readOnly = false,
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  // Get icon based on comparison type
  const getTypeIcon = (type: ComparisonType) => {
    switch (type) {
      case "destination":
        return <FiMapPin className="h-4 w-4" />;
      case "transport":
        return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
      case "activity":
        return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case "accommodation":
        return <FiMapPin className="h-4 w-4" />;
      case "car":
        return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l2-5a2 2 0 011.87-1.25h10.26A2 2 0 0119 8l2 5M5 13h14M7 17h.01M17 17h.01M6 13v4m12-4v4" /></svg>;
    }
  };

  const getTypeLabel = (type: ComparisonType) => {
    switch (type) {
      case "car":
        return "Car";
      case "accommodation":
        return "Hotel";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Unique key to force re-animation when items change
  const animationKey = items.map((i) => i.id).join(",");

  return (
    <div className={`my-0 ${className}`}>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {getTypeIcon(comparisonType)}
          <span>{getTypeLabel(comparisonType)} Comparison</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {items.length}
          </span>
        </div>
        {onExpandToModal && !readOnly && (
          <button
            type="button"
            onClick={onExpandToModal}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Expand to full comparison view"
          >
            <FiMaximize2 className="h-3 w-3" />
            <span>Expand</span>
          </button>
        )}
      </div>

      {/* Scrollable comparison cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={animationKey}
          className="no-scrollbar flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
          style={{ scrollSnapType: "x mandatory" }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {items.map((item, idx) => {
            const previewEntries = getComparisonPreviewEntries(item);
            return (
            <motion.div
              key={`${item.id}-${idx}`}
              variants={cardVariants}
              whileHover={readOnly ? undefined : {
                y: -5,
                scale: 1.03,
                boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }}
              whileTap={readOnly ? undefined : { scale: 0.97 }}
              className={`relative min-w-[280px] max-w-[280px] flex-shrink-0 snap-center rounded-xl border border-border bg-card p-4 shadow-sm ${onItemClick && !readOnly ? "cursor-pointer group" : ""}`}
              role="article"
              aria-label={`${item.name} comparison card`}
              onClick={readOnly ? undefined : () => onItemClick?.(item)}
            >
              {/* Image */}
              <div className="relative mb-3 h-32 w-full overflow-hidden rounded-lg bg-muted">
                <motion.img
                  src={item.imageUrl || getComparisonFallbackImage(item, idx)}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  whileHover={{ scale: 1.08, transition: { duration: 0.4 } }}
                />
                {/* Active journey badge — only when this item belongs to the active journey */}
                {activeJourneyId && item.journeyId === activeJourneyId && (
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Active Trip
                  </div>
                )}
                {item.isBooked && (
                  <div className="absolute left-2 bottom-2 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    Booked
                  </div>
                )}
                {/* Confidence badge overlay */}
                {item.matchConfidence !== undefined && (
                  <div className="absolute right-2 top-2">
                    <ConfidenceBadge score={item.matchConfidence} variant="pill" />
                  </div>
                )}
                {/* Click for details hover hint */}
                {onItemClick && !readOnly && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none rounded-lg">
                    <div className="flex items-center gap-1 rounded-full bg-black/20 backdrop-blur-sm px-3 py-2 text-xs text-white">
                      <FiInfo className="h-3 w-3" />
                      <span>Click for details</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <h4 className="mb-1 text-base font-semibold text-foreground line-clamp-1">
                {item.name}
              </h4>

              {/* Price */}
              {item.price !== undefined && (
                <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                  <FiDollarSign className="h-3.5 w-3.5" />
                  <span>
                    {item.price.toLocaleString()} {item.currency || "USD"}
                  </span>
                </div>
              )}

              {/* Pros (preview - show first 2) */}
              {item.pros && item.pros.length > 0 && (
                <div className="space-y-1">
                  {item.pros.slice(0, 2).map((pro, index) => (
                    <div key={index} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <span className="line-clamp-1">{pro}</span>
                    </div>
                  ))}
                  {item.pros.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{item.pros.length - 2} more
                    </div>
                  )}
                </div>
              )}

              {/* Metadata preview */}
              {previewEntries.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {previewEntries.map((entry) => (
                      <span
                        key={entry.key}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        title={`${entry.label}: ${entry.value}`}
                      >
                        {entry.value}
                      </span>
                    ))}
                </div>
              )}

              {/* Seen badge */}
              {item.seen && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                  <FiEye className="h-3 w-3" />
                  Seen
                </div>
              )}
            </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ComparisonView;
