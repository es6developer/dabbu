import { create } from 'zustand';
import { api, setAccessToken } from '../services/api';

type LensMode = 'PERSONAL' | 'PARTNERED' | 'FAMILY' | 'FULL';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  activeLens: LensMode;
  userType: string;
  currency: string;
}

interface UserStore {
  profile: UserProfile | null;
  loading: boolean;
  fetchProfile: (accessToken: string | null) => Promise<void>;
  updateLens: (accessToken: string | null, lens: LensMode) => Promise<void>;
  setProfile: (profile: UserProfile) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  loading: false,

  fetchProfile: async (accessToken) => {
    if (accessToken) setAccessToken(accessToken);
    set({ loading: true });
    try {
      const res = await api.get<any>('/users/profile');
      set({ profile: res?.data ?? res, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateLens: async (accessToken, lens) => {
    if (accessToken) setAccessToken(accessToken);
    try {
      const res = await api.patch<any>('/users/lens', { lens });
      const updated = res?.data ?? res;
      if (updated?.activeLens) {
        set({ profile: updated });
      } else {
        set((s) => s.profile ? { profile: { ...s.profile, activeLens: lens } } : {});
      }
    } catch {
      // silently fail
    }
  },

  setProfile: (profile) => set({ profile }),
}));
