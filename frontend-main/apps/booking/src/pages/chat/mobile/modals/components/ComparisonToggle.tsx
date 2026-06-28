import React from "react";
import { FiGrid, FiList } from "react-icons/fi";

type ViewMode = 'grid' | 'table';

interface ComparisonToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

const ComparisonToggle: React.FC<ComparisonToggleProps> = ({
  viewMode,
  onViewModeChange,
  className = "",
}) => {
  return (
    <div className={`flex items-center rounded-lg border border-border bg-card p-1 ${className}`}>
      <button
        type="button"
        onClick={() => onViewModeChange('grid')}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          viewMode === 'grid'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <FiGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('table')}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          viewMode === 'table'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <FiList className="h-4 w-4" />
        <span className="hidden sm:inline">Table</span>
      </button>
    </div>
  );
};

export default ComparisonToggle;