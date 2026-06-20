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
  defaultIcon: 'wallet',
  defaultHeight: 220,
});
registerWidget({
  type: 'monthlySnapshot',
  component: MonthlySnapshotWidget,
  defaultLabel: 'This Month',
  defaultIcon: 'calendar',
  defaultHeight: 200,
});
registerWidget({
  type: 'healthScore',
  component: HealthScoreWidget,
  defaultLabel: 'Health Score',
  defaultIcon: 'hearto',
  defaultHeight: 200,
});
registerWidget({
  type: 'aiInsight',
  component: AIInsightWidget,
  defaultLabel: 'AI Insight',
  defaultIcon: 'bulb1',
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
  defaultIcon: 'swap',
  defaultHeight: 260,
});
registerWidget({
  type: 'budgetsOverview',
  component: BudgetsOverviewWidget,
  defaultLabel: 'Budgets',
  defaultIcon: 'tago',
  defaultHeight: 200,
});
registerWidget({
  type: 'quickActions',
  component: QuickActionsWidget,
  defaultLabel: 'Quick Actions',
  defaultIcon: 'thunderbolt',
  defaultHeight: 140,
});
registerWidget({
  type: 'coupleHero',
  component: CoupleHeroWidget,
  defaultLabel: 'Couple Hero',
  defaultIcon: 'hearto',
  defaultHeight: 200,
});
registerWidget({
  type: 'combinedWealth',
  component: CombinedWealthWidget,
  defaultLabel: 'Combined Wealth',
  defaultIcon: 'wallet',
  defaultHeight: 240,
});
registerWidget({
  type: 'coupleSnapshot',
  component: CoupleSnapshotWidget,
  defaultLabel: 'Monthly Snapshot',
  defaultIcon: 'calendar',
  defaultHeight: 220,
});
registerWidget({
  type: 'sharedSavings',
  component: SharedSavingsWidget,
  defaultLabel: 'Shared Savings',
  defaultIcon: 'save',
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
  defaultIcon: 'shoppingcart',
  defaultHeight: 200,
});
registerWidget({
  type: 'coupleAI',
  component: CoupleAIWidget,
  defaultLabel: 'Couple AI',
  defaultIcon: 'bulb1',
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
  defaultIcon: 'clockcircleo',
  defaultHeight: 240,
});
registerWidget({
  type: 'familyHero',
  component: FamilyHeroWidget,
  defaultLabel: 'Family Hero',
  defaultIcon: 'team',
  defaultHeight: 200,
});
registerWidget({
  type: 'familyWealth',
  component: FamilyWealthWidget,
  defaultLabel: 'Family Wealth',
  defaultIcon: 'wallet',
  defaultHeight: 240,
});
registerWidget({
  type: 'familySnapshot',
  component: FamilySnapshotWidget,
  defaultLabel: 'Family Snapshot',
  defaultIcon: 'calendar',
  defaultHeight: 220,
});
registerWidget({
  type: 'familyContributions',
  component: FamilyContributionsWidget,
  defaultLabel: 'Contributions',
  defaultIcon: 'rise',
  defaultHeight: 240,
});
registerWidget({
  type: 'familyExpenses',
  component: FamilyExpensesWidget,
  defaultLabel: 'Family Expenses',
  defaultIcon: 'shoppingcart',
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
  defaultIcon: 'bulb1',
  defaultHeight: 180,
});
registerWidget({
  type: 'familyTimeline',
  component: FamilyTimelineWidget,
  defaultLabel: 'Family Timeline',
  defaultIcon: 'clockcircleo',
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
  'greeting',
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
  'coupleHero',
  'quickActions',
  'combinedWealth',
  'coupleSnapshot',
  'sharedSavings',
  'coupleHealth',
  'upcomingBills',
  'coupleAI',
  'coupleGoals',
  'coupleTimeline',
];

export const FAMILY_WIDGETS: WidgetType[] = [
  'familyHero',
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
