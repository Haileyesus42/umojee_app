import React, { useEffect, useState } from "react";
import { FiX, FiMapPin, FiClock, FiStar } from "react-icons/fi";
import NavigationSteps from "./components/NavigationSteps";
import ComparisonCard from "./components/ComparisonCard";
import ComparisonTable from "./components/ComparisonTable";
import ComparisonToggle from "./components/ComparisonToggle";
import { getComparisonFallbackImage } from "../types/phase7";
import type { ComparisonItem, ComparisonType } from "../types/phase7";
import { getFormattedMetadataEntries } from "../utils/comparisonMetadata";

type ViewMode = 'grid' | 'table';

interface ComparisonModalProps {
  open: boolean;
  items: ComparisonItem[];
  comparisonType: ComparisonType;
  onClose: () => void;
  onSelect?: (item: ComparisonItem) => void;
  onDone?: (selectedItem: ComparisonItem | null) => void;
  /** Open directly at a specific step (0 = Overview, 1 = Details) */
  initialStep?: number;
  /** Pre-select an item (used with initialStep=1 to show details immediately) */
  initialSelectedItem?: ComparisonItem | null;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({
  open,
  items,
  comparisonType,
  onClose,
  onSelect,
  onDone,
  initialStep,
  initialSelectedItem,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedItem, setSelectedItem] = useState<ComparisonItem | null>(null);
  const safeItems = Array.isArray(items) ? items : [];
  const selectedPros = Array.isArray(selectedItem?.pros) ? selectedItem.pros : [];
  const selectedCons = Array.isArray(selectedItem?.cons) ? selectedItem.cons : [];
  const selectedMetadata =
    selectedItem?.metadata && typeof selectedItem.metadata === "object"
      ? selectedItem.metadata
      : {};
  const selectedMetadataEntries = getFormattedMetadataEntries(selectedMetadata);

  // When modal opens with initial step/item, jump directly there
  useEffect(() => {
    if (open && initialStep !== undefined) {
      setCurrentStep(initialStep);
    }
    if (open && initialSelectedItem) {
      setSelectedItem(initialSelectedItem);
    }
  }, [open, initialStep, initialSelectedItem]);

  const stepLabels = ["Overview", "Details"];

  const getTypeIcon = (type: ComparisonType) => {
    switch (type) {
      case "destination":
        return <FiMapPin className="h-5 w-5" />;
      case "transport":
        return <FiClock className="h-5 w-5" />;
      case "activity":
        return <FiStar className="h-5 w-5" />;
      case "accommodation":
        return <FiMapPin className="h-5 w-5" />;
      case "car":
        return <FiClock className="h-5 w-5" />;
    }
  };

  const getTypeTitle = (type: ComparisonType) => {
    switch (type) {
      case "destination":
        return "Destination";
      case "transport":
        return "Transport";
      case "activity":
        return "Activity";
      case "accommodation":
        return "Accommodation";
      case "car":
        return "Car";
    }
  };

  const handleItemSelect = (item: ComparisonItem) => {
    setSelectedItem(item);
    if (onSelect) {
      onSelect(item);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleNext = () => {
    if (currentStep < stepLabels.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="relative max-h-full w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              {getTypeIcon(comparisonType)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {getTypeTitle(comparisonType)} Comparison
              </h2>
              <p className="text-sm text-muted-foreground">
                Compare {safeItems.length} {comparisonType} options
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Steps */}
        <div className="border-b border-border px-4 py-3">
          <NavigationSteps
            currentStep={currentStep}
            labels={stepLabels}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-4">
          {currentStep === 0 && (
            /* Overview Step */
            <div className="space-y-4">
              {/* View Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{safeItems.length} options available</span>
                </div>
                <ComparisonToggle
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
              </div>

              {/* Content based on view mode */}
              {viewMode === 'grid' ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {safeItems.map((item, idx) => (
                    <ComparisonCard
                      key={item.id}
                      item={item}
                      index={idx}
                      onSelect={handleItemSelect}
                    />
                  ))}
                </div>
              ) : (
                <ComparisonTable
                  items={safeItems}
                  onSelect={handleItemSelect}
                />
              )}
            </div>
          )}

          {currentStep === 1 && (
            /* Details Step */
            <div className="space-y-4">
              {selectedItem ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h3 className="mb-3 text-lg font-semibold text-foreground">
                      {selectedItem.name}
                    </h3>

                    {/* Image */}
                    <div className="mb-4 aspect-video w-full overflow-hidden rounded-lg bg-muted">
                      {(() => {
                        const selectedIdx = safeItems.findIndex(i => i.id === selectedItem.id);
                        const fallback = getComparisonFallbackImage(selectedItem, selectedIdx >= 0 ? selectedIdx : 0);
                        return (
                          <img
                            src={selectedItem.imageUrl || fallback}
                            alt={selectedItem.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = fallback;
                            }}
                          />
                        );
                      })()}
                    </div>

                    {/* Price and Confidence */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-lg font-semibold text-foreground">
                        {selectedItem.price && (
                          new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: selectedItem.currency || 'USD',
                          }).format(selectedItem.price)
                        )}
                      </div>
                      {selectedItem.matchConfidence && (
                        <div className="text-sm text-muted-foreground">
                          Match: {selectedItem.matchConfidence}%
                        </div>
                      )}
                    </div>

                    {/* Pros */}
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold text-emerald-600 uppercase tracking-wide">
                        Advantages
                      </h4>
                      <ul className="space-y-1">
                        {selectedPros.map((pro, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                            <span className="mt-0.5 text-emerald-500">✓</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Cons */}
                    {selectedCons.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-amber-600 uppercase tracking-wide">
                          Considerations
                        </h4>
                        <ul className="space-y-1">
                          {selectedCons.map((con, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="mt-0.5 text-amber-500">⚠</span>
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  {selectedMetadataEntries.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <h4 className="mb-2 text-sm font-semibold text-foreground uppercase tracking-wide">
                        Additional Details
                      </h4>
                      <div className="grid gap-2 text-sm">
                        {selectedMetadataEntries.map((entry) => (
                          <div key={entry.key} className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              {entry.label}:
                            </span>
                            <span className="text-right text-foreground break-words">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-center">
                  <div>
                    <p className="text-muted-foreground">
                      Select an option from the Overview to view details
                    </p>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(0)}
                      className="mt-2 text-sm text-primary hover:underline"
                    >
                      Go back to Overview
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <div className="flex items-center gap-2">
            {selectedItem && (
              <span className="text-sm text-muted-foreground">
                Selected: {selectedItem.name}
              </span>
            )}
            <button
              type="button"
              onClick={
                currentStep === stepLabels.length - 1
                  ? () => {
                      if (onDone) {
                        onDone(selectedItem);
                      } else {
                        onClose();
                      }
                    }
                  : handleNext
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {currentStep === stepLabels.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
