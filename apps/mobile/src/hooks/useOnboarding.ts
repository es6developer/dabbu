import { useCallback, useMemo } from 'react';
import { useOnboardingStore, FinanceMode, LifeGoal, SpacePreview } from '../store/onboardingStore';

interface UseOnboardingReturn {
  step: number;
  financeMode: FinanceMode | null;
  lifeGoals: LifeGoal[];
  spacesPreview: SpacePreview[];
  completed: boolean;
  loading: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  setFinanceMode: (mode: FinanceMode) => void;
  setLifeGoals: (goals: LifeGoal[]) => void;
  createSpaces: () => Promise<void>;
  complete: () => Promise<void>;
  skip: () => Promise<void>;
  goNext: () => void;
  goBack: () => void;
  reset: () => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const step = useOnboardingStore((s) => s.step);
  const financeMode = useOnboardingStore((s) => s.financeMode);
  const lifeGoals = useOnboardingStore((s) => s.lifeGoals);
  const spacesPreview = useOnboardingStore((s) => s.spacesPreview);
  const completed = useOnboardingStore((s) => s.completed);
  const loading = useOnboardingStore((s) => s.loading);
  const setFinanceMode = useOnboardingStore((s) => s.setFinanceMode);
  const setLifeGoals = useOnboardingStore((s) => s.setLifeGoals);
  const createSpaces = useOnboardingStore((s) => s.createSpaces);
  const complete = useOnboardingStore((s) => s.complete);
  const skip = useOnboardingStore((s) => s.skip);
  const goNext = useOnboardingStore((s) => s.goNext);
  const goBack = useOnboardingStore((s) => s.goBack);
  const reset = useOnboardingStore((s) => s.reset);

  const isFirstStep = useMemo(() => step === 0, [step]);
  const isLastStep = useMemo(() => step === 5, [step]);

  return {
    step,
    financeMode,
    lifeGoals,
    spacesPreview,
    completed,
    loading,
    isFirstStep,
    isLastStep,
    setFinanceMode,
    setLifeGoals,
    createSpaces,
    complete,
    skip,
    goNext,
    goBack,
    reset,
  };
}
