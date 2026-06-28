import React, { useRef, useEffect } from "react";
import { FiMapPin, FiClock, FiStar, FiHome, FiCheck, FiAlertTriangle, FiPlay, FiX } from "react-icons/fi";
import ConfidenceBadge from "./ConfidenceBadge";
import type { TimelineData, TimelineSegment } from "../types/phase7";

interface JourneyTimelineProps {
  data: TimelineData;
  onSegmentClick?: (segment: TimelineSegment) => void;
  onExpandToDrawer?: () => void;
  className?: string;
}

const JourneyTimeline: React.FC<JourneyTimelineProps> = ({
  data,
  onSegmentClick,
  onExpandToDrawer,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Keep the current/in-progress segment centered horizontally without nudging page scroll.
  useEffect(() => {
    const currentSegment = data.segments.find(
      (s) => s.id === data.currentSegment || s.status === 'in_progress'
    );
    if (currentSegment) {
      const container = containerRef.current;
      const element = segmentRefs.current.get(currentSegment.id);
      if (container && element) {
        const targetLeft =
          element.offsetLeft - (container.clientWidth - element.clientWidth) / 2;
        const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
        const nextScrollLeft = Math.min(Math.max(targetLeft, 0), maxScrollLeft);
        container.scrollTo({
          left: nextScrollLeft,
          behavior: 'smooth',
        });
      }
    }
  }, [data.currentSegment, data.segments]);
  const getSegmentIcon = (type: TimelineSegment['type']) => {
    switch (type) {
      case 'destination':
        return <FiMapPin className="h-4 w-4" />;
      case 'transport':
        return <FiClock className="h-4 w-4" />;
      case 'activity':
        return <FiStar className="h-4 w-4" />;
      case 'accommodation':
        return <FiHome className="h-4 w-4" />;
      default:
        return <FiMapPin className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: TimelineSegment['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-primary border-primary';
      case 'in_progress':
        return 'bg-primary border-primary animate-pulse';
      case 'pending':
        return 'bg-muted border-border';
      case 'blocked':
        return 'bg-destructive border-destructive';
      default:
        return 'bg-muted border-border';
    }
  };

  const getStatusIcon = (status: TimelineSegment['status']) => {
    switch (status) {
      case 'completed':
        return <FiCheck className="h-3 w-3 text-white" />;
      case 'in_progress':
        return <FiPlay className="h-3 w-3 text-white" />;
      case 'pending':
        return <div className="h-3 w-3 rounded-full bg-white/50" />;
      case 'blocked':
        return <FiAlertTriangle className="h-3 w-3 text-white" />;
      default:
        return <div className="h-3 w-3 rounded-full bg-white/50" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  return (
    <div className={`my-3 ${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FiClock className="h-4 w-4" />
          <span>Journey Timeline</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {data.segments.length} segments
          </span>
        </div>
        {onExpandToDrawer && (
          <button
            type="button"
            onClick={onExpandToDrawer}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Expand to full timeline view"
          >
            <FiClock className="h-3 w-3" />
            <span>Full View</span>
          </button>
        )}
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-border">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{
              width: `${(data.segments.filter(s => s.status === 'completed').length / data.segments.length) * 100}%`
            }}
          />
        </div>

        {/* Segments */}
        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar"
        >
          {data.segments.map((segment, index) => {
            const isCurrent = segment.id === data.currentSegment;
            const isCompleted = segment.status === 'completed';
            const isInProgress = segment.status === 'in_progress';

            return (
              <div
                key={segment.id}
                ref={(el) => {
                  if (el) segmentRefs.current.set(segment.id, el);
                  else segmentRefs.current.delete(segment.id);
                }}
                className="relative min-w-[280px] flex-shrink-0 snap-center"
              >
                {/* Timeline Node */}
                <div className="relative mb-3 flex justify-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      getStatusColor(segment.status)
                    } ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}`}
                  >
                    {getStatusIcon(segment.status)}
                  </div>
                </div>

                {/* Segment Card */}
                <div
                  className={`rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer min-h-[140px] flex flex-col ${
                    isCurrent ? 'border-primary shadow-primary/10' : 'border-border'
                  } ${isInProgress ? 'ring-2 ring-primary/20' : ''}`}
                  onClick={() => onSegmentClick?.(segment)}
                >
                  {/* Header */}
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSegmentIcon(segment.type)}
                      <h4 className="font-semibold text-foreground text-sm">{segment.title}</h4>
                    </div>
                    {segment.confidence && (
                      <ConfidenceBadge score={segment.confidence} variant="minimal" />
                    )}
                  </div>

                  {/* Subtitle */}
                  {segment.subtitle && (
                    <p className="mb-2 text-xs text-muted-foreground">{segment.subtitle}</p>
                  )}

                  {/* Dates */}
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    {segment.startTime && (
                      <span>Start: {formatDate(segment.startTime)}</span>
                    )}
                    {segment.endTime && segment.endTime !== segment.startTime && (
                      <>
                        <span>•</span>
                        <span>End: {formatDate(segment.endTime)}</span>
                      </>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      segment.status === 'completed' ? 'bg-primary/10 text-primary' :
                      segment.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                      segment.status === 'blocked' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {segment.status === 'completed' && <FiCheck className="h-3 w-3" />}
                      {segment.status === 'in_progress' && <FiPlay className="h-3 w-3" />}
                      {segment.status === 'blocked' && <FiX className="h-3 w-3" />}
                      {segment.status.replace('_', ' ').toUpperCase()}
                    </span>

                    {/* Segment number */}
                    <span className="text-xs text-muted-foreground">
                      {index + 1} of {data.segments.length}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall Status */}
      {data.overallStatus && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Journey Status:</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            data.overallStatus === 'on_track' ? 'bg-primary/10 text-primary' :
            data.overallStatus === 'watch' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {data.overallStatus === 'on_track' && <FiCheck className="h-3 w-3" />}
            {data.overallStatus === 'watch' && <FiAlertTriangle className="h-3 w-3" />}
            {data.overallStatus === 'action_needed' && <FiX className="h-3 w-3" />}
            {data.overallStatus.replace('_', ' ').toUpperCase()}
          </span>
          {data.reliability && (
            <span className="text-muted-foreground">• {data.reliability}% reliable</span>
          )}
        </div>
      )}
    </div>
  );
};

export default JourneyTimeline;
