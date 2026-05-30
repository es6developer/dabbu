const API_URL = 'https://backend-es6developers-projects.vercel.app/api/v1';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
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

async function fetchWithTimeout(
  path: string,
  options: RequestInit,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(`${API_URL}${path}`, { ...options, signal: controller.signal });
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const timeout = attempt === 0 ? REQUEST_TIMEOUT : RETRY_TIMEOUT;
    try {
      const res = await fetchWithTimeout(path, { ...options, headers }, timeout);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: ['Request failed'] }));
        throw new Error(error.message?.[0] || `HTTP ${res.status}`);
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
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function clearCache() {
  cache.clear();
}
