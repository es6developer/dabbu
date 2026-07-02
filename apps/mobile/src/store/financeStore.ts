import { create } from 'zustand';
import { api } from '../services/api';

interface AggregatedDashboard {
  netWorth: { assets: number; liabilities: number; netWorth: number } | null;
  healthScore: { score: number; breakdown: any; calculatedAt: string } | null;
  myMoney: { income: number; expense: number; savings: number };
  ourMoney?: { income: number; expense: number; savings: number };
  familyMoney?: { income: number; expense: number; savings: number };
  goals: any[];
  recentTransactions: any[];
  spaces: { count: number };
}

interface FinanceStore {
  dashboard: AggregatedDashboard | null;
  loading: boolean;
  error: string | null;
  fetchDashboard: (accessToken: string | null, lens?: string) => Promise<void>;
}

export const useFinanceStore = create<FinanceStore>((set) => ({
  dashboard: null,
  loading: false,
  error: null,

  fetchDashboard: async (accessToken, lens) => {
    set({ loading: true, error: null });
    try {
      const params = lens ? `?lens=${lens}` : '';
      const res = await api.get<any>(`/dashboard${params}`);
      set({ dashboard: res?.data ?? res, loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load dashboard', loading: false });
    }
  },
}));
