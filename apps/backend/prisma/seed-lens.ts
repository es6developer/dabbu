import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lenses = [
    {
      type: 'PERSONAL',
      name: 'Personal',
      description: 'Your personal finances',
      icon: 'user',
      sortOrder: 0,
      features: [
        { featureKey: 'spaces', enabled: false },
        { featureKey: 'coupleInsights', enabled: false },
        { featureKey: 'familyInsights', enabled: false },
        { featureKey: 'partnerManagement', enabled: false },
        { featureKey: 'sharedExpenses', enabled: false },
        { featureKey: 'familyCalendar', enabled: false },
        { featureKey: 'allowances', enabled: false },
        { featureKey: 'settlement', enabled: false },
        { featureKey: 'crossLensAnalytics', enabled: false },
        { featureKey: 'goalCollaboration', enabled: false },
        { featureKey: 'budgets', enabled: true },
        { featureKey: 'bills', enabled: true },
        { featureKey: 'goals', enabled: true },
        { featureKey: 'investments', enabled: true },
        { featureKey: 'reports', enabled: true },
        { featureKey: 'aiInsights', enabled: true },
      ],
      navigationRules: [
        { tabKey: 'dashboard', isVisible: true, isPriority: true, sortOrder: 0, icon: 'home', label: 'Home' },
        { tabKey: 'wallet', isVisible: true, isPriority: false, sortOrder: 1, icon: 'wallet', label: 'Wallet' },
        { tabKey: 'spaces', isVisible: false, sortOrder: 2, icon: 'team', label: 'Spaces' },
        { tabKey: 'life_hub', isVisible: true, isPriority: false, sortOrder: 3, icon: 'calendar', label: 'Life Hub' },
        { tabKey: 'partner', isVisible: false, sortOrder: 4, icon: 'heart', label: 'Partner' },
        { tabKey: 'settings', isVisible: true, isPriority: false, sortOrder: 5, icon: 'setting', label: 'Settings' },
      ],
      dashboardConfigs: [
        { widgetKey: 'net_worth', widgetType: 'metric', title: 'Net Worth', size: 'large', sortOrder: 0 },
        { widgetKey: 'cash_flow', widgetType: 'chart', title: 'Cash Flow', size: 'medium', sortOrder: 1 },
        { widgetKey: 'budget_status', widgetType: 'chart', title: 'Budget Status', size: 'medium', sortOrder: 2 },
        { widgetKey: 'goals', widgetType: 'list', title: 'Goals', size: 'medium', sortOrder: 3 },
        { widgetKey: 'upcoming_bills', widgetType: 'list', title: 'Upcoming Bills', size: 'small', sortOrder: 4 },
        { widgetKey: 'recent_transactions', widgetType: 'list', title: 'Recent Transactions', size: 'medium', sortOrder: 5 },
      ],
      quickActions: [
        { actionKey: 'add_expense', label: 'Add Expense', icon: 'pluscircle', color: '#7C3AED', sortOrder: 0, screen: 'AddExpense' },
        { actionKey: 'add_income', label: 'Add Income', icon: 'caretup', color: '#22C55E', sortOrder: 1, screen: 'AddIncome' },
        { actionKey: 'create_goal', label: 'Create Goal', icon: 'flag', color: '#F59E0B', sortOrder: 2, screen: 'CreateGoal' },
        { actionKey: 'create_budget', label: 'Create Budget', icon: 'wallet', color: '#3B82F6', sortOrder: 3, screen: 'CreateBudget' },
      ],
    },
    {
      type: 'PARTNERED',
      name: 'Partnered',
      description: 'Shared finances with your partner',
      icon: 'heart',
      sortOrder: 1,
      features: [
        { featureKey: 'spaces', enabled: true, config: { allowedTypes: ['COUPLE', 'HOME', 'TRIP', 'WEDDING'] } },
        { featureKey: 'coupleInsights', enabled: true, config: { depth: 'full' } },
        { featureKey: 'familyInsights', enabled: false },
        { featureKey: 'partnerManagement', enabled: true },
        { featureKey: 'sharedExpenses', enabled: true, config: { scope: 'partner' } },
        { featureKey: 'familyCalendar', enabled: false },
        { featureKey: 'allowances', enabled: false },
        { featureKey: 'settlement', enabled: true },
        { featureKey: 'crossLensAnalytics', enabled: false },
        { featureKey: 'goalCollaboration', enabled: true, config: { maxMembers: 2 } },
        { featureKey: 'budgets', enabled: true },
        { featureKey: 'bills', enabled: true },
        { featureKey: 'goals', enabled: true },
        { featureKey: 'investments', enabled: true },
        { featureKey: 'reports', enabled: true },
        { featureKey: 'aiInsights', enabled: true },
      ],
      navigationRules: [
        { tabKey: 'dashboard', isVisible: true, isPriority: true, sortOrder: 0, icon: 'home', label: 'Home' },
        { tabKey: 'spaces', isVisible: true, isPriority: true, sortOrder: 1, icon: 'team', label: 'Spaces' },
        { tabKey: 'wallet', isVisible: true, isPriority: false, sortOrder: 2, icon: 'wallet', label: 'Wallet' },
        { tabKey: 'life_hub', isVisible: true, isPriority: false, sortOrder: 3, icon: 'calendar', label: 'Life Hub' },
        { tabKey: 'partner', isVisible: false, sortOrder: 4, icon: 'heart', label: 'Partner' },
        { tabKey: 'settings', isVisible: true, isPriority: false, sortOrder: 5, icon: 'setting', label: 'Settings' },
      ],
      dashboardConfigs: [
        { widgetKey: 'combined_balance', widgetType: 'metric', title: 'Combined Balance', size: 'large', sortOrder: 0 },
        { widgetKey: 'joint_savings', widgetType: 'progress', title: 'Joint Savings', size: 'medium', sortOrder: 1 },
        { widgetKey: 'shared_budget', widgetType: 'chart', title: 'Shared Budget', size: 'medium', sortOrder: 2 },
        { widgetKey: 'spending_comparison', widgetType: 'chart', title: 'Spending Comparison', size: 'medium', sortOrder: 3 },
        { widgetKey: 'upcoming_shared_bills', widgetType: 'list', title: 'Upcoming Shared Bills', size: 'small', sortOrder: 4 },
        { widgetKey: 'couple_goals', widgetType: 'list', title: 'Couple Goals', size: 'medium', sortOrder: 5 },
        { widgetKey: 'couple_timeline', widgetType: 'timeline', title: 'Couple Timeline', size: 'medium', sortOrder: 6 },
      ],
      quickActions: [
        { actionKey: 'add_shared_expense', label: 'Shared Expense', icon: 'pluscircle', color: '#dd2d4a', sortOrder: 0, screen: 'AddSharedExpense' },
        { actionKey: 'add_personal_expense', label: 'Personal Expense', icon: 'minuscircle', color: '#f26a8d', sortOrder: 1, screen: 'AddExpense' },
        { actionKey: 'create_couple_goal', label: 'Couple Goal', icon: 'flag', color: '#F59E0B', sortOrder: 2, screen: 'CreateCoupleGoal' },
        { actionKey: 'settle_balance', label: 'Settle Balance', icon: 'swap', color: '#22C55E', sortOrder: 3, screen: 'SettleBalance' },
      ],
    },
    {
      type: 'FAMILY',
      name: 'Family',
      description: 'Household and family finances',
      icon: 'team',
      sortOrder: 2,
      features: [
        { featureKey: 'spaces', enabled: true, config: { allowedTypes: ['FAMILY', 'HOME', 'CAR', 'EDUCATION', 'VACATION'] } },
        { featureKey: 'coupleInsights', enabled: false },
        { featureKey: 'familyInsights', enabled: true, config: { depth: 'full' } },
        { featureKey: 'partnerManagement', enabled: false },
        { featureKey: 'sharedExpenses', enabled: true, config: { scope: 'household' } },
        { featureKey: 'familyCalendar', enabled: true },
        { featureKey: 'allowances', enabled: true },
        { featureKey: 'settlement', enabled: false },
        { featureKey: 'crossLensAnalytics', enabled: false },
        { featureKey: 'goalCollaboration', enabled: true, config: { maxMembers: 10 } },
        { featureKey: 'budgets', enabled: true },
        { featureKey: 'bills', enabled: true },
        { featureKey: 'goals', enabled: true },
        { featureKey: 'investments', enabled: true },
        { featureKey: 'reports', enabled: true },
        { featureKey: 'aiInsights', enabled: true },
      ],
      navigationRules: [
        { tabKey: 'dashboard', isVisible: true, isPriority: true, sortOrder: 0, icon: 'home', label: 'Home' },
        { tabKey: 'spaces', isVisible: true, isPriority: true, sortOrder: 1, icon: 'team', label: 'Spaces' },
        { tabKey: 'wallet', isVisible: true, isPriority: false, sortOrder: 2, icon: 'wallet', label: 'Wallet' },
        { tabKey: 'life_hub', isVisible: true, isPriority: false, sortOrder: 3, icon: 'calendar', label: 'Life Hub' },
        { tabKey: 'partner', isVisible: false, sortOrder: 4, icon: 'heart', label: 'Partner' },
        { tabKey: 'settings', isVisible: true, isPriority: false, sortOrder: 5, icon: 'setting', label: 'Settings' },
      ],
      dashboardConfigs: [
        { widgetKey: 'household_budget', widgetType: 'metric', title: 'Household Budget', size: 'large', sortOrder: 0 },
        { widgetKey: 'family_expenses', widgetType: 'chart', title: 'Family Expenses', size: 'medium', sortOrder: 1 },
        { widgetKey: 'monthly_bills', widgetType: 'list', title: 'Monthly Bills', size: 'medium', sortOrder: 2 },
        { widgetKey: 'family_goals', widgetType: 'list', title: 'Family Goals', size: 'medium', sortOrder: 3 },
        { widgetKey: 'emergency_fund', widgetType: 'progress', title: 'Emergency Fund', size: 'medium', sortOrder: 4 },
        { widgetKey: 'upcoming_payments', widgetType: 'list', title: 'Upcoming Payments', size: 'small', sortOrder: 5 },
        { widgetKey: 'family_calendar', widgetType: 'calendar', title: 'Family Calendar', size: 'medium', sortOrder: 6 },
      ],
      quickActions: [
        { actionKey: 'add_family_expense', label: 'Family Expense', icon: 'pluscircle', color: '#0f6b6f', sortOrder: 0, screen: 'AddFamilyExpense' },
        { actionKey: 'add_bill', label: 'Add Bill', icon: 'filetext', color: '#F59E0B', sortOrder: 1, screen: 'AddBill' },
        { actionKey: 'add_family_goal', label: 'Family Goal', icon: 'flag', color: '#3d7ea6', sortOrder: 2, screen: 'CreateFamilyGoal' },
        { actionKey: 'allowance', label: 'Allowance', icon: 'gift', color: '#3d7ea6', sortOrder: 3, screen: 'Allowances' },
      ],
    },
    {
      type: 'FULL',
      name: 'Full Access',
      description: 'Everything at a glance',
      icon: 'appstore',
      sortOrder: 3,
      features: [
        { featureKey: 'spaces', enabled: true, config: { allowedTypes: ['ALL'] } },
        { featureKey: 'coupleInsights', enabled: true, config: { depth: 'full' } },
        { featureKey: 'familyInsights', enabled: true, config: { depth: 'full' } },
        { featureKey: 'partnerManagement', enabled: true },
        { featureKey: 'sharedExpenses', enabled: true, config: { scope: 'all' } },
        { featureKey: 'familyCalendar', enabled: true },
        { featureKey: 'allowances', enabled: true },
        { featureKey: 'settlement', enabled: true },
        { featureKey: 'crossLensAnalytics', enabled: true },
        { featureKey: 'goalCollaboration', enabled: true, config: { maxMembers: 50 } },
        { featureKey: 'budgets', enabled: true },
        { featureKey: 'bills', enabled: true },
        { featureKey: 'goals', enabled: true },
        { featureKey: 'investments', enabled: true },
        { featureKey: 'reports', enabled: true },
        { featureKey: 'aiInsights', enabled: true },
      ],
      navigationRules: [
        { tabKey: 'dashboard', isVisible: true, isPriority: true, sortOrder: 0, icon: 'home', label: 'Home' },
        { tabKey: 'wallet', isVisible: true, isPriority: false, sortOrder: 1, icon: 'wallet', label: 'Wallet' },
        { tabKey: 'spaces', isVisible: true, isPriority: false, sortOrder: 2, icon: 'team', label: 'Spaces' },
        { tabKey: 'life_hub', isVisible: true, isPriority: false, sortOrder: 3, icon: 'calendar', label: 'Life Hub' },
        { tabKey: 'partner', isVisible: false, sortOrder: 4, icon: 'heart', label: 'Partner' },
        { tabKey: 'settings', isVisible: true, isPriority: false, sortOrder: 5, icon: 'setting', label: 'Settings' },
      ],
      dashboardConfigs: [
        { widgetKey: 'multi_lens_summary', widgetType: 'carousel', title: 'Multi-Lens Summary', size: 'large', sortOrder: 0 },
        { widgetKey: 'aggregate_net_worth', widgetType: 'metric', title: 'Aggregate Net Worth', size: 'large', sortOrder: 1 },
        { widgetKey: 'all_goals', widgetType: 'list', title: 'All Goals', size: 'medium', sortOrder: 2 },
        { widgetKey: 'all_budgets', widgetType: 'chart', title: 'All Budgets', size: 'medium', sortOrder: 3 },
        { widgetKey: 'all_upcoming', widgetType: 'list', title: 'All Upcoming', size: 'medium', sortOrder: 4 },
        { widgetKey: 'advanced_analytics', widgetType: 'chart', title: 'Advanced Analytics', size: 'large', sortOrder: 5 },
      ],
      quickActions: [
        { actionKey: 'add_any_expense', label: 'Add Expense', icon: 'pluscircle', color: '#0077b6', sortOrder: 0, screen: 'AddExpense' },
        { actionKey: 'switch_lens', label: 'Switch Lens', icon: 'swap', color: '#00b4d8', sortOrder: 1 },
        { actionKey: 'cross_lens_report', label: 'Cross-Lens Report', icon: 'barschart', color: '#22C55E', sortOrder: 2, screen: 'Reports' },
      ],
    },
  ];

  for (const lensData of lenses) {
    const { features, navigationRules, dashboardConfigs, quickActions, ...lensCore } = lensData;

    const lens = await prisma.lens.upsert({
      where: { type: lensCore.type as any },
      update: { name: lensCore.name, description: lensCore.description, icon: lensCore.icon, sortOrder: lensCore.sortOrder },
      create: lensCore as any,
    });

    for (const flag of features) {
      await prisma.lensFeatureFlag.upsert({
        where: { lensId_featureKey: { lensId: lens.id, featureKey: flag.featureKey } },
        update: { enabled: flag.enabled, config: flag.config || undefined },
        create: { lensId: lens.id, ...flag },
      });
    }

    for (const nav of navigationRules) {
      await prisma.lensNavigationRule.upsert({
        where: { lensId_tabKey: { lensId: lens.id, tabKey: nav.tabKey } },
        update: nav,
        create: { lensId: lens.id, ...nav },
      });
    }

    for (const dc of dashboardConfigs) {
      await prisma.lensDashboardConfig.upsert({
        where: { lensId_widgetKey: { lensId: lens.id, widgetKey: dc.widgetKey } },
        update: dc,
        create: { lensId: lens.id, ...dc },
      });
    }

    for (const qa of quickActions) {
      await prisma.lensQuickAction.upsert({
        where: { lensId_actionKey: { lensId: lens.id, actionKey: qa.actionKey } },
        update: qa,
        create: { lensId: lens.id, ...qa },
      });
    }
  }

  console.log('Lens configuration seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
