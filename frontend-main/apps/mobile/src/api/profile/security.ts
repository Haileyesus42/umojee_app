// src/api/profile/security.ts

import { fetchNodeWithFallback } from '../client';
import type { AuthUser } from '../auth/auth';

type ApiResponse = {
  data?: AuthUser | TwoFactorSetupData | { user?: AuthUser };
  message?: string;
  status?: string;
  token?: string;
};

export type TwoFactorSetupData = {
  manualEntryKey: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  secret?: string;
};

export type UpdatePasswordResult = {
  token?: string;
  user?: AuthUser;
};

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseSecurityResponse(response: Response, fallback: string): Promise<ApiResponse> {
  const data = (await response.json().catch(() => ({}))) as ApiResponse;

  if (!response.ok || data.status === 'fail') {
    throw new Error(data.message || fallback);
  }

  return data;
}

export async function updateClientPassword(
  token: string,
  payload: {
    password: string;
    passwordCurrent: string;
  },
): Promise<UpdatePasswordResult> {
  const response = await fetchNodeWithFallback('/api/client/user/updatePassword', {
    body: JSON.stringify(payload),
    headers: authHeaders(token),
    method: 'PATCH',
  });
  const data = await parseSecurityResponse(response, 'Failed to update password');

  return {
    token: data.token,
    user: isUserEnvelope(data.data) ? data.data.user : (data.data as AuthUser | undefined),
  };
}

// ✅ CORRECT PATH: /api/client/user/2fa/setup
export async function beginTwoFactorSetup(token: string): Promise<TwoFactorSetupData> {
  console.log('[2FA API] 🔄 Calling /api/client/user/2fa/setup...');

  const response = await fetchNodeWithFallback('/api/client/user/2fa/setup', {
    headers: authHeaders(token),
    method: 'POST',
    timeoutMs: 20000,
  });

  const data = await parseSecurityResponse(response, 'Failed to start two-factor setup');

  console.log('[2FA API] 📦 Backend response:', JSON.stringify(data, null, 2));

  const setupData = data.data as TwoFactorSetupData | undefined;

  if (!setupData) {
    console.warn('[2FA API] ⚠️ No data in response');
    throw new Error('No setup data received from server');
  }

  console.log('[2FA API] 🖼️ QR Code:', setupData.qrCodeDataUrl ? '✅ Present' : '❌ MISSING');
  console.log('[2FA API] 🔑 Manual Key:', setupData.manualEntryKey || '❌ MISSING');
  console.log('[2FA API] 🔗 OTP Auth URL:', setupData.otpauthUrl ? '✅ Present' : '❌ MISSING');

  if (!setupData.qrCodeDataUrl || !setupData.manualEntryKey || !setupData.otpauthUrl) {
    throw new Error('Server returned incomplete 2FA setup data');
  }

  return setupData;
}

// ✅ CORRECT PATH: /api/client/user/2fa/confirm
export async function confirmTwoFactorSetup(token: string, code: string): Promise<AuthUser> {
  console.log('[2FA API] 🔄 Confirming 2FA setup with code:', code);

  const response = await fetchNodeWithFallback('/api/client/user/2fa/confirm', {
    body: JSON.stringify({ token: code }),
    headers: authHeaders(token),
    method: 'POST',
  });
  
  const data = await parseSecurityResponse(response, 'Failed to verify authenticator code');
  console.log('[2FA API] ✅ 2FA confirmed');

  // Backend returns: { status, message, data: <user object> }
  if (isUserEnvelope(data.data)) {
    return data.data.user as AuthUser;
  }
  return data.data as AuthUser;
}

// ✅ CORRECT PATH: /api/client/user/2fa/disable
export async function disableTwoFactor(token: string, code: string): Promise<AuthUser> {
  console.log('[2FA API] 🔄 Disabling 2FA with code:', code);

  const response = await fetchNodeWithFallback('/api/client/user/2fa/disable', {
    body: JSON.stringify({ token: code }),
    headers: authHeaders(token),
    method: 'POST',
  });
  
  const data = await parseSecurityResponse(response, 'Failed to disable two-factor authentication');
  console.log('[2FA API] ✅ 2FA disabled');

  if (isUserEnvelope(data.data)) {
    return data.data.user as AuthUser;
  }
  return data.data as AuthUser;
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await fetchNodeWithFallback('/api/client/auth/forgotPassword', {
    body: JSON.stringify({ email }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  const data = await parseSecurityResponse(response, 'Failed to request password reset');

  return data.message || 'If an account exists, a reset link has been sent.';
}

function isUserEnvelope(value: unknown): value is { user?: AuthUser } {
  return Boolean(value && typeof value === 'object' && 'user' in value);
}