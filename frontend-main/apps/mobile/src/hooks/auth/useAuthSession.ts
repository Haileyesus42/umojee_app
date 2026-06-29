import { useCallback, useEffect, useMemo, useState } from 'react';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

import {
  loginWithGoogle as requestGoogleLogin,
  loginWithPassword,
  registerWithPassword,
  type AuthResponse,
  type AuthUser,
  type GoogleAuthCredentials,
  type LoginCredentials,
  type RegisterCredentials,
} from '../../api/auth/auth';

const AUTH_STORAGE_KEY = 'umojee.authSession.v1';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

type AuthActionStatus = 'idle' | 'loading' | 'success' | 'twoFactorRequired' | 'error';

export type StoredAuthSession = {
  expiresAt: number;
  savedAt: number;
  token: string;
  user: AuthUser;
};

type AuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

let authStoragePromise: Promise<AuthStorage | null> | null = null;

function hasNativeAuthStorage() {
  const nativeModules = NativeModules as Record<string, unknown>;

  if (
    nativeModules.PlatformLocalStorage ||
    nativeModules.RNC_AsyncSQLiteDBStorage ||
    nativeModules.RNCAsyncStorage ||
    nativeModules.AsyncSQLiteDBStorage ||
    nativeModules.AsyncLocalStorage
  ) {
    return true;
  }

  return Boolean(
    TurboModuleRegistry.get('PlatformLocalStorage') ||
      TurboModuleRegistry.get('RNC_AsyncSQLiteDBStorage') ||
      TurboModuleRegistry.get('RNCAsyncStorage') ||
      TurboModuleRegistry.get('AsyncSQLiteDBStorage') ||
      TurboModuleRegistry.get('AsyncLocalStorage'),
  );
}

async function getAuthStorage() {
  if (!authStoragePromise) {
    authStoragePromise = (async () => {
      if (Platform.OS === 'web') {
        return typeof globalThis.localStorage === 'undefined'
          ? null
          : {
              getItem: async (key: string) => globalThis.localStorage.getItem(key),
              removeItem: async (key: string) => {
                globalThis.localStorage.removeItem(key);
              },
              setItem: async (key: string, value: string) => {
                globalThis.localStorage.setItem(key, value);
              },
            };
      }

      if (!hasNativeAuthStorage()) {
        return null;
      }

      try {
        const storageModule = await import('@react-native-async-storage/async-storage');
        return storageModule.default;
      } catch {
        return null;
      }
    })();
  }

  return authStoragePromise;
}

function decodeBase64Url(value: string): string | null {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  try {
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(padded);
    }
  } catch {
    return null;
  }

  return null;
}

function getJwtExpiresAt(token: string): number | null {
  const [, payload] = token.split('.');
  const decodedPayload = payload ? decodeBase64Url(payload) : null;

  if (!decodedPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodedPayload) as { exp?: unknown };
    return typeof parsed.exp === 'number' ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

function getSessionExpiresAt(token: string, savedAt: number): number {
  const frontendExpiry = savedAt + SESSION_DURATION_MS;
  const jwtExpiry = getJwtExpiresAt(token);
  return jwtExpiry ? Math.min(frontendExpiry, jwtExpiry) : frontendExpiry;
}

function parseStoredSession(value: string | null): StoredAuthSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredAuthSession>;

    if (
      !parsed ||
      typeof parsed.token !== 'string' ||
      !parsed.user ||
      typeof parsed.savedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }

    return {
      expiresAt: parsed.expiresAt,
      savedAt: parsed.savedAt,
      token: parsed.token,
      user: parsed.user,
    };
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getSessionFromAuthResponse(response: AuthResponse): StoredAuthSession | null {
  const token = response.token;
  const user = response.data?.user;

  if (!token || !user) {
    return null;
  }

  const savedAt = Date.now();

  return {
    expiresAt: getSessionExpiresAt(token, savedAt),
    savedAt,
    token,
    user,
  };
}

export function useAuthSession() {
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AuthActionStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const clearSession = useCallback(async () => {
    setSession(null);

    try {
      const storage = await getAuthStorage();
      await storage?.removeItem(AUTH_STORAGE_KEY);
    } catch (storageError) {
      if (__DEV__) {
        const storageMessage = getErrorMessage(storageError, 'Failed to clear auth session');
        console.warn(`[Auth] ${storageMessage}`);
      }
    }
  }, []);

  const persistSession = useCallback(async (nextSession: StoredAuthSession) => {
    setSession(nextSession);

    try {
      const storage = await getAuthStorage();
      await storage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    } catch (storageError) {
      if (__DEV__) {
        const storageMessage = getErrorMessage(storageError, 'Failed to store auth session');
        console.warn(`[Auth] ${storageMessage}`);
      }
    }
  }, []);

  const restoreSession = useCallback(async () => {
    setLoading(true);

    try {
      const storage = await getAuthStorage();
      const storedSession = parseStoredSession(
        storage ? await storage.getItem(AUTH_STORAGE_KEY) : null,
      );

      if (!storedSession || storedSession.expiresAt <= Date.now()) {
        await clearSession();
        return;
      }

      setSession(storedSession);
    } catch (error) {
      if (__DEV__) {
        const restoreMessage = getErrorMessage(error, 'Failed to restore auth session');
        console.warn(`[Auth] ${restoreMessage}`);
      }
      await clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setStatus('loading');
      setMessage(null);

      try {
        const response = await loginWithPassword(credentials);
        console.log('[AuthSession] Login response:', JSON.stringify({
          hasToken: !!response?.token,
          hasDataUser: !!response?.data?.user,
          status: response?.status,
          keys: Object.keys(response || {})
        }));
        const nextSession = getSessionFromAuthResponse(response);

        if (nextSession) {
          await persistSession(nextSession);
        }

        setStatus('success');
        setMessage(response.message || 'Welcome back.');
        return response;
      } catch (error) {
        const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;

        if (code === 'TWO_FACTOR_REQUIRED') {
          setStatus('twoFactorRequired');
          setMessage('Enter your authenticator code to continue.');
          return { status: 'two_factor_required' } as any;
        }

        setStatus('error');
        setMessage(getErrorMessage(error, 'Sign in failed. Please try again.'));
        throw error;
      }
    },
    [persistSession],
  );

  const loginWithGoogle = useCallback(
    async (credentials: GoogleAuthCredentials) => {
      setStatus('loading');
      setMessage(null);

      try {
        const response = await requestGoogleLogin(credentials);
        const nextSession = getSessionFromAuthResponse(response);

        if (nextSession) {
          await persistSession(nextSession);
        }

        setStatus('success');
        setMessage(response.message || 'Google sign-in complete.');
        return response;
      } catch (error) {
        setStatus('error');
        setMessage(getErrorMessage(error, 'Google sign-in failed. Please try again.'));
        throw error;
      }
    },
    [persistSession],
  );

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setStatus('loading');
    setMessage(null);

    try {
      const response = await registerWithPassword(credentials);
      setStatus('success');
      setMessage(response.message || 'Account created successfully. Sign in to continue.');
      return response;
    } catch (error) {
      setStatus('error');
      setMessage(getErrorMessage(error, 'Registration failed. Please try again.'));
      throw error;
    }
  }, []);

  const registerWithGoogle = useCallback(async (credentials: GoogleAuthCredentials) => {
    setStatus('loading');
    setMessage(null);

    try {
      const response = await requestGoogleLogin(credentials);
      setStatus('success');
      setMessage(response.message || 'Google account connected. Sign in to continue.');
      return response;
    } catch (error) {
      setStatus('error');
      setMessage(getErrorMessage(error, 'Google sign-up failed. Please try again.'));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setStatus('idle');
    setMessage(null);
    await clearSession();
  }, [clearSession]);

  const updateUser = useCallback(
    async (nextUser: AuthUser) => {
      if (!session) {
        return;
      }
      await persistSession({
        ...session,
        user: {
          ...session.user,
          ...nextUser,
        },
      });
    },
    [persistSession, session],
  );

  const loginWithToken = useCallback(
    async (token: string, user: any) => {
      console.log('[AuthSession] loginWithToken called, user:', user?.email);
      const nextSession: StoredAuthSession = {
        expiresAt: getSessionExpiresAt(token, Date.now()),
        savedAt: Date.now(),
        token,
        user,
      };
      await persistSession(nextSession);
      setStatus('success');
      setMessage('Welcome back.');
      console.log('[AuthSession] loginWithToken persisted, session updated');
    },
    [persistSession],
  );

  const updateToken = useCallback(
    async (nextToken: string) => {
      if (!session) {
        return;
      }
      await persistSession({
        ...session,
        expiresAt: getSessionExpiresAt(nextToken, Date.now()),
        savedAt: Date.now(),
        token: nextToken,
      });
    },
    [persistSession, session],
  );

  // ✅ NEW: Refresh user data from backend (syncs biometricData, profile updates, etc.)
  const refreshUser = useCallback(async () => {
    if (!session?.token) {
      return null;
    }

    try {
      const NODE_API_URL =
        process.env.EXPO_PUBLIC_NODE_BACKEND_URL ||
        process.env.EXPO_PUBLIC_BACKEND_URL;

      if (!NODE_API_URL) {
        return null;
      }

      const response = await fetch(`${NODE_API_URL}/api/client/user/getMe`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const json = await response.json();

      if (json.status === 'success' && json.data) {
        await persistSession({
          ...session,
          user: json.data,
        });
        return json.data;
      }

      return null;
    } catch {
      // Network unavailable — keep the cached session as-is
      return null;
    }
  }, [session, persistSession]);

  return useMemo(
    () => ({
      isAuthenticated: Boolean(session),
      loading,
      login,
      loginWithGoogle,
      logout,
      message,
      register,
      registerWithGoogle,
      restoreSession,
      status,
      token: session?.token ?? null,
      updateToken,
      updateUser,
      loginWithToken,
      user: session?.user ?? null,
      refreshUser, // ✅ ADDED
    }),
    [
      loading,
      login,
      loginWithGoogle,
      logout,
      message,
      register,
      registerWithGoogle,
      restoreSession,
      session,
      status,
      updateToken,
      updateUser,
      loginWithToken,
      refreshUser,
    ],
  );
}

export type AuthSession = ReturnType<typeof useAuthSession>;