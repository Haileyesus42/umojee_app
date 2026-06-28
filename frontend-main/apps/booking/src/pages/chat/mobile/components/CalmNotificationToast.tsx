import React from "react";
import { toast, Toast } from "react-hot-toast";
import { FiInfo, FiBell, FiAlertCircle, FiAlertTriangle, FiX } from "react-icons/fi";
import { NotificationPriority } from "../types/phase7";

interface CalmNotificationToastProps {
    t: Toast;
    priority: NotificationPriority;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

const CalmNotificationToast: React.FC<CalmNotificationToastProps> = ({
    t,
    priority,
    title,
    message,
    actionLabel,
    onAction,
}) => {
    const getColors = () => {
        switch (priority) {
            case "reminder":
                return {
                    bg: "bg-amber-50/95",
                    border: "border-amber-200/50",
                    icon: "text-amber-500",
                    title: "text-amber-900",
                    message: "text-amber-700",
                    action: "bg-amber-600 text-white hover:bg-amber-700",
                };
            case "action_required":
                return {
                    bg: "bg-primary/5",
                    border: "border-primary/20",
                    icon: "text-primary",
                    title: "text-foreground",
                    message: "text-muted-foreground",
                    action: "bg-primary text-primary-foreground hover:bg-primary/90",
                };
            case "warning":
                return {
                    bg: "bg-red-50/95",
                    border: "border-red-200/50",
                    icon: "text-red-500",
                    title: "text-red-900",
                    message: "text-red-700",
                    action: "bg-red-600 text-white hover:bg-red-700",
                };
            default: // info
                return {
                    bg: "bg-card/95",
                    border: "border-border",
                    icon: "text-blue-500",
                    title: "text-foreground",
                    message: "text-muted-foreground",
                    action: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                };
        }
    };

    const colors = getColors();

    const handleAction = () => {
        if (onAction) onAction();
        toast.dismiss(t.id);
    };

    return (
        <div
            className={`${t.visible ? "animate-enter" : "animate-leave"
                } pointer-events-auto flex w-full max-w-sm rounded-2xl border shadow-lg backdrop-blur-md transition-all duration-300 ${colors.bg} ${colors.border}`}
        >
            <div className="flex w-0 flex-1 items-start p-4">
                <div className="flex-shrink-0 pt-0.5">
                    {priority === "reminder" && <FiBell className={`h-5 w-5 ${colors.icon}`} />}
                    {priority === "action_required" && <FiAlertCircle className={`h-5 w-5 ${colors.icon}`} />}
                    {priority === "warning" && <FiAlertTriangle className={`h-5 w-5 ${colors.icon}`} />}
                    {priority === "info" && <FiInfo className={`h-5 w-5 ${colors.icon}`} />}
                </div>
                <div className="ml-3 flex-1">
                    <p className={`text-sm font-semibold ${colors.title}`}>
                        {title}
                    </p>
                    <p className={`mt-1 text-xs leading-relaxed ${colors.message}`}>
                        {message}
                    </p>
                    {actionLabel && (
                        <button
                            onClick={handleAction}
                            className={`mt-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${colors.action}`}
                        >
                            {actionLabel}
                        </button>
                    )}
                </div>
            </div>
            <div className="flex border-l border-border/50">
                <button
                    onClick={() => toast.dismiss(t.id)}
                    className="flex w-full items-center justify-center rounded-none rounded-r-2xl border border-transparent p-4 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label="Close notification"
                >
                    <FiX className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default CalmNotificationToast;
