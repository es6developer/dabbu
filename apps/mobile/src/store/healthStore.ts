import { create } from 'zustand';
import { api, setAccessToken } from '../services/api';

interface HealthStore {
  score: { score: number; breakdown: any; calculatedAt: string } | null;
  loading: boolean;
  fetchScore: (accessToken: string | null, entityType?: string, entityId?: string) => Promise<void>;
}

export const useHealthStore = create<HealthStore>((set) => ({
  score: null,
  loading: false,

  fetchScore: async (accessToken, entityType, entityId) => {
    if (accessToken) setAccessToken(accessToken);
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (entityType) params.set('entityType', entityType);
      if (entityId) params.set('entityId', entityId);
      const qs = params.toString();
      const res = await api.get<any>(`/health-score${qs ? `?${qs}` : ''}`);
      set({ score: res?.data ?? res, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
