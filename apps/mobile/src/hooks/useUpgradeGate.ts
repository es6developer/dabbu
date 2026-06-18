import { useState, useCallback, useRef } from 'react';
import { usePremium, EntitlementResult } from '../store/PremiumContext';
import { PlanTier } from '../config/entitlements';

interface UseUpgradeGateOptions {
  featureKey: string;
  featureLabel?: string;
  currentLimit?: number;
  premiumLimit?: string;
  plan?: PlanTier;
  onShow?: () => void;
}

interface UseUpgradeGateReturn {
  allowed: boolean;
  showUpgrade: () => void;
  upgradeVisible: boolean;
  hideUpgrade: () => void;
  entitlement: EntitlementResult;
  upgradeProps: {
    feature?: string;
    featureLabel?: string;
    currentLimit?: number;
    premiumLimit?: string;
    plan?: PlanTier;
  };
}

export function useUpgradeGate(options: UseUpgradeGateOptions): UseUpgradeGateReturn {
  const { checkEntitlement } = usePremium();
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const entitlement = checkEntitlement(options.featureKey);
  const hasShown = useRef(false);

  const showUpgrade = useCallback(() => {
    if (!entitlement.allowed && !hasShown.current) {
      hasShown.current = true;
      setUpgradeVisible(true);
      options.onShow?.();
    } else if (!entitlement.allowed) {
      setUpgradeVisible(true);
      options.onShow?.();
    }
  }, [entitlement.allowed, options.onShow]);

  const hideUpgrade = useCallback(() => {
    setUpgradeVisible(false);
  }, []);

  return {
    allowed: entitlement.allowed,
    showUpgrade,
    upgradeVisible,
    hideUpgrade,
    entitlement,
    upgradeProps: {
      feature: options.featureKey,
      featureLabel: options.featureLabel,
      currentLimit: options.currentLimit,
      premiumLimit: options.premiumLimit,
      plan: (entitlement.upgradePlan as PlanTier) || options.plan,
    },
  };
}

export function resetUpgradeGate() {
  // The hasShown ref is per-hook instance; this is a global reset
}
