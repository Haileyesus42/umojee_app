import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiArrowRight,
  FiCheck,
  FiClock,
  FiGlobe,
  FiMic,
  FiRefreshCw,
  FiType,
  FiX,
} from "react-icons/fi";
import speechToTextService from "../../../../services/speechToText";
import { speechLanguageOptions } from "../../../../constants/speechLanguages";

type SpeechToTextModalProps = {
  open: boolean;
  conversationId?: string | null;
  onClose: () => void;
  onDone: (text: string, language?: string) => void;
};

const VOICE_STATE_COPY: Record<
  "idle" | "connecting" | "recording" | "transcribing" | "ready" | "error" | "closed",
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  idle: {
    eyebrow: "Voice composer",
    title: "Capture your message naturally",
    description:
      "Choose a language, toggle the mic icon to record and stop.",
  },
  connecting: {
    eyebrow: "Preparing session",
    title: "Connecting your microphone",
    description: "We are setting up a secure voice session, please wait.",
  },
  recording: {
    eyebrow: "Listening live",
    title: "Speak like you are chatting",
    description: "Pause when you are ready, click the mic to do so.",
  },
  transcribing: {
    eyebrow: "Processing audio",
    title: "Turning speech into text",
    description: "Hold on for a moment while we build a clean transcript from your recording.",
  },
  ready: {
    eyebrow: "Transcript ready",
    title: "Review before sending",
    description: "Make any quick edits, then send the final version into the conversation.",
  },
  error: {
    eyebrow: "Voice unavailable",
    title: "Something interrupted recording",
    description: "You can close this sheet or try again once the voice connection is stable.",
  },
  closed: {
    eyebrow: "Session ended",
    title: "Recording stopped",
    description: "You can start a fresh recording whenever you are ready.",
  },
};

const getLanguageLabel = (value: string) =>
  speechLanguageOptions.find((option) => option.value === value)?.label || "Auto Detect";

const SpeechToTextModal: React.FC<SpeechToTextModalProps> = ({
  open,
  conversationId,
  onClose,
  onDone,
}) => {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<
    "idle" | "connecting" | "recording" | "transcribing" | "ready" | "error" | "closed"
  >("idle");
  const [isReviewingTranscript, setIsReviewingTranscript] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto");
  const [transcriptLanguage, setTranscriptLanguage] = useState<string>("auto");

  const startListening = useCallback(() => {
    setError(null);
    setTranscript("");
    setVoiceState("connecting");
    setIsReviewingTranscript(false);
    setTranscriptLanguage(selectedLanguage);

    void speechToTextService.startSession({
      conversationId,
      language: selectedLanguage === "auto" ? undefined : selectedLanguage,
      onPartial: () => {
        // Intentional: this experience waits to reveal the transcript until final text is ready.
      },
      onFinal: (text) => {
        setTranscript(text);
        setTranscriptLanguage(
          speechToTextService.getCurrentLanguage() ||
            (selectedLanguage === "auto" ? "auto" : selectedLanguage)
        );
        setIsListening(false);
        setVoiceState("ready");
        setIsReviewingTranscript(true);
      },
      onError: (err) => {
        setError(err);
        setIsListening(false);
        setVoiceState("error");
      },
      onStateChange: (state) => {
        setVoiceState(state);
        setIsListening(state === "recording" || state === "transcribing");
      },
    });
  }, [conversationId, selectedLanguage]);

  const stopListening = useCallback(() => {
    speechToTextService.stopSession();
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (open) {
      setTranscript("");
      setError(null);
      setVoiceState("idle");
      setIsReviewingTranscript(false);
      setTranscriptLanguage(selectedLanguage);
    } else {
      speechToTextService.cancelSession();
    }

    return () => {
      speechToTextService.cancelSession();
    };
  }, [open, selectedLanguage]);

  const handleDone = () => {
    const finalText = transcript.trim();
    onDone(
      finalText,
      transcriptLanguage && transcriptLanguage !== "auto" ? transcriptLanguage : undefined
    );
    onClose();
  };

  const handleClose = () => {
    speechToTextService.cancelSession();
    onClose();
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    startListening();
  };

  if (!open) return null;

  const isSupported = speechToTextService.isSupported();
  const isTranscribing = voiceState === "transcribing";
  const showReviewStage = isReviewingTranscript || (!!transcript.trim() && !isListening);
  const displayState =
    !isSupported ? "error" : error ? "error" : showReviewStage ? "ready" : voiceState;
  const stateCopy = VOICE_STATE_COPY[displayState];
  const transcriptWordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const languageLabel = getLanguageLabel(selectedLanguage);
  const transcriptLanguageLabel = getLanguageLabel(transcriptLanguage);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: "100%", opacity: 0.96 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden rounded-t-[32px] border border-border/60 bg-background text-foreground shadow-2xl"
          >
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.22),_transparent_40%),linear-gradient(180deg,_hsl(var(--primary)/0.12),_transparent_72%)]" />
              <div className="absolute left-[-32px] top-8 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute right-[-36px] top-16 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative px-5 pb-5 pt-3">
                <div className="mb-4 flex justify-center">
                  <div className="h-1.5 w-14 rounded-full bg-white/20" />
                </div>

                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-3 pr-1">
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                      <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary)/0.55)]" />
                      {stateCopy.eyebrow}
                    </span>
                    <div>
                      <h2 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground">
                        {stateCopy.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {stateCopy.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleClose}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80 text-foreground transition-colors hover:bg-muted/80"
                    aria-label="Close"
                  >
                    <FiX className="text-lg" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur-sm">
                    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <FiGlobe className="text-sm" />
                      Language
                    </div>
                    <div className="text-sm font-medium text-foreground">{languageLabel}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur-sm">
                    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <FiClock className="text-sm" />
                      Status
                    </div>
                    <div className="text-sm font-medium capitalize text-foreground">{displayState}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur-sm">
                    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <FiType className="text-sm" />
                      Words
                    </div>
                    <div className="text-sm font-medium text-foreground">{transcriptWordCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-background px-5 pb-6">
              {!isSupported ? (
                <div className="rounded-[28px] border border-destructive/20 bg-destructive/10 p-5 text-sm leading-6 text-destructive">
                  Speech recognition is not supported in this browser. Try a browser with microphone
                  access enabled.
                </div>
              ) : error ? (
                <div className="rounded-[28px] border border-destructive/20 bg-destructive/10 p-5 text-sm leading-6 text-destructive">
                  {error}
                </div>
              ) : null}

              {!showReviewStage ? (
                <div className="space-y-5 mt-5">
                  <section className="rounded-[28px] border border-border/60 bg-card/70 p-4 shadow-sm">
                    <label
                      htmlFor="speech-language"
                      className="mb-3 block text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground"
                    >
                      Transcription language
                    </label>
                    <div className="rounded-2xl border border-border/60 bg-background px-4 py-1">
                      <select
                        id="speech-language"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        disabled={isListening || isTranscribing}
                        className="w-full bg-transparent py-3 text-sm font-medium text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {speechLanguageOptions.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            className="bg-background text-foreground"
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Auto detect works well for mixed conversations. Pick a language if you want
                      more stable transcription.
                    </p>
                  </section>

                  <section className="rounded-[32px] border border-primary/20 bg-[linear-gradient(180deg,hsl(var(--primary)/0.16),hsl(var(--background))_92%)] px-5 py-6 text-center shadow-[0_24px_60px_hsl(var(--primary)/0.14)]">
                    <div className="mx-auto mb-6 flex max-w-[220px] flex-col items-center">
                      <div className="relative mb-5">
                        <div
                          className={`absolute inset-0 rounded-full blur-2xl transition-opacity ${
                            isListening ? "bg-primary/35 opacity-100" : "bg-primary/15 opacity-80"
                          }`}
                        />
                        <div
                          className={`absolute inset-[-14px] rounded-full border transition-all ${
                            isListening
                              ? "border-primary/35 scale-100 animate-pulse"
                              : "border-border/60 scale-95"
                          }`}
                        />
                        <button
                          onClick={toggleListening}
                          disabled={!isSupported || isTranscribing}
                          className={`relative flex h-28 w-28 items-center justify-center rounded-full border text-primary-foreground transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                            isListening
                              ? "border-primary/30 bg-primary shadow-[0_18px_45px_hsl(var(--primary)/0.35)]"
                              : "border-border/50 bg-card text-foreground shadow-xl hover:scale-[1.02]"
                          }`}
                          aria-label={isListening ? "Stop listening" : "Start listening"}
                        >
                          <FiMic className={`text-[34px] ${isListening ? "text-white" : "text-primary"}`} />
                        </button>
                      </div>

                      <div className="mb-4 flex h-10 items-end justify-center gap-1.5">
                        {[0, 1, 2, 3, 4, 5].map((bar) => (
                          <span
                            key={bar}
                            className={`w-1.5 rounded-full bg-primary transition-all ${
                              isListening ? "animate-pulse" : "opacity-40"
                            }`}
                            style={{
                              height: `${18 + ((bar % 3) + 1) * 6}px`,
                              animationDelay: `${bar * 120}ms`,
                            }}
                          />
                        ))}
                      </div>

                      <h3 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
                        {isTranscribing
                          ? "Transcribing your message"
                          : isListening
                            ? "Recording in progress"
                            : "Tap to start voice capture"}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {isTranscribing
                          ? "Keep this sheet open while we finalize the transcript."
                          : isListening
                            ? "Speak naturally. Tap the mic again when you are done."
                            : "You will review the transcript before anything gets sent."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Flow
                        </div>
                        <div className="text-sm leading-6 text-foreground">
                          Record, transcribe, review, then insert into chat.
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Privacy
                        </div>
                        <div className="text-sm leading-6 text-foreground">
                          Nothing is submitted until you confirm the final transcript.
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-5">
                  <section className="rounded-[28px] border border-primary/20 bg-[linear-gradient(180deg,hsl(var(--primary)/0.12),hsl(var(--background))_88%)] p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <FiCheck className="text-lg" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-foreground">Transcript ready</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Edit anything that needs polish, then add it to the conversation.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs text-foreground">
                            Detected: {transcriptLanguageLabel}
                          </span>
                          <span className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs text-foreground">
                            {transcriptWordCount} words
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-border/60 bg-card/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                        Final transcript
                      </label>
                      <span className="text-xs text-muted-foreground">Editable</span>
                    </div>
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Your transcript will appear here..."
                      className="min-h-[220px] w-full resize-none rounded-[24px] border border-border/60 bg-background p-4 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </section>

                  <button
                    onClick={startListening}
                    className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-border/60 bg-card/70 px-4 py-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                  >
                    <FiRefreshCw className="text-base" />
                    Record again
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-border/60 bg-background/95 px-5 pb-6 pt-4 backdrop-blur-sm">
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-[20px] border border-border/60 bg-card/70 px-4 py-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDone}
                  disabled={!transcript.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[20px] bg-primary px-4 py-4 text-sm font-semibold text-primary-foreground shadow-[0_16px_30px_hsl(var(--primary)/0.28)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Use transcript
                  <FiArrowRight className="text-base" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SpeechToTextModal;
