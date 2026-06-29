import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_AI_BACKEND_URL = 'http://localhost:8000';
// const DEFAULT_NODE_BACKEND_URL = 'https://node-server-seven-coral.vercel.app';
const DEFAULT_NODE_BACKEND_URL = 'http://localhost:3001';
// const ANDROID_EMULATOR_NODE_BACKEND_URL = 'https://node-server-seven-coral.vercel.app';
const ANDROID_EMULATOR_NODE_BACKEND_URL = 'http://10.0.2.2:3001';
const REQUEST_TIMEOUT_MS = 50000;

export type FetchWithFallbackInit = RequestInit & {
  timeoutMs?: number;
};

function isLocalhostUrl(value: string): boolean {
  return /:\/\/(?:localhost|127\.0\.0\.1)(?::|\/|$)/.test(value);
}

function normalizeBaseUrl(value?: string): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/$/, '');
}

function unique(values: (string | null)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    if (!value || seen.has(value)) {
      return;
    }

    seen.add(value);
    result.push(value);
  });

  return result;
}

function withAndroidEmulatorAlias(value: string | null): (string | null)[] {
  if (!value) {
    return [null];
  }

  if (Platform.OS !== 'android') {
    return [value];
  }

  return [value, value.replace('://localhost:', '://10.0.2.2:')];
}

function getExpoDevHost(): string | null {
  const constants = Constants as typeof Constants & {
    manifest?: { debuggerHost?: string };
  };
  const hostUri = Constants.expoConfig?.hostUri || constants.manifest?.debuggerHost;
  const host = hostUri?.split(':')[0];

  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  return host;
}

function withExpoDevHostAlias(
  value: string | null,
  options: { includeOriginal?: boolean } = {},
): (string | null)[] {
  if (!value) {
    return [null];
  }

  const { includeOriginal = true } = options;
  const host = getExpoDevHost();

  if (!host) {
    return [value];
  }

  const hostAlias = value.replace(/:\/\/(?:localhost|127\.0\.0\.1)(:\d+)/, `://${host}$1`);

  if (Platform.OS === 'web' || hostAlias === value) {
    return [value];
  }

  return includeOriginal ? [hostAlias, value] : [hostAlias];
}

export function getAiBackendCandidates(): string[] {
  const aiProxyBackendUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_AI_PROXY_BACKEND_URL);
  const nodeBackendUrl =
    normalizeBaseUrl(process.env.EXPO_PUBLIC_NODE_BACKEND_URL) ||
    normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  const fastApiBackendUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_FASTAPI_BACKEND_URL);
  const fastApiUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_FASTAPI_URL);
  const aiBackendUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_AI_BACKEND_URL);
  const aiFallbackUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_AI_BACKEND_FALLBACK_URL);
  const explicitProxyCandidates = unique([
    ...withExpoDevHostAlias(aiProxyBackendUrl, { includeOriginal: false }),
  ]);

  if (explicitProxyCandidates.length > 0) {
    return explicitProxyCandidates;
  }

  const proxyCandidates = unique([
    ...withExpoDevHostAlias(nodeBackendUrl, { includeOriginal: false }),
    ...withExpoDevHostAlias(DEFAULT_NODE_BACKEND_URL, { includeOriginal: false }),
  ]);

  if (proxyCandidates.length > 0) {
    return proxyCandidates;
  }

  return unique([
    ...withExpoDevHostAlias(fastApiBackendUrl, { includeOriginal: false }),
    ...withExpoDevHostAlias(fastApiUrl, { includeOriginal: false }),
    ...withExpoDevHostAlias(aiBackendUrl, { includeOriginal: false }),
    ...withExpoDevHostAlias(aiFallbackUrl, { includeOriginal: false }),
    ...withExpoDevHostAlias(DEFAULT_AI_BACKEND_URL, { includeOriginal: false }),
  ]);
}

export function getNodeBackendCandidates(): string[] {
  const nodeBackendUrl =
    normalizeBaseUrl(process.env.EXPO_PUBLIC_NODE_BACKEND_URL) ||
    normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  const shouldUseDevFallbacks = __DEV__ || !nodeBackendUrl || isLocalhostUrl(nodeBackendUrl);

  return unique([
    ...withExpoDevHostAlias(nodeBackendUrl),
    ...(shouldUseDevFallbacks ? withExpoDevHostAlias(DEFAULT_NODE_BACKEND_URL) : []),
    ...(shouldUseDevFallbacks ? withAndroidEmulatorAlias(nodeBackendUrl) : []),
    ...(shouldUseDevFallbacks ? withAndroidEmulatorAlias(DEFAULT_NODE_BACKEND_URL) : []),
    ...(shouldUseDevFallbacks ? [ANDROID_EMULATOR_NODE_BACKEND_URL] : []),
  ]);
}

async function fetchWithFallback(
  label: string,
  candidates: string[],
  path: string,
  init?: FetchWithFallbackInit,
): Promise<Response> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  let lastResponse: Response | null = null;
  let lastError: unknown = null;
  const { timeoutMs = REQUEST_TIMEOUT_MS, ...requestInit } = init || {};

  if (__DEV__) {
    console.log(`[${label}] Candidates: ${candidates.join(', ')}`);
  }

  for (const baseUrl of candidates) {
    const url = `${baseUrl}${normalizedPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (__DEV__) {
        console.log(`[${label}] ${init?.method || 'GET'} ${url}`);
      }

      const response = await fetch(url, {
        ...requestInit,
        signal: controller.signal,
      });

      if (response.ok) {
        if (__DEV__) {
          console.log(`[${label}] ${response.status} ${url}`);
        }

        return response;
      }

      lastResponse = response;

      if (__DEV__) {
        console.warn(`[${label}] ${response.status} ${url}`);
      }

      if (response.status !== 404) {
        return response;
      }
    } catch (error) {
      lastError = error;

      if (__DEV__) {
        const message = error instanceof Error ? error.message : 'request failed';
        console.warn(`[${label}] Failed ${url}: ${message}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError instanceof Error ? lastError : new Error('AI backend request failed');
}

export async function fetchAiWithFallback(
  path: string,
  init?: FetchWithFallbackInit,
): Promise<Response> {
  return fetchWithFallback('AI API', getAiBackendCandidates(), path, init);
}

export async function fetchNodeWithFallback(
  path: string,
  init?: FetchWithFallbackInit,
): Promise<Response> {
  return fetchWithFallback('Node API', getNodeBackendCandidates(), path, init);
}