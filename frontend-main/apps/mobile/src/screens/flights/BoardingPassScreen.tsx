import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { RightArrowIcon } from '../../assets/icons';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';

const americanAirlinesLogo = require('../../../assets/images/american-airlines-logo 1.png');

const barcodeBars = [
  2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 1, 4, 2, 1, 3, 2, 1, 1, 4, 3, 1, 2, 1, 4, 1, 1, 3, 2, 2, 1, 4, 1,
  3, 1, 2, 4, 1, 1, 3, 2, 1, 4, 2, 1, 1, 3, 4, 1, 2, 1, 3, 2, 1, 4,
];

type BoardingPassScreenProps = {
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

export function BoardingPassScreen({
  notificationUnreadCount = 0,
  onBack,
  onOpenChat,
  onOpenFlow,
  onOpenNotifications,
  onOpenProfile,
  onOpenTrips,
  onOpenWallet,
  profileImageUri,
}: BoardingPassScreenProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={boardingStyles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={boardingStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={boardingStyles.passCard}>
          <View style={boardingStyles.header}>
            <Pressable
              accessibilityLabel="Back to flight details"
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [
                boardingStyles.backButton,
                pressed && sharedStyles.pressedFeedback,
              ]}
            >
              <RightArrowIcon
                color="#FFFFFF"
                height={10}
                style={boardingStyles.backArrow}
                width={14}
              />
            </Pressable>
            <Image
              resizeMode="cover"
              source={americanAirlinesLogo}
              style={boardingStyles.airlineLogo}
            />
            <Text style={boardingStyles.airlineName}>American Airlines</Text>
            <View style={boardingStyles.bookingChip}>
              <Text style={boardingStyles.bookingCode}>#35K69HX</Text>
            </View>
          </View>

          <View style={boardingStyles.routeRow}>
            <View style={boardingStyles.routeSide}>
              <Text style={boardingStyles.airportCode}>JFK</Text>
              <Text numberOfLines={1} style={boardingStyles.city}>
                New York, USA
              </Text>
              <Text style={boardingStyles.time}>10:30</Text>
            </View>
            <View style={boardingStyles.routeCenter}>
              <View style={boardingStyles.planeRule}>
                <View style={boardingStyles.routeLine} />
                <PlaneIcon />
                <View style={boardingStyles.routeLine} />
              </View>
              <Text style={boardingStyles.duration}>04h 15m</Text>
              <Text style={boardingStyles.stops}>2 stops</Text>
            </View>
            <View style={[boardingStyles.routeSide, boardingStyles.routeSideRight]}>
              <Text style={boardingStyles.airportCode}>LAX</Text>
              <Text numberOfLines={1} style={boardingStyles.city}>
                Los Angeles, USA
              </Text>
              <Text style={boardingStyles.time}>14:45</Text>
            </View>
          </View>

          <View style={boardingStyles.solidDivider} />
          <View style={boardingStyles.routeCutoutPair}>
            <View style={boardingStyles.routeCutoutLeft} />
            <View style={boardingStyles.routeCutoutRight} />
          </View>

          <InfoRow leftLabel="Check-In" leftValue="B22" rightLabel="Gate" rightValue="1" />
          <InfoRow leftLabel="Seats" leftValue="1A, 1B" rightLabel="Terminal" rightValue="4" />
          <InfoRow
            leftLabel="Seat Class"
            leftValue="Economy"
            rightLabel="Date"
            rightValue="04 March 2026"
          />

          <View style={boardingStyles.cutoutPair}>
            <View style={boardingStyles.cutoutLeft} />
            <View style={boardingStyles.cutoutRight} />
          </View>
          <View style={boardingStyles.passengerBlock}>
            <Text style={boardingStyles.passengerName}>John Doe</Text>
            <Text style={boardingStyles.passengerLabel}>Passenger</Text>
          </View>

          <Text style={boardingStyles.ticketCode}>Ticket Code: #35K69HX0011</Text>
          <Barcode />
        </View>

        <View style={boardingStyles.downloadPanel}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              boardingStyles.downloadButton,
              pressed && sharedStyles.pressedFeedback,
            ]}
          >
            <Text style={boardingStyles.downloadButtonText}>Download E-Ticket</Text>
          </Pressable>
        </View>
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
        source="boardingPass"
      />
    </SafeAreaView>
  );
}

function InfoRow({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}) {
  return (
    <View style={boardingStyles.infoSection}>
      <View>
        <Text style={boardingStyles.infoValue}>{leftValue}</Text>
        <Text style={boardingStyles.infoLabel}>{leftLabel}</Text>
      </View>
      <View style={boardingStyles.infoRight}>
        <Text style={boardingStyles.infoValue}>{rightValue}</Text>
        <Text style={boardingStyles.infoLabel}>{rightLabel}</Text>
      </View>
    </View>
  );
}

function PlaneIcon() {
  return (
    <Svg height={29} style={boardingStyles.planeIcon} viewBox="0 0 29 29" width={29}>
      <Path
        d="M13.3173 21.8025L17.0885 15.9099H21.2133C22.9811 15.9099 24.4542 15.026 24.7488 14.1421C24.4542 13.2583 22.9811 12.3744 21.2133 12.3744H17.0885L13.3173 6.48181C13.0816 6.12826 12.728 6.01041 12.3745 6.12826L11.9031 6.24611C11.4906 6.42289 11.2549 6.77644 11.3138 7.18892L12.3745 12.3744L9.4282 12.9636L7.66043 11.1959H6.48192L7.07118 14.1421L6.48192 17.0884H7.66043L9.4282 15.3206L12.3745 15.9099L11.3138 21.0954C11.2549 21.5078 11.4906 21.8614 11.9031 22.0382L12.3156 22.2149C12.728 22.2739 13.0816 22.156 13.3173 21.8025Z"
        fill="none"
        stroke="#000000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.66667}
      />
    </Svg>
  );
}

function Barcode() {
  let cursor = 0;
  const totalWidth = barcodeBars.reduce(
    (width, barWidth, index) => width + barWidth + (index % 3 === 0 ? 2 : 1),
    0,
  );
  const offsetX = Math.max((238 - totalWidth) / 2, 0);

  return (
    <Svg height={80} style={boardingStyles.barcode} viewBox="0 0 238 80" width={238}>
      <G x={offsetX}>
        {barcodeBars.map((width, index) => {
          const x = cursor;
          cursor += width + (index % 3 === 0 ? 2 : 1);

          return (
            <Rect fill="#000000" height={80} key={`${index}-${x}`} width={width} x={x} y={0} />
          );
        })}
      </G>
    </Svg>
  );
}

const boardingStyles = StyleSheet.create({
  screen: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  content: {
    paddingBottom: 160,
    paddingHorizontal: 10,
    paddingTop: 16,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 15,
    flexShrink: 0,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  backArrow: {
    transform: [{ rotate: '180deg' }],
  },
  passCard: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 12,
    height: 778,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 35,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 60,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
    marginHorizontal: -16,
    minWidth: 0,
  },
  airlineLogo: {
    flexShrink: 0,
    height: 40,
    marginLeft: 27,
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
    minWidth: 0,
  },
  bookingChip: {
    alignItems: 'center',
    borderColor: '#A7A7A7',
    borderRadius: 10,
    borderWidth: 0.5,
    flexShrink: 0,
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
  routeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    height: 90,
    marginTop: 50,
  },
  routeSide: {
    flex: 1,
    minWidth: 0,
  },
  routeSideRight: {
    alignItems: 'flex-end',
    flex: 1.15,
  },
  airportCode: {
    color: '#000000',
    fontFamily: 'DMSans-Bold',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.64,
    lineHeight: 38.4,
  },
  city: {
    color: '#999999',
    fontFamily: 'DM Sans',
    fontSize: 13,
    lineHeight: 19.5,
    marginTop: 4,
    maxWidth: 106,
  },
  time: {
    color: '#000000',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: 4,
  },
  routeCenter: {
    alignItems: 'center',
    paddingTop: 2,
    width: 117,
  },
  planeRule: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  routeLine: {
    backgroundColor: '#E0E0E0',
    height: 2,
    width: 43,
  },
  duration: {
    color: '#000000',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19.5,
    marginTop: 8,
  },
  stops: {
    color: '#999999',
    fontFamily: 'DM Sans',
    fontSize: 11,
    lineHeight: 16.5,
    marginTop: 2,
  },
  solidDivider: {
    backgroundColor: '#DBD9D9',
    height: 1,
    marginBottom: 20,
    marginTop: 12,
  },
  routeCutoutPair: {
    height: 0,
    position: 'relative',
    zIndex: 2,
  },
  routeCutoutLeft: {
    backgroundColor: '#EEF6FA',
    borderRadius: 16,
    height: 32,
    left: -40,
    position: 'absolute',
    top: -37,
    width: 32,
  },
  routeCutoutRight: {
    backgroundColor: '#F6E7D7',
    borderRadius: 16,
    height: 32,
    position: 'absolute',
    right: -40,
    top: -37,
    width: 32,
  },
  infoSection: {
    borderBottomColor: '#DBD9D9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 90,
    paddingBottom: 20,
    paddingTop: 20,
  },
  infoRight: {
    alignItems: 'flex-end',
  },
  infoValue: {
    color: '#000000',
    fontFamily: 'DMSans-Bold',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26.4,
  },
  infoLabel: {
    color: '#999999',
    fontFamily: 'DM Sans',
    fontSize: 13,
    lineHeight: 19.5,
    marginTop: 4,
  },
  cutoutPair: {
    height: 0,
    position: 'relative',
    zIndex: 2,
  },
  cutoutLeft: {
    backgroundColor: '#EEF6FA',
    borderRadius: 16,
    height: 32,
    left: -40,
    position: 'absolute',
    top: -56,
    width: 32,
  },
  cutoutRight: {
    backgroundColor: '#F6E7D7',
    borderRadius: 16,
    height: 32,
    position: 'absolute',
    right: -40,
    top: -56,
    width: 32,
  },
  passengerBlock: {
    alignItems: 'center',
    borderBottomColor: '#DBD9D9',
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: '#DBD9D9',
    borderTopWidth: 1,
    height: 104,
    marginHorizontal: -24,
    paddingTop: 25,
  },
  passengerName: {
    color: '#000000',
    fontFamily: 'DMSans-Medium',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 30,
  },
  passengerLabel: {
    color: '#999999',
    fontFamily: 'DM Sans',
    fontSize: 13,
    lineHeight: 19.5,
    marginTop: 4,
  },
  ticketCode: {
    color: '#000000',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: 24,
    textAlign: 'center',
  },
  barcode: {
    alignSelf: 'center',
    marginTop: 12,
  },
  planeIcon: {
    marginHorizontal: -2,
    marginTop: -4,
  },
  downloadPanel: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 12,
    height: 110,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingTop: 25,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 60,
  },
  downloadButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
});
