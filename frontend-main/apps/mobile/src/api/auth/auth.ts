// src/api/auth/auth.ts

import { fetchNodeWithFallback } from '../client';

export type LoginCredentials = {
  email: string;
  password: string;
  twoFactorCode?: string;
};

export type RegisterCredentials = {
  confirmPassword: string;
  dob: string;
  email: string;
  firstName: string;
  inviteToken?: string;
  lastName: string;
  password: string;
  phone: string;
};

export type GoogleAuthCredentials = {
  code: string;
  clientId?: string;
  codeVerifier?: string;
  inviteToken?: string;
  redirectUri?: string;
};

// ✅ NEW: Biometric login credentials
export type BiometricLoginCredentials = {
  user_id: string;
  type: 'face' | 'palm';
  image_data: string; // base64 encoded image
};

export type AuthUser = {
  _id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  photo?: string | null;
  biometricData?: {
    faces?: Array<unknown>;
    palms?: Array<unknown>;
  };
  [key: string]: unknown;
};

export type AuthResponse = {
  data?: {
    user?: AuthUser;
    [key: string]: unknown;
  };
  message?: string;
  status?: string;
  token?: string;
  code?: string;
};

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  const data = (await response.json().catch(() => ({}))) as AuthResponse;

  if (!response.ok || data.status === 'fail') {
    const error = new Error(data.message || 'Authentication request failed') as Error & {
      code?: string;
    };
    error.code = data.code;
    throw error;
  }

  return data;
}

function jsonRequest(body: unknown): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  };
}

export async function loginWithPassword(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetchNodeWithFallback(
    '/api/client/auth/login/password',
    jsonRequest(credentials),
  );
  return parseAuthResponse(response);
}

export async function loginWithGoogle(credentials: GoogleAuthCredentials): Promise<AuthResponse> {
  const response = await fetchNodeWithFallback(
    '/api/client/auth/login/google',
    jsonRequest(credentials),
  );
  return parseAuthResponse(response);
}

// ✅ NEW: Biometric login
export async function loginWithFaceIdentify(
  imageUri: string,
): Promise<AuthResponse> {
  const PYTHON_URL = process.env.EXPO_PUBLIC_FASTAPI_BACKEND_URL || 'http://192.168.43.98:8000';

  // Use URI directly in FormData — React Native supports this
  const formData = new FormData();
  formData.append('image_data', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'face.jpg',
  } as any);

  const pyResponse = await fetch(`${PYTHON_URL}/v1/face/identify`, {
    method: 'POST',
    body: formData,
  });

  const pyResult = await pyResponse.json();
  console.log('[FaceIdentify] Python result:', JSON.stringify(pyResult));

  if (!pyResult.match || !pyResult.user_id) {
    throw Object.assign(
      new Error(pyResult.message || 'Face not recognized'),
      { code: 'FACE_NOT_RECOGNIZED' }
    );
  }

  // Login via Node with identified user_id — face already verified by Python
  console.log('[FaceIdentify] Sending to Node:', { user_id: pyResult.user_id, verified: true });
  const response = await fetchNodeWithFallback(
    '/api/client/auth/login/face-identify',
    jsonRequest({ user_id: pyResult.user_id, verified: true }),
  );
  return parseAuthResponse(response);
}

export async function loginWithBiometric(
  credentials: BiometricLoginCredentials,
): Promise<AuthResponse> {
  const response = await fetchNodeWithFallback(
    '/api/client/auth/login/biometric',
    jsonRequest(credentials),
  );
  return parseAuthResponse(response);
}

export async function registerWithPassword(
  credentials: RegisterCredentials,
): Promise<AuthResponse> {
  const response = await fetchNodeWithFallback(
    '/api/client/auth/signup',
    jsonRequest(credentials),
  );
  return parseAuthResponse(response);
}