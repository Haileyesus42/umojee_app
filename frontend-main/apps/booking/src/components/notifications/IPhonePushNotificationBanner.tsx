import React from "react";
import { Bell, X } from "lucide-react";
import { cn } from "../../lib/utils";

export type PushBannerItem = {
  id: string;
  title?: string;
  message: string;
  type?: string;
  imageUrl?: string;
  actor?: {
    name?: string;
    photo?: string;
  } | null;
  createdAt?: string;
};

type Props = {
  banner: PushBannerItem;
  backendUrl: string;
  onClose: (id: string) => void;
  onClick?: (banner: PushBannerItem) => void;
};

function normalizeImageUrl(value?: string, backendUrl?: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/") && backendUrl) {
    return `${backendUrl.replace(/\/$/, "")}${value}`;
  }
  return value;
}

function getTimeLabel(value?: string) {
  if (!value) return "now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

const IPhonePushNotificationBanner: React.FC<Props> = ({
  banner,
  backendUrl,
  onClose,
  onClick,
}) => {
  const avatarUrl = normalizeImageUrl(
    banner.type === "journey_live" || banner.type === "journey_shared"
      ? banner.imageUrl
      : banner.actor?.photo || banner.imageUrl,
    backendUrl
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(banner)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.(banner);
        }
      }}
      className={cn(
        "pointer-events-auto w-full max-w-[min(92vw,420px)] overflow-hidden rounded-[26px]",
        "border border-white/55 bg-white/80 shadow-[0_22px_55px_rgba(15,23,42,0.28)] backdrop-blur-2xl",
        "transition duration-300 animate-in slide-in-from-top-4"
      )}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Bell className="h-5 w-5 text-slate-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span>Umoja Air</span>
            <span className="text-slate-300">•</span>
            <span className="truncate">{getTimeLabel(banner.createdAt)}</span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {banner.title || "Notification"}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-700">
            {banner.message}
          </p>
        </div>

        <button
          type="button"
          className="shrink-0 rounded-full p-1.5 text-slate-500 transition hover:bg-black/5 hover:text-slate-700"
          onClick={(event) => {
            event.stopPropagation();
            onClose(banner.id);
          }}
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default IPhonePushNotificationBanner;
