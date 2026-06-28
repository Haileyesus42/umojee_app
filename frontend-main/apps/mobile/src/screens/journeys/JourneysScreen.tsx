import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import FlightInsightIcon from '../../../assets/icons/journey_screen/Icon11.svg';
import RideInsightIcon from '../../../assets/icons/journey_screen/Icon12.svg';
import StayInsightIcon from '../../../assets/icons/journey_screen/Icon10.svg';
import type { JourneyItem } from '../../api/notifications';
import type { WebSocketStatus } from '../../api/websocket';
import { ScreenFrame } from '../../components/layout/ScreenFrame';
import { colors } from '../../constants/colors';
import { CalendarOverlay, ItineraryCard, UpcomingCard } from '../home/components';
import { JourneysSection } from './components/JourneysSection';

type JourneysScreenProps = {
  onOpenAssistant?: () => void;
  notificationUnreadCount?: number;
  onOpenHome: () => void;
  onOpenChat: () => void;
  onOpenNotifications: () => void;
  onOpenProfile?: () => void;
  onOpenWallet?: () => void;
  onOpenJourneys?: () => void;
  onOpenTravelSupport?: () => void;
  onOpenFlightDetails: () => void;
  onOpenFlightTracker: () => void;
  journeys?: JourneyItem[];
  liveJourneyMonitorEnabled?: boolean;
  liveJourneyWebSocketStatus?: WebSocketStatus;
  onLiveJourneyMonitorToggle?: () => void;
  onOpenLiveMode: () => void;
  onLogout?: () => void;
  profileImageUri?: string | null;
};

const insightCards = [
  {
    label: 'Flights',
    value: '5',
    color: colors.blue,
    backgroundColor: 'rgba(0,42,255,0.08)',
    icon: FlightInsightIcon,
  },
  {
    label: 'Stays',
    value: '5',
    color: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.08)',
    icon: StayInsightIcon,
  },
  {
    label: 'Rides',
    value: '25',
    color: '#10B981',
    backgroundColor: 'rgba(16,185,129,0.08)',
    icon: RideInsightIcon,
  },
];

const breakdownItems = [
  { label: 'Flights', value: '48%', color: colors.blue },
  { label: 'Hotels', value: '32%', color: '#8B5CF6' },
  { label: 'Cars', value: '20%', color: '#10B981' },
];

const statCards = [
  { label: 'This Month', value: '3', description: 'Trips booked' },
  { label: 'This Year', value: '5', description: 'Total trips' },
];

export function JourneysScreen({
  onOpenAssistant,
  notificationUnreadCount = 0,
  onOpenHome,
  onOpenChat,
  onOpenNotifications,
  onOpenProfile,
  onOpenWallet,
  onOpenJourneys,
  onOpenTravelSupport,
  onOpenFlightDetails,
  onOpenFlightTracker,
  journeys = [],
  liveJourneyMonitorEnabled = false,
  liveJourneyWebSocketStatus = 'idle',
  onLiveJourneyMonitorToggle,
  onOpenLiveMode,
  onLogout,
  profileImageUri,
}: JourneysScreenProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <ScreenFrame
      activePageIndex={2}
      footerSource="journeys"
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
      onSwipeLeft={onOpenTravelSupport}
      onSwipeRight={onOpenHome}
      overlay={
        <CalendarOverlay
          visible={isCalendarOpen}
          onCancel={() => setIsCalendarOpen(false)}
          onDone={() => setIsCalendarOpen(false)}
        />
      }
    >
      <ItineraryCard
        journeys={journeys}
        liveModeToggleOn={liveJourneyMonitorEnabled}
        liveModeWebSocketStatus={liveJourneyWebSocketStatus}
        onLiveModeToggle={onLiveJourneyMonitorToggle}
        onOpenFlightDetails={onOpenFlightDetails}
        onOpenFlightTracker={onOpenFlightTracker}
        onOpenLiveMode={onOpenLiveMode}
      />
      <UpcomingCard journeys={journeys} onOpenCalendar={() => setIsCalendarOpen(true)} />

      <View style={journeyStyles.stack}>
        <JourneysSection />

        <View style={journeyStyles.panel}>
          <Text style={journeyStyles.panelTitle}>Trip Insights</Text>
          <Text style={journeyStyles.panelSubtitle}>Your travel summary at a glance</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={journeyStyles.insightList}
            style={journeyStyles.horizontalViewport}
          >
            {insightCards.map(({ backgroundColor, color, icon: Icon, label, value }) => (
              <LinearGradient
                key={label}
                colors={['#002AFF', '#77F2F6']}
                end={{ x: 0.5, y: 1 }}
                start={{ x: 0.5, y: 0 }}
                style={journeyStyles.insightCardBorder}
              >
                <View style={journeyStyles.insightCard}>
                  <View style={[journeyStyles.insightIconWrap, { backgroundColor }]}>
                    <Icon color={color} height={20} width={20} />
                  </View>
                  <Text style={journeyStyles.insightValue}>{value}</Text>
                  <Text style={journeyStyles.insightLabel}>{label}</Text>
                </View>
              </LinearGradient>
            ))}
          </ScrollView>

          <View style={journeyStyles.breakdownCard}>
            <Text style={journeyStyles.sectionTitle}>Activity Breakdown</Text>
            <View style={journeyStyles.breakdownBody}>
              <DonutChart />
              <View style={journeyStyles.legend}>
                {breakdownItems.map((item) => (
                  <View key={item.label} style={journeyStyles.legendRow}>
                    <View style={[journeyStyles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={journeyStyles.legendLabel}>{item.label}</Text>
                    <Text style={journeyStyles.legendValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={journeyStyles.statList}
            style={journeyStyles.horizontalViewport}
          >
            {statCards.map((stat) => (
              <LinearGradient
                key={stat.label}
                colors={['#002AFF', '#77F2F6']}
                end={{ x: 0.5, y: 1 }}
                start={{ x: 0.5, y: 0 }}
                style={journeyStyles.statCardBorder}
              >
                <View style={journeyStyles.statCard}>
                  <Text style={journeyStyles.statLabel}>{stat.label}</Text>
                  <Text style={journeyStyles.statValue}>{stat.value}</Text>
                  <Text style={journeyStyles.statDescription}>{stat.description}</Text>
                </View>
              </LinearGradient>
            ))}
          </ScrollView>

          <View style={journeyStyles.spendBanner}>
            <View>
              <Text style={journeyStyles.spendLabel}>Total Spend</Text>
              <Text style={journeyStyles.spendValue}>$12,450</Text>
            </View>
            <LinearGradient
              colors={['#002AFF', '#77F2F6']}
              end={{ x: 0.5, y: 1 }}
              start={{ x: 0.5, y: 0 }}
              style={journeyStyles.spendIconBorder}
            >
              <View style={journeyStyles.spendIcon}>
                <SpendIcon />
              </View>
            </LinearGradient>
          </View>
        </View>
      </View>
    </ScreenFrame>
  );
}

function DonutChart() {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;

  return (
    <Svg height={128} viewBox="0 0 128 128" width={128}>
      <Circle cx={64} cy={64} fill="none" r={radius} stroke="#EDF2F7" strokeWidth={22} />
      <Circle
        cx={64}
        cy={64}
        fill="none"
        r={radius}
        stroke={colors.blue}
        strokeDasharray={`${circumference * 0.48} ${circumference}`}
        strokeLinecap="round"
        strokeWidth={22}
        transform="rotate(-90 64 64)"
      />
      <Circle
        cx={64}
        cy={64}
        fill="none"
        r={radius}
        stroke="#8B5CF6"
        strokeDasharray={`${circumference * 0.32} ${circumference}`}
        strokeDashoffset={-(circumference * 0.5)}
        strokeLinecap="round"
        strokeWidth={22}
        transform="rotate(-90 64 64)"
      />
      <Circle
        cx={64}
        cy={64}
        fill="none"
        r={radius}
        stroke="#10B981"
        strokeDasharray={`${circumference * 0.2} ${circumference}`}
        strokeDashoffset={-(circumference * 0.84)}
        strokeLinecap="round"
        strokeWidth={22}
        transform="rotate(-90 64 64)"
      />
    </Svg>
  );
}

function SpendIcon() {
  return (
    <Svg height={24} viewBox="0 0 24 24" width={22} fill="none">
      <Path
        d="M3.00488 3H21.0049C21.5572 3 22.0049 3.44772 22.0049 4V20C22.0049 20.5523 21.5572 21 21.0049 21H3.00488C2.4526 21 2.00488 20.5523 2.00488 20V4C2.00488 3.44772 2.4526 3 3.00488 3ZM20.0049 12H4.00488V19H20.0049V12ZM20.0049 8V5H4.00488V8H20.0049Z"
        fill="#002AFF"
      />
    </Svg>
  );
}

const journeyStyles = StyleSheet.create({
  stack: {
    alignSelf: 'center',
    gap: 24,
    marginTop: 24,
    paddingBottom: 22,
    width: '100%',
  },
  panel: {
    alignSelf: 'center',
    backgroundColor: colors.panel,
    borderRadius: 24,
    elevation: 3,
    paddingBottom: 24,
    paddingTop: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    width: '100%',
  },
  panelTitle: {
    color: colors.ink,
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 40,
    marginLeft: 28,
  },
  panelSubtitle: {
    color: '#6A7282',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 28,
    marginTop: -2,
    width: 296,
  },
  horizontalViewport: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  insightList: {
    gap: 12,
    paddingRight: 0,
  },
  insightCardBorder: {
    borderRadius: 16,
    height: 136,
    padding: 1,
    width: 108,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    flex: 1,
    padding: 15,
  },
  insightIconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  insightValue: {
    color: colors.ink,
    fontFamily: 'DMSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginTop: 18,
  },
  insightLabel: {
    color: '#4D4D4D',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  breakdownCard: {
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 20,
    minHeight: 208,
    paddingHorizontal: 20,
    paddingTop: 21,
  },
  sectionTitle: {
    color: '#101828',
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  breakdownBody: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  legend: {
    flex: 1,
    gap: 12,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 20,
  },
  legendDot: {
    borderRadius: 999,
    height: 12,
    marginRight: 8,
    width: 12,
  },
  legendLabel: {
    color: '#4D4D4D',
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
  },
  legendValue: {
    color: '#101828',
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  statList: {
    gap: 12,
    paddingRight: 0,
  },
  statCardBorder: {
    borderRadius: 16,
    height: 112,
    padding: 1,
    width: 168,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    flex: 1,
    padding: 15,
  },
  statLabel: {
    color: '#667085',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
  },
  statValue: {
    color: '#101828',
    fontFamily: 'DMSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginTop: 4,
  },
  statDescription: {
    color: '#A5A5A5',
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  spendBanner: {
    alignItems: 'center',
    backgroundColor: '#F1FFFF',
    borderRadius: 16,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
    minHeight: 88,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  spendLabel: {
    color: '#4D4D4D',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
  },
  spendValue: {
    color: colors.blue,
    fontFamily: 'DMSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginTop: 4,
  },
  spendIconBorder: {
    borderRadius: 14,
    height: 48,
    padding: 1,
    width: 48,
  },
  spendIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    flex: 1,
    justifyContent: 'center',
  },
});
