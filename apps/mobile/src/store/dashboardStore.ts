import { create } from 'zustand';
import { api, setAccessToken } from '../services/api';

interface DashboardData {
  totalBalance: number | null;
  monthlyIncome: number;
  monthlyExpense: number;
  savings: number;
  savingsRate: number;
  categories: { name: string; amount: number }[];
  recentTransactions: any[];
  groupCount: number;
  reminders: any[];
  goals: any[];
  unreadCount: number;
  upcomingBillsTotal: number;
  subscriptionTotal: number;
  loanEmiTotal: number;
  loading: boolean;
  error: string | null;
}

interface DashboardStore extends DashboardData {
  fetchAll: (accessToken: string | null) => Promise<void>;
  refresh: (accessToken: string | null) => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  totalBalance: null,
  monthlyIncome: 0,
  monthlyExpense: 0,
  savings: 0,
  savingsRate: 0,
  categories: [],
  recentTransactions: [],
  groupCount: 0,
  reminders: [],
  goals: [],
  unreadCount: 0,
  upcomingBillsTotal: 0,
  subscriptionTotal: 0,
  loanEmiTotal: 0,
  loading: true,
  error: null,

  fetchAll: async (accessToken) => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    set({ loading: true, error: null });
    try {
      const [balRes, statsRes, grpRes, remRes, goalRes, notifRes, billsRes, subRes] =
        await Promise.allSettled([
          api.get<any>('/accounts/stats'),
          api.get<any>('/transactions/stats?months=1'),
          api.get<any>('/expense-groups'),
          api.get<any>('/reminders/upcoming?days=7'),
          api.get<any>('/goals'),
          api.get<any>('/notifications/unread-count'),
          api.get<any>('/bills?status=pending'),
          api.get<any>('/accounts/subscriptions'),
        ]);

      const state: Record<string, any> = {};

      if (balRes.status === 'fulfilled') {
        const b = balRes.value;
        state.totalBalance = b.totalBalance ?? b.data?.totalBalance ?? null;
      }

      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value?.data ?? statsRes.value;
        state.monthlyIncome = s.summary?.totalIncome ?? 0;
        state.monthlyExpense = s.summary?.totalExpense ?? 0;
        state.savings = state.monthlyIncome - state.monthlyExpense;
        state.savingsRate =
          state.monthlyIncome > 0 ? Math.round((state.savings / state.monthlyIncome) * 100) : 0;
        const cats: any[] = (s.categoryBreakdown || []).map((c: any) => ({
          name: c.name === 'Uncategorized' || !c.name ? 'Other' : c.name,
          amount: Number(c.amount || 0),
        }));
        const grouped: Record<string, number> = {};
        cats.forEach((c: any) => {
          grouped[c.name] = (grouped[c.name] || 0) + c.amount;
        });
        state.categories = Object.entries(grouped).map(([name, amount]) => ({ name, amount }));
        state.recentTransactions = (s.recentTransactions || []).slice(0, 5);
      }

      if (grpRes.status === 'fulfilled') {
        const list = Array.isArray(grpRes.value)
          ? grpRes.value
          : Array.isArray(grpRes.value?.data)
            ? grpRes.value.data
            : [];
        state.groupCount = list.length;
      }

      if (remRes.status === 'fulfilled') {
        const list = Array.isArray(remRes.value)
          ? remRes.value
          : Array.isArray(remRes.value?.data)
            ? remRes.value.data
            : [];
        state.reminders = list.slice(0, 5);
      }

      if (goalRes.status === 'fulfilled') {
        const list = Array.isArray(goalRes.value)
          ? goalRes.value
          : Array.isArray(goalRes.value?.data)
            ? goalRes.value.data
            : [];
        state.goals = list.slice(0, 3);
      }

      if (notifRes.status === 'fulfilled') {
        const n = notifRes.value;
        state.unreadCount = n.count ?? n.data?.count ?? 0;
      }

      if (billsRes.status === 'fulfilled') {
        const billsData = billsRes.value?.data ?? billsRes.value ?? [];
        const bills = Array.isArray(billsData) ? billsData : [];
        state.upcomingBillsTotal = bills.reduce(
          (sum: number, b: any) => sum + (Number(b.amount) || 0),
          0,
        );
      }

      if (subRes.status === 'fulfilled') {
        const subData = subRes.value?.data ?? subRes.value ?? {};
        state.subscriptionTotal = Number(subData.monthlyTotal ?? subData.total ?? 0);
      }

      set({ ...state, loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load dashboard', loading: false });
    }
  },

  refresh: async (accessToken) => {
    await get().fetchAll(accessToken);
  },
}));
