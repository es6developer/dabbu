import { useState, useCallback } from 'react';
import { usePremium } from '../store/PremiumContext';

interface UseUpgradeGateOptions {
  featureKey: string;
  featureLabel?: string;
  currentLimit?: number;
  premiumLimit?: string;
  plan?: 'PREMIUM' | 'FAMILY';
}

interface UseUpgradeGateReturn {
  allowed: boolean;
  showUpgrade: () => void;
  upgradeVisible: boolean;
  hideUpgrade: () => void;
  upgradeProps: {
    feature?: string;
    featureLabel?: string;
    currentLimit?: number;
    premiumLimit?: string;
    plan?: 'PREMIUM' | 'FAMILY';
  };
}

export function useUpgradeGate(options: UseUpgradeGateOptions): UseUpgradeGateReturn {
  const { checkEntitlement } = usePremium();
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const entitlement = checkEntitlement(options.featureKey);

  const showUpgrade = useCallback(() => {
    if (!entitlement.allowed) {
      setUpgradeVisible(true);
    }
  }, [entitlement.allowed]);

  const hideUpgrade = useCallback(() => setUpgradeVisible(false), []);

  return {
    allowed: entitlement.allowed,
    showUpgrade,
    upgradeVisible,
    hideUpgrade,
    upgradeProps: {
      feature: options.featureKey,
      featureLabel: options.featureLabel,
      currentLimit: options.currentLimit,
      premiumLimit: options.premiumLimit,
      plan: (entitlement.upgradePlan as 'PREMIUM' | 'FAMILY') || options.plan,
    },
  };
}
