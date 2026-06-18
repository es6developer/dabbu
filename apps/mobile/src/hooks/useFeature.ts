import { useState, useEffect } from 'react';
import { usePremium } from '../store/PremiumContext';

export function useFeature(featureKey: string) {
  const { canAccess, checkLimit, loading } = usePremium();
  const [state, setState] = useState<{
    allowed: boolean;
    loading: boolean;
    limit?: number;
    usage?: number;
  }>({ allowed: false, loading: true });

  useEffect(() => {
    if (!loading) {
      const allowed = canAccess(featureKey);
      checkLimit(featureKey).then(limitInfo => {
        setState({
          allowed,
          loading: false,
          limit: limitInfo.limit,
          usage: limitInfo.current,
        });
      }).catch(() => {
        setState({ allowed, loading: false });
      });
    }
  }, [featureKey, canAccess, checkLimit, loading]);

  return state;
}
