import { useState, useCallback, useRef } from 'react';

interface PaginatedResult<T> {
  data: T[];
  nextCursor?: string | null;
  hasMore: boolean;
}

interface UsePaginatedQueryOptions {
  pageSize?: number;
  enabled?: boolean;
}

export function usePaginatedQuery<T>(
  fetcher: (cursor?: string | null) => Promise<PaginatedResult<T>>,
  options?: UsePaginatedQueryOptions
) {
  const { pageSize = 20, enabled = true } = options ?? {};
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);

    try {
      const result = await fetcher(cursorRef.current);
      setData((prev) => [...prev, ...result.data]);
      cursorRef.current = result.nextCursor ?? null;
      setHasMore(result.hasMore);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [hasMore, fetcher]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    cursorRef.current = null;

    try {
      const result = await fetcher(null);
      setData(result.data);
      cursorRef.current = result.nextCursor ?? null;
      setHasMore(result.hasMore);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  const reset = useCallback(() => {
    setData([]);
    setHasMore(true);
    setError(null);
    cursorRef.current = null;
  }, []);

  return { data, loading, loadingMore, error, hasMore, loadMore, refresh, reset };
}
