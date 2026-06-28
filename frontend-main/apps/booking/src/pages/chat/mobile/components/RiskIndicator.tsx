import React, { useState } from "react";
import { FiCheckCircle, FiEye, FiAlertTriangle, FiChevronDown, FiChevronUp } from "react-icons/fi";
import type { RiskLevel } from "../types/phase7";

interface RiskIndicatorProps {
  level: RiskLevel;
  message: string;
  details?: string[];
  compact?: boolean;
  className?: string;
}

const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  level,
  message,
  details = [],
  compact = false,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get styling and icon based on risk level
  const getRiskConfig = (level: RiskLevel) => {
    switch (level) {
      case "on_track":
        return {
          icon: FiCheckCircle,
          borderColor: "border-emerald-500",
          bgColor: "bg-emerald-500/10",
          textColor: "text-emerald-700 dark:text-emerald-400",
          iconColor: "text-emerald-600 dark:text-emerald-400",
          label: "On Track",
          ariaLive: "polite" as const,
        };
      case "watch":
        return {
          icon: FiEye,
          borderColor: "border-amber-500",
          bgColor: "bg-amber-500/10",
          textColor: "text-amber-700 dark:text-amber-400",
          iconColor: "text-amber-600 dark:text-amber-400",
          label: "Watch",
          ariaLive: "polite" as const,
        };
      case "action_needed":
        return {
          icon: FiAlertTriangle,
          borderColor: "border-red-500",
          bgColor: "bg-red-500/10",
          textColor: "text-red-700 dark:text-red-400",
          iconColor: "text-red-600 dark:text-red-400",
          label: "Action Needed",
          ariaLive: "assertive" as const,
        };
    }
  };

  const config = getRiskConfig(level);
  const Icon = config.icon;
  const hasDetails = details && details.length > 0;

  // Compact variant - icon only with tooltip
  if (compact) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full p-2 ${config.bgColor} ${className}`}
        role="status"
        aria-label={`${config.label}: ${message}`}
        aria-live={config.ariaLive}
        title={message}
      >
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
      </div>
    );
  }

  // Full variant
  return (
    <div
      className={`rounded-lg border-l-4 ${config.borderColor} ${config.bgColor} px-3 py-2.5 transition-all ${className}`}
      role="alert"
      aria-live={config.ariaLive}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.iconColor}`} aria-hidden="true" />

        {/* Content */}
        <div className="flex-1 space-y-1.5">
          {/* Status label */}
          <div className={`text-xs font-semibold uppercase tracking-wide ${config.textColor}`}>
            {config.label}
          </div>

          {/* Message */}
          <div className={`text-sm font-medium ${config.textColor}`}>{message}</div>

          {/* Expandable details */}
          {hasDetails && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-1.5 text-xs font-medium ${config.textColor} hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded`}
                aria-expanded={isExpanded}
                aria-controls="risk-details"
              >
                <span>{isExpanded ? "Hide details" : "Show details"}</span>
                {isExpanded ? (
                  <FiChevronUp className="h-3 w-3" />
                ) : (
                  <FiChevronDown className="h-3 w-3" />
                )}
              </button>

              {isExpanded && (
                <ul
                  id="risk-details"
                  className={`mt-2 space-y-1.5 border-l-2 ${config.borderColor} pl-3 text-xs ${config.textColor}`}
                >
                  {details.map((detail, index) => (
                    <li key={index} className="leading-relaxed">
                      • {detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskIndicator;
