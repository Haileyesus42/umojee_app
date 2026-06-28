import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RightArrowIcon, TimeLineIcon } from '../../assets/icons';
import { Header } from '../../components/layout/Header';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';
import LocationIcon from '../../../assets/icons/location-icon.svg';
import ZigzagArrowIcon from '../../../assets/icons/zigzag_arrow.svg';

const headingFireIcon = require('../../../assets/icons/trending_icons/Fire.png');

const trendingActivities = [
  {
    id: 'navagio-viewpoint',
    image: require('../../../assets/images/inspiration_gallery/navagio-beach.png'),
    name: 'Navagio Beach Viewpoint',
    openHours: 'Open 08:00 - 20:00',
    visits: '12.4K',
  },
  {
    id: 'blue-caves',
    image: require('../../../assets/images/inspiration_gallery/rock-arch.png'),
    name: 'Blue Caves Boat Tour',
    openHours: 'Open 09:00 - 18:30',
    visits: '9.8K',
  },
  {
    id: 'porto-limnionas',
    image: require('../../../assets/images/inspiration_gallery/cliffside-beach.png'),
    name: 'Porto Limnionas',
    openHours: 'Open 07:30 - 19:30',
    visits: '7.2K',
  },
  {
    id: 'town-night-walk',
    image: require('../../../assets/images/inspiration_gallery/greek-buildings.png'),
    name: 'Zakynthos Town Night Walk',
    openHours: 'Open 18:00 - 02:00',
    visits: '6.5K',
  },
  {
    id: 'marathonisi',
    image: require('../../../assets/images/inspiration_gallery/turquoise-water.png'),
    name: 'Turtle Spotting Marathonisi',
    openHours: 'Open 09:00 - 17:00',
    visits: '8.1K',
  },
  {
    id: 'gerakas-beach',
    image: require('../../../assets/images/inspiration_gallery/sea-turtle.png'),
    name: 'Gerakas Beach',
    openHours: 'Open 08:00 - 19:00',
    visits: '5.9K',
  },
  {
    id: 'cameo-island',
    image: require('../../../assets/images/inspiration_gallery/shipwreck-shore.png'),
    name: 'Cameo Island Bridge',
    openHours: 'Open 10:00 - 22:00',
    visits: '6.8K',
  },
  {
    id: 'keri-lighthouse',
    image: require('../../../assets/images/inspiration_gallery/golden-sunset.png'),
    name: 'Keri Lighthouse Sunset',
    openHours: 'Open 17:00 - 21:00',
    visits: '7.7K',
  },
  {
    id: 'xigia-beach',
    image: require('../../../assets/images/inspiration_gallery/white-cliff.png'),
    name: 'Xigia Sulfur Beach',
    openHours: 'Open 08:30 - 18:30',
    visits: '4.6K',
  },
  {
    id: 'bohali-viewpoint',
    image: require('../../../assets/images/inspiration_gallery/blue-caves.png'),
    name: 'Bohali Viewpoint',
    openHours: 'Open 16:00 - 23:00',
    visits: '5.2K',
  },
];

type InspirationTrendingScreenProps = {
  notificationUnreadCount?: number;
  onBack: () => void;
  onOpenChat: () => void;
  onOpenFlow?: () => void;
  onOpenHome?: () => void;
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenTrips?: () => void;
  onOpenWallet?: () => void;
  profileImageUri?: string | null;
};

export function InspirationTrendingScreen({
  notificationUnreadCount = 2,
  onBack,
  onOpenChat,
  onOpenFlow,
  onOpenHome,
  onOpenMenu,
  onOpenNotifications,
  onOpenProfile,
  onOpenTrips,
  onOpenWallet,
  profileImageUri,
}: InspirationTrendingScreenProps) {
  return (
    <SafeAreaView edges={['left', 'right']} style={trendingStyles.screen}>
      <SafeAreaView edges={['top']} style={sharedStyles.headerSafeArea}>
        <Header
          notificationUnreadCount={notificationUnreadCount}
          onOpenHome={onOpenHome ?? (() => undefined)}
          onOpenNotifications={onOpenNotifications ?? (() => undefined)}
        />
      </SafeAreaView>

      <ScrollView
        bounces={false}
        contentContainerStyle={trendingStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={trendingStyles.heroRow}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              trendingStyles.backButton,
              pressed && sharedStyles.pressedFeedback,
            ]}
          >
            <RightArrowIcon style={trendingStyles.backIcon} />
          </Pressable>

          <View style={trendingStyles.heroCopy}>
            <Text style={trendingStyles.title}>Trending in Zakynthos</Text>
          </View>
          <Image source={headingFireIcon} style={trendingStyles.flameIcon} />
        </View>
        <Text style={trendingStyles.subtitle}>
          {"What everyone's loving lately? Scroll and explore!"}
        </Text>

        <View style={trendingStyles.divider} />

        <View style={trendingStyles.list}>
          {trendingActivities.map((activity, index) => (
            <ActivityCard activity={activity} index={index} key={activity.id} />
          ))}
        </View>
      </ScrollView>

      <FooterWithMenu
        notificationUnreadCount={notificationUnreadCount}
        onOpenChat={onOpenChat}
        onOpenFlow={onOpenFlow}
        onOpenHome={onOpenHome}
        onOpenMenu={onOpenMenu}
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={onOpenProfile}
        onOpenTrips={onOpenTrips}
        onOpenWallet={onOpenWallet}
        profileImageUri={profileImageUri}
        source="inspirationTrending"
      />
    </SafeAreaView>
  );
}

function ActivityCard({
  activity,
  index,
}: {
  activity: (typeof trendingActivities)[number];
  index: number;
}) {
  return (
    <View style={trendingStyles.activityCard}>
      <View style={trendingStyles.rankBadge}>
        <Text style={trendingStyles.rankText}>{index + 1}</Text>
      </View>
      <Image source={activity.image} style={trendingStyles.activityImage} />
      <View style={trendingStyles.activityCopy}>
        <Text numberOfLines={1} style={trendingStyles.activityName}>
          {activity.name}
        </Text>
        <View style={trendingStyles.metaRow}>
          <ZigzagArrowIcon height={11} width={11} />
          <Text style={trendingStyles.metaStrong}>{activity.visits}</Text>
          <Text style={trendingStyles.metaText}>visited last month</Text>
        </View>
        <View style={trendingStyles.metaRow}>
          <TimeLineIcon height={10} width={10} />
          <Text style={trendingStyles.metaText}>{activity.openHours}</Text>
        </View>
      </View>
      <Pressable
        accessibilityLabel={`Open ${activity.name} in Maps`}
        accessibilityRole="button"
        style={({ pressed }) => [trendingStyles.mapButton, pressed && sharedStyles.pressedFeedback]}
      >
        <LocationIcon height={16} width={16} />
      </Pressable>
    </View>
  );
}

const trendingStyles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  content: {
    minHeight: 1204,
    paddingBottom: 142,
    paddingTop: 29,
  },
  heroRow: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 20,
    height: 39,
    justifyContent: 'center',
    width: 39,
  },
  backIcon: {
    color: '#FFFFFF',
    height: 15,
    transform: [{ rotate: '180deg' }],
    width: 15,
  },
  heroCopy: {
    marginLeft: 22,
    width: 182,
  },
  title: {
    color: colors.ink,
    fontFamily: 'DMSans-Bold',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  subtitle: {
    alignSelf: 'center',
    color: colors.ink,
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
    marginTop: 4,
    paddingLeft: 22,
    width: 244,
  },
  flameIcon: {
    height: 45,
    marginLeft: 38,
    width: 45,
  },
  divider: {
    backgroundColor: '#E5E7EB',
    height: 1,
    marginHorizontal: 20,
    marginTop: 18,
  },
  list: {
    gap: 10,
    marginTop: 19,
    paddingHorizontal: 16,
  },
  activityCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    height: 84,
    paddingLeft: 11,
    paddingRight: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  rankBadge: {
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    width: 21,
  },
  rankText: {
    color: colors.blue,
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  activityImage: {
    borderRadius: 14,
    height: 60,
    marginLeft: 10,
    width: 60,
  },
  activityCopy: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  activityName: {
    color: colors.ink,
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  metaStrong: {
    color: colors.ink,
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  metaText: {
    color: '#697282',
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  mapButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginLeft: 10,
    width: 38,
  },
});
