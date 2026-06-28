import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import RightArrowIcon from '../../../assets/icons/right-arrow.svg';
import SpeakIcon from '../../../assets/icons/whisper/speak-line-#002AFF.svg';
import type { AuthUser } from '../../api/auth/auth';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { useProfilePreferences } from '../../hooks/profile/useProfilePreferences';
import { styles as themeStyles } from '../../theme/styles';
import { THEME_PRESETS, type ThemePreset } from '../../utils/profilePreferences';

// ---------------------------------------------------------------------
// Compact style overrides (merged with theme)
// ---------------------------------------------------------------------
const compactStyles = StyleSheet.create({
  profileScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  profileHero: {
    paddingTop: 40,
    paddingBottom: 12,
    alignItems: 'center',
  },
  profileHeroCompact: {
    paddingTop: 0,
    paddingBottom: 12,
  },
  profilePageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignSelf: 'center',
    gap: 8,
    marginTop: 4,
  },
  profileSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 72,
    marginBottom: 24,
    flexShrink: 0,
  },
  profileSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  profileSectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  profilePreferencesMain: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 0,
    paddingTop: 0,
    paddingBottom: 20,
  },

  // ----- Each section is now a standalone card -----
  profilePreferenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    flexShrink: 0,
  },

  // ----- Collapsible section header -----
  profilePreferenceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  profilePreferenceSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profilePreferenceSectionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  profilePreferenceChevron: {
    padding: 4,
  },
  profilePreferenceChevronIcon: {
    transform: [{ rotate: '0deg' }],
  },
  profilePreferenceChevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  profilePreferenceSectionContent: {
    paddingTop: 4,
  },

  // ----- Theme cards -----
  profileThemeList: {
    gap: 8,
    marginBottom: 8,
  },
  profileThemeCard: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  profileThemeCardDefault: {
    backgroundColor: '#FFFFFF',
  },
  profileThemeCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#F0F7FF',
  },
  profileThemeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  profileThemeText: {
    flex: 1,
    marginRight: 10,
  },
  profileThemeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  profileThemeDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  profileThemeCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileThemeCheckSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  profileThemeSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  profileThemeSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  profilePreferenceDisclaimer: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  profilePreferenceDisclaimerText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },

  // ----- Toggles -----
  profilePreferenceToggleList: {
    gap: 6,
  },
  profilePreferenceToggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  profilePreferenceToggleText: {
    flex: 1,
    marginRight: 10,
  },
  profilePreferenceToggleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  profilePreferenceToggleDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  profilePreferenceSwitch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    padding: 2,
  },
  profilePreferenceSwitchEnabled: {
    backgroundColor: '#3B82F6',
  },
  profilePreferenceSwitchDisabled: {
    backgroundColor: '#D1D5DC',
  },
  profilePreferenceSwitchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  profilePreferenceSwitchKnobEnabled: {
    transform: [{ translateX: 18 }],
  },
  profilePreferenceSwitchKnobDisabled: {
    transform: [{ translateX: 0 }],
  },

  // ----- Save button -----
  profilePrimaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePrimaryButtonDisabled: {
    opacity: 0.6,
  },
  profilePrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  profilePreferenceSaveButton: {
    marginTop: 8,
  },
  profileSaveMessage: {
    marginTop: 8,
    fontSize: 13,
    color: '#00A67E',
    textAlign: 'center',
  },
});

const styles = { ...themeStyles, ...compactStyles };

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------
type PreferencesScreenProps = {
  notificationUnreadCount?: number;
  onBack: () => void;
  onLogout?: () => void;
  onOpenChat?: () => void;
  onOpenCompanions: () => void;
  onOpenDocuments: () => void;
  onOpenExpenses: () => void;
  onOpenHome: () => void;
  onOpenJourneys: () => void;
  onOpenNotifications: () => void;
  onOpenPaymentWallet: () => void;
  onOpenProfile: () => void;
  onOpenSecurity: () => void;
  onOpenTravelSupport: () => void;
  onOpenWhisper: () => void;
  onUserUpdate?: (user: AuthUser) => Promise<void>;
  profileImageUri?: string | null;
  token: string | null;
  user: AuthUser | null;
};

type ProfilePageLabel =
  | 'Profile'
  | 'Documents'
  | 'Companions'
  | 'Expenses'
  | 'Whisper'
  | 'Preferences'
  | 'Security';

type ToggleItem = {
  description: string;
  enabled: boolean;
  onPress: () => void;
  title: string;
};

const profilePages: { label: ProfilePageLabel; icon: typeof UserIcon }[] = [
  { label: 'Profile', icon: UserIcon },
  { label: 'Documents', icon: DocumentsIcon },
  { label: 'Companions', icon: CompanionsIcon },
  { label: 'Expenses', icon: ExpensesIcon },
  { label: 'Whisper', icon: SpeakMenuIcon },
  { label: 'Preferences', icon: SettingsIcon },
  { label: 'Security', icon: LockIcon },
];

export function PreferencesScreen({
  notificationUnreadCount = 0,
  onBack,
  onLogout,
  onOpenChat,
  onOpenCompanions,
  onOpenDocuments,
  onOpenExpenses,
  onOpenHome,
  onOpenJourneys,
  onOpenNotifications,
  onOpenPaymentWallet,
  onOpenProfile,
  onOpenSecurity,
  onOpenTravelSupport,
  onOpenWhisper,
  onUserUpdate,
  profileImageUri,
  token,
  user,
}: PreferencesScreenProps) {
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
  const dropdownTranslateY = useRef(new Animated.Value(330)).current;
  const {
    communicationPreference,
    hasChanges,
    journeyMonitoringPreference,
    locationTrackingPreference,
    message,
    savePreferences,
    saving,
    setJourneyMonitoringPreference,
    setThemePreference,
    themePreference,
    toggleCommunicationPreference,
    toggleLocationTrackingPreference,
  } = useProfilePreferences({
    onUserUpdate,
    token,
    user,
  });

  const [sectionsExpanded, setSectionsExpanded] = useState({
    colorTheme: true,
    journeySettings: false,
    locationTracking: false,
    communication: false,
    security: false,
  });

  const toggleSection = (key: keyof typeof sectionsExpanded) => {
    setSectionsExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const journeySettings: ToggleItem[] = [
    {
      description: 'Track and receive updates for all your travel plans',
      enabled: journeyMonitoringPreference === 'all',
      onPress: () => setJourneyMonitoringPreference('all'),
      title: 'Monitor All Journeys',
    },
    {
      description: 'Only show notifications for active trips',
      enabled: journeyMonitoringPreference === 'active',
      onPress: () => setJourneyMonitoringPreference('active'),
      title: 'Active Journey Only',
    },
    {
      description: 'Disable background journey monitoring',
      enabled: journeyMonitoringPreference === 'off',
      onPress: () => setJourneyMonitoringPreference('off'),
      title: 'Monitoring Off',
    },
  ];
  const locationSettings: ToggleItem[] = [
    {
      description: 'Track journeys, airports, and nearby places in real time',
      enabled: locationTrackingPreference.fullTracking,
      onPress: () => toggleLocationTrackingPreference('fullTracking'),
      title: 'Full Tracking',
    },
    {
      description: 'Track location at airports',
      enabled: locationTrackingPreference.airportTracking,
      onPress: () => toggleLocationTrackingPreference('airportTracking'),
      title: 'Airport Tracking',
    },
    {
      description: 'Track location during active trips and bookings',
      enabled: locationTrackingPreference.tripsTracking,
      onPress: () => toggleLocationTrackingPreference('tripsTracking'),
      title: 'Trips Tracking',
    },
  ];
  const communicationSettings: ToggleItem[] = [
    {
      description: 'Receive promotional emails and special offers',
      enabled: communicationPreference.marketingList,
      onPress: () => toggleCommunicationPreference('marketingList'),
      title: 'Marketing List',
    },
    {
      description: 'Get important updates via email',
      enabled: communicationPreference.emailNotifications,
      onPress: () => toggleCommunicationPreference('emailNotifications'),
      title: 'Email Notifications',
    },
    {
      description: 'Receive real-time alerts on your device',
      enabled: communicationPreference.pushNotifications,
      onPress: () => toggleCommunicationPreference('pushNotifications'),
      title: 'Push Notifications',
    },
  ];

  useEffect(() => {
    Animated.timing(dropdownTranslateY, {
      duration: 260,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [dropdownTranslateY]);

  const handlePagePress = (label: ProfilePageLabel) => {
    setIsPageMenuOpen(false);

    if (label === 'Profile') {
      onOpenProfile();
    }

    if (label === 'Documents') {
      onOpenDocuments();
    }

    if (label === 'Companions') {
      onOpenCompanions();
    }

    if (label === 'Expenses') {
      onOpenExpenses();
    }

    if (label === 'Security') {
      onOpenSecurity();
    }

    if (label === 'Whisper') {
      onOpenWhisper();
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.profileScreen}>
      <ScrollView
        contentContainerStyle={styles.profileScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateY: dropdownTranslateY }] }}>
          <View style={[styles.profileHero, styles.profileHeroCompact]}>
            <Pressable
              accessibilityLabel="Open profile page menu"
              accessibilityRole="button"
              onPress={() => setIsPageMenuOpen(true)}
              style={({ pressed }) => [
                styles.profilePageToggle,
                styles.profilePageToggleCompact,
                pressed && styles.pressedFeedback,
              ]}
            >
              <Text style={styles.profilePageToggleText}>Preferences</Text>
              <ChevronDownIcon size={20} />
            </Pressable>
          </View>

          <View style={styles.profilePreferencesMain}>
            <View style={styles.profileSectionHeading}>
              <View>
                <Text style={styles.profileSectionTitle}>Preferences</Text>
                <Text style={styles.profileSectionSubtitle}>Journey monitoring & experience</Text>
              </View>
            </View>

            {/* ----- Each section as a collapsible card ----- */}
            <CollapsibleCard
              icon={<PaletteIcon />}
              title="Color Theme"
              expanded={sectionsExpanded.colorTheme}
              onToggle={() => toggleSection('colorTheme')}
            >
              <View style={styles.profileThemeList}>
                {THEME_PRESETS.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    onPress={() => setThemePreference(theme.id)}
                    selected={themePreference === theme.id}
                    theme={theme}
                  />
                ))}
              </View>
              <View style={styles.profilePreferenceDisclaimer}>
                <Text style={styles.profilePreferenceDisclaimerText}>
                  Your selected theme will be applied across the entire app experience.
                </Text>
              </View>
            </CollapsibleCard>

            <CollapsibleCard
              icon={<MapIcon />}
              title="Journey Settings"
              expanded={sectionsExpanded.journeySettings}
              onToggle={() => toggleSection('journeySettings')}
            >
              <View style={styles.profilePreferenceToggleList}>
                {journeySettings.map((item) => (
                  <PreferenceToggle key={item.title} item={item} />
                ))}
              </View>
            </CollapsibleCard>

            <CollapsibleCard
              icon={<MapPinIcon />}
              title="Location Tracking"
              expanded={sectionsExpanded.locationTracking}
              onToggle={() => toggleSection('locationTracking')}
            >
              <View style={styles.profilePreferenceToggleList}>
                {locationSettings.map((item) => (
                  <PreferenceToggle key={item.title} item={item} />
                ))}
              </View>
            </CollapsibleCard>

            <CollapsibleCard
              icon={<NotificationIcon />}
              title="Communication"
              expanded={sectionsExpanded.communication}
              onToggle={() => toggleSection('communication')}
            >
              <View style={styles.profilePreferenceToggleList}>
                {communicationSettings.map((item) => (
                  <PreferenceToggle key={item.title} item={item} />
                ))}
              </View>
            </CollapsibleCard>

            <CollapsibleCard
              icon={<ShieldIcon />}
              title="Security"
              expanded={sectionsExpanded.security}
              onToggle={() => toggleSection('security')}
            >
              <PreferenceToggle
                item={{
                  description: 'Get notified about account security events',
                  enabled: communicationPreference.securityAlerts,
                  onPress: () => toggleCommunicationPreference('securityAlerts'),
                  title: 'Security Alerts',
                }}
              />
            </CollapsibleCard>

            {/* Save button */}
            <Pressable
              accessibilityRole="button"
              disabled={saving || !hasChanges}
              onPress={savePreferences}
              style={({ pressed }) => [
                styles.profilePrimaryButton,
                styles.profilePreferenceSaveButton,
                (saving || !hasChanges) && styles.profilePrimaryButtonDisabled,
                pressed && styles.pressedFeedback,
              ]}
            >
              <Text style={styles.profilePrimaryButtonText}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </Text>
            </Pressable>
            {message ? <Text style={styles.profileSaveMessage}>{message}</Text> : null}
          </View>
        </Animated.View>
      </ScrollView>

      <Pressable
        accessibilityLabel="Go back to profile"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.profileBackButton, pressed && styles.pressedFeedback]}
      >
        <ArrowLeftIcon />
      </Pressable>

      <FooterWithMenu
        notificationUnreadCount={notificationUnreadCount}
        onLogout={onLogout}
        onOpenChat={onOpenChat ?? (() => undefined)}
        onOpenFlow={onOpenTravelSupport}
        onOpenHome={onOpenHome}
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={onOpenProfile}
        onOpenTrips={onOpenJourneys}
        onOpenWallet={onOpenPaymentWallet}
        profileImageUri={profileImageUri}
        source="profilePreferences"
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setIsPageMenuOpen(false)}
        transparent
        visible={isPageMenuOpen}
      >
        <Pressable
          accessibilityLabel="Close profile page menu"
          onPress={() => setIsPageMenuOpen(false)}
          style={styles.profileMenuOverlay}
        >
          <Pressable style={styles.profileMenuCard}>
            <ScrollView
              contentContainerStyle={styles.profileMenuScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {profilePages.map(({ label, icon: Icon }, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={label}
                  onPress={() => handlePagePress(label)}
                  style={({ pressed }) => [
                    styles.profileMenuItem,
                    index > 0 && styles.profileMenuItemDivider,
                    pressed && styles.pressedFeedback,
                  ]}
                >
                  <Icon color="#3B82F6" size={20} />
                  <Text style={styles.profileMenuItemText}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------
// Collapsible Card Component – each section as its own card
// ---------------------------------------------------------------------
function CollapsibleCard({
  children,
  icon,
  title,
  expanded,
  onToggle,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.profilePreferenceCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.profilePreferenceSectionHeader,
          pressed && styles.pressedFeedback,
        ]}
      >
        <View style={styles.profilePreferenceSectionHeading}>
          {icon}
          <Text style={styles.profilePreferenceSectionTitle}>{title}</Text>
        </View>
        <View style={styles.profilePreferenceChevron}>
          <ChevronDownIcon
            size={20}
            style={[
              styles.profilePreferenceChevronIcon,
              expanded && styles.profilePreferenceChevronExpanded,
            ]}
          />
        </View>
      </Pressable>
      {expanded ? <View style={styles.profilePreferenceSectionContent}>{children}</View> : null}
    </View>
  );
}

// ---------------------------------------------------------------------
// Sub‑components (ThemeCard, PreferenceToggle)
// ---------------------------------------------------------------------
function ThemeCard({
  onPress,
  selected,
  theme,
}: {
  onPress: () => void;
  selected: boolean;
  theme: ThemePreset;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.profileThemeCard,
        selected ? styles.profileThemeCardSelected : styles.profileThemeCardDefault,
      ]}
    >
      <View style={styles.profileThemeHeading}>
        <View style={styles.profileThemeText}>
          <Text style={styles.profileThemeTitle}>{theme.title}</Text>
          <Text style={styles.profileThemeDescription}>{theme.description}</Text>
        </View>
        <View style={[styles.profileThemeCheck, selected && styles.profileThemeCheckSelected]}>
          {selected ? <CheckIcon /> : null}
        </View>
      </View>
      <View style={styles.profileThemeSwatches}>
        {theme.swatches.map((swatch) => (
          <View key={swatch} style={[styles.profileThemeSwatch, { backgroundColor: swatch }]} />
        ))}
      </View>
    </Pressable>
  );
}

function PreferenceToggle({ item }: { item: ToggleItem }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: item.enabled }}
      onPress={item.onPress}
      style={styles.profilePreferenceToggleCard}
    >
      <View style={styles.profilePreferenceToggleText}>
        <Text style={styles.profilePreferenceToggleTitle}>{item.title}</Text>
        <Text style={styles.profilePreferenceToggleDescription}>{item.description}</Text>
      </View>
      <View
        style={[
          styles.profilePreferenceSwitch,
          item.enabled
            ? styles.profilePreferenceSwitchEnabled
            : styles.profilePreferenceSwitchDisabled,
        ]}
      >
        <View
          style={[
            styles.profilePreferenceSwitchKnob,
            item.enabled
              ? styles.profilePreferenceSwitchKnobEnabled
              : styles.profilePreferenceSwitchKnobDisabled,
          ]}
        />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------
// Icons (unchanged)
// ---------------------------------------------------------------------
function ArrowLeftIcon() {
  return <RightArrowIcon color="#FFFFFF" height={18} style={styles.profileBackIcon} width={18} />;
}

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="m6 12 4 4 8-8"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.3}
      />
    </Svg>
  );
}

function ChevronDownIcon({ size, style }: { size: number; style?: any }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path d="m7 10 5 5 5-5" stroke="#0A0A0A" strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

function DocumentsIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 4h12v16H6V4Z" stroke={color} strokeLinejoin="round" strokeWidth={1.9} />
      <Path d="M9 9h6M9 13h6M9 17h3" stroke={color} strokeLinecap="round" strokeWidth={1.9} />
    </Svg>
  );
}

function CompanionsIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={8} cy={8} r={2.5} stroke={color} strokeWidth={1.8} />
      <Circle cx={16} cy={8} r={2.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M4 20c.5-3 1.8-4.5 4-4.5s3.5 1.5 4 4.5M12 20c.5-3 1.8-4.5 4-4.5s3.5 1.5 4 4.5"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function ExpensesIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 4v15h15"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.9}
      />
      <Path
        d="m8 15 3.2-4 3 2.2L18 8"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.9}
      />
    </Svg>
  );
}

function LockIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10} width={14} height={10} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={1.8} />
      <Path d="M12 14v2" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function MapIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"
        stroke="#002AFF"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Path d="M9 3v15M15 6v15" stroke="#002AFF" strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function MapPinIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-4.8 7-11a7 7 0 1 0-14 0c0 6.2 7 11 7 11Z"
        stroke="#002AFF"
        strokeWidth={1.8}
      />
      <Circle cx={12} cy={10} r={2.4} stroke="#002AFF" strokeWidth={1.8} />
    </Svg>
  );
}

function NotificationIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
        stroke="#002AFF"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Path d="M10 20h4" stroke="#002AFF" strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function PaletteIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 1.4-3.4 1.5 1.5 0 0 1 1.1-2.6H18a3 3 0 0 0 3-3 9 9 0 0 0-9-9Z"
        stroke="#002AFF"
        strokeWidth={1.8}
      />
      <Circle cx={7.5} cy={10} r={1} fill="#002AFF" />
      <Circle cx={10.5} cy={7.5} r={1} fill="#002AFF" />
      <Circle cx={14} cy={8} r={1} fill="#002AFF" />
    </Svg>
  );
}

function SettingsIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" stroke={color} strokeWidth={1.8} />
      <Path
        d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 2.5A8 8 0 0 0 7 6L4.6 5l-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5L7 18a8 8 0 0 0 2.6 1.5L10 22h4l.4-2.5A8 8 0 0 0 17 18l2.4 1 2-3.5-2-1.5Z"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function SpeakMenuIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return <SpeakIcon color={color} height={size} width={size} />;
}

function ShieldIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 5 6v5.5c0 4.4 2.8 7.4 7 9.5 4.2-2.1 7-5.1 7-9.5V6l-7-3Z"
        stroke="#002AFF"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function UserIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M5 21c.9-4 3.2-6 7-6s6.1 2 7 6"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}