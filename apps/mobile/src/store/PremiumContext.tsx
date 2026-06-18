import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface EntitlementResult {
  allowed: boolean;
  reason: string | null;
  upgradePlan: string | null;
}

interface PremiumState {
  subscription: any | null;
  plans: any[];
  usage: Record<string, number>;
  entitlements: string[];
  loading: boolean;
  error: string | null;
}

interface PremiumContextValue extends PremiumState {
  subscribe: (planCode: string) => Promise<any>;
  cancelSubscription: (reason?: string) => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  changePlan: (newPlanCode: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  checkLimit: (featureKey: string) => Promise<{ allowed: boolean; current: number; limit: number }>;
  canAccess: (featureKey: string) => boolean;
  checkEntitlement: (featureKey: string) => EntitlementResult;
  getUsage: () => Promise<Record<string, number>>;
  trackEvent: (event: string, properties?: any) => Promise<void>;
  restorePurchases: () => Promise<any>;
}

const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<PremiumState>({
    subscription: null,
    plans: [],
    usage: {},
    entitlements: [],
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const [sub, entitlementsData] = await Promise.all([
        api.get<any>('/premium/current'),
        api.get<any>('/premium/entitlements'),
      ]);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          subscription: sub,
          entitlements: entitlementsData?.grantedFeatures || [],
          loading: false,
          error: null,
        }));
      }
      return sub;
    } catch (e: any) {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, loading: false, error: e?.message || null }));
      }
      return null;
    }
  }, []);

  const loadPlans = useCallback(async () => {
    try {
      const planList = await api.get<any[]>('/premium/plans');
      if (mountedRef.current) {
        setState(prev => ({ ...prev, plans: Array.isArray(planList) ? planList : [] }));
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (user) {
      Promise.all([refreshSubscription(), loadPlans()]);
    } else {
      setState(prev => ({ ...prev, loading: false, subscription: null, plans: [], entitlements: [] }));
    }
  }, [user, refreshSubscription, loadPlans]);

  const subscribe = useCallback(async (planCode: string) => {
    try {
      const result = await api.post<any>('/premium/subscribe', { planCode });
      await refreshSubscription();
      return result;
    } catch (e: any) {
      throw new Error(e?.message || 'Subscription failed');
    }
  }, [refreshSubscription]);

  const cancelSubscription = useCallback(async (reason?: string) => {
    try {
      await api.post('/premium/cancel', { reason });
      await refreshSubscription();
    } catch (e: any) {
      throw new Error(e?.message || 'Cancellation failed');
    }
  }, [refreshSubscription]);

  const reactivateSubscription = useCallback(async () => {
    try {
      await api.post('/premium/reactivate');
      await refreshSubscription();
    } catch (e: any) {
      throw new Error(e?.message || 'Reactivation failed');
    }
  }, [refreshSubscription]);

  const changePlan = useCallback(async (newPlanCode: string) => {
    try {
      await api.post('/premium/change-plan', { planCode: newPlanCode });
      await refreshSubscription();
    } catch (e: any) {
      throw new Error(e?.message || 'Plan change failed');
    }
  }, [refreshSubscription]);

  const checkLimit = useCallback(async (featureKey: string) => {
    try {
      const result = await api.get<any>(`/premium/limits/${featureKey}`);
      return {
        allowed: result?.allowed ?? false,
        current: result?.current ?? 0,
        limit: result?.limit ?? 0,
      };
    } catch {
      return { allowed: false, current: 0, limit: 0 };
    }
  }, []);

  const canAccess = useCallback((featureKey: string): boolean => {
    const sub = state.subscription;
    if (!sub || sub.status !== 'active') return false;
    const planCode = sub.plan?.code || 'FREE';
    return state.entitlements.includes(featureKey);
  }, [state.subscription, state.entitlements]);

  const checkEntitlement = useCallback((featureKey: string): EntitlementResult => {
    if (canAccess(featureKey)) {
      return { allowed: true, reason: null, upgradePlan: null };
    }
    const planCode = state.subscription?.plan?.code || 'FREE';
    const isFamilyOnly = ['family_space', 'family_dashboard', 'family_calendar'].includes(featureKey);
    if (isFamilyOnly) {
      return { allowed: false, reason: 'UPGRADE_REQUIRED', upgradePlan: 'FAMILY' };
    }
    return { allowed: false, reason: 'UPGRADE_REQUIRED', upgradePlan: planCode === 'FREE' ? 'PREMIUM' : 'FAMILY' };
  }, [canAccess, state.subscription]);

  const getUsage = useCallback(async () => {
    try {
      const data = await api.get<Record<string, number>>('/premium/usage');
      if (mountedRef.current) {
        setState(prev => ({ ...prev, usage: data || {} }));
      }
      return data || {};
    } catch {
      return {};
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      const result = await api.post<any>('/premium/restore');
      await refreshSubscription();
      return result;
    } catch (e: any) {
      throw new Error(e?.message || 'Restore failed');
    }
  }, [refreshSubscription]);

  const trackEvent = useCallback(async (event: string, properties?: any) => {
    try {
      await api.post('/analytics/track', {
        event,
        category: 'premium',
        properties: { ...properties, timestamp: new Date().toISOString() },
      });
    } catch {
      // silent
    }
  }, []);

  const value: PremiumContextValue = {
    ...state,
    subscribe,
    cancelSubscription,
    reactivateSubscription,
    changePlan,
    refreshSubscription,
    checkLimit,
    canAccess,
    checkEntitlement,
    getUsage,
    trackEvent,
    restorePurchases,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return ctx;
}
