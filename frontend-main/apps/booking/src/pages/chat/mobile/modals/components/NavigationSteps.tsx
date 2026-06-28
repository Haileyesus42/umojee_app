import React from "react";

type NavigationStepsProps = {
  currentStep: number;
  labels: string[];
  onStepClick?: (index: number) => void;
};

const NavigationSteps: React.FC<NavigationStepsProps> = ({ currentStep, labels, onStepClick }) => {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <h2 className="text-lg font-semibold text-foreground text-center">Trip Builder</h2>
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="mx-auto flex w-max items-center justify-center gap-3 px-2">
          {labels.map((label, idx) => {
            const active = idx === currentStep;
            const done = idx < currentStep;
            return (
              <div key={label} className="flex flex-col items-center">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onStepClick?.(idx)}
                    disabled={!onStepClick}
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow shadow-primary/30"
                        : done
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    } ${
                      onStepClick
                        ? "hover:border-primary hover:bg-primary/10 hover:text-primary"
                        : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                  {idx < labels.length - 1 && (
                    <div className={`mx-3 h-[2px] w-12 flex-shrink-0 rounded-full ${done ? "bg-primary/70" : "bg-border"}`} />
                  )}
                </div>
                <span className="mt-1 text-[10px] font-semibold text-muted-foreground text-center">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NavigationSteps;
