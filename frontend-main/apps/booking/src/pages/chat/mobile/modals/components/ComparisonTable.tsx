import React from "react";
import { FiCheck, FiX, FiDollarSign } from "react-icons/fi";
import ConfidenceBadge from "../../components/ConfidenceBadge";
import { getComparisonFallbackImage } from "../../types/phase7";
import type { ComparisonItem } from "../../types/phase7";

interface ComparisonTableProps {
  items: ComparisonItem[];
  onSelect?: (item: ComparisonItem) => void;
  className?: string;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  items,
  onSelect,
  className = "",
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return "-";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Get all unique pros and cons across all items
  const allPros = Array.from(new Set(items.flatMap((item) => item.pros ?? [])));
  const allCons = Array.from(new Set(items.flatMap((item) => item.cons ?? [])));

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse min-w-[800px]">
        {/* Header */}
        <thead>
          <tr className="border-b border-border">
            <th className="pb-3 text-left text-sm font-semibold text-foreground min-w-[200px]">Option</th>
            <th className="pb-3 text-center text-sm font-semibold text-foreground min-w-[100px]">Price</th>
            <th className="pb-3 text-center text-sm font-semibold text-foreground min-w-[100px]">Confidence</th>
            {allPros.map((pro, idx) => (
              <th key={`pro-${idx}`} className="pb-3 text-center text-xs font-semibold text-emerald-600 min-w-[120px] max-w-[200px]">
                <div className="flex items-center justify-center gap-1">
                  <span>✓</span>
                  <span className="break-words leading-tight">{pro}</span>
                </div>
              </th>
            ))}
            {allCons.map((con, idx) => (
              <th key={`con-${idx}`} className="pb-3 text-center text-xs font-semibold text-amber-600 min-w-[120px] max-w-[200px]">
                <div className="flex items-center justify-center gap-1">
                  <span>⚠</span>
                  <span className="break-words leading-tight">{con}</span>
                </div>
              </th>
            ))}
            <th className="pb-3 text-center text-sm font-semibold text-foreground min-w-[100px]">Action</th>
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {items.map((item, itemIdx) => (
            <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
              {/* Option Name */}
              <td className="py-4 pr-4 min-w-[200px]">
                <div className="flex items-center gap-3">
                  <img
                    src={item.imageUrl || getComparisonFallbackImage(item, itemIdx)}
                    alt={item.name}
                    className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = getComparisonFallbackImage(item, itemIdx);
                    }}
                  />
                  <span className="text-sm font-medium text-foreground break-words">{item.name}</span>
                </div>
              </td>

              {/* Price */}
              <td className="py-4 px-4 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1 text-sm font-medium text-foreground">
                  <FiDollarSign className="h-3 w-3" />
                  <span className="break-all">{formatPrice(item.price, item.currency)}</span>
                </div>
              </td>

              {/* Confidence */}
              <td className="py-4 px-4 text-center min-w-[100px]">
                {item.matchConfidence ? (
                  <ConfidenceBadge score={item.matchConfidence} variant="minimal" />
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>

              {/* Pros */}
              {allPros.map((pro, proIdx) => (
                <td key={`pro-${itemIdx}-${proIdx}`} className="py-4 px-3 text-center min-w-[120px]">
                  {(item.pros ?? []).includes(pro) ? (
                    <FiCheck className="mx-auto h-5 w-5 text-emerald-500" />
                  ) : (
                    <div className="h-5 w-5 mx-auto" />
                  )}
                </td>
              ))}

              {/* Cons */}
              {allCons.map((con, conIdx) => (
                <td key={`con-${itemIdx}-${conIdx}`} className="py-4 px-3 text-center min-w-[120px]">
                  {(item.cons ?? []).includes(con) ? (
                    <FiX className="mx-auto h-5 w-5 text-amber-500" />
                  ) : (
                    <div className="h-5 w-5 mx-auto" />
                  )}
                </td>
              ))}

              {/* Action */}
              <td className="py-4 pl-4 text-center min-w-[100px]">
                {onSelect && (
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 whitespace-nowrap"
                  >
                    Select
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;
