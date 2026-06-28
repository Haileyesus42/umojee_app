import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";

type AssistantResponseModalProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
};

const AssistantResponseModal: React.FC<AssistantResponseModalProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
}) => {
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Assistant response"}
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity hover:bg-background/80 focus-visible:outline-none"
        aria-label="Close expanded assistant response"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-7xl overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-b from-background via-background/95 to-background shadow-2xl shadow-primary/30">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-8 py-5">
          <div>
            {title && (
              <p className="text-lg font-semibold tracking-tight text-foreground">
                {title}
              </p>
            )}
            {subtitle && (
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/70 bg-card/70 p-2 text-muted-foreground shadow hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label="Close expanded assistant response"
          >
            <FiX className="text-base" />
          </button>
        </div>
        <div className="max-h-[85vh] overflow-y-auto px-12 py-6 leading-relaxed text-foreground scrollbar-thin scrollbar-track-muted/30 scrollbar-thumb-primary/60">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AssistantResponseModal;
