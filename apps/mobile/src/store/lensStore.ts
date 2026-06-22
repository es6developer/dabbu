import { Platform, LayoutAnimation } from 'react-native';
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

let SecureStore: any = {};
if (Platform.OS !== 'web') {
  try {
    SecureStore = require('expo-secure-store');
  } catch {
    // secure store not available
  }
}

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

async function updateSecureStoreLens(lens: string) {
  try {
    if (!SecureStore.getItemAsync) return;
    const raw = await SecureStore.getItemAsync('userData');
    if (raw) {
      const userData = JSON.parse(raw);
      if (userData.activeLens !== lens) {
        userData.activeLens = lens;
        await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      }
    }
  } catch {
    // silent
  }
}

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
      activeLens: 'FULL' as LensMode,
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
        LayoutAnimation.configureNext({ duration: 300, update: { type: 'easeInEaseOut' } });
        const prev = get().activeLens;
        if (prev !== lens) {
          const localConfigs: Record<
            string,
            { features: Record<string, FeatureFlagState>; quickActions: QuickActionConfig[] }
          > = {
            PERSONAL: {
              features: {
                spaces: { enabled: false },
                coupleInsights: { enabled: false },
                familyInsights: { enabled: false },
                partnerManagement: { enabled: false },
                sharedExpenses: { enabled: false },
                familyCalendar: { enabled: false },
                allowances: { enabled: false },
                settlement: { enabled: false },
                goalCollaboration: { enabled: false },
                budgets: { enabled: true },
                bills: { enabled: true },
                goals: { enabled: true },
                investments: { enabled: true },
                reports: { enabled: true },
                aiInsights: { enabled: true },
              },
              quickActions: [
                {
                  key: 'add_expense',
                  label: 'Add Expense',
                  icon: 'minuscircle',
                  color: '#EF4444',
                  sortOrder: 0,
                },
                {
                  key: 'add_income',
                  label: 'Add Income',
                  icon: 'pluscircle',
                  color: '#22C55E',
                  sortOrder: 1,
                },
                {
                  key: 'add_goal',
                  label: 'Add Goal',
                  icon: 'flag',
                  color: '#F59E0B',
                  sortOrder: 2,
                },
                {
                  key: 'create_budget',
                  label: 'Create Budget',
                  icon: 'wallet',
                  color: '#3B82F6',
                  sortOrder: 3,
                },
                {
                  key: 'pay_bill',
                  label: 'Pay Bill',
                  icon: 'filetext1',
                  color: '#7C3AED',
                  sortOrder: 4,
                },
              ],
            },
            PARTNERED: {
              features: {
                spaces: { enabled: true, config: { allowedTypes: ['COUPLE'] } },
                coupleInsights: { enabled: true, config: { depth: 'full' } },
                familyInsights: { enabled: false },
                partnerManagement: { enabled: true },
                sharedExpenses: { enabled: true, config: { scope: 'partner' } },
                familyCalendar: { enabled: false },
                allowances: { enabled: false },
                settlement: { enabled: true },
                goalCollaboration: { enabled: true, config: { maxMembers: 2 } },
                budgets: { enabled: true },
                bills: { enabled: true },
                goals: { enabled: true },
                investments: { enabled: false },
                reports: { enabled: false },
                aiInsights: { enabled: true },
              },
              quickActions: [
                {
                  key: 'add_shared_expense',
                  label: 'Shared Expense',
                  icon: 'addusergroup',
                  color: '#F43F5E',
                  sortOrder: 0,
                },
                {
                  key: 'add_shared_income',
                  label: 'Shared Income',
                  icon: 'pluscircle',
                  color: '#22C55E',
                  sortOrder: 1,
                },
                {
                  key: 'contribute_goal',
                  label: 'Contribute Goal',
                  icon: 'flag',
                  color: '#F59E0B',
                  sortOrder: 2,
                },
                {
                  key: 'settle_balance',
                  label: 'Settle Balance',
                  icon: 'swap',
                  color: '#3B82F6',
                  sortOrder: 3,
                },
                {
                  key: 'plan_expense',
                  label: 'Plan Expense',
                  icon: 'calendar',
                  color: '#7C3AED',
                  sortOrder: 4,
                },
              ],
            },
            FAMILY: {
              features: {
                spaces: { enabled: false },
                coupleInsights: { enabled: false },
                familyInsights: { enabled: true, config: { depth: 'full' } },
                partnerManagement: { enabled: false },
                sharedExpenses: { enabled: true, config: { scope: 'household' } },
                familyCalendar: { enabled: true },
                allowances: { enabled: true },
                settlement: { enabled: false },
                goalCollaboration: { enabled: true, config: { maxMembers: 10 } },
                budgets: { enabled: true },
                bills: { enabled: true },
                goals: { enabled: true },
                investments: { enabled: false },
                reports: { enabled: true },
                aiInsights: { enabled: true },
              },
              quickActions: [
                {
                  key: 'add_household_expense',
                  label: 'Household Expense',
                  icon: 'minuscircle',
                  color: '#059669',
                  sortOrder: 0,
                },
                {
                  key: 'add_bill',
                  label: 'Add Bill',
                  icon: 'filetext1',
                  color: '#F59E0B',
                  sortOrder: 1,
                },
                {
                  key: 'add_goal',
                  label: 'Add Goal',
                  icon: 'flag',
                  color: '#3B82F6',
                  sortOrder: 2,
                },
                {
                  key: 'record_allowance',
                  label: 'Record Allowance',
                  icon: 'gift',
                  color: '#8B5CF6',
                  sortOrder: 3,
                },
                {
                  key: 'create_reminder',
                  label: 'Create Reminder',
                  icon: 'bells',
                  color: '#22C55E',
                  sortOrder: 4,
                },
              ],
            },
            FULL: {
              features: {
                spaces: { enabled: true, config: { allowedTypes: ['ALL'] } },
                coupleInsights: { enabled: true, config: { depth: 'full' } },
                familyInsights: { enabled: true, config: { depth: 'full' } },
                partnerManagement: { enabled: true },
                sharedExpenses: { enabled: true, config: { scope: 'all' } },
                familyCalendar: { enabled: true },
                allowances: { enabled: true },
                settlement: { enabled: true },
                goalCollaboration: { enabled: true, config: { maxMembers: 50 } },
                investments: { enabled: true },
                budgets: { enabled: true },
                bills: { enabled: true },
                goals: { enabled: true },
                reports: { enabled: true },
                aiInsights: { enabled: true },
              },
              quickActions: [
                {
                  key: 'add_expense',
                  label: 'Add Expense',
                  icon: 'minuscircle',
                  color: '#EF4444',
                  sortOrder: 0,
                },
                {
                  key: 'create_space',
                  label: 'Create Space',
                  icon: 'team',
                  color: '#D97706',
                  sortOrder: 1,
                },
                {
                  key: 'add_goal',
                  label: 'Add Goal',
                  icon: 'flag',
                  color: '#F59E0B',
                  sortOrder: 2,
                },
                {
                  key: 'export_report',
                  label: 'Export Report',
                  icon: 'barschart',
                  color: '#22C55E',
                  sortOrder: 3,
                },
                {
                  key: 'add_investment',
                  label: 'Add Investment',
                  icon: 'linechart',
                  color: '#3B82F6',
                  sortOrder: 4,
                },
              ],
            },
          };
          const local = localConfigs[lens];
          set({
            activeLens: lens,
            previousLens: prev,
            features: local?.features || {},
            quickActions: local?.quickActions || [],
            error: null,
          });
        }
      },

      updateLens: async (accessToken, lens, reason = 'manual') => {
        LayoutAnimation.configureNext({ duration: 300, update: { type: 'easeInEaseOut' } });
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const prev = get().activeLens;

        try {
          const res = await api.put<{ activeLens: LensMode; config: LensFullConfig }>(
            '/lens/change',
            {
              lens,
              reason,
              metadata: { source: 'lens_picker' },
            },
          );

          const raw = res as any;
          const result = raw?.data ?? raw;
          const activeLens = result?.activeLens || lens;
          if (result?.config) {
            set({
              activeLens,
              previousLens: prev,
              config: result.config,
              features: result.config.features || {},
              quickActions: result.config.dashboard?.quickActions || [],
            });
          } else {
            set({ activeLens, previousLens: prev });
            await get().fetchConfig();
          }

          updateSecureStoreLens(activeLens);
          trackLensSwitch(prev, lens);
        } catch (e: any) {
          set({ error: e?.message || 'Failed to persist lens switch on server' });
        }
      },

      hydrateFromUser: (user) => {
        if (
          user?.activeLens &&
          ['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'].includes(user.activeLens)
        ) {
          const state = get();
          const newLens = user.activeLens as LensMode;
          // If user explicitly toggled lens before (previousLens was set),
          // don't override with stale data from SecureStore
          if (state.activeLens !== newLens && state.previousLens === null) {
            set({ activeLens: newLens, previousLens: state.activeLens });
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
          const res: any = await api.get<{ features: Record<string, FeatureFlagState> }>(
            '/lens/features',
          );
          const data = (res?.data ?? res) as { features: Record<string, FeatureFlagState> };
          if (data?.features) {
            set({ features: data.features });
          }
        } catch {
          /* silent */
        }
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
        } catch {
          /* silent */
        }
      },

      fetchRecommendations: async () => {
        try {
          const res: any = await api.get<LensRecommendation[]>('/lens/recommendations');
          const data = (res?.data ?? res) as LensRecommendation[];
          set({ recommendations: Array.isArray(data) ? data : [] });
        } catch {
          /* silent */
        }
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
          } catch {
            /* silent */
          }
        },
        removeItem: async (name: string) => {
          try {
            return AsyncStorage.removeItem(name);
          } catch {
            /* silent */
          }
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
