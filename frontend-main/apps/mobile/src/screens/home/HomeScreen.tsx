import { useEffect, useRef, useState } from 'react';
import { InteractionManager, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { WeatherData } from '../../api/weather';
import type { JourneyItem } from '../../api/notifications';
import type { WebSocketStatus } from '../../api/websocket';
import { ScreenFrame } from '../../components/layout/ScreenFrame';
import { styles } from '../../theme/styles';
import type { WeatherMode } from '../../types/weather';
import { JourneysSection } from '../journeys/components/JourneysSection';
import {
  Inspirations,
  CalendarOverlay,
  ItineraryCard,
  PlacesNearby,
  Recommendations,
  UpcomingCard,
  WelcomeSummary,
} from './components';

type HomeScreenProps = {
  journeyDataError?: string | null;
  onOpenAssistant?: () => void;
  notificationUnreadCount?: number;
  onOpenHome: () => void;
  onOpenChat: () => void;
  onOpenJourneys?: () => void;
  onOpenFlightDetails: () => void;
  onOpenFlightTracker: () => void;
  onOpenInspirationsSeeAll?: () => void;
  journeys?: JourneyItem[];
  liveJourneyMonitorEnabled?: boolean;
  liveJourneyWebSocketStatus?: WebSocketStatus;
  onJourneyLocationModeChange?: (
    mode: 'current_location' | 'approaching' | 'nearby' | 'arrived',
  ) => void;
  onLiveJourneyMonitorToggle?: () => void;
  onOpenLiveMode: () => void;
  onOpenNotifications: () => void;
  onOpenProfile?: () => void;
  onOpenWallet?: () => void;
  onOpenTravelSupport?: () => void;
  onLogout?: () => void;
  profileImageUri?: string | null;
  userEmail?: string;
  userHandle?: string;
  userName?: string;
  onRefreshWeather: () => void;
  onWeatherModeChange: (weatherMode: WeatherMode) => void;
  weather: WeatherData | null;
  weatherFallbackEnabled: boolean;
  weatherMode: WeatherMode;
  // ✅ NEW: Controlled menu state (lifted from ScreenFrame)
  menuVisible?: boolean;
  onMenuVisibleChange?: (visible: boolean) => void;
  whisperActive?: boolean;
  onWhisperActiveChange?: (active: boolean) => void;
};

export function HomeScreen({
  journeyDataError = null,
  onOpenAssistant,
  notificationUnreadCount = 0,
  onOpenHome,
  onOpenChat,
  onOpenJourneys,
  onOpenFlightDetails,
  onOpenFlightTracker,
  onOpenInspirationsSeeAll,
  journeys = [],
  liveJourneyMonitorEnabled = false,
  liveJourneyWebSocketStatus = 'idle',
  onJourneyLocationModeChange,
  onLiveJourneyMonitorToggle,
  onOpenLiveMode,
  onOpenNotifications,
  onOpenProfile,
  onOpenWallet,
  onOpenTravelSupport,
  onLogout,
  profileImageUri,
  userEmail,
  userHandle,
  userName,
  onRefreshWeather,
  onWeatherModeChange,
  weather,
  weatherFallbackEnabled,
  weatherMode,
  menuVisible,
  onMenuVisibleChange,
  whisperActive,
  onWhisperActiveChange,
}: HomeScreenProps) {
  const hasRequestedWeather = useRef(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (hasRequestedWeather.current) {
      return;
    }

    hasRequestedWeather.current = true;

    const refreshTask = InteractionManager.runAfterInteractions(() => {
      void onRefreshWeather();
    });

    return () => {
      refreshTask.cancel();
    };
  }, [onRefreshWeather]);

  return (
    <ScreenFrame
      activePageIndex={0}
      footerSource="home"
      notificationUnreadCount={notificationUnreadCount}
      onOpenAssistant={onOpenAssistant}
      onOpenHome={onOpenHome}
      onOpenChat={onOpenChat}
      onOpenNotifications={onOpenNotifications}
      onOpenProfile={onOpenProfile}
      onOpenWallet={onOpenWallet}
      onOpenJourneys={onOpenJourneys}
      onOpenTravelSupport={onOpenTravelSupport}
      onLogout={onLogout}
      profileImageUri={profileImageUri}
      userEmail={userEmail}
      userHandle={userHandle}
      userName={userName}
      menuVisible={menuVisible}
      onMenuVisibleChange={onMenuVisibleChange}
      overlay={
        <CalendarOverlay
          visible={isCalendarOpen}
          onCancel={() => setIsCalendarOpen(false)}
          onDone={() => setIsCalendarOpen(false)}
        />
      }
    >
      <WelcomeSummary
        userName={userName}
        profileImageUri={profileImageUri}
        onWeatherModeChange={onWeatherModeChange}
        weather={weather}
        weatherFallbackEnabled={weatherFallbackEnabled}
        weatherMode={weatherMode}
        whisperActive={whisperActive}
        onWhisperActiveChange={onWhisperActiveChange}
      />
      {/* <View style={styles.planWithUnitySection}>
        <Text style={styles.planWithUnityHeading}>Smart Mobility, powered by AI</Text>
        <UnityPlanner onOpenChat={onOpenChat} />
      </View> */}
      <Pressable
        accessibilityLabel="Open chat to plan where to go today"
        accessibilityRole="button"
        onPress={onOpenChat}
        style={({ pressed }) => [styles.homeChatInputBar, pressed && styles.pressedFeedback]}
      >
        <PlusCircleIcon />
        <Text style={styles.homeChatInputText}>Where would you like to go today?</Text>
        <View style={styles.homeChatMicButton}>
          <MicIcon />
        </View>
      </Pressable>
      <ItineraryCard
        journeyDataError={journeyDataError}
        journeys={journeys}
        liveModeToggleOn={liveJourneyMonitorEnabled}
        liveModeWebSocketStatus={liveJourneyWebSocketStatus}
        onJourneyLocationModeChange={onJourneyLocationModeChange}
        onLiveModeToggle={onLiveJourneyMonitorToggle}
        onOpenFlightDetails={onOpenFlightDetails}
        onOpenFlightTracker={onOpenFlightTracker}
        onOpenLiveMode={onOpenLiveMode}
      />
      <UpcomingCard journeys={journeys} onOpenCalendar={() => setIsCalendarOpen(true)} />
      <PlacesNearby />
      <JourneysSection style={styles.homeJourneysSection} />
      <Inspirations onAskUnity={onOpenChat} onSeeAll={onOpenInspirationsSeeAll} />
      <Recommendations />
    </ScreenFrame>
  );
}

function PlusCircleIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 19 19" fill="none" style={styles.homeChatPlusIcon}>
      <Path
        d="M9.50001 6.33331V12.6666M6.33334 9.49998H12.6667M17.4167 9.49998C17.4167 13.8722 13.8723 17.4166 9.50001 17.4166C5.12776 17.4166 1.58334 13.8722 1.58334 9.49998C1.58334 5.12773 5.12776 1.58331 9.50001 1.58331C13.8723 1.58331 17.4167 5.12773 17.4167 9.49998Z"
        stroke="#1E1E1E"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MicIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M3.33334 6.66669V8.00002C3.33334 9.2377 3.825 10.4247 4.70017 11.2999C5.57534 12.175 6.76233 12.6667 8 12.6667C9.23768 12.6667 10.4247 12.175 11.2998 11.2999C12.175 10.4247 12.6667 9.2377 12.6667 8.00002V6.66669M8 12.6667V15.3334M5.33334 15.3334H10.6667M8 0.666687C7.46957 0.666687 6.96086 0.877401 6.58579 1.25247C6.21072 1.62755 6 2.13625 6 2.66669V8.00002C6 8.53045 6.21072 9.03916 6.58579 9.41423C6.96086 9.78931 7.46957 10 8 10C8.53044 10 9.03914 9.78931 9.41422 9.41423C9.78929 9.03916 10 8.53045 10 8.00002V2.66669C10 2.13625 9.78929 1.62755 9.41422 1.25247C9.03914 0.877401 8.53044 0.666687 8 0.666687Z"
        stroke="#1E1E1E"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}