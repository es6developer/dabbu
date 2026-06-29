import { useLensStore } from '../store/lensStore';
import type { LensMode } from '../types';

const LENS_BLOCKED_SCREENS: Record<LensMode, string[]> = {
  PERSONAL: [
    'CoupleSpace',
    'FamilyHub',
    'AddPartner',
    'SharedExpenseForm',
    'CoupleFinance',
    'FamilyDashboard',
    'Allowances',
    'FamilyCalendar',
    'CoupleTimeline',
    'CoupleGoals',
    'CoupleSavings',
    'FamilyGoals',
    'FamilyBills',
    'FamilyExpenses',
    'GroupChat',
    'GroupWallets',
    'SplitSettlements',
    'FamilyTasks',
    'FamilyAllowances',
    'CouplePlanner',
    'DateNight',
    'GroupDetail',
    'SharedGroupDetail',
    'CreateSharedGroup',
    'SharedExpenseForm',
    'AddMember',
    'EmergencyFund',
  ],
  PARTNERED: [
    'ApartmentSpaces',
    'RoommateGroups',
    'OfficeGroups',
    'EventGroups',
    'FamilyDashboard',
    'FamilyGoals',
    'FamilyBills',
    'FamilyAllowances',
    'FamilyTasks',
    'FamilyCalendar',
    'Allowances',
    'FamilyExpenses',
    'FamilyHub',
  ],
  FAMILY: [
    'AddPartner',
    'CoupleTimeline',
    'DateNight',
    'CoupleSpace',
    'RoommateGroups',
    'TripGroups',
    'EventGroups',
    'CouplePlanner',
    'CoupleGoals',
    'CoupleSavings',
    'CoupleFinance',
  ],
  FULL: [],
};

const LENS_REDIRECT_MAP: Record<string, string> = {
  CoupleSpace: 'HomeTab',
  AddPartner: 'SettingsMain',
  SharedExpenseForm: 'AddExpense',
  CoupleFinance: 'WalletHome',
  FamilyDashboard: 'HomeTab',
  Allowances: 'HomeTab',
  FamilyCalendar: 'LifeHubHome',
  CoupleTimeline: 'HomeTab',
  DateNight: 'HomeTab',
  CoupleGoals: 'HomeTab',
  CoupleSavings: 'HomeTab',
  CoupleBudgets: 'HomeTab',
  SpacesTab: 'HomeTab',
  RoommateGroups: 'HomeTab',
  TripGroups: 'HomeTab',
  EventGroups: 'HomeTab',
  FamilyTasks: 'HomeTab',
  FamilyAllowances: 'HomeTab',
  GroupChat: 'HomeTab',
  GroupWallets: 'HomeTab',
  SplitSettlements: 'HomeTab',
  Settlements: 'HomeTab',
  EmergencyFund: 'HomeTab',
  FamilyHub: 'HomeTab',
  GroupDetail: 'HomeTab',
  SharedGroupDetail: 'HomeTab',
  CreateSharedGroup: 'HomeTab',
  AddMember: 'HomeTab',
  HousePlanner: 'HomeTab',
  BabyPlanner: 'HomeTab',
  RetirementPlanner: 'HomeTab',
  InvestmentPlanner: 'HomeTab',
  CarPlanner: 'HomeTab',
  EducationPlanner: 'HomeTab',
  VacationPlanner: 'HomeTab',
  WeddingPlanner: 'HomeTab',
  CouplePlanner: 'HomeTab',
  FamilyExpenses: 'HomeTab',
};

const LENS_TAB_VISIBILITY: Record<LensMode, string[]> = {
  PERSONAL: ['HomeTab', 'WalletTab', 'SpacesTab', 'LifeHubTab'],
  PARTNERED: ['HomeTab', 'PartnerTab', 'WalletTab', 'LifeHubTab'],
  FAMILY: ['HomeTab', 'FamilyMembersTab', 'SpacesTab', 'LifeHubTab'],
  FULL: ['HomeTab', 'WalletTab', 'SpacesTab', 'LifeHubTab'],
};

const LENS_TAB_ORDER: Record<LensMode, Record<string, number>> = {
  PERSONAL: { HomeTab: 0, WalletTab: 1, SpacesTab: 2, LifeHubTab: 3 },
  PARTNERED: { HomeTab: 0, PartnerTab: 1, WalletTab: 2, LifeHubTab: 3 },
  FAMILY: { HomeTab: 0, FamilyMembersTab: 1, SpacesTab: 2, LifeHubTab: 3 },
  FULL: { HomeTab: 0, WalletTab: 1, SpacesTab: 2, LifeHubTab: 3 },
};

const LENS_TAB_LABELS: Record<LensMode, Record<string, string>> = {
  PERSONAL: {
    HomeTab: 'Home',
    WalletTab: 'Wallet',
    SpacesTab: 'Spaces',
    LifeHubTab: 'Reports',
  },
  PARTNERED: {
    HomeTab: 'Home',
    PartnerTab: 'Partner',
    WalletTab: 'Wallet',
    LifeHubTab: 'Reports',
  },
  FAMILY: {
    HomeTab: 'Home',
    FamilyMembersTab: 'Family',
    SpacesTab: 'Spaces',
    LifeHubTab: 'Reports',
  },
  FULL: {
    HomeTab: 'Home',
    WalletTab: 'Wallet',
    SpacesTab: 'Spaces',
    LifeHubTab: 'Reports',
  },
};

const LENS_TAB_ICONS: Record<LensMode, Record<string, string>> = {
  PERSONAL: {
    HomeTab: 'home',
    WalletTab: 'wallet',
    SpacesTab: 'team',
    LifeHubTab: 'barschart',
  },
  PARTNERED: {
    HomeTab: 'home',
    PartnerTab: 'addusergroup',
    WalletTab: 'wallet',
    LifeHubTab: 'barschart',
  },
  FAMILY: {
    HomeTab: 'home',
    FamilyMembersTab: 'addusergroup',
    SpacesTab: 'team',
    LifeHubTab: 'barschart',
  },
  FULL: {
    HomeTab: 'home',
    WalletTab: 'wallet',
    SpacesTab: 'team',
    LifeHubTab: 'barschart',
  },
};

const LENS_TAB_HOME_SCREENS: Record<LensMode, Record<string, string>> = {
  PERSONAL: {
    HomeTab: 'LifeDashboard',
    WalletTab: 'WalletHome',
    SpacesTab: 'SpacesDashboard',
    LifeHubTab: 'PersonalReports',
  },
  PARTNERED: {
    HomeTab: 'LifeDashboard',
    PartnerTab: 'PartnerHome',
    WalletTab: 'WalletHome',
    LifeHubTab: 'PartneredReports',
  },
  FAMILY: {
    HomeTab: 'LifeDashboard',
    FamilyMembersTab: 'FamilyMembersHome',
    SpacesTab: 'SpacesDashboard',
    LifeHubTab: 'FamilyReports',
  },
  FULL: {
    HomeTab: 'LifeDashboard',
    WalletTab: 'WalletHome',
    SpacesTab: 'SpacesDashboard',
    LifeHubTab: 'FullReports',
  },
};

const LENS_QUICK_ACTION_FILTER: Record<LensMode, string[]> = {
  PERSONAL: ['add_expense', 'add_income', 'add_goal', 'create_budget', 'pay_bill', 'export_report'],
  PARTNERED: [
    'add_shared_expense',
    'add_shared_income',
    'add_income',
    'add_expense',
    'contribute_goal',
    'add_goal',
    'create_budget',
    'settle_balance',
    'add_timeline_event',
    'plan_expense',
    'export_report',
  ],
  FAMILY: [
    'add_family_expense',
    'add_income',
    'add_bill',
    'add_goal',
    'record_allowance',
    'create_reminder',
    'create_budget',
  ],
  FULL: [
    'add_expense',
    'create_space',
    'add_goal',
    'export_report',
    'add_investment',
    'add_family_member',
    'add_income',
  ],
};

function getLensForTab(tabName: string): LensMode | null {
  for (const [lens, tabs] of Object.entries(LENS_TAB_VISIBILITY)) {
    if (tabs.includes(tabName)) {
      return lens as LensMode;
    }
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
