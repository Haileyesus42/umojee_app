import { fetchNodeWithFallback } from './client';

type RegisterPushTokenPayload = {
  deviceName?: string;
  platform: string;
  token: string;
};

export async function registerPushToken(
  authToken: string,
  payload: RegisterPushTokenPayload,
): Promise<void> {
  const response = await fetchNodeWithFallback('/api/client/notification/push-token', {
    body: JSON.stringify(payload),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || 'Failed to register push notifications.');
  }
}
