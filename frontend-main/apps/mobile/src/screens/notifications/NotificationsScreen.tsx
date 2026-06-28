import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NotificationItem } from '../../api/notifications';
import { BellIcon, RightArrowIcon } from '../../assets/icons';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { styles } from '../../theme/styles';

type NotificationsScreenProps = {
  error: string | null;
  loading: boolean;
  notifications: NotificationItem[];
  onBack: () => void;
  onLogout?: () => void;
  onMarkRead: () => Promise<void>;
  onOpenChat: () => void;
  onOpenFlow?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenTrips?: () => void;
  onOpenWallet?: () => void;
  profileImageUri?: string | null;
  onRefresh: () => Promise<void>;
};

const PAGE_SIZE = 25;
const LOAD_MORE_THRESHOLD = 80;

function formatRelativeTime(value?: string): string {
  if (!value) {
    return 'now';
  }

  const date = new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    return 'now';
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;

  if (diffSeconds < minute) {
    return 'now';
  }

  if (diffSeconds < hour) {
    return `${Math.floor(diffSeconds / minute)}m ago`;
  }

  if (diffSeconds < day) {
    return `${Math.floor(diffSeconds / hour)}h ago`;
  }

  if (diffSeconds < week) {
    return `${Math.floor(diffSeconds / day)}d ago`;
  }

  return `${Math.floor(diffSeconds / week)}w ago`;
}

function getNotificationMessage(notification: NotificationItem): string {
  if (notification.title && notification.message) {
    return `${notification.title}. ${notification.message}`;
  }

  return notification.message || notification.title || 'Notification';
}

function getNotificationKey(notification: NotificationItem): string {
  return notification.journeyId
    ? `${notification.journeyId}:${String(notification.metadata?.notificationId || notification._id)}`
    : notification._id;
}

function mergeNotifications(incoming: NotificationItem[]): NotificationItem[] {
  const byKey = new Map<string, NotificationItem>();

  incoming.forEach((notification) => {
    byKey.set(getNotificationKey(notification), notification);
  });

  return Array.from(byKey.values());
}

function sortNotifications(notifications: NotificationItem[]): NotificationItem[] {
  return [...notifications].sort((a, b) => {
    if (a.seen !== b.seen) {
      return a.seen ? 1 : -1;
    }

    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

export function NotificationsScreen({
  error,
  loading,
  notifications: allJourneyNotifications,
  onBack,
  onLogout,
  onMarkRead,
  onOpenChat,
  onOpenFlow,
  onOpenNotifications,
  onOpenProfile,
  onOpenTrips,
  onOpenWallet,
  profileImageUri,
  onRefresh,
}: NotificationsScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const notifications = useMemo(
    () => sortNotifications(mergeNotifications(allJourneyNotifications)).slice(0, visibleCount),
    [allJourneyNotifications, visibleCount],
  );

  const loadMoreNotifications = useCallback(async () => {
    if (loading || refreshing || !hasMore) {
      return;
    }

    const nextVisibleCount = visibleCount + PAGE_SIZE;

    setVisibleCount(nextVisibleCount);
    setHasMore(nextVisibleCount < allJourneyNotifications.length);
  }, [allJourneyNotifications.length, hasMore, loading, refreshing, visibleCount]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setHasMore(allJourneyNotifications.length > PAGE_SIZE);
  }, [allJourneyNotifications.length]);

  useEffect(() => {
    if (allJourneyNotifications.some((notification) => !notification.seen)) {
      void onMarkRead();
    }
  }, [allJourneyNotifications, onMarkRead]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.notificationsScreen}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.notificationsBackButton, pressed && styles.pressedFeedback]}
      >
        <RightArrowIcon style={styles.notificationsBackIcon} />
      </Pressable>

      <View style={styles.notificationsTitlePill}>
        <BellIcon style={styles.notificationsTitleIcon} />
        <Text style={styles.notificationsTitle}>Notifications</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.notificationsList}
        onScroll={({ nativeEvent }) => {
          const distanceFromBottom =
            nativeEvent.contentSize.height -
            (nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y);

          if (distanceFromBottom < LOAD_MORE_THRESHOLD) {
            void loadMoreNotifications();
          }
        }}
        scrollEventThrottle={120}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />
        }
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {loading ? (
          <View style={styles.notificationItem}>
            <Text style={styles.notificationTime}>now</Text>
            <View style={styles.notificationBodyRow}>
              <Text style={styles.notificationMessage}>Loading notifications...</Text>
            </View>
          </View>
        ) : error ? (
          <View style={styles.notificationItem}>
            <Text style={styles.notificationTime}>now</Text>
            <View style={styles.notificationBodyRow}>
              <Text style={styles.notificationMessage}>{error}</Text>
            </View>
          </View>
        ) : allJourneyNotifications.length === 0 ? (
          <View style={styles.notificationItem}>
            <Text style={styles.notificationTime}>now</Text>
            <View style={styles.notificationBodyRow}>
              <Text style={styles.notificationMessage}>No notifications yet.</Text>
            </View>
          </View>
        ) : (
          notifications.map((notification) => (
            <View key={getNotificationKey(notification)} style={styles.notificationItem}>
              <Text style={styles.notificationTime}>
                {formatRelativeTime(notification.createdAt)}
              </Text>
              <View style={styles.notificationBodyRow}>
                {!notification.seen ? <View style={styles.notificationUnreadDot} /> : null}
                <Text
                  style={[
                    styles.notificationMessage,
                    !notification.seen && styles.notificationMessageUnread,
                  ]}
                >
                  {getNotificationMessage(notification)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <FooterWithMenu
        onLogout={onLogout}
        onOpenChat={onOpenChat}
        onOpenFlow={onOpenFlow}
        onOpenHome={onBack}
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={onOpenProfile}
        onOpenTrips={onOpenTrips}
        onOpenWallet={onOpenWallet}
        profileImageUri={profileImageUri}
        source="notifications"
      />
    </SafeAreaView>
  );
}
