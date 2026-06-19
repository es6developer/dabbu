import { create } from 'zustand';
import { api, setAccessToken } from '../services/api';

interface AIInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  createdAt: string;
}

interface AIStore {
  insights: AIInsight[];
  loading: boolean;
  error: string | null;
  fetchInsights: (accessToken: string | null, spaceId?: string) => Promise<void>;
  chat: (accessToken: string | null, message: string, spaceId?: string) => Promise<string | null>;
}

export const useAIStore = create<AIStore>((set) => ({
  insights: [],
  loading: false,
  error: null,

  fetchInsights: async (accessToken, spaceId) => {
    if (accessToken) setAccessToken(accessToken);
    set({ loading: true, error: null });
    try {
      const params = spaceId ? `?spaceId=${spaceId}` : '';
      const res = await api.get<any>(`/ai/insights${params}`);
      const data = res?.data ?? res;
      set({
        insights: Array.isArray(data) ? data : Array.isArray(data?.insights) ? data.insights : [],
        loading: false,
      });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load insights', loading: false });
    }
  },

  chat: async (accessToken, message, spaceId) => {
    if (accessToken) setAccessToken(accessToken);
    try {
      const res = await api.post<any>('/ai/chat', { message, spaceId });
      const data = res?.data ?? res;
      return data?.reply ?? data?.response ?? data?.message ?? null;
    } catch {
      return null;
    }
  },
}));
