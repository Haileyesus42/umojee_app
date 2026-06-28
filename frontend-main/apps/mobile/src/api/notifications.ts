import { fetchNodeWithFallback } from './client';
import { fetchCurrentUser } from './profile/profile';

export type JourneyHomePayload = {
  journey_id: string;
  user_id?: string;
  status?: string;
  current_segment?: string;
  is_active?: boolean;
  trip?: {
    title?: string;
    departure_city?: string;
    departure_code?: string;
    destination?: string;
    arrival_code?: string;
    start_date?: string;
    end_date?: string;
    duration_days?: number;
    relative_time?: string;
    description?: string;
  };
  flight?: {
    source?: 'booked_flights' | 'saved_flights' | 'flight_status' | null;
    status_label?: string;
    booking_status?: 'booked' | 'saved' | 'planned' | null;
    airline?: string;
    airline_logo_url?: string;
    flight_number?: string;
    airline_text?: string;
    departure_airport_code?: string;
    departure_airport_name?: string;
    departure_city?: string;
    departure_time?: string;
    arrival_airport_code?: string;
    arrival_airport_name?: string;
    arrival_city?: string;
    arrival_time?: string;
    date_text?: string;
    arrival_time_text?: string;
    terminal?: string;
    gate?: string;
    check_in?: string;
    seats?: string[];
    booking_reference?: string;
    provider?: string;
    provider_order_id?: string;
    price?: number;
    currency?: string;
    raw?: Record<string, unknown> | null;
  };
  hotel?: {
    source?: 'booked_hotels' | 'saved_hotels' | null;
    booking_status?: 'booked' | 'saved' | 'planned' | null;
    status_label?: string;
    name?: string;
    image_url?: string;
    address?: string;
    city?: string;
    country?: string;
    check_in_date?: string;
    check_out_date?: string;
    check_in_time?: string;
    check_in_text?: string;
    adults?: number;
    rooms?: number;
    booking_reference?: string;
    provider?: string;
    provider_order_id?: string;
    price?: number;
    currency?: string;
    raw?: Record<string, unknown> | null;
  };
  assets?: {
    hero_image_url?: string | null;
    destination_image_url?: string | null;
    airline_logo_url?: string | null;
    hotel_image_url?: string | null;
  };
  raw_collections?: {
    booked_flights?: Record<string, unknown>[];
    booked_hotels?: Record<string, unknown>[];
    saved_flights?: Record<string, unknown>[];
    saved_hotels?: Record<string, unknown>[];
    booked_cars?: Record<string, unknown>[];
    saved_cars?: Record<string, unknown>[];
  };
  created_at?: string;
  updated_at?: string;
};

export type MobileJourneyFilterKey =
  | 'all'
  | 'public_transport'
  | 'private_transport'
  | 'flights'
  | 'stays'
  | 'car_rental'
  | 'ride_share'
  | 'metro'
  | 'urban_transport'
  | 'water_transport'
  | 'air_taxi';

export type MobileJourneyStatus = 'planning' | 'in_progress' | 'completed' | 'cancelled' | string;

export type MobileJourneyCardStatus =
  | 'planned'
  | 'saved'
  | 'booked'
  | 'active'
  | 'completed'
  | 'cancelled';

export type PlaceRef = {
  address?: string | null;
  code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  name?: string | null;
};

export type JourneyCardItem = {
  id: string;
  filter_key: MobileJourneyFilterKey;
  status: MobileJourneyCardStatus;
  title: string;
  subtitle?: string | null;
  provider?: 'amadeus' | 'duffel' | 'google_maps' | 'manual' | 'ai_generated' | string;
  image_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  origin?: PlaceRef | null;
  destination?: PlaceRef | null;
  price?: { amount: number; currency: string } | null;
  details: Record<string, unknown>;
};

export type MobileJourneyFilter = {
  count: number;
  item_ids: string[];
  key: MobileJourneyFilterKey;
  label: string;
};

export type LiveFlightSummary = {
  airline?: string | null;
  arrival_code?: string | null;
  arrival_time?: string | null;
  departure_code?: string | null;
  departure_time?: string | null;
  flight_number?: string | null;
  gate?: string | null;
  status_label?: string | null;
  terminal?: string | null;
};

export type LiveProgress = {
  current_segment?: string;
  eta_text?: string | null;
  from_label?: string | null;
  percent: number;
  risk_level?: 'action_needed' | 'on_track' | 'watch' | string | null;
  to_label?: string | null;
};

export type LiveStat = {
  key?: string;
  label: string;
  value: string;
};

export type LiveAlert = {
  created_at?: string;
  id: string;
  message: string;
  priority?: string;
  title: string;
};

export type LiveLog = {
  from?: { label?: string | null };
  percent: number;
  rows: { meta?: string; state?: 'active' | 'passed' | 'upcoming' | string; title: string }[];
  to?: { label?: string | null };
};

export type LiveRouteMap = {
  completed_percent?: number;
  coordinates?: unknown[];
  current_position?: PlaceRef | null;
  destination?: PlaceRef | null;
  origin?: PlaceRef | null;
};

export type LiveRouteLeg = {
  destination?: PlaceRef | null;
  ends_at?: string | null;
  id: string;
  mode?: string;
  origin?: PlaceRef | null;
  starts_at?: string | null;
  status?: string;
  title?: string;
};

export type LiveDirectionStep = {
  distance?: string | null;
  helper?: string | null;
  icon?: string | null;
  title: string;
};

export type MobileNotification = {
  createdAt?: string;
  journeyId?: string;
  message: string;
  title?: string;
  type?: string;
};

export type MobileJourneyPayloadV1 = {
  cards: {
    itinerary: JourneyCardItem[];
    upcoming: JourneyCardItem[];
  };
  current_segment: string;
  filters: MobileJourneyFilter[];
  is_active: boolean;
  journey_id: string;
  live_mode: {
    alerts?: LiveAlert[];
    flight_summary?: LiveFlightSummary | null;
    log?: LiveLog | null;
    progress?: LiveProgress | null;
    route_map?: LiveRouteMap | null;
    stats?: LiveStat[];
  };
  live_routes: {
    active_leg_id?: string | null;
    alerts: LiveAlert[];
    directions: LiveDirectionStep[];
    legs: LiveRouteLeg[];
    stats: LiveStat[];
  };
  notifications: {
    latest?: MobileNotification[];
    unread_count?: number;
  };
  status: MobileJourneyStatus;
  summary: {
    arrival_code?: string | null;
    departure_city?: string | null;
    departure_code?: string | null;
    description?: string | null;
    destination?: string | null;
    end_date?: string | null;
    hero_image_url?: string | null;
    relative_time?: string | null;
    start_date?: string | null;
    title?: string | null;
  };
  updated_at: string;
  user_id?: string;
  version: 1;
};

export type JourneyItem = {
  journey_id: string;
  user_id?: string;
  status?: 'planning' | 'in_progress' | 'completed' | 'cancelled' | string;
  current_segment?: string;
  metadata?: Record<string, unknown>;
  segments?: {
    segment_type?: string;
    status?: string;
    context?: Record<string, unknown>;
    activated_at?: string;
    completed_at?: string;
  }[];
  context?: {
    location?: { city?: string; country?: string };
    airport_code?: string;
    departure_city?: string;
    planned_destination?: string;
    planned_departure_date?: string;
    start_date?: string;
    end_date?: string;
    duration_days?: number;
    flight_status?: {
      flight_number?: string;
      status?: string;
      departure_time?: string;
      arrival_time?: string;
      departure_airport?: string;
      arrival_airport?: string;
      airline?: string;
      booking_reference?: string;
      amadeus_order_id?: string;
      currency?: string;
      price?: number;
    };
    [key: string]: unknown;
  };
  timeline?: {
    events?: unknown[];
    flight_departure?: string;
    flight_arrival?: string;
    departure_from_home?: string;
    arrival_home?: string;
    [key: string]: unknown;
  };
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  saved_flights?: unknown[];
  saved_hotels?: unknown[];
  saved_cars?: unknown[];
  booked_flights?: unknown[];
  booked_hotels?: unknown[];
  booked_cars?: unknown[];
  home_payload?: JourneyHomePayload;
  mobile_payload_v1?: MobileJourneyPayloadV1;
};

export type NotificationItem = {
  _id: string;
  title?: string;
  message: string;
  route?: string;
  type?: string;
  seen: boolean;
  createdAt: string;
  imageUrl?: string;
  journeyId?: string;
  metadata?: Record<string, unknown>;
  actor?: {
    userId?: string;
    name?: string;
    photo?: string;
  } | null;
};

type JourneyResponse = {
  journeys?: JourneyItem[];
  ok?: boolean;
  message?: string;
};

type JourneyNotificationDoc = {
  _id?: string;
  notificationId?: string;
  priority?: string;
  title?: string;
  message?: string;
  monitoringType?: string;
  seen?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type JourneyNotificationsResponse = {
  data?: JourneyNotificationDoc[];
  message?: string;
  status?: string;
};

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

export async function fetchUserJourneys(token: string): Promise<JourneyItem[]> {
  const currentUser = await fetchCurrentUser(token);
  const userId = currentUser?._id;

  if (!userId) {
    return [];
  }

  const response = await fetchNodeWithFallback(
    `/api/ai/journey/user/${encodeURIComponent(userId)}`,
  );
  const data = await readJson<JourneyResponse>(response);

  if (!response.ok || data.ok === false || !Array.isArray(data.journeys)) {
    return [];
  }

  return data.journeys.filter(
    (journey): journey is JourneyItem =>
      typeof journey?.journey_id === 'string' && journey.journey_id.length > 0,
  );
}

async function fetchNotificationsForJourney(
  token: string,
  journeyId: string,
): Promise<NotificationItem[]> {
  const response = await fetchNodeWithFallback(
    `/api/client/journey-notifications/${encodeURIComponent(journeyId)}`,
    { headers: authHeaders(token) },
  );
  const data = await readJson<JourneyNotificationsResponse>(response);

  if (!response.ok || data.status === 'fail' || !Array.isArray(data.data)) {
    return [];
  }

  return data.data
    .filter((item) => item.message || item.title)
    .map((item) => {
      const notificationId =
        item.notificationId || item._id || `${journeyId}:${item.createdAt || Date.now()}`;

      return {
        _id: notificationId,
        title: item.title || 'Journey update',
        message: item.message || '',
        route: `/journey/${encodeURIComponent(journeyId)}`,
        type: 'journey_live',
        seen: Boolean(item.seen),
        createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
        journeyId,
        metadata: {
          monitoringType: item.monitoringType || '',
          notificationId,
          priority: item.priority || 'info',
          source: 'journey_notification',
        },
        actor: null,
      };
    });
}

export async function fetchJourneyNotifications(
  token: string,
  journeys?: JourneyItem[],
): Promise<NotificationItem[]> {
  const userJourneys = journeys || (await fetchUserJourneys(token).catch(() => []));
  const journeyIds = userJourneys
    .map((journey) => journey.journey_id)
    .filter(
      (journeyId): journeyId is string => typeof journeyId === 'string' && journeyId.length > 0,
    );
  const journeyNotifications = (
    await Promise.all(
      journeyIds.map((journeyId) => fetchNotificationsForJourney(token, journeyId).catch(() => [])),
    )
  ).flat();

  return journeyNotifications;
}

export async function markJourneyNotificationsSeen(token: string): Promise<void> {
  const response = await fetchNodeWithFallback('/api/client/journey-notifications/seen-all', {
    headers: authHeaders(token),
    method: 'PATCH',
  });
  const data = await readJson<{ status?: string; message?: string }>(response);

  if (!response.ok || data.status === 'fail') {
    throw new Error(data.message || 'Failed to mark journey notifications as read.');
  }
}

export async function startJourneyMonitoring(journeyId: string, token?: string | null): Promise<void> {
  const response = await fetchNodeWithFallback(
    `/api/ai/journey/${encodeURIComponent(journeyId)}/monitor/start`,
    {
      headers: token ? authHeaders(token) : { 'Content-Type': 'application/json' },
      method: 'POST',
    },
  );
  const data = await readJson<{ detail?: string; message?: string; ok?: boolean }>(response);

  if (!response.ok || data.ok === false) {
    throw new Error(data.detail || data.message || 'Failed to start journey monitoring.');
  }
}

export async function stopJourneyMonitoring(journeyId: string, token?: string | null): Promise<void> {
  const response = await fetchNodeWithFallback(
    `/api/ai/journey/${encodeURIComponent(journeyId)}/monitor/stop`,
    {
      headers: token ? authHeaders(token) : { 'Content-Type': 'application/json' },
      method: 'POST',
    },
  );
  const data = await readJson<{ detail?: string; message?: string; ok?: boolean }>(response);

  if (!response.ok || data.ok === false) {
    throw new Error(data.detail || data.message || 'Failed to stop journey monitoring.');
  }
}
