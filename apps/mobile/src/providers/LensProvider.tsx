import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { AppState } from 'react-native';
import { useLensStore } from '../store/lensStore';
import type { LensMode } from '../types';
import type {
  LensFullConfig,
  FeatureFlagState,
  WidgetData,
  QuickActionConfig,
  LensRecommendation,
  LensAvailability,
} from '../types';

interface LensContextValue {
  activeLens: LensMode;
  previousLens: LensMode | null;
  availableLenses: LensAvailability[];
  config: LensFullConfig | null;
  features: Record<string, FeatureFlagState>;
  widgets: WidgetData[];
  quickActions: QuickActionConfig[];
  recommendations: LensRecommendation[];
  switchedAt: string | null;
  switchedCount: number;
  isLoading: boolean;
  isDashboardLoading: boolean;
  error: string | null;

  isPersonal: boolean;
  isPartnered: boolean;
  isFamily: boolean;
  isFull: boolean;

  isTabVisible: (tabKey: string) => boolean;
  getTabOrder: (tabKey: string) => number;
  isFeatureEnabled: (featureKey: string) => boolean;
  isFeatureDisabled: (featureKey: string) => boolean;
  isWidgetVisible: (widgetKey: string) => boolean;
  getQuickActions: () => QuickActionConfig[];
  canAccessLens: (lens: LensMode) => boolean;

  switchLens: (lens: LensMode, reason?: string) => Promise<void>;
  refresh: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

const LensContext = createContext<LensContextValue | null>(null);

export function LensProvider({ children }: { children: ReactNode }) {
  const store = useLensStore();

  useEffect(() => {
    if (store.activeLens) {
      store.fetchConfig();
      store.fetchDashboard();
      store.fetchFeatures();
      store.fetchRecommendations();
    }
  }, [store.activeLens]);

  useEffect(() => {
    const handleAppState = (nextState: string) => {
      if (nextState === 'active') {
        store.fetchDashboard();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, []);

  const isPersonal = store.activeLens === 'PERSONAL';
  const isPartnered = store.activeLens === 'PARTNERED';
  const isFamily = store.activeLens === 'FAMILY';
  const isFull = store.activeLens === 'FULL';

  const isTabVisible = useCallback(
    (tabKey: string): boolean => {
      const hidden = store.config?.navigation?.hiddenTabs || [];
      return !hidden.includes(tabKey);
    },
    [store.config?.navigation?.hiddenTabs],
  );

  const getTabOrder = useCallback(
    (tabKey: string): number => {
      const tabs = store.config?.navigation?.tabs || [];
      return tabs.find((t) => t.key === tabKey)?.sortOrder ?? 99;
    },
    [store.config?.navigation?.tabs],
  );

  const isFeatureEnabled = useCallback(
    (featureKey: string): boolean => {
      const feature = store.features?.[featureKey];
      if (typeof feature === 'boolean') return feature;
      if (typeof feature === 'object' && feature !== null) return (feature as FeatureFlagState).enabled ?? false;
      return true;
    },
    [store.features],
  );

  const isFeatureDisabled = useCallback(
    (featureKey: string): boolean => !isFeatureEnabled(featureKey),
    [isFeatureEnabled],
  );

  const isWidgetVisible = useCallback(
    (widgetKey: string): boolean => {
      const widgets = store.config?.dashboard?.widgets || [];
      return widgets.some((w) => w.key === widgetKey && w.isVisible);
    },
    [store.config?.dashboard?.widgets],
  );

  const getQuickActions = useCallback((): QuickActionConfig[] => {
    return store.quickActions || [];
  }, [store.quickActions]);

  const canAccessLens = useCallback(
    (lens: LensMode): boolean => {
      const available = store.availableLenses || [];
      const entry = available.find((a: LensAvailability) => a.type === lens);
      return entry?.isAvailable ?? false;
    },
    [store.availableLenses],
  );

  const switchLens = useCallback(
    async (lens: LensMode, reason?: string) => {
      await store.updateLens(null, lens, reason);
    },
    [store.updateLens],
  );

  const refresh = useCallback(async () => {
    await store.refreshAll();
  }, [store.refreshAll]);

  const refreshDashboard = useCallback(async () => {
    await store.fetchDashboard();
  }, [store.fetchDashboard]);

  const value: LensContextValue = {
    activeLens: store.activeLens,
    previousLens: store.previousLens,
    availableLenses: store.availableLenses,
    config: store.config,
    features: store.features,
    widgets: store.widgets,
    quickActions: store.quickActions,
    recommendations: store.recommendations,
    switchedAt: store.switchedAt,
    switchedCount: store.switchedCount,
    isLoading: store.isLoading,
    isDashboardLoading: store.isDashboardLoading,
    error: store.error,

    isPersonal,
    isPartnered,
    isFamily,
    isFull,

    isTabVisible,
    getTabOrder,
    isFeatureEnabled,
    isFeatureDisabled,
    isWidgetVisible,
    getQuickActions,
    canAccessLens,

    switchLens,
    refresh,
    refreshDashboard,
  };

  return <LensContext.Provider value={value}>{children}</LensContext.Provider>;
}

export function useLensContext(): LensContextValue {
  const context = useContext(LensContext);
  if (!context) {
    throw new Error('useLensContext must be used within a LensProvider');
  }
  return context;
}
