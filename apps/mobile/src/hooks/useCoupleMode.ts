import { useMemo } from 'react';
import { useAuth } from '../store/AuthContext';

export const COUPLE_COLORS = {
  bg: '#FFE4E8',
  card: '#FFF0F3',
  primary: '#FF6B81',
  accent: '#FF4757',
  heart: '#FF6B9D',
  text: '#4A1942',
  textSecondary: '#8B5F7A',
  textTertiary: '#B8899E',
  border: '#FFD1DC',
};

const COUPLE_SCREENS = new Set([
  'CoupleSpace',
  'CoupleFinance',
  'CoupleIncome',
  'CoupleExpenses',
  'CoupleBudgets',
  'CoupleSavings',
  'CoupleGoals',
  'CoupleBills',
  'CoupleSettlements',
  'CoupleReports',
  'CoupleSettings',
  'SharedExpenseForm',
  'CreateTransaction',
  'AddPartner',
]);

const NON_COUPLE_TABS = new Set(['Expense', 'Spaces']);

export function useCoupleMode() {
  const { user } = useAuth();

  const isInCouple = !!user?.isCouple;
  const isCoupleModeActive = !!(user?.isCouple && user?.isCoupleMode);
  const partner = user?.partner || null;

  const showCoupleFeatures = isInCouple && isCoupleModeActive;

  const coupleTheme = useMemo(
    () => ({
      isCoupleMode: showCoupleFeatures,
      colors: COUPLE_COLORS,
    }),
    [showCoupleFeatures],
  );

  function isScreenAllowed(screenName: string): boolean {
    if (!showCoupleFeatures) {
      return !COUPLE_SCREENS.has(screenName) || screenName === 'AddPartner';
    }
    return true;
  }

  function getFilteredMenus(menus: { name: string; label: string }[]) {
    if (!showCoupleFeatures) {
      return menus;
    }
    return menus.filter((m) => !NON_COUPLE_TABS.has(m.name));
  }

  return {
    isInCouple,
    isCoupleModeActive,
    partner,
    showCoupleFeatures,
    coupleTheme,
    isScreenAllowed,
    getFilteredMenus,
  };
}

export type UseCoupleModeReturn = ReturnType<typeof useCoupleMode>;
