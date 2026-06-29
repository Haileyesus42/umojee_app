import { useCallback, useEffect, useRef, useState } from 'react';

import type { JourneyItem, NotificationItem } from '../api/notifications';
import type { WebSocketStatus } from '../api/websocket';
import type { WeatherData } from '../api/weather';
import { getClientAssetUrl } from '../api/profile/profile';
import { loginWithBiometric, loginWithFaceIdentify } from '../api/auth/auth';
import { AssistantOverlay } from '../components/layout/AssistantOverlay';
import { BiometricGatekeeper } from '../components/auth/BiometricGatekeeper';

import type { AuthSession } from '../hooks/auth/useAuthSession';
import type { UseBiometricStateReturn } from '../hooks/useBiometricState';
import { useBiometricUsers, type BiometricUser } from '../hooks/useBiometricUsers';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { AIChatScreen } from '../screens/chat/AIChatScreen';
import { BoardingPassScreen } from '../screens/flights/BoardingPassScreen';
import { FlightDetailsScreen } from '../screens/flights/FlightDetailsScreen';
import { FlightTrackerScreen } from '../screens/flights/FlightTrackerScreen';
import { FlowScreen } from '../screens/flow/FlowScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { InspirationDetailScreen } from '../screens/home/InspirationDetailScreen';
import { InspirationGalleryScreen } from '../screens/home/InspirationGalleryScreen';
import { InspirationHotelScreen } from '../screens/home/InspirationHotelScreen';
import { InspirationTrendingScreen } from '../screens/home/InspirationTrendingScreen';
import { InspirationsSeeAllScreen } from '../screens/home/InspirationsSeeAllScreen';
import { LiveModeRoutesScreen } from '../screens/live-mode/LiveModeRoutesScreen';
import { LiveModeScreenV2 } from '../screens/live-mode/LiveModeScreenV2';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { CompanionsScreen } from '../screens/profile/CompanionsScreen';
import { DocumentsScreen } from '../screens/profile/DocumentsScreen';
import { ExpensesScreen } from '../screens/profile/ExpensesScreen';
import { FaceRecognitionScreen } from '../screens/profile/FaceRecognitionScreen';
import { BiometricLoginCameraModal } from '../components/auth/BiometricLoginCameraModal';
import { BiometricEnrollmentScreen } from '../screens/profile/BiometricEnrollmentScreen';
import { PaymentWalletScreen } from '../screens/profile/PaymentWalletScreen';
import { PreferencesScreen } from '../screens/profile/PreferencesScreen';
import { MenuOverlay } from '../components/layout/MenuOverlay';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SecurityScreen } from '../screens/profile/SecurityScreen';
import { WalletScreen } from '../screens/profile/WalletScreen';
import { WisperScreen } from '../screens/profile/WisperScreen';
import { JourneysScreen } from '../screens/journeys/JourneysScreen';
import { TravelSupportScreen } from '../screens/travel-support/TravelSupportScreen';
import { VoiceChatScreen } from '../screens/voice/VoiceChatScreen';
import { WelcomeScreen } from '../screens/welcome/WelcomeScreen';
import type { AIChatLaunchParams } from '../types/aiChat';
import type { WeatherMode } from '../types/weather';
import { Alert } from 'react-native';

export type RootRouteName =
  | 'welcome'
  | 'login'
  | 'register'
  | 'home'
  | 'liveMode'
  | 'liveModeRoutes'
  | 'chat'
  | 'boardingPass'
  | 'flightDetails'
  | 'flightTracker'
  | 'inspirationDetail'
  | 'inspirationGallery'
  | 'inspirationHotel'
  | 'inspirationTrending'
  | 'inspirationsSeeAll'
  | 'voice'
  | 'notifications'
  | 'profileFaceRecognition'
  | 'walletFaceRecognition'
  | 'profile'
  | 'profileCompanions'
  | 'profileDocuments'
  | 'profileExpenses'
  | 'profilePaymentWallet'
  | 'profileWallet'
  | 'profilePreferences'
  | 'profileSecurity'
  | 'profileWhisper'
  | 'biometricEnrollment'
  | 'journeys'
  | 'flow'
  | 'travelSupport';

type InspirationTrendingReturnScreen = Extract<
  RootRouteName,
  'inspirationDetail' | 'inspirationsSeeAll'
>;

type RootNavigatorProps = {
  authSession: AuthSession;
  biometricState: UseBiometricStateReturn;
  journeys: JourneyItem[];
  liveJourneyMonitorEnabled: boolean;
  liveJourneyWebSocketStatus: WebSocketStatus;
  notificationUnreadCount: number;
  notifications: NotificationItem[];
  notificationsError: string | null;
  notificationsLoading: boolean;
  onActiveScreenChange?: (activeScreen: RootRouteName) => void;
  onJourneyLocationModeChange?: (
    mode: 'current_location' | 'approaching' | 'nearby' | 'arrived',
  ) => void;
  onLiveJourneyMonitorToggle: () => void;
  onMarkNotificationsRead: () => Promise<void>;
  onRefreshNotifications: () => Promise<void>;
  onRefreshWeather: () => void;
  onWeatherModeChange: (weatherMode: WeatherMode) => void;
  weather: WeatherData | null;
  weatherFallbackEnabled: boolean;
  weatherMode: WeatherMode;
};

export function RootNavigator({
  authSession,
  biometricState,
  journeys,
  liveJourneyMonitorEnabled,
  liveJourneyWebSocketStatus,
  notificationUnreadCount,
  notifications,
  notificationsError,
  notificationsLoading,
  onActiveScreenChange,
  onJourneyLocationModeChange,
  onLiveJourneyMonitorToggle,
  onMarkNotificationsRead,
  onRefreshNotifications,
  onRefreshWeather,
  onWeatherModeChange,
  weather,
  weatherFallbackEnabled,
  weatherMode,
}: RootNavigatorProps) {
  const [activeScreen, setActiveScreen] = useState<RootRouteName>('welcome');
  const [aiChatLaunchParams, setAiChatLaunchParams] = useState<AIChatLaunchParams | undefined>();
  const [chatReturnScreen, setChatReturnScreen] = useState<RootRouteName>('home');
  const [activeInspirationId, setActiveInspirationId] = useState('zakynthos');
  const [inspirationTrendingReturnScreen, setInspirationTrendingReturnScreen] =
    useState<InspirationTrendingReturnScreen>('inspirationDetail');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [enrollmentMode, setEnrollmentMode] = useState<'face' | 'palm'>('face');

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isBiometricLoggingIn, setIsBiometricLoggingIn] = useState(false);

  // ✅ NEW: Menu visibility state (lifted from ScreenFrame)
  const [menuVisible, setMenuVisible] = useState(false);

  // ✅ FIX #2: Track where Profile was opened from
  const [profileReturnScreen, setProfileReturnScreen] = useState<RootRouteName>('home');

  // Biometric login state
  const { saveUser, removeUser, users } = useBiometricUsers();
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraMode, setCameraMode] = useState<'face' | 'palm'>('face');
  const [cameraTargetUser, setCameraTargetUser] = useState<BiometricUser | null>(null);
  const [biometricLoginUserId, setBiometricLoginUserId] = useState<string | null>(null);
  const [cameraCapturing, setCameraCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!biometricState.isBiometricEnabled) {
      if (activeScreen === 'profileFaceRecognition') {
        console.log('[RootNavigator] Redirecting: profileFaceRecognition → profile');
        setActiveScreen('profile');
      } else if (activeScreen === 'walletFaceRecognition') {
        console.log('[RootNavigator] Redirecting: walletFaceRecognition → profileWallet');
        setActiveScreen('profileWallet');
      }
    }
  }, [activeScreen, biometricState.isBiometricEnabled]);

  const navigate = useCallback((nextScreen: RootRouteName) => {
    setIsAssistantOpen(false);
    setActiveScreen(nextScreen);
  }, []);

  // ✅ FIX #2: Navigate to Profile while remembering the source screen
  const navigateToProfile = useCallback(
    (fromScreen: RootRouteName) => {
      setProfileReturnScreen(fromScreen);
      navigate('profileFaceRecognition');
    },
    [navigate],
  );

  const openChat = useCallback(
    (params?: AIChatLaunchParams) => {
      if (activeScreen !== 'chat' && activeScreen !== 'voice') {
        setChatReturnScreen(activeScreen);
      }
      setAiChatLaunchParams(params);
      navigate('chat');
    },
    [activeScreen, navigate],
  );

  const openAssistant = useCallback(() => {
    setIsAssistantOpen(true);
  }, []);

  const openBiometricEnrollment = useCallback(
    (mode: 'face' | 'palm') => {
      setEnrollmentMode(mode);
      navigate('biometricEnrollment');
    },
    [navigate],
  );

  const profileImageUri = getClientAssetUrl(authSession.user?.photo);
  const userFirstName =
    typeof authSession.user?.firstName === 'string' && authSession.user.firstName.trim()
      ? authSession.user.firstName.trim()
      : '';
  const userName =
    `${authSession.user?.firstName || ''} ${authSession.user?.lastName || ''}`.trim() ||
    'John Doe';
  const userEmail = typeof authSession.user?.email === 'string' && authSession.user.email.trim()
    ? authSession.user.email.trim()
    : 'johndoe@email.com';
  const userDob = typeof authSession.user?.dob === 'string' ? authSession.user.dob : '';
  const userDobYear = userDob ? new Date(userDob).getFullYear() : null;
  const userHandle =
    userFirstName && userDobYear && !Number.isNaN(userDobYear)
      ? `@${userFirstName}${userDobYear}`
      : '@johndoe123';

  const activeJourney =
    journeys.find((journey) => journey.mobile_payload_v1?.is_active) ||
    journeys.find((journey) => journey.is_active) ||
    journeys.find((journey) => journey.status === 'in_progress') ||
    journeys[0];

  const activeMobilePayload =
    activeJourney?.mobile_payload_v1 ||
    journeys.find((journey) => journey.mobile_payload_v1?.is_active)?.mobile_payload_v1 ||
    journeys.find((journey) => journey.is_active)?.mobile_payload_v1 ||
    journeys.find((journey) => journey.status === 'in_progress')?.mobile_payload_v1 ||
    journeys[0]?.mobile_payload_v1;

  const handleLogout = useCallback(async () => {
    console.log('[RootNavigator] Starting logout...');

    // IMMEDIATELY navigate to login BEFORE anything else
    setActiveScreen('login');
    setIsLoggingOut(true);

    // Use setTimeout to ensure state updates are processed
    await new Promise(resolve => setTimeout(resolve, 0));

    // Clear remembered users
    const currentUserId = authSession.user?._id || authSession.user?.id;
    if (currentUserId) {
      await removeUser(String(currentUserId));
    }

    // Clear biometric state
    await biometricState.clearVerification();
    biometricState.resetBiometricState();

    // Logout auth session (this will change isAuthenticated to false)
    await authSession.logout();

    // Keep logout flag active for longer to prevent any race conditions
    setTimeout(() => {
      setIsLoggingOut(false);
      console.log('[RootNavigator] Logout flag cleared');
    }, 2000);

    console.log('[RootNavigator] Logout complete');
  }, [authSession, biometricState]);


  // Save user to remembered users after successful login
  const handleLoginSuccess = useCallback(
    async (user: any, token: string) => {
      try {
        const hasFace = (user?.biometricData?.faces?.length || 0) > 0;
        const hasPalm = (user?.biometricData?.palms?.length || 0) > 0;

        if (hasFace || hasPalm) {
          await saveUser({
            user_id: String(user._id || user.id),
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            avatar: user.photo || null,
            hasFace,
            hasPalm,
            lastLogin: new Date().toISOString(),
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[RootNavigator] Failed to save remembered user:', error);
        }
      }
    },
    [saveUser, biometricState.faceEnrolled],
  );

  const wrappedLogin = useCallback(
    async (credentials: any) => {
      const response = await authSession.login(credentials);

      if (response?.token && response?.data?.user) {
        await handleLoginSuccess(response.data.user, response.token);
      }

      return response;
    },
    [authSession.login, handleLoginSuccess],
  );

  const wrappedGoogleLogin = useCallback(
    async (credentials: any) => {
      const response = await authSession.loginWithGoogle(credentials);

      if (response?.token && response?.data?.user) {
        await handleLoginSuccess(response.data.user, response.token);
      }

      return response;
    },
    [authSession.loginWithGoogle, handleLoginSuccess],
  );

  const handleInitiateBiometricLogin = useCallback(
    async (user: BiometricUser, type: 'face' | 'palm') => {
      setCameraMode(type);
      setCameraTargetUser(user);
      setShowCameraModal(true);
    },
    [],
  );

  const handleCaptureAndLogin = useCallback(async () => {
    if (!cameraRef.current || !cameraTargetUser) return;

    setCameraCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: true,
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture image');
      }

      // Use face identify (1-to-many) — pass URI directly
      const response = await loginWithFaceIdentify(photo.uri);

      if (response.token) {
        await authSession.updateToken(response.token);
      }
      if (response.data?.user) {
        await authSession.updateUser(response.data.user);
      }

      await saveUser({
        ...cameraTargetUser,
        lastLogin: new Date().toISOString(),
      });

      setShowCameraModal(false);
      setCameraTargetUser(null);
      navigate('home');
    } catch (error) {
      Alert.alert(
        'Verification Failed',
        error instanceof Error ? error.message : 'Please try again',
      );
    } finally {
      setCameraCapturing(false);
    }
  }, [cameraTargetUser, cameraMode, authSession, saveUser, navigate]);

  useEffect(() => {
    onActiveScreenChange?.(activeScreen);
  }, [activeScreen, onActiveScreenChange]);

  // ✅ FIX #1: Updated useEffect to respect logout flag
  useEffect(() => {
    // Skip redirects during logout
    if (isLoggingOut) {
      console.log('[RootNavigator] Skipping redirect during logout');
      return;
    }

    if (authSession.loading) {
      return;
    }

    const isPublicScreen =
      activeScreen === 'welcome' || activeScreen === 'login' || activeScreen === 'register';

    if (authSession.isAuthenticated && isPublicScreen) {
      navigate('home');
      return;
    }

    if (!authSession.isAuthenticated && !isPublicScreen) {
      navigate('login');
    }
  }, [activeScreen, authSession.isAuthenticated, authSession.loading, navigate, isLoggingOut, isBiometricLoggingIn]);

  const assistantOverlay = (
    <AssistantOverlay
      visible={isAssistantOpen}
      onClose={() => setIsAssistantOpen(false)}
      onOpenChat={openChat}
      onOpenVoice={() => navigate('voice')}
    />
  );

  const globalMenuOverlay = (
    <MenuOverlay
      visible={menuVisible}
      onClose={() => setMenuVisible(false)}
      onOpenHome={() => { setMenuVisible(false); navigate('home'); }}
      onOpenChat={() => { setMenuVisible(false); openChat(); }}
      onOpenProfile={() => { setMenuVisible(false); navigateToProfile(activeScreen); }}
      onOpenWallet={() => { setMenuVisible(false); navigate('walletFaceRecognition'); }}
      onOpenJourneys={() => { setMenuVisible(false); navigate('journeys'); }}
      onOpenTravelSupport={() => { setMenuVisible(false); navigate('flow'); }}
      onOpenNotifications={() => { setMenuVisible(false); navigate('notifications'); }}
      onLogout={handleLogout}
      profileImageUri={profileImageUri}
      userEmail={userEmail}
      userHandle={userHandle}
      userName={userName}
      notificationUnreadCount={notificationUnreadCount}
    />
  );

  if (activeScreen === 'chat') {
    return (
      <AIChatScreen
        launchParams={aiChatLaunchParams}
        onJourneyUpdated={onRefreshNotifications}
        onBack={() => navigate(chatReturnScreen)}
        onOpenVoice={() => navigate('voice')}
        profileImageUri={profileImageUri}
        token={authSession.token}
        user={authSession.user}
      />
    );
  }

  if (activeScreen === 'voice') {
    return <VoiceChatScreen onBack={() => navigate('chat')} />;
  }

  if (activeScreen === 'flightDetails') {
    return (
      <>
        <FlightDetailsScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('home')}
          onOpenBoardingPass={() => navigate('boardingPass')}
          onOpenChat={() => openChat()}
          onOpenFlow={() => navigate('flow')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenProfile={() => navigateToProfile('flightDetails')}
          onOpenTrips={() => navigate('journeys')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
          profileImageUri={profileImageUri}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'boardingPass') {
    return (
      <>
        <BoardingPassScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('flightDetails')}
          onOpenChat={() => openChat()}
          onOpenFlow={() => navigate('flow')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenProfile={() => navigateToProfile('boardingPass')}
          onOpenTrips={() => navigate('journeys')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
          profileImageUri={profileImageUri}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'flightTracker') {
    return (
      <>
        <FlightTrackerScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('home')}
          onOpenChat={() => openChat()}
          onOpenFlow={() => navigate('flow')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenProfile={() => navigateToProfile('flightTracker')}
          onOpenTrips={() => navigate('journeys')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
          profileImageUri={profileImageUri}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'liveMode') {
    return (
      <>
        <LiveModeScreenV2
          onBack={() => navigate('home')}
          onOpenRoutes={() => navigate('liveModeRoutes')}
          onOpenAssistant={openAssistant}
          onOpenHome={() => navigate('home')}
          onOpenChat={() => openChat()}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          notificationUnreadCount={notificationUnreadCount}
          onLogout={handleLogout}
          profileImageUri={profileImageUri}
          mobilePayload={activeMobilePayload}
          journey={activeJourney}
          liveJourneyMonitorEnabled={liveJourneyMonitorEnabled}
          liveJourneyWebSocketStatus={liveJourneyWebSocketStatus}
          onLiveJourneyMonitorToggle={onLiveJourneyMonitorToggle}
          onOpenTravelSupport={() => navigate('flow')}
          onOpenProfile={() => navigateToProfile('liveMode')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'liveModeRoutes') {
    return (
      <>
        <LiveModeRoutesScreen
          onBack={() => navigate('liveMode')}
          onOpenAssistant={openAssistant}
          onOpenHome={() => navigate('home')}
          onOpenChat={() => openChat()}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          notificationUnreadCount={notificationUnreadCount}
          onLogout={handleLogout}
          profileImageUri={profileImageUri}
          mobilePayload={activeMobilePayload}
          onOpenTravelSupport={() => navigate('flow')}
          onOpenProfile={() => navigateToProfile('liveModeRoutes')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'notifications') {
    return (
      <>
        <NotificationsScreen
          error={notificationsError}
          loading={notificationsLoading}
          notifications={notifications}
          onBack={() => navigate('home')}
          onLogout={handleLogout}
          onMarkRead={onMarkNotificationsRead}
          onOpenChat={() => openChat()}
          onOpenFlow={() => navigate('flow')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenProfile={() => navigateToProfile('notifications')}
          onOpenTrips={() => navigate('journeys')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
          profileImageUri={profileImageUri}
          onRefresh={onRefreshNotifications}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'inspirationsSeeAll') {
    return (
      <>
        <InspirationsSeeAllScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('home')}
          onOpenChat={() => openChat()}
          onOpenExplore={(destinationId) => {
            setActiveInspirationId(destinationId);
            navigate('inspirationDetail');
          }}
          onOpenFlow={() => navigate('flow')}
          onOpenTrending={(destinationId) => {
            setActiveInspirationId(destinationId);
            setInspirationTrendingReturnScreen('inspirationsSeeAll');
            navigate('inspirationTrending');
          }}
          onOpenNotifications={() => navigate('notifications')}
          onOpenProfile={() => navigateToProfile('inspirationsSeeAll')}
          onOpenTrips={() => navigate('journeys')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
          profileImageUri={profileImageUri}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'inspirationDetail') {
    return (
      <>
        <InspirationDetailScreen
          destinationId={activeInspirationId}
          onBack={() => navigate('inspirationsSeeAll')}
          onOpenDetails={() => navigate('inspirationHotel')}
          onOpenGallery={() => navigate('inspirationGallery')}
          onOpenTrending={() => {
            setInspirationTrendingReturnScreen('inspirationDetail');
            navigate('inspirationTrending');
          }}
          onSelectDestination={setActiveInspirationId}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'inspirationGallery') {
    return (
      <>
        <InspirationGalleryScreen
          destinationId={activeInspirationId}
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('inspirationDetail')}
          onOpenChat={() => openChat()}
          onOpenFlow={() => navigate('flow')}
          onOpenHome={() => navigate('home')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenProfile={() => navigateToProfile('inspirationGallery')}
          onOpenTrips={() => navigate('journeys')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
          profileImageUri={profileImageUri}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'inspirationHotel') {
    return (
      <>
        <InspirationHotelScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('inspirationDetail')}
          onOpenChat={() => openChat()}
          onOpenFlow={() => navigate('flow')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenProfile={() => navigateToProfile('inspirationHotel')}
          onOpenTrips={() => navigate('journeys')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
          profileImageUri={profileImageUri}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'inspirationTrending') {
    return (
      <>
        <InspirationTrendingScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate(inspirationTrendingReturnScreen)}
          onOpenChat={() => openChat()}
          onOpenFlow={() => navigate('flow')}
          onOpenHome={() => navigate('home')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenProfile={() => navigateToProfile('inspirationTrending')}
          onOpenTrips={() => navigate('journeys')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
          profileImageUri={profileImageUri}
        />
        {assistantOverlay}
      </>
    );
  }

  // ✅ FIX #2: Profile screen with correct back navigation - reopens menu
  if (activeScreen === 'profile') {
    return (
      <>
        <ProfileScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => setMenuVisible(true)}
          onLogout={handleLogout}
          onOpenChat={() => openChat()}
          onOpenCompanions={() => navigate('profileCompanions')}
          onOpenDocuments={() => navigate('profileDocuments')}
          onOpenExpenses={() => navigate('profileExpenses')}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenPaymentWallet={() => navigate('profileWallet')}
          onOpenPreferences={() => navigate('profilePreferences')}
          onOpenSecurity={() => navigate('profileSecurity')}
          onOpenTravelSupport={() => navigate('flow')}
          onOpenWhisper={() => navigate('profileWhisper')}
          profileImageUri={profileImageUri}
          token={authSession.token}
          user={authSession.user}
          onUserUpdate={authSession.updateUser}
        />
        {globalMenuOverlay}
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'profileFaceRecognition') {
    const rawUserId = authSession.user?._id ?? authSession.user?.id;
    const userId = typeof rawUserId === 'string' ? rawUserId : '';

    if (!biometricState.isBiometricEnabled) {
      console.log('[RootNavigator] Biometrics disabled → showing profile directly');
      return (
        <>
          <ProfileScreen
            notificationUnreadCount={notificationUnreadCount}
            onBack={() => setMenuVisible(true)}
            onLogout={handleLogout}
            onOpenChat={() => openChat()}
            onOpenCompanions={() => navigate('profileCompanions')}
            onOpenDocuments={() => navigate('profileDocuments')}
            onOpenExpenses={() => navigate('profileExpenses')}
            onOpenHome={() => navigate('home')}
            onOpenJourneys={() => navigate('journeys')}
            onOpenNotifications={() => navigate('notifications')}
            onOpenPaymentWallet={() => navigate('profileWallet')}
            onOpenPreferences={() => navigate('profilePreferences')}
            onOpenSecurity={() => navigate('profileSecurity')}
            onOpenTravelSupport={() => navigate('flow')}
            onOpenWhisper={() => navigate('profileWhisper')}
            profileImageUri={profileImageUri}
            token={authSession.token}
            user={authSession.user}
            onUserUpdate={authSession.updateUser}
          />
          {globalMenuOverlay}
          {assistantOverlay}
        </>
      );
    }

    return (
      <BiometricGatekeeper
        isBiometricEnabled={biometricState.isBiometricEnabled}
        userId={userId}
        token={authSession.token ?? undefined}
        biometricState={biometricState}
        notificationUnreadCount={notificationUnreadCount}
        onOpenChat={() => openChat()}
        onOpenHome={() => navigate('home')}
        onOpenJourneys={() => navigate('journeys')}
        onOpenNotifications={() => navigate('notifications')}
        onOpenTravelSupport={() => navigate('flow')}
        onVerified={() => navigate('profile')}
      >
        <ProfileScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => setMenuVisible(true)}
          onLogout={handleLogout}
          onOpenChat={() => openChat()}
          onOpenCompanions={() => navigate('profileCompanions')}
          onOpenDocuments={() => navigate('profileDocuments')}
          onOpenExpenses={() => navigate('profileExpenses')}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenPaymentWallet={() => navigate('profileWallet')}
          onOpenPreferences={() => navigate('profilePreferences')}
          onOpenSecurity={() => navigate('profileSecurity')}
          onOpenTravelSupport={() => navigate('flow')}
          onOpenWhisper={() => navigate('profileWhisper')}
          profileImageUri={profileImageUri}
          token={authSession.token}
          user={authSession.user}
          onUserUpdate={authSession.updateUser}
        />
        {globalMenuOverlay}
        {assistantOverlay}
      </BiometricGatekeeper>
    );
  }

  if (activeScreen === 'walletFaceRecognition') {
    const rawUserId = authSession.user?._id ?? authSession.user?.id;
    const userId = typeof rawUserId === 'string' ? rawUserId : '';

    if (!biometricState.isBiometricEnabled) {
      console.log('[RootNavigator] Biometrics disabled → showing wallet directly');
      return (
        <>
          <WalletScreen
            notificationUnreadCount={notificationUnreadCount}
            onLogout={handleLogout}
            onOpenChat={() => openChat()}
            onOpenCompanions={() => navigate('profileCompanions')}
            onOpenDocuments={() => navigate('profileDocuments')}
            onOpenExpenses={() => navigate('profileExpenses')}
            onOpenHome={() => navigate('home')}
            onOpenJourneys={() => navigate('journeys')}
            onOpenNotifications={() => navigate('notifications')}
            onOpenPreferences={() => navigate('profilePreferences')}
            onOpenProfile={() => navigate('profile')}
            onOpenSecurity={() => navigate('profileSecurity')}
            onOpenTravelSupport={() => navigate('flow')}
            onOpenWallet={() => navigate('profileWallet')}
            onOpenWhisper={() => navigate('profileWhisper')}
            profileImageUri={profileImageUri}
          />
          {assistantOverlay}
        </>
      );
    }

    return (
      <BiometricGatekeeper
        isBiometricEnabled={biometricState.isBiometricEnabled}
        userId={userId}
        token={authSession.token ?? undefined}
        biometricState={biometricState}
        notificationUnreadCount={notificationUnreadCount}
        onOpenChat={() => openChat()}
        onOpenHome={() => navigate('home')}
        onOpenJourneys={() => navigate('journeys')}
        onOpenNotifications={() => navigate('notifications')}
        onOpenTravelSupport={() => navigate('flow')}
        onVerified={() => navigate('profileWallet')}
      >
        <WalletScreen
          notificationUnreadCount={notificationUnreadCount}
          onLogout={handleLogout}
          onOpenChat={() => openChat()}
          onOpenCompanions={() => navigate('profileCompanions')}
          onOpenDocuments={() => navigate('profileDocuments')}
          onOpenExpenses={() => navigate('profileExpenses')}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenPreferences={() => navigate('profilePreferences')}
          onOpenProfile={() => navigate('profile')}
          onOpenSecurity={() => navigate('profileSecurity')}
          onOpenTravelSupport={() => navigate('flow')}
          onOpenWallet={() => navigate('profileWallet')}
          onOpenWhisper={() => navigate('profileWhisper')}
          profileImageUri={profileImageUri}
        />
        {assistantOverlay}
      </BiometricGatekeeper>
    );
  }

  if (activeScreen === 'profileDocuments') {
    return (
      <>
        <DocumentsScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('profile')}
          onLogout={handleLogout}
          onOpenChat={() => openChat()}
          onOpenCompanions={() => navigate('profileCompanions')}
          onOpenExpenses={() => navigate('profileExpenses')}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenPaymentWallet={() => navigate('profileWallet')}
          onOpenPreferences={() => navigate('profilePreferences')}
          onOpenProfile={() => navigate('profile')}
          onOpenSecurity={() => navigate('profileSecurity')}
          onOpenTravelSupport={() => navigate('flow')}
          onOpenWhisper={() => navigate('profileWhisper')}
          profileImageUri={profileImageUri}
          token={authSession.token}
          user={authSession.user}
          onUserUpdate={authSession.updateUser}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'profileCompanions') {
    return (
      <>
        <CompanionsScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('profile')}
          onLogout={handleLogout}
          onOpenChat={() => openChat()}
          onOpenDocuments={() => navigate('profileDocuments')}
          onOpenExpenses={() => navigate('profileExpenses')}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenPaymentWallet={() => navigate('profileWallet')}
          onOpenPreferences={() => navigate('profilePreferences')}
          onOpenProfile={() => navigate('profile')}
          onOpenSecurity={() => navigate('profileSecurity')}
          onOpenTravelSupport={() => navigate('flow')}
          onOpenWhisper={() => navigate('profileWhisper')}
          profileImageUri={profileImageUri}
          token={authSession.token}
          user={authSession.user}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'profileExpenses') {
    return (
      <>
        <ExpensesScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('profile')}
          onLogout={handleLogout}
          onOpenChat={() => openChat()}
          onOpenCompanions={() => navigate('profileCompanions')}
          onOpenDocuments={() => navigate('profileDocuments')}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenPaymentWallet={() => navigate('profileWallet')}
          onOpenPreferences={() => navigate('profilePreferences')}
          onOpenProfile={() => navigate('profile')}
          onOpenSecurity={() => navigate('profileSecurity')}
          onOpenTravelSupport={() => navigate('flow')}
          onUserUpdate={authSession.updateUser}
          onOpenWhisper={() => navigate('profileWhisper')}
          profileImageUri={profileImageUri}
          token={authSession.token}
          user={authSession.user}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'profilePaymentWallet') {
    return (
      <>
        <PaymentWalletScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('profile')}
          onLogout={handleLogout}
          onOpenChat={() => openChat()}
          onOpenCompanions={() => navigate('profileCompanions')}
          onOpenDocuments={() => navigate('profileDocuments')}
          onOpenExpenses={() => navigate('profileExpenses')}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenPreferences={() => navigate('profilePreferences')}
          onOpenProfile={() => navigate('profile')}
          onOpenSecurity={() => navigate('profileSecurity')}
          onOpenTravelSupport={() => navigate('flow')}
          onOpenWallet={() => navigate('profilePaymentWallet')}
          onOpenWhisper={() => navigate('profileWhisper')}
          profileImageUri={profileImageUri}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'profileWallet') {
    return (
      <>
        <WalletScreen
          notificationUnreadCount={notificationUnreadCount}
          onLogout={handleLogout}
          onOpenChat={() => openChat()}
          onOpenCompanions={() => navigate('profileCompanions')}
          onOpenDocuments={() => navigate('profileDocuments')}
          onOpenExpenses={() => navigate('profileExpenses')}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenPreferences={() => navigate('profilePreferences')}
          onOpenProfile={() => navigate('profile')}
          onOpenSecurity={() => navigate('profileSecurity')}
          onOpenTravelSupport={() => navigate('flow')}
          onOpenWallet={() => navigate('profileWallet')}
          onOpenWhisper={() => navigate('profileWhisper')}
          profileImageUri={profileImageUri}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'profilePreferences') {
    return (
      <>
        <PreferencesScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('profile')}
          onLogout={handleLogout}
          onOpenChat={() => openChat()}
          onOpenCompanions={() => navigate('profileCompanions')}
          onOpenDocuments={() => navigate('profileDocuments')}
          onOpenExpenses={() => navigate('profileExpenses')}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenPaymentWallet={() => navigate('profileWallet')}
          onOpenProfile={() => navigate('profile')}
          onOpenSecurity={() => navigate('profileSecurity')}
          onOpenTravelSupport={() => navigate('flow')}
          onUserUpdate={authSession.updateUser}
          onOpenWhisper={() => navigate('profileWhisper')}
          profileImageUri={profileImageUri}
          token={authSession.token}
          user={authSession.user}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'profileSecurity') {
    return (
      <>
        <SecurityScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('profile')}
          onLogout={handleLogout}
          onOpenChat={() => openChat()}
          onOpenCompanions={() => navigate('profileCompanions')}
          onOpenDocuments={() => navigate('profileDocuments')}
          onOpenExpenses={() => navigate('profileExpenses')}
          onOpenFaceEnrollment={() => openBiometricEnrollment('face')}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenPalmEnrollment={() => openBiometricEnrollment('palm')}
          onOpenPaymentWallet={() => navigate('profileWallet')}
          onOpenPreferences={() => navigate('profilePreferences')}
          onOpenProfile={() => navigate('profile')}
          onOpenTravelSupport={() => navigate('flow')}
          onTokenUpdate={authSession.updateToken}
          onUserUpdate={authSession.updateUser}
          onOpenWhisper={() => navigate('profileWhisper')}
          profileImageUri={profileImageUri}
          token={authSession.token}
          user={authSession.user}
          faceEnrolled={biometricState.faceEnrolled}
          palmEnrolled={biometricState.palmEnrolled}
          onFaceEnrolled={biometricState.setFaceEnrolled}
          onPalmEnrolled={biometricState.setPalmEnrolled}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'profileWhisper') {
    return (
      <>
        <WisperScreen
          notificationUnreadCount={notificationUnreadCount}
          onBack={() => navigate('profile')}
          onLogout={handleLogout}
          onOpenChat={() => openChat()}
          onOpenCompanions={() => navigate('profileCompanions')}
          onOpenDocuments={() => navigate('profileDocuments')}
          onOpenExpenses={() => navigate('profileExpenses')}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenPaymentWallet={() => navigate('profileWallet')}
          onOpenPreferences={() => navigate('profilePreferences')}
          onOpenProfile={() => navigate('profile')}
          onOpenSecurity={() => navigate('profileSecurity')}
          onOpenTravelSupport={() => navigate('flow')}
          profileImageUri={profileImageUri}
          token={authSession.token}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'biometricEnrollment') {
    const rawUserId = authSession.user?._id ?? authSession.user?.id;
    const userId = typeof rawUserId === 'string' ? rawUserId : '';

    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please login again.');
      navigate('login');
      return null;
    }

    return (
      <BiometricEnrollmentScreen
        mode={enrollmentMode}
        userId={userId}
        token={authSession.token ?? undefined}
        notificationUnreadCount={notificationUnreadCount}
        onBack={() => navigate('profileSecurity')}
        onEnrolled={() => {
          if (enrollmentMode === 'face') {
            biometricState.setFaceEnrolled(true);
          } else {
            biometricState.setPalmEnrolled(true);
          }
          navigate('profileSecurity');
        }}
        onOpenChat={() => openChat()}
        onOpenHome={() => navigate('home')}
        onOpenJourneys={() => navigate('journeys')}
        onOpenNotifications={() => navigate('notifications')}
        onOpenTravelSupport={() => navigate('flow')}
      />
    );
  }

  if (activeScreen === 'journeys') {
    return (
      <>
        <JourneysScreen
          onOpenAssistant={openAssistant}
          onOpenHome={() => navigate('home')}
          onOpenChat={() => openChat()}
          onOpenNotifications={() => navigate('notifications')}
          notificationUnreadCount={notificationUnreadCount}
          onLogout={handleLogout}
          profileImageUri={profileImageUri}
          onOpenProfile={() => navigateToProfile('journeys')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenTravelSupport={() => navigate('flow')}
          onOpenFlightDetails={() => navigate('flightDetails')}
          onOpenFlightTracker={() => navigate('flightTracker')}
          journeys={journeys}
          liveJourneyMonitorEnabled={liveJourneyMonitorEnabled}
          liveJourneyWebSocketStatus={liveJourneyWebSocketStatus}
          onLiveJourneyMonitorToggle={onLiveJourneyMonitorToggle}
          onOpenLiveMode={() => navigate('liveMode')}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'flow') {
    return (
      <>
        <FlowScreen
          notificationUnreadCount={notificationUnreadCount}
          onLogout={handleLogout}
          onOpenAssistant={openAssistant}
          onOpenChat={() => openChat()}
          onOpenHome={() => navigate('home')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenNotifications={() => navigate('notifications')}
          onOpenProfile={() => navigateToProfile('flow')}
          onOpenTravelSupport={() => navigate('flow')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
          profileImageUri={profileImageUri}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'travelSupport') {
    return (
      <>
        <TravelSupportScreen
          onOpenAssistant={openAssistant}
          onOpenHome={() => navigate('home')}
          onOpenChat={() => openChat()}
          onOpenNotifications={() => navigate('notifications')}
          notificationUnreadCount={notificationUnreadCount}
          onLogout={handleLogout}
          profileImageUri={profileImageUri}
          userName={userName}
          onOpenProfile={() => navigateToProfile('travelSupport')}
          onOpenWallet={() => navigate('walletFaceRecognition')}
          onOpenJourneys={() => navigate('journeys')}
          onOpenTravelSupport={() => navigate('flow')}
          onWeatherModeChange={onWeatherModeChange}
          weather={weather}
          weatherFallbackEnabled={weatherFallbackEnabled}
          weatherMode={weatherMode}
        />
        {assistantOverlay}
      </>
    );
  }

  if (activeScreen === 'welcome') {
    return (
      <WelcomeScreen
        canFinish={!authSession.loading}
        onFinish={() => navigate(authSession.isAuthenticated ? 'home' : 'login')}
      />
    );
  }

  // Biometric login modal — removed, using simpler approach
  // Modal is shown via showCameraModal state

  if (activeScreen === 'biometricLogin' && biometricLoginUserId) {
    return (
      <>
        <FaceRecognitionScreen
          userName=""
          userId={biometricLoginUserId}
          token={authSession.token ?? undefined}
          hasPalm={false}
          onBack={() => navigate('login')}
          onVerified={async () => {
            // onVerified is called after successful biometric verification
            // Now call the login endpoint to get auth token
            setIsBiometricLoggingIn(true);
            try {
              // Get the last captured photo from the biometric verification
              // For now, we'll navigate to login and the user can retry with the icon
              console.log('[BiometricLogin] Face verified, logging in...');
              
              // Call loginWithFaceIdentify — but we need the image URI
              // FaceRecognitionScreen saves the photo, we need to access it
              // Simpler approach: re-verify with the same user and get token
              const response = await loginWithFaceIdentify('face:' + biometricLoginUserId);
              if (response.token && response.data?.user) {
                await authSession.loginWithToken(response.token, response.data.user);
                const users = (await import('../hooks/useBiometricUsers')).useBiometricUsers;
                navigate('home');
              }
            } catch (error) {
              Alert.alert('Login Failed', error instanceof Error ? error.message : 'Please try again');
              navigate('login');
            } finally {
              setIsBiometricLoggingIn(false);
              setBiometricLoginUserId(null);
            }
          }}
        />
      </>
    );
  }

  if (activeScreen === 'login') {
    return (
      <>
        <LoginScreen
          authMessage={authSession.message}
          authStatus={authSession.status}
          isAuthLoading={authSession.status === 'loading'}
          onAuthenticated={() => navigate('home')}
          onOpenRegister={() => navigate('register')}
          onSignIn={wrappedLogin}
          onSignInWithGoogle={wrappedGoogleLogin}
          onSignInWithBiometric={(user, type) => {
            setCameraMode('face');  // force face only
            setCameraTargetUser(user);
            setShowCameraModal(true);
          }}
          onOpenBiometricLogin={(user) => {
            console.log('[BiometricLogin] Icon tapped, user:', user?.email);
            if (user) {
              navigate('biometricLogin', { userId: user.user_id });
            }
          }}
          onTokenUpdate={authSession.updateToken}
          onUserUpdate={authSession.updateUser}
        />


      </>
    );
  }

  if (activeScreen === 'register') {
    return (
      <RegisterScreen
        authMessage={authSession.message}
        authStatus={authSession.status}
        isAuthLoading={authSession.status === 'loading'}
        onOpenLogin={() => navigate('login')}
        onRegistered={() => navigate('login')}
        onSignUp={authSession.register}
        onSignUpWithGoogle={authSession.registerWithGoogle}
      />
    );
  }

  return (
    <>
      <HomeScreen
        onOpenAssistant={openAssistant}
        onOpenHome={() => navigate('home')}
        onOpenChat={() => openChat()}
        onOpenFlightDetails={() => navigate('flightDetails')}
        onOpenFlightTracker={() => navigate('flightTracker')}
        onOpenInspirationsSeeAll={() => navigate('inspirationsSeeAll')}
        journeyDataError={notificationsError}
        journeys={journeys}
        liveJourneyMonitorEnabled={liveJourneyMonitorEnabled}
        liveJourneyWebSocketStatus={liveJourneyWebSocketStatus}
        onJourneyLocationModeChange={onJourneyLocationModeChange}
        onLiveJourneyMonitorToggle={onLiveJourneyMonitorToggle}
        onOpenJourneys={() => navigate('journeys')}
        onOpenLiveMode={() => navigate('liveMode')}
        onOpenNotifications={() => navigate('notifications')}
        notificationUnreadCount={notificationUnreadCount}
        onOpenProfile={() => navigateToProfile('home')}
        onOpenWallet={() => navigate('walletFaceRecognition')}
        onOpenTravelSupport={() => navigate('flow')}
        onLogout={handleLogout}
        profileImageUri={profileImageUri}
        userName={userName}
        userEmail={userEmail}
        userHandle={userHandle}
        onRefreshWeather={onRefreshWeather}
        onWeatherModeChange={onWeatherModeChange}
        weather={weather}
        weatherFallbackEnabled={weatherFallbackEnabled}
        weatherMode={weatherMode}
        menuVisible={menuVisible}
        onMenuVisibleChange={setMenuVisible}
      />
      {assistantOverlay}
    </>
  );
}