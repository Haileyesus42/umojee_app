import React, { useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiClock,
  FiAlertTriangle,
  FiCircle,
  FiChevronRight,
  FiMoreHorizontal,
  FiMapPin,
} from "react-icons/fi";
import type { Milestone } from "../types/phase7";
import type { JourneyLocationMode } from "../hooks/useJourneyWebSocket";

interface MilestoneTrackerProps {
  milestones: Milestone[];
  onMilestoneClick?: (milestone: Milestone) => void;
  onDetailsClick?: () => void;
  className?: string;
  locationMode?: JourneyLocationMode;
  onLocationModeChange?: (mode: JourneyLocationMode) => void;
  readOnly?: boolean;
}

const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  milestones,
  onMilestoneClick,
  onDetailsClick,
  className = "",
  locationMode = "current_location",
  onLocationModeChange,
  readOnly = false,
}) => {
  const [openMenuMilestoneId, setOpenMenuMilestoneId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenuMilestoneId) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuMilestoneId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openMenuMilestoneId]);

  useEffect(() => {
    if (readOnly && openMenuMilestoneId) {
      setOpenMenuMilestoneId(null);
    }
  }, [openMenuMilestoneId, readOnly]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return null;
    }
  };

  const getStatusIcon = (completed: boolean, critical?: boolean) => {
    if (completed) {
      return <FiCheck className="h-4 w-4 text-emerald-500" />;
    }
    if (critical) {
      return <FiAlertTriangle className="h-4 w-4 text-amber-500" />;
    }
    return <FiCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusColor = (completed: boolean, critical?: boolean) => {
    if (completed) return 'border-emerald-200 bg-emerald-50';
    if (critical) return 'border-amber-200 bg-amber-50';
    return 'border-border bg-card';
  };

  const completedCount = milestones.filter(m => m.completed).length;
  const criticalCount = milestones.filter(m => m.critical && !m.completed).length;
  const locationModeLabels: Record<JourneyLocationMode, string> = {
    current_location: "Current location",
    approaching: "Approaching",
    nearby: "Nearby",
    arrived: "Arrived",
  };
  const demoOptions: JourneyLocationMode[] = [
    "current_location",
    "approaching",
    "nearby",
    "arrived",
  ];

  return (
    <div className={`my-3 ${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FiClock className="h-4 w-4" />
          <span>Milestones</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {completedCount}/{milestones.length}
          </span>
          {criticalCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {criticalCount} urgent
            </span>
          )}
        </div>
        {onDetailsClick && !readOnly && (
          <button
            type="button"
            onClick={onDetailsClick}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Details
            <FiChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Milestones List */}
      <div className="space-y-2">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className={`flex items-start gap-3 rounded-lg border p-3 transition-all hover:shadow-sm cursor-pointer ${
              getStatusColor(milestone.completed, milestone.critical)
            }`}
            onClick={() => onMilestoneClick?.(milestone)}
          >
            {/* Status Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {getStatusIcon(milestone.completed, milestone.critical)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className={`text-sm font-medium ${
                    milestone.completed ? 'text-emerald-700 line-through' :
                    milestone.critical ? 'text-amber-700' :
                    'text-foreground'
                  }`}>
                    {milestone.title}
                  </h4>
                  {milestone.id === "home_to_airport" && onLocationModeChange && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                      <FiMapPin className="h-3 w-3" />
                      {locationModeLabels[locationMode]}
                    </div>
                  )}
                </div>
                <div className="relative flex items-start gap-2" ref={openMenuMilestoneId === milestone.id ? menuRef : null}>
                  {milestone.dueDate && (
                    <span className={`text-xs ${
                      milestone.completed ? 'text-emerald-600' :
                      new Date(milestone.dueDate) < new Date() ? 'text-destructive' :
                      'text-muted-foreground'
                    }`}>
                      {formatDate(milestone.dueDate)}
                    </span>
                  )}
                  {milestone.id === "home_to_airport" && onLocationModeChange && !readOnly && (
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Demo location options"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuMilestoneId((current) =>
                            current === milestone.id ? null : milestone.id
                          );
                        }}
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <FiMoreHorizontal className="h-4 w-4" />
                      </button>
                      {openMenuMilestoneId === milestone.id && (
                        <div
                          className="absolute right-0 top-8 z-20 w-44 rounded-2xl border border-border bg-background p-1.5 shadow-xl"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {demoOptions.map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => {
                                onLocationModeChange(mode);
                                setOpenMenuMilestoneId(null);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                                locationMode === mode
                                  ? "bg-sky-50 text-sky-700"
                                  : "text-foreground hover:bg-muted"
                              }`}
                            >
                              <span>{locationModeLabels[mode]}</span>
                              {locationMode === mode && (
                                <FiCheck className="h-3.5 w-3.5" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {milestone.description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {milestone.description}
                </p>
              )}

              {/* Status indicators */}
              <div className="mt-2 flex items-center gap-2">
                {milestone.critical && !milestone.completed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <FiAlertTriangle className="h-3 w-3" />
                    Critical
                  </span>
                )}
                {milestone.completed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <FiCheck className="h-3 w-3" />
                    Completed
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Summary */}
      {milestones.length > 0 && (
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>{completedCount} completed</span>
          <span>{milestones.length - completedCount} remaining</span>
          {criticalCount > 0 && (
            <span className="text-amber-600 font-medium">{criticalCount} critical</span>
          )}
        </div>
      )}
    </div>
  );
};

export default MilestoneTracker;
