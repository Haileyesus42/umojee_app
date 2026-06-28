import React from "react";
import { FiCheckCircle } from "react-icons/fi";

interface ConfidenceBadgeProps {
  score: number; // 0-100
  label?: string;
  variant?: "minimal" | "detailed" | "pill";
  showIcon?: boolean;
  className?: string;
}

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score,
  label,
  variant = "minimal",
  showIcon = false,
  className = "",
}) => {
  // Determine confidence level and styling
  const getConfidenceLevel = (score: number) => {
    if (score >= 90) return { level: "high", label: "Excellent Match", color: "emerald" };
    if (score >= 70) return { level: "good", label: "Good Match", color: "primary" };
    if (score >= 50) return { level: "moderate", label: "Possible Match", color: "amber" };
    return { level: "low", label: "Low Match", color: "muted" };
  };

  const confidence = getConfidenceLevel(score);

  // Render dots for minimal variant
  const renderDots = () => {
    const filledDots = Math.ceil((score / 100) * 5);
    return (
      <div className="flex items-center gap-0.5" role="img" aria-label={`${score}% confidence`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              index < filledDots
                ? confidence.color === "emerald"
                  ? "bg-emerald-500"
                  : confidence.color === "primary"
                  ? "bg-primary"
                  : confidence.color === "amber"
                  ? "bg-amber-400"
                  : "bg-muted"
                : "bg-muted/30"
            }`}
          />
        ))}
      </div>
    );
  };

  // Minimal variant - just dots
  if (variant === "minimal") {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`} role="status">
        {renderDots()}
      </div>
    );
  }

  // Pill variant - rounded badge with percentage
  if (variant === "pill") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
          confidence.color === "emerald"
            ? "bg-emerald-500 text-white"
            : confidence.color === "primary"
            ? "bg-primary text-primary-foreground"
            : confidence.color === "amber"
            ? "bg-amber-400 text-black"
            : "bg-muted text-muted-foreground"
        } ${className}`}
        role="status"
        aria-label={`${score}% confidence - ${confidence.label}`}
      >
        {showIcon && <FiCheckCircle className="h-3 w-3" />}
        <span>{score}%</span>
        {label && <span className="ml-0.5">{label}</span>}
      </div>
    );
  }

  // Detailed variant - full breakdown with progress bar
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label={`${score}% confidence - ${confidence.label}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label || "Match Confidence"}</span>
        <span
          className={`font-semibold ${
            confidence.color === "emerald"
              ? "text-emerald-600"
              : confidence.color === "primary"
              ? "text-primary"
              : confidence.color === "amber"
              ? "text-amber-600"
              : "text-muted-foreground"
          }`}
        >
          {score}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
        <div
          className={`h-full transition-all duration-500 ${
            confidence.color === "emerald"
              ? "bg-emerald-500"
              : confidence.color === "primary"
              ? "bg-primary"
              : confidence.color === "amber"
              ? "bg-amber-400"
              : "bg-muted"
          }`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Confidence level label */}
      <div className="flex items-center gap-2">
        {renderDots()}
        <span className="text-xs text-muted-foreground">{confidence.label}</span>
      </div>
    </div>
  );
};

export default ConfidenceBadge;
