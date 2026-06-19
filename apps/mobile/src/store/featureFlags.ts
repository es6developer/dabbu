import { create } from 'zustand';
import { api } from '../services/api';

export type FeatureFlag = 'couple_mode' | 'family_mode' | 'life_hub' | 'ai_insights' | 'advanced_investments' | 'auto_budgeting';

interface FeatureFlagsStore {
  flags: Record<FeatureFlag, boolean>;
  loading: boolean;
  fetchFlags: () => Promise<void>;
  isEnabled: (flag: FeatureFlag) => boolean;
}

const DEFAULTS: Record<FeatureFlag, boolean> = {
  couple_mode: true,
  family_mode: true,
  life_hub: true,
  ai_insights: true,
  advanced_investments: false,
  auto_budgeting: false,
};

export const useFeatureFlags = create<FeatureFlagsStore>((set, get) => ({
  flags: { ...DEFAULTS },
  loading: false,
  fetchFlags: async () => {
    set({ loading: true });
    try {
      const res = await api.get<any>('/features');
      const raw = res?.data ?? res ?? {};
      const merged = { ...DEFAULTS };
      for (const key of Object.keys(DEFAULTS) as FeatureFlag[]) {
        if (typeof raw[key] === 'boolean') {
          merged[key] = raw[key];
        }
      }
      set({ flags: merged, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  isEnabled: (flag) => get().flags[flag],
}));
