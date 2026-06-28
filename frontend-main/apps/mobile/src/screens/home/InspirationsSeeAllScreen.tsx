import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterIcon, RightArrowIcon, SearchIcon } from '../../assets/icons';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';

const trendingFireIcon = require('../../../assets/icons/trending_icons/Fire.png');
const trendingMainBubbleIcon = require('../../../assets/icons/trending_icons/Main-Bubble.png');
const trendingBubble2Icon = require('../../../assets/icons/trending_icons/Bubble-2.png');
const trendingBubble3Icon = require('../../../assets/icons/trending_icons/Bubble-3.png');

export const destinationCards = [
  {
    id: 'zakynthos',
    image: require('../../../assets/images/destinations/zakynothos.jpg'),
    title: 'Zakynthos',
    description:
      'The #1 for Greece. Stunning islands covered with trees, sky blue seas and sandy beaches. Check it out',
  },
  {
    id: 'paris',
    image: require('../../../assets/images/destinations/paris.jpg'),
    title: 'Paris',
    description:
      'A top destination for city lovers. Historic landmarks, cozy cafes, elegant streets and unforgettable vibes. Explore now',
  },
  {
    id: 'tokyo',
    image: require('../../../assets/images/destinations/tokyo.jpg'),
    title: 'Tokyo',
    description:
      'A must-visit for modern culture. Bright streets, unique traditions, incredible food and nonstop energy. Discover more',
  },
];

type InspirationsSeeAllScreenProps = {
  notificationUnreadCount?: number;
  onBack: () => void;
  onOpenChat: () => void;
  onOpenExplore: (destinationId: string) => void;
  onOpenFlow?: () => void;
  onOpenTrending: (destinationId: string) => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenTrips?: () => void;
  onOpenWallet?: () => void;
  profileImageUri?: string | null;
};

export function InspirationsSeeAllScreen({
  notificationUnreadCount = 0,
  onBack,
  onOpenChat,
  onOpenExplore,
  onOpenFlow,
  onOpenTrending,
  onOpenNotifications,
  onOpenProfile,
  onOpenTrips,
  onOpenWallet,
  profileImageUri,
}: InspirationsSeeAllScreenProps) {
  return (
    <SafeAreaView edges={['left', 'right']} style={screenStyles.screen}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [screenStyles.backButton, pressed && sharedStyles.pressedFeedback]}
      >
        <RightArrowIcon style={screenStyles.backIcon} />
      </Pressable>

      <ScrollView
        bounces={false}
        contentContainerStyle={screenStyles.content}
        showsVerticalScrollIndicator={false}
        style={screenStyles.scroll}
      >
        <Text style={screenStyles.title}>Discover More Inspirations</Text>
        <View style={screenStyles.searchFilterRow}>
          <View style={screenStyles.searchBar}>
            <Text numberOfLines={1} style={screenStyles.searchPlaceholder}>
              Search for any destination here...
            </Text>
            <View style={screenStyles.searchIconCircle}>
              <SearchIcon style={screenStyles.searchIcon} />
            </View>
          </View>
          <Pressable
            accessibilityLabel="Filter inspirations"
            accessibilityRole="button"
            style={({ pressed }) => [
              screenStyles.filterButton,
              pressed && sharedStyles.pressedFeedback,
            ]}
          >
            <FilterIcon style={screenStyles.filterIcon} />
          </Pressable>
        </View>

        <View style={screenStyles.destinationList}>
          {destinationCards.map((destination) => (
            <DestinationCard
              key={destination.id}
              description={destination.description}
              image={destination.image}
              onExplore={() => onOpenExplore(destination.id)}
              onOpenTrending={() => onOpenTrending(destination.id)}
              title={destination.title}
            />
          ))}
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
        source="inspirationsSeeAll"
      />
    </SafeAreaView>
  );
}

function DestinationCard({
  description,
  image,
  onExplore,
  onOpenTrending,
  title,
}: {
  description: string;
  image: number;
  onExplore: () => void;
  onOpenTrending: () => void;
  title: string;
}) {
  return (
    <View style={screenStyles.heroCard}>
      <ImageBackground source={image} style={screenStyles.heroImage}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.72)']}
          locations={[0, 0.52, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <TrendingBadge onPress={onOpenTrending} title={title} />
        <View style={screenStyles.heroCopy}>
          <Text style={screenStyles.heroTitle}>{title}</Text>
          <Text style={screenStyles.heroDescription}>{description}</Text>
          <Pressable
            accessibilityLabel={`Explore ${title}`}
            accessibilityRole="button"
            onPress={onExplore}
            style={({ pressed }) => [
              screenStyles.exploreButton,
              pressed && sharedStyles.pressedFeedback,
            ]}
          >
            <Text style={screenStyles.exploreText}>Explore</Text>
          </Pressable>
        </View>
      </ImageBackground>
    </View>
  );
}

function TrendingBadge({ onPress, title }: { onPress: () => void; title: string }) {
  return (
    <Pressable
      accessibilityLabel={`Open trending in ${title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [screenStyles.trendingBadge, pressed && sharedStyles.pressedFeedback]}
    >
      <Image source={trendingMainBubbleIcon} style={screenStyles.trendingMainBubble} />
      <Image source={trendingFireIcon} style={screenStyles.trendingFire} />
      <View style={screenStyles.trendingSmallBubbleColumn}>
        <Image source={trendingBubble3Icon} style={screenStyles.trendingBubbleSmall} />
        <Image source={trendingBubble2Icon} style={screenStyles.trendingBubbleSmall} />
      </View>
    </Pressable>
  );
}

const screenStyles = StyleSheet.create({
  screen: {
    backgroundColor: colors.panel,
    flex: 1,
    overflow: 'hidden',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 20,
    height: 39,
    justifyContent: 'center',
    left: 30,
    position: 'absolute',
    top: 40,
    width: 39,
    zIndex: 3,
  },
  backIcon: {
    color: '#FFFFFF',
    height: 15,
    transform: [{ rotate: '180deg' }],
    width: 15,
  },
  scroll: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 150,
    paddingTop: 60,
  },
  title: {
    color: colors.ink,
    fontFamily: 'DM Sans',
    fontSize: 30,
    fontWeight: '400',
    lineHeight: 34,
    textAlign: 'center',
    width: 300,
    marginBottom: 0,
  },
  searchFilterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 25,
    justifyContent: 'center',
    marginTop: 40,
    width: '100%',
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    height: 58,
    justifyContent: 'space-between',
    paddingLeft: 25,
    paddingRight: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16.7,
    width: 270,
  },
  searchPlaceholder: {
    color: '#000000',
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 20,
    minWidth: 0,
  },
  searchIconCircle: {
    alignItems: 'center',
    borderColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15.5,
    borderWidth: 1,
    height: 31,
    justifyContent: 'center',
    marginLeft: 12,
    width: 31,
  },
  searchIcon: {
    height: 16,
    width: 16,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.blue,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  filterIcon: {
    height: 26,
    width: 26,
  },
  destinationList: {
    alignItems: 'center',
    gap: 28,
    marginTop: 48,
    width: '100%',
  },
  heroCard: {
    borderRadius: 24,
    elevation: 12,
    height: 602,
    maxWidth: 354,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    width: '94%',
  },
  heroImage: {
    flex: 1,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  heroCopy: {
    paddingBottom: 34,
    paddingHorizontal: 18,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 34,
  },
  heroDescription: {
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 4,
    width: '100%',
  },
  exploreButton: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 999,
    elevation: 8,
    height: 48,
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 7.5,
    width: 120,
  },
  exploreText: {
    color: colors.blue,
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  trendingBadge: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 12,
    width: 56,
    zIndex: 2,
  },
  trendingFire: {
    height: 31,
    left: -2,
    position: 'absolute',
    top: 18,
    width: 31,
    zIndex: 3,
  },
  trendingSmallBubbleColumn: {
    gap: 1,
    position: 'absolute',
    right: 18,
    top: 5,
    zIndex: 1,
  },
  trendingMainBubble: {
    borderRadius: 11,
    height: 22,
    left: 12,
    position: 'absolute',
    top: 13,
    width: 22,
    zIndex: 4,
  },
  trendingBubbleSmall: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
});
