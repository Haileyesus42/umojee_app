import React from "react";
import { FiX, FiInfo, FiBell, FiAlertCircle } from "react-icons/fi";
import { BannerConfig } from "../types/phase7";

interface NotificationBannerProps {
    banner: BannerConfig;
    onDismiss: (id: string) => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({
    banner,
    onDismiss,
}) => {
    const getStyles = () => {
        switch (banner.priority) {
            case "reminder":
                return {
                    bg: "bg-amber-500/10",
                    text: "text-amber-700",
                    iconColor: "text-amber-500",
                    border: "border-amber-500/20",
                    icon: <FiBell className="h-4 w-4" />,
                };
            case "action_required":
                return {
                    bg: "bg-primary/10",
                    text: "text-primary",
                    iconColor: "text-primary",
                    border: "border-primary/20",
                    icon: <FiAlertCircle className="h-4 w-4" />,
                };
            default:
                return {
                    bg: "bg-muted/50",
                    text: "text-muted-foreground",
                    iconColor: "text-muted-foreground",
                    border: "border-border/50",
                    icon: <FiInfo className="h-4 w-4" />,
                };
        }
    };

    const styles = getStyles();

    return (
        <div
            className={`relative flex items-center justify-between border-b px-4 py-2 transition-all duration-300 animate-in slide-in-from-top ${styles.bg} ${styles.border}`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`flex-shrink-0 ${styles.iconColor}`}>
                    {styles.icon}
                </div>
                <div className="overflow-hidden">
                    <p className={`truncate text-xs font-semibold ${styles.text}`}>
                        {banner.title}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground opacity-80">
                        {banner.message}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {banner.actionLabel && (
                    <button
                        onClick={(e) => { e.stopPropagation(); banner.onAction?.(); }}
                        className="whitespace-nowrap rounded-md bg-background/50 px-2 py-1 text-[10px] font-medium text-foreground ring-1 ring-inset ring-border/50 hover:bg-background"
                    >
                        {banner.actionLabel}
                    </button>
                )}
                {banner.dismissible !== false && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDismiss(banner.id); }}
                        className="rounded-full p-1 text-muted-foreground hover:bg-background/50 hover:text-foreground"
                        aria-label="Dismiss notification"
                    >
                        <FiX className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default NotificationBanner;
