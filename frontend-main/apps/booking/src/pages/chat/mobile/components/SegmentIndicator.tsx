import React from "react";
import { FiCheck, FiPlay, FiAlertTriangle, FiCircle } from "react-icons/fi";
import type { TimelineSegment } from "../types/phase7";

interface SegmentIndicatorProps {
  segments: TimelineSegment[];
  currentSegmentId?: string;
  onSegmentClick?: (segment: TimelineSegment) => void;
  compact?: boolean;
  className?: string;
}

const SegmentIndicator: React.FC<SegmentIndicatorProps> = ({
  segments,
  currentSegmentId,
  onSegmentClick,
  compact = false,
  className = "",
}) => {
  const getStatusIcon = (status: TimelineSegment['status'], isCurrent: boolean) => {
    const iconClass = compact ? "h-3 w-3" : "h-4 w-4";

    switch (status) {
      case 'completed':
        return <FiCheck className={`${iconClass} text-primary`} />;
      case 'in_progress':
        return <FiPlay className={`${iconClass} text-primary ${isCurrent ? 'animate-pulse' : ''}`} />;
      case 'pending':
        return <FiCircle className={`${iconClass} text-muted-foreground`} />;
      case 'blocked':
        return <FiAlertTriangle className={`${iconClass} text-destructive`} />;
      default:
        return <FiCircle className={`${iconClass} text-muted-foreground`} />;
    }
  };

  const getStatusColor = (status: TimelineSegment['status'], isCurrent: boolean) => {
    if (isCurrent) return 'ring-2 ring-primary/50';

    switch (status) {
      case 'completed':
        return 'bg-primary';
      case 'in_progress':
        return 'bg-primary';
      case 'pending':
        return 'bg-muted';
      case 'blocked':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {segments.map((segment, index) => {
          const isCurrent = segment.id === currentSegmentId;
          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => onSegmentClick?.(segment)}
              className={`flex h-6 w-6 items-center justify-center rounded-full border border-border transition-all hover:scale-110 ${
                getStatusColor(segment.status, isCurrent)
              }`}
              title={`${segment.title} - ${segment.status.replace('_', ' ')}`}
            >
              {getStatusIcon(segment.status, isCurrent)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`w-full overflow-x-auto no-scrollbar px-4 py-2 ${className}`}>
      {/* Progress line container */}
      <div className="relative mb-4 min-w-max">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{
              width: `${(segments.filter(s => s.status === 'completed').length / segments.length) * 100}%`
            }}
          />
        </div>

        {/* Segment dots - horizontal scrolling layout */}
        <div className="relative flex items-center justify-between min-w-max px-4">
          {segments.map((segment, index) => {
            const isCurrent = segment.id === currentSegmentId;

            return (
              <div
                key={segment.id}
                className="relative flex flex-col items-center flex-shrink-0 mx-2"
              >
                <button
                  type="button"
                  onClick={() => onSegmentClick?.(segment)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-background transition-all hover:scale-110 ${
                    getStatusColor(segment.status, isCurrent)
                  } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                  title={`${segment.title} - ${segment.status.replace('_', ' ')}`}
                >
                  {getStatusIcon(segment.status, isCurrent)}
                </button>

                {/* Segment label */}
                <div className="mt-2 text-center max-w-24">
                  <div className="text-xs font-medium text-foreground truncate">
                    {segment.title}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {segment.status.replace('_', ' ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SegmentIndicator;