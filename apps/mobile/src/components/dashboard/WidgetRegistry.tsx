import React from 'react';
import { GreetingWidget } from './widgets/GreetingWidget';
import { NetWorthWidget } from './widgets/NetWorthWidget';
import { MonthlySnapshotWidget } from './widgets/MonthlySnapshotWidget';
import { HealthScoreWidget } from './widgets/HealthScoreWidget';
import { AIInsightWidget } from './widgets/AIInsightWidget';
import { UpcomingBillsWidget } from './widgets/UpcomingBillsWidget';
import { GoalsWidget } from './widgets/GoalsWidget';
import { RecentTransactionsWidget } from './widgets/RecentTransactionsWidget';
import { BudgetsOverviewWidget } from './widgets/BudgetsOverviewWidget';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { CoupleHeroWidget } from './widgets/CoupleHeroWidget';
import { CombinedWealthWidget } from './widgets/CombinedWealthWidget';
import { CoupleSnapshotWidget } from './widgets/CoupleSnapshotWidget';
import { SharedSavingsWidget } from './widgets/SharedSavingsWidget';
import { CoupleHealthWidget } from './widgets/CoupleHealthWidget';
import { SharedExpensesWidget } from './widgets/SharedExpensesWidget';
import { CoupleAIWidget } from './widgets/CoupleAIWidget';
import { CoupleGoalsWidget } from './widgets/CoupleGoalsWidget';
import { CoupleTimelineWidget } from './widgets/CoupleTimelineWidget';
import { FamilyHeroWidget } from './widgets/FamilyHeroWidget';
import { FamilyWealthWidget } from './widgets/FamilyWealthWidget';
import { FamilySnapshotWidget } from './widgets/FamilySnapshotWidget';
import { FamilyContributionsWidget } from './widgets/FamilyContributionsWidget';
import { FamilyExpensesWidget } from './widgets/FamilyExpensesWidget';
import { FamilyBillsWidget } from './widgets/FamilyBillsWidget';
import { FamilyGoalsWidget } from './widgets/FamilyGoalsWidget';
import { FamilyInsightsWidget } from './widgets/FamilyInsightsWidget';
import { FamilyTimelineWidget } from './widgets/FamilyTimelineWidget';
import { FamilyHealthWidget } from './widgets/FamilyHealthWidget';

export type WidgetType =
  | 'greeting'
  | 'netWorth'
  | 'monthlySnapshot'
  | 'healthScore'
  | 'aiInsight'
  | 'upcomingBills'
  | 'goals'
  | 'recentTransactions'
  | 'budgetsOverview'
  | 'quickActions'
  | 'coupleHero'
  | 'combinedWealth'
  | 'coupleSnapshot'
  | 'sharedSavings'
  | 'coupleHealth'
  | 'sharedExpenses'
  | 'coupleAI'
  | 'coupleGoals'
  | 'coupleTimeline'
  | 'familyHero'
  | 'familyWealth'
  | 'familySnapshot'
  | 'familyContributions'
  | 'familyExpenses'
  | 'familyBills'
  | 'familyGoals'
  | 'familyInsights'
  | 'familyTimeline'
  | 'familyHealth';

export interface WidgetConfig {
  type: WidgetType;
  label: string;
  icon: string;
  enabled: boolean;
  order: number;
  height?: number;
}

export interface WidgetDefinition {
  type: WidgetType;
  component: React.FC<any>;
  defaultLabel: string;
  defaultIcon: string;
  defaultHeight: number;
}

const registry = {} as Record<WidgetType, WidgetDefinition>;

export function registerWidget(def: WidgetDefinition) {
  registry[def.type] = def;
}

export function getWidgetDef(type: WidgetType): WidgetDefinition | undefined {
  return registry[type];
}

export function getAllWidgetDefs(): WidgetDefinition[] {
  return Object.values(registry);
}

registerWidget({
  type: 'greeting',
  component: GreetingWidget,
  defaultLabel: 'Greeting',
  defaultIcon: 'sunny-outline',
  defaultHeight: 180,
});
registerWidget({
  type: 'netWorth',
  component: NetWorthWidget,
  defaultLabel: 'Net Worth',
  defaultIcon: 'wallet-outline',
  defaultHeight: 220,
});
registerWidget({
  type: 'monthlySnapshot',
  component: MonthlySnapshotWidget,
  defaultLabel: 'This Month',
  defaultIcon: 'calendar-outline',
  defaultHeight: 200,
});
registerWidget({
  type: 'healthScore',
  component: HealthScoreWidget,
  defaultLabel: 'Health Score',
  defaultIcon: 'heart-outline',
  defaultHeight: 200,
});
registerWidget({
  type: 'aiInsight',
  component: AIInsightWidget,
  defaultLabel: 'AI Insight',
  defaultIcon: 'bulb-outline',
  defaultHeight: 140,
});
registerWidget({
  type: 'upcomingBills',
  component: UpcomingBillsWidget,
  defaultLabel: 'Upcoming Bills',
  defaultIcon: 'receipt-outline',
  defaultHeight: 200,
});
registerWidget({
  type: 'goals',
  component: GoalsWidget,
  defaultLabel: 'Goals',
  defaultIcon: 'flag-outline',
  defaultHeight: 200,
});
registerWidget({
  type: 'recentTransactions',
  component: RecentTransactionsWidget,
  defaultLabel: 'Recent Transactions',
  defaultIcon: 'swap-horizontal-outline',
  defaultHeight: 260,
});
registerWidget({
  type: 'budgetsOverview',
  component: BudgetsOverviewWidget,
  defaultLabel: 'Budgets',
  defaultIcon: 'pricetag-outline',
  defaultHeight: 200,
});
registerWidget({
  type: 'quickActions',
  component: QuickActionsWidget,
  defaultLabel: 'Quick Actions',
  defaultIcon: 'flash-outline',
  defaultHeight: 140,
});
registerWidget({
  type: 'coupleHero',
  component: CoupleHeroWidget,
  defaultLabel: 'Couple Hero',
  defaultIcon: 'heart-outline',
  defaultHeight: 200,
});
registerWidget({
  type: 'combinedWealth',
  component: CombinedWealthWidget,
  defaultLabel: 'Combined Wealth',
  defaultIcon: 'wallet-outline',
  defaultHeight: 240,
});
registerWidget({
  type: 'coupleSnapshot',
  component: CoupleSnapshotWidget,
  defaultLabel: 'Monthly Snapshot',
  defaultIcon: 'calendar-outline',
  defaultHeight: 220,
});
registerWidget({
  type: 'sharedSavings',
  component: SharedSavingsWidget,
  defaultLabel: 'Shared Savings',
  defaultIcon: 'save-outline',
  defaultHeight: 180,
});
registerWidget({
  type: 'coupleHealth',
  component: CoupleHealthWidget,
  defaultLabel: 'Couple Health',
  defaultIcon: 'heart-circle-outline',
  defaultHeight: 220,
});
registerWidget({
  type: 'sharedExpenses',
  component: SharedExpensesWidget,
  defaultLabel: 'Shared Expenses',
  defaultIcon: 'cart-outline',
  defaultHeight: 200,
});
registerWidget({
  type: 'coupleAI',
  component: CoupleAIWidget,
  defaultLabel: 'Couple AI',
  defaultIcon: 'bulb-outline',
  defaultHeight: 160,
});
registerWidget({
  type: 'coupleGoals',
  component: CoupleGoalsWidget,
  defaultLabel: 'Couple Goals',
  defaultIcon: 'flag-outline',
  defaultHeight: 200,
});
registerWidget({
  type: 'coupleTimeline',
  component: CoupleTimelineWidget,
  defaultLabel: 'Timeline',
  defaultIcon: 'time-outline',
  defaultHeight: 240,
});
registerWidget({
  type: 'familyHero',
  component: FamilyHeroWidget,
  defaultLabel: 'Family Hero',
  defaultIcon: 'people-outline',
  defaultHeight: 200,
});
registerWidget({
  type: 'familyWealth',
  component: FamilyWealthWidget,
  defaultLabel: 'Family Wealth',
  defaultIcon: 'wallet-outline',
  defaultHeight: 240,
});
registerWidget({
  type: 'familySnapshot',
  component: FamilySnapshotWidget,
  defaultLabel: 'Family Snapshot',
  defaultIcon: 'calendar-outline',
  defaultHeight: 220,
});
registerWidget({
  type: 'familyContributions',
  component: FamilyContributionsWidget,
  defaultLabel: 'Contributions',
  defaultIcon: 'trending-up-outline',
  defaultHeight: 240,
});
registerWidget({
  type: 'familyExpenses',
  component: FamilyExpensesWidget,
  defaultLabel: 'Family Expenses',
  defaultIcon: 'cart-outline',
  defaultHeight: 220,
});
registerWidget({
  type: 'familyBills',
  component: FamilyBillsWidget,
  defaultLabel: 'Family Bills',
  defaultIcon: 'receipt-outline',
  defaultHeight: 220,
});
registerWidget({
  type: 'familyGoals',
  component: FamilyGoalsWidget,
  defaultLabel: 'Family Goals',
  defaultIcon: 'flag-outline',
  defaultHeight: 200,
});
registerWidget({
  type: 'familyInsights',
  component: FamilyInsightsWidget,
  defaultLabel: 'Family Insights',
  defaultIcon: 'bulb-outline',
  defaultHeight: 180,
});
registerWidget({
  type: 'familyTimeline',
  component: FamilyTimelineWidget,
  defaultLabel: 'Family Timeline',
  defaultIcon: 'time-outline',
  defaultHeight: 240,
});
registerWidget({
  type: 'familyHealth',
  component: FamilyHealthWidget,
  defaultLabel: 'Family Health',
  defaultIcon: 'heart-circle-outline',
  defaultHeight: 220,
});

export const PERSONAL_WIDGETS: WidgetType[] = [
  'netWorth',
  'monthlySnapshot',
  'healthScore',
  'aiInsight',
  'upcomingBills',
  'goals',
  'recentTransactions',
  'budgetsOverview',
  'quickActions',
];

export const COUPLE_WIDGETS: WidgetType[] = [
  'combinedWealth',
  'coupleSnapshot',
  'sharedSavings',
  'coupleHealth',
  'sharedExpenses',
  'upcomingBills',
  'coupleAI',
  'coupleGoals',
  'coupleTimeline',
  'quickActions',
];

export const FAMILY_WIDGETS: WidgetType[] = [
  'familyWealth',
  'familySnapshot',
  'familyContributions',
  'familyExpenses',
  'familyBills',
  'familyGoals',
  'familyInsights',
  'familyTimeline',
  'familyHealth',
  'quickActions',
];
