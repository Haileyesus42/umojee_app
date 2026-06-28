import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RightArrowIcon } from '../../assets/icons';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';
import { destinationCards } from './InspirationsSeeAllScreen';

const backgroundImage = require('../../../assets/images/inspiration_gallery/zakynthos-bg.png');

const galleryItems = [
  {
    id: 'navagio',
    image: require('../../../assets/images/inspiration_gallery/navagio-beach.png'),
    layout: { height: 168, left: 0, top: 0, width: 250 },
  },
  {
    id: 'shipwreck',
    image: require('../../../assets/images/inspiration_gallery/shipwreck-shore.png'),
    layout: { height: 168, left: 256, top: 0, width: 122 },
  },
  {
    id: 'turquoise-water',
    image: require('../../../assets/images/inspiration_gallery/turquoise-water.png'),
    isVideo: true,
    layout: { height: 126, left: 0, top: 174, width: 122 },
    playTop: 43,
  },
  {
    id: 'cliffside',
    image: require('../../../assets/images/inspiration_gallery/cliffside-beach.png'),
    layout: { height: 126, left: 128, top: 174, width: 122 },
  },
  {
    id: 'blue-caves',
    image: require('../../../assets/images/inspiration_gallery/blue-caves.png'),
    layout: { height: 126, left: 256, top: 174, width: 122 },
  },
  {
    id: 'white-cliff',
    image: require('../../../assets/images/inspiration_gallery/white-cliff.png'),
    isVideo: true,
    layout: { height: 168, left: 0, top: 306, width: 122 },
    playTop: 64,
  },
  {
    id: 'rock-arch',
    image: require('../../../assets/images/inspiration_gallery/rock-arch.png'),
    layout: { height: 168, left: 128, top: 306, width: 250 },
  },
  {
    id: 'sea-turtle',
    image: require('../../../assets/images/inspiration_gallery/sea-turtle.png'),
    layout: { height: 126, left: 0, top: 480, width: 122 },
  },
  {
    id: 'sunset',
    image: require('../../../assets/images/inspiration_gallery/golden-sunset.png'),
    isVideo: true,
    layout: { height: 126, left: 128, top: 480, width: 122 },
    playTop: 43,
  },
  {
    id: 'greek-buildings',
    image: require('../../../assets/images/inspiration_gallery/greek-buildings.png'),
    layout: { height: 126, left: 256, top: 480, width: 122 },
  },
] as const;

type InspirationGalleryScreenProps = {
  destinationId: string;
  notificationUnreadCount?: number;
  onBack: () => void;
  onOpenChat: () => void;
  onOpenFlow?: () => void;
  onOpenHome?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenTrips?: () => void;
  onOpenWallet?: () => void;
  profileImageUri?: string | null;
};

export function InspirationGalleryScreen({
  destinationId,
  notificationUnreadCount = 0,
  onBack,
  onOpenChat,
  onOpenFlow,
  onOpenHome,
  onOpenNotifications,
  onOpenProfile,
  onOpenTrips,
  onOpenWallet,
  profileImageUri,
}: InspirationGalleryScreenProps) {
  const { width } = useWindowDimensions();
  const galleryScale = Math.min(1, (width - 24) / 378);
  const activeIndex = Math.max(
    0,
    destinationCards.findIndex((destination) => destination.id === destinationId),
  );
  const activeDestination = destinationCards[activeIndex] ?? destinationCards[0];

  return (
    <SafeAreaView edges={['left', 'right']} style={galleryStyles.screen}>
      <ImageBackground source={backgroundImage} style={StyleSheet.absoluteFillObject}>
        <View style={galleryStyles.backgroundShade} />
      </ImageBackground>

      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [galleryStyles.backButton, pressed && sharedStyles.pressedFeedback]}
      >
        <RightArrowIcon style={galleryStyles.backIcon} />
      </Pressable>

      <View style={galleryStyles.pagination}>
        {destinationCards.map((destination, index) => (
          <View
            key={destination.id}
            style={[
              galleryStyles.paginationDot,
              index === activeIndex && galleryStyles.paginationDotActive,
            ]}
          />
        ))}
      </View>

      <Text style={galleryStyles.title}>{activeDestination.title}</Text>

      <ScrollView
        bounces={false}
        contentContainerStyle={galleryStyles.galleryContent}
        showsVerticalScrollIndicator={false}
        style={galleryStyles.galleryScroll}
      >
        <View style={galleryStyles.galleryGrid}>
          {galleryItems.map((item) => (
            <View
              key={item.id}
              style={[
                galleryStyles.galleryTile,
                {
                  height: item.layout.height * galleryScale,
                  left: item.layout.left * galleryScale,
                  top: item.layout.top * galleryScale,
                  width: item.layout.width * galleryScale,
                },
              ]}
            >
              <Image source={item.image} style={galleryStyles.galleryImage} />
              {'isVideo' in item && item.isVideo ? (
                <PlayIcon scale={galleryScale} top={item.playTop} />
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <FooterWithMenu
        notificationUnreadCount={notificationUnreadCount}
        onOpenChat={onOpenChat}
        onOpenFlow={onOpenFlow}
        onOpenHome={onOpenHome}
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={onOpenProfile}
        onOpenTrips={onOpenTrips}
        onOpenWallet={onOpenWallet}
        profileImageUri={profileImageUri}
        source="inspirationGallery"
      />
    </SafeAreaView>
  );
}

function PlayIcon({ scale, top }: { scale: number; top: number }) {
  return (
    <View
      pointerEvents="none"
      style={[
        galleryStyles.playIcon,
        {
          height: 39 * scale,
          left: 41 * scale,
          top: top * scale,
          width: 39 * scale,
        },
      ]}
    >
      <View style={galleryStyles.playTriangle} />
    </View>
  );
}

const galleryStyles = StyleSheet.create({
  screen: {
    backgroundColor: colors.ink,
    flex: 1,
    overflow: 'hidden',
  },
  backgroundShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  pagination: {
    flexDirection: 'row',
    gap: 2,
    position: 'absolute',
    right: 37,
    top: 77,
    zIndex: 3,
  },
  paginationDot: {
    backgroundColor: 'transparent',
    borderColor: '#4DB4FF',
    borderRadius: 4,
    borderWidth: 1,
    height: 7,
    width: 7,
  },
  paginationDotActive: {
    backgroundColor: colors.blue,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 30,
    fontWeight: '700',
    left: 0,
    lineHeight: 36,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
    top: 130,
    zIndex: 2,
  },
  galleryScroll: {
    bottom: 122,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 202,
    zIndex: 2,
  },
  galleryContent: {
    height: 630,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  galleryGrid: {
    height: 606,
    position: 'relative',
    width: '100%',
  },
  galleryTile: {
    backgroundColor: '#C8DCE8',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'absolute',
  },
  galleryImage: {
    height: '100%',
    resizeMode: 'cover',
    width: '100%',
  },
  playIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  playTriangle: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 13,
    borderLeftColor: '#FFFFFF',
    borderLeftWidth: 20,
    borderTopColor: 'transparent',
    borderTopWidth: 13,
    height: 0,
    marginLeft: 5,
    width: 0,
  },
});
