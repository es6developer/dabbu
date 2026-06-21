import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAccessToken } from '../services/api';
import type { LensMode, LensAvailability } from '../types';
import type {
  LensFullConfig,
  FeatureFlagState,
  DashboardWidgetData,
  QuickActionConfig,
  WidgetData,
  LensRecommendation,
} from '../types';

// Re-export LensMode and LensAvailability for existing consumers
export type { LensMode, LensAvailability };

interface LensStoreState {
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
  isConfigLoading: boolean;
  isDashboardLoading: boolean;
  error: string | null;
}

interface LensStoreActions {
  setLens: (lens: LensMode) => void;
  updateLens: (accessToken: string | null, lens: LensMode, reason?: string) => Promise<void>;
  hydrateFromUser: (user: { activeLens?: string }) => void;
  fetchConfig: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  fetchFeatures: () => Promise<void>;
  fetchNavigation: () => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  refreshAll: () => Promise<void>;
  clearError: () => void;
}

type LensStore = LensStoreState & LensStoreActions;

function trackLensSwitch(from: LensMode, to: LensMode) {
  try {
    api.post('/analytics/event', {
      event: 'lens_switch',
      properties: { from, to, timestamp: new Date().toISOString() },
    });
  } catch {
    // ignore
  }
}

export const useLensStore = create<LensStore>()(
  persist(
    (set, get) => ({
      activeLens: 'PERSONAL' as LensMode,
      previousLens: null,
      availableLenses: [],
      config: null,
      features: {},
      widgets: [],
      quickActions: [],
      recommendations: [],
      switchedAt: null,
      switchedCount: 0,
      isLoading: false,
      isConfigLoading: false,
      isDashboardLoading: false,
      error: null,

      setLens: (lens) => {
        const prev = get().activeLens;
        if (prev !== lens) {
          set({ activeLens: lens, previousLens: prev, error: null });
        }
      },

      updateLens: async (accessToken, lens, reason = 'manual') => {
        if (accessToken) setAccessToken(accessToken);
        const prev = get().activeLens;
        if (prev === lens) return;

        set({ activeLens: lens, previousLens: prev, isLoading: true, error: null });

        try {
          const res = await api.put<{ activeLens: LensMode; config: LensFullConfig }>('/lens/change', {
            lens,
            reason,
            metadata: { source: 'lens_picker' },
          });

          const raw = res as any;
          const result = raw?.data ?? raw;
          if (result?.config) {
            set({
              config: result.config,
              features: result.config.features || {},
              quickActions: result.config.dashboard?.quickActions || [],
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
            await get().fetchConfig();
          }

          trackLensSwitch(prev, lens);
        } catch (e: any) {
          set({
            activeLens: prev,
            previousLens: null,
            isLoading: false,
            error: e?.message || 'Failed to switch lens',
          });
        }
      },

      hydrateFromUser: (user) => {
        if (user?.activeLens && ['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'].includes(user.activeLens)) {
          const current = get().activeLens;
          const newLens = user.activeLens as LensMode;
          if (current !== newLens) {
            set({ activeLens: newLens, previousLens: current });
          }
        }
      },

      fetchConfig: async () => {
        set({ isConfigLoading: true });
        try {
          const res: any = await api.get<LensFullConfig>('/lens/config');
          const data = (res?.data ?? res) as LensFullConfig;
          set({
            config: data,
            features: data.features || {},
            quickActions: data.dashboard?.quickActions || [],
            isConfigLoading: false,
          });
        } catch {
          set({ isConfigLoading: false });
        }
      },

      fetchDashboard: async () => {
        set({ isDashboardLoading: true });
        try {
          const res: any = await api.get<DashboardWidgetData>('/lens/dashboard');
          const data = (res?.data ?? res) as DashboardWidgetData;
          set({
            widgets: data.widgets || [],
            quickActions: data.quickActions || [],
            isDashboardLoading: false,
          });
        } catch {
          set({ isDashboardLoading: false });
        }
      },

      fetchFeatures: async () => {
        try {
          const res: any = await api.get<{ features: Record<string, FeatureFlagState> }>('/lens/features');
          const data = (res?.data ?? res) as { features: Record<string, FeatureFlagState> };
          if (data?.features) {
            set({ features: data.features });
          }
        } catch { /* silent */ }
      },

      fetchNavigation: async () => {
        try {
          const res: any = await api.get<{ tabs: any[]; hiddenTabs: string[] }>('/lens/navigation');
          const data = (res?.data ?? res) as { tabs: any[]; hiddenTabs: string[] };
          if (data?.tabs && get().config) {
            set({
              config: {
                ...get().config!,
                navigation: {
                  tabs: data.tabs,
                  hiddenTabs: data.hiddenTabs || [],
                  prioritizedTabs: get().config!.navigation.prioritizedTabs,
                },
              },
            });
          }
        } catch { /* silent */ }
      },

      fetchRecommendations: async () => {
        try {
          const res: any = await api.get<LensRecommendation[]>('/lens/recommendations');
          const data = (res?.data ?? res) as LensRecommendation[];
          set({ recommendations: Array.isArray(data) ? data : [] });
        } catch { /* silent */ }
      },

      refreshAll: async () => {
        set({ isLoading: true });
        await Promise.all([
          get().fetchConfig(),
          get().fetchDashboard(),
          get().fetchFeatures(),
          get().fetchRecommendations(),
        ]);
        set({ isLoading: false });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'dabbu-lens-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          try {
            return AsyncStorage.getItem(name);
          } catch {
            return null;
          }
        },
        setItem: async (name: string, value: string) => {
          try {
            return AsyncStorage.setItem(name, value);
          } catch { /* silent */ }
        },
        removeItem: async (name: string) => {
          try {
            return AsyncStorage.removeItem(name);
          } catch { /* silent */ }
        },
      })),
      partialize: (state) => ({
        activeLens: state.activeLens,
        previousLens: state.previousLens,
        availableLenses: state.availableLenses,
        switchedAt: state.switchedAt,
        switchedCount: state.switchedCount,
      }),
    },
  ),
);
