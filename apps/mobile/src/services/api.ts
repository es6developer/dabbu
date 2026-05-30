import { API_URL } from '../config/api';

let accessToken: string | null = null;
let refreshTokenFn: (() => Promise<boolean>) | null = null;
let onSessionExpiredFn: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setRefreshTokenHandler(fn: () => Promise<boolean>) {
  refreshTokenFn = fn;
}

export function setOnSessionExpiredHandler(fn: () => void) {
  onSessionExpiredFn = fn;
}

let warmupDone = false;
export function warmupBackend(): void {
  if (warmupDone) {
    return;
  }
  warmupDone = true;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  fetch(`${API_URL}/features`, { headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
}

const REQUEST_TIMEOUT = 8_000;
const RETRY_TIMEOUT = 14_000;

interface CacheEntry {
  data: any;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 15_000;

function cacheKey(method: string, path: string): string {
  return `${method}:${path}`;
}

function getCached<T>(key: string, allowStale = false): T | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiry) {
    if (allowStale) {
      return entry.data as T;
    }
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: any): void {
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value;
    if (firstKey) {
      cache.delete(firstKey);
    }
  }
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

function mergeSignals(timeoutSignal: AbortSignal, userSignal?: AbortSignal): AbortSignal {
  if (!userSignal) {
    return timeoutSignal;
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  timeoutSignal.addEventListener('abort', abort);
  userSignal.addEventListener('abort', abort);
  if (timeoutSignal.aborted || userSignal.aborted) {
    controller.abort();
  }
  return controller.signal;
}

async function fetchWithTimeout(
  path: string,
  options: RequestInit,
  timeout: number,
): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);
  try {
    const signal = mergeSignals(timeoutController.signal, options.signal);
    return await fetch(`${API_URL}${path}`, { ...options, signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = cacheKey(options.method || 'GET', path);

  if (!options.method || options.method === 'GET') {
    const cached = getCached<T>(key);
    if (cached) {
      return cached;
    }
  }

  const isFormData = typeof (options as any).body !== 'string' &&
    typeof FormData !== 'undefined' && (options as any).body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const timeout = attempt === 0 ? REQUEST_TIMEOUT : RETRY_TIMEOUT;
    try {
      // If body is an object and not FormData, stringify as JSON
      const sentOptions = { ...options, headers } as RequestInit;
      if (sentOptions.body && !(sentOptions.body instanceof FormData) && typeof sentOptions.body !== 'string') {
        sentOptions.body = JSON.stringify(sentOptions.body);
      }

      const res = await fetchWithTimeout(path, sentOptions, timeout);

      if (res.status === 401 && refreshTokenFn) {
        const refreshed = await refreshTokenFn();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${accessToken}`;
          const retryRes = await fetchWithTimeout(path, { ...options, headers }, timeout);
          if (retryRes.ok) {
            const retryBody = await retryRes.json();
            const retryData = retryBody?.data ?? retryBody;
            if (!options.method || options.method === 'GET') {
              setCached(key, retryData);
            }
            return retryData as T;
          }
        }
        accessToken = null;
        if (onSessionExpiredFn) {
          onSessionExpiredFn();
        }
        throw new Error('Session expired. Please login again.');
      }

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Request failed' }));
        const msg = Array.isArray(error.message) ? error.message[0] : error.message;
        throw new Error(msg || `HTTP ${res.status}`);
      }

      const body = await res.json();
      const data = body?.data ?? body;

      if (!options.method || options.method === 'GET') {
        setCached(key, data);
      } else {
        cache.clear();
      }

      return data as T;
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError' || err.name === 'TimeoutError';
      const isGet = !options.method || options.method === 'GET';

      if (isTimeout && attempt === 0) {
        continue;
      }

      if (isGet) {
        const stale = getCached<T>(key, true);
        if (stale) {
          return stale;
        }
      }

      if (isGet && isTimeout) {
        throw new Error('Request timed out. Please check your connection.');
      }

      throw err;
    }
  }

  throw new Error('Request failed');
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', ...(signal ? { signal } : {}) }),
  post: <T>(path: string, body?: any, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body: body ?? undefined, ...(signal ? { signal } : {}) }),
  patch: <T>(path: string, body?: any, signal?: AbortSignal) =>
    request<T>(path, { method: 'PATCH', body: body ?? undefined, ...(signal ? { signal } : {}) }),
  delete: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: 'DELETE', ...(signal ? { signal } : {}) }),
};

export function clearCache() {
  cache.clear();
}
