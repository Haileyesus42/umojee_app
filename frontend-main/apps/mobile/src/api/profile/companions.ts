import { fetchNodeWithFallback } from '../client';

export type CompanionType = 'traveler' | 'pet';

export type CompanionTravelDocuments = {
  passportNumber?: string;
  passportExpiry?: string | null;
  passportIssuingCountry?: string;
  nationalIdNumber?: string;
};

export type Companion = {
  _id?: string;
  type: CompanionType;
  displayName?: string;
  photo?: string;
  fullName?: string;
  relationship?: string;
  dob?: string | null;
  gender?: string;
  travelDocuments?: CompanionTravelDocuments;
  name?: string;
  species?: string;
  breed?: string;
  notes?: string;
  [key: string]: unknown;
};

export type CompanionPayload = {
  type: CompanionType;
  displayName?: string;
  fullName?: string;
  relationship?: string;
  dob?: string | null;
  gender?: string;
  travelDocuments?: CompanionTravelDocuments;
  name?: string;
  species?: string;
  breed?: string;
  notes?: string;
};

export type CompanionPhotoUpload = {
  name: string;
  type: string;
  uri: string;
};

type CompanionListResponse = {
  data?: Companion[];
  message?: string;
  status?: string;
};

type CompanionResponse = {
  data?: Companion;
  message?: string;
  status?: string;
};

type RevealSensitiveDocumentResponse = {
  data?: {
    value?: string;
  };
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

async function parseCompanionResponse(response: Response): Promise<Companion> {
  const data = (await response.json().catch(() => ({}))) as CompanionResponse;

  if (!response.ok || data.status === 'fail' || !data.data) {
    throw new Error(data.message || 'Companion request failed');
  }

  return data.data;
}

export async function fetchCompanions(token: string): Promise<Companion[]> {
  const response = await fetchNodeWithFallback('/api/client/user/companions', {
    headers: authHeaders(token),
  });
  const data = (await response.json().catch(() => ({}))) as CompanionListResponse;

  if (!response.ok || data.status === 'fail' || !data.data) {
    throw new Error(data.message || 'Failed to load companions');
  }

  return data.data;
}

export async function createCompanion(
  token: string,
  payload: CompanionPayload,
): Promise<Companion> {
  const response = await fetchNodeWithFallback('/api/client/user/companions', {
    body: JSON.stringify(payload),
    headers: authHeaders(token),
    method: 'POST',
  });

  return parseCompanionResponse(response);
}

export async function updateCompanion(
  token: string,
  companionId: string,
  payload: CompanionPayload,
): Promise<Companion> {
  const response = await fetchNodeWithFallback(`/api/client/user/companions/${companionId}`, {
    body: JSON.stringify(payload),
    headers: authHeaders(token),
    method: 'PATCH',
  });

  return parseCompanionResponse(response);
}

export async function deleteCompanion(token: string, companionId: string): Promise<void> {
  const response = await fetchNodeWithFallback(`/api/client/user/companions/${companionId}`, {
    headers: authHeaders(token),
    method: 'DELETE',
  });
  const data = (await response.json().catch(() => ({}))) as CompanionResponse;

  if (!response.ok || data.status === 'fail') {
    throw new Error(data.message || 'Failed to delete companion');
  }
}

export async function uploadCompanionPhoto(
  token: string,
  companionId: string,
  photo: CompanionPhotoUpload,
): Promise<Companion> {
  const formData = new FormData();

  formData.append('photo', photo as unknown as Blob);

  const response = await fetchNodeWithFallback(`/api/client/user/companions/${companionId}/photo`, {
    body: formData,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    method: 'PUT',
  });

  return parseCompanionResponse(response);
}

export async function revealCompanionSensitiveDocument(
  token: string,
  companionId: string,
  payload: {
    field: 'passportNumber' | 'nationalIdNumber';
    password: string;
    twoFactorCode?: string;
  },
): Promise<string> {
  const response = await fetchNodeWithFallback(
    `/api/client/user/companions/${companionId}/revealSensitiveDocument`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(token),
      method: 'POST',
    },
  );
  const data = (await response.json().catch(() => ({}))) as RevealSensitiveDocumentResponse;

  if (!response.ok || data.status === 'fail') {
    throw new Error(data.message || 'Failed to reveal companion document');
  }

  return data.data?.value || '';
}
