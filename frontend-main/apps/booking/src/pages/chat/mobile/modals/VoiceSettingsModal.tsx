import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Mic2, Settings2, X } from "lucide-react";

export const TTS_VOICE_OPTIONS = [
  "autumn",
  "diana",
  "hannah",
  "austin",
  "daniel",
  "troy",
] as const;

export type TtsVoiceOption = (typeof TTS_VOICE_OPTIONS)[number];

type VoiceSettingsModalProps = {
  open: boolean;
  selectedVoice: TtsVoiceOption;
  onClose: () => void;
  onSelectVoice: (voice: TtsVoiceOption) => void;
};

const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  open,
  selectedVoice,
  onClose,
  onSelectVoice,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[700] bg-black/35 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed right-4 top-20 z-[701] w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-[28px] border border-border/60 bg-background text-foreground shadow-2xl"
          >
            <div className="relative overflow-hidden p-4">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.18),_transparent_38%),radial-gradient(circle_at_left,_hsl(var(--primary)/0.12),_transparent_34%)]" />

              <div className="relative">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      <Settings2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                        Voice settings
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-foreground">
                        Assistant voice
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Choose the voice used for text to speech playback.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/70 text-foreground transition-colors hover:bg-muted/60"
                    aria-label="Close voice settings"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {TTS_VOICE_OPTIONS.map((voice) => {
                    const isActive = voice === selectedVoice;

                    return (
                      <button
                        key={voice}
                        type="button"
                        onClick={() => onSelectVoice(voice)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                          isActive
                            ? "border-primary/25 bg-primary/10 shadow-[0_10px_30px_hsl(var(--primary)/0.12)]"
                            : "border-border/60 bg-card/70 hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                              isActive
                                ? "bg-primary/15 text-primary"
                                : "bg-muted/60 text-primary"
                            }`}
                          >
                            <Mic2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold capitalize text-foreground">
                              {voice}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {isActive ? "Current playback voice" : "Tap to switch"}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                            isActive
                              ? "border-primary/25 bg-primary/15 text-primary"
                              : "border-border/60 bg-card/70 text-transparent"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VoiceSettingsModal;
