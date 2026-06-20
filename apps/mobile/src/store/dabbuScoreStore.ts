import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export type DabbuLevel = 'critical' | 'building' | 'stable' | 'thriving' | 'exceptional';

export interface DabbuComponent {
  name: string;
  label: string;
  score: number;
  maxScore: number;
  weight: number;
}

export interface DabbuHistoryEntry {
  score: number;
  date: string;
  components: DabbuComponent[];
}

export interface DabbuImprovement {
  action: string;
  impact: number;
  category: string;
  effort: 'low' | 'medium' | 'high';
}

interface DabbuScoreStore {
  score: number | null;
  level: DabbuLevel | null;
  monthlyChange: number | null;
  components: DabbuComponent[];
  history: DabbuHistoryEntry[];
  improvements: DabbuImprovement[];
  loading: boolean;
  historyLoading: boolean;
  improvementsLoading: boolean;
  componentsLoading: boolean;
  recalculating: boolean;
  error: string | null;

  fetchScore: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchImprovements: () => Promise<void>;
  fetchComponents: () => Promise<void>;
  recalculate: () => Promise<void>;
}

export const useDabbuScoreStore = create<DabbuScoreStore>()(
  persist(
    (set) => ({
      score: null,
      level: null,
      monthlyChange: null,
      components: [],
      history: [],
      improvements: [],
      loading: false,
      historyLoading: false,
      improvementsLoading: false,
      componentsLoading: false,
      recalculating: false,
      error: null,

      fetchScore: async () => {
        set({ loading: true, error: null });
        try {
          const res = await api.get<any>('/dabbu-score');
          const data = res?.data ?? res;
          set({
            score: data.overallScore ?? data.score ?? null,
            level: data.level ?? null,
            monthlyChange: data.monthlyChange ?? null,
            components: data.components ?? [],
            loading: false,
          });
        } catch (e: any) {
          set({ error: e?.message || 'Failed to load Dabbu Score', loading: false });
        }
      },

      fetchHistory: async () => {
        set({ historyLoading: true, error: null });
        try {
          const res = await api.get<any>('/dabbu-score/history');
          const data = Array.isArray(res) ? res : (res?.data ?? []);
          set({ history: data, historyLoading: false });
        } catch (e: any) {
          set({ error: e?.message || 'Failed to load score history', historyLoading: false });
        }
      },

      fetchImprovements: async () => {
        set({ improvementsLoading: true, error: null });
        try {
          const res = await api.get<any>('/dabbu-score/improvements');
          const data = Array.isArray(res) ? res : (res?.data ?? []);
          set({ improvements: data, improvementsLoading: false });
        } catch (e: any) {
          set({ error: e?.message || 'Failed to load improvements', improvementsLoading: false });
        }
      },

      fetchComponents: async () => {
        set({ componentsLoading: true, error: null });
        try {
          const res = await api.get<any>('/dabbu-score/components');
          const data =
            res && typeof res === 'object' && !Array.isArray(res)
              ? res
              : Array.isArray(res)
                ? res
                : [];
          set({ components: data, componentsLoading: false });
        } catch (e: any) {
          set({ error: e?.message || 'Failed to load components', componentsLoading: false });
        }
      },

      recalculate: async () => {
        set({ recalculating: true, error: null });
        try {
          const res = await api.post<any>('/dabbu-score/recalculate');
          const data = res?.data ?? res;
          set({
            score: data.overallScore ?? data.score ?? null,
            level: data.level ?? null,
            monthlyChange: data.monthlyChange ?? null,
            components: data.components ?? [],
            recalculating: false,
          });
        } catch (e: any) {
          set({ error: e?.message || 'Failed to recalculate score', recalculating: false });
        }
      },
    }),
    {
      name: 'dabbu-score-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        score: state.score,
        level: state.level,
        monthlyChange: state.monthlyChange,
        components: state.components,
        history: state.history,
        improvements: state.improvements,
      }),
    },
  ),
);
