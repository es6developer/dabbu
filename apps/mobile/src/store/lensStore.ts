import { create } from 'zustand';
import { api, setAccessToken } from '../services/api';

export type LensMode = 'PERSONAL' | 'PARTNERED' | 'FAMILY' | 'FULL';

interface LensStore {
  activeLens: LensMode;
  loading: boolean;
  setLens: (lens: LensMode) => void;
  updateLens: (accessToken: string | null, lens: LensMode) => Promise<void>;
  hydrateFromUser: (user: { activeLens?: string }) => void;
}

export const useLensStore = create<LensStore>((set) => ({
  activeLens: 'PERSONAL',
  loading: false,

  setLens: (lens) => set({ activeLens: lens }),

  updateLens: async (accessToken, lens) => {
    if (accessToken) setAccessToken(accessToken);
    set({ loading: true });
    try {
      await api.patch('/users/lens', { lens });
      set({ activeLens: lens, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  hydrateFromUser: (user) => {
    if (user?.activeLens && ['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'].includes(user.activeLens)) {
      set({ activeLens: user.activeLens as LensMode });
    }
  },
}));
