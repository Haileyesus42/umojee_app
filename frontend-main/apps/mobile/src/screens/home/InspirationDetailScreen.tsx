import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RightArrowIcon } from '../../assets/icons';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';
import ChevronDownIcon from '../../../assets/icons/chevron-down.svg';
import FavoriteIcon from '../../../assets/icons/inspiration-2/favorite.svg';
import HeartIcon from '../../../assets/images/inspiration_details/heart.svg';
import MessageIcon from '../../../assets/images/inspiration_details/message.svg';
import MoreIcon from '../../../assets/images/inspiration_details/more.svg';
import ShareIcon from '../../../assets/images/inspiration_details/share.svg';
import { destinationCards } from './InspirationsSeeAllScreen';

const zakynthosDetailImage = require('../../../assets/images/inspiration_details/main_image.jpg');
const trendingFireIcon = require('../../../assets/icons/trending_icons/Fire.png');
const trendingMainBubbleIcon = require('../../../assets/icons/trending_icons/Main-Bubble.png');
const trendingBubble2Icon = require('../../../assets/icons/trending_icons/Bubble-2.png');
const trendingBubble3Icon = require('../../../assets/icons/trending_icons/Bubble-3.png');
// const galleryImages = [
//   require('../../../assets/images/inspiration_details/image_1.jpg'),
//   require('../../../assets/images/inspiration_details/image_2.jpg'),
//   require('../../../assets/images/inspiration_details/image_3.jpg'),
//   require('../../../assets/images/inspiration_details/main_image.jpg'),
// ];

const destinationDetails = {
  zakynthos: {
    description:
      'Zakynthos is among the most beautiful Greek islands and one of the most popular ones! It has crystal clear waters, amazing beaches, wild nature and protected sea turtles!',
    image: zakynthosDetailImage,
    rating: '4.86',
  },
  paris: {
    description:
      'Paris pairs timeless landmarks with intimate cafes, elegant boulevards, celebrated museums and evening views that make every walk feel cinematic.',
    image: destinationCards[1].image,
    rating: '4.92',
  },
  tokyo: {
    description:
      'Tokyo blends neon streets, peaceful gardens, world-class food and layered traditions into a city that always has another corner to discover.',
    image: destinationCards[2].image,
    rating: '4.88',
  },
} as const;

type InspirationDetailScreenProps = {
  destinationId: string;
  onBack: () => void;
  onOpenDetails: () => void;
  onOpenGallery: () => void;
  onOpenTrending: () => void;
  onSelectDestination: (destinationId: string) => void;
};

export function InspirationDetailScreen({
  destinationId,
  onBack,
  onOpenDetails,
  onOpenGallery,
  onOpenTrending,
  onSelectDestination,
}: InspirationDetailScreenProps) {
  const { height } = useWindowDimensions();
  const reelListRef = useRef<FlatList<(typeof destinationCards)[number]>>(null);
  const [reelHeight, setReelHeight] = useState(height);
  const contentLeft = 24;
  const contentRight = 92;
  const activeIndex = Math.max(
    0,
    destinationCards.findIndex((destination) => destination.id === destinationId),
  );
  const hotelSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dx > 24 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 80 && Math.abs(gestureState.dy) < 60) {
            onOpenDetails();
          }
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [onOpenDetails],
  );

  const scrollToDestination = useCallback((nextIndex: number) => {
    const boundedIndex = Math.min(Math.max(nextIndex, 0), destinationCards.length - 1);

    reelListRef.current?.scrollToIndex({
      animated: true,
      index: boundedIndex,
    });
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.y / reelHeight);
      const nextDestination = destinationCards[nextIndex];

      if (nextDestination && nextDestination.id !== destinationId) {
        onSelectDestination(nextDestination.id);
      }
    },
    [destinationId, onSelectDestination, reelHeight],
  );

  useEffect(() => {
    reelListRef.current?.scrollToIndex({
      animated: false,
      index: activeIndex,
    });
  }, [activeIndex, reelHeight]);

  return (
    <SafeAreaView
      edges={['left', 'right']}
      {...hotelSwipeResponder.panHandlers}
      onLayout={(event) => {
        const nextHeight = event.nativeEvent.layout.height;

        if (nextHeight > 0 && Math.abs(nextHeight - reelHeight) > 1) {
          setReelHeight(nextHeight);
        }
      }}
      style={detailStyles.screen}
    >
      <FlatList
        ref={reelListRef}
        data={destinationCards}
        decelerationRate="fast"
        disableIntervalMomentum
        getItemLayout={(_, index) => ({
          index,
          length: reelHeight,
          offset: reelHeight * index,
        })}
        initialScrollIndex={activeIndex}
        keyExtractor={(destination) => destination.id}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        pagingEnabled
        renderItem={({ item, index }) => (
          <DestinationReel
            contentLeft={contentLeft}
            contentRight={contentRight}
            destination={item}
            hasNext={index < destinationCards.length - 1}
            hasPrevious={index > 0}
            height={reelHeight}
            onOpenDetails={onOpenDetails}
            onOpenGallery={onOpenGallery}
            onOpenTrending={onOpenTrending}
            onSelectNext={() => scrollToDestination(index + 1)}
            onSelectPrevious={() => scrollToDestination(index - 1)}
          />
        )}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={reelHeight}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [detailStyles.backButton, pressed && sharedStyles.pressedFeedback]}
      >
        <RightArrowIcon style={detailStyles.backIcon} />
      </Pressable>

      <View style={detailStyles.pagination}>
        {destinationCards.map((destination, index) => (
          <View
            key={destination.id}
            style={[
              detailStyles.paginationDot,
              index === activeIndex && detailStyles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

function DestinationReel({
  contentLeft,
  contentRight,
  destination,
  hasNext,
  hasPrevious,
  height,
  onOpenDetails,
  onOpenGallery,
  onOpenTrending,
  onSelectNext,
  onSelectPrevious,
}: {
  contentLeft: number;
  contentRight: number;
  destination: (typeof destinationCards)[number];
  hasNext: boolean;
  hasPrevious: boolean;
  height: number;
  onOpenDetails: () => void;
  onOpenGallery: () => void;
  onOpenTrending: () => void;
  onSelectNext: () => void;
  onSelectPrevious: () => void;
}) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const detail =
    destinationDetails[destination.id as keyof typeof destinationDetails] ??
    destinationDetails.zakynthos;

  return (
    <View style={[detailStyles.reelPage, { height }]}>
      <ImageBackground source={detail.image} style={StyleSheet.absoluteFillObject}>
        <View style={detailStyles.imageShade} />
      </ImageBackground>

      {hasPrevious ? (
        <DestinationPagerButton edge="top" label="Previous" onPress={onSelectPrevious} />
      ) : null}

      <View
        style={[
          detailStyles.content,
          {
            left: contentLeft,
            right: contentRight,
          },
        ]}
      >
        <View style={detailStyles.rating}>
          <FavoriteIcon height={20} width={20} />
          <Text style={detailStyles.ratingText}>{detail.rating}</Text>
        </View>

        <Text style={detailStyles.title}>{destination.title}</Text>
        <Text style={detailStyles.description}>{detail.description}</Text>

        {/* <Pressable
          accessibilityLabel={`Open ${destination.title} gallery`}
          accessibilityRole="button"
          onPress={onOpenGallery}
          style={({ pressed }) => [
            detailStyles.galleryRow,
            pressed && sharedStyles.pressedFeedback,
          ]}
        >
          <View style={detailStyles.galleryStack}>
            <Image
              source={galleryImages[0]}
              style={[detailStyles.galleryImage, detailStyles.galleryImagePrimary]}
            />
            <Image
              source={galleryImages[1]}
              style={[detailStyles.galleryImage, detailStyles.galleryImageTop]}
            />
            <Image
              source={galleryImages[2]}
              style={[detailStyles.galleryImage, detailStyles.galleryImageRight]}
            />
            <Image
              source={galleryImages[3]}
              style={[detailStyles.galleryImage, detailStyles.galleryImageBottom]}
            />
          </View>
          <Text style={detailStyles.galleryText}>Tap to view{'\n'}gallery</Text>
        </Pressable> */}

        <Pressable
          accessibilityLabel="Open inspiration details"
          accessibilityRole="button"
          onPress={onOpenDetails}
          style={({ pressed }) => [
            detailStyles.swipeButton,
            pressed && sharedStyles.pressedFeedback,
          ]}
        >
          <Text style={detailStyles.swipeText}>SWIPE FOR DETAILS</Text>
        </Pressable>
      </View>

      <View style={detailStyles.reactionRail}>
        <ReactionButton icon={<HeartIcon height={27} width={27} />} label="5.3K" />
        <ReactionButton icon={<MessageIcon height={29} width={29} />} label="2.1K" />
        <ReactionButton icon={<ShareIcon height={28} width={28} />} label="3K" />
        <TrendingButton onPress={onOpenTrending} />
        <View style={detailStyles.moreReactionWrap}>
          {isMoreMenuOpen ? <MoreOptionsMenu /> : null}
          <ReactionButton
            accessibilityLabel="Open more inspiration actions"
            icon={<MoreIcon height={20} width={20} />}
            onPress={() => setIsMoreMenuOpen((currentValue) => !currentValue)}
          />
        </View>
      </View>

      {hasNext ? (
        <DestinationPagerButton edge="bottom" label="Next" onPress={onSelectNext} />
      ) : null}
    </View>
  );
}

function TrendingButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Open trending in Zakynthos"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        detailStyles.trendingButton,
        pressed && sharedStyles.pressedFeedback,
      ]}
    >
      <Image source={trendingMainBubbleIcon} style={detailStyles.trendingMainBubble} />
      <Image source={trendingFireIcon} style={detailStyles.trendingFire} />
      <View style={detailStyles.trendingSmallBubbleColumn}>
        <Image source={trendingBubble3Icon} style={detailStyles.trendingBubbleSmall} />
        <Image source={trendingBubble2Icon} style={detailStyles.trendingBubbleSmall} />
      </View>
    </Pressable>
  );
}

function MoreOptionsMenu() {
  return (
    <View style={detailStyles.moreMenuCard}>
      <Pressable
        accessibilityLabel="Book a flight"
        accessibilityRole="button"
        style={({ pressed }) => [
          detailStyles.moreMenuItem,
          pressed && sharedStyles.pressedFeedback,
        ]}
      >
        <Text style={detailStyles.moreMenuText}>Book a flight</Text>
      </Pressable>
    </View>
  );
}

function ReactionButton({
  accessibilityLabel,
  icon,
  label,
  onPress,
}: {
  accessibilityLabel?: string;
  icon: ReactNode;
  label?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel || (label ? `Reaction ${label}` : 'More reactions')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        detailStyles.reactionButton,
        pressed && sharedStyles.pressedFeedback,
      ]}
    >
      {icon}
      {label ? <Text style={detailStyles.reactionText}>{label}</Text> : null}
    </Pressable>
  );
}

function DestinationPagerButton({
  edge,
  label,
  onPress,
}: {
  edge: 'bottom' | 'top';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Show ${label.toLowerCase()} destination`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        detailStyles.pagerButton,
        edge === 'top' ? detailStyles.previousButton : detailStyles.nextButton,
        pressed && sharedStyles.pressedFeedback,
      ]}
    >
      <ChevronDownIcon
        color="#FFFFFF"
        height={16}
        style={edge === 'top' ? detailStyles.previousIcon : detailStyles.nextIcon}
        width={16}
      />
      <Text style={detailStyles.pagerText}>{label}</Text>
    </Pressable>
  );
}

const detailStyles = StyleSheet.create({
  screen: {
    backgroundColor: colors.ink,
    flex: 1,
    overflow: 'hidden',
  },
  reelPage: {
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.31)',
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
    zIndex: 5,
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
  content: {
    bottom: 99,
    position: 'absolute',
    zIndex: 2,
  },
  rating: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginBottom: 15,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8.35,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 29,
  },
  ratingText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Medium',
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 20,
  },
  description: {
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 26,
    marginTop: 21,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8.35,
  },
  galleryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 49,
  },
  galleryStack: {
    height: 104,
    width: 129,
  },
  galleryImage: {
    borderRadius: 6,
    height: 44,
    position: 'absolute',
    width: 44,
  },
  galleryImagePrimary: {
    height: 58,
    left: 0,
    top: 22,
    width: 58,
  },
  galleryImageTop: {
    left: 54,
    top: 0,
  },
  galleryImageRight: {
    left: 86,
    top: 36,
  },
  galleryImageBottom: {
    left: 54,
    top: 60,
  },
  galleryText: {
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 18,
  },
  swipeButton: {
    alignItems: 'flex-start',
    marginVertical: 40,
  },
  swipeText: {
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 22,
  },
  reactionRail: {
    alignItems: 'center',
    gap: 22,
    position: 'absolute',
    right: 14,
    top: 395,
    zIndex: 2,
  },
  reactionButton: {
    alignItems: 'center',
    minHeight: 40,
  },
  reactionText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 5,
  },
  moreReactionWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  moreMenuCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 8,
    overflow: 'hidden',
    position: 'absolute',
    right: 32,
    top: -1,
    width: 150,
    zIndex: 10,
  },
  moreMenuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 41,
    paddingHorizontal: 16,
  },
  moreMenuText: {
    color: colors.ink,
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 24,
  },
  trendingButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    marginBottom: -4,
    marginTop: -3,
    position: 'relative',
    width: 56,
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
    zIndex: 4,
    left: 12,
    position: 'absolute',
    top: 13,
    width: 22,
  },
  trendingBubbleSmall: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  pagerButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -70,
    position: 'absolute',
    width: 140,
    zIndex: 3,
  },
  previousButton: {
    top: 68,
  },
  nextButton: {
    bottom: 20,
  },
  previousIcon: {
    transform: [{ rotate: '180deg' }],
  },
  nextIcon: {
    transform: [{ rotate: '0deg' }],
  },
  pagerText: {
    color: '#FFFFFF',
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 24,
  },
});
