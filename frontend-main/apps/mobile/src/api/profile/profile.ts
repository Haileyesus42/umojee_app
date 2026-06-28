import { fetchNodeWithFallback, getNodeBackendCandidates } from '../client';
import type { AuthUser } from '../auth/auth';

export type ProfileUpdatePayload = {
  budgetPreference?: BudgetPreferencePayload;
  communicationPreference?: CommunicationPreferencePayload;
  country?: string;
  dob?: string;
  firstName?: string;
  gender?: string;
  homeLocation?: {
    address: string;
    city: string;
    country: string;
    lat: number | null;
    lon: number | null;
  };
  journeyMonitoringPreference?: JourneyMonitoringPreference;
  lastName?: string;
  locationTrackingPreference?: LocationTrackingPreferencePayload;
  phone?: string;
  travelDocuments?: TravelDocumentsPayload;
  themePreference?: string;
};

export type BudgetPreferencePayload = {
  currency: string;
  max: number;
  min: number;
};

export type JourneyMonitoringPreference = 'all' | 'active' | 'off';

export type LocationTrackingPreferencePayload = {
  airportTracking: boolean;
  fullTracking: boolean;
  tripsTracking: boolean;
};

export type CommunicationPreferencePayload = {
  emailNotifications: boolean;
  marketingList: boolean;
  pushNotifications: boolean;
  securityAlerts: boolean;
};

type ProfileResponse = {
  data?: AuthUser;
  message?: string;
  status?: string;
};

export type TravelDocumentsPayload = {
  passportNumber?: string;
  passportExpiry?: string | null;
  passportIssuingCountry?: string;
  nationality?: string;
  nationalIdNumber?: string;
  frequentFlyerNumber?: string;
  frequentFlyerAirline?: string;
};

type RevealSensitiveDocumentResponse = {
  data?: {
    value?: string;
  };
  message?: string;
  status?: string;
};

type AvatarResponse = {
  data?: {
    clientUser?: AuthUser;
    user?: AuthUser;
    [key: string]: unknown;
  };
  message?: string;
  status?: string;
};

export type ProfilePhotoUpload = {
  name: string;
  type: string;
  uri: string;
};

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseProfileResponse(response: Response): Promise<AuthUser> {
  const data = (await response.json().catch(() => ({}))) as ProfileResponse;

  if (!response.ok || data.status === 'fail' || !data.data) {
    throw new Error(data.message || 'Profile request failed');
  }

  return data.data;
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetchNodeWithFallback('/api/client/user/getMe', {
    headers: authHeaders(token),
  });

  return parseProfileResponse(response);
}

export async function updateCurrentUser(
  token: string,
  payload: ProfileUpdatePayload,
): Promise<AuthUser> {
  const response = await fetchNodeWithFallback('/api/client/user/updateMe', {
    body: JSON.stringify(payload),
    headers: authHeaders(token),
    method: 'PATCH',
  });

  return parseProfileResponse(response);
}

export async function revealSensitiveTravelDocument(
  token: string,
  payload: {
    field: 'passportNumber' | 'nationalIdNumber';
    password: string;
    twoFactorCode?: string;
  },
): Promise<string> {
  const response = await fetchNodeWithFallback('/api/client/user/revealSensitiveDocument', {
    body: JSON.stringify(payload),
    headers: authHeaders(token),
    method: 'POST',
  });
  const data = (await response.json().catch(() => ({}))) as RevealSensitiveDocumentResponse;

  if (!response.ok || data.status === 'fail') {
    throw new Error(data.message || 'Failed to reveal document');
  }

  return data.data?.value || '';
}

export async function uploadCurrentUserPhoto(
  token: string,
  userId: string,
  photo: ProfilePhotoUpload,
): Promise<AuthUser> {
  const formData = new FormData();

  formData.append('photo', photo as unknown as Blob);

  const response = await fetchNodeWithFallback(`/api/client/user/avatar/${userId}/photo`, {
    body: formData,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    method: 'PUT',
  });
  const data = (await response.json().catch(() => ({}))) as AvatarResponse;
  const updatedUser = data.data?.clientUser || data.data?.user || data.data;

  if (!response.ok || data.status === 'fail' || !updatedUser) {
    throw new Error(data.message || 'Failed to upload profile photo');
  }

  return updatedUser as AuthUser;
}

export function getClientAssetUrl(value?: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const [baseUrl] = getNodeBackendCandidates();

  return baseUrl ? `${baseUrl}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}` : null;
}
