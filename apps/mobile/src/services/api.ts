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
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 5000);
  fetch(`${API_URL}/features`, { headers, signal: ctrl.signal }).catch(() => {});
}

const REQUEST_TIMEOUT = 15_000;

interface CacheEntry {
  data: any;
  createdAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHEABLE_PREFIXES = [
  '/transactions',
  '/expense-groups',
  '/categories',
  '/bills',
  '/notifications',
  '/preferences',
];

function cacheKey(method: string, path: string): string {
  return `${method}:${path}`;
}

function shouldCacheGet(path: string): boolean {
  return CACHEABLE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
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
  cache.set(key, { data, createdAt: Date.now() });
}

function invalidateCacheForMutation(path: string): void {
  if (
    path.startsWith('/transactions') ||
    path.startsWith('/expense-groups') ||
    path.startsWith('/categories') ||
    path.startsWith('/bills') ||
    path.startsWith('/devices') ||
    path.startsWith('/preferences') ||
    path.startsWith('/notifications')
  ) {
    cache.clear();
  }
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
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const signal = mergeSignals(ctrl.signal, options.signal ?? undefined);
  try {
    return await fetch(`${API_URL}${path}`, { ...options, signal });
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  customTimeout?: number,
): Promise<T> {
  const key = cacheKey(options.method || 'GET', path);

  const canCache = (!options.method || options.method === 'GET') && shouldCacheGet(path);

  if (canCache) {
    const cached = getCached<T>(key);
    if (cached) {
      return cached;
    }
  }

  const isFormData =
    typeof (options as any).body !== 'string' &&
    typeof FormData !== 'undefined' &&
    (options as any).body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const timeout = customTimeout || REQUEST_TIMEOUT;
  try {
    const sentOptions = { ...options, headers } as RequestInit;
    if (
      sentOptions.body &&
      !(sentOptions.body instanceof FormData) &&
      typeof sentOptions.body !== 'string'
    ) {
      sentOptions.body = JSON.stringify(sentOptions.body);
    }

    const res = await fetchWithTimeout(path, sentOptions, timeout);

    if (res.status === 401 && refreshTokenFn) {
      const refreshed = await refreshTokenFn();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        const retryRes = await fetchWithTimeout(path, { ...options, headers }, timeout);
        if (retryRes.ok) {
          const retryBody = await retryRes.json().catch(() => {
            throw new Error('Invalid server response');
          });
          const retryData = retryBody?.data ?? retryBody;
          if (canCache) {
            setCached(key, retryData);
          } else if (options.method && options.method !== 'GET') {
            invalidateCacheForMutation(path);
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

    if (canCache) {
      setCached(key, data);
    } else if (options.method && options.method !== 'GET') {
      invalidateCacheForMutation(path);
    }

    return data as T;
  } catch (err: any) {
    if (canCache) {
      const stale = getCached<T>(key);
      if (stale) {
        return stale;
      }
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal, timeout?: number) =>
    request<T>(path, { method: 'GET', ...(signal ? { signal } : {}) }, timeout),
  post: <T>(path: string, body?: any, signal?: AbortSignal, timeout?: number) =>
    request<T>(
      path,
      { method: 'POST', body: body ?? undefined, ...(signal ? { signal } : {}) },
      timeout,
    ),
  put: <T>(path: string, body?: any, signal?: AbortSignal, timeout?: number) =>
    request<T>(
      path,
      { method: 'PUT', body: body ?? undefined, ...(signal ? { signal } : {}) },
      timeout,
    ),
  patch: <T>(path: string, body?: any, signal?: AbortSignal, timeout?: number) =>
    request<T>(
      path,
      { method: 'PATCH', body: body ?? undefined, ...(signal ? { signal } : {}) },
      timeout,
    ),
  delete: <T>(path: string, signal?: AbortSignal, timeout?: number) =>
    request<T>(path, { method: 'DELETE', ...(signal ? { signal } : {}) }, timeout),
};

export function clearCache() {
  cache.clear();
}
