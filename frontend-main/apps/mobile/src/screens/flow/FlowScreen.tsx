import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import BuildingIcon from '../../../assets/icons/flow/building.svg';
import CabIcon from '../../../assets/icons/flow/cab.svg';
import DinnerIcon from '../../../assets/icons/flow/dinner.svg';
import FlowLoopIcon from '../../../assets/icons/flow/loop-right-line.svg';
import PlaneIcon from '../../../assets/icons/flow/plane.svg';
import PhoneIcon from '../../../assets/icons/flow/phone-line.svg';
import RiverIcon from '../../../assets/icons/flow/river.svg';
import { ScreenFrame } from '../../components/layout/ScreenFrame';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';

type FlowScreenProps = {
  notificationUnreadCount?: number;
  onLogout?: () => void;
  onOpenAssistant?: () => void;
  onOpenChat: () => void;
  onOpenHome: () => void;
  onOpenJourneys?: () => void;
  onOpenNotifications: () => void;
  onOpenProfile?: () => void;
  onOpenWallet?: () => void;
  onOpenTravelSupport?: () => void;
  profileImageUri?: string | null;
};

type TimelineItem = {
  active?: boolean;
  icon: 'plane' | 'building' | 'cab' | 'dinner' | 'river' | 'phone';
  meta: string;
  section?: 'Upcoming' | 'Later';
  time: string;
  title: string;
};

const timelineItems: TimelineItem[] = [
  {
    active: true,
    icon: 'plane',
    meta: 'John & Jane  -  Depart 10:30 AM  -  Arrive 02:45 PM',
    section: 'Upcoming',
    time: 'Wed, 04 Mar',
    title: 'Flight JFK to LAX',
  },
  {
    icon: 'building',
    meta: 'Los Angeles  -  After arrival',
    time: 'Wed, 04 Mar',
    title: 'Check-in at Hotel Bel-Air',
  },
  {
    icon: 'cab',
    meta: 'LAX Airport pickup',
    section: 'Later',
    time: '03:00 PM',
    title: 'Book cab to hotel',
  },
  {
    icon: 'dinner',
    meta: 'Dinner reservation',
    time: '08:00 PM',
    title: 'Dinner at Nobu Malibu',
  },
  {
    icon: 'river',
    meta: 'Leisure activity',
    time: '11:00 AM',
    title: 'Visit Santa Monica Pier',
  },
  {
    icon: 'phone',
    meta: 'Confirm return tickets',
    time: '05:00 PM',
    title: 'Call travel agent',
  },
];

export function FlowScreen({
  notificationUnreadCount = 0,
  onLogout,
  onOpenAssistant,
  onOpenChat,
  onOpenHome,
  onOpenJourneys,
  onOpenNotifications,
  onOpenProfile,
  onOpenTravelSupport,
  onOpenWallet,
  profileImageUri,
}: FlowScreenProps) {
  return (
    <ScreenFrame
      activePageIndex={2}
      footerSource="flow"
      notificationUnreadCount={notificationUnreadCount}
      onLogout={onLogout}
      onOpenAssistant={onOpenAssistant}
      onOpenChat={onOpenChat}
      onOpenHome={onOpenHome}
      onOpenJourneys={onOpenJourneys}
      onOpenNotifications={onOpenNotifications}
      onOpenProfile={onOpenProfile}
      onOpenTravelSupport={onOpenTravelSupport}
      onOpenWallet={onOpenWallet}
      onSwipeLeft={onOpenJourneys}
      onSwipeRight={onOpenHome}
      profileImageUri={profileImageUri}
    >
      <View style={flowStyles.screen}>
        <View style={flowStyles.heading}>
          <View style={flowStyles.headingIcon}>
            <FlowLoopIcon height={21} width={21} />
          </View>
          <View style={flowStyles.headingCopy}>
            <Text style={flowStyles.title}>Flow</Text>
            <Text style={flowStyles.subtitle}>Everything you need, in order</Text>
          </View>
        </View>

        <View style={flowStyles.datePill}>
          <View style={flowStyles.dateDot} />
          <Text style={flowStyles.dateText}>Sun, 01 Mar 2026</Text>
        </View>

        <View style={flowStyles.timeline}>
          {timelineItems.map((item, index) => (
            <View key={`${item.title}-${item.time}`}>
              {item.section ? (
                <Text
                  style={[
                    flowStyles.sectionLabel,
                    index > 0 && flowStyles.sectionLabelWithSpacing,
                    item.section === 'Later' && flowStyles.sectionLabelLeftAligned,
                  ]}
                >
                  {item.section}
                </Text>
              ) : null}
              <TimelineRow item={item} isLast={index === timelineItems.length - 1} />
            </View>
          ))}
        </View>

        <Pressable
          accessibilityLabel="Add flow item"
          accessibilityRole="button"
          style={({ pressed }) => [flowStyles.addButton, pressed && sharedStyles.pressedFeedback]}
        >
          <PlusIcon />
        </Pressable>
      </View>
    </ScreenFrame>
  );
}

function TimelineRow({ item, isLast }: { item: TimelineItem; isLast: boolean }) {
  return (
    <View style={flowStyles.timelineRow}>
      <View style={flowStyles.timelineMarker}>
        <View style={[flowStyles.iconCircle, item.active && flowStyles.iconCircleActive]}>
          <TimelineIcon active={item.active} icon={item.icon} />
        </View>
        {isLast ? null : <View style={flowStyles.timelineLine} />}
      </View>

      <View style={[flowStyles.card, item.active && flowStyles.cardActive]}>
        <View style={flowStyles.cardCopy}>
          <Text
            numberOfLines={1}
            style={[flowStyles.cardTitle, item.active && flowStyles.cardTitleActive]}
          >
            {item.title}
          </Text>
          <Text numberOfLines={1} style={flowStyles.cardMeta}>
            {item.meta}
          </Text>
        </View>
        <View style={[flowStyles.timePill, item.active && flowStyles.timePillActive]}>
          <Text style={[flowStyles.timeText, item.active && flowStyles.timeTextActive]}>
            {item.time}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TimelineIcon({ icon }: { active?: boolean; icon: TimelineItem['icon'] }) {
  if (icon === 'plane') {
    return <PlaneIcon height={18} width={18} />;
  }

  if (icon === 'cab') {
    return <CabIcon height={18} width={18} />;
  }

  if (icon === 'building') {
    return <BuildingIcon height={18} width={18} />;
  }

  if (icon === 'dinner') {
    return <DinnerIcon height={18} width={18} />;
  }

  if (icon === 'river') {
    return <RiverIcon height={18} width={18} />;
  }

  if (icon === 'phone') {
    return <PhoneIcon height={18} width={18} />;
  }

  return <RiverIcon height={18} width={18} />;
}

function PlusIcon() {
  return (
    <Svg height={24} viewBox="0 0 24 24" width={24}>
      <Path d="M12 5v14M5 12h14" stroke="#FFFFFF" strokeLinecap="round" strokeWidth={2.4} />
    </Svg>
  );
}

const flowStyles = StyleSheet.create({
  screen: {
    minHeight: 805,
    paddingBottom: 38,
    paddingHorizontal: 14,
    paddingTop: 34,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 20,
    marginBottom: 36,
  },
  headingIcon: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headingCopy: {
    gap: 0,
  },
  title: {
    color: colors.ink,
    fontFamily: 'DMSans-Bold',
    fontSize: 20,
    lineHeight: 30,
  },
  subtitle: {
    color: 'rgba(0,0,0,0.5)',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    lineHeight: 30,
    marginTop: -5,
  },
  datePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    height: 28,
    marginBottom: 20,
    paddingHorizontal: 11,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 1.5,
  },
  dateDot: {
    backgroundColor: colors.blue,
    borderRadius: 3,
    height: 6,
    marginRight: 7,
    width: 6,
  },
  dateText: {
    color: colors.ink,
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    lineHeight: 18,
  },
  timeline: {
    gap: 7,
  },
  sectionLabel: {
    color: '#6B7280',
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    letterSpacing: 0.88,
    lineHeight: 16.5,
    marginLeft: 56,
    textTransform: 'uppercase',
  },
  sectionLabelWithSpacing: {
    marginTop: 2,
  },
  sectionLabelLeftAligned: {
    marginLeft: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 75,
  },
  timelineMarker: {
    alignItems: 'center',
    width: 44,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconCircleActive: {
    backgroundColor: colors.blue,
  },
  timelineLine: {
    backgroundColor: '#E5E7EB',
    flex: 1,
    marginTop: 6,
    width: 1,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    flexDirection: 'row',
    height: 67,
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },
  cardActive: {
    borderColor: 'rgba(0,42,255,0.5)',
    borderWidth: 1.5,
    elevation: 4,
    height: 68,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  cardCopy: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    lineHeight: 21,
  },
  cardTitleActive: {
    fontFamily: 'DMSans-Bold',
  },
  cardMeta: {
    color: '#6B7280',
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 18,
  },
  timePill: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    height: 22.5,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: 9,
  },
  timePillActive: {
    backgroundColor: colors.blue,
    minWidth: 84,
  },
  timeText: {
    color: '#6B7280',
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    lineHeight: 16.5,
  },
  timeTextActive: {
    color: '#FFFFFF',
  },
  addButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.blue,
    borderRadius: 28,
    elevation: 8,
    height: 56,
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 13,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    width: 56,
  },
});
