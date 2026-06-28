import React, { useState } from "react";
import { FiChevronDown, FiChevronUp, FiTrendingUp, FiTrendingDown, FiMinus } from "react-icons/fi";
import type { ReliabilityFactor } from "../types/phase7";

interface TimelineReliabilityProps {
  reliability: number; // 0-100
  factors?: ReliabilityFactor[];
  className?: string;
}

const TimelineReliability: React.FC<TimelineReliabilityProps> = ({
  reliability,
  factors = [],
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine reliability level and color
  const getReliabilityConfig = (score: number) => {
    if (score >= 85) return { level: "High", color: "emerald", textColor: "text-emerald-600" };
    if (score >= 70) return { level: "Good", color: "primary", textColor: "text-primary" };
    if (score >= 50) return { level: "Moderate", color: "amber", textColor: "text-amber-600" };
    return { level: "Low", color: "red", textColor: "text-red-600" };
  };

  const config = getReliabilityConfig(reliability);
  const hasFactors = factors && factors.length > 0;

  // Get icon for impact type
  const getImpactIcon = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return <FiTrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
      case 'negative':
        return <FiTrendingDown className="h-3.5 w-3.5 text-red-500" />;
      case 'neutral':
        return <FiMinus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 shadow-sm ${className}`}
      role="region"
      aria-label="Timeline reliability information"
    >
      {/* Header with circular progress */}
      <div className="flex items-center gap-4">
        {/* Circular progress indicator */}
        <div className="relative h-16 w-16 flex-shrink-0">
          <svg className="h-16 w-16 -rotate-90 transform" viewBox="0 0 64 64">
            {/* Background circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-muted/30"
            />
            {/* Progress circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${(reliability / 100) * 175.93} 175.93`}
              className={
                config.color === "emerald"
                  ? "text-emerald-500"
                  : config.color === "primary"
                  ? "text-primary"
                  : config.color === "amber"
                  ? "text-amber-500"
                  : "text-red-500"
              }
              strokeLinecap="round"
            />
          </svg>
          {/* Percentage text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-bold ${config.textColor}`}>{reliability}%</span>
          </div>
        </div>

        {/* Text content */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Timeline Reliability</h3>
          <p className={`text-xs font-medium ${config.textColor}`}>{config.level} Confidence</p>
          {hasFactors && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
              aria-expanded={isExpanded}
              aria-controls="reliability-factors"
            >
              <span>{isExpanded ? "Hide" : "View"} {factors.length} factor{factors.length !== 1 ? 's' : ''}</span>
              {isExpanded ? <FiChevronUp className="h-3 w-3" /> : <FiChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable factors list */}
      {hasFactors && isExpanded && (
        <ul
          id="reliability-factors"
          className="mt-4 space-y-2.5 border-t border-border pt-3"
        >
          {factors.map((factor, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex-shrink-0">
                {getImpactIcon(factor.impact)}
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-foreground">{factor.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {factor.description}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TimelineReliability;
