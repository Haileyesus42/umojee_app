import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { RightArrowIcon } from '../../assets/icons';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';

const departureDetails = [
  { icon: CalendarIcon, label: 'Date', value: 'March 4, 2026' },
  { icon: ClockIcon, label: 'Time', value: '10:30' },
  { icon: LocationIcon, label: 'Check-In', value: 'B22' },
];

const arrivalDetails = [
  { icon: CalendarIcon, label: 'Date', value: 'March 4, 2026' },
  { icon: ClockIcon, label: 'Time', value: '14:45' },
  { icon: LocationIcon, label: 'Check-In', value: 'C14' },
];

type FlightTrackerScreenProps = {
  notificationUnreadCount?: number;
  onBack: () => void;
  onOpenChat: () => void;
  onOpenFlow?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenTrips?: () => void;
  onOpenWallet?: () => void;
  profileImageUri?: string | null;
};

export function FlightTrackerScreen({
  notificationUnreadCount = 0,
  onBack,
  onOpenChat,
  onOpenFlow,
  onOpenNotifications,
  onOpenProfile,
  onOpenTrips,
  onOpenWallet,
  profileImageUri,
}: FlightTrackerScreenProps) {
  return (
    <SafeAreaView edges={['left', 'right']} style={trackerStyles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={trackerStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={trackerStyles.hero}>
          <View style={trackerStyles.heroHeader}>
            <View style={trackerStyles.flightTitleBlock}>
              <View style={trackerStyles.flightNameRow}>
                <TitleFlightIcon />
                <Text style={trackerStyles.flightName}>American Airlines</Text>
              </View>
              <Text style={trackerStyles.flightNumber}>Flight AA2451</Text>
            </View>
            <View style={trackerStyles.statusChip}>
              <Text style={trackerStyles.statusText}>In Air</Text>
            </View>
          </View>

          <View style={trackerStyles.routeHero}>
            <View style={trackerStyles.routeEndpoint}>
              <Text style={trackerStyles.routeCode}>JFK</Text>
              <Text style={trackerStyles.routeCity}>New York City</Text>
            </View>
            <View style={trackerStyles.routeCenter}>
              <View style={trackerStyles.routeLine}>
                <View style={trackerStyles.routeDash} />
                <View style={trackerStyles.routePlaneDot}>
                  <MiniPlaneIcon />
                </View>
              </View>
              <Text style={trackerStyles.routeStatus}>In Flight</Text>
            </View>
            <View style={trackerStyles.routeEndpoint}>
              <Text style={trackerStyles.routeCode}>LAX</Text>
              <Text style={trackerStyles.routeCity}>Los Angeles</Text>
            </View>
          </View>
        </View>

        <View style={trackerStyles.progressSection}>
          <View style={trackerStyles.progressHeader}>
            <Text style={trackerStyles.sectionLabel}>Flight Progress</Text>
            <Text style={trackerStyles.progressPercent}>65%</Text>
          </View>
          <View style={trackerStyles.progressTrack}>
            <LinearGradient
              colors={[colors.blue, colors.cyan]}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={trackerStyles.progressFill}
            />
          </View>
        </View>

        <View style={trackerStyles.body}>
          <FlightInfoSection details={departureDetails} title="Departure" />
          <View style={trackerStyles.divider} />
          <FlightInfoSection details={arrivalDetails} title="Arrival" />
          <View style={[trackerStyles.divider, trackerStyles.summaryDivider]} />

          <View style={trackerStyles.summaryCards}>
            <SummaryCard label="Terminal" value="Terminal 4" />
            <SummaryCard label="Class" value="Economy" />
            <SummaryCard icon={<UsersIcon />} label="" value="2" />
          </View>

          <Text style={trackerStyles.updateText}>Updates every 5 minutes</Text>
        </View>
      </ScrollView>

      <Pressable
        accessibilityLabel="Back"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [trackerStyles.backButton, pressed && sharedStyles.pressedFeedback]}
      >
        <RightArrowIcon color="#FFFFFF" height={15} style={trackerStyles.backArrow} width={15} />
      </Pressable>

      <FooterWithMenu
        notificationUnreadCount={notificationUnreadCount}
        onOpenChat={onOpenChat}
        onOpenFlow={onOpenFlow}
        onOpenHome={onBack}
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={onOpenProfile}
        onOpenTrips={onOpenTrips}
        onOpenWallet={onOpenWallet}
        profileImageUri={profileImageUri}
        source="flightTracker"
      />
    </SafeAreaView>
  );
}

function FlightInfoSection({
  details,
  title,
}: {
  details: {
    icon: (props: { style?: object }) => ReactNode;
    label: string;
    value: string;
  }[];
  title: string;
}) {
  return (
    <View style={trackerStyles.infoSection}>
      <Text style={trackerStyles.sectionLabel}>{title}</Text>
      <View style={trackerStyles.infoList}>
        {details.map(({ icon: Icon, label, value }) => (
          <View key={`${label}-${value}`} style={trackerStyles.infoRow}>
            <Icon style={trackerStyles.infoIcon} />
            <View>
              <Text style={trackerStyles.infoLabel}>{label}</Text>
              <Text style={trackerStyles.infoValue}>{value}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryCard({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <View style={trackerStyles.summaryCard}>
      {icon ? icon : <Text style={trackerStyles.summaryLabel}>{label}</Text>}
      <Text style={trackerStyles.summaryValue}>{value}</Text>
    </View>
  );
}

function TitleFlightIcon() {
  return (
    <Svg height={20} viewBox="0 0 20 20" width={20}>
      <Path
        d="M14.8333 16L13.3333 9.16667L16.25 6.25C17.5 5 17.9167 3.33333 17.5 2.5C16.6667 2.08333 15 2.5 13.75 3.75L10.8333 6.66667L4 5.16667C3.58333 5.08333 3.25 5.25 3.08333 5.58333L2.83333 6C2.66667 6.41667 2.75 6.83333 3.08333 7.08333L7.5 10L5.83333 12.5H3.33333L2.5 13.3333L5 15L6.66667 17.5L7.5 16.6667V14.1667L10 12.5L12.9167 16.9167C13.1667 17.25 13.5833 17.3333 14 17.1667L14.4167 17C14.75 16.75 14.9167 16.4167 14.8333 16Z"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.66667}
      />
    </Svg>
  );
}

function MiniPlaneIcon() {
  return (
    <Svg height={10} viewBox="0 0 20 20" width={10}>
      <Path
        d="M14.8333 16L13.3333 9.16667L16.25 6.25C17.5 5 17.9167 3.33333 17.5 2.5C16.6667 2.08333 15 2.5 13.75 3.75L10.8333 6.66667L4 5.16667C3.58333 5.08333 3.25 5.25 3.08333 5.58333L2.83333 6C2.66667 6.41667 2.75 6.83333 3.08333 7.08333L7.5 10L5.83333 12.5H3.33333L2.5 13.3333L5 15L6.66667 17.5L7.5 16.6667V14.1667L10 12.5L12.9167 16.9167C13.1667 17.25 13.5833 17.3333 14 17.1667L14.4167 17C14.75 16.75 14.9167 16.4167 14.8333 16Z"
        fill="none"
        stroke={colors.panel}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

function CalendarIcon({ style }: { style?: object }) {
  return (
    <Svg height={16} style={style} viewBox="0 0 24 24" width={16}>
      <Path
        d="M7 3v3M17 3v3M4.5 9h15M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z"
        fill="none"
        stroke="#6A7282"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function ClockIcon({ style }: { style?: object }) {
  return (
    <Svg height={16} style={style} viewBox="0 0 24 24" width={16}>
      <Circle cx={12} cy={12} fill="none" r={9} stroke="#6A7282" strokeWidth={2} />
      <Path d="M12 7v5l3 2" fill="none" stroke="#6A7282" strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

function LocationIcon({ style }: { style?: object }) {
  return (
    <Svg height={16} style={style} viewBox="0 0 24 24" width={16}>
      <Path
        d="M19 10.5c0 4.8-5.4 9.4-6.6 10.4a.7.7 0 0 1-.8 0C10.4 19.9 5 15.3 5 10.5a7 7 0 0 1 14 0Z"
        fill="none"
        stroke="#6A7282"
        strokeWidth={2}
      />
      <Circle cx={12} cy={10.5} fill="none" r={2.2} stroke="#6A7282" strokeWidth={2} />
    </Svg>
  );
}

function UsersIcon() {
  return (
    <Svg height={14} viewBox="0 0 24 24" width={14}>
      <Path
        d="M16 19v-1.2a3.8 3.8 0 0 0-3.8-3.8H7.8A3.8 3.8 0 0 0 4 17.8V19M10 10.5A3.5 3.5 0 1 0 10 3.5a3.5 3.5 0 0 0 0 7ZM20 19v-1a3.7 3.7 0 0 0-2.8-3.6M15.5 3.8a3.5 3.5 0 0 1 0 6.8"
        fill="none"
        stroke="#6A7282"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

const trackerStyles = StyleSheet.create({
  screen: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  content: {
    paddingBottom: 150,
  },
  hero: {
    backgroundColor: 'rgba(0, 42, 255, 0.16)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    height: 205,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingTop: 57,
  },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 46,
    justifyContent: 'center',
    minWidth: 0,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 20,
    height: 39,
    justifyContent: 'center',
    left: 30,
    position: 'absolute',
    top: 61,
    width: 39,
    zIndex: 4,
  },
  backArrow: {
    transform: [{ rotate: '180deg' }],
  },
  flightTitleBlock: {
    alignItems: 'center',
    height: 46,
    justifyContent: 'flex-start',
    width: 190,
  },
  flightNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 28,
  },
  flightName: {
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: 20,
    lineHeight: 28,
    marginLeft: 12,
  },
  flightNumber: {
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.9,
  },
  statusChip: {
    alignItems: 'center',
    backgroundColor: '#FFD600',
    borderRadius: 8,
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 12,
    position: 'absolute',
    right: 17,
    top: 12,
  },
  statusText: {
    color: '#666666',
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  routeHero: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    marginTop: 24,
  },
  routeEndpoint: {
    alignItems: 'center',
    width: 128,
  },
  routeCode: {
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: 30,
    lineHeight: 36,
  },
  routeCity: {
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    opacity: 0.9,
    textAlign: 'center',
    width: 128,
  },
  routeCenter: {
    alignItems: 'center',
    height: 25,
    marginTop: 15,
    width: 104,
  },
  routeLine: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    flexDirection: 'row',
    height: 2,
    width: 80,
  },
  routeDash: {
    flex: 1,
  },
  routePlaneDot: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    height: 10,
    justifyContent: 'center',
    marginTop: -9,
    width: 10,
  },
  routeStatus: {
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
    opacity: 0.8,
  },
  progressSection: {
    height: 80,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: '#6A7282',
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 16,
  },
  progressPercent: {
    color: '#101828',
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 16,
  },
  progressTrack: {
    backgroundColor: 'rgba(3,2,19,0.2)',
    borderRadius: 999,
    height: 6,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 999,
    height: 6,
    width: '65%',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 31.9,
  },
  infoSection: {
    height: 160,
  },
  infoList: {
    gap: 12,
    marginTop: 28,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 36,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    color: '#6A7282',
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 16,
  },
  infoValue: {
    color: '#101828',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    height: 1,
    marginBottom: 20,
    marginTop: 20,
  },
  summaryDivider: {
    marginBottom: 0,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    flex: 1,
    height: 63,
    justifyContent: 'center',
  },
  summaryLabel: {
    color: '#6A7282',
    fontFamily: 'DM Sans',
    fontSize: 10,
    lineHeight: 15,
  },
  summaryValue: {
    color: '#101828',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  updateText: {
    color: '#4A5565',
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});
