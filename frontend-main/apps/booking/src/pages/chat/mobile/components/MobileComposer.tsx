import React, { FormEvent } from "react";
import { FiSend, FiMic, FiMenu } from "react-icons/fi";

type MobileComposerProps = {
  draft: string;
  setDraft: (value: string) => void;
  onSend: (message: string) => void;
  isLoading: boolean;
  isRecording?: boolean;
  onMicClick?: () => void;
  onMenuClick?: () => void;
};

const MobileComposer: React.FC<MobileComposerProps> = ({
  draft,
  setDraft,
  onSend,
  isLoading,
  isRecording = false,
  onMicClick,
  onMenuClick,
}) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend(draft);
  };

  return (
    <div className="flex items-center gap-3">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          disabled={isLoading}
          className="inline-flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          <FiMenu className="text-lg" />
        </button>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex-1 flex items-end gap-3 rounded-2xl border border-border bg-card px-3 py-1 shadow-sm"
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type your message..."
          rows={2}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
              return;
            }
            event.preventDefault();
            if (!isLoading && draft.trim()) {
              onSend(draft);
            }
          }}
          className="flex-1 resize-none border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          disabled={isLoading}
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={isLoading || !draft.trim()}
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-[1.02] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiSend className="text-lg" />
        </button>
      </form>
      <button
        type="button"
        aria-label={isRecording ? "Stop recording" : "Start voice input"}
        onClick={onMicClick}
        disabled={isLoading}
        className={`inline-flex h-[40px] w-[40px] border border-muted-foreground hover:border-none flex-shrink-0 items-center justify-center rounded-full transition-transform hover:bg-primary/90 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${isRecording
          ? "bg-red-500 text-white animate-pulse"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
          } ${isLoading ? "pointer-events-none opacity-50" : ""
          }`}
      >
        <FiMic className="text-lg" />
      </button>
    </div>
  );
};

export default MobileComposer;

