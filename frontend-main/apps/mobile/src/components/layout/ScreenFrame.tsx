import { useEffect, useState } from 'react';
import { ReactNode, useCallback, useMemo } from 'react';
import { PanResponder, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '../../theme/styles';
import { Header } from './Header';
import { MenuOverlay } from './MenuOverlay';
import { Footer } from '../navigation/Footer';

type ScreenFrameProps = {
  activePageIndex?: number;
  children: ReactNode;
  fullBleedContent?: boolean;
  notificationUnreadCount?: number;
  overlay?: ReactNode;
  footerSource?: string;
  onOpenAssistant?: () => void;
  onOpenHome: () => void;
  onOpenChat: () => void;
  onOpenNotifications: () => void;
  onOpenProfile?: () => void;
  onOpenWallet?: () => void;
  onOpenJourneys?: () => void;
  onOpenTravelSupport?: () => void;
  onLogout?: () => void;
  profileImageUri?: string | null;
  userEmail?: string;
  userHandle?: string;
  userName?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  // ✅ NEW: Controlled menu state (lifted from parent)
  menuVisible?: boolean;
  onMenuVisibleChange?: (visible: boolean) => void;
};

export function ScreenFrame({
  activePageIndex = 0,
  children,
  fullBleedContent = false,
  notificationUnreadCount = 0,
  overlay,
  footerSource,
  onOpenAssistant,
  onOpenHome,
  onOpenChat,
  onOpenNotifications,
  onOpenProfile,
  onOpenWallet,
  onOpenJourneys,
  onOpenTravelSupport,
  onLogout,
  profileImageUri,
  userEmail,
  userHandle,
  userName,
  onSwipeLeft,
  onSwipeRight,
  menuVisible,
  onMenuVisibleChange,
}: ScreenFrameProps) {
  // ✅ Support both controlled (from parent) and local state
  const [localMenuOpen, setLocalMenuOpen] = useState(false);
  const isMenuOpen = menuVisible !== undefined ? menuVisible : localMenuOpen;
  const setIsMenuOpen = (visible: boolean) => {
    if (onMenuVisibleChange) {
      onMenuVisibleChange(visible);
    } else {
      setLocalMenuOpen(visible);
    }
  };

  const hasSwipeHandlers = Boolean(onSwipeLeft || onSwipeRight);
  const shouldHandleHorizontalSwipe = useCallback(
    (_: unknown, gestureState: { dx: number; dy: number }) => {
      if (!hasSwipeHandlers) {
        return false;
      }

      const horizontalDistance = Math.abs(gestureState.dx);
      const verticalDistance = Math.abs(gestureState.dy);

      return horizontalDistance > 40 && horizontalDistance > verticalDistance * 1.25;
    },
    [hasSwipeHandlers],
  );
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: shouldHandleHorizontalSwipe,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -60) {
            onSwipeRight?.();
            return;
          }

          if (gestureState.dx > 60) {
            onSwipeLeft?.();
          }
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [onSwipeLeft, onSwipeRight, shouldHandleHorizontalSwipe],
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen} {...panResponder.panHandlers}>
      <ScrollView
        contentContainerStyle={[
          styles.pageContent,
          fullBleedContent && styles.pageContentFullBleed,
        ]}
        style={[styles.pageScroll, fullBleedContent && styles.pageScrollFullBleed]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <SafeAreaView
          edges={['top']}
          style={[styles.headerSafeArea, styles.scrollingHeaderSafeArea]}
        >
          <Header
            notificationUnreadCount={notificationUnreadCount}
            onOpenHome={onOpenHome}
            onOpenNotifications={onOpenNotifications}
          />
        </SafeAreaView>
        {children}
      </ScrollView>
      <Footer
        onOpenChat={onOpenChat}
        onOpenFlow={onOpenTravelSupport}
        onOpenHome={onOpenHome}
        onOpenMenu={() => setIsMenuOpen(true)}
        onOpenTrips={onOpenJourneys}
        source={footerSource ?? `page-${activePageIndex}`}
      />
      <MenuOverlay
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpenHome={onOpenHome}
        onOpenChat={onOpenChat}
        onOpenProfile={onOpenProfile}
        onOpenWallet={onOpenWallet}
        onOpenJourneys={onOpenJourneys}
        onOpenTravelSupport={onOpenTravelSupport}
        onOpenNotifications={onOpenNotifications}
        onLogout={onLogout}
        profileImageUri={profileImageUri}
        userEmail={userEmail}
        userHandle={userHandle}
        userName={userName}
        notificationUnreadCount={notificationUnreadCount}
      />
      {overlay}
    </SafeAreaView>
  );
}