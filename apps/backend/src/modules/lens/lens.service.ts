import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { LensType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensCacheService } from './cache/lens-cache.service';
import { LensValidator } from './lens.validator';
import {
  LensState,
  LensAvailability,
  NavigationConfig,
  TabConfig,
  DashboardConfig,
  WidgetConfig,
  QuickActionConfig,
  ThemeConfig,
  FeatureFlagState,
  WidgetData,
} from './interfaces/lens-state.interface';
import { DashboardResponseDto, LensChangeResponseDto, UnifiedDashboardResponseDto } from './dto/lens-response.dto';
import { ChangeLensDto } from './dto/change-lens.dto';
import { LensDashboardService } from '../dashboard/lens-dashboard.service';

const WIDGET_DATA_MAP: Record<string, Record<string, string>> = {
  PERSONAL: {
    monthly_balance: 'savings',
    account_balances: 'accountBalances',
    budget_progress: 'budgets',
    upcoming_bills: 'bills',
    goal_progress: 'goals',
    net_worth: 'netWorth',
  },
  PARTNERED: {
    combined_income: 'incomeCombined',
    combined_expenses: 'expenseCombined',
    shared_balance: 'sharedBalance',
    joint_budget: 'sharedBudget',
    couple_savings_goal: 'sharedGoals',
    upcoming_shared_bills: 'sharedBills',
    spending_comparison: 'spendingComparison',
  },
  FAMILY: {
    household_income: 'familyIncome',
    household_expenses: 'familyExpense',
    utility_bills: 'utilityBills',
    family_budget: 'familyBudget',
    family_savings_goal: 'familyGoals',
    family_net_worth: 'familyNetWorth',
    family_reminders: 'reminders',
  },
  FULL: {
    net_worth: 'personal',
    income_vs_expense: 'analytics',
    budget_health: 'personal',
    goal_progress: 'goals',
    spaces_summary: 'spaces',
    investments: 'investments',
    upcoming_bills: 'bills',
    ai_insights: 'analytics',
  },
};

const LENS_DISPLAY_NAMES: Record<LensType, { name: string; description: string; icon: string }> = {
  PERSONAL: { name: 'Personal', description: 'My Money', icon: 'user' },
  PARTNERED: { name: 'Partnered', description: 'Our Money', icon: 'heart' },
  FAMILY: { name: 'Family', description: 'Household Money', icon: 'team' },
  FULL: { name: 'Full Access', description: 'Everything', icon: 'appstore' },
};

const LENS_FEATURE_FLAGS: Record<LensType, Record<string, FeatureFlagState>> = {
  PERSONAL: {
    spaces: { enabled: false },
    coupleInsights: { enabled: false },
    familyInsights: { enabled: false },
    partnerManagement: { enabled: false },
    sharedExpenses: { enabled: false },
    familyCalendar: { enabled: false },
    allowances: { enabled: false },
    settlement: { enabled: false },
    crossLensAnalytics: { enabled: false },
    goalCollaboration: { enabled: false },
    groupChat: { enabled: false },
    groupWallets: { enabled: false },
    splitSettlements: { enabled: false },
    familyTasks: { enabled: false },
    familyAllowances: { enabled: false },
    budgets: { enabled: true },
    bills: { enabled: true },
    goals: { enabled: true },
    investments: { enabled: true },
    reports: { enabled: true },
    aiInsights: { enabled: true },
  },
  PARTNERED: {
    spaces: { enabled: true, config: { allowedTypes: ['COUPLE'] } },
    apartmentSpaces: { enabled: false },
    roommateGroups: { enabled: false },
    officeGroups: { enabled: false },
    eventGroups: { enabled: false },
    coupleInsights: { enabled: true, config: { depth: 'full' } },
    familyInsights: { enabled: false },
    partnerManagement: { enabled: true },
    sharedExpenses: { enabled: true, config: { scope: 'partner' } },
    familyCalendar: { enabled: false },
    allowances: { enabled: false },
    familyTasks: { enabled: false },
    familyAllowances: { enabled: false },
    settlement: { enabled: true },
    crossLensAnalytics: { enabled: false },
    goalCollaboration: { enabled: true, config: { maxMembers: 2 } },
    budgets: { enabled: true },
    bills: { enabled: true },
    goals: { enabled: true },
    investments: { enabled: false },
    reports: { enabled: false },
    aiInsights: { enabled: true },
  },
  FAMILY: {
    spaces: { enabled: false },
    roommateGroups: { enabled: false },
    tripGroups: { enabled: false },
    eventGroups: { enabled: false },
    coupleInsights: { enabled: false },
    familyInsights: { enabled: true, config: { depth: 'full' } },
    partnerManagement: { enabled: false },
    sharedExpenses: { enabled: true, config: { scope: 'household' } },
    familyCalendar: { enabled: true },
    allowances: { enabled: true },
    settlement: { enabled: false },
    crossLensAnalytics: { enabled: false },
    goalCollaboration: { enabled: true, config: { maxMembers: 10 } },
    couplePlanner: { enabled: false },
    familyTasks: { enabled: true },
    familyAllowances: { enabled: true },
    groupChat: { enabled: false },
    groupWallets: { enabled: false },
    splitSettlements: { enabled: false },
    budgets: { enabled: true },
    bills: { enabled: true },
    goals: { enabled: true },
    investments: { enabled: false },
    reports: { enabled: true },
    aiInsights: { enabled: true },
  },
  FULL: {
    spaces: { enabled: true, config: { allowedTypes: ['ALL'] } },
    coupleInsights: { enabled: true, config: { depth: 'full' } },
    familyInsights: { enabled: true, config: { depth: 'full' } },
    partnerManagement: { enabled: true },
    sharedExpenses: { enabled: true, config: { scope: 'all' } },
    familyCalendar: { enabled: true },
    allowances: { enabled: true },
    settlement: { enabled: true },
    crossLensAnalytics: { enabled: true },
    goalCollaboration: { enabled: true, config: { maxMembers: 50 } },
    investments: { enabled: true },
    budgets: { enabled: true },
    bills: { enabled: true },
    goals: { enabled: true },
    reports: { enabled: true },
    aiInsights: { enabled: true },
  },
};

const LENS_THEMES: Record<LensType, ThemeConfig> = {
  PERSONAL: {
    primaryColor: '#7C3AED',
    palette: 'default',
    gradientStart: '#F0E6FF',
    gradientEnd: '#F5F5F8',
    darkPrimary: '#A78BFA',
    darkGradientStart: '#1A0A2E',
    darkGradientEnd: '#0C0C0E',
    accentColor: '#8B5CF6',
    successColor: '#22C55E',
    warningColor: '#F59E0B',
    errorColor: '#EF4444',
    infoColor: '#7C3AED',
    subtitle: 'My Money',
  },
  PARTNERED: {
    primaryColor: '#dd2d4a',
    palette: 'couple',
    gradientStart: '#f49cbb',
    gradientEnd: '#cbeef3',
    darkPrimary: '#f26a8d',
    darkGradientStart: '#2a0510',
    darkGradientEnd: '#0C0C0E',
    accentColor: '#f26a8d',
    successColor: '#22C55E',
    warningColor: '#F59E0B',
    errorColor: '#EF4444',
    infoColor: '#dd2d4a',
    subtitle: 'Our Money',
  },
  FAMILY: {
    primaryColor: '#0f6b6f',
    palette: 'family',
    gradientStart: '#d5e8ea',
    gradientEnd: '#f0f4f5',
    darkPrimary: '#1a6168',
    darkGradientStart: '#0a1820',
    darkGradientEnd: '#0c1012',
    accentColor: '#3d7ea6',
    successColor: '#22C55E',
    warningColor: '#F59E0B',
    errorColor: '#EF4444',
    infoColor: '#0f6b6f',
    subtitle: 'Household Money',
  },
  FULL: {
    primaryColor: '#0077b6',
    palette: 'full',
    gradientStart: '#ade8f4',
    gradientEnd: '#caf0f8',
    darkPrimary: '#48cae4',
    darkGradientStart: '#03045e',
    darkGradientEnd: '#060818',
    accentColor: '#00b4d8',
    successColor: '#22C55E',
    warningColor: '#F59E0B',
    errorColor: '#EF4444',
    infoColor: '#0077b6',
    subtitle: 'Everything',
  },
};

const LENS_NAVIGATION: Record<LensType, { tabs: TabConfig[]; hiddenTabs: string[]; prioritizedTabs: string[] }> = {
  PERSONAL: {
    tabs: [
      { key: 'dashboard', label: 'Home', icon: 'home', sortOrder: 0, isVisible: true, isPriority: true },
      { key: 'wallet', label: 'Wallet', icon: 'wallet', sortOrder: 1, isVisible: true, isPriority: false },
      { key: 'goals', label: 'Goals', icon: 'flag', sortOrder: 2, isVisible: true, isPriority: false },
      { key: 'reports', label: 'Reports', icon: 'barschart', sortOrder: 3, isVisible: true, isPriority: false },
      { key: 'settings', label: 'Settings', icon: 'setting', sortOrder: 4, isVisible: true, isPriority: false },
    ],
    hiddenTabs: ['spaces', 'partner', 'life_hub', 'shared'],
    prioritizedTabs: ['dashboard'],
  },
  PARTNERED: {
    tabs: [
      { key: 'dashboard', label: 'Home', icon: 'home', sortOrder: 0, isVisible: true, isPriority: true },
      { key: 'shared', label: 'Shared', icon: 'team', sortOrder: 1, isVisible: true, isPriority: true },
      { key: 'goals', label: 'Goals', icon: 'flag', sortOrder: 2, isVisible: true, isPriority: false },
      { key: 'planner', label: 'Planner', icon: 'calendar', sortOrder: 3, isVisible: true, isPriority: false },
      { key: 'settings', label: 'Settings', icon: 'setting', sortOrder: 4, isVisible: true, isPriority: false },
    ],
    hiddenTabs: ['spaces', 'wallet', 'life_hub', 'reports', 'partner'],
    prioritizedTabs: ['dashboard', 'shared'],
  },
  FAMILY: {
    tabs: [
      { key: 'dashboard', label: 'Home', icon: 'home', sortOrder: 0, isVisible: true, isPriority: true },
      { key: 'family', label: 'Family', icon: 'team', sortOrder: 1, isVisible: true, isPriority: true },
      { key: 'goals', label: 'Goals', icon: 'flag', sortOrder: 2, isVisible: true, isPriority: false },
      { key: 'reports', label: 'Reports', icon: 'barschart', sortOrder: 3, isVisible: true, isPriority: false },
      { key: 'settings', label: 'Settings', icon: 'setting', sortOrder: 4, isVisible: true, isPriority: false },
    ],
    hiddenTabs: ['spaces', 'wallet', 'life_hub', 'shared', 'partner', 'planner'],
    prioritizedTabs: ['dashboard', 'family'],
  },
  FULL: {
    tabs: [
      { key: 'dashboard', label: 'Home', icon: 'home', sortOrder: 0, isVisible: true, isPriority: true },
      { key: 'wallet', label: 'Wallet', icon: 'wallet', sortOrder: 1, isVisible: true, isPriority: false },
      { key: 'spaces', label: 'Spaces', icon: 'team', sortOrder: 2, isVisible: true, isPriority: false },
      { key: 'goals', label: 'Goals', icon: 'flag', sortOrder: 3, isVisible: true, isPriority: false },
      { key: 'settings', label: 'Settings', icon: 'setting', sortOrder: 4, isVisible: true, isPriority: false },
    ],
    hiddenTabs: ['life_hub', 'reports', 'shared', 'planner'],
    prioritizedTabs: ['dashboard'],
  },
};

const LENS_DASHBOARDS: Record<LensType, { widgets: WidgetConfig[]; quickActions: QuickActionConfig[]; layout: string }> = {
  PERSONAL: {
    widgets: [
      { key: 'monthly_balance', type: 'metric', title: 'Monthly Balance', size: 'large', sortOrder: 0, isVisible: true, isLocked: true },
      { key: 'account_balances', type: 'list', title: 'Account Balances', size: 'medium', sortOrder: 1, isVisible: true, isLocked: false },
      { key: 'budget_progress', type: 'chart', title: 'Budget Progress', size: 'medium', sortOrder: 2, isVisible: true, isLocked: false },
      { key: 'upcoming_bills', type: 'list', title: 'Upcoming Bills', size: 'small', sortOrder: 3, isVisible: true, isLocked: false },
      { key: 'goal_progress', type: 'progress', title: 'Goal Progress', size: 'medium', sortOrder: 4, isVisible: true, isLocked: false },
      { key: 'net_worth', type: 'metric', title: 'Net Worth', size: 'large', sortOrder: 5, isVisible: true, isLocked: false },
    ],
    quickActions: [
      { key: 'add_expense', label: 'Add Expense', icon: 'minuscircle', color: '#EF4444', sortOrder: 0, screen: 'AddExpense' },
      { key: 'add_income', label: 'Add Income', icon: 'pluscircle', color: '#22C55E', sortOrder: 1, screen: 'AddIncome' },
      { key: 'add_goal', label: 'Add Goal', icon: 'flag', color: '#F59E0B', sortOrder: 2, screen: 'CreateGoal' },
      { key: 'create_budget', label: 'Create Budget', icon: 'wallet', color: '#3B82F6', sortOrder: 3, screen: 'CreateBudget' },
      { key: 'pay_bill', label: 'Pay Bill', icon: 'filetext', color: '#7C3AED', sortOrder: 4, screen: 'BillsList' },
    ],
    layout: 'single_column',
  },
  PARTNERED: {
    widgets: [
      { key: 'combined_income', type: 'metric', title: 'Combined Income', size: 'large', sortOrder: 0, isVisible: true, isLocked: true },
      { key: 'combined_expenses', type: 'metric', title: 'Combined Expenses', size: 'large', sortOrder: 1, isVisible: true, isLocked: true },
      { key: 'shared_balance', type: 'metric', title: 'Shared Balance', size: 'large', sortOrder: 2, isVisible: true, isLocked: true },
      { key: 'joint_budget', type: 'chart', title: 'Joint Budget', size: 'medium', sortOrder: 3, isVisible: true, isLocked: false },
      { key: 'couple_savings_goal', type: 'progress', title: 'Couple Savings Goal', size: 'medium', sortOrder: 4, isVisible: true, isLocked: false },
      { key: 'upcoming_shared_bills', type: 'list', title: 'Upcoming Shared Bills', size: 'small', sortOrder: 5, isVisible: true, isLocked: false },
      { key: 'spending_comparison', type: 'chart', title: 'Spending Comparison', size: 'medium', sortOrder: 6, isVisible: true, isLocked: false },
    ],
    quickActions: [
      { key: 'add_shared_expense', label: 'Shared Expense', icon: 'addusergroup', color: '#dd2d4a', sortOrder: 0, screen: 'AddSharedExpense' },
      { key: 'add_shared_income', label: 'Shared Income', icon: 'pluscircle', color: '#22C55E', sortOrder: 1, screen: 'AddSharedIncome' },
      { key: 'contribute_goal', label: 'Contribute Goal', icon: 'flag', color: '#F59E0B', sortOrder: 2, screen: 'ContributeGoal' },
      { key: 'settle_balance', label: 'Settle Balance', icon: 'swap', color: '#f26a8d', sortOrder: 3, screen: 'SettleBalance' },
      { key: 'plan_expense', label: 'Plan Expense', icon: 'calendar', color: '#f26a8d', sortOrder: 4, screen: 'PlanExpense' },
    ],
    layout: 'single_column',
  },
  FAMILY: {
    widgets: [
      { key: 'household_income', type: 'metric', title: 'Household Income', size: 'large', sortOrder: 0, isVisible: true, isLocked: true },
      { key: 'household_expenses', type: 'metric', title: 'Household Expenses', size: 'large', sortOrder: 1, isVisible: true, isLocked: true },
      { key: 'utility_bills', type: 'list', title: 'Utility Bills', size: 'medium', sortOrder: 2, isVisible: true, isLocked: false },
      { key: 'family_budget', type: 'chart', title: 'Family Budget', size: 'medium', sortOrder: 3, isVisible: true, isLocked: false },
      { key: 'family_savings_goal', type: 'progress', title: 'Family Savings Goal', size: 'medium', sortOrder: 4, isVisible: true, isLocked: false },
      { key: 'family_net_worth', type: 'metric', title: 'Family Net Worth', size: 'large', sortOrder: 5, isVisible: true, isLocked: false },
      { key: 'family_reminders', type: 'list', title: 'Family Reminders', size: 'small', sortOrder: 6, isVisible: true, isLocked: false },
    ],
    quickActions: [
      { key: 'add_household_expense', label: 'Household Expense', icon: 'minuscircle', color: '#0f6b6f', sortOrder: 0, screen: 'AddHouseholdExpense' },
      { key: 'add_bill', label: 'Add Bill', icon: 'filetext', color: '#F59E0B', sortOrder: 1, screen: 'AddBill' },
      { key: 'add_goal', label: 'Add Goal', icon: 'flag', color: '#3d7ea6', sortOrder: 2, screen: 'CreateFamilyGoal' },
      { key: 'record_allowance', label: 'Record Allowance', icon: 'gift', color: '#3d7ea6', sortOrder: 3, screen: 'Allowances' },
      { key: 'create_reminder', label: 'Create Reminder', icon: 'bells', color: '#22C55E', sortOrder: 4, screen: 'CreateReminder' },
    ],
    layout: 'single_column',
  },
  FULL: {
    widgets: [
      { key: 'net_worth', type: 'metric', title: 'Net Worth', size: 'large', sortOrder: 0, isVisible: true, isLocked: true },
      { key: 'income_vs_expense', type: 'chart', title: 'Income vs Expense', size: 'large', sortOrder: 1, isVisible: true, isLocked: false },
      { key: 'budget_health', type: 'chart', title: 'Budget Health', size: 'medium', sortOrder: 2, isVisible: true, isLocked: false },
      { key: 'goal_progress', type: 'progress', title: 'Goal Progress', size: 'medium', sortOrder: 3, isVisible: true, isLocked: false },
      { key: 'spaces_summary', type: 'list', title: 'Spaces Summary', size: 'medium', sortOrder: 4, isVisible: true, isLocked: false },
      { key: 'investments', type: 'list', title: 'Investments', size: 'medium', sortOrder: 5, isVisible: true, isLocked: false },
      { key: 'upcoming_bills', type: 'list', title: 'Upcoming Bills', size: 'small', sortOrder: 6, isVisible: true, isLocked: false },
      { key: 'ai_insights', type: 'insight', title: 'AI Insights', size: 'medium', sortOrder: 7, isVisible: true, isLocked: false },
    ],
    quickActions: [
      { key: 'add_expense', label: 'Add Expense', icon: 'minuscircle', color: '#EF4444', sortOrder: 0, screen: 'AddExpense' },
      { key: 'create_space', label: 'Create Space', icon: 'team', color: '#00b4d8', sortOrder: 1, screen: 'CreateSpace' },
      { key: 'add_goal', label: 'Add Goal', icon: 'flag', color: '#F59E0B', sortOrder: 2, screen: 'CreateGoal' },
      { key: 'export_report', label: 'Export Report', icon: 'barschart', color: '#22C55E', sortOrder: 3, screen: 'ExportReport' },
      { key: 'add_investment', label: 'Add Investment', icon: 'linechart', color: '#0096c7', sortOrder: 4, screen: 'AddInvestment' },
    ],
    layout: 'single_column',
  },
};

@Injectable()
export class LensService {
  private readonly logger = new Logger(LensService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: LensCacheService,
    private readonly validator: LensValidator,
    private readonly lensDashboardService: LensDashboardService,
  ) {}

  async getUserLensType(userId: string): Promise<LensType> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeLens: true },
    });
    return (user?.activeLens as LensType) || 'FULL';
  }

  async getCurrentLens(userId: string): Promise<LensState> {
    const cached = await this.cache.getCurrentLens(userId);
    if (cached) return cached as LensState;

    const userLens = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeLens: true },
    });

    const activeLens = (userLens?.activeLens as LensType) || 'FULL';
    const state = await this.buildLensState(userId, activeLens);

    await this.cache.setCurrentLens(userId, state);
    return state;
  }

  async changeLens(userId: string, dto: ChangeLensDto): Promise<LensChangeResponseDto> {
    const currentLens = await this.getUserLensType(userId);
    await this.validator.validateLensChange(userId, currentLens, dto.lens);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { activeLens: dto.lens },
    });

    const lensRecord = await this.prisma.lens.findUnique({ where: { type: dto.lens } });
    if (lensRecord) {
      await this.prisma.userLens.upsert({
        where: { userId_lensId: { userId, lensId: lensRecord.id } },
        update: {
          lastSwitchedAt: new Date(),
          switchedCount: { increment: 1 },
        },
        create: {
          userId,
          lensId: lensRecord.id,
          lastSwitchedAt: new Date(),
          switchedCount: 1,
        },
      });
    }

    await this.prisma.lensSwitchLog.create({
      data: {
        userId,
        fromLens: currentLens as LensType,
        toLens: dto.lens as LensType,
        reason: dto.reason || 'manual',
        metadata: (dto.metadata || {}) as any,
      },
    });

    await this.cache.invalidateUserCache(userId);

    const config = await this.buildLensConfig(dto.lens as LensType);

    return {
      activeLens: user.activeLens as LensType,
      message: `Switched to ${dto.lens} lens`,
      config,
    };
  }

  async getLensConfig(lensType: LensType): Promise<import('./interfaces/lens-state.interface').LensConfig> {
    const cached = await this.cache.getLensConfig(lensType);
    if (cached) return cached as import('./interfaces/lens-state.interface').LensConfig;

    const config = await this.buildLensConfig(lensType);
    await this.cache.setLensConfig(lensType, config);
    return config;
  }

  async getDashboard(userId: string, lensType: LensType): Promise<DashboardResponseDto> {
    const cached = await this.cache.getDashboard(userId, lensType);
    if (cached) return cached as DashboardResponseDto;

    const config = LENS_DASHBOARDS[lensType] || LENS_DASHBOARDS.PERSONAL;
    const dashboardData = await this.lensDashboardService.getLensDashboard(lensType, userId);
    const dataMap = WIDGET_DATA_MAP[lensType] || {};

    const widgets: WidgetData[] = config.widgets
      .filter((w) => w.isVisible)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((w) => ({
        key: w.key,
        type: w.type,
        title: w.title,
        data: dashboardData && dataMap[w.key] ? dashboardData[dataMap[w.key]] : {},
        size: w.size,
        sortOrder: w.sortOrder,
      }));

    const result: DashboardResponseDto = {
      lens: lensType,
      widgets,
      dashboard: dashboardData,
      quickActions: config.quickActions.sort((a, b) => a.sortOrder - b.sortOrder),
      generatedAt: new Date(),
    };

    await this.cache.setDashboard(userId, lensType, result);
    return result;
  }

  async getFeatures(lensType: LensType): Promise<Record<string, FeatureFlagState>> {
    const cached = await this.cache.getFeatures(lensType);
    if (cached) return cached as Record<string, FeatureFlagState>;

    const hardcoded = LENS_FEATURE_FLAGS[lensType] || LENS_FEATURE_FLAGS.PERSONAL;

    const lensRecord = await this.prisma.lens.findUnique({
      where: { type: lensType },
      select: { id: true },
    });
      if (lensRecord) {
        const dbFlags = await this.prisma.lensFeatureFlag.findMany({
          where: { lensId: lensRecord.id },
          select: { featureKey: true, enabled: true, config: true },
        });
        for (const flag of dbFlags) {
          hardcoded[flag.featureKey] = {
          enabled: flag.enabled,
          config: flag.config as Record<string, unknown> | undefined,
        };
      }
    }

    await this.cache.setFeatures(lensType, hardcoded);
    return hardcoded;
  }

  async getNavigation(lensType: LensType): Promise<{ activeLens: LensType; tabs: TabConfig[]; hiddenTabs: string[] }> {
    const cached = await this.cache.getNavigation(lensType);
    if (cached) return cached as { activeLens: LensType; tabs: TabConfig[]; hiddenTabs: string[] };

    const nav = LENS_NAVIGATION[lensType] || LENS_NAVIGATION.PERSONAL;
    const result = {
      activeLens: lensType,
      tabs: nav.tabs.filter((t) => t.isVisible).sort((a, b) => a.sortOrder - b.sortOrder),
      hiddenTabs: nav.hiddenTabs,
    };

    await this.cache.setNavigation(lensType, result);
    return result;
  }

  async getTheme(lensType: LensType): Promise<{ lens: LensType; theme: ThemeConfig }> {
    const cached = await this.cache.getTheme(lensType);
    if (cached) return cached as { lens: LensType; theme: ThemeConfig };

    const theme = LENS_THEMES[lensType] || LENS_THEMES.PERSONAL;
    const result = { lens: lensType, theme };

    await this.cache.setTheme(lensType, result);
    return result;
  }

  async getWidgetConfigs(lensType: LensType): Promise<{ availableWidgets: WidgetConfig[]; activeWidgets: string[] }> {
    const config = LENS_DASHBOARDS[lensType] || LENS_DASHBOARDS.PERSONAL;
    return {
      availableWidgets: config.widgets,
      activeWidgets: config.widgets.filter((w) => w.isVisible).map((w) => w.key),
    };
  }

  async getUnifiedDashboard(userId: string, lensType: LensType): Promise<UnifiedDashboardResponseDto> {
    const config = this.buildLensConfig(lensType);
    const dashboard = await this.getDashboard(userId, lensType);
    const theme = LENS_THEMES[lensType] || LENS_THEMES.PERSONAL;
    const features = LENS_FEATURE_FLAGS[lensType] || LENS_FEATURE_FLAGS.PERSONAL;
    const nav = LENS_NAVIGATION[lensType] || LENS_NAVIGATION.PERSONAL;

    return {
      lens: lensType,
      navigation: {
        tabs: nav.tabs.filter((t) => t.isVisible).sort((a, b) => a.sortOrder - b.sortOrder),
        hiddenTabs: nav.hiddenTabs,
        prioritizedTabs: nav.prioritizedTabs,
      },
      widgets: dashboard.widgets,
      quickActions: dashboard.quickActions,
      dashboard: dashboard.dashboard,
      theme,
      features,
      generatedAt: new Date(),
    };
  }

  async getRecommendations(userId: string, lensType: LensType): Promise<unknown[]> {
    const baseRecommendations: Record<LensType, unknown[]> = {
      PERSONAL: [
        {
          id: 'pers_rec_001',
          title: 'Set Up Your Emergency Fund',
          description: 'Build a 6-month safety net. Start with a monthly savings goal.',
          actionType: 'create_goal',
          actionPayload: { template: 'emergency_fund', lens: 'PERSONAL' },
          priority: 1,
          dismissible: true,
        },
        {
          id: 'pers_rec_002',
          title: 'Track Your Budget This Month',
          description: 'Stay on top of your spending by setting category budgets.',
          actionType: 'create_budget',
          actionPayload: { lens: 'PERSONAL' },
          priority: 2,
          dismissible: true,
        },
        {
          id: 'pers_rec_003',
          title: 'Pay Upcoming Bills',
          description: 'You have bills due soon. Pay them to avoid late fees.',
          actionType: 'pay_bill',
          actionPayload: { lens: 'PERSONAL' },
          priority: 3,
          dismissible: true,
        },
      ],
      PARTNERED: [
        {
          id: 'cpl_rec_001',
          title: 'Create a Joint Savings Goal',
          description: 'Save together for something special.',
          actionType: 'create_goal',
          actionPayload: { template: 'joint_savings', lens: 'PARTNERED' },
          priority: 1,
          dismissible: true,
        },
        {
          id: 'cpl_rec_002',
          title: 'Set Up Shared Budgets',
          description: 'Track household spending together.',
          actionType: 'enable_feature',
          actionPayload: { feature: 'shared_budgets' },
          priority: 2,
          dismissible: true,
        },
        {
          id: 'cpl_rec_003',
          title: 'Settle Outstanding Balances',
          description: 'You have pending settlements with your partner.',
          actionType: 'settle_balance',
          actionPayload: { lens: 'PARTNERED' },
          priority: 3,
          dismissible: true,
        },
      ],
      FAMILY: [
        {
          id: 'fam_rec_001',
          title: 'Set a Family Emergency Fund Goal',
          description: 'Protect your family with a 6-month emergency fund.',
          actionType: 'create_goal',
          actionPayload: { template: 'family_emergency_fund', lens: 'FAMILY' },
          priority: 1,
          dismissible: true,
        },
        {
          id: 'fam_rec_002',
          title: 'Add School Fee Reminders',
          description: 'Never miss a fee payment with smart reminders.',
          actionType: 'add_bill',
          actionPayload: { lens: 'FAMILY' },
          priority: 2,
          dismissible: true,
        },
        {
          id: 'fam_rec_003',
          title: 'Set Up Allowances',
          description: 'Manage family allowances for your children.',
          actionType: 'setup_allowance',
          actionPayload: { lens: 'FAMILY' },
          priority: 3,
          dismissible: true,
        },
      ],
      FULL: [
        {
          id: 'full_rec_001',
          title: 'Explore Cross-Lens Analytics',
          description: 'Compare spending across personal, couple, and family lenses.',
          actionType: 'view_report',
          actionPayload: { report: 'cross_lens' },
          priority: 1,
          dismissible: true,
        },
        {
          id: 'full_rec_002',
          title: 'Review Your Investments',
          description: 'Check your investment portfolio performance.',
          actionType: 'view_investments',
          actionPayload: { lens: 'FULL' },
          priority: 2,
          dismissible: true,
        },
      ],
    };

    return baseRecommendations[lensType] || [];
  }

  private async buildLensState(userId: string, activeLens: LensType): Promise<LensState> {
    const config = await this.buildLensConfig(activeLens);
    const features = await this.getFeatures(activeLens);

    const userLens = await this.prisma.userLens.findFirst({
      where: { userId, lens: { type: activeLens } },
      orderBy: { lastSwitchedAt: 'desc' },
    });

    const allLensTypes = Object.values(LensType);
    const availableLenses: LensAvailability[] = [];

    for (const lt of allLensTypes) {
      const info = LENS_DISPLAY_NAMES[lt];
      let isAvailable = true;
      let reason: string | undefined;

      if (lt === 'PARTNERED') {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { isCouple: true, partnerId: true },
        });
        isAvailable = !!user?.isCouple && !!user?.partnerId;
        if (!isAvailable) reason = 'Connect with your partner first';
      } else if (lt === 'FAMILY') {
        const membership = await this.prisma.familyMember.findFirst({ where: { userId } });
        isAvailable = !!membership;
        if (!isAvailable) reason = 'Create or join a family first';
      }

      availableLenses.push({
        type: lt,
        name: info.name,
        description: info.description,
        icon: info.icon,
        isActive: lt === activeLens,
        isAvailable,
        reason,
      });
    }

    return {
      activeLens,
      previousLens: null,
      availableLenses,
      config,
      features,
      switchedAt: userLens?.lastSwitchedAt || null,
      switchedCount: userLens?.switchedCount || 0,
    };
  }

  private async buildLensConfig(lensType: LensType): Promise<import('./interfaces/lens-state.interface').LensConfig> {
    const nav = LENS_NAVIGATION[lensType] || LENS_NAVIGATION.PERSONAL;
    const features = LENS_FEATURE_FLAGS[lensType] || LENS_FEATURE_FLAGS.PERSONAL;
    const theme = LENS_THEMES[lensType] || LENS_THEMES.PERSONAL;
    const dashboard = LENS_DASHBOARDS[lensType] || LENS_DASHBOARDS.PERSONAL;

    return {
      navigation: {
        tabs: nav.tabs,
        hiddenTabs: nav.hiddenTabs,
        prioritizedTabs: nav.prioritizedTabs,
      },
      features,
      theme,
      dashboard: {
        widgets: dashboard.widgets,
        quickActions: dashboard.quickActions,
        layout: dashboard.layout,
      },
    };
  }
}
