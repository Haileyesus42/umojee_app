import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { FiCopy, FiMaximize2, FiVolume2, FiVolumeX, FiChevronRight, FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { HiOutlinePaperAirplane, HiOutlineBuildingOffice2, HiOutlineTruck } from "react-icons/hi2";
import { ChatMessage } from "../hooks/useMobileChat";
import tts from "../../../../services/textToSpeech";
import ComparisonView from "./ComparisonView";
import RiskIndicator from "./RiskIndicator";
import TimelineReliability from "./TimelineReliability";
import ConfidenceBadge from "./ConfidenceBadge";
import Coachmark from "./Coachmark";
import JourneyTimeline from "./JourneyTimeline";
import MilestoneTracker from "./MilestoneTracker";
import TimelineDrawer from "./TimelineDrawer";
import RecommendationMessage from "./RecommendationMessage";
import type { ComparisonData, RiskAssessment, ConfidenceData, TimelineData, Milestone } from "../types/phase7";

const autoSpokenMessageIds = new Set<string>();

const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes || {}),
    img: [
      ...((defaultSchema.attributes?.img as any[]) || []),
      ["width"],
      ["height"],
    ],
    td: [...((defaultSchema.attributes?.td as any[]) || []), ["align"]],
    th: [...((defaultSchema.attributes?.th as any[]) || []), ["align"]],
  },
} as typeof defaultSchema;

type MessageBubbleProps = {
  message: ChatMessage;
  onExpand?: (message: ChatMessage) => void;
  onOpenPopup?: () => void;
  onRetry?: () => void;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onExpand, onOpenPopup, onRetry }) => {
  const [copied, setCopied] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [timelineDrawerOpen, setTimelineDrawerOpen] = React.useState(false);

  const handleCopy = async () => {
    const text = message.content || "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Failed to copy message", err);
    }
  };

  const stripMarkdownAndHtml = (value: string) => {
    if (!value) return "";
    // remove code blocks ```...``` and inline `code`
    let out = String(value).replace(/```[\s\S]*?```/g, " ");
    out = out.replace(/`[^`]*`/g, " ");
    // remove HTML tags
    out = out.replace(/<[^>]+>/g, " ");
    // remove markdown links/images [text](url)
    out = out.replace(/!\[(.*?)\]\((.*?)\)/g, "$1");
    out = out.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
    // collapse multiple whitespace
    out = out.replace(/\s+/g, " ").trim();
    return out;
  };

  const handleSpeak = async () => {
    const text = message.ttsText || message.content || "";
    const plain = stripMarkdownAndHtml(text);
    console.debug("message.speak: requested", { id: message.id, length: plain.length, preview: plain.slice(0, 120) });
    if (!plain) return;

    // If already speaking, stop
    if (tts.isSpeaking()) {
      console.debug("message.speak: stopping existing speech");
      tts.stop();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    try {
      await tts.speak(plain, {
        onEnd: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
      console.debug("message.speak: speak promise resolved");
    } catch (err) {
      console.error("TTS failed", err);
      setSpeaking(false);
    }
  };

  React.useEffect(() => {
    return () => {
      // cleanup: stop speaking if component unmounts
      try {
        tts.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  // Auto-speak only for assistant messages explicitly marked as voice-triggered.
  React.useEffect(() => {
    if (message.type !== "ai") return;
    if (!message.autoSpeak) return;
    const id = String(message.id || "");
    if (!id || autoSpokenMessageIds.has(id)) return;
    const plain = stripMarkdownAndHtml(message.ttsText || message.content || "");
    if (!plain) return;
    autoSpokenMessageIds.add(id);
    console.debug("message.autoSpeak: will speak", { id, preview: plain.slice(0, 120) });

    let cancelled = false;
    (async () => {
      try {
        // stop any existing speech first
        if (tts.isSpeaking()) tts.stop();
        if (cancelled) return;
        setSpeaking(true);
        await tts.speak(plain, {
          onEnd: () => setSpeaking(false),
          onError: () => setSpeaking(false),
        });
        console.debug("message.autoSpeak: finished", { id });
      } catch (err) {
        console.error("message.autoSpeak: failed", err);
        setSpeaking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [message.id, message.autoSpeak]);

  const speakerEnabled = message.type === "ai";

  return (
    <div
      className={`flex ${message.type === "human" ? "justify-end" : "justify-start"
        }`}
    >
      <div
        className={`group relative max-w-[90%] rounded-2xl border px-4 py-3 shadow transition-all ${message.type === "human"
            ? "bg-primary text-primary-foreground border-primary/70 shadow-lg shadow-primary/30"
            : "bg-card border-border text-foreground shadow-black/10"
          }`}
      >
        {message.type === "ai" && onExpand && (
          <button
            type="button"
            onClick={() => onExpand(message)}
            className="absolute -top-3 -right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/50 bg-background/90 text-primary shadow-lg shadow-primary/30 transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label="Expand assistant response"
          >
            <FiMaximize2 className="text-sm" />
          </button>
        )}

        {message.type === "recommendation" ? (
          <div className="space-y-3">
            {message.recommendations?.map((rec, idx) => (
              <RecommendationMessage key={idx} recommendation={rec} />
            ))}
          </div>
        ) : message.isError ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 text-destructive">
              <FiAlertCircle className="mt-0.5 shrink-0 h-4 w-4" />
              <p className="text-sm font-medium">{message.content}</p>
            </div>
            {message.retryMessage && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="self-end inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all active:scale-95"
              >
                <FiRefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            )}
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
            className="chat-markdown text-sm"
            components={{
              img: ({ node, ...props }) => {
                const widthValue =
                  typeof props.width === "number"
                    ? Number.isFinite(props.width)
                      ? props.width
                      : undefined
                    : typeof props.width === "string"
                      ? (() => {
                        const parsed = parseInt(props.width, 10);
                        return Number.isNaN(parsed) ? undefined : parsed;
                      })()
                      : undefined;
                const mergedStyle: React.CSSProperties = {
                  ...(props.style ? (props.style as React.CSSProperties) : {}),
                  height: "auto",
                };
                if (widthValue) {
                  mergedStyle.maxWidth = `${widthValue}px`;
                } else if (!mergedStyle.maxWidth) {
                  mergedStyle.maxWidth = "100%";
                }
                return <img {...props} loading="lazy" style={mergedStyle} />;
              },
            }}
          >
            {message.content || "_Empty response_"}
          </ReactMarkdown>
        )}

        {/* Phase 7: Render new message types */}
        {message.type === "ai" && message.apiResponseType === "comparison_list" && message.apiResponse && (
          <ComparisonView
            items={(message.apiResponse as ComparisonData).items || []}
            comparisonType={(message.apiResponse as ComparisonData).comparison_type || "destination"}
            onExpandToModal={onOpenPopup}
          />
        )}

        {/* Greeting recommended flights — inline slider with expand */}
        {message.type === "ai" && message.apiResponseType === "compare_flights" && message.apiResponse && (
          <ComparisonView
            items={(message.apiResponse as ComparisonData).items || []}
            comparisonType={(message.apiResponse as ComparisonData).comparison_type || "destination"}
            onExpandToModal={onOpenPopup}
          />
        )}

        {message.type === "ai" && message.apiResponseType === "risk_assessment" && message.apiResponse && (
          <RiskIndicator
            level={(message.apiResponse as RiskAssessment).level}
            message={(message.apiResponse as RiskAssessment).message}
            details={(message.apiResponse as RiskAssessment).details}
            className="mt-3"
          />
        )}

        {message.type === "ai" &&
          message.apiResponseType === "risk_assessment" &&
          message.apiResponse &&
          (message.apiResponse as RiskAssessment).reliability !== undefined &&
          (message.apiResponse as RiskAssessment).factors && (
            <TimelineReliability
              reliability={(message.apiResponse as RiskAssessment).reliability!}
              factors={(message.apiResponse as RiskAssessment).factors}
              className="mt-3"
            />
          )}

        {message.type === "ai" && message.apiResponseType === "confidence_list" && message.apiResponse && (
          <div className="mt-3 space-y-3">
            {(message.apiResponse as ConfidenceData).items?.map((item, index) => (
              <ConfidenceBadge
                key={index}
                score={item.score}
                label={item.label}
                variant="detailed"
              />
            ))}
          </div>
        )}

        {message.type === "ai" && message.apiResponseType === "journey_timeline" && message.apiResponse && (
          <div className="mt-3 space-y-3">
            <JourneyTimeline
              data={message.apiResponse as TimelineData}
              onSegmentClick={(segment) => {
                // Handle segment click - could open drawer or navigate
                console.log('Segment clicked:', segment);
              }}
              onExpandToDrawer={() => setTimelineDrawerOpen(true)}
            />
            {(message.apiResponse as TimelineData).milestones && (message.apiResponse as TimelineData).milestones!.length > 0 && (
              <MilestoneTracker
                milestones={(message.apiResponse as TimelineData).milestones!}
                onMilestoneClick={(milestone) => {
                  console.log('Milestone clicked:', milestone);
                }}
              />
            )}
          </div>
        )}

        {message.type === "ai" && message.triggerPopup && onOpenPopup && message.apiResponseType !== "compare_flights" && (
          <Coachmark
            id={`popup_button_${message.apiResponseType || "generic"}`}
            title="New Feature!"
            description={
              message.apiResponseType === "flights_list"
                ? "Tap here to view all available flights in a detailed modal with prices, times, and booking options."
                : message.apiResponseType === "hotels_list"
                  ? "Tap here to browse all hotel options with photos, amenities, and pricing details."
                  : message.apiResponseType === "cars_list"
                    ? "Tap here to explore car rental options with specifications and daily rates."
                    : "Tap here to view all available options in a detailed modal."
            }
            position="top"
            buttonText="Got it!"
            className="mt-3"
          >
            <button
              type="button"
              onClick={onOpenPopup}
              className="group/popup mt-3 w-full overflow-hidden rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon based on type */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-amber-600 shadow-sm">
                    {message.apiResponseType === "flights_list" && (
                      <HiOutlinePaperAirplane className="h-5 w-5 rotate-45" />
                    )}
                    {message.apiResponseType === "hotels_list" && (
                      <HiOutlineBuildingOffice2 className="h-5 w-5" />
                    )}
                    {message.apiResponseType === "cars_list" && (
                      <HiOutlineTruck className="h-5 w-5" />
                    )}
                  </div>

                  {/* Text content */}
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-bold text-black">
                      {message.apiResponseType === "flights_list" && "View Flights"}
                      {message.apiResponseType === "hotels_list" && "View Hotels"}
                      {message.apiResponseType === "cars_list" && "View Cars"}
                      {!["flights_list", "hotels_list", "cars_list"].includes(message.apiResponseType || "") && "View Options"}
                    </span>
                    <span className="text-xs text-black/70">
                      {Array.isArray(message.apiResponse) && message.apiResponse.length > 0
                        ? `${message.apiResponse.length} options available`
                        : "Tap to explore"}
                    </span>
                  </div>
                </div>

                {/* Right side: Count badge + Arrow */}
                <div className="flex items-center gap-2">
                  {Array.isArray(message.apiResponse) && message.apiResponse.length > 0 && (
                    <span className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-black/90 px-2 text-xs font-bold text-white">
                      {message.apiResponse.length}
                    </span>
                  )}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition-transform group-hover/popup:translate-x-0.5">
                    <FiChevronRight className="h-4 w-4 text-black" />
                  </div>
                </div>
              </div>

              {/* Tap indicator */}
              <div className="mt-2 flex items-center justify-center gap-1.5 border-t border-black/10 pt-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/40 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-black/60"></span>
                </span>
                <span className="text-[11px] font-medium text-black/70">Tap to view details</span>
              </div>
            </button>
          </Coachmark>
        )}
        {message.type === "ai" && message.agent && (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
            Handled by {message.agent}
          </p>
        )}
        {message.loginUrl && (
          <a
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/60 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            href={message.loginUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Continue to secure login
          </a>
        )}
        {message.content && message.type === "ai" && (
          <div className="absolute -bottom-3 right-3 opacity-0 transition group-hover:opacity-100">
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={handleSpeak}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-foreground shadow-md shadow-black/10 transition hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${speaking
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    : speakerEnabled
                      ? "text-primary hover:bg-primary/10"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                aria-label={speaking ? "Stop speaking" : "Speak message"}
              >
                {speaking ? <FiVolumeX className="text-xs" /> : speakerEnabled ? <FiVolume2 className="text-xs" /> : <FiVolumeX className="text-xs" />}
                <span className="sr-only">Speak message</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-foreground shadow-md shadow-black/10 transition hover:-translate-y-[1px] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label="Copy message"
              >
                <FiCopy className="text-xs" />
                <span className="sr-only">Copy message</span>
              </button>
            </div>
          </div>
        )}

        {message.content && message.type === "human" && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute -bottom-3 right-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-foreground shadow-md shadow-black/10 opacity-0 transition group-hover:opacity-100 hover:-translate-y-[1px] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Copy message"
          >
            <FiCopy className="text-xs" />
            <span className="sr-only">Copy message</span>
          </button>
        )}
        {message.content && copied && (
          <span className="absolute mt-6 right-0 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground shadow">
            Copied
          </span>
        )}
      </div>

      {/* Timeline Drawer */}
      {message.type === "ai" && message.apiResponseType === "journey_timeline" && message.apiResponse && (
        <TimelineDrawer
          timeline={message.apiResponse as TimelineData}
          isOpen={timelineDrawerOpen}
          onClose={() => setTimelineDrawerOpen(false)}
          onSegmentClick={(segment) => {
            console.log('Timeline drawer segment clicked:', segment);
          }}
        />
      )}
    </div>
  );
};

export default MessageBubble;
