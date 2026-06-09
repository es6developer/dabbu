import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../../../store/AuthContext';
import { api, setAccessToken } from '../../../services/api';

interface UseAiApiOptions<T> {
  endpoint: string;
  defaultValue: T;
  onData?: (data: any) => T;
  method?: 'get' | 'post';
  body?: any;
}

export function useAiApi<T>({ endpoint, defaultValue, onData, method = 'get', body }: UseAiApiOptions<T>) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (refresh = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (accessToken) setAccessToken(accessToken);

    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      let res: any;
      if (method === 'get') {
        res = await api.get<any>(endpoint, ctrl.signal);
      } else {
        res = await api.post<any>(endpoint, body || {}, ctrl.signal);
      }

      if (ctrl.signal.aborted) return;

      const raw = res?.data ?? res;
      if (onData) {
        setData(onData(raw));
      } else {
        setData(raw);
      }
    } catch (e: any) {
      if (!ctrl.signal.aborted) {
        console.warn(`[useAiApi] ${endpoint} failed, using fallback:`, e?.message);
      }
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [accessToken, endpoint, onData, method, body]);

  return { data, loading, refreshing, load, setData };
}
