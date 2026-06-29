// src/api/biometrics.ts

const PYTHON_API_URL = process.env.EXPO_PUBLIC_FASTAPI_BACKEND_URL || 'http://192.168.43.98:8000';
const ENROLL_TIMEOUT_MS = 30000;   // enrollment: liveness + single inference
const VERIFY_TIMEOUT_MS = 30000;   // verification: single inference
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// ---------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------
export enum BiometricErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  NO_MATCH = 'NO_MATCH',
  PALM_DETECTION = 'PALM_DETECTION',
  FACE_DETECTION = 'FACE_DETECTION',
  INVALID_REQUEST = 'INVALID_REQUEST',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

// ---------------------------------------------------------------------
// Custom Error Class
// ---------------------------------------------------------------------
export class BiometricError extends Error {
  type: BiometricErrorType;
  statusCode?: number;
  backendMessage?: string;
  similarity?: number;

  constructor(
    type: BiometricErrorType,
    message: string,
    options?: {
      statusCode?: number;
      backendMessage?: string;
      similarity?: number;
    }
  ) {
    super(message);
    this.name = 'BiometricError';
    this.type = type;
    this.statusCode = options?.statusCode;
    this.backendMessage = options?.backendMessage;
    this.similarity = options?.similarity;
  }
}

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------
type BiometricResponse = {
  status?: string;
  success?: boolean;
  message?: string;
  data?: any;
  match?: boolean;
  is_match?: boolean;
  similarity?: number;
  confidence?: number;
  detail?: any;
  [key: string]: any;
};

type BiometricEnrollResult = {
  success: boolean;
  message: string;
  data?: any;
};

type BiometricVerifyResult = {
  success: boolean;
  message: string;
  match: boolean;
  confidence?: number;
  similarity?: number;
  data?: any;
  errorType?: BiometricErrorType;
};

// ---------------------------------------------------------------------
// Helper: Timeout wrapper with AbortController
// ---------------------------------------------------------------------
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new BiometricError(
        BiometricErrorType.TIMEOUT,
        'Verification timed out. Please try again.',
        { backendMessage: 'Request timeout' }
      );
    }
    throw error;
  }
}

// ---------------------------------------------------------------------
// Helper: Retry wrapper for network errors
// ---------------------------------------------------------------------
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  maxRetries: number = MAX_RETRIES,
  retryDelayMs: number = RETRY_DELAY_MS
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Biometrics] Retry attempt ${attempt}/${maxRetries}`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }

      const response = await fetchWithTimeout(url, options, timeoutMs);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on timeout or if we got a response (even if it's an error)
      if (error instanceof BiometricError && error.type === BiometricErrorType.TIMEOUT) {
        throw error;
      }

      // Only retry on network errors
      const isNetworkError =
        lastError.message?.includes('Network request failed') ||
        lastError.message?.includes('NetworkError') ||
        lastError.name === 'TypeError';

      if (!isNetworkError || attempt === maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

// ---------------------------------------------------------------------
// Helper: Map backend error messages to user-friendly messages
// ---------------------------------------------------------------------
function mapBackendMessageToUserFriendly(
  backendMessage: string,
  biometricType: 'face' | 'palm'
): { userMessage: string; errorType: BiometricErrorType } {
  const messageLower = backendMessage.toLowerCase();

  // Palm detection errors
  if (
    messageLower.includes('palm') &&
    (messageLower.includes('not detected') ||
      messageLower.includes('could not extract') ||
      messageLower.includes('no palm'))
  ) {
    return {
      userMessage:
        'Unable to detect your palm. Please place your open palm inside the guide and try again.',
      errorType: BiometricErrorType.PALM_DETECTION,
    };
  }

  // Face detection errors
  if (
    messageLower.includes('face') &&
    (messageLower.includes('not detected') ||
      messageLower.includes('could not extract') ||
      messageLower.includes('no face'))
  ) {
    return {
      userMessage:
        'Unable to detect your face. Please look directly at the camera and try again.',
      errorType: BiometricErrorType.FACE_DETECTION,
    };
  }

  // Match errors
  if (messageLower.includes('not match') || messageLower.includes('no match')) {
    return {
      userMessage:
        biometricType === 'face'
          ? 'Face not recognized. Please look directly at the camera and try again.'
          : 'Palm not recognized. Please place your palm inside the guide and try again.',
      errorType: BiometricErrorType.NO_MATCH,
    };
  }

  // Invalid request
  if (messageLower.includes('invalid') || messageLower.includes('bad request')) {
    return {
      userMessage: 'Invalid request. Please try again.',
      errorType: BiometricErrorType.INVALID_REQUEST,
    };
  }

  // Server errors
  if (messageLower.includes('server') || messageLower.includes('internal')) {
    return {
      userMessage: 'Server error. Please try again later.',
      errorType: BiometricErrorType.SERVER_ERROR,
    };
  }

  // Default: preserve backend message
  return {
    userMessage: backendMessage,
    errorType: BiometricErrorType.UNKNOWN,
  };
}

// ---------------------------------------------------------------------
// Helper: Parse verification response
// ---------------------------------------------------------------------
function parseVerificationResponse(
  json: BiometricResponse,
  httpStatus: number,
  biometricType: 'face' | 'palm'
): BiometricVerifyResult {
  console.log(`[Biometrics] ${biometricType} verify raw response:`, json);

  // Check for HTTP errors
  if (httpStatus >= 400) {
    const backendMessage = json.detail || json.message || 'Unknown error';
    const { userMessage, errorType } = mapBackendMessageToUserFriendly(
      String(backendMessage),
      biometricType
    );

    console.log(
      `[Biometrics] ${biometricType} verify HTTP error ${httpStatus}:`,
      backendMessage
    );

    return {
      success: false,
      message: userMessage,
      match: false,
      errorType,
    };
  }

  // Extract match and similarity
  const match = json.match ?? json.is_match ?? false;
  const similarity =
    json.similarity ?? json.confidence ?? 0;
  const confidence = json.confidence ?? json.similarity ?? similarity;

  console.log(
    `[Biometrics] ${biometricType} verify parsed - match:`,
    match,
    'similarity:',
    similarity
  );

  // Check if verification succeeded
  if (!match) {
    const backendMessage = json.message || json.detail || 'Verification failed';
    const { userMessage, errorType } = mapBackendMessageToUserFriendly(
      String(backendMessage),
      biometricType
    );

    return {
      success: true, // Request succeeded, but no match
      message: userMessage,
      match: false,
      confidence,
      similarity,
      errorType,
    };
  }

  // Success
  return {
    success: true,
    message: 'Success',
    match: true,
    confidence,
    similarity,
    data: json.data || json,
  };
}

// ---------------------------------------------------------------------
// Face Enrollment
// ---------------------------------------------------------------------
export async function enrollFace(
  userId: string,
  imageUri: string,
  name?: string,
  token?: string,
): Promise<BiometricEnrollResult> {
  try {
    const formData = new FormData();
    formData.append('image_data', {
      uri: imageUri,
      name: 'face.jpg',
      type: 'image/jpeg',
    } as any);
    formData.append('user_id', userId);
    if (name) formData.append('name', name);

    console.log('[Biometrics] Sending face enroll for user:', userId);

    const response = await fetchWithRetry(`${PYTHON_API_URL}/v1/face/enroll`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }, ENROLL_TIMEOUT_MS);

    const json = await response.json();
    console.log('[Biometrics] Face enroll HTTP status:', response.status);
    console.log('[Biometrics] Face enroll response:', json);

    // Check for errors
    if (!response.ok) {
      const backendMessage = json.detail || json.message || 'Enrollment failed';
      throw new BiometricError(
        BiometricErrorType.SERVER_ERROR,
        String(backendMessage),
        { statusCode: response.status, backendMessage: String(backendMessage) }
      );
    }

    return {
      success: true,
      message: json.message || 'Face enrolled successfully',
      data: json.data || json,
    };
  } catch (error) {
    if (error instanceof BiometricError) {
      console.error('[Biometrics] Face enrollment error:', error.type, error.message);
      throw error;
    }

    // Network error
    console.error('[Biometrics] Face enrollment network error:', error);
    throw new BiometricError(
      BiometricErrorType.NETWORK,
      'Unable to connect to the biometric server. Please check your connection and try again.',
      { backendMessage: error instanceof Error ? error.message : String(error) }
    );
  }
}

// ---------------------------------------------------------------------
// Palm Enrollment
// ---------------------------------------------------------------------
export async function enrollPalm(
  userId: string,
  imageUri: string,
  token?: string,
): Promise<BiometricEnrollResult> {
  try {
    const formData = new FormData();
    formData.append('image_data', {
      uri: imageUri,
      name: 'palm.jpg',
      type: 'image/jpeg',
    } as any);
    formData.append('user_id', userId);

    console.log('[Biometrics] Sending palm enroll for user:', userId);

    const response = await fetchWithRetry(`${PYTHON_API_URL}/v1/palm/enroll`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }, ENROLL_TIMEOUT_MS);

    const json = await response.json();
    console.log('[Biometrics] Palm enroll HTTP status:', response.status);
    console.log('[Biometrics] Palm enroll response:', json);

    // Check for errors
    if (!response.ok) {
      const backendMessage = json.detail || json.message || 'Enrollment failed';
      const { userMessage } = mapBackendMessageToUserFriendly(
        String(backendMessage),
        'palm'
      );

      throw new BiometricError(
        BiometricErrorType.PALM_DETECTION,
        userMessage,
        { statusCode: response.status, backendMessage: String(backendMessage) }
      );
    }

    return {
      success: true,
      message: json.message || 'Palm enrolled successfully',
      data: json.data || json,
    };
  } catch (error) {
    if (error instanceof BiometricError) {
      console.error('[Biometrics] Palm enrollment error:', error.type, error.message);
      throw error;
    }

    // Network error
    console.error('[Biometrics] Palm enrollment network error:', error);
    throw new BiometricError(
      BiometricErrorType.NETWORK,
      'Unable to connect to the biometric server. Please check your connection and try again.',
      { backendMessage: error instanceof Error ? error.message : String(error) }
    );
  }
}

// ---------------------------------------------------------------------
// Face Verification
// ---------------------------------------------------------------------
export async function verifyFace(
  imageUri: string,
  userId: string,
  token?: string,
): Promise<BiometricVerifyResult> {
  try {
    const formData = new FormData();
    formData.append('image_data', {
      uri: imageUri,
      name: 'face.jpg',
      type: 'image/jpeg',
    } as any);

    console.log('[Biometrics] Sending face verify for user:', userId);

    const response = await fetchWithRetry(`${PYTHON_API_URL}/v1/face/verify`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }, VERIFY_TIMEOUT_MS);

    console.log('[Biometrics] Face verify HTTP status:', response.status);

    const json = await response.json();
    return parseVerificationResponse(json, response.status, 'face');
  } catch (error) {
    if (error instanceof BiometricError) {
      console.error('[Biometrics] Face verification error:', error.type, error.message);
      throw error;
    }

    // Network error
    console.error('[Biometrics] Face verification network error:', error);
    throw new BiometricError(
      BiometricErrorType.NETWORK,
      'Unable to connect to the biometric server. Please check your connection and try again.',
      { backendMessage: error instanceof Error ? error.message : String(error) }
    );
  }
}

// ---------------------------------------------------------------------
// Palm Verification
// ---------------------------------------------------------------------
export async function verifyPalm(
  imageUri: string,
  userId: string,
  token?: string,
): Promise<BiometricVerifyResult> {
  try {
    const formData = new FormData();
    formData.append('image_data', {
      uri: imageUri,
      name: 'palm.jpg',
      type: 'image/jpeg',
    } as any);

    console.log('[Biometrics] Sending palm verify for user:', userId);

    const response = await fetchWithRetry(`${PYTHON_API_URL}/v1/palm/verify`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }, VERIFY_TIMEOUT_MS);

    console.log('[Biometrics] Palm verify HTTP status:', response.status);

    const json = await response.json();
    return parseVerificationResponse(json, response.status, 'palm');
  } catch (error) {
    if (error instanceof BiometricError) {
      console.error('[Biometrics] Palm verification error:', error.type, error.message);
      throw error;
    }

    // Network error
    console.error('[Biometrics] Palm verification network error:', error);
    throw new BiometricError(
      BiometricErrorType.NETWORK,
      'Unable to connect to the biometric server. Please check your connection and try again.',
      { backendMessage: error instanceof Error ? error.message : String(error) }
    );
  }
}
