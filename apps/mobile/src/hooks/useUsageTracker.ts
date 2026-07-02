import { useState, useEffect, useCallback } from 'react';
import { usePremium } from '../store/PremiumContext';
import { getUsageLimit } from '../config/entitlements';

export interface UsageTrackerResult {
  current: number;
  limit: number | null;
  remaining: number | null;
  isAtLimit: boolean;
  isNearLimit: boolean;
  loading: boolean;
  canUse: boolean;
  refresh: () => Promise<void>;
}

export function useUsageTracker(featureKey: string): UsageTrackerResult {
  const { checkLimit, isPremium, subscription } = usePremium();
  const [current, setCurrent] = useState(0);
  const [limit, setLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const planCode = subscription?.plan?.code || 'FREE';
  const clientLimit = getUsageLimit(featureKey, planCode);

  const refresh = useCallback(async () => {
    try {
      const result = await checkLimit(featureKey);
      setCurrent(result.current);
      setLimit(result.limit);
    } catch {
      // fallback to client-side limit
      setLimit(clientLimit);
    } finally {
      setLoading(false);
    }
  }, [featureKey, checkLimit, clientLimit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isUnlimited = limit === null;
  const remaining = isUnlimited ? null : Math.max(0, limit - current);
  const isAtLimit = !isUnlimited && remaining !== null && remaining <= 0;
  const isNearLimit = !isUnlimited && remaining !== null && remaining <= 2 && remaining > 0;
  const canUse = isPremium || isUnlimited || (remaining !== null && remaining > 0);

  return {
    current,
    limit,
    remaining,
    isAtLimit,
    isNearLimit,
    loading,
    canUse,
    refresh,
  };
}
