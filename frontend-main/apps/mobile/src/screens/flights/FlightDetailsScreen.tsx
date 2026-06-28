import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { RightArrowIcon } from '../../assets/icons';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';

const americanAirlinesLogo = require('../../../assets/images/american-airlines-logo 1.png');

const stops = [
  {
    airport: 'New York, USA (JFK)',
    airportName: 'John F. Kennedy International Airport',
    flightDuration: '30m',
    rowStyle: 'short',
    time: '10:30',
  },
  {
    airport: 'Chicago, USA (ORD)',
    airportName: "Chicago's O'Hare International Airport",
    flightDuration: '30m',
    layover: '1h 30m Layover',
    rowStyle: 'medium',
    time: '11:00',
  },
  {
    airport: 'Atlanta, USA (ATL)',
    airportName: 'Hartsfield-Jackson Atlanta International Airport (ATL)',
    flightDuration: '45m',
    layover: '1h Layover',
    rowStyle: 'long',
    time: '13:00',
  },
  {
    airport: 'Los Angeles, USA (LAX)',
    airportName: 'Los Angeles International Airport',
    rowStyle: 'last',
    time: '14:45',
  },
];

type FlightDetailsScreenProps = {
  notificationUnreadCount?: number;
  onBack: () => void;
  onOpenBoardingPass: () => void;
  onOpenChat: () => void;
  onOpenFlow?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenTrips?: () => void;
  onOpenWallet?: () => void;
  profileImageUri?: string | null;
};

export function FlightDetailsScreen({
  notificationUnreadCount = 0,
  onBack,
  onOpenBoardingPass,
  onOpenChat,
  onOpenFlow,
  onOpenNotifications,
  onOpenProfile,
  onOpenTrips,
  onOpenWallet,
  profileImageUri,
}: FlightDetailsScreenProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={flightDetailsStyles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={flightDetailsStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={flightDetailsStyles.header}>
          <Pressable
            accessibilityLabel="Back to home"
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              flightDetailsStyles.backButton,
              pressed && sharedStyles.pressedFeedback,
            ]}
          >
            <RightArrowIcon
              color="#FFFFFF"
              height={10}
              style={flightDetailsStyles.backArrow}
              width={14}
            />
          </Pressable>
          <Image
            resizeMode="cover"
            source={americanAirlinesLogo}
            style={flightDetailsStyles.airlineLogo}
          />
          <Text style={flightDetailsStyles.airlineName}>American Airlines</Text>
          <View style={flightDetailsStyles.bookingChip}>
            <Text style={flightDetailsStyles.bookingCode}>#35K69HX</Text>
          </View>
        </View>

        <View style={flightDetailsStyles.divider} />

        <DateMarker color={colors.blue} label="Wed 04 Mar" />

        <View style={flightDetailsStyles.timeline}>
          {stops.map((stop, index) => (
            <StopRow key={stop.airport} isLast={index === stops.length - 1} {...stop} />
          ))}
        </View>

        <DateMarker color="#E51B24" label="Wed 04 Mar" />

        <View style={flightDetailsStyles.bottomDivider} />
        <Pressable
          accessibilityRole="button"
          onPress={onOpenBoardingPass}
          style={({ pressed }) => [
            flightDetailsStyles.boardingButton,
            pressed && sharedStyles.pressedFeedback,
          ]}
        >
          <Text style={flightDetailsStyles.boardingButtonText}>Boarding Pass</Text>
        </Pressable>
      </ScrollView>

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
        source="flightDetails"
      />
    </SafeAreaView>
  );
}

function DateMarker({ color, label }: { color: string; label: string }) {
  return (
    <View style={flightDetailsStyles.dateRow}>
      <View style={[flightDetailsStyles.dateDot, { backgroundColor: color }]} />
      <Text style={flightDetailsStyles.dateText}>{label}</Text>
    </View>
  );
}

function StopRow({
  airport,
  airportName,
  flightDuration,
  isLast,
  layover,
  rowStyle,
  time,
}: {
  airport: string;
  airportName: string;
  flightDuration?: string;
  isLast: boolean;
  layover?: string;
  rowStyle: string;
  time: string;
}) {
  return (
    <View
      style={[
        flightDetailsStyles.stopRow,
        rowStyle === 'short' && flightDetailsStyles.stopRowShort,
        rowStyle === 'medium' && flightDetailsStyles.stopRowMedium,
        rowStyle === 'long' && flightDetailsStyles.stopRowLong,
        rowStyle === 'last' && flightDetailsStyles.stopRowLast,
      ]}
    >
      <Text numberOfLines={1} style={flightDetailsStyles.stopTime}>
        {time}
      </Text>
      <View style={flightDetailsStyles.stopContent}>
        <Text style={flightDetailsStyles.airport}>{airport}</Text>
        <Text style={flightDetailsStyles.airportName}>{airportName}</Text>
        {layover ? (
          <View style={flightDetailsStyles.layoverRow}>
            <ClockIcon />
            <Text style={flightDetailsStyles.layoverText}>{layover}</Text>
          </View>
        ) : null}
        {!isLast ? (
          <View style={flightDetailsStyles.flightSegment}>
            <LinearGradient
              colors={[colors.blue, colors.cyan]}
              end={{ x: 0.5, y: 1 }}
              start={{ x: 0.5, y: 0 }}
              style={[
                flightDetailsStyles.segmentLine,
                layover && flightDetailsStyles.segmentLineLayover,
              ]}
            />
            <Image
              resizeMode="cover"
              source={americanAirlinesLogo}
              style={flightDetailsStyles.segmentLogo}
            />
            <Text style={flightDetailsStyles.segmentAirline}>American Airlines</Text>
            <Text style={flightDetailsStyles.segmentDuration}>{flightDuration}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ClockIcon() {
  return (
    <Svg height={18} viewBox="0 0 24 24" width={18}>
      <Circle cx={12} cy={12} fill="none" r={8.5} stroke="#98A2B3" strokeWidth={2.4} />
      <Path
        d="M12 7.5V12l3 2"
        fill="none"
        stroke="#98A2B3"
        strokeLinecap="round"
        strokeWidth={2.4}
      />
    </Svg>
  );
}

const flightDetailsStyles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  content: {
    paddingBottom: 150,
    paddingHorizontal: 14,
    paddingTop: 45,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 40,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  backArrow: {
    transform: [{ rotate: '180deg' }],
  },
  airlineLogo: {
    height: 40,
    marginLeft: 40,
    overflow: 'hidden',
    width: 40,
  },
  airlineName: {
    color: '#000000',
    flex: 1,
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    marginLeft: 2,
  },
  bookingChip: {
    alignItems: 'center',
    borderColor: '#A7A7A7',
    borderRadius: 10,
    borderWidth: 0.5,
    height: 33,
    justifyContent: 'center',
    paddingHorizontal: 8,
    width: 88,
  },
  bookingCode: {
    color: '#000000',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  divider: {
    backgroundColor: '#A7A7A7',
    height: 1,
    marginTop: 20,
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 23,
  },
  dateDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dateText: {
    color: '#000000',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
  },
  timeline: {
    marginTop: 24,
  },
  stopRow: {
    flexDirection: 'row',
  },
  stopRowShort: {
    minHeight: 132,
  },
  stopRowMedium: {
    minHeight: 160,
  },
  stopRowLong: {
    minHeight: 168,
  },
  stopRowLast: {
    minHeight: 44,
  },
  stopTime: {
    color: '#000000',
    fontFamily: 'DMSans-Medium',
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 28,
    width: 50,
  },
  stopContent: {
    flex: 1,
    marginLeft: 16,
    minWidth: 0,
  },
  airport: {
    color: '#000000',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  airportName: {
    color: '#6A7282',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
  },
  layoverRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
  },
  layoverText: {
    color: '#99A1AF',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
  flightSegment: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 32,
    marginTop: 10,
    position: 'relative',
  },
  segmentLine: {
    height: 92,
    left: -44,
    position: 'absolute',
    top: -20,
    width: 2,
  },
  segmentLineLayover: {
    height: 78,
    top: -51,
  },
  segmentLogo: {
    height: 32,
    marginLeft: -11,
    overflow: 'hidden',
    width: 32,
  },
  segmentAirline: {
    color: '#000000',
    flex: 1,
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    marginLeft: 10,
  },
  segmentDuration: {
    color: '#6A7282',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
  },
  bottomDivider: {
    backgroundColor: '#A7A7A7',
    height: 1,
    marginTop: 29,
  },
  boardingButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 5,
    height: 50,
    justifyContent: 'center',
    marginTop: 24,
    width: 191,
  },
  boardingButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
