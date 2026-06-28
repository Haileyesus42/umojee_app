import React, { useState } from "react";
import { FiRotateCcw, FiMapPin, FiDollarSign, FiClock, FiStar } from "react-icons/fi";
import ConfidenceBadge from "../../components/ConfidenceBadge";
import { getComparisonFallbackImage } from "../../types/phase7";
import type { ComparisonItem } from "../../types/phase7";

interface ComparisonCardProps {
  item: ComparisonItem;
  index?: number;
  onSelect?: (item: ComparisonItem) => void;
  className?: string;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({
  item,
  index = 0,
  onSelect,
  className = "",
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "destination":
        return <FiMapPin className="h-4 w-4" />;
      case "transport":
        return <FiClock className="h-4 w-4" />;
      case "activity":
        return <FiStar className="h-4 w-4" />;
      case "car":
        return <FiClock className="h-4 w-4" />;
      default:
        return <FiMapPin className="h-4 w-4" />;
    }
  };

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={`group relative ${className}`}>
      <div
        className={`relative h-64 w-full cursor-pointer transition-transform duration-500 preserve-3d ${isFlipped ? "rotate-y-180" : ""
          }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front of card */}
        <div className="absolute inset-0 backface-hidden">
          <div className="h-full rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md overflow-hidden flex flex-col">
            {/* Header */}
            <div className="mb-2 flex items-start justify-between flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getTypeIcon(item.type)}
                <h3 className="font-semibold text-foreground text-sm truncate">{item.name}</h3>
              </div>
              {item.matchConfidence && (
                <ConfidenceBadge score={item.matchConfidence} variant="minimal" />
              )}
            </div>

            {/* Image */}
            <div className="mb-2 aspect-video w-full overflow-hidden rounded-lg bg-muted flex-shrink-0">
              <div className="relative h-full w-full">
                <img
                  src={item.imageUrl || getComparisonFallbackImage(item, index)}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = getComparisonFallbackImage(item, index);
                  }}
                />
                {item.isBooked && (
                  <div className="absolute left-2 bottom-2 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    Booked
                  </div>
                )}
              </div>
            </div>

            {/* Price */}
            {item.price && (
              <div className="mb-1 flex items-center gap-1 text-sm font-medium text-foreground flex-shrink-0">
                <FiDollarSign className="h-3 w-3" />
                {formatPrice(item.price, item.currency)}
              </div>
            )}

            {/* Quick Pros/Cons Preview */}
            <div className="space-y-1 flex-1 min-h-0">
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <span className="font-medium">✓</span>
                <span className="truncate">{item.pros?.[0] || "Good option"}</span>
              </div>
              {(item.cons?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <span className="font-medium">⚠</span>
                  <span className="truncate">{item.cons![0]}</span>
                </div>
              )}
            </div>

            {/* Flip hint */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
              <div className="flex items-center gap-1 rounded-full bg-black/20 backdrop-blur-sm px-3 py-2 text-xs text-white">
                <FiRotateCcw className="h-3 w-3" />
                <span>Tap to flip</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div className="absolute inset-0 rotate-y-180 backface-hidden">
          <div className="h-full rounded-2xl border border-border bg-card p-4 shadow-sm overflow-y-auto">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                className="rounded-full p-1 hover:bg-muted"
              >
                <FiRotateCcw className="h-3 w-3" />
              </button>
            </div>

            {/* Pros */}
            <div className="mb-3">
              <h4 className="mb-2 text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                Pros
              </h4>
              <ul className="space-y-1">
                {(item.pros ?? []).map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="mt-0.5 text-emerald-500">✓</span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            {(item.cons?.length ?? 0) > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold text-amber-600 uppercase tracking-wide">
                  Cons
                </h4>
                <ul className="space-y-1">
                  {item.cons!.map((con, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="mt-0.5 text-amber-500">⚠</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Select button */}
            {onSelect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item);
                }}
                className="absolute bottom-3 right-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Select
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonCard;
