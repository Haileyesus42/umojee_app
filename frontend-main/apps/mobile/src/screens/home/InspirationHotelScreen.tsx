import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RightArrowIcon } from '../../assets/icons';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';
import FavoriteIcon from '../../../assets/icons/inspiration-2/favorite.svg';
import BedSleepIcon from '../../../assets/icons/inspiration-3/bed-sleep.svg';
import BedSleepSmallIcon from '../../../assets/icons/inspiration-3/bed-sleep-small.svg';

const resortImage = require('../../../assets/images/under-the-stars-resort.jpg');

type InspirationHotelScreenProps = {
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

export function InspirationHotelScreen({
  notificationUnreadCount = 0,
  onBack,
  onOpenChat,
  onOpenFlow,
  onOpenNotifications,
  onOpenProfile,
  onOpenTrips,
  onOpenWallet,
  profileImageUri,
}: InspirationHotelScreenProps) {
  return (
    <SafeAreaView edges={['left', 'right']} style={hotelStyles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={hotelStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={hotelStyles.scroll}
      >
        <View style={hotelStyles.scrollPage}>
          <View style={hotelStyles.mapLayer}>
            <Svg
              height="100%"
              style={StyleSheet.absoluteFillObject}
              viewBox="0 0 402 874"
              width="100%"
            >
              <Path
                d="M47 94C74 124 105 133 136 129C163 126 153 115 177 112C212 108 233 132 249 167C270 214 292 241 313 229C330 219 320 189 320 179L351 250C306 293 286 339 281 384L322 449C335 486 346 522 351 549"
                fill="none"
                stroke="#D9D9D9"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.25}
              />
              <Path
                d="M80 200C103 231 111 272 97 308C88 331 94 352 112 370C122 381 135 389 150 397L120 449"
                fill="none"
                stroke="#D9D9D9"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.25}
              />
            </Svg>

            <HotelMarker left={80} top={128} />
            <HotelMarker left={298} top={160} />
            <HotelMarker left={128} top={208} />
            <HotelMarker left={64} top={240} />
            <HotelMarker active left={173} top={288} />
            <HotelMarker left={282} top={450} />
            <HotelMarker left={314} top={546} />
          </View>

          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              hotelStyles.backButton,
              pressed && sharedStyles.pressedFeedback,
            ]}
          >
            <RightArrowIcon style={hotelStyles.backIcon} />
          </Pressable>

          <LinearGradient
            colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.9)']}
            locations={[0, 0.5, 1]}
            style={hotelStyles.footer}
          >
            <Text style={hotelStyles.heading}>Hotels in Zakynthos</Text>

            <View style={hotelStyles.hotelCard}>
              <Image source={resortImage} style={hotelStyles.resortImage} />

              <View style={hotelStyles.hotelInfo}>
                <Text style={hotelStyles.resortName}>Under The Stars Resort</Text>

                <View style={hotelStyles.ratingRow}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <FavoriteIcon height={14} key={index} width={14} />
                  ))}
                </View>

                <View style={hotelStyles.actionRow}>
                  <Pressable
                    accessibilityLabel="View hotel details"
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      hotelStyles.detailsButton,
                      pressed && sharedStyles.pressedFeedback,
                    ]}
                  >
                    <Text style={hotelStyles.detailsText}>Details</Text>
                  </Pressable>
                  <Text style={hotelStyles.priceText}>from $199 / night</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
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
        source="inspirationHotel"
      />
    </SafeAreaView>
  );
}

function HotelMarker({ active, left, top }: { active?: boolean; left: number; top: number }) {
  const Icon = active ? BedSleepIcon : BedSleepSmallIcon;

  return (
    <View
      style={[
        hotelStyles.marker,
        active ? hotelStyles.markerActive : hotelStyles.markerDefault,
        { left, top },
      ]}
    >
      <Icon height={active ? 24 : 20} width={active ? 24 : 20} />
    </View>
  );
}

const hotelStyles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 122,
  },
  scrollPage: {
    height: 814,
    position: 'relative',
  },
  mapLayer: {
    alignSelf: 'center',
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 402,
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  markerDefault: {
    backgroundColor: '#4A5565',
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  markerActive: {
    backgroundColor: colors.blue,
    borderRadius: 28,
    height: 56,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.11,
    shadowRadius: 18.1,
    width: 56,
    elevation: 8,
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
    zIndex: 3,
  },
  backIcon: {
    color: '#FFFFFF',
    height: 15,
    transform: [{ rotate: '180deg' }],
    width: 15,
  },
  footer: {
    bottom: 0,
    height: 280,
    left: 0,
    paddingHorizontal: 24,
    paddingTop: 32,
    position: 'absolute',
    right: 0,
  },
  heading: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  hotelCard: {
    flexDirection: 'row',
    gap: 16,
    height: 98,
    marginTop: 15,
  },
  resortImage: {
    borderRadius: 14,
    height: 96,
    width: 96,
  },
  hotelInfo: {
    flex: 1,
    paddingTop: 2,
  },
  resortName: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginTop: 14,
  },
  detailsButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 100,
  },
  detailsText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  priceText: {
    color: '#FFFFFF',
    flexShrink: 1,
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});
