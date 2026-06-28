import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { WeatherData } from '../../api/weather';
import { ScreenFrame } from '../../components/layout/ScreenFrame';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';
import type { WeatherMode } from '../../types/weather';
import { WelcomeSummary } from '../home/components';

type TravelSupportScreenProps = {
  onOpenAssistant?: () => void;
  notificationUnreadCount?: number;
  onOpenHome: () => void;
  onOpenChat: () => void;
  onOpenNotifications: () => void;
  onOpenProfile?: () => void;
  onOpenWallet?: () => void;
  onOpenJourneys?: () => void;
  onOpenTravelSupport?: () => void;
  onLogout?: () => void;
  profileImageUri?: string | null;
  userName?: string;
  onWeatherModeChange: (weatherMode: WeatherMode) => void;
  weather: WeatherData | null;
  weatherFallbackEnabled: boolean;
  weatherMode: WeatherMode;
};

const disruptionActions = [
  {
    title: 'Rebooking Options',
    description: 'Find new flights',
  },
  {
    title: 'Lounge Access',
    description: 'Check lounge availability',
  },
  {
    title: 'Updated Transport',
    description: 'Adjust airport transfer',
  },
];

const luggageActions = [
  {
    title: 'Track Delivery',
    description: 'Track luggage status',
  },
  {
    title: 'Contact Airline',
    description: 'Call / Chat support',
  },
];

export function TravelSupportScreen({
  onOpenAssistant,
  notificationUnreadCount = 0,
  onOpenHome,
  onOpenChat,
  onOpenNotifications,
  onOpenProfile,
  onOpenWallet,
  onOpenJourneys,
  onOpenTravelSupport,
  onLogout,
  profileImageUri,
  userName,
  onWeatherModeChange,
  weather,
  weatherFallbackEnabled,
  weatherMode,
}: TravelSupportScreenProps) {
  return (
    <ScreenFrame
      activePageIndex={1}
      footerSource="travelSupport"
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
      onSwipeLeft={onOpenHome}
      onSwipeRight={onOpenJourneys}
    >
      <WelcomeSummary
        userName={userName}
        onWeatherModeChange={onWeatherModeChange}
        weather={weather}
        weatherFallbackEnabled={weatherFallbackEnabled}
        weatherMode={weatherMode}
      />

      <View style={supportStyles.stack}>
        <SupportPanel>
          <StatusPill label="Flight on time" tone="success" />
          <Text style={supportStyles.panelTitle}>Disruption Handling</Text>
          <Text style={supportStyles.panelSubtitle}>
            Live travel issue support & smart recovery options
          </Text>
          <View style={supportStyles.actionList}>
            {disruptionActions.map((action) => (
              <SupportAction key={action.title} {...action} />
            ))}
          </View>
        </SupportPanel>

        <SupportPanel>
          <Text style={supportStyles.panelTitle}>Traveler Energy</Text>
          <Text style={supportStyles.panelSubtitle}>Adaptive schedule based on travel fatigue</Text>
          <LinearGradient colors={['#EDF7FA', '#F6FFFB']} style={supportStyles.energyNotice}>
            <EnergyIcon />
            <Text style={supportStyles.energyNoticeText}>
              Long travel detected - rest recommended
            </Text>
          </LinearGradient>

          <View style={supportStyles.energyMeter}>
            <View style={supportStyles.energyLabels}>
              <Text style={supportStyles.energyLabel}>Low</Text>
              <Text style={supportStyles.energyLabel}>Balanced</Text>
              <Text style={supportStyles.energyLabel}>High</Text>
            </View>
            <View style={supportStyles.energyTrack}>
              <LinearGradient
                colors={['#05DF72', '#51A2FF']}
                end={{ x: 1, y: 0 }}
                start={{ x: 0, y: 0 }}
                style={supportStyles.energyFill}
              />
            </View>
          </View>

          <View style={supportStyles.energyCards}>
            <RecommendationCard
              action="Schedule rest"
              description="Take 60-90 min break before next activity"
              title="Rest Suggestion"
              variant="filled"
            />
            <RecommendationCard
              action="Optimize plan"
              description="Shift activities to later time"
              title="Schedule Adjustments"
              variant="outline"
            />
          </View>
        </SupportPanel>

        <SupportPanel>
          <StatusPill label="No luggage detected" tone="danger" />
          <View style={supportStyles.luggageHeader}>
            <LuggageIcon />
            <View style={supportStyles.luggageCopy}>
              <Text style={supportStyles.panelTitle}>Luggage Support</Text>
              <Text style={supportStyles.panelSubtitle}>
                Track, report, and resolve luggage issues
              </Text>
            </View>
          </View>

          <View style={supportStyles.actionList}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                supportStyles.reportButton,
                pressed && sharedStyles.pressedFeedback,
              ]}
            >
              <Text style={supportStyles.reportButtonText}>Report missing luggage</Text>
            </Pressable>
            {luggageActions.map((action) => (
              <SupportAction key={action.title} {...action} />
            ))}
          </View>
        </SupportPanel>
      </View>
    </ScreenFrame>
  );
}

function SupportPanel({ children }: { children: ReactNode }) {
  return <View style={supportStyles.panel}>{children}</View>;
}

function SupportAction({ title, description }: { title: string; description: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [supportStyles.actionButton, pressed && sharedStyles.pressedFeedback]}
    >
      <View style={supportStyles.actionCopy}>
        <Text style={supportStyles.actionTitle}>{title}</Text>
        <Text style={supportStyles.actionDescription}>{description}</Text>
      </View>
      <ChevronRightIcon />
    </Pressable>
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'success' | 'danger' }) {
  const isDanger = tone === 'danger';

  return (
    <View style={[supportStyles.statusPill, isDanger && supportStyles.statusPillDanger]}>
      {isDanger && <AlertIcon />}
      <Text style={[supportStyles.statusPillText, isDanger && supportStyles.statusPillTextDanger]}>
        {label}
      </Text>
    </View>
  );
}

function RecommendationCard({
  action,
  description,
  title,
  variant,
}: {
  action: string;
  description: string;
  title: string;
  variant: 'filled' | 'outline';
}) {
  const isOutline = variant === 'outline';

  return (
    <View
      style={[
        supportStyles.recommendationCard,
        isOutline && supportStyles.recommendationCardSecondary,
      ]}
    >
      <Text style={supportStyles.recommendationTitle}>{title}</Text>
      <Text style={supportStyles.recommendationDescription}>{description}</Text>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          supportStyles.recommendationButton,
          isOutline && supportStyles.recommendationButtonOutline,
          pressed && sharedStyles.pressedFeedback,
        ]}
      >
        <Text
          style={[
            supportStyles.recommendationButtonText,
            isOutline && supportStyles.recommendationButtonTextOutline,
          ]}
        >
          {action}
        </Text>
      </Pressable>
    </View>
  );
}

function EnergyIcon() {
  return (
    <Svg height={24} width={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7V17H18V7H4ZM3 5H19C19.5523 5 20 5.44772 20 6V18C20 18.5523 19.5523 19 19 19H3C2.44772 19 2 18.5523 2 18V6C2 5.44772 2.44772 5 3 5ZM21 9H23V15H21V9Z"
        fill="#002AFF"
      />
    </Svg>
  );
}

function AlertIcon() {
  return (
    <Svg height={12} width={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 2.8 20h18.4L12 3Z"
        fill="none"
        stroke="#E51B24"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path d="M12 9v5" stroke="#E51B24" strokeLinecap="round" strokeWidth={2} />
      <Circle cx={12} cy={17} r={1} fill="#E51B24" />
    </Svg>
  );
}

function LuggageIcon() {
  return (
    <Svg height={24} width={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 7V5.8C8 4.8 8.8 4 9.8 4h4.4c1 0 1.8.8 1.8 1.8V7M6.5 7h11A2.5 2.5 0 0 1 20 9.5v8A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-8A2.5 2.5 0 0 1 6.5 7Z"
        stroke={colors.ink}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Path d="M8 11v5M16 11v5" stroke={colors.ink} strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg height={24} style={supportStyles.actionChevron} viewBox="0 0 24 24" width={24}>
      <Path
        d="M7 10l5 5 5-5"
        stroke="#A7AFBC"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const supportStyles = StyleSheet.create({
  stack: {
    alignSelf: 'center',
    gap: 24,
    marginTop: 36,
    paddingBottom: 22,
    width: '100%',
  },
  panel: {
    alignSelf: 'center',
    backgroundColor: colors.panel,
    borderRadius: 24,
    elevation: 3,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    width: '100%',
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F8F8',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 24,
    paddingHorizontal: 12,
  },
  statusPillDanger: {
    backgroundColor: '#FFE8E8',
  },
  statusPillText: {
    color: colors.green,
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 16,
  },
  statusPillTextDanger: {
    color: '#E51B24',
  },
  panelTitle: {
    color: colors.ink,
    fontFamily: 'DMSans-Medium',
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 30,
    marginTop: 16,
  },
  panelSubtitle: {
    color: 'rgba(0,0,0,0.6)',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  actionList: {
    gap: 8,
    marginTop: 24,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    color: colors.ink,
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  actionDescription: {
    color: 'rgba(0,0,0,0.55)',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  actionChevron: {
    marginLeft: 12,
    transform: [{ rotate: '-90deg' }],
  },
  energyNotice: {
    alignItems: 'flex-start',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  energyNoticeText: {
    color: colors.ink,
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
  },
  energyMeter: {
    gap: 8,
    marginTop: 16,
  },
  energyLabels: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  energyLabel: {
    color: 'rgba(0,0,0,0.5)',
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 16,
  },
  energyTrack: {
    backgroundColor: '#F5F5F5',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  energyFill: {
    borderRadius: 999,
    height: 8,
    width: '36%',
  },
  energyCards: {
    gap: 12,
    marginTop: 24,
  },
  recommendationCard: {
    backgroundColor: '#EDF7FA',
    borderRadius: 14,
    minHeight: 156,
    padding: 16,
  },
  recommendationCardSecondary: {
    backgroundColor: '#F6FFFB',
  },
  recommendationTitle: {
    color: colors.ink,
    fontFamily: 'DM Sans',
    fontSize: 16,
    lineHeight: 24,
  },
  recommendationDescription: {
    color: 'rgba(0,0,0,0.6)',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  recommendationButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    marginTop: 'auto',
  },
  recommendationButtonOutline: {
    backgroundColor: 'transparent',
    borderColor: colors.blue,
    borderWidth: 1,
  },
  recommendationButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  recommendationButtonTextOutline: {
    color: colors.blue,
  },
  luggageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  luggageCopy: {
    flex: 1,
    minWidth: 0,
  },
  reportButton: {
    alignItems: 'center',
    backgroundColor: '#E51B24',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
});
