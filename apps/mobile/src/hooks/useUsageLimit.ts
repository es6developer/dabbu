import { useState, useEffect, useCallback } from 'react';
import { usePremium } from '../store/PremiumContext';
import { getUsageLimit } from '../config/entitlements';

interface UsageLimitState {
  current: number;
  limit: number;
  remaining: number;
  allowed: boolean;
  loading: boolean;
  percentUsed: number;
}

export function useUsageLimit(featureKey: string) {
  const { checkLimit, subscription, loading: premiumLoading } = usePremium();
  const [state, setState] = useState<UsageLimitState>({
    current: 0,
    limit: 0,
    remaining: 0,
    allowed: false,
    loading: true,
    percentUsed: 0,
  });

  const load = useCallback(async () => {
    if (premiumLoading) return;

    const planCode = subscription?.plan?.code || 'FREE';
    const configuredLimit = getUsageLimit(featureKey, planCode);

    try {
      const limitInfo = await checkLimit(featureKey);
      const current = limitInfo.current;
      const limit = configuredLimit === null ? -1 : configuredLimit;

      setState({
        current,
        limit,
        remaining: limit === -1 ? -1 : Math.max(0, limit - current),
        allowed: limit === -1 || current < limit,
        loading: false,
        percentUsed: limit === -1 ? 0 : Math.min(100, Math.round((current / limit) * 100)),
      });
    } catch {
      setState({
        current: 0,
        limit: configuredLimit === null ? -1 : configuredLimit,
        remaining: configuredLimit === null ? -1 : configuredLimit,
        allowed: configuredLimit === null || 0 < configuredLimit,
        loading: false,
        percentUsed: 0,
      });
    }
  }, [featureKey, checkLimit, subscription, premiumLoading]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}

export function useUsageLimits(featureKeys: string[]) {
  const results: Record<string, UsageLimitState & { refresh: () => Promise<void> }> = {};
  for (const key of featureKeys) {
    results[key] = useUsageLimit(key);
  }
  return results;
}
