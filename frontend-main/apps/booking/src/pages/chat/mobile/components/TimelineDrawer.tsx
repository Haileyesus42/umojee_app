import React, { useState } from "react";
import { FiX, FiChevronLeft, FiChevronRight, FiMapPin, FiClock, FiCheckCircle, FiAlertCircle, FiXCircle } from "react-icons/fi";
import type { TimelineData, TimelineSegment } from "../types/phase7";
import ConfidenceBadge from "./ConfidenceBadge";

interface TimelineDrawerProps {
  timeline: TimelineData;
  isOpen: boolean;
  onClose: () => void;
  onSegmentClick?: (segment: TimelineSegment) => void;
}

const TimelineDrawer: React.FC<TimelineDrawerProps> = ({
  timeline,
  isOpen,
  onClose,
  onSegmentClick,
}) => {
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);

  if (!isOpen) return null;

  const selectedSegment = timeline.segments[selectedSegmentIndex];

  const getStatusIcon = (status: TimelineSegment['status']) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="h-5 w-5 text-primary" />;
      case 'in_progress':
        return <FiClock className="h-5 w-5 text-primary" />;
      case 'delayed':
        return <FiAlertCircle className="h-5 w-5 text-amber-500" />;
      case 'cancelled':
        return <FiXCircle className="h-5 w-5 text-destructive" />;
      default:
        return <FiMapPin className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: TimelineSegment['status']) => {
    switch (status) {
      case 'completed':
        return 'border-primary/20 bg-primary/5';
      case 'in_progress':
        return 'border-primary/20 bg-primary/5';
      case 'delayed':
        return 'border-amber-200 bg-amber-50';
      case 'cancelled':
        return 'border-destructive/20 bg-destructive/5';
      default:
        return 'border-border bg-card';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      };
    } catch {
      return { date: dateString, time: '' };
    }
  };

  const navigateSegment = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedSegmentIndex > 0) {
      setSelectedSegmentIndex(selectedSegmentIndex - 1);
    } else if (direction === 'next' && selectedSegmentIndex < timeline.segments.length - 1) {
      setSelectedSegmentIndex(selectedSegmentIndex + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      <div className="w-full max-h-[90vh] bg-background rounded-t-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">Journey Timeline</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Overview */}
        <div className="px-4 py-3 bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {timeline.segments.filter(s => s.status === 'completed').length} of {timeline.segments.length} completed
            </span>
            {timeline.confidence && <ConfidenceBadge score={timeline.confidence} variant="minimal" />}
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${(timeline.segments.filter(s => s.status === 'completed').length / timeline.segments.length) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Segment Navigation */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <button
            onClick={() => navigateSegment('prev')}
            disabled={selectedSegmentIndex === 0}
            className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {timeline.segments.map((segment, index) => (
              <button
                key={segment.id}
                onClick={() => setSelectedSegmentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === selectedSegmentIndex
                    ? 'bg-primary scale-125'
                    : segment.status === 'completed'
                    ? 'bg-primary'
                    : segment.status === 'in_progress'
                    ? 'bg-primary'
                    : 'bg-muted-foreground'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => navigateSegment('next')}
            disabled={selectedSegmentIndex === timeline.segments.length - 1}
            className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronLeft className="h-5 w-5 rotate-180" />
          </button>
        </div>

        {/* Selected Segment Details */}
        {selectedSegment && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className={`rounded-xl border p-4 ${getStatusColor(selectedSegment.status)}`}>
              {/* Segment Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedSegment.status)}
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedSegment.title}</h3>
                    <p className="text-sm text-muted-foreground">{selectedSegment.type}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-background/50 text-foreground">
                  {selectedSegmentIndex + 1} of {timeline.segments.length}
                </span>
              </div>

              {/* Time Information */}
              <div className="space-y-3 mb-4">
                {selectedSegment.startTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <FiClock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Start:</span>
                    <span className="font-medium">
                      {formatDateTime(selectedSegment.startTime).date} at {formatDateTime(selectedSegment.startTime).time}
                    </span>
                  </div>
                )}

                {selectedSegment.endTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <FiClock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">End:</span>
                    <span className="font-medium">
                      {formatDateTime(selectedSegment.endTime).date} at {formatDateTime(selectedSegment.endTime).time}
                    </span>
                  </div>
                )}

                {selectedSegment.duration && (
                  <div className="flex items-center gap-2 text-sm">
                    <FiClock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{selectedSegment.duration}</span>
                  </div>
                )}
              </div>

              {/* Location Information */}
              {(selectedSegment.departure || selectedSegment.arrival) && (
                <div className="space-y-2 mb-4">
                  {selectedSegment.departure && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiMapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">From:</span>
                      <span className="font-medium">{selectedSegment.departure}</span>
                    </div>
                  )}
                  {selectedSegment.arrival && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiMapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">To:</span>
                      <span className="font-medium">{selectedSegment.arrival}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {selectedSegment.description && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedSegment.description}
                  </p>
                </div>
              )}

              {/* Additional Details */}
              {selectedSegment.details && selectedSegment.details.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Details</h4>
                  <ul className="space-y-1">
                    {selectedSegment.details.map((detail, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineDrawer;