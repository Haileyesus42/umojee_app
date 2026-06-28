import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import type { GestureResponderHandlers } from 'react-native';
import { Image, PanResponder, Pressable, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import { ChevronDownIcon, RightArrowIcon } from '../../../assets/icons';
import { itineraryLhrImage } from '../../../assets/images';
import type {
  JourneyCardItem,
  JourneyItem,
  LiveProgress,
  MobileJourneyFilterKey,
} from '../../../api/notifications';
import type { WebSocketStatus } from '../../../api/websocket';
import { Panel } from '../../../components/ui/Panel';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { styles } from '../../../theme/styles';
import { getAirportDisplayName } from '../../../utils/airports';
import { CategoryScroller } from './CategoryScroller';
import { PaginationDots } from './PaginationDots';
import airlineImages from './airlineImages.json';

const americanAirlinesLogo = require('../../../../assets/images/american-airlines-logo.png');
const seatProfileImages = [
  require('../../../../assets/images/chat-user-avatar.png'),
  require('../../../../assets/images/companion-avatar.jpg'),
] as const;

type AirlineImageEntry = {
  airline_image?: string;
  iata?: string;
  icao?: string;
  name?: string;
};

const airlineImageMap = airlineImages as Record<string, AirlineImageEntry>;
const enabledItineraryFilterKeys: MobileJourneyFilterKey[] = ['flights', 'stays'];
const flightOnlyItineraryFilterKeys: MobileJourneyFilterKey[] = ['flights'];
type JourneyLocationMode = 'current_location' | 'approaching' | 'nearby' | 'arrived';
const journeyLocationModeLabels: Record<JourneyLocationMode, string> = {
  arrived: 'Arrived',
  approaching: 'Approaching',
  current_location: 'Current location',
  nearby: 'Nearby',
};
const journeyLocationModeOptions: JourneyLocationMode[] = [
  'current_location',
  'approaching',
  'nearby',
  'arrived',
];

type ItineraryCardProps = {
  journeyDataError?: string | null;
  journeys?: JourneyItem[];
  liveModeToggleOn?: boolean;
  liveModeWebSocketStatus?: WebSocketStatus;
  onJourneyLocationModeChange?: (mode: JourneyLocationMode) => void;
  onLiveModeToggle?: () => void;
  onOpenFlightDetails: () => void;
  onOpenFlightTracker: () => void;
  onOpenLiveMode: () => void;
};

export function ItineraryCard({
  journeyDataError = null,
  journeys = [],
  liveModeToggleOn = false,
  liveModeWebSocketStatus = 'idle',
  onJourneyLocationModeChange,
  onLiveModeToggle,
  onOpenFlightDetails,
  onOpenFlightTracker,
  onOpenLiveMode,
}: ItineraryCardProps) {
  const [isFlightDetailsVisible, setIsFlightDetailsVisible] = useState(false);
  const [isHighlightedDetailsVisible, setIsHighlightedDetailsVisible] = useState(false);
  const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState(0);
  const [journeyLocationMode, setJourneyLocationMode] =
    useState<JourneyLocationMode>('current_location');
  const [selectedItineraryFilterKey, setSelectedItineraryFilterKey] =
    useState<MobileJourneyFilterKey>('flights');
  const activeJourney = getActiveJourney(journeys);
  const isJourneyFallbackMode = !activeJourney || Boolean(journeyDataError);
  const shouldShowStayMilestoneTracker =
    Boolean(activeJourney) && !isJourneyFallbackMode && !hasJourneyHotels(activeJourney);
  const itineraryEnabledFilterKeys = isJourneyFallbackMode || hasJourneyHotels(activeJourney)
    ? enabledItineraryFilterKeys
    : flightOnlyItineraryFilterKeys;
  const mobilePayload = getActiveMobilePayload(journeys, activeJourney);
  const mobileCards = mobilePayload?.cards.itinerary || [];
  const selectedCard = mobileCards.find((card) => card.filter_key === 'flights') || mobileCards[0];
  const itinerary = getItinerarySummary(journeys, selectedCard, activeJourney);
  const flightImageSource = itinerary.airlineImageUrl
    ? { uri: itinerary.airlineImageUrl }
    : itineraryLhrImage;
  const highlightedItems = getHighlightedCategoryItems(
    itinerary,
    activeJourney,
    shouldShowStayMilestoneTracker,
  );
  const activeHighlightedIndex = Math.min(highlightedCategoryIndex, highlightedItems.length - 1);
  const activeHighlightedItem = highlightedItems[activeHighlightedIndex] || highlightedItems[0];
  const isDetailsVisible = isFlightDetailsVisible || isHighlightedDetailsVisible;
  const selectedFilterKey =
    selectedItineraryFilterKey === 'flights' ? 'flights' : activeHighlightedItem.key;
  const highlightedPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 24 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 40) {
            setHighlightedCategoryIndex((currentIndex) =>
              Math.min(currentIndex + 1, highlightedItems.length - 1),
            );
          }

          if (gestureState.dx < -40) {
            setHighlightedCategoryIndex((currentIndex) => Math.max(currentIndex - 1, 0));
          }
        },
      }),
    [highlightedItems.length],
  );

  const toggleFlightDetails = () => {
    setIsFlightDetailsVisible((currentValue) => !currentValue);
  };

  const toggleHighlightedDetails = () => {
    setIsHighlightedDetailsVisible((currentValue) => !currentValue);
  };

  const handleJourneyLocationModeChange = (mode: JourneyLocationMode) => {
    setJourneyLocationMode(mode);
    onJourneyLocationModeChange?.(mode);
  };

  const selectHighlightedCategory = (filterKey: MobileJourneyFilterKey) => {
    if (!itineraryEnabledFilterKeys.includes(filterKey)) {
      return;
    }

    setSelectedItineraryFilterKey(filterKey);

    if (filterKey === 'flights') {
      setIsHighlightedDetailsVisible(false);
      return;
    }

    if (filterKey === 'all') {
      setHighlightedCategoryIndex(0);
      return;
    }

    const nextIndex = highlightedItems.findIndex((item) => item.key === filterKey);

    if (nextIndex >= 0) {
      setHighlightedCategoryIndex(nextIndex);
    }
  };

  const cardContent = (
    <Panel
      style={[
        styles.itineraryPanel,
        isDetailsVisible ? styles.itineraryPanelContentWithGradientBorder : null,
      ]}
    >
      <View style={styles.liveMode}>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={liveModeToggleOn ? 'Turn off live mode' : 'Turn on live mode'}
          accessibilityState={{ checked: liveModeToggleOn }}
          onPress={onLiveModeToggle}
          style={({ pressed }) => [
            styles.liveToggleButton,
            liveModeToggleOn && styles.liveToggleButtonActive,
            liveModeWebSocketStatus === 'open' && styles.liveToggleButtonConnected,
            pressed && styles.pressedFeedback,
          ]}
        >
          <View
            style={[
              styles.liveToggleKnob,
              liveModeToggleOn && styles.liveToggleKnobActive,
            ]}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch to live mode"
          onPress={onOpenLiveMode}
          style={({ pressed }) => [styles.liveModeAction, pressed && styles.pressedFeedback]}
        >
          <Text style={styles.liveText}>Switch to Live Mode</Text>
        </Pressable>
      </View>
      <Text style={styles.itineraryTitle}>My Itinerary</Text>
      <CategoryScroller
        enabledFilterKeys={itineraryEnabledFilterKeys}
        filters={mobilePayload?.filters}
        onFilterPress={selectHighlightedCategory}
        selectedFilterKey={selectedFilterKey}
        viewportStyle={styles.itineraryCategoryViewport}
      />
      <PaginationDots activeIndex={activeHighlightedIndex} style={styles.itineraryDots} />

      <View style={styles.flightRow}>
        <Image source={flightImageSource} style={styles.flightImage} />
        <View style={styles.flightCopy}>
          <View style={styles.flightTitleRow}>
            <View style={styles.tripTitleRow}>
              <Text style={styles.tripTitle}>{itinerary.departureCode}</Text>
              <RightArrowIcon style={styles.tripArrowIcon} />
              <Text style={styles.tripTitle}>{itinerary.arrivalCode}</Text>
            </View>
            <StatusBadge label={itinerary.statusLabel} onPress={onOpenFlightTracker} />
          </View>
          <View style={styles.flightMetaRow}>
            <AmericanAirlinesMark />
            <Text numberOfLines={1} style={styles.bodyText}>
              {itinerary.airlineText}
            </Text>
          </View>
          <View style={styles.flightMetaRow}>
            <CalendarSmallIcon />
            <Text numberOfLines={1} style={styles.bodyText}>
              {itinerary.dateText}
            </Text>
          </View>
          <View style={styles.detailsRow}>
            <PrimaryButton label="Flight Details" onPress={onOpenFlightDetails} small />
            <DetailsToggle isExpanded={isFlightDetailsVisible} onPress={toggleFlightDetails} />
          </View>
        </View>
      </View>

      {isFlightDetailsVisible ? <FlightDetailsPanel itinerary={itinerary} /> : null}

      <HighlightedItinerarySection
        item={activeHighlightedItem}
        isExpanded={isHighlightedDetailsVisible}
        journeyLocationMode={journeyLocationMode}
        onToggleDetails={toggleHighlightedDetails}
        onJourneyLocationModeChange={handleJourneyLocationModeChange}
        panHandlers={highlightedPanResponder.panHandlers}
      />
    </Panel>
  );

  if (!isDetailsVisible) {
    return cardContent;
  }

  return (
    <LinearGradient
      colors={['#002AFF', '#77F2F6']}
      end={{ x: 0, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.itineraryPanelBorder}
    >
      {cardContent}
    </LinearGradient>
  );
}

type DetailsToggleProps = {
  isExpanded: boolean;
  onPress: () => void;
};

type HighlightedDetailIcon = 'check' | 'clock' | 'hotel' | 'location' | 'terminal';

type HighlightedDetailRow = {
  icon: HighlightedDetailIcon;
  label: string;
  value: string;
};

type HighlightedCategoryItem = {
  actionLabel: string;
  details: HighlightedDetailRow[];
  eyebrow: string;
  key: MobileJourneyFilterKey;
  liveProgress?: LiveProgress | null;
  location: string;
  milestones?: StayMilestone[];
  reliability?: JourneyTimelineReliability;
  showMilestoneTracker?: boolean;
  statusText: string;
  title: string;
};

type StayMilestone = {
  completed: boolean;
  critical?: boolean;
  description?: string;
  dueDate?: string;
  id: string;
  riskDetails?: string[];
  riskLevel?: JourneySegmentRiskLevel;
  riskMessage?: string;
  title: string;
};

type JourneySegmentRiskLevel = 'action_needed' | 'on_track' | 'watch';

type JourneyReliabilityImpact = 'negative' | 'neutral' | 'positive';

type JourneyReliabilityFactor = {
  description: string;
  impact: JourneyReliabilityImpact;
  label: string;
};

type JourneyTimelineReliability = {
  factors: JourneyReliabilityFactor[];
  score: number;
};

function DetailsToggle({ isExpanded, onPress }: DetailsToggleProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isExpanded ? 'Hide itinerary details' : 'See itinerary details'}
      onPress={onPress}
      style={({ pressed }) => [styles.moreDetailsLink, pressed && styles.pressedFeedback]}
    >
      <Text style={styles.moreDetails}>{isExpanded ? 'Hide Details' : 'See Details'}</Text>
      <ChevronDownIcon
        style={[styles.moreDetailsChevron, isExpanded && styles.detailsChevronExpanded]}
      />
    </Pressable>
  );
}

function HighlightedItinerarySection({
  isExpanded,
  item,
  journeyLocationMode,
  onJourneyLocationModeChange,
  onToggleDetails,
  panHandlers,
}: {
  isExpanded: boolean;
  item: HighlightedCategoryItem;
  journeyLocationMode: JourneyLocationMode;
  onJourneyLocationModeChange?: (mode: JourneyLocationMode) => void;
  onToggleDetails: () => void;
  panHandlers: GestureResponderHandlers;
}) {
  if (item.key === 'stays' && item.showMilestoneTracker) {
    return (
      <View style={styles.infoBox} {...panHandlers}>
        <JourneyMilestoneTracker
          isExpanded={isExpanded}
          milestones={item.milestones || []}
          journeyLocationMode={journeyLocationMode}
          onJourneyLocationModeChange={onJourneyLocationModeChange}
          onToggleDetails={onToggleDetails}
          progress={item.liveProgress}
          reliability={item.reliability}
        />
      </View>
    );
  }

  return (
    <View style={styles.infoBox} {...panHandlers}>
      <View style={styles.stayCardTopRow}>
        <View style={styles.stayStatusRow}>
          <View style={styles.stayStatusDot} />
          <Text numberOfLines={1} style={styles.stayStatusText}>
            {item.statusText}
          </Text>
        </View>
        <HighlightedActionButton label={item.actionLabel} />
      </View>
      <View style={styles.stayDetailsRow}>
        <View style={styles.stayClockBadge}>
          <ClockIcon color="#002AFF" size={14} />
        </View>
        <View style={styles.stayHotelCopy}>
          <Text style={styles.stayEyebrow}>{item.eyebrow}</Text>
          <Text numberOfLines={1} style={styles.stayHotelName}>
            {item.title}
          </Text>
          <View style={styles.stayLocationRow}>
            <MapPinIcon color="#6B7280" />
            <Text numberOfLines={1} style={styles.stayLocationText}>
              {item.location}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.stayMoreDetailsRow}>
        <HighlightedDetailsToggle isExpanded={isExpanded} onPress={onToggleDetails} />
      </View>
      {isExpanded ? <HighlightedDetailsPanel item={item} /> : null}
    </View>
  );
}

function JourneyMilestoneTracker({
  isExpanded,
  journeyLocationMode,
  milestones,
  onJourneyLocationModeChange,
  onToggleDetails,
  progress,
  reliability,
}: {
  isExpanded: boolean;
  journeyLocationMode: JourneyLocationMode;
  milestones: StayMilestone[];
  onJourneyLocationModeChange?: (mode: JourneyLocationMode) => void;
  onToggleDetails: () => void;
  progress?: LiveProgress | null;
  reliability?: JourneyTimelineReliability;
}) {
  const [openLocationMenuMilestoneId, setOpenLocationMenuMilestoneId] = useState<string | null>(
    null,
  );
  const completedCount = milestones.filter((milestone) => milestone.completed).length;
  const percent =
    typeof progress?.percent === 'number'
      ? Math.max(0, Math.min(100, progress.percent))
      : milestones.length
        ? Math.round((completedCount / milestones.length) * 100)
        : 0;
  const activeMilestone = getActiveMilestone(milestones, progress?.current_segment);
  const visibleMilestones = activeMilestone ? [activeMilestone] : [];
  const activeStatus = activeMilestone ? getMilestoneStatus(activeMilestone) : null;
  const canShowLocationMenu = Boolean(onJourneyLocationModeChange);

  const selectJourneyLocationMode = (mode: JourneyLocationMode) => {
    onJourneyLocationModeChange?.(mode);
    setOpenLocationMenuMilestoneId(null);
  };

  return (
    <View style={styles.journeyMilestoneTracker}>
      <View style={styles.journeyMilestoneHeader}>
        <View style={styles.journeyMilestoneTitleRow}>
          <ClockIcon color="#111827" size={15} />
          <Text style={styles.journeyMilestoneTitle}>Milestones</Text>
          <View style={styles.journeyMilestoneCountPill}>
            <Text style={styles.journeyMilestoneCountText}>
              {completedCount}/{milestones.length}
            </Text>
          </View>
        </View>
        {activeStatus ? <JourneyMilestoneStatusChip status={activeStatus} /> : null}
      </View>

      {progress ? (
        <View style={styles.journeyMilestoneProgressBlock}>
          <View style={styles.journeyMilestoneProgressLabels}>
            <Text numberOfLines={1} style={styles.journeyMilestoneProgressText}>
              {progress.from_label || formatSegmentLabel(progress.current_segment) || 'Journey'}
            </Text>
            <Text numberOfLines={1} style={styles.journeyMilestoneProgressText}>
              {progress.to_label || progress.eta_text || `${percent}%`}
            </Text>
          </View>
          <View style={styles.journeyMilestoneProgressTrack}>
            <LinearGradient
              colors={['#002AFF', '#77F2F6']}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={[styles.journeyMilestoneProgressFill, { width: `${percent}%` }]}
            />
          </View>
        </View>
      ) : null}

      {milestones.length > 1 ? (
        <View style={styles.journeyMilestoneDetailsRow}>
          <Pressable
            accessibilityLabel={isExpanded ? 'Hide milestone details' : 'Show milestone details'}
            accessibilityRole="button"
            onPress={onToggleDetails}
            style={({ pressed }) => [
              styles.journeyMilestoneDetailsButton,
              pressed && styles.pressedFeedback,
            ]}
          >
            <Text style={styles.journeyMilestoneDetailsText}>Details</Text>
            <ChevronDownIcon
              style={[
                styles.journeyMilestoneDetailsChevron,
                isExpanded && styles.detailsChevronExpanded,
              ]}
            />
          </Pressable>
        </View>
      ) : null}

      {isExpanded ? (
      <View style={styles.journeyMilestoneList}>
        {visibleMilestones.map((milestone) => (
          <View
            key={milestone.id}
            style={[
              styles.journeyMilestoneRow,
              milestone.completed && styles.journeyMilestoneRowCompleted,
              milestone.critical && !milestone.completed && styles.journeyMilestoneRowCritical,
            ]}
          >
            <View style={styles.journeyMilestoneIconWrap}>
              {getMilestoneStatusIcon(milestone)}
            </View>
            <View style={styles.journeyMilestoneCopy}>
              <View style={styles.journeyMilestoneRowTop}>
                <View style={styles.journeyMilestoneTitleLine}>
                  <Text style={styles.journeyMilestoneLeadingIcon}>
                    {milestone.completed ? '✓' : ''}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.journeyMilestoneName,
                    milestone.completed && styles.journeyMilestoneNameCompleted,
                    milestone.critical && !milestone.completed && styles.journeyMilestoneNameCritical,
                  ]}
                >
                  {milestone.title}
                </Text>
                {milestone.id === 'home_to_airport' && canShowLocationMenu ? (
                  <View style={styles.journeyMilestoneMenuAnchor}>
                    <Pressable
                      accessibilityLabel="Demo location options"
                      accessibilityRole="button"
                      onPress={() =>
                        setOpenLocationMenuMilestoneId((currentValue) =>
                          currentValue === milestone.id ? null : milestone.id,
                        )
                      }
                      style={({ pressed }) => [
                        styles.journeyMilestoneMoreButton,
                        pressed && styles.pressedFeedback,
                      ]}
                    >
                      <Text style={styles.journeyMilestoneMoreIcon}>•••</Text>
                    </Pressable>
                    {openLocationMenuMilestoneId === milestone.id ? (
                      <View style={styles.journeyMilestoneLocationMenu}>
                        {journeyLocationModeOptions.map((mode) => (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Use ${journeyLocationModeLabels[mode]} demo location`}
                            key={mode}
                            onPress={() => selectJourneyLocationMode(mode)}
                            style={({ pressed }) => [
                              styles.journeyMilestoneLocationMenuItem,
                              journeyLocationMode === mode &&
                                styles.journeyMilestoneLocationMenuItemActive,
                              pressed && styles.pressedFeedback,
                            ]}
                          >
                            <Text
                              style={[
                                styles.journeyMilestoneLocationMenuText,
                                journeyLocationMode === mode &&
                                  styles.journeyMilestoneLocationMenuTextActive,
                              ]}
                            >
                              {journeyLocationModeLabels[mode]}
                            </Text>
                            {journeyLocationMode === mode ? (
                              <Text style={styles.journeyMilestoneLocationMenuCheck}>✓</Text>
                            ) : null}
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : milestone.dueDate ? (
                  <Text style={styles.journeyMilestoneDate}>
                    {formatMilestoneDate(milestone.dueDate)}
                  </Text>
                ) : null}
              </View>
              {milestone.id === 'home_to_airport' ? (
                <View style={styles.journeyMilestoneLocationPill}>
                  <MapPinIcon color="#0369A1" />
                  <Text style={styles.journeyMilestoneLocationText}>
                    {journeyLocationModeLabels[journeyLocationMode]}
                  </Text>
                </View>
              ) : null}
              {milestone.description ? (
                <Text numberOfLines={2} style={styles.journeyMilestoneDescription}>
                  {milestone.description}
                </Text>
              ) : null}
              {false && (milestone.completed ? (
                <View style={styles.journeyMilestoneCompletedPill}>
                  <Text style={styles.journeyMilestoneCompletedText}>✓ Completed</Text>
                </View>
              ) : milestone.riskLevel === 'action_needed' ? (
                <View style={styles.journeyMilestoneActionPill}>
                  <Text style={styles.journeyMilestoneActionText}>Action needed</Text>
                </View>
              ) : milestone.critical || milestone.riskLevel === 'watch' ? (
                <View style={styles.journeyMilestoneCriticalPill}>
                  <Text style={styles.journeyMilestoneCriticalText}>Watch</Text>
                </View>
              ) : null)}
            </View>
          </View>
        ))}
      </View>
      ) : null}

      {isExpanded && reliability ? <JourneyTimelineReliabilityCard reliability={reliability} /> : null}
    </View>
  );
}

function getMilestoneStatus(milestone: StayMilestone) {
  if (milestone.completed) {
    return 'completed' as const;
  }

  if (milestone.riskLevel === 'action_needed') {
    return 'action_needed' as const;
  }

  if (milestone.critical || milestone.riskLevel === 'watch') {
    return 'watch' as const;
  }

  return null;
}

function JourneyMilestoneStatusChip({
  status,
}: {
  status: 'action_needed' | 'completed' | 'watch';
}) {
  if (status === 'completed') {
    return (
      <View style={[styles.journeyMilestoneCompletedPill, styles.journeyMilestoneHeaderStatusPill]}>
        <Text style={styles.journeyMilestoneCompletedText}>✓ Completed</Text>
      </View>
    );
  }

  if (status === 'action_needed') {
    return (
      <View style={[styles.journeyMilestoneActionPill, styles.journeyMilestoneHeaderStatusPill]}>
        <Text style={styles.journeyMilestoneActionText}>Action needed</Text>
      </View>
    );
  }

  return (
    <View style={[styles.journeyMilestoneCriticalPill, styles.journeyMilestoneHeaderStatusPill]}>
      <Text style={styles.journeyMilestoneCriticalText}>Watch</Text>
    </View>
  );
}

function JourneyTimelineReliabilityCard({
  reliability,
}: {
  reliability: JourneyTimelineReliability;
}) {
  const score = Math.max(0, Math.min(100, Math.round(reliability.score)));
  const config = getTimelineReliabilityConfig(score);

  return (
    <View style={styles.journeyReliabilityCard}>
      <View style={styles.journeyReliabilityHeader}>
        <View style={styles.journeyReliabilityCircle}>
          <Svg width={58} height={58} viewBox="0 0 58 58">
            <Path
              d="M29 5.5A23.5 23.5 0 1 1 28.99 5.5"
              fill="none"
              stroke="#E5E7EB"
              strokeLinecap="round"
              strokeWidth={5}
            />
            <Path
              d="M29 5.5A23.5 23.5 0 1 1 28.99 5.5"
              fill="none"
              stroke={config.color}
              strokeDasharray={`${(score / 100) * 147.65} 147.65`}
              strokeLinecap="round"
              strokeWidth={5}
            />
          </Svg>
          <Text style={[styles.journeyReliabilityScore, { color: config.color }]}>{score}%</Text>
        </View>
        <View style={styles.journeyReliabilityCopy}>
          <Text style={styles.journeyReliabilityTitle}>Timeline Reliability</Text>
          <Text style={[styles.journeyReliabilityLevel, { color: config.color }]}>
            {config.level} Confidence
          </Text>
          <Text style={styles.journeyReliabilityHint}>
            {reliability.factors.length} factor{reliability.factors.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      {reliability.factors.length ? (
        <View style={styles.journeyReliabilityFactors}>
          {reliability.factors.map((factor) => (
            <View key={`${factor.label}-${factor.description}`} style={styles.journeyReliabilityFactorRow}>
              <Text style={[styles.journeyReliabilityImpactIcon, getReliabilityImpactStyle(factor.impact)]}>
                {getReliabilityImpactIcon(factor.impact)}
              </Text>
              <View style={styles.journeyReliabilityFactorCopy}>
                <Text style={styles.journeyReliabilityFactorLabel}>{factor.label}</Text>
                <Text style={styles.journeyReliabilityFactorDescription}>
                  {factor.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function getActiveMilestone(milestones: StayMilestone[], currentSegment?: string | null) {
  if (!milestones.length) {
    return null;
  }

  const normalizedCurrentSegment = normalizeSegmentKey(currentSegment);

  return (
    milestones.find((milestone) => normalizeSegmentKey(milestone.id) === normalizedCurrentSegment) ||
    milestones.find(
      (milestone) => normalizeSegmentKey(milestone.title) === normalizedCurrentSegment,
    ) ||
    milestones.find((milestone) => milestone.critical && !milestone.completed) ||
    milestones.find((milestone) => !milestone.completed) ||
    milestones[milestones.length - 1]
  );
}

function getMilestoneStatusIcon(milestone: StayMilestone) {
  if (milestone.completed) {
    return <CheckIcon />;
  }

  if (milestone.critical) {
    return <MilestoneAlertIcon />;
  }

  return <MilestoneCircleIcon />;
}

function MilestoneAlertIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
      <Path
        d="M6.5 1.35L11.45 10.4C11.65 10.76 11.39 11.2 10.98 11.2H2.02C1.61 11.2 1.35 10.76 1.55 10.4L6.5 1.35Z"
        stroke="#D97706"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.4}
      />
      <Path d="M6.5 4.7V7.1" stroke="#D97706" strokeLinecap="round" strokeWidth={1.4} />
      <Path d="M6.5 9.1H6.505" stroke="#D97706" strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function MilestoneCircleIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
      <Path
        d="M6.5 11.1C9.04051 11.1 11.1 9.04051 11.1 6.5C11.1 3.95949 9.04051 1.9 6.5 1.9C3.95949 1.9 1.9 3.95949 1.9 6.5C1.9 9.04051 3.95949 11.1 6.5 11.1Z"
        stroke="#98A2B3"
        strokeWidth={1.4}
      />
    </Svg>
  );
}

function HighlightedActionButton({ label }: { label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.stayViewHotelButton, pressed && styles.pressedFeedback]}
    >
      <Text style={styles.stayViewHotelText}>{label}</Text>
    </Pressable>
  );
}

function HighlightedDetailsToggle({ isExpanded, onPress }: DetailsToggleProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isExpanded ? 'Hide category details' : 'See category details'}
      onPress={onPress}
      style={({ pressed }) => [styles.stayMoreDetailsLink, pressed && styles.pressedFeedback]}
    >
      <Text style={styles.stayMoreDetailsText}>{isExpanded ? 'Hide Details' : 'More Details'}</Text>
      <ChevronDownIcon
        style={[styles.stayMoreDetailsChevron, isExpanded && styles.detailsChevronExpanded]}
      />
    </Pressable>
  );
}

function HighlightedDetailsPanel({ item }: { item: HighlightedCategoryItem }) {
  return (
    <View style={styles.hotelDetailsPanel}>
      {item.details.map((detail) => (
        <View key={`${item.key}-${detail.label}`} style={styles.hotelDetailRow}>
          <Text style={styles.hotelDetailLabel}>{detail.label}:</Text>
          <DetailChip icon={getHighlightedDetailIcon(detail.icon)} label={detail.value} />
        </View>
      ))}
    </View>
  );
}

function getHighlightedDetailIcon(icon: HighlightedDetailIcon) {
  switch (icon) {
    case 'check':
      return <CheckIcon />;
    case 'hotel':
      return <HotelIcon size={13} />;
    case 'location':
      return <MapPinIcon />;
    case 'terminal':
      return <TerminalIcon />;
    case 'clock':
    default:
      return <ClockIcon size={13} />;
  }
}

function FlightDetailsPanel({ itinerary }: { itinerary: ItinerarySummary }) {
  const seatAssignments = getSeatAssignments(itinerary.seats);

  return (
    <View style={styles.flightDetailsPanel}>
      <Text style={styles.detailSectionLabel}>Departure &amp; Arrival</Text>
      <View style={styles.airportCardsRow}>
        <AirportCard
          icon={<DeparturePlaneIcon />}
          title={itinerary.departureAirportTitle}
          time={itinerary.departureTime}
        />
        <AirportCard
          icon={<ArrivalPlaneIcon />}
          title={itinerary.arrivalAirportTitle}
          time={itinerary.arrivalTime}
        />
      </View>

      <Text style={styles.detailSectionLabel}>Check-In &amp; Gate</Text>
      <View style={styles.detailChipRow}>
        <DetailChip icon={<TerminalIcon />} label={`Terminal: ${itinerary.terminal}`} />
        <DetailChip icon={<GateIcon />} label={`Gate: ${itinerary.gate}`} />
      </View>
      <View style={styles.detailChipCentered}>
        <DetailChip icon={<CheckIcon />} label={`Check-In: ${itinerary.checkIn}`} />
      </View>

      <Text style={styles.detailSectionLabel}>Seat(s)</Text>
      <View style={styles.detailChipRow}>
        {seatAssignments.map((seat, index) => (
          <DetailChip
            key={`${seat}-${index}`}
            icon={
              <Image
                resizeMode="cover"
                source={seatProfileImages[index]}
                style={styles.seatProfileImage}
              />
            }
            label={seat}
          />
        ))}
      </View>
    </View>
  );
}

function getSeatAssignments(seats: string[]) {
  const usableSeats = seats.filter((seat) => seat !== 'TBD');

  return [usableSeats[0] || '1A', usableSeats[1] || '1B'];
}

type AirportCardProps = {
  icon: ReactNode;
  title: string;
  time: string;
};

function AirportCard({ icon, title, time }: AirportCardProps) {
  return (
    <View style={styles.airportCard}>
      <View style={styles.airportTitleRow}>
        {icon}
        <Text style={styles.airportTitle}>{title}</Text>
      </View>
      <View style={styles.airportTimeRow}>
        <ClockIcon size={13} />
        <Text style={styles.airportTime}>{time}</Text>
      </View>
    </View>
  );
}

type DetailChipProps = {
  icon: ReactNode;
  label: string;
};

function DetailChip({ icon, label }: DetailChipProps) {
  return (
    <View style={styles.detailChip}>
      {icon}
      <Text style={styles.detailChipText}>{label}</Text>
    </View>
  );
}

function getObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
      )
    : [];
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function getBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeStatus(value: unknown): string {
  return getString(value).toLowerCase();
}

function normalizeRiskLevel(value: unknown): JourneySegmentRiskLevel | undefined {
  const risk = getString(value).toLowerCase().replace(/[-\s]+/g, '_');

  if (risk === 'action_needed' || risk === 'high' || risk === 'critical' || risk === 'blocked') {
    return 'action_needed';
  }

  if (risk === 'watch' || risk === 'medium' || risk === 'warning' || risk === 'delayed') {
    return 'watch';
  }

  if (risk === 'on_track' || risk === 'low' || risk === 'ok' || risk === 'completed') {
    return 'on_track';
  }

  return undefined;
}

function getMilestoneTitle(record: Record<string, unknown>, fallback: string) {
  return (
    getString(record.title) ||
    getString(record.name) ||
    getString(record.label) ||
    getString(record.segment_type) ||
    getString(record.type) ||
    fallback
  );
}

function getMilestoneDescription(record: Record<string, unknown>) {
  return (
    getString(record.description) ||
    getString(record.subtitle) ||
    getString(record.meta) ||
    getString(record.helper)
  );
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => getString(item)).filter(Boolean)
    : getString(value)
      ? [getString(value)]
      : [];
}

function getMilestoneRiskDetails(record: Record<string, unknown>) {
  return [
    ...getStringArray(record.details),
    ...getStringArray(record.factors),
    ...getStringArray(record.risk_factors),
    ...getStringArray(record.actions),
    ...getStringArray(record.recommended_actions),
  ];
}

function getMilestoneRiskMessage(record: Record<string, unknown>) {
  return (
    getString(record.risk_message) ||
    getString(record.riskMessage) ||
    getString(record.message) ||
    getString(record.explanation)
  );
}

function getMilestoneDueDate(record: Record<string, unknown>) {
  return (
    getString(record.dueDate) ||
    getString(record.due_date) ||
    getString(record.startTime) ||
    getString(record.start_time) ||
    getString(record.starts_at) ||
    getString(record.endTime) ||
    getString(record.end_time) ||
    getString(record.ends_at)
  );
}

function normalizeMilestone(
  record: Record<string, unknown>,
  index: number,
  activeSegment?: string,
  activeSegmentRiskLevel?: JourneySegmentRiskLevel,
): StayMilestone {
  const status = normalizeStatus(record.status ?? record.state);
  const id =
    getString(record.id) ||
    getString(record.event_id) ||
    getString(record.segment_type) ||
    `milestone-${index}`;
  const completed =
    getBoolean(record.completed) ??
    (status === 'completed' || status === 'passed' || status === 'done');
  const critical =
    getBoolean(record.critical) ??
    (!completed &&
      (status === 'active' ||
        status === 'in_progress' ||
        status === 'delayed' ||
        Boolean(activeSegment && normalizeSegmentKey(id) === normalizeSegmentKey(activeSegment))));
  const isActiveSegment = Boolean(activeSegment && normalizeSegmentKey(id) === normalizeSegmentKey(activeSegment));
  const explicitRisk =
    normalizeRiskLevel(record.risk_level) ||
    normalizeRiskLevel(record.riskLevel) ||
    normalizeRiskLevel(record.risk) ||
    normalizeRiskLevel(record.overallStatus) ||
    normalizeRiskLevel(record.overall_status) ||
    normalizeRiskLevel(getRecord(record.context)?.risk_level) ||
    normalizeRiskLevel(getRecord(record.context)?.riskLevel) ||
    normalizeRiskLevel(getRecord(record.context)?.risk);
  const riskLevel =
    explicitRisk ||
    (isActiveSegment ? activeSegmentRiskLevel : undefined) ||
    (status === 'blocked' || status === 'cancelled'
      ? 'action_needed'
      : critical
        ? 'watch'
        : isActiveSegment || status === 'active' || status === 'in_progress'
          ? 'on_track'
          : undefined);

  return {
    completed,
    critical,
    description: getMilestoneDescription(record),
    dueDate: getMilestoneDueDate(record),
    id,
    riskDetails: getMilestoneRiskDetails(record),
    riskLevel,
    riskMessage: getMilestoneRiskMessage(record),
    title: formatSegmentLabel(getMilestoneTitle(record, `Milestone ${index + 1}`)),
  };
}

function getJourneyMilestones(journey?: JourneyItem): StayMilestone[] {
  const activeSegment = journey?.current_segment || journey?.mobile_payload_v1?.current_segment;
  const activeSegmentRiskLevel = getJourneyCurrentRiskLevel(journey);
  const timeline = getRecord(journey?.timeline);
  const explicitMilestones = getObjectArray(timeline?.milestones);

  if (explicitMilestones.length) {
    return explicitMilestones.map((milestone, index) =>
      normalizeMilestone(milestone, index, activeSegment, activeSegmentRiskLevel),
    );
  }

  const segmentMilestones = getObjectArray(journey?.segments);

  if (segmentMilestones.length) {
    return segmentMilestones.map((segment, index) =>
      normalizeMilestone(segment, index, activeSegment, activeSegmentRiskLevel),
    );
  }

  const liveRows = journey?.mobile_payload_v1?.live_mode.log?.rows || [];

  if (liveRows.length) {
    return liveRows.map((row, index) =>
      normalizeMilestone(row, index, activeSegment, activeSegmentRiskLevel),
    );
  }

  const routeLegs = journey?.mobile_payload_v1?.live_routes.legs || [];

  if (routeLegs.length) {
    return routeLegs.map((leg, index) =>
      normalizeMilestone(leg, index, activeSegment, activeSegmentRiskLevel),
    );
  }

  const timelineEvents = getObjectArray(timeline?.events);

  if (timelineEvents.length) {
    return timelineEvents.map((event, index) =>
      normalizeMilestone(event, index, activeSegment, activeSegmentRiskLevel),
    );
  }

  return [
    {
      completed: Boolean(journey?.context?.planned_destination || journey?.mobile_payload_v1?.summary.destination),
      description: journey?.mobile_payload_v1?.summary.destination || 'Destination selected',
      id: 'destination_selected',
      riskLevel: activeSegment === 'inspiration' ? activeSegmentRiskLevel : undefined,
      title: 'Confirm destination',
    },
    {
      completed: false,
      critical: true,
      description: 'Compare stay options before arrival',
      id: 'review_stay_options',
      title: 'Review stay options',
    },
    {
      completed: false,
      description: 'Book a hotel or save a stay to complete this step',
      id: 'book_accommodation',
      title: 'Book accommodation',
    },
  ];
}

function getJourneyLiveProgress(journey?: JourneyItem): LiveProgress | null {
  return journey?.mobile_payload_v1?.live_mode.progress || null;
}

function getTimelineReliabilityConfig(score: number) {
  if (score >= 85) {
    return { color: '#10B981', level: 'High' };
  }

  if (score >= 70) {
    return { color: '#002AFF', level: 'Good' };
  }

  if (score >= 50) {
    return { color: '#F59E0B', level: 'Moderate' };
  }

  return { color: '#EF4444', level: 'Low' };
}

function getReliabilityImpactIcon(impact: JourneyReliabilityImpact) {
  if (impact === 'positive') {
    return '↗';
  }

  if (impact === 'negative') {
    return '↘';
  }

  return '–';
}

function getReliabilityImpactStyle(impact: JourneyReliabilityImpact) {
  if (impact === 'positive') {
    return { color: '#10B981' };
  }

  if (impact === 'negative') {
    return { color: '#EF4444' };
  }

  return { color: '#667085' };
}

function getJourneyReliability(journey?: JourneyItem): JourneyTimelineReliability {
  const mobilePayload = journey?.mobile_payload_v1;
  const timeline = getRecord(journey?.timeline);
  const explicitScore = Number(
    timeline?.reliability ?? timeline?.confidence ?? mobilePayload?.live_mode.progress?.percent,
  );
  const fallbackScore = calculateFallbackReliabilityScore(journey);
  const factors = getJourneyReliabilityFactors(journey);

  return {
    factors,
    score: Number.isFinite(explicitScore) ? explicitScore : fallbackScore,
  };
}

function calculateFallbackReliabilityScore(journey?: JourneyItem) {
  const milestones = [
    ...getObjectArray(journey?.segments),
    ...getObjectArray(journey?.mobile_payload_v1?.live_mode.log?.rows),
  ];

  if (!milestones.length) {
    return 82;
  }

  const penalties = milestones.reduce((total, milestone) => {
    const status = normalizeStatus(milestone.status ?? milestone.state);
    const risk = normalizeRiskLevel(milestone.risk_level ?? milestone.riskLevel ?? milestone.risk);

    if (risk === 'action_needed' || status === 'blocked' || status === 'cancelled') {
      return total + 30;
    }

    if (risk === 'watch' || status === 'delayed' || status === 'active') {
      return total + 12;
    }

    return total;
  }, 0);

  return Math.max(35, Math.min(95, 88 - penalties));
}

function getJourneyReliabilityFactors(journey?: JourneyItem): JourneyReliabilityFactor[] {
  const context = getRecord(journey?.context);
  const monitoring = getRecord(context?.monitoring);
  const flightStatus = getRecord(context?.flight_status);
  const traffic = getRecord(monitoring?.traffic) || getRecord(context?.traffic);
  const weather = getRecord(monitoring?.weather) || getRecord(context?.weather);
  const airport = getRecord(monitoring?.airport_conditions) || getRecord(context?.airport_conditions);
  const factors: JourneyReliabilityFactor[] = [];

  if (flightStatus) {
    const delay = Number(flightStatus.delay_minutes ?? flightStatus.delayMinutes ?? 0);
    const status = normalizeStatus(flightStatus.status);
    const flightLabel = [flightStatus.airline, flightStatus.flight_number].map(getString).filter(Boolean).join(' ');

    factors.push({
      description:
        status === 'cancelled'
          ? `${flightLabel || 'Flight'} cancelled`
          : delay > 0
            ? `${flightLabel || 'Flight'} delayed ${delay} min`
            : `${flightLabel || 'Flight'} confirmed`,
      impact: status === 'cancelled' || delay > 30 ? 'negative' : delay > 0 ? 'neutral' : 'positive',
      label: 'Flight Status',
    });
  }

  if (traffic) {
    const conditions = getString(traffic.conditions) || 'unknown';
    const duration = Number(traffic.current_duration_minutes ?? traffic.duration_minutes ?? 0);
    const delay = Number(traffic.delay_minutes ?? traffic.delayMinutes ?? 0);

    factors.push({
      description: `${formatSegmentLabel(conditions)} traffic${duration ? ` - ${duration} min ETA` : ''}`,
      impact: delay > 15 || conditions === 'heavy' ? 'negative' : delay > 0 || conditions === 'moderate' ? 'neutral' : 'positive',
      label: 'Traffic Conditions',
    });
  }

  if (weather) {
    const current = getRecord(weather.current) || weather;
    const condition = getString(current.condition) || 'Weather available';
    const temperature = current.temperature_celsius ?? current.temperatureCelsius;

    factors.push({
      description: `${condition}${temperature !== undefined ? `, ${temperature}°C` : ''}`,
      impact: isSevereWeatherCondition(current) ? 'negative' : 'positive',
      label: 'Weather',
    });
  }

  if (airport) {
    const security = getRecord(airport.security);
    const congestion = getRecord(airport.congestion);
    const wait = Number(security?.average_wait_minutes ?? airport.security_wait_minutes ?? 0);

    factors.push({
      description: `Security wait: ~${wait || 0} min, ${getString(congestion?.overall_level) || 'unknown'} congestion`,
      impact: wait > 30 ? 'negative' : wait > 15 ? 'neutral' : 'positive',
      label: 'Airport Conditions',
    });
  }

  if (!factors.length) {
    return [
      {
        description: 'Confirmed items and live context are being monitored',
        impact: 'positive',
        label: 'Journey Signal',
      },
      {
        description: 'Live updates will adjust this score as conditions change',
        impact: 'neutral',
        label: 'Context Monitoring',
      },
    ];
  }

  return factors;
}

function isSevereWeatherCondition(current: Record<string, unknown>) {
  const condition = getString(current.condition).toLowerCase();
  const windSpeed = Number(current.wind_speed_kmh ?? current.windSpeedKmh ?? 0);

  return (
    ['thunderstorm', 'tornado', 'hurricane', 'blizzard', 'heavy rain', 'heavy snow'].some((item) =>
      condition.includes(item),
    ) || windSpeed > 60
  );
}

function getJourneyCurrentRiskLevel(journey?: JourneyItem): JourneySegmentRiskLevel | undefined {
  const metadata = getRecord(journey?.metadata);
  const context = getRecord(journey?.context);
  const progress = journey?.mobile_payload_v1?.live_mode.progress;
  const activeSegment = journey?.current_segment || journey?.mobile_payload_v1?.current_segment;
  const segmentRiskLevels = getRecord(metadata?.segment_risk_levels);
  const activeSegmentRisk = activeSegment ? segmentRiskLevels?.[activeSegment] : undefined;
  const monitoring = getRecord(context?.monitoring);
  const traffic = getRecord(monitoring?.traffic) || getRecord(context?.traffic);
  const trafficDelayMinutes = Number(traffic?.delay_minutes ?? traffic?.delayMinutes ?? 0);

  return (
    normalizeRiskLevel(progress?.risk_level) ||
    normalizeRiskLevel(activeSegmentRisk) ||
    normalizeRiskLevel(metadata?.current_segment_risk_level) ||
    normalizeRiskLevel(context?.current_segment_risk_level) ||
    normalizeRiskLevel(context?.risk_level) ||
    (trafficDelayMinutes >= 15 ? 'watch' : undefined)
  );
}

function getJourneyRiskMessage(level: JourneySegmentRiskLevel) {
  if (level === 'action_needed') {
    return 'This segment needs attention before you continue.';
  }

  if (level === 'watch') {
    return 'Keep an eye on this segment while live context updates.';
  }

  return 'This segment is currently on track.';
}

function hasJourneyHotels(journey?: JourneyItem) {
  return Boolean(
    getObjectArray(journey?.booked_hotels).length ||
      getObjectArray(journey?.saved_hotels).length ||
      getObjectArray(journey?.home_payload?.raw_collections?.booked_hotels).length ||
      getObjectArray(journey?.home_payload?.raw_collections?.saved_hotels).length,
  );
}

function formatMilestoneDate(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

function formatSegmentLabel(value?: string | null) {
  if (!value) {
    return '';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeSegmentKey(value?: string | null) {
  return getString(value).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function getHighlightedCategoryItems(
  itinerary: ItinerarySummary,
  journey?: JourneyItem,
  showStayMilestoneTracker = Boolean(journey) && !hasJourneyHotels(journey),
): HighlightedCategoryItem[] {
  return [
    {
      actionLabel: 'View Hotel',
      details: [
        { icon: 'hotel', label: 'Hotel Name', value: itinerary.hotelName },
        { icon: 'check', label: 'Adults', value: itinerary.hotelAdults },
        { icon: 'clock', label: 'Check-In Time', value: itinerary.hotelCheckInTime },
        { icon: 'location', label: 'Hotel Address', value: itinerary.hotelAddress },
      ],
      eyebrow: 'Now Staying In:',
      key: 'stays',
      liveProgress: getJourneyLiveProgress(journey),
      location: itinerary.hotelAddress,
      milestones: getJourneyMilestones(journey),
      reliability: getJourneyReliability(journey),
      showMilestoneTracker: showStayMilestoneTracker,
      statusText: `${itinerary.statusLabel} · Arrival: ${itinerary.arrivalTime}`,
      title: itinerary.hotelName,
    },
    {
      actionLabel: 'View Route',
      details: [
        { icon: 'terminal', label: 'Line', value: 'Airport Express 42' },
        { icon: 'clock', label: 'Departure', value: '15:20' },
        { icon: 'location', label: 'Pickup', value: 'LHR Terminal 3 Bus Stand' },
        { icon: 'check', label: 'Fare', value: '£6.80 prepaid' },
      ],
      eyebrow: 'Public Transport:',
      key: 'public_transport',
      location: 'LHR Terminal 3 · Stand B12',
      statusText: 'Booked · Departs in 35 min',
      title: 'Airport Express 42',
    },
    {
      actionLabel: 'View Driver',
      details: [
        { icon: 'check', label: 'Driver', value: 'Amina K.' },
        { icon: 'clock', label: 'Pickup Time', value: '15:35' },
        { icon: 'location', label: 'Pickup Zone', value: 'Arrivals Hall Door 4' },
        { icon: 'terminal', label: 'Vehicle', value: 'Black Mercedes V-Class' },
      ],
      eyebrow: 'Private Transport:',
      key: 'private_transport',
      location: 'Arrivals Hall · Door 4',
      statusText: 'Confirmed · Driver assigned',
      title: 'Executive Airport Transfer',
    },
    {
      actionLabel: 'View Rental',
      details: [
        { icon: 'terminal', label: 'Provider', value: 'Avis Preferred' },
        { icon: 'clock', label: 'Pickup Time', value: '16:00' },
        { icon: 'location', label: 'Counter', value: 'LHR Car Rental Centre' },
        { icon: 'check', label: 'Vehicle', value: 'Compact SUV · Automatic' },
      ],
      eyebrow: 'Car Rental:',
      key: 'car_rental',
      location: 'LHR Car Rental Centre',
      statusText: 'Reserved · Pickup today',
      title: 'Compact SUV Reservation',
    },
    {
      actionLabel: 'Track Ride',
      details: [
        { icon: 'check', label: 'Driver', value: 'Leo M.' },
        { icon: 'terminal', label: 'Plate', value: 'LDN 4827' },
        { icon: 'clock', label: 'ETA', value: '7 min' },
        { icon: 'location', label: 'Pickup', value: 'Ride Share Zone C' },
      ],
      eyebrow: 'Ride Share:',
      key: 'ride_share',
      location: 'Ride Share Zone C',
      statusText: 'Arriving · ETA 7 min',
      title: 'Uber Comfort to Hotel',
    },
    {
      actionLabel: 'View Metro',
      details: [
        { icon: 'terminal', label: 'Line', value: 'Piccadilly Line' },
        { icon: 'clock', label: 'Next Train', value: '15:18' },
        { icon: 'location', label: 'Platform', value: 'Terminal 2 & 3 Platform 1' },
        { icon: 'check', label: 'Stop', value: 'Green Park' },
      ],
      eyebrow: 'Metro:',
      key: 'metro',
      location: 'Terminal 2 & 3 · Platform 1',
      statusText: 'On Time · Next train 15:18',
      title: 'Piccadilly Line Inbound',
    },
    {
      actionLabel: 'View Pass',
      details: [
        { icon: 'terminal', label: 'Pass', value: 'Zone 1-2 Day Pass' },
        { icon: 'clock', label: 'Valid Until', value: '23:59' },
        { icon: 'location', label: 'Start Area', value: 'Central London' },
        { icon: 'check', label: 'Modes', value: 'Bus · Tram · Tube' },
      ],
      eyebrow: 'Urban Transport:',
      key: 'urban_transport',
      location: 'Central London · Zones 1-2',
      statusText: 'Active · Day pass ready',
      title: 'Urban Mobility Day Pass',
    },
    {
      actionLabel: 'View Pier',
      details: [
        { icon: 'terminal', label: 'Service', value: 'Thames Clipper RB1' },
        { icon: 'clock', label: 'Departure', value: '17:10' },
        { icon: 'location', label: 'Pier', value: 'Westminster Pier' },
        { icon: 'check', label: 'Seat', value: 'Open deck access' },
      ],
      eyebrow: 'Water Transport:',
      key: 'water_transport',
      location: 'Westminster Pier · Gate 2',
      statusText: 'Scheduled · Boarding 16:55',
      title: 'Thames River Transfer',
    },
    {
      actionLabel: 'View Flight',
      details: [
        { icon: 'terminal', label: 'Operator', value: 'SkyPort Air Taxi' },
        { icon: 'clock', label: 'Lift Off', value: '18:25' },
        { icon: 'location', label: 'Vertiport', value: 'London City Vertiport' },
        { icon: 'check', label: 'Seat', value: 'Cabin 2A' },
      ],
      eyebrow: 'Air Taxi:',
      key: 'air_taxi',
      location: 'London City Vertiport',
      statusText: 'Confirmed · Security 18:00',
      title: 'SkyPort Cross-City Hop',
    },
  ];
}

type ItinerarySummary = {
  arrivalCode: string;
  airlineImageUrl?: string;
  airlineText: string;
  arrivalTime: string;
  dateText: string;
  departureAirportTitle: string;
  departureCode: string;
  departureTime: string;
  arrivalAirportTitle: string;
  checkIn: string;
  gate: string;
  hotelName: string;
  hotelAddress: string;
  hotelAdults: string;
  hotelCheckInTime: string;
  seats: string[];
  statusLabel: string;
  terminal: string;
};

function getString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) {
    return 'Mar 04 \u2013 Mar 04, 2026';
  }

  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : startDate;

  if (!startDate || Number.isNaN(startDate.getTime())) {
    return 'Dates TBD';
  }

  const startText = startDate.toLocaleDateString('en', { month: 'short', day: '2-digit' });
  const endText =
    endDate && !Number.isNaN(endDate.getTime())
      ? endDate.toLocaleDateString('en', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : startDate.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' });

  return `${startText} \u2013 ${endText}`;
}

function formatTime(value?: string): string {
  if (!value) {
    return '14:45';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '14:45';
  }

  return date.toLocaleTimeString('en', { hour: '2-digit', hour12: false, minute: '2-digit' });
}

function getFirstObject(items: unknown[] | undefined): Record<string, unknown> | null {
  return Array.isArray(items) && typeof items[0] === 'object' && items[0] !== null
    ? (items[0] as Record<string, unknown>)
    : null;
}

function getActiveJourney(journeys: JourneyItem[]) {
  return (
    journeys.find((item) => item.mobile_payload_v1?.is_active) ||
    journeys.find((item) => item.is_active) ||
    journeys.find((item) => item.status === 'in_progress') ||
    journeys[0]
  );
}

function getActiveMobilePayload(journeys: JourneyItem[], activeJourney?: JourneyItem) {
  return (
    activeJourney?.mobile_payload_v1 ||
    journeys.find((item) => item.mobile_payload_v1?.is_active)?.mobile_payload_v1 ||
    journeys.find((item) => item.is_active)?.mobile_payload_v1 ||
    journeys.find((item) => item.status === 'in_progress')?.mobile_payload_v1 ||
    journeys[0]?.mobile_payload_v1
  );
}

function getCardDetailString(card: JourneyCardItem, ...keys: string[]) {
  for (const key of keys) {
    const value = card.details?.[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function getAirlineImageUrl(journey?: JourneyItem) {
  const bookedFlight = getFirstObject(journey?.booked_flights);
  const savedFlight = getFirstObject(journey?.saved_flights);
  const flightRecord = bookedFlight || savedFlight;

  if (!flightRecord) {
    return undefined;
  }

  const airlineCode = getAirlineCode(flightRecord);
  const airlineName = getString(flightRecord.airline);
  const match =
    (airlineCode ? airlineImageMap[airlineCode] : undefined) ||
    Object.values(airlineImageMap).find(
      (entry) => entry.name?.toLowerCase() === airlineName.toLowerCase(),
    );

  return match?.airline_image;
}

function getAirlineCode(flightRecord: Record<string, unknown>) {
  const explicitCode =
    getString(flightRecord.airline_code) ||
    getString(flightRecord.airlineCode) ||
    getString(flightRecord.carrier_code) ||
    getString(flightRecord.carrierCode) ||
    getString(flightRecord.iata) ||
    getString(flightRecord.airline_iata);

  if (explicitCode) {
    return explicitCode.toUpperCase();
  }

  const flightNumber =
    getString(flightRecord.flight_number) ||
    getString(flightRecord.flightNumber) ||
    getString(flightRecord.flightNo);
  const flightNumberCode = flightNumber.match(/^[A-Za-z]{2}/)?.[0];

  return flightNumberCode?.toUpperCase();
}

function getItinerarySummary(
  journeys: JourneyItem[],
  card?: JourneyCardItem,
  activeJourney?: JourneyItem,
): ItinerarySummary {
  const airlineImageUrl = getAirlineImageUrl(activeJourney);

  if (card) {
    const isFlight = card.filter_key === 'flights';
    const departureCode =
      card.origin?.code ||
      getCardDetailString(card, 'departure_airport_code', 'from_code', 'origin', 'from') ||
      'TRIP';
    const arrivalCode =
      card.destination?.code ||
      getCardDetailString(card, 'arrival_airport_code', 'to_code', 'destination', 'to') ||
      card.filter_key.replace(/_/g, ' ').toUpperCase();
    const departureTime =
      card.starts_at || getCardDetailString(card, 'departure_time', 'departure');
    const arrivalTime = card.ends_at || getCardDetailString(card, 'arrival_time', 'arrival');
    const airline = getCardDetailString(card, 'airline', 'carrier');
    const flightNumber = getCardDetailString(card, 'flight_number', 'flightNumber', 'flightNo');
    const hotelName =
      card.filter_key === 'stays' ? card.title : getCardDetailString(card, 'hotel_name', 'name');

    return {
      arrivalCode,
      airlineImageUrl,
      airlineText: isFlight ? `${airline || 'Flight'} ${flightNumber}`.trim() : card.title,
      arrivalTime: formatTime(arrivalTime || undefined),
      arrivalAirportTitle: `Arrival: ${card.destination?.name || getAirportDisplayName(arrivalCode)}`,
      checkIn: getCardDetailString(card, 'check_in', 'checkIn') || 'TBD',
      dateText: formatDateRange(departureTime || undefined, arrivalTime || undefined),
      departureAirportTitle: `Departure: ${card.origin?.name || getAirportDisplayName(departureCode)}`,
      departureCode,
      departureTime: formatTime(departureTime || undefined),
      gate: getCardDetailString(card, 'gate') || 'TBD',
      hotelAddress:
        card.destination?.address ||
        getCardDetailString(card, 'address', 'formatted_address') ||
        card.subtitle ||
        'Address TBD',
      hotelAdults: String(card.details?.adults || 'TBD'),
      hotelCheckInTime: getCardDetailString(card, 'check_in_time') || 'TBD',
      hotelName: hotelName || card.title,
      seats:
        Array.isArray(card.details?.seats) && card.details.seats.length
          ? (card.details.seats as string[])
          : ['TBD'],
      statusLabel: card.status === 'booked' ? 'Booked' : card.status,
      terminal: getCardDetailString(card, 'terminal') || 'TBD',
    };
  }

  const journey =
    activeJourney ||
    journeys.find((item) => item.is_active) ||
    journeys.find((item) => item.status === 'in_progress') ||
    journeys.find((item) => item.status === 'planning') ||
    journeys[0];
  const flight = journey?.context?.flight_status;
  const payload = journey?.home_payload;
  const payloadFlight = payload?.flight;
  const payloadHotel = payload?.hotel;
  const payloadTrip = payload?.trip;

  if (payload) {
    const departureCode =
      payloadTrip?.departure_code || payloadFlight?.departure_airport_code || 'JFK';
    const arrivalCode = payloadTrip?.arrival_code || payloadFlight?.arrival_airport_code || 'LAX';
    const departureTime = payloadFlight?.departure_time || payloadTrip?.start_date;
    const arrivalTime = payloadFlight?.arrival_time || payloadTrip?.end_date;
    const seats =
      Array.isArray(payloadFlight?.seats) && payloadFlight.seats.length
        ? payloadFlight.seats
        : ['TBD'];

    return {
      arrivalCode,
      airlineImageUrl,
      airlineText:
        payloadFlight?.airline_text ||
        `${payloadFlight?.airline || 'American Airlines'} ${payloadFlight?.flight_number || 'AA2451'}`.trim(),
      arrivalTime: payloadFlight?.arrival_time_text || formatTime(arrivalTime),
      arrivalAirportTitle: `Arrival: ${
        payloadFlight?.arrival_airport_name || getAirportDisplayName(arrivalCode)
      }`,
      checkIn: payloadFlight?.check_in || 'TBD',
      dateText: payloadFlight?.date_text || formatDateRange(departureTime, arrivalTime),
      departureAirportTitle: `Departure: ${
        payloadFlight?.departure_airport_name || getAirportDisplayName(departureCode)
      }`,
      departureCode,
      departureTime: formatTime(departureTime),
      gate: payloadFlight?.gate || 'TBD',
      hotelAddress: payloadHotel?.address || 'Address TBD',
      hotelAdults: typeof payloadHotel?.adults === 'number' ? String(payloadHotel.adults) : 'TBD',
      hotelCheckInTime: payloadHotel?.check_in_time || 'TBD',
      hotelName: payloadHotel?.name || 'Hotel TBD',
      seats,
      statusLabel:
        payloadFlight?.status_label ||
        (journey?.status === 'in_progress' ? 'In Progress' : 'On Time'),
      terminal: payloadFlight?.terminal || 'TBD',
    };
  }

  const bookedFlight = getFirstObject(journey?.booked_flights);
  const savedFlight = getFirstObject(journey?.saved_flights);
  const flightRecord = bookedFlight || savedFlight;
  const hotel = getFirstObject(journey?.booked_hotels) || getFirstObject(journey?.saved_hotels);
  const departureCode =
    flight?.departure_airport ||
    getString(flightRecord?.from_code) ||
    getString(flightRecord?.from) ||
    getString(flightRecord?.origin) ||
    'JFK';
  const arrivalCode =
    flight?.arrival_airport ||
    getString(flightRecord?.to_code) ||
    getString(flightRecord?.to) ||
    getString(flightRecord?.destination) ||
    getString(journey?.context?.planned_destination) ||
    'LAX';
  const airline = flight?.airline || getString(flightRecord?.airline) || 'American Airlines';
  const flightNumber =
    flight?.flight_number ||
    getString(flightRecord?.flight_number) ||
    getString(flightRecord?.flightNumber) ||
    'AA2451';
  const departureTime =
    flight?.departure_time ||
    getString(flightRecord?.departure) ||
    getString(flightRecord?.departureTime) ||
    journey?.context?.planned_departure_date;
  const arrivalTime =
    flight?.arrival_time ||
    getString(flightRecord?.arrival) ||
    getString(flightRecord?.arrivalTime);
  const hotelName =
    getString(hotel?.name) ||
    getString(hotel?.hotel_name) ||
    getString(journey?.context?.hotel_name) ||
    'Hotel Bel-Air';

  return {
    arrivalCode,
    airlineImageUrl,
    airlineText: `${airline} ${flightNumber}`.trim(),
    arrivalTime: formatTime(arrivalTime),
    arrivalAirportTitle: `Arrival: ${getAirportDisplayName(arrivalCode)}`,
    checkIn: 'TBD',
    dateText: formatDateRange(
      departureTime || journey?.context?.start_date,
      arrivalTime || journey?.context?.end_date,
    ),
    departureAirportTitle: `Departure: ${getAirportDisplayName(departureCode)}`,
    departureCode,
    departureTime: formatTime(departureTime),
    gate: 'TBD',
    hotelAddress: getString(hotel?.address) || 'Address TBD',
    hotelAdults: typeof hotel?.adults === 'number' ? String(hotel.adults) : 'TBD',
    hotelCheckInTime: getString(hotel?.check_in_time) || 'TBD',
    hotelName,
    seats: ['TBD'],
    statusLabel: flight?.status || (journey?.status === 'in_progress' ? 'In Progress' : 'On Time'),
    terminal: 'TBD',
  };
}

function StatusBadge({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Track flight status"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.statusPill, pressed && styles.pressedFeedback]}
    >
      <PlaneStatusIcon />
      <Text numberOfLines={1} style={styles.statusText}>
        {label}
      </Text>
    </Pressable>
  );
}

function PlaneStatusIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path
        d="M10.3833 11.2L9.33333 6.41667L11.375 4.375C12.25 3.5 12.5417 2.33333 12.25 1.75C11.6667 1.45833 10.5 1.75 9.625 2.625L7.58333 4.66667L2.8 3.61667C2.50833 3.55833 2.275 3.675 2.15833 3.90833L1.98333 4.2C1.86667 4.49167 1.925 4.78333 2.15833 4.95833L5.25 7L4.08333 8.75H2.33333L1.75 9.33333L3.5 10.5L4.66667 12.25L5.25 11.6667V9.91667L7 8.75L9.04167 11.8417C9.21667 12.075 9.50833 12.1333 9.8 12.0167L10.0917 11.9C10.325 11.725 10.4417 11.4917 10.3833 11.2Z"
        stroke="#00A67E"
        strokeWidth={1.16667}
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AmericanAirlinesMark() {
  return <Image resizeMode="contain" source={americanAirlinesLogo} style={styles.airlineMark} />;
}

function CalendarSmallIcon() {
  return (
    <Svg width={11} height={16} viewBox="0 0 11 16">
      <G clipPath="url(#calendarClip)">
        <Path
          d="M3.58855 3.5144V5.30868"
          stroke="#000"
          strokeWidth={0.897135}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M7.17708 3.5144V5.30868"
          stroke="#000"
          strokeWidth={0.897135}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M8.52279 4.41138H2.24284C1.74736 4.41138 1.3457 4.81304 1.3457 5.30851V11.5885C1.3457 12.0839 1.74736 12.4856 2.24284 12.4856H8.52279C9.01826 12.4856 9.41992 12.0839 9.41992 11.5885V5.30851C9.41992 4.81304 9.01826 4.41138 8.52279 4.41138Z"
          stroke="#000"
          strokeWidth={0.897135}
          strokeLinecap="round"
          fill="none"
          strokeLinejoin="round"
        />
        <Path
          d="M1 7H14"
          stroke="#000"
          strokeWidth={0.897135}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
      <Defs>
        <ClipPath id="calendarClip">
          <Rect width={10.7656} height={16} />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

function DeparturePlaneIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 13 13">
      <Path
        d="M1.08333 11.9167H11.9167"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
      <Path
        d="M3.445 9.42503L2.16667 9.20836L1.08333 7.04169L1.67917 6.74378C1.83038 6.66758 1.99734 6.62789 2.16667 6.62789C2.33599 6.62789 2.50295 6.66758 2.65417 6.74378L2.74625 6.79794C2.89746 6.87414 3.06443 6.91383 3.23375 6.91383C3.40307 6.91383 3.57004 6.87414 3.72125 6.79794L4.33333 6.50003L2.70833 3.25003L3.19583 3.00628C3.37603 2.91763 3.57732 2.88082 3.77723 2.89995C3.97714 2.91908 4.1678 2.9934 4.32792 3.11461L6.50542 4.73961C6.66609 4.86187 6.85773 4.9368 7.05872 4.95594C7.25971 4.97508 7.46205 4.93768 7.64292 4.84794L9.9125 3.73211C10.2025 3.58591 10.5366 3.55308 10.8496 3.64003L11.375 3.79169C11.4836 3.82184 11.584 3.8758 11.6691 3.94965C11.7542 4.02349 11.8218 4.11537 11.8669 4.2186C11.912 4.32184 11.9336 4.43383 11.93 4.54644C11.9265 4.65905 11.8978 4.76945 11.8462 4.86961L11.6404 5.28128C11.5158 5.53044 11.3154 5.73628 11.0608 5.86628L4.10583 9.31669C3.90132 9.41799 3.67005 9.45211 3.445 9.41419V9.42503Z"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrivalPlaneIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 13 13">
      <Path
        d="M1.08333 11.9167H11.9167"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
      <Path
        d="M2.04208 5.83383L1.08333 4.87508L2.16666 2.43758L2.76249 2.7355C3.06041 2.88716 3.24999 3.1905 3.24999 3.52091C3.24999 3.85133 3.43958 4.15466 3.7375 4.30633L4.33333 4.60425L5.95833 1.35425L6.52708 1.64133C6.68514 1.72006 6.82156 1.83623 6.92447 1.97973C7.02737 2.12322 7.09364 2.2897 7.1175 2.46466L7.50749 5.38966C7.53135 5.56463 7.59762 5.73111 7.70052 5.8746C7.80343 6.0181 7.93985 6.13427 8.09791 6.213L10.4812 7.40466C10.7087 7.52383 10.9037 7.70258 11.0283 7.92467L11.3533 8.48258C11.6187 8.95925 11.3208 9.55508 10.7792 9.62008L10.14 9.70133C9.88541 9.73383 9.62541 9.6905 9.39791 9.57133L2.32374 6.03966C2.21935 5.98672 2.12423 5.91721 2.04208 5.83383Z"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ color = '#000000', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 13">
      <Path
        d="M6.5 3.24992V6.49992L8.66666 7.58325M11.9167 6.49992C11.9167 9.49146 9.49154 11.9166 6.5 11.9166C3.50846 11.9166 1.08333 9.49146 1.08333 6.49992C1.08333 3.50838 3.50846 1.08325 6.5 1.08325C9.49154 1.08325 11.9167 3.50838 11.9167 6.49992Z"
        stroke={color}
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TerminalIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 13 13">
      <Path
        d="M3.25 11.9166V2.16659C3.25 1.87927 3.36414 1.60372 3.5673 1.40055C3.77047 1.19739 4.04602 1.08325 4.33333 1.08325H8.66667C8.95398 1.08325 9.22953 1.19739 9.4327 1.40055C9.63586 1.60372 9.75 1.87927 9.75 2.16659V11.9166H3.25Z"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
      <Path
        d="M3.25 6.5H2.16667C1.87935 6.5 1.6038 6.61414 1.40064 6.8173C1.19747 7.02047 1.08334 7.29602 1.08334 7.58333V10.8333C1.08334 11.1207 1.19747 11.3962 1.40064 11.5994C1.6038 11.8025 1.87935 11.9167 2.16667 11.9167H3.25"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
      <Path
        d="M9.75 4.875H10.8333C11.1207 4.875 11.3962 4.98914 11.5994 5.1923C11.8025 5.39547 11.9167 5.67102 11.9167 5.95833V10.8333C11.9167 11.1207 11.8025 11.3962 11.5994 11.5994C11.3962 11.8025 11.1207 11.9167 10.8333 11.9167H9.75"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
      <Path
        d="M5.41666 3.25H7.58333M5.41666 5.41675H7.58333M5.41666 7.58325H7.58333M5.41666 9.75H7.58333"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GateIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 13 13">
      <Path
        d="M7.04167 2.16675H8.66667C8.95399 2.16675 9.22954 2.28088 9.4327 2.48405C9.63587 2.68721 9.75001 2.96276 9.75001 3.25008V10.8334M1.08333 10.8333H2.70833M7.04167 10.8333H11.9167M5.41667 6.5V6.50542"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
      <Path
        d="M7.04166 2.47111V11.2228C7.04164 11.3051 7.02287 11.3863 6.98679 11.4602C6.9507 11.5342 6.89825 11.5989 6.8334 11.6496C6.76856 11.7002 6.69303 11.7354 6.61255 11.7525C6.53206 11.7696 6.44874 11.7681 6.36891 11.7482L2.70833 10.8334V3.01278C2.70836 2.7712 2.78915 2.53656 2.93784 2.34616C3.08652 2.15576 3.29459 2.02052 3.52895 1.96194L5.69562 1.42028C5.85528 1.38037 6.02193 1.37736 6.18292 1.41148C6.34391 1.44559 6.49502 1.51594 6.62476 1.61718C6.75451 1.71842 6.85948 1.84788 6.93172 1.99575C7.00396 2.14362 7.04155 2.30654 7.04166 2.47111Z"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 13 13">
      <Path
        d="M10.8333 3.25L4.87501 9.20833L2.16667 6.5"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HotelIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Path
        d="M5.68359 12.6838V8.94971M6.82031 6.43164H6.826M6.82031 4.1582H6.826M7.95703 8.94971V12.6838M8.52539 9.27344C8.03349 8.90451 7.43519 8.70508 6.82031 8.70508C6.20543 8.70508 5.60714 8.90451 5.11523 9.27344M9.09375 6.43164H9.09943M9.09375 4.1582H9.09943M4.54688 6.43164H4.55256M4.54688 4.1582H4.55256"
        stroke="#000"
        fill="none"
        strokeWidth={1.13672}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.2305 1.31641H3.41016C2.78236 1.31641 2.27344 1.82533 2.27344 2.45312V11.5469C2.27344 12.1747 2.78236 12.6836 3.41016 12.6836H10.2305C10.8583 12.6836 11.3672 12.1747 11.3672 11.5469V2.45312C11.3672 1.82533 10.8583 1.31641 10.2305 1.31641Z"
        stroke="#000"
        fill="none"
        strokeWidth={1.13672}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MapPinIcon({ color = '#000000' }: { color?: string }) {
  return (
    <Svg width={11} height={13} viewBox="0 0 11 13">
      <Path
        d="M8.93883 5.6063C8.93883 7.83787 6.46322 10.162 5.63191 10.8798C5.55447 10.938 5.46019 10.9695 5.3633 10.9695C5.2664 10.9695 5.17213 10.938 5.09469 10.8798C4.26338 10.162 1.78777 7.83787 1.78777 5.6063C1.78777 4.658 2.16447 3.74855 2.83502 3.07801C3.50556 2.40747 4.41501 2.03076 5.3633 2.03076C6.31159 2.03076 7.22104 2.40747 7.89158 3.07801C8.56213 3.74855 8.93883 4.658 8.93883 5.6063Z"
        stroke={color}
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
      <Path
        d="M5.3633 6.94679C6.10382 6.94679 6.70413 6.34648 6.70413 5.60596C6.70413 4.86544 6.10382 4.26514 5.3633 4.26514C4.62278 4.26514 4.02248 4.86544 4.02248 5.60596C4.02248 6.34648 4.62278 6.94679 5.3633 6.94679Z"
        stroke={color}
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
