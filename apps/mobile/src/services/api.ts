import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

const CACHE_STORAGE_KEY = 'api_cache_v2';

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
function warmupBackend(): void {
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

const CACHE_TTL: Record<string, number> = {
  '/accounts': 120_000,
  '/transactions': 30_000,
  '/transactions/categories-summary': 60_000,
  '/expense-groups': 300_000,
  '/expense-groups/dashboard': 300_000,
  '/categories': 120_000,
  '/bills': 60_000,
  '/notifications': 30_000,
  '/preferences': 300_000,
  '/reminders': 60_000,
  '/goals': 60_000,
  '/shared-finance': 60_000,
  '/shared-finance/groups': 120_000,
  '/shared-finance/groups/couple/dashboard': 120_000,
  '/premium': 120_000,
  '/premium/check': 300_000,
  '/gamification': 300_000,
  '/settlements': 30_000,
  '/features': 300_000,
  '/user': 120_000,
  '/referral': 120_000,
  '/analytics': 60_000,
  '/ai-insights': 60_000,
  '/subscriptions': 60_000,
};

interface CacheEntry {
  data: any;
  createdAt: number;
  ttl: number;
}
const cache = new Map<string, CacheEntry>();

function cacheKey(method: string, path: string): string {
  return `${method}:${path}`;
}

function ttlForPath(path: string): number {
  for (const [prefix, ttl] of Object.entries(CACHE_TTL)) {
    if (path.startsWith(prefix)) {
      return ttl;
    }
  }
  return 0;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.createdAt > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistCache(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const obj: Record<string, CacheEntry> = {};
    cache.forEach((entry, key) => {
      if (Date.now() - entry.createdAt <= entry.ttl) obj[key] = entry;
    });
    AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj)).catch(() => {});
  }, 2000);
}

let hydrationPromise: Promise<void> | null = null;

export async function hydrateCache(): Promise<void> {
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
      if (!raw) return;
      const obj: Record<string, CacheEntry> = JSON.parse(raw);
      const now = Date.now();
      for (const [key, entry] of Object.entries(obj)) {
        if (now - entry.createdAt <= entry.ttl && cache.size < 100) {
          cache.set(key, entry);
        }
      }
    } catch {}
  })();
  return hydrationPromise;
}

function setCached(key: string, data: any, ttl: number): void {
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    if (firstKey) {
      cache.delete(firstKey);
    }
  }
  cache.set(key, { data, createdAt: Date.now(), ttl });
  persistCache();
}

function invalidateCacheForMutation(path: string): void {
  const affectedPrefixes = Object.keys(CACHE_TTL).filter((p) => path.startsWith(p));
  if (affectedPrefixes.length === 0) return;
  for (const [key] of cache) {
    const keyPath = key.slice(key.indexOf('/'));
    if (affectedPrefixes.some((p) => keyPath.startsWith(p))) {
      cache.delete(key);
    }
  }
  persistCache();
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

const pendingRequests = new Map<string, Promise<any>>();

async function request<T>(
  path: string,
  options: RequestInit = {},
  customTimeout?: number,
): Promise<T> {
  const key = cacheKey(options.method || 'GET', path);
  const ttl = ttlForPath(path);
  const canCache = ttl > 0 && (!options.method || options.method === 'GET');
  const isGet = !options.method || options.method === 'GET';

  // Deduplicate in-flight GET requests
  if (isGet && pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  if (canCache) {
    if (!hydrationPromise) hydrateCache();
    await hydrationPromise;
    const cached = getCached<T>(key);
    if (cached) {
      return cached;
    }
  }

  const promise = (async (): Promise<T> => {
    try {
      const result = await executeRequest<T>(path, options, customTimeout, key, ttl, canCache);
      return result;
    } finally {
      if (isGet) {
        pendingRequests.delete(key);
      }
    }
  })();

  if (isGet) {
    pendingRequests.set(key, promise);
  }

  return promise;
}

async function executeRequest<T>(
  path: string,
  options: RequestInit,
  customTimeout: number | undefined,
  key: string,
  ttl: number,
  canCache: boolean,
): Promise<T> {
  const isFormData =
    typeof (options as any).body !== 'string' &&
    typeof FormData !== 'undefined' &&
    (options as any).body instanceof FormData;

  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
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
            setCached(key, retryData, ttl);
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
      setCached(key, data, ttl);
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
  AsyncStorage.removeItem(CACHE_STORAGE_KEY).catch(() => {});
}
