import type { AuthUser } from '../api/auth/auth';
import type {
  CommunicationPreferencePayload,
  JourneyMonitoringPreference,
  LocationTrackingPreferencePayload,
} from '../api/profile/profile';

export type ThemePreset = {
  description: string;
  id: string;
  swatches: string[];
  title: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    description: 'Fresh and natural Umoja green',
    id: 'emerald-voyage',
    swatches: ['#2DCC6F', '#A7F3D0', '#065F46', '#ECFDF5'],
    title: 'Emerald Voyage',
  },
  {
    description: 'Calm and sophisticated deep sea tones',
    id: 'ocean-depths',
    swatches: ['#2B7DE9', '#BFDBFE', '#1E3A5F', '#EFF6FF'],
    title: 'Ocean Depths',
  },
  {
    description: 'Warm and energetic sunset hues',
    id: 'sunset-amber',
    swatches: ['#E8783A', '#FED7AA', '#7C2D12', '#FFF7ED'],
    title: 'Sunset Amber',
  },
  {
    description: 'Bold and elegant violet accents',
    id: 'royal-violet',
    swatches: ['#8B5CF6', '#DDD6FE', '#3B0764', '#F5F3FF'],
    title: 'Royal Violet',
  },
  {
    description: 'Refined and warm rose accents',
    id: 'rose-gold',
    swatches: ['#E84D8A', '#FCE7F3', '#831843', '#FFF1F2'],
    title: 'Rose Gold',
  },
];

export const DEFAULT_THEME_PREFERENCE = 'emerald-voyage';
export const DEFAULT_JOURNEY_MONITORING_PREFERENCE: JourneyMonitoringPreference = 'off';

export const DEFAULT_LOCATION_TRACKING_PREFERENCE: LocationTrackingPreferencePayload = {
  airportTracking: true,
  fullTracking: false,
  tripsTracking: true,
};

export const DEFAULT_COMMUNICATION_PREFERENCE: CommunicationPreferencePayload = {
  emailNotifications: true,
  marketingList: true,
  pushNotifications: true,
  securityAlerts: true,
};

export function getThemePreference(user: AuthUser | null): string {
  return typeof user?.themePreference === 'string'
    ? user.themePreference
    : DEFAULT_THEME_PREFERENCE;
}

export function getJourneyMonitoringPreference(user: AuthUser | null): JourneyMonitoringPreference {
  const value = user?.journeyMonitoringPreference;

  return value === 'all' || value === 'active' || value === 'off'
    ? value
    : DEFAULT_JOURNEY_MONITORING_PREFERENCE;
}

export function getLocationTrackingPreference(
  user: AuthUser | null,
): LocationTrackingPreferencePayload {
  return normalizeLocationTrackingPreference(user?.locationTrackingPreference);
}

export function getCommunicationPreference(user: AuthUser | null): CommunicationPreferencePayload {
  return normalizeCommunicationPreference(user?.communicationPreference);
}

export function normalizeLocationTrackingPreference(
  value: unknown,
): LocationTrackingPreferencePayload {
  if (!value || typeof value !== 'object') {
    return DEFAULT_LOCATION_TRACKING_PREFERENCE;
  }

  const nextValue = value as Partial<LocationTrackingPreferencePayload>;

  return {
    airportTracking:
      typeof nextValue.airportTracking === 'boolean'
        ? nextValue.airportTracking
        : DEFAULT_LOCATION_TRACKING_PREFERENCE.airportTracking,
    fullTracking:
      typeof nextValue.fullTracking === 'boolean'
        ? nextValue.fullTracking
        : DEFAULT_LOCATION_TRACKING_PREFERENCE.fullTracking,
    tripsTracking:
      typeof nextValue.tripsTracking === 'boolean'
        ? nextValue.tripsTracking
        : DEFAULT_LOCATION_TRACKING_PREFERENCE.tripsTracking,
  };
}

export function normalizeCommunicationPreference(value: unknown): CommunicationPreferencePayload {
  if (!value || typeof value !== 'object') {
    return DEFAULT_COMMUNICATION_PREFERENCE;
  }

  const nextValue = value as Partial<CommunicationPreferencePayload>;

  return {
    emailNotifications:
      typeof nextValue.emailNotifications === 'boolean'
        ? nextValue.emailNotifications
        : DEFAULT_COMMUNICATION_PREFERENCE.emailNotifications,
    marketingList:
      typeof nextValue.marketingList === 'boolean'
        ? nextValue.marketingList
        : DEFAULT_COMMUNICATION_PREFERENCE.marketingList,
    pushNotifications:
      typeof nextValue.pushNotifications === 'boolean'
        ? nextValue.pushNotifications
        : DEFAULT_COMMUNICATION_PREFERENCE.pushNotifications,
    securityAlerts:
      typeof nextValue.securityAlerts === 'boolean'
        ? nextValue.securityAlerts
        : DEFAULT_COMMUNICATION_PREFERENCE.securityAlerts,
  };
}
