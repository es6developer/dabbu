import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export type FinanceMode = 'personal' | 'couple' | 'family' | 'all';
export type LifeGoal = 'HOUSE' | 'BABY' | 'WEDDING' | 'CAR' | 'EDUCATION' | 'VACATION' | 'RETIREMENT' | 'BUSINESS';

export interface SpacePreview {
  type: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

const FINANCE_MODE_SPACES: Record<FinanceMode, { type: string; name: string; emoji: string; color: string; description: string }[]> = {
  personal: [
    { type: 'personal', name: 'Personal', emoji: '👤', color: '#4F46E5', description: 'Your personal finances' },
  ],
  couple: [
    { type: 'personal', name: 'Personal', emoji: '👤', color: '#4F46E5', description: 'Your personal finances' },
    { type: 'couple', name: 'Couple', emoji: '💑', color: '#EC4899', description: 'Shared finances with your partner' },
  ],
  family: [
    { type: 'personal', name: 'Personal', emoji: '👤', color: '#4F46E5', description: 'Your personal finances' },
    { type: 'family', name: 'Family', emoji: '👨‍👩‍👧‍👦', color: '#F59E0B', description: 'Shared family finances' },
  ],
  all: [
    { type: 'personal', name: 'Personal', emoji: '👤', color: '#4F46E5', description: 'Your personal finances' },
    { type: 'couple', name: 'Couple', emoji: '💑', color: '#EC4899', description: 'Shared finances with your partner' },
    { type: 'family', name: 'Family', emoji: '👨‍👩‍👧‍👦', color: '#F59E0B', description: 'Shared family finances' },
  ],
};

const LIFE_GOAL_SPACES: Record<LifeGoal, { type: string; name: string; emoji: string; color: string; description: string }> = {
  HOUSE: { type: 'goal', name: 'Home Fund', emoji: '🏠', color: '#10B981', description: 'Save for your dream home' },
  BABY: { type: 'goal', name: 'Baby Fund', emoji: '👶', color: '#F472B6', description: 'Prepare for your little one' },
  WEDDING: { type: 'goal', name: 'Wedding Fund', emoji: '💒', color: '#EC4899', description: 'Plan your special day' },
  CAR: { type: 'goal', name: 'Car Fund', emoji: '🚗', color: '#3B82F6', description: 'Save for your next vehicle' },
  EDUCATION: { type: 'goal', name: 'Education Fund', emoji: '🎓', color: '#8B5CF6', description: 'Invest in learning' },
  VACATION: { type: 'goal', name: 'Vacation Fund', emoji: '✈️', color: '#06B6D4', description: 'Plan your dream trip' },
  RETIREMENT: { type: 'goal', name: 'Retirement Fund', emoji: '🌴', color: '#F97316', description: 'Build your nest egg' },
  BUSINESS: { type: 'goal', name: 'Business Fund', emoji: '💼', color: '#14B8A6', description: 'Grow your venture' },
};

function generateSpacesPreview(financeMode: FinanceMode | null, lifeGoals: LifeGoal[]): SpacePreview[] {
  const spaces: SpacePreview[] = [];
  if (financeMode) {
    spaces.push(...FINANCE_MODE_SPACES[financeMode]);
  }
  for (const goal of lifeGoals) {
    const goalSpace = LIFE_GOAL_SPACES[goal];
    const exists = spaces.some((s) => s.name === goalSpace.name);
    if (!exists) {
      spaces.push(goalSpace);
    }
  }
  return spaces;
}

interface OnboardingStore {
  step: number;
  financeMode: FinanceMode | null;
  lifeGoals: LifeGoal[];
  spacesPreview: SpacePreview[];
  completed: boolean;
  loading: boolean;

  setFinanceMode: (mode: FinanceMode) => void;
  setLifeGoals: (goals: LifeGoal[]) => void;
  setSpacesPreview: (spaces: SpacePreview[]) => void;
  createSpaces: () => Promise<void>;
  complete: () => Promise<void>;
  skip: () => Promise<void>;
  goNext: () => void;
  goBack: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      step: 0,
      financeMode: null,
      lifeGoals: [],
      spacesPreview: [],
      completed: false,
      loading: false,

      setFinanceMode: (mode) => {
        set({ financeMode: mode });
        const { lifeGoals } = get();
        set({ spacesPreview: generateSpacesPreview(mode, lifeGoals) });
      },

      setLifeGoals: (goals) => {
        set({ lifeGoals: goals });
        const { financeMode } = get();
        set({ spacesPreview: generateSpacesPreview(financeMode, goals) });
      },

      setSpacesPreview: (spaces) => {
        set({ spacesPreview: spaces });
      },

      createSpaces: async () => {
        const { spacesPreview, step } = get();
        set({ loading: true });
        try {
          for (const space of spacesPreview) {
            await api.post('/spaces', {
              name: space.name,
              type: space.type,
              icon: space.emoji,
              coverColor: space.color,
            });
          }
          set({ loading: false, step: Math.max(step, 4) });
        } catch (e: any) {
          set({ loading: false });
          throw e;
        }
      },

      complete: async () => {
        try {
          await api.post('/onboarding/complete');
          await AsyncStorage.setItem('dabbu-onboarding-completed', 'true');
          set({ completed: true });
        } catch (e: any) {
          set({ completed: true });
        }
      },

      skip: async () => {
        try {
          await api.post('/onboarding/skip');
          await AsyncStorage.setItem('dabbu-onboarding-completed', 'true');
          set({ completed: true });
        } catch (e: any) {
          set({ completed: true });
        }
      },

      goNext: () => {
        const { step } = get();
        if (step < 5) set({ step: step + 1 });
      },

      goBack: () => {
        const { step } = get();
        if (step > 0) set({ step: step - 1 });
      },

      reset: () => {
        set({
          step: 0,
          financeMode: null,
          lifeGoals: [],
          spacesPreview: [],
          completed: false,
          loading: false,
        });
      },
    }),
    {
      name: 'dabbu-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        step: state.step,
        financeMode: state.financeMode,
        lifeGoals: state.lifeGoals,
        completed: state.completed,
      }),
    }
  )
);
