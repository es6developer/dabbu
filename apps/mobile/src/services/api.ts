import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { GlobalLoading } from './loading-events';

const CACHE_STORAGE_KEY = 'api_cache_v2';

export class OfflineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineError';
  }
}

let accessToken: string | null = null;
let refreshTokenFn: (() => Promise<boolean>) | null = null;
let onSessionExpiredFn: (() => void) | null = null;

let refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    warmupBackend();
    startKeepAlive();
  } else {
    warmupCompleted = false;
    warmupPromise = null;
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  }
}
export function getAccessToken(): string | null {
  return accessToken;
}

// ─── Offline Queue ──────────────────────────────────
let isOnline = true;
const offlineQueue: {
  id: string;
  action: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  createdAt: number;
  retries: number;
}[] = [];

export function setOnlineStatus(online: boolean) {
  isOnline = online;
  if (online && offlineQueue.length > 0) {
    processOfflineQueue();
  }
}

export function getOfflinePendingCount(): number {
  return offlineQueue.length;
}

async function processOfflineQueue() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  while (offlineQueue.length > 0) {
    const item = offlineQueue[0];
    try {
      let method = 'POST';
      let url = `${API_URL}/${item.resource}`;
      let body = JSON.stringify(item.data);
      if (item.action === 'update') {
        method = 'PATCH';
        url = `${API_URL}/${item.resource}/${item.data.id}`;
      } else if (item.action === 'delete') {
        method = 'DELETE';
        url = `${API_URL}/${item.resource}/${item.data.id}`;
        body = undefined as any;
      }
      const res = await fetch(url, { method, headers, body });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      offlineQueue.shift();
    } catch {
      break;
    }
  }
}

async function enqueueMutation(action: 'create' | 'update' | 'delete', path: string, data: any) {
  const resource = path.startsWith('/') ? path.slice(1) : path;
  offlineQueue.push({
    id: `${Date.now()}-${Math.random()}`,
    action,
    resource,
    data,
    createdAt: Date.now(),
    retries: 0,
  });
}
export function setRefreshTokenHandler(fn: () => Promise<boolean>) {
  refreshTokenFn = fn;
}
export function setOnSessionExpiredHandler(fn: () => void) {
  onSessionExpiredFn = fn;
}

function decodeJwt(token: string): { exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? { exp: payload.exp } : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string, bufferSec = 30): boolean {
  const decoded = decodeJwt(token);
  if (!decoded) {
    return false;
  }
  return Date.now() >= (decoded.exp - bufferSec) * 1000;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshTokenFn) {
    return false;
  }
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = refreshTokenFn().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

let warmupPromise: Promise<void> | null = null;
let warmupCompleted = false;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

export function warmupBackend(): Promise<void> {
  if (warmupCompleted) {
    return Promise.resolve();
  }
  if (warmupPromise) {
    return warmupPromise;
  }
  const warmupEndpoints = [
    '/health',
    '/categories',
    '/accounts/stats',
    '/transactions/stats?months=1',
  ];
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  // Track how many requests have finished; resolve when one succeeds or all fail
  let settled = 0;
  const total = warmupEndpoints.length;
  warmupPromise = new Promise<void>((resolve) => {
    for (const ep of warmupEndpoints) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      fetch(`${API_URL}${ep}`, { headers, signal: ctrl.signal })
        .then((res) => {
          clearTimeout(timer);
          if (!warmupCompleted && (res.ok || res.status === 401 || res.status === 403)) {
            warmupCompleted = true;
            resolve();
          }
        })
        .catch(() => {
          clearTimeout(timer);
        })
        .finally(() => {
          settled++;
          if (!warmupCompleted && settled >= total) {
            warmupCompleted = true;
            resolve();
          }
        });
    }
  });
  return warmupPromise;
}

async function waitForWarmup(): Promise<void> {
  if (warmupCompleted) {
    return;
  }
  if (!warmupPromise) {
    warmupBackend();
  }
  // Brief pause to let warmup finish if it's almost done
  for (let i = 0; i < 6; i++) {
    if (warmupCompleted) {
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

function startKeepAlive(): void {
  if (keepAliveTimer) {
    return;
  }
  keepAliveTimer = setInterval(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    fetch(`${API_URL}/health`, { headers, signal: ctrl.signal }).catch(() => {});
  }, 240_000);
}

// Fire warmup immediately on app start (not waiting for login)
warmupBackend();
hydrateCache();

const REQUEST_TIMEOUT = 8_000;

const CACHE_TTL: Record<string, number> = {
  '/accounts': 300_000,
  '/accounts/stats': 300_000,
  '/transactions': 120_000,
  '/transactions/stats': 180_000,
  '/transactions/categories-summary': 300_000,
  '/transactions/search': 60_000,
  '/expense-groups': 600_000,
  '/expense-groups/dashboard': 600_000,
  '/categories': 300_000,
  '/bills': 300_000,
  '/notifications': 120_000,
  '/notifications/unread-count': 120_000,
  '/preferences': 600_000,
  '/reminders': 300_000,
  '/reminders/upcoming': 300_000,
  '/goals': 300_000,
  '/budgets': 300_000,
  '/shared-finance': 120_000,
  '/shared-finance/groups': 600_000,
  '/shared-finance/groups/couple': 600_000,
  '/shared-finance/groups/family': 600_000,
  '/shared-finance/split-templates': 600_000,
  '/premium': 300_000,
  '/premium/check': 600_000,
  '/gamification': 600_000,
  '/settlements': 180_000,
  '/settlements/activity': 180_000,
  '/features': 600_000,
  '/user': 300_000,
  '/referral': 300_000,
  '/net-worth': 300_000,
  '/loans': 300_000,
  '/analytics': 300_000,
  '/ai-insights': 180_000,
  '/subscriptions': 300_000,
  '/trips': 300_000,
  '/shared-expenses': 180_000,
  '/ai/health-score': 300_000,
  '/ai/dashboard': 300_000,
  '/ai/dna': 300_000,
  '/ai/anomalies': 180_000,
  '/ai/insights': 300_000,
  '/ai/monthly-review': 300_000,
  '/ai/savings-opportunities': 300_000,
  '/ai/today-feed': 180_000,
  '/ai/feed-summary': 180_000,
  '/ai/feed': 180_000,
  '/ai/milestones': 300_000,
  '/ai/life-events': 300_000,
  '/ai/groups': 300_000,
  '/ai/goals': 300_000,
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
  const qs = path.indexOf('?');
  const base = qs === -1 ? path : path.slice(0, qs);
  let best = '';
  let bestTtl = 0;
  for (const [prefix, ttl] of Object.entries(CACHE_TTL)) {
    if (base.startsWith(prefix) && prefix.length > best.length) {
      best = prefix;
      bestTtl = ttl;
    }
  }
  return bestTtl;
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
  if (persistTimer) {
    return;
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const obj: Record<string, CacheEntry> = {};
    cache.forEach((entry, key) => {
      if (Date.now() - entry.createdAt <= entry.ttl) {
        obj[key] = entry;
      }
    });
    AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj)).catch(() => {});
  }, 2000);
}

let hydrationPromise: Promise<void> | null = null;

export async function hydrateCache(): Promise<void> {
  if (hydrationPromise) {
    return hydrationPromise;
  }
  hydrationPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const obj: Record<string, CacheEntry> = JSON.parse(raw);
      const now = Date.now();
      for (const [key, entry] of Object.entries(obj)) {
        if (now - entry.createdAt <= entry.ttl && cache.size < 100) {
          cache.set(key, entry);
        }
      }
    } catch {
      /* ignore */
    }
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
  if (affectedPrefixes.length === 0) {
    return;
  }
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
  skipCache = false,
): Promise<T> {
  const key = cacheKey(options.method || 'GET', path);
  const ttl = ttlForPath(path);
  const canCache = ttl > 0 && !skipCache && (!options.method || options.method === 'GET');
  const isGet = !options.method || options.method === 'GET';

  // Deduplicate in-flight GET requests
  if (isGet && pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  if (accessToken && isTokenExpired(accessToken) && refreshTokenFn) {
    await refreshAccessToken();
  }

  // Brief wait for warmup so the backend has a head start
  if (isGet) {
    await waitForWarmup();
  }

  if (canCache) {
    if (!hydrationPromise) {
      hydrateCache();
    }
    await hydrationPromise;
    const cached = getCached<T>(key);
    if (cached) {
      // Always fire a background refresh if cache is older than 15s
      const entry = cache.get(key);
      if (entry && Date.now() - entry.createdAt > 15_000) {
        executeRequest<T>(path, options, customTimeout, key, ttl, canCache).catch(() => {
          cache.delete(key);
          persistCache();
        });
      }
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
  const isGet = !options.method || options.method === 'GET';

  // Offline-first: queue mutations when offline
  if (!isGet && !isOnline) {
    let body = options.body;
    try {
      body = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
      /* ignore parse errors */
    }
    await enqueueMutation(
      options.method === 'POST'
        ? 'create'
        : options.method === 'PATCH' || options.method === 'PUT'
          ? 'update'
          : 'delete',
      path,
      body || {},
    );
    throw new OfflineError('You are offline. Your changes will sync when you reconnect.');
  }

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
      if (accessToken && !isTokenExpired(accessToken)) {
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
        if (retryRes.status !== 401) {
          const error = await retryRes.json().catch(() => ({ message: 'Request failed' }));
          const msg = Array.isArray(error.message) ? error.message[0] : error.message;
          throw new Error(msg || `HTTP ${retryRes.status}`);
        }
      }
      const refreshed = await refreshAccessToken();
      if (refreshed && accessToken) {
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
    // For GET requests that fail (timeout/network), retry once after a delay
    if (
      isGet &&
      (err?.name === 'AbortError' ||
        err?.name === 'TypeError' ||
        err?.message?.includes('fetch') ||
        err?.message?.includes('Network') ||
        err?.message?.includes('timed out'))
    ) {
      await new Promise((r) => setTimeout(r, 2000));
      const retrySent = { ...options, headers } as RequestInit;
      const retryRes = await fetchWithTimeout(path, retrySent, timeout).catch(() => null);
      if (retryRes && retryRes.ok) {
        const retryBody = await retryRes.json().catch(() => null);
        if (retryBody) {
          const retryData = retryBody?.data ?? retryBody;
          if (canCache) {
            setCached(key, retryData, ttl);
          }
          return retryData as T;
        }
      }
    }

    // Queue mutation for retry when fetch fails due to network
    if (
      (!isGet && err?.message?.includes('fetch')) ||
      err?.name === 'TypeError' ||
      err?.message?.includes('Network')
    ) {
      let body = options.body;
      try {
        body = typeof body === 'string' ? JSON.parse(body) : body;
      } catch {
        /* ignore parse errors */
      }
      await enqueueMutation(
        options.method === 'POST'
          ? 'create'
          : options.method === 'PATCH' || options.method === 'PUT'
            ? 'update'
            : 'delete',
        path,
        body || {},
      );
    }
    if (canCache) {
      const stale = getCached<T>(key);
      if (stale) {
        return stale;
      }
    }
    throw err;
  }
}

function trackLoading<T>(promise: Promise<T>): Promise<T> {
  GlobalLoading.increment();
  promise.finally(() => GlobalLoading.decrement()).catch(() => {});
  return promise;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal, timeout?: number) =>
    trackLoading(request<T>(path, { method: 'GET', ...(signal ? { signal } : {}) }, timeout)),
  post: <T>(path: string, body?: any, signal?: AbortSignal, timeout?: number) =>
    trackLoading(
      request<T>(
        path,
        { method: 'POST', body: body ?? undefined, ...(signal ? { signal } : {}) },
        timeout,
      ),
    ),
  put: <T>(path: string, body?: any, signal?: AbortSignal, timeout?: number) =>
    trackLoading(
      request<T>(
        path,
        { method: 'PUT', body: body ?? undefined, ...(signal ? { signal } : {}) },
        timeout,
      ),
    ),
  patch: <T>(path: string, body?: any, signal?: AbortSignal, timeout?: number) =>
    trackLoading(
      request<T>(
        path,
        { method: 'PATCH', body: body ?? undefined, ...(signal ? { signal } : {}) },
        timeout,
      ),
    ),
  delete: <T>(path: string, signal?: AbortSignal, timeout?: number) =>
    trackLoading(request<T>(path, { method: 'DELETE', ...(signal ? { signal } : {}) }, timeout)),
};

export function clearCache() {
  cache.clear();
  AsyncStorage.removeItem(CACHE_STORAGE_KEY).catch(() => {});
}
