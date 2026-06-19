import { useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useAuth } from '../store/AuthContext';

interface AIContextualResult {
  insight: { text: string; type: 'tip' | 'warning' | 'forecast' | 'milestone' } | null;
  forecast: { projection: string; confidence: number; timeframe: string } | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  dismissInsight: () => void;
}

interface InsightPayload {
  insight: { text: string; type: 'tip' | 'warning' | 'forecast' | 'milestone' } | null;
  forecast: { projection: string; confidence: number; timeframe: string } | null;
}

const DEBOUNCE_MS = 300;

export function useAIContextual(
  screen: string,
  entityId?: string,
  entityType?: string,
): AIContextualResult {
  const { accessToken } = useAuth();
  const [insight, setInsight] = useState<InsightPayload['insight']>(null);
  const [forecast, setForecast] = useState<InsightPayload['forecast']>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cachedRef = useRef<InsightPayload | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchKeyRef = useRef<string>('');

  const fetchInsight = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!accessToken) {
      setError(null);
      setInsight(null);
      setForecast(null);
      return;
    }

    const key = `${screen}:${entityId ?? ''}:${entityType ?? ''}`;
    fetchKeyRef.current = key;

    if (cachedRef.current) {
      setInsight(cachedRef.current.insight);
      setForecast(cachedRef.current.forecast);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.post<InsightPayload>('/ai/contextual/insight', {
        screen,
        entityId,
        entityType,
      });

      if (fetchKeyRef.current !== key) return;

      const payload: InsightPayload = {
        insight: data.insight ?? null,
        forecast: data.forecast ?? null,
      };

      cachedRef.current = payload;
      setInsight(payload.insight);
      setForecast(payload.forecast);
    } catch (err: any) {
      if (fetchKeyRef.current !== key) return;
      setError(err?.message || 'Failed to fetch AI insight');
    } finally {
      if (fetchKeyRef.current === key) {
        setLoading(false);
      }
    }
  }, [screen, entityId, entityType, accessToken]);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(fetchInsight, DEBOUNCE_MS);
  }, [fetchInsight]);

  useFocusEffect(
    useCallback(() => {
      debouncedFetch();
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, [debouncedFetch]),
  );

  const refresh = useCallback(async () => {
    cachedRef.current = null;
    await fetchInsight();
  }, [fetchInsight]);

  const dismissInsight = useCallback(() => {
    setInsight(null);
    setForecast(null);
  }, []);

  return { insight, forecast, loading, error, refresh, dismissInsight };
}
