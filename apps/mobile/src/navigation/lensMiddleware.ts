import { useLensStore } from '../store/lensStore';
import type { LensMode } from '../types';

const LENS_BLOCKED_SCREENS: Record<LensMode, string[]> = {
  PERSONAL: [
    'CoupleSpace', 'FamilyHub', 'AddPartner', 'SharedExpenseForm',
    'CoupleFinance', 'FamilyDashboard', 'Allowances', 'FamilyCalendar',
    'CoupleTimeline', 'CoupleGoals', 'CoupleSavings', 'CoupleBudgets',
    'SpacesDashboard', 'CreateSpace', 'SpaceDetail', 'SpacesTab',
    'FamilyGoals', 'FamilyBills', 'FamilyExpenses',
    'GroupChat', 'GroupWallets', 'SplitSettlements',
    'FamilyTasks', 'FamilyAllowances', 'Settlements',
    'CouplePlanner', 'DateNight', 'GroupDetail', 'SharedGroupDetail',
    'CreateSharedGroup', 'SharedExpenseForm', 'AddMember',
    'EmergencyFund',
  ],
  PARTNERED: [
    'ApartmentSpaces', 'RoommateGroups', 'OfficeGroups', 'EventGroups',
    'FamilyDashboard', 'FamilyGoals', 'FamilyBills', 'FamilyAllowances',
    'FamilyTasks', 'FamilyCalendar', 'Allowances',
    'CouplePlanner', 'DateNight',
    'SpacesDashboard', 'CreateSpace', 'SpaceDetail',
    'GroupChat', 'GroupWallets', 'SplitSettlements',
    'FamilyExpenses', 'FamilyHub',
    'HousePlanner', 'BabyPlanner', 'RetirementPlanner',
    'InvestmentPlanner', 'CarPlanner', 'EducationPlanner',
    'VacationPlanner', 'WeddingPlanner',
  ],
  FAMILY: [
    'AddPartner', 'CoupleTimeline', 'DateNight', 'CoupleSpace',
    'RoommateGroups', 'TripGroups', 'EventGroups', 'CouplePlanner',
    'CoupleGoals', 'CoupleSavings', 'CoupleBudgets',
    'Settlements', 'SpacesDashboard',
    'CoupleFinance', 'SharedExpenseForm',
    'AddMember', 'CreateSharedGroup',
    'GroupChat', 'GroupWallets',
  ],
  FULL: [],
};

const LENS_REDIRECT_MAP: Record<string, string> = {
  CoupleSpace: 'HomeTab', AddPartner: 'SettingsMain',
  SharedExpenseForm: 'AddExpense', CoupleFinance: 'WalletHome',
  FamilyDashboard: 'HomeTab', Allowances: 'HomeTab',
  FamilyCalendar: 'LifeHubHome', CoupleTimeline: 'HomeTab',
  DateNight: 'HomeTab', CoupleGoals: 'HomeTab', CoupleSavings: 'HomeTab',
  CoupleBudgets: 'HomeTab', SpacesDashboard: 'HomeTab',
  CreateSpace: 'HomeTab', SpaceDetail: 'HomeTab', SpacesTab: 'HomeTab',
  RoommateGroups: 'HomeTab', TripGroups: 'HomeTab', EventGroups: 'HomeTab',
  FamilyTasks: 'HomeTab', FamilyAllowances: 'HomeTab',
  GroupChat: 'HomeTab', GroupWallets: 'HomeTab', SplitSettlements: 'HomeTab',
  Settlements: 'HomeTab', EmergencyFund: 'HomeTab', FamilyHub: 'HomeTab',
  GroupDetail: 'HomeTab', SharedGroupDetail: 'HomeTab', CreateSharedGroup: 'HomeTab',
  AddMember: 'HomeTab', HousePlanner: 'HomeTab', BabyPlanner: 'HomeTab',
  RetirementPlanner: 'HomeTab', InvestmentPlanner: 'HomeTab', CarPlanner: 'HomeTab',
  EducationPlanner: 'HomeTab', VacationPlanner: 'HomeTab', WeddingPlanner: 'HomeTab',
  CouplePlanner: 'HomeTab', FamilyExpenses: 'HomeTab',
};

const LENS_TAB_VISIBILITY: Record<LensMode, string[]> = {
  PERSONAL: ['HomeTab', 'WalletTab', 'SpacesTab', 'LifeHubTab', 'ProfileTab'],
  PARTNERED: ['HomeTab', 'SpacesTab', 'WalletTab', 'LifeHubTab', 'ProfileTab'],
  FAMILY: ['HomeTab', 'SpacesTab', 'WalletTab', 'LifeHubTab', 'ProfileTab'],
  FULL: ['HomeTab', 'WalletTab', 'SpacesTab', 'LifeHubTab', 'ProfileTab'],
};

const LENS_TAB_ORDER: Record<LensMode, Record<string, number>> = {
  PERSONAL: { HomeTab: 0, WalletTab: 1, SpacesTab: 2, LifeHubTab: 3, ProfileTab: 4 },
  PARTNERED: { HomeTab: 0, SpacesTab: 1, WalletTab: 2, LifeHubTab: 3, ProfileTab: 4 },
  FAMILY: { HomeTab: 0, SpacesTab: 1, WalletTab: 2, LifeHubTab: 3, ProfileTab: 4 },
  FULL: { HomeTab: 0, WalletTab: 1, SpacesTab: 2, LifeHubTab: 3, ProfileTab: 4 },
};

const LENS_TAB_LABELS: Record<LensMode, Record<string, string>> = {
  PERSONAL: { HomeTab: 'Home', WalletTab: 'Wallet', SpacesTab: 'Reports', LifeHubTab: 'Goals', ProfileTab: 'Settings' },
  PARTNERED: { HomeTab: 'Home', SpacesTab: 'Shared', WalletTab: 'Goals', LifeHubTab: 'Planner', ProfileTab: 'Settings' },
  FAMILY: { HomeTab: 'Home', SpacesTab: 'Family', WalletTab: 'Home', LifeHubTab: 'Reports', ProfileTab: 'Settings' },
  FULL: { HomeTab: 'Home', WalletTab: 'Wallet', SpacesTab: 'Spaces', LifeHubTab: 'Goals', ProfileTab: 'Settings' },
};

const LENS_TAB_ICONS: Record<LensMode, Record<string, string>> = {
  PERSONAL: { HomeTab: 'home', WalletTab: 'wallet', SpacesTab: 'barschart', LifeHubTab: 'flag', ProfileTab: 'setting' },
  PARTNERED: { HomeTab: 'home', SpacesTab: 'team', WalletTab: 'flag', LifeHubTab: 'calendar', ProfileTab: 'setting' },
  FAMILY: { HomeTab: 'home', SpacesTab: 'team', WalletTab: 'home', LifeHubTab: 'barschart', ProfileTab: 'setting' },
  FULL: { HomeTab: 'home', WalletTab: 'wallet', SpacesTab: 'team', LifeHubTab: 'flag', ProfileTab: 'setting' },
};

const LENS_TAB_HOME_SCREENS: Record<LensMode, Record<string, string>> = {
  PERSONAL: { HomeTab: 'LifeDashboard', WalletTab: 'WalletHome', SpacesTab: 'WalletHome', LifeHubTab: 'GoalsList', ProfileTab: 'SettingsMain' },
  PARTNERED: { HomeTab: 'LifeDashboard', SpacesTab: 'SpacesDashboard', WalletTab: 'CoupleGoals', LifeHubTab: 'LifeHubHome', ProfileTab: 'SettingsMain' },
  FAMILY: { HomeTab: 'LifeDashboard', SpacesTab: 'SpacesDashboard', WalletTab: 'WalletHome', LifeHubTab: 'LifeHubHome', ProfileTab: 'SettingsMain' },
  FULL: { HomeTab: 'LifeDashboard', WalletTab: 'WalletHome', SpacesTab: 'SpacesDashboard', LifeHubTab: 'GoalsList', ProfileTab: 'SettingsMain' },
};

const LENS_QUICK_ACTION_FILTER: Record<LensMode, string[]> = {
  PERSONAL: ['add_expense', 'add_income', 'add_goal', 'create_budget', 'pay_bill'],
  PARTNERED: ['add_shared_expense', 'add_shared_income', 'contribute_goal', 'settle_balance', 'plan_expense'],
  FAMILY: ['add_household_expense', 'add_bill', 'add_goal', 'record_allowance', 'create_reminder'],
  FULL: ['add_expense', 'create_space', 'add_goal', 'export_report', 'add_investment'],
};

function getLensForTab(tabName: string): LensMode | null {
  for (const [lens, tabs] of Object.entries(LENS_TAB_VISIBILITY)) {
    if (tabs.includes(tabName)) return lens as LensMode;
  }
  return null;
}

export const lensMiddleware = {
  getVisibleTabs: (lens: LensMode): string[] => {
    return LENS_TAB_VISIBILITY[lens] || LENS_TAB_VISIBILITY.PERSONAL;
  },

  getTabOrder: (lens: LensMode): Record<string, number> => {
    return LENS_TAB_ORDER[lens] || LENS_TAB_ORDER.PERSONAL;
  },

  getTabLabels: (lens: LensMode): Record<string, string> => {
    return LENS_TAB_LABELS[lens] || LENS_TAB_LABELS.PERSONAL;
  },

  getTabIcons: (lens: LensMode): Record<string, string> => {
    return LENS_TAB_ICONS[lens] || LENS_TAB_ICONS.PERSONAL;
  },

  getTabHomeScreen: (lens: LensMode, tabName: string): string => {
    const screens = LENS_TAB_HOME_SCREENS[lens] || LENS_TAB_HOME_SCREENS.PERSONAL;
    return screens[tabName] || 'LifeDashboard';
  },

  getBlockedScreens: (lens: LensMode): string[] => {
    return LENS_BLOCKED_SCREENS[lens] || [];
  },

  getRedirectForBlockedScreen: (screenName: string): string | null => {
    return LENS_REDIRECT_MAP[screenName] || null;
  },

  canNavigateTo: (screenName: string): boolean => {
    const { activeLens } = useLensStore.getState();
    const blocked = LENS_BLOCKED_SCREENS[activeLens] || [];
    return !blocked.includes(screenName);
  },

  canNavigateToScreen: (screenName: string, lens: LensMode): boolean => {
    const blocked = LENS_BLOCKED_SCREENS[lens] || [];
    return !blocked.includes(screenName);
  },

  getAvailableQuickActions: (lens: LensMode): string[] => {
    return LENS_QUICK_ACTION_FILTER[lens] || LENS_QUICK_ACTION_FILTER.PERSONAL;
  },

  getLensForTab,
};
