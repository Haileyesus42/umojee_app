import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { itineraryLhrImage } from '../../assets/images';
import { styles } from '../../theme/styles';
import airlineImages from '../home/components/airlineImages.json';

type AirlineImageEntry = {
  airline_image?: string;
  iata?: string;
  icao?: string;
  name?: string;
};

type InlineJourneySummary = {
  airlineImageUrl?: string;
  airlineText: string;
  arrivalCode: string;
  arrivalTime: string;
  checkIn: string;
  dateText: string;
  departureCode: string;
  departureTime: string;
  gate: string;
  hotelLocation: string;
  hotelName: string;
  seat: string;
  statusLabel: string;
  terminal: string;
};

const airlineImageMap = airlineImages as Record<string, AirlineImageEntry>;

export function InlineJourneyDetailsCard({ payload }: { payload: unknown }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const lastPressTimeRef = useRef(0);
  const summary = getInlineJourneySummary(payload);
  const imageSource = summary.airlineImageUrl
    ? { uri: summary.airlineImageUrl }
    : itineraryLhrImage;

  function handlePress() {
    const now = Date.now();

    if (now - lastPressTimeRef.current < 320) {
      setIsFlipped((currentValue) => !currentValue);
    }

    lastPressTimeRef.current = now;
  }

  return (
    <Pressable
      accessibilityLabel="Journey details card"
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.chatInlineJourneyCard, pressed && styles.pressedFeedback]}
    >
      {isFlipped ? (
        <InlineJourneyFlightDetails summary={summary} />
      ) : (
        <>
          <View style={styles.chatInlineJourneyDots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <View style={styles.chatInlineFlightRow}>
            <Image source={imageSource} style={styles.chatInlineFlightImage} />
            <View style={styles.chatInlineFlightCopy}>
              <View style={styles.chatInlineFlightTitleRow}>
                <View style={styles.tripTitleRow}>
                  <Text style={styles.chatInlineTripTitle}>{summary.departureCode}</Text>
                  <JourneyArrowIcon />
                  <Text style={styles.chatInlineTripTitle}>{summary.arrivalCode}</Text>
                </View>
                <View style={styles.chatInlineStatusPill}>
                  <PlaneStatusSmallIcon />
                  <Text numberOfLines={1} style={styles.chatInlineStatusText}>
                    {summary.statusLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.chatInlineMetaRow}>
                <PlaneStatusSmallIcon color="#002AFF" />
                <Text numberOfLines={1} style={styles.chatInlineBodyText}>
                  {summary.airlineText}
                </Text>
              </View>
              <View style={styles.chatInlineMetaRow}>
                <CalendarTinyIcon />
                <Text numberOfLines={1} style={styles.chatInlineBodyText}>
                  {summary.dateText}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.chatInlineStayBox}>
            <Text numberOfLines={1} style={styles.chatInlineStayEyebrow}>
              Stay
            </Text>
            <Text numberOfLines={1} style={styles.chatInlineStayTitle}>
              {summary.hotelName}
            </Text>
            <Text numberOfLines={1} style={styles.chatInlineStayLocation}>
              {summary.hotelLocation}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

function InlineJourneyFlightDetails({ summary }: { summary: InlineJourneySummary }) {
  return (
    <View style={styles.chatInlineFlightDetailsBack}>
      <Text style={styles.chatInlineDetailsTitle}>Flight Details</Text>
      <View style={styles.chatInlineAirportCardsRow}>
        <View style={styles.chatInlineAirportCard}>
          <View style={styles.chatInlineAirportTitleRow}>
            <DeparturePlaneTinyIcon />
            <Text numberOfLines={1} style={styles.chatInlineAirportTitle}>
              Departure: {summary.departureCode}
            </Text>
          </View>
          <View style={styles.chatInlineAirportTimeRow}>
            <ClockTinyIcon />
            <Text style={styles.chatInlineAirportTime}>{summary.departureTime}</Text>
          </View>
        </View>
        <View style={styles.chatInlineAirportCard}>
          <View style={styles.chatInlineAirportTitleRow}>
            <ArrivalPlaneTinyIcon />
            <Text numberOfLines={1} style={styles.chatInlineAirportTitle}>
              Arrival: {summary.arrivalCode}
            </Text>
          </View>
          <View style={styles.chatInlineAirportTimeRow}>
            <ClockTinyIcon />
            <Text style={styles.chatInlineAirportTime}>{summary.arrivalTime}</Text>
          </View>
        </View>
      </View>

      <View style={styles.chatInlineDetailChipRow}>
        <InlineDetailChip icon={<TerminalTinyIcon />} label={`Terminal: ${summary.terminal}`} />
        <InlineDetailChip icon={<GateTinyIcon />} label={`Gate: ${summary.gate}`} />
      </View>
      <View style={styles.chatInlineDetailChipRow}>
        <InlineDetailChip icon={<CheckTinyIcon />} label={`Check-In: ${summary.checkIn}`} />
        <InlineDetailChip icon={<SeatTinyIcon />} label={`Seat: ${summary.seat}`} />
      </View>
    </View>
  );
}

function InlineDetailChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View style={styles.chatInlineDetailChip}>
      {icon}
      <Text numberOfLines={1} style={styles.chatInlineDetailChipText}>
        {label}
      </Text>
    </View>
  );
}

function getInlineJourneySummary(payload: unknown): InlineJourneySummary {
  const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const journey =
    root.journey && typeof root.journey === 'object'
      ? (root.journey as Record<string, unknown>)
      : root;
  const context =
    journey.context && typeof journey.context === 'object'
      ? (journey.context as Record<string, unknown>)
      : {};
  const flight = getFirstRecord(journey.booked_flights) || getFirstRecord(journey.saved_flights);
  const hotel = getFirstRecord(journey.booked_hotels) || getFirstRecord(journey.saved_hotels);
  const departureCode =
    getFlightText(flight, 'from_code', 'from', 'origin') ||
    getText(context.departure_airport_code) ||
    'TRIP';
  const arrivalCode =
    getFlightText(flight, 'to_code', 'to', 'destination') ||
    getText(context.destination_airport_code) ||
    getText(context.planned_destination) ||
    'DEST';
  const flightNumber = getFlightText(
    flight,
    'flight_number',
    'flightNumber',
    'flightNo',
    'flight_no',
  );
  const airline = getFlightText(flight, 'airline') || 'Flight';
  const departureDate =
    getFlightText(flight, 'departure', 'departureTime', 'departure_time') ||
    getText(context.planned_departure_date);
  const arrivalDate = getFlightText(flight, 'arrival', 'arrivalTime', 'arrival_time');
  const hotelName = getText(hotel?.name) || getText(hotel?.hotel_name) || 'Stay details pending';

  return {
    airlineImageUrl: getAirlineImageUrlFromRecord(flight),
    airlineText: `${airline} ${flightNumber}`.trim(),
    arrivalCode: arrivalCode.toUpperCase(),
    arrivalTime: formatInlineTime(arrivalDate),
    checkIn: getFlightText(flight, 'check_in', 'checkIn') || 'TBD',
    dateText: formatInlineDateRange(departureDate, arrivalDate),
    departureCode: departureCode.toUpperCase(),
    departureTime: formatInlineTime(departureDate),
    gate: getFlightText(flight, 'gate') || 'TBD',
    hotelLocation:
      getText(hotel?.address) ||
      getText(hotel?.city) ||
      getText(context.planned_destination) ||
      'Location TBD',
    hotelName,
    seat: getFlightText(flight, 'seat', 'seats') || 'TBD',
    statusLabel: titleCase(getText(journey.status) || 'Planning'),
    terminal: getFlightText(flight, 'terminal') || 'TBD',
  };
}

function getFirstRecord(value: unknown): Record<string, unknown> | null {
  return Array.isArray(value) && value[0] && typeof value[0] === 'object'
    ? (value[0] as Record<string, unknown>)
    : null;
}

function getText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function getFlightText(flight: Record<string, unknown> | null, ...keys: string[]) {
  if (!flight) {
    return '';
  }

  const metadata =
    flight.metadata && typeof flight.metadata === 'object'
      ? (flight.metadata as Record<string, unknown>)
      : {};

  for (const key of keys) {
    const value = getText(flight[key]) || getText(metadata[key]);

    if (value) {
      return value;
    }
  }

  return '';
}

function formatInlineDateRange(start?: string, end?: string) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : startDate;

  if (!startDate || Number.isNaN(startDate.getTime())) {
    return 'Dates TBD';
  }

  const startText = startDate.toLocaleDateString('en', { day: '2-digit', month: 'short' });
  const endText =
    endDate && !Number.isNaN(endDate.getTime())
      ? endDate.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })
      : startDate.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' });

  return `${startText} - ${endText}`;
}

function formatInlineTime(value?: string) {
  if (!value) {
    return 'TBD';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString('en', { hour: '2-digit', hour12: false, minute: '2-digit' });
}

function getAirlineImageUrlFromRecord(flight: Record<string, unknown> | null) {
  if (!flight) {
    return undefined;
  }

  const code =
    getText(flight.airline_code) ||
    getText(flight.airlineCode) ||
    getText(flight.carrier_code) ||
    getText(flight.carrierCode) ||
    getText(flight.iata) ||
    getText(flight.airline_iata) ||
    getText(flight.flight_number).match(/^[A-Za-z]{2}/)?.[0] ||
    getText(flight.flightNumber).match(/^[A-Za-z]{2}/)?.[0];
  const airlineName = getText(flight.airline).toLowerCase();
  const match =
    (code ? airlineImageMap[code.toUpperCase()] : undefined) ||
    Object.values(airlineImageMap).find((entry) => entry.name?.toLowerCase() === airlineName);

  return match?.airline_image;
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function JourneyArrowIcon() {
  return (
    <Svg width={9} height={9} viewBox="0 0 9 9">
      <Path
        d="M1.5 4.5h5.4M4.8 2.4l2.1 2.1-2.1 2.1"
        stroke="#4D4D4D"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlaneStatusSmallIcon({ color = '#00A67E' }: { color?: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 14 14">
      <Path
        d="M10.3833 11.2L9.33333 6.41667L11.375 4.375C12.25 3.5 12.5417 2.33333 12.25 1.75C11.6667 1.45833 10.5 1.75 9.625 2.625L7.58333 4.66667L2.8 3.61667C2.50833 3.55833 2.275 3.675 2.15833 3.90833L1.98333 4.2C1.86667 4.49167 1.925 4.78333 2.15833 4.95833L5.25 7L4.08333 8.75H2.33333L1.75 9.33333L3.5 10.5L4.66667 12.25L5.25 11.6667V9.91667L7 8.75L9.04167 11.8417C9.21667 12.075 9.50833 12.1333 9.8 12.0167L10.0917 11.9C10.325 11.725 10.4417 11.4917 10.3833 11.2Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function CalendarTinyIcon() {
  return (
    <Svg width={11} height={12} viewBox="0 0 12 12">
      <Path
        d="M3.5 1.5v2M8.5 1.5v2M2.5 4.5h7M3 2.5h6a1 1 0 011 1V9a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5a1 1 0 011-1z"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function DeparturePlaneTinyIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 13 13">
      <Path
        d="M1.08333 11.9167H11.9167M3.445 9.42503L2.16667 9.20836L1.08333 7.04169L1.67917 6.74378C1.83038 6.66758 1.99734 6.62789 2.16667 6.62789C2.33599 6.62789 2.50295 6.66758 2.65417 6.74378L2.74625 6.79794C2.89746 6.87414 3.06443 6.91383 3.23375 6.91383C3.40307 6.91383 3.57004 6.87414 3.72125 6.79794L4.33333 6.50003L2.70833 3.25003L3.19583 3.00628C3.37603 2.91763 3.57732 2.88082 3.77723 2.89995C3.97714 2.91908 4.1678 2.9934 4.32792 3.11461L6.50542 4.73961C6.66609 4.86187 6.85773 4.9368 7.05872 4.95594C7.25971 4.97508 7.46205 4.93768 7.64292 4.84794L9.9125 3.73211C10.2025 3.58591 10.5366 3.55308 10.8496 3.64003L11.375 3.79169C11.4836 3.82184 11.584 3.8758 11.6691 3.94965C11.7542 4.02349 11.8218 4.11537 11.8669 4.2186C11.912 4.32184 11.9336 4.43383 11.93 4.54644C11.9265 4.65905 11.8978 4.76945 11.8462 4.86961L11.6404 5.28128C11.5158 5.53044 11.3154 5.73628 11.0608 5.86628L4.10583 9.31669C3.90132 9.41799 3.67005 9.45211 3.445 9.41419V9.42503Z"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrivalPlaneTinyIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 13 13">
      <Path
        d="M1.08333 11.9167H11.9167M2.04208 5.83383L1.08333 4.87508L2.16666 2.43758L2.76249 2.7355C3.06041 2.88716 3.24999 3.1905 3.24999 3.52091C3.24999 3.85133 3.43958 4.15466 3.7375 4.30633L4.33333 4.60425L5.95833 1.35425L6.52708 1.64133C6.68514 1.72006 6.82156 1.83623 6.92447 1.97973C7.02737 2.12322 7.09364 2.2897 7.1175 2.46466L7.50749 5.38966C7.53135 5.56463 7.59762 5.73111 7.70052 5.8746C7.80343 6.0181 7.93985 6.13427 8.09791 6.213L10.4812 7.40466C10.7087 7.52383 10.9037 7.70258 11.0283 7.92467L11.3533 8.48258C11.6187 8.95925 11.3208 9.55508 10.7792 9.62008L10.14 9.70133C9.88541 9.73383 9.62541 9.6905 9.39791 9.57133L2.32374 6.03966C2.21935 5.98672 2.12423 5.91721 2.04208 5.83383Z"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockTinyIcon() {
  return (
    <Svg width={10} height={10} viewBox="0 0 13 13">
      <Path
        d="M6.5 3.24992V6.49992L8.66666 7.58325M11.9167 6.49992C11.9167 9.49146 9.49154 11.9166 6.5 11.9166C3.50846 11.9166 1.08333 9.49146 1.08333 6.49992C1.08333 3.50838 3.50846 1.08325 6.5 1.08325C9.49154 1.08325 11.9167 3.50838 11.9167 6.49992Z"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TerminalTinyIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 13 13">
      <Path
        d="M3.25 11.9166V2.16659C3.25 1.87927 3.36414 1.60372 3.5673 1.40055C3.77047 1.19739 4.04602 1.08325 4.33333 1.08325H8.66667C8.95398 1.08325 9.22953 1.19739 9.4327 1.40055C9.63586 1.60372 9.75 1.87927 9.75 2.16659V11.9166H3.25ZM5.41666 3.25H7.58333M5.41666 5.41675H7.58333M5.41666 7.58325H7.58333M5.41666 9.75H7.58333"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GateTinyIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 13 13">
      <Path
        d="M7.04167 2.16675H8.66667C8.95399 2.16675 9.22954 2.28088 9.4327 2.48405C9.63587 2.68721 9.75001 2.96276 9.75001 3.25008V10.8334M1.08333 10.8333H2.70833M7.04167 10.8333H11.9167M5.41667 6.5V6.50542M7.04166 2.47111V11.2228C7.04164 11.3051 7.02287 11.3863 6.98679 11.4602C6.9507 11.5342 6.89825 11.5989 6.8334 11.6496C6.76856 11.7002 6.69303 11.7354 6.61255 11.7525C6.53206 11.7696 6.44874 11.7681 6.36891 11.7482L2.70833 10.8334V3.01278C2.70836 2.7712 2.78915 2.53656 2.93784 2.34616C3.08652 2.15576 3.29459 2.02052 3.52895 1.96194L5.69562 1.42028C5.85528 1.38037 6.02193 1.37736 6.18292 1.41148C6.34391 1.44559 6.49502 1.51594 6.62476 1.61718C6.75451 1.71842 6.85948 1.84788 6.93172 1.99575C7.00396 2.14362 7.04155 2.30654 7.04166 2.47111Z"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckTinyIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 13 13">
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

function SeatTinyIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 13 13">
      <Path
        d="M3.25 11.375V9.75M9.75 11.375V9.75M2.16667 6.5H10.8333M3.25 1.625H9.75C10.346 1.625 10.8333 2.11231 10.8333 2.70833V7.04167C10.8333 8.23728 9.86228 9.20833 8.66667 9.20833H4.33333C3.13772 9.20833 2.16667 8.23728 2.16667 7.04167V2.70833C2.16667 2.11231 2.654 1.625 3.25 1.625Z"
        stroke="#000"
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
