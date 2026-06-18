import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { getPlanTier, PlanTier } from '../config/entitlements';

export interface EntitlementResult {
  allowed: boolean;
  reason: 'UPGRADE_REQUIRED' | 'LIMIT_REACHED' | null;
  upgradePlan: PlanTier | null;
}

export interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  period: string;
}

interface PremiumState {
  subscription: any | null;
  plans: any[];
  usage: Record<string, UsageInfo>;
  entitlements: string[];
  loading: boolean;
  error: string | null;
}

interface PremiumContextValue extends PremiumState {
  subscribe: (planCode: string) => Promise<any>;
  cancel: (reason?: string, reasonCode?: string) => Promise<void>;
  resume: () => Promise<void>;
  upgrade: (planCode: string) => Promise<void>;
  downgrade: (planCode: string) => Promise<void>;
  refresh: () => Promise<void>;
  checkLimit: (featureKey: string) => Promise<{ allowed: boolean; current: number; limit: number }>;
  canAccess: (featureKey: string) => boolean;
  checkEntitlement: (featureKey: string) => EntitlementResult;
  getUsage: () => Promise<Record<string, UsageInfo>>;
  trackEvent: (event: string, properties?: any) => Promise<void>;
  restorePurchases: () => Promise<any>;
  isPremium: boolean;
  daysRemaining: number;
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
  const [isPremium, setIsPremium] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [sub, entitlementsData] = await Promise.all([
        api.get<any>('/premium/current'),
        api.get<any>('/premium/entitlements'),
      ]);
      if (mountedRef.current) {
        const planCode = sub?.plan?.code || 'FREE';
        const premium = sub?.status === 'active' && planCode !== 'FREE';
        const days = sub?.currentPeriodEnd
          ? Math.max(0, Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 86400)))
          : 0;

        setIsPremium(premium);
        setDaysRemaining(days);
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
    } catch {}
  }, []);

  useEffect(() => {
    if (user) {
      Promise.all([refresh(), loadPlans()]);
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        subscription: null,
        plans: [],
        entitlements: [],
      }));
      setIsPremium(false);
      setDaysRemaining(0);
    }
  }, [user]);

  const subscribe = useCallback(async (planCode: string) => {
    try {
      const result = await api.post<any>('/premium/subscribe', { planCode });
      await refresh();
      return result;
    } catch (e: any) {
      throw new Error(e?.message || 'Subscription failed');
    }
  }, [refresh]);

  const cancel = useCallback(async (reason?: string, reasonCode?: string) => {
    try {
      await api.post('/premium/cancel', { reason, reasonCode });
      await refresh();
    } catch (e: any) {
      throw new Error(e?.message || 'Cancellation failed');
    }
  }, [refresh]);

  const resume = useCallback(async () => {
    try {
      await api.post('/premium/reactivate');
      await refresh();
    } catch (e: any) {
      throw new Error(e?.message || 'Reactivation failed');
    }
  }, [refresh]);

  const upgrade = useCallback(async (planCode: string) => {
    try {
      await api.post('/subscription/upgrade', { planCode });
      await refresh();
    } catch (e: any) {
      throw new Error(e?.message || 'Upgrade failed');
    }
  }, [refresh]);

  const downgrade = useCallback(async (planCode: string) => {
    try {
      await api.post('/subscription/downgrade', { planCode });
      await refresh();
    } catch (e: any) {
      throw new Error(e?.message || 'Downgrade failed');
    }
  }, [refresh]);

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
    return state.entitlements.includes(featureKey);
  }, [state.subscription, state.entitlements]);

  const checkEntitlement = useCallback((featureKey: string): EntitlementResult => {
    if (canAccess(featureKey)) {
      return { allowed: true, reason: null, upgradePlan: null };
    }
    const planCode = state.subscription?.plan?.code || 'FREE';
    const tier = getPlanTier(planCode);
    const familyOnlyFeatures = [
      'family_dashboard', 'family_space', 'family_goals', 'family_wealth',
      'family_contributions', 'family_calendar', 'family_bills', 'family_investments',
      'family_ai_advisor', 'family_reports', 'family_health_score',
      'shared_vault', 'shared_documents', 'shared_ai', 'up_to_6_members',
    ];
    if (familyOnlyFeatures.includes(featureKey)) {
      return { allowed: false, reason: 'UPGRADE_REQUIRED', upgradePlan: 'FAMILY' };
    }
    return { allowed: false, reason: 'UPGRADE_REQUIRED', upgradePlan: tier === 'FREE' ? 'PREMIUM' : 'FAMILY' };
  }, [canAccess, state.subscription]);

  const getUsage = useCallback(async () => {
    try {
      const data = await api.get<Record<string, UsageInfo>>('/premium/usage');
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
      await refresh();
      return result;
    } catch (e: any) {
      throw new Error(e?.message || 'Restore failed');
    }
  }, [refresh]);

  const trackEvent = useCallback(async (event: string, properties?: any) => {
    try {
      await api.post('/analytics/track', {
        event,
        category: 'premium',
        properties: { ...properties, timestamp: new Date().toISOString() },
      });
    } catch {}
  }, []);

  const value: PremiumContextValue = {
    ...state,
    subscribe,
    cancel,
    resume,
    upgrade,
    downgrade,
    refresh,
    checkLimit,
    canAccess,
    checkEntitlement,
    getUsage,
    trackEvent,
    restorePurchases,
    isPremium,
    daysRemaining,
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
