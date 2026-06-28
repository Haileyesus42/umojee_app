import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CalendarIcon, RightArrowIcon } from '../../../assets/icons';
import type {
  JourneyCardItem,
  JourneyItem,
  MobileJourneyFilterKey,
} from '../../../api/notifications';
import { Panel } from '../../../components/ui/Panel';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { styles } from '../../../theme/styles';
import { CategoryScroller } from './CategoryScroller';
import { PaginationDots } from './PaginationDots';

const emiratesLogo = require('../../../../assets/images/emirates-logo 1.png');

type UpcomingCardProps = {
  journeys?: JourneyItem[];
  onOpenCalendar: () => void;
};

export function UpcomingCard({ journeys = [], onOpenCalendar }: UpcomingCardProps) {
  const [selectedFilterKey, setSelectedFilterKey] = useState<MobileJourneyFilterKey>('all');
  const mobilePayload = getActiveMobilePayload(journeys);
  const mobileCards = mobilePayload?.cards.upcoming || [];
  const sortedCards = [...mobileCards].sort((a, b) => getCardTimestamp(a) - getCardTimestamp(b));
  const filteredCards =
    selectedFilterKey === 'all'
      ? sortedCards
      : sortedCards.filter((card) => card.filter_key === selectedFilterKey);
  const upcoming = getUpcomingSummary(journeys, filteredCards[0] || sortedCards[0]);

  return (
    <Panel>
      <View style={styles.sectionTopRow}>
        <Text style={styles.panelTitle}>Upcoming</Text>
        <LinearGradient
          colors={['#002AFF', '#77F2F6']}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.82]}
          start={{ x: 0, y: 0 }}
          style={styles.calendarButtonBorder}
        >
          <Pressable
            accessibilityLabel="Open calendar"
            accessibilityRole="button"
            onPress={onOpenCalendar}
            style={({ pressed }) => [styles.calendarButton, pressed && styles.pressedFeedback]}
          >
            <CalendarIcon style={styles.calendarIconImage} />
          </Pressable>
        </LinearGradient>
      </View>
      <PaginationDots style={styles.upcomingRaisedDots} />
      <CategoryScroller
        filters={mobilePayload?.filters}
        onFilterPress={(filterKey) => {
          setSelectedFilterKey(filterKey);
          if (filterKey === 'all') {
            onOpenCalendar();
          }
        }}
        selectedFilterKey={selectedFilterKey}
        viewportStyle={styles.upcomingCategoryViewport}
      />

      <View style={styles.upcomingTrip}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=200&h=280&fit=crop',
          }}
          style={styles.flightImage}
        />
        <View style={styles.upcomingCopy}>
          <View style={styles.upcomingHeader}>
            <View>
              <Text style={styles.caption}>Trip:</Text>
              <View style={styles.tripTitleRow}>
                <Text style={styles.tripTitle}>{upcoming.departureCode}</Text>
                <RightArrowIcon style={styles.tripArrowIcon} />
                <Text style={styles.tripTitle}>{upcoming.arrivalCode}</Text>
              </View>
            </View>
            <Text style={styles.caption}>{upcoming.relativeTime}</Text>
          </View>
          <View style={styles.flightMetaRow}>
            <Image resizeMode="contain" source={emiratesLogo} style={styles.airlineMark} />
            <Text numberOfLines={1} style={styles.bodyText}>
              {upcoming.airlineText}
            </Text>
          </View>
          <View style={styles.flightMetaRow}>
            <HotelIcon />
            <Text numberOfLines={1} style={styles.bodyText}>
              {upcoming.hotelName}
            </Text>
          </View>
          <View style={styles.flightMetaRow}>
            <MapPinIcon />
            <Text numberOfLines={1} style={styles.bodyText}>
              {upcoming.description}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoBoxCompact}>
        <View style={styles.hotelBookedRow}>
          <Text style={styles.bookedLarge}>{upcoming.hotelStatus}</Text>
          <PrimaryButton label="View Hotel" />
        </View>
        <Text style={styles.caption}>{upcoming.checkInText}</Text>
      </View>
      <Text style={styles.manageTrip}>Manage Trip</Text>
    </Panel>
  );
}

type UpcomingSummary = {
  airlineText: string;
  arrivalCode: string;
  checkInText: string;
  departureCode: string;
  description: string;
  hotelName: string;
  hotelStatus: string;
  relativeTime: string;
};

function getString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function getFirstObject(items: unknown[] | undefined): Record<string, unknown> | null {
  return Array.isArray(items) && typeof items[0] === 'object' && items[0] !== null
    ? (items[0] as Record<string, unknown>)
    : null;
}

function getDepartureTimestamp(journey: JourneyItem): number {
  const payloadDate =
    journey.home_payload?.flight?.departure_time || journey.home_payload?.trip?.start_date;
  if (payloadDate) {
    const payloadTimestamp = new Date(payloadDate).getTime();

    if (!Number.isNaN(payloadTimestamp)) {
      return payloadTimestamp;
    }
  }

  const flight = journey.context?.flight_status;
  const savedFlight = getFirstObject(journey.saved_flights);
  const bookedFlight = getFirstObject(journey.booked_flights);
  const flightRecord = bookedFlight || savedFlight;
  const dateValue =
    flight?.departure_time ||
    getString(flightRecord?.departure) ||
    getString(flightRecord?.departureTime) ||
    journey.context?.planned_departure_date ||
    journey.context?.start_date ||
    journey.created_at;
  const timestamp = dateValue ? new Date(dateValue).getTime() : 0;

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatRelative(timestamp: number): string {
  if (!timestamp) {
    return 'Upcoming';
  }

  const diffMs = timestamp - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours > 48) {
    return `In ${Math.round(diffHours / 24)} days`;
  }

  if (diffHours > 0) {
    return `In ${diffHours} hours`;
  }

  return 'Now';
}

function getActiveMobilePayload(journeys: JourneyItem[]) {
  return (
    journeys.find((item) => item.mobile_payload_v1?.is_active)?.mobile_payload_v1 ||
    journeys.find((item) => item.is_active)?.mobile_payload_v1 ||
    journeys.find((item) => item.status === 'in_progress')?.mobile_payload_v1 ||
    journeys[0]?.mobile_payload_v1
  );
}

function getCardTimestamp(card: JourneyCardItem): number {
  const timestamp = card.starts_at ? new Date(card.starts_at).getTime() : 0;

  return Number.isNaN(timestamp) || timestamp <= Date.now() ? Number.MAX_SAFE_INTEGER : timestamp;
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

function getUpcomingSummary(journeys: JourneyItem[], card?: JourneyCardItem): UpcomingSummary {
  if (card) {
    const departureCode =
      card.origin?.code ||
      getCardDetailString(card, 'departure_airport_code', 'from_code', 'origin', 'from') ||
      'TRIP';
    const arrivalCode =
      card.destination?.code ||
      getCardDetailString(card, 'arrival_airport_code', 'to_code', 'destination', 'to') ||
      card.filter_key.replace(/_/g, ' ').toUpperCase();
    const airline = getCardDetailString(card, 'airline', 'carrier');
    const flightNumber = getCardDetailString(card, 'flight_number', 'flightNumber', 'flightNo');

    return {
      airlineText:
        card.filter_key === 'flights'
          ? `${airline || 'Flight'} ${flightNumber}`.trim()
          : card.title,
      arrivalCode,
      checkInText: card.starts_at
        ? `Starts ${formatRelative(new Date(card.starts_at).getTime())}`
        : 'Trip planning in progress',
      departureCode,
      description: card.subtitle || card.destination?.name || card.filter_key.replace(/_/g, ' '),
      hotelName: card.filter_key === 'stays' ? card.title : card.destination?.name || card.title,
      hotelStatus: card.status === 'booked' ? 'Booked' : card.status,
      relativeTime: card.starts_at
        ? formatRelative(new Date(card.starts_at).getTime())
        : 'Upcoming',
    };
  }

  const futureJourneys = journeys
    .filter((journey) => journey.status !== 'cancelled' && journey.status !== 'completed')
    .sort((a, b) => getDepartureTimestamp(a) - getDepartureTimestamp(b));
  const journey = futureJourneys[0] || journeys[0];
  const payload = journey?.home_payload;

  if (payload) {
    const departureCode =
      payload.trip?.departure_code || payload.flight?.departure_airport_code || 'JFK';
    const arrivalCode = payload.trip?.arrival_code || payload.flight?.arrival_airport_code || 'SIN';
    const hotelName = payload.hotel?.name || 'Hotel TBD';

    return {
      airlineText:
        payload.flight?.airline_text ||
        `${payload.flight?.airline || 'Airline TBD'} ${payload.flight?.flight_number || ''}`.trim(),
      arrivalCode,
      checkInText: payload.hotel?.check_in_text || 'Trip planning in progress',
      departureCode,
      description:
        payload.trip?.description || `Visiting ${payload.trip?.destination || arrivalCode}`,
      hotelName,
      hotelStatus:
        payload.hotel?.status_label || (payload.hotel?.source ? 'Hotel Booked' : 'Hotel Planned'),
      relativeTime:
        payload.trip?.relative_time ||
        formatRelative(getDepartureTimestamp(journey || ({} as JourneyItem))),
    };
  }

  const flight = journey?.context?.flight_status;
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
    'SIN';
  const airline = flight?.airline || getString(flightRecord?.airline) || 'Emirates';
  const flightNumber =
    flight?.flight_number ||
    getString(flightRecord?.flight_number) ||
    getString(flightRecord?.flightNumber) ||
    'EK354';
  const hotelName =
    getString(hotel?.name) ||
    getString(hotel?.hotel_name) ||
    getString(journey?.context?.hotel_name) ||
    'Marina Bay Sands';
  const destination =
    getString(journey?.context?.planned_destination) ||
    getString(journey?.context?.location?.city) ||
    arrivalCode;
  const durationDays =
    typeof journey?.context?.duration_days === 'number' ? journey.context.duration_days : undefined;

  return {
    airlineText: `${airline} ${flightNumber}`.trim(),
    arrivalCode,
    checkInText: hotel ? 'Check-in opens soon' : 'Trip planning in progress',
    departureCode,
    description: `Visiting ${destination}${durationDays ? ` for ${durationDays} days` : ''}`,
    hotelName,
    hotelStatus: hotel ? 'Hotel Booked' : 'Hotel Planned',
    relativeTime: formatRelative(getDepartureTimestamp(journey || ({} as JourneyItem))),
  };
}

function HotelIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path
        d="M5.68359 12.6838V8.94971M6.82031 6.43164H6.826M6.82031 4.1582H6.826M7.95703 8.94971V12.6838M8.52539 9.27344C8.03349 8.90451 7.43519 8.70508 6.82031 8.70508C6.20543 8.70508 5.60714 8.90451 5.11523 9.27344M9.09375 6.43164H9.09943M9.09375 4.1582H9.09943M4.54688 6.43164H4.55256M4.54688 4.1582H4.55256"
        stroke="#000"
        strokeWidth={1.13672}
        strokeLinecap="round"
        fill="none"
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

function MapPinIcon() {
  return (
    <Svg width={11} height={13} viewBox="0 0 11 13">
      <Path
        d="M8.93883 5.6063C8.93883 7.83787 6.46322 10.162 5.63191 10.8798C5.55447 10.938 5.46019 10.9695 5.3633 10.9695C5.2664 10.9695 5.17213 10.938 5.09469 10.8798C4.26338 10.162 1.78777 7.83787 1.78777 5.6063C1.78777 4.658 2.16447 3.74855 2.83502 3.07801C3.50556 2.40747 4.41501 2.03076 5.3633 2.03076C6.31159 2.03076 7.22104 2.40747 7.89158 3.07801C8.56213 3.74855 8.93883 4.658 8.93883 5.6063Z"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
      <Path
        d="M5.3633 6.94679C6.10382 6.94679 6.70413 6.34648 6.70413 5.60596C6.70413 4.86544 6.10382 4.26514 5.3633 4.26514C4.62278 4.26514 4.02248 4.86544 4.02248 5.60596C4.02248 6.34648 4.62278 6.94679 5.3633 6.94679Z"
        stroke="#000"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
