import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getLocalStorageValue } from "../lib/utils";
import { NotificationItem } from "../types/types";
import IPhonePushNotificationBanner, {
  PushBannerItem,
} from "../components/notifications/IPhonePushNotificationBanner";

const backendUrl =
  (process.env.REACT_APP_BACKEND_URL as string) || "http://localhost:4001";
const apiUrl = `${backendUrl}/api/client/notification`;

type NotificationCenterValue = {
  notifications: NotificationItem[];
  loading: boolean;
  banners: PushBannerItem[];
  lastEvent: NotificationItem | null;
  fetchNotifications: () => Promise<void>;
  markAsSeen: (id: string) => Promise<void>;
  markAllAsSeen: () => Promise<void>;
  dismissBanner: (id: string) => void;
};

const NotificationCenterContext = createContext<NotificationCenterValue | null>(null);

function getAuthToken() {
  const token = getLocalStorageValue("token");
  if (!token) return null;
  return typeof token === "string" ? token : token?.access_token || token?.token || null;
}

function buildWebSocketUrl(token: string) {
  const url = new URL(backendUrl);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}/ws/notifications?token=${encodeURIComponent(token)}`;
}

function buildRouteForNotification(notification: NotificationItem) {
  if (notification.type === "journey_shared" || notification.type === "journey_live") {
    if (notification.journeyId) {
      return `/journey/${encodeURIComponent(notification.journeyId)}`;
    }
    return notification.route || "/journey";
  }

  if (notification.type === "friend_request_received") {
    return "/communities?tab=incoming";
  }

  if (notification.type === "friend_request_accepted") {
    return "/communities?tab=friends";
  }

  if (notification.type === "message_received") {
    const threadId = notification.metadata?.threadId;
    return threadId
      ? `/communities?tab=messages&threadId=${encodeURIComponent(threadId)}`
      : "/communities?tab=messages";
  }

  return notification.route || "/communities";
}

function toBannerItem(notification: NotificationItem): PushBannerItem {
  return {
    id: notification._id,
    title: notification.title || "Notification",
    message: notification.message,
    type: notification.type,
    imageUrl: notification.imageUrl,
    actor: notification.actor
      ? {
          name: notification.actor.name,
          photo: notification.actor.photo,
        }
      : null,
    createdAt: notification.createdAt,
  };
}

export const NotificationCenterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [banners, setBanners] = useState<PushBannerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastEvent, setLastEvent] = useState<NotificationItem | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);

  const dismissBanner = useCallback((id: string) => {
    setBanners((current) => current.filter((item) => item.id !== id));
  }, []);

  const queueBanner = useCallback((notification: NotificationItem) => {
    const banner = toBannerItem(notification);
    setBanners((current) => {
      const next = [banner, ...current.filter((item) => item.id !== banner.id)];
      return next.slice(0, 4);
    });
  }, [dismissBanner]);

  const fetchNotifications = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/getall`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status === "success") {
        setNotifications(Array.isArray(response.data.notifications) ? response.data.notifications : []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsSeen = useCallback(async (id: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await axios.patch(
        `${apiUrl}/updateseen/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((current) =>
        current.map((item) => (item._id === id ? { ...item, seen: true } : item))
      );
    } catch (error) {
      console.error(error);
    }
  }, []);

  const markAllAsSeen = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await axios.patch(
        `${apiUrl}/updateseen`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((current) => current.map((item) => ({ ...item, seen: true })));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      websocketRef.current?.close();
      websocketRef.current = null;
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      const socket = new WebSocket(buildWebSocketUrl(token));
      websocketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.event !== "client_notification" || !payload?.data?._id) {
            return;
          }

          const incoming = payload.data as NotificationItem;
          setLastEvent(incoming);
          setNotifications((current) => {
            const next = [incoming, ...current.filter((item) => item._id !== incoming._id)];
            return next;
          });
          queueBanner(incoming);
        } catch (error) {
          console.error(error);
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        reconnectRef.current = window.setTimeout(connect, 2500);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current);
      }
      websocketRef.current?.close();
      websocketRef.current = null;
    };
  }, [queueBanner]);

  const handleBannerClick = useCallback((banner: PushBannerItem) => {
    const match = notifications.find((item) => item._id === banner.id);
    dismissBanner(banner.id);
    if (match && !match.seen && match.type !== "journey_live") {
      void markAsSeen(match._id);
    }
    if (match) {
      navigate(buildRouteForNotification(match));
    }
  }, [dismissBanner, markAsSeen, navigate, notifications]);

  const value = useMemo<NotificationCenterValue>(
    () => ({
      notifications,
      loading,
      banners,
      lastEvent,
      fetchNotifications,
      markAsSeen,
      markAllAsSeen,
      dismissBanner,
    }),
    [notifications, loading, banners, lastEvent, fetchNotifications, markAsSeen, markAllAsSeen, dismissBanner]
  );

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[1200] flex flex-col items-center gap-3 px-3 sm:top-5">
        {banners.map((banner) => (
          <IPhonePushNotificationBanner
            key={banner.id}
            banner={banner}
            backendUrl={backendUrl}
            onClose={dismissBanner}
            onClick={handleBannerClick}
          />
        ))}
      </div>
    </NotificationCenterContext.Provider>
  );
};

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error("useNotificationCenter must be used within NotificationCenterProvider");
  }
  return context;
}
