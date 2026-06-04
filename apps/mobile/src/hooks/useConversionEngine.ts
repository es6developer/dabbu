import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActiveBanners,
  evaluateConversion,
  logOnboardingEvent,
  BannerData,
  ConversionEvaluation,
  ConversionEvent,
} from '../services/external-sharing';

const DISMISSED_BANNERS_KEY = '@dabbu_dismissed_banners';
const POLL_INTERVAL = 5 * 60 * 1000;

interface UseConversionEngineOptions {
  tempUserId: string | null;
  enabled?: boolean;
}

interface ConversionEngineState {
  banners: BannerData[];
  evaluation: ConversionEvaluation | null;
  loading: boolean;
  error: string | null;
}

export function useConversionEngine({ tempUserId, enabled = true }: UseConversionEngineOptions) {
  const [state, setState] = useState<ConversionEngineState>({
    banners: [],
    evaluation: null,
    loading: false,
    error: null,
  });

  const dismissedRef = useRef<Set<string>>(new Set());
  const lastFetchRef = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadDismissedBanners = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(DISMISSED_BANNERS_KEY);
      if (stored) {
        dismissedRef.current = new Set(JSON.parse(stored));
      }
    } catch (_e) {
      // ignore
    }
  }, []);

  const saveDismissedBanner = useCallback(async (bannerId: string) => {
    dismissedRef.current.add(bannerId);
    try {
      await AsyncStorage.setItem(
        DISMISSED_BANNERS_KEY,
        JSON.stringify([...dismissedRef.current]),
      );
    } catch (_e) {
      // ignore
    }
  }, []);

  const fetchBanners = useCallback(async () => {
    if (!tempUserId || !enabled) {return;}

    const now = Date.now();
    if (now - lastFetchRef.current < 10000) {return;}
    lastFetchRef.current = now;

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const banners = await getActiveBanners(tempUserId);
      const filtered = banners.filter(b => !dismissedRef.current.has(b.id));
      const sorted = filtered.sort((a, b) => b.priority - a.priority);
      if (mountedRef.current) {
        setState(prev => ({ ...prev, banners: sorted, loading: false }));
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, error: err?.message || 'Failed to fetch banners', loading: false }));
      }
    }
  }, [tempUserId, enabled]);

  const fetchEvaluation = useCallback(async () => {
    if (!tempUserId || !enabled) {return;}

    try {
      const evaluation = await evaluateConversion(tempUserId);
      if (mountedRef.current) {
        setState(prev => ({ ...prev, evaluation }));
      }
    } catch (_e) {
      // silent fail for evaluation
    }
  }, [tempUserId, enabled]);

  const trackEvent = useCallback(async (
    eventType: ConversionEvent['eventType'],
    bannerId?: string,
    source?: string,
  ) => {
    if (!tempUserId) {return;}
    try {
      await logOnboardingEvent({ eventType, bannerId, source, tempUserId });
    } catch (_e) {
      // silent fail for tracking
    }
  }, [tempUserId]);

  const dismissBanner = useCallback(async (bannerId: string) => {
    await saveDismissedBanner(bannerId);
    setState(prev => ({
      ...prev,
      banners: prev.banners.filter(b => b.id !== bannerId),
    }));
    await trackEvent('banner_dismissed', bannerId);
  }, [saveDismissedBanner, trackEvent]);

  const trackBannerShown = useCallback((bannerId: string) => {
    trackEvent('banner_shown', bannerId);
  }, [trackEvent]);

  const trackBannerClicked = useCallback((bannerId: string) => {
    trackEvent('banner_clicked', bannerId);
  }, [trackEvent]);

  useEffect(() => {
    loadDismissedBanners().then(() => {
      fetchBanners();
      fetchEvaluation();
    });
  }, [loadDismissedBanners, fetchBanners, fetchEvaluation]);

  useEffect(() => {
    if (!enabled) {return;}
    const interval = setInterval(() => {
      fetchBanners();
      fetchEvaluation();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, fetchBanners, fetchEvaluation]);

  const refresh = useCallback(() => {
    fetchBanners();
    fetchEvaluation();
  }, [fetchBanners, fetchEvaluation]);

  return {
    banners: state.banners,
    evaluation: state.evaluation,
    loading: state.loading,
    error: state.error,
    dismissBanner,
    trackBannerShown,
    trackBannerClicked,
    refresh,
  };
}
