import { useMemo } from 'react';
import { useLensStore } from '../store/lensStore';
import { useTheme } from '../theme';
import type { LensMode } from '../types';
import type {
  QuickActionConfig,
  LensRecommendation,
  WidgetData,
  FeatureFlagState,
} from '../types';

export function useLens() {
  const store = useLensStore();
  const { colors } = useTheme();

  const isPersonal = store.activeLens === 'PERSONAL';
  const isPartnered = store.activeLens === 'PARTNERED';
  const isFamily = store.activeLens === 'FAMILY';
  const isFull = store.activeLens === 'FULL';

  const getVisibleWidgets = (): WidgetData[] => {
    if (!store.widgets?.length) return [];
    const configWidgets = store.config?.dashboard?.widgets || [];
    const visibleKeys = configWidgets
      .filter((w) => w.isVisible)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((w) => w.key);

    return visibleKeys
      .map((key) => store.widgets.find((w) => w.key === key))
      .filter(Boolean) as WidgetData[];
  };

  const visibleWidgets = useMemo(getVisibleWidgets, [store.widgets, store.config?.dashboard?.widgets]);

  const featureHelpers = useMemo(
    () => ({
      isEnabled: (featureKey: string): boolean => {
        const feature = store.features?.[featureKey];
        if (typeof feature === 'boolean') return feature;
        if (typeof feature === 'object' && feature !== null)
          return (feature as FeatureFlagState).enabled ?? false;
        return true;
      },
      isDisabled: (featureKey: string): boolean => {
        return !featureHelpers.isEnabled(featureKey);
      },
      hasAnyEnabled: (...keys: string[]): boolean => {
        return keys.some((k) => featureHelpers.isEnabled(k));
      },
      areAllEnabled: (...keys: string[]): boolean => {
        return keys.every((k) => featureHelpers.isEnabled(k));
      },
    }),
    [store.features],
  );

  const navigationHelpers = useMemo(
    () => ({
      isTabVisible: (tabKey: string): boolean => {
        const hidden = store.config?.navigation?.hiddenTabs || [];
        return !hidden.includes(tabKey);
      },
      getTabOrder: (tabKey: string): number => {
        const tabs = store.config?.navigation?.tabs || [];
        return tabs.find((t) => t.key === tabKey)?.sortOrder ?? 99;
      },
      getVisibleTabs: () => {
        const tabs = store.config?.navigation?.tabs || [];
        return tabs
          .filter((t) => t.isVisible)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },
      isTabPriority: (tabKey: string): boolean => {
        const prioritized = store.config?.navigation?.prioritizedTabs || [];
        return prioritized.includes(tabKey);
      },
    }),
    [store.config?.navigation],
  );

  const lensAvailability = useMemo(
    () => ({
      canAccess: (lens: LensMode): boolean => {
        const entry = (store.availableLenses || []).find((a: { type: LensMode }) => a.type === lens);
        return entry?.isAvailable ?? false;
      },
      getReason: (lens: LensMode): string | undefined => {
        const entry = (store.availableLenses || []).find((a: { type: LensMode }) => a.type === lens);
        return entry?.reason;
      },
      isAvailable: (lens: LensMode): boolean => {
        if (lens === store.activeLens) return true;
        return lensAvailability.canAccess(lens);
      },
    }),
    [store.availableLenses, store.activeLens],
  );

  return {
    activeLens: store.activeLens,
    previousLens: store.previousLens,
    config: store.config,
    features: store.features,
    widgets: store.widgets,
    visibleWidgets,
    quickActions: store.quickActions || [],
    recommendations: store.recommendations || [],
    isLoading: store.isLoading,
    isConfigLoading: store.isConfigLoading,
    isDashboardLoading: store.isDashboardLoading,
    error: store.error,

    isPersonal,
    isPartnered,
    isFamily,
    isFull,

    theme: { colors },

    ...featureHelpers,
    ...navigationHelpers,
    ...lensAvailability,

    switchLens: store.updateLens,
    refresh: store.refreshAll,
    refreshDashboard: store.fetchDashboard,
    clearError: store.clearError,
  };
}
