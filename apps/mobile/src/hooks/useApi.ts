import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../services/api';
import { useAuth } from '../store/AuthContext';

interface UseApiOptions {
  /** Auto-fetch on focus (default true) */
  autoFetch?: boolean;
  /** Skip setting loading=true on subsequent fetches (for refresh) */
  silent?: boolean;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

export function useApi<T = any>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: any[] = [],
  options: UseApiOptions = {},
) {
  const { autoFetch = true } = options;
  const { accessToken } = useAuth();
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: autoFetch,
    refreshing: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (refresh = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState(prev => ({
      ...prev,
      loading: refresh ? prev.loading : true,
      refreshing: refresh,
      error: null,
    }));

    try {
      if (accessToken) setAccessToken(accessToken);
      const data = await fetcher(ctrl.signal);
      if (!ctrl.signal.aborted) {
        setState({ data, loading: false, refreshing: false, error: null });
      }
    } catch (err: any) {
      if (!ctrl.signal.aborted) {
        setState(prev => ({
          ...prev,
          loading: false,
          refreshing: false,
          error: err?.message || 'Something went wrong',
        }));
      }
    }
  }, [accessToken, ...deps]);

  useFocusEffect(
    useCallback(() => {
      if (autoFetch) execute();
      return () => abortRef.current?.abort();
    }, [execute, autoFetch]),
  );

  return {
    ...state,
    refresh: () => execute(true),
    fetch: () => execute(),
  };
}

// Convenience wrapper for GET endpoints
export function useApiGet<T = any>(
  path: string,
  deps: any[] = [],
  options?: UseApiOptions,
) {
  return useApi<T>(
    (signal) => api.get<T>(path, signal),
    [path, ...deps],
    options,
  );
}
