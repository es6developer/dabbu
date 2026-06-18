import { useState, useEffect } from 'react';
import { usePremium } from '../store/PremiumContext';

export function useUsageLimit(featureKey: string) {
  const { checkLimit, subscription, loading } = usePremium();
  const [state, setState] = useState<{
    current: number;
    limit: number;
    remaining: number;
    allowed: boolean;
    loading: boolean;
  }>({ current: 0, limit: 0, remaining: 0, allowed: false, loading: true });

  useEffect(() => {
    if (loading) return;

    const planCode = subscription?.plan?.code || 'FREE';
    const { getUsageLimit } = require('../config/entitlements');
    const limit = getUsageLimit(featureKey, planCode);

    checkLimit(featureKey).then(limitInfo => {
      const current = limitInfo.current;
      const maxLimit = limit ?? limitInfo.limit;
      setState({
        current,
        limit: maxLimit === null ? Infinity : maxLimit,
        remaining: maxLimit === null ? Infinity : Math.max(0, maxLimit - current),
        allowed: maxLimit === null || current < maxLimit,
        loading: false,
      });
    }).catch(() => {
      setState({
        current: 0,
        limit: limit === null ? Infinity : limit,
        remaining: limit === null ? Infinity : limit,
        allowed: limit === null || 0 < limit,
        loading: false,
      });
    });
  }, [featureKey, checkLimit, subscription, loading]);

  return state;
}
