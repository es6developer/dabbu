import { useState, useEffect, useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const globalCache = new Map<string, CacheEntry<any>>();
const inflightRequests = new Map<string, Promise<any>>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of globalCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      globalCache.delete(key);
    }
  }
}, 300000);

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; enabled?: boolean }
) {
  const ttl = options?.ttl ?? 60000;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const mountedRef = useRef(true);
  const cacheKey = `useCachedQuery:${key}`;

  const refetch = useCallback(async () => {
    if (inflightRequests.has(cacheKey)) {
      return inflightRequests.get(cacheKey);
    }

    setLoading(true);
    setError(null);

    const promise = fetcher()
      .then((result) => {
        globalCache.set(cacheKey, { data: result, timestamp: Date.now(), ttl });
        if (mountedRef.current) {
          setData(result);
          setIsStale(false);
        }
        return result;
      })
      .catch((err) => {
        if (mountedRef.current) setError(err);
        throw err;
      })
      .finally(() => {
        inflightRequests.delete(cacheKey);
        if (mountedRef.current) setLoading(false);
      });

    inflightRequests.set(cacheKey, promise);
    return promise;
  }, [cacheKey, fetcher, ttl]);

  useEffect(() => {
    if (options?.enabled === false) return;

    const cached = globalCache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < cached.ttl) {
        setData(cached.data);
        setIsStale(false);
        setLoading(false);
        return;
      }
      setData(cached.data);
      setIsStale(true);
    }

    refetch();
    return () => { mountedRef.current = false; };
  }, [cacheKey, refetch, options?.enabled]);

  return { data, loading, error, isStale, refetch };
}
