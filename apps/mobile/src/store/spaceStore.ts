import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAccessToken } from '../services/api';

export interface Space {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  coverColor: string | null;
  memberCount: number;
  transactionCount: number;
  goalCount: number;
  role: string;
  createdAt: string;
}

export interface SpaceDetail extends Space {
  members: {
    id: string;
    userId: string;
    role: string;
    joinedAt: string;
    user: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  }[];
  myRole: string;
  updatedAt: string;
}

export interface SpaceDashboard {
  money: { totalIncome: number; totalExpense: number; balance: number; transactionCount: number };
  goals: { total: number; saved: number; count: number; items: any[] };
  recentTransactions: any[];
}

export interface SpaceTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

interface SpaceStore {
  spaces: Space[];
  activeSpaceId: string | null;
  activeSpace: SpaceDetail | null;
  dashboard: SpaceDashboard | null;
  loading: boolean;
  detailLoading: boolean;
  dashboardLoading: boolean;
  error: string | null;
  pinnedSpaceIds: string[];
  spaceTasks: Record<string, SpaceTask[]>;
  fetchSpaces: (accessToken: string | null) => Promise<void>;
  setActiveSpace: (spaceId: string) => void;
  fetchSpaceDetail: (accessToken: string | null) => Promise<void>;
  fetchDashboard: (accessToken: string | null) => Promise<void>;
  createSpace: (accessToken: string | null, data: { name: string; type: string; icon?: string; coverColor?: string }) => Promise<Space | null>;
  addMember: (accessToken: string | null, spaceId: string, userId: string, role?: string) => Promise<any>;
  removeMember: (accessToken: string | null, spaceId: string, memberId: string) => Promise<void>;
  togglePinSpace: (spaceId: string) => void;
  addSpaceTask: (spaceId: string, title: string) => void;
  toggleSpaceTask: (spaceId: string, taskId: string) => void;
  deleteSpaceTask: (spaceId: string, taskId: string) => void;
}

export const useSpaceStore = create<SpaceStore>()(
  persist(
    (set, get) => ({
  spaces: [],
  activeSpaceId: null,
  activeSpace: null,
  dashboard: null,
  loading: false,
  detailLoading: false,
  dashboardLoading: false,
  error: null,
  pinnedSpaceIds: [],
  spaceTasks: {},

  fetchSpaces: async (accessToken) => {
    if (accessToken) setAccessToken(accessToken);
    set({ loading: true, error: null });
    try {
      const res = await api.get<any>('/spaces');
      const spaces = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      set({ spaces, loading: false });
      if (spaces.length > 0 && !get().activeSpaceId) {
        set({ activeSpaceId: spaces[0].id });
      }
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load spaces', loading: false });
    }
  },

  setActiveSpace: (spaceId) => {
    set({ activeSpaceId: spaceId, activeSpace: null, dashboard: null });
  },

  fetchSpaceDetail: async (accessToken) => {
    const { activeSpaceId } = get();
    if (!activeSpaceId) return;
    if (accessToken) setAccessToken(accessToken);
    set({ detailLoading: true });
    try {
      const res = await api.get<any>(`/spaces/${activeSpaceId}`);
      set({ activeSpace: res?.data ?? res, detailLoading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load space', detailLoading: false });
    }
  },

  fetchDashboard: async (accessToken) => {
    const { activeSpaceId } = get();
    if (!activeSpaceId) return;
    if (accessToken) setAccessToken(accessToken);
    set({ dashboardLoading: true });
    try {
      const res = await api.get<any>(`/spaces/${activeSpaceId}/dashboard`);
      set({ dashboard: res?.data ?? res, dashboardLoading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load dashboard', dashboardLoading: false });
    }
  },

  createSpace: async (accessToken, data) => {
    if (accessToken) setAccessToken(accessToken);
    try {
      const res = await api.post<any>('/spaces', data);
      const space = res?.data ?? res;
      if (space?.id) {
        set((s) => ({ spaces: [space, ...s.spaces], activeSpaceId: space.id }));
      }
      return space;
    } catch (e: any) {
      set({ error: e?.message || 'Failed to create space' });
      return null;
    }
  },

  addMember: async (accessToken, spaceId, userId, role) => {
    if (accessToken) setAccessToken(accessToken);
    const res = await api.post<any>(`/spaces/${spaceId}/members`, { userId, role });
    return res?.data ?? res;
  },

  removeMember: async (accessToken, spaceId, memberId) => {
    if (accessToken) setAccessToken(accessToken);
    await api.delete(`/spaces/${spaceId}/members/${memberId}`);
  },

  togglePinSpace: (spaceId) => {
    set((state) => {
      const pinned = state.pinnedSpaceIds.includes(spaceId)
        ? state.pinnedSpaceIds.filter((id) => id !== spaceId)
        : [...state.pinnedSpaceIds, spaceId];
      return { pinnedSpaceIds: pinned };
    });
  },

  addSpaceTask: (spaceId, title) => {
    const task: SpaceTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      spaceTasks: {
        ...state.spaceTasks,
        [spaceId]: [...(state.spaceTasks[spaceId] || []), task],
      },
    }));
  },

  toggleSpaceTask: (spaceId, taskId) => {
    set((state) => ({
      spaceTasks: {
        ...state.spaceTasks,
        [spaceId]: (state.spaceTasks[spaceId] || []).map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t,
        ),
      },
    }));
  },

  deleteSpaceTask: (spaceId, taskId) => {
    set((state) => ({
      spaceTasks: {
        ...state.spaceTasks,
        [spaceId]: (state.spaceTasks[spaceId] || []).filter((t) => t.id !== taskId),
      },
    }));
  },
}),
    {
      name: 'dabbu-space-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ pinnedSpaceIds: state.pinnedSpaceIds, spaceTasks: state.spaceTasks }),
    },
  ),
);
