import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { api, setAccessToken } from '../services/api';
import { useAuth } from '../store/AuthContext';

export function useApi<T>(endpoint: string, deps: any[] = []) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (accessToken) {setAccessToken(accessToken);}
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.get<T>(endpoint);
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [endpoint, accessToken, ...deps]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useRefresh(fetch: () => Promise<any>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fetch(); } catch (_e) { /* ignore */ }
    finally { setRefreshing(false); }
  }, [fetch]);
  return { refreshing, onRefresh };
}

export function useAppState() {
  const [state, setState] = useState(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', setState);
    return () => sub.remove();
  }, []);
  return state;
}

export function useEffectOnce(cb: () => void | (() => void)) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) {return;}
    ran.current = true;
    return cb();
  }, []);
}

export function useInterval(cb: () => void, ms: number | null) {
  const saved = useRef(cb);
  useEffect(() => { saved.current = cb; }, [cb]);
  useEffect(() => {
    if (ms === null) {return;}
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}
