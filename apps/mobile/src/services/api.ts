const API_URL = 'https://backend-es6developers-projects.vercel.app/api/v1';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const REQUEST_TIMEOUT = 15_000;

interface CacheEntry {
  data: any;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 20_000;

function cacheKey(method: string, path: string): string {
  return `${method}:${path}`;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: any): void {
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = cacheKey(options.method || 'GET', path);

  if (!options.method || options.method === 'GET') {
    const cached = getCached<T>(key);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: ['Request failed'] }));
      throw new Error(error.message?.[0] || `HTTP ${res.status}`);
    }

    const body = await res.json();
    const data = body?.data ?? body;

    if (!options.method || options.method === 'GET') {
      setCached(key, data);
    }

    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
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
