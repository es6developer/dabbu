import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { CoupleOverviewScreen } from '../screens/couple/CoupleOverviewScreen';
import { CoupleSpaceScreen } from '../screens/couple/CoupleSpaceScreen';
import { CoupleHomeScreen } from '../screens/couple/CoupleHomeScreen';
import { CoupleExpensesScreen } from '../screens/couple/CoupleExpensesScreen';
import { CoupleIncomeScreen } from '../screens/couple/CoupleIncomeScreen';
import { CoupleBudgetsScreen } from '../screens/couple/CoupleBudgetsScreen';
import { CoupleBudgetAdjustScreen } from '../screens/couple/CoupleBudgetAdjustScreen';
import { CoupleSavingsScreen } from '../screens/couple/CoupleSavingsScreen';
import { CoupleSettlementsScreen } from '../screens/couple/CoupleSettlementsScreen';
import { CoupleGoalsScreen } from '../screens/couple/CoupleGoalsScreen';
import { CouplePlannerScreen } from '../screens/couple/CouplePlannerScreen';
import { CouplePlannerHubScreen } from '../screens/couple/CouplePlannerHubScreen';
import { CouplePlannerDetailScreen } from '../screens/couple/CouplePlannerDetailScreen';
import { CouplePlannerFormScreen } from '../screens/couple/CouplePlannerFormScreen';
import { CoupleTimelineScreen } from '../screens/couple/CoupleTimelineScreen';
import { CoupleCoachScreen } from '../screens/couple/CoupleCoachScreen';
import { CoupleReportsScreen } from '../screens/couple/CoupleReportsScreen';
import { CoupleBillsScreen } from '../screens/couple/CoupleBillsScreen';
import { CoupleSettingsScreen } from '../screens/couple/CoupleSettingsScreen';
import { CoupleFinance } from '../screens/couple/CoupleFinance';
import { CoupleGamificationScreen } from '../screens/couple/CoupleGamificationScreen';
import { CoupleTransactionFormScreen } from '../screens/couple/CoupleTransactionFormScreen';
import CouplePaywallScreen from '../screens/couple/CouplePaywallScreen';
import { CoupleSplashScreen } from '../screens/couple/CoupleSplashScreen';

const Stack = createNativeStackNavigator();

const COUPLE_SUB_SCREENS = [
  { name: 'Money', component: CoupleFinance, title: 'Money Hub' },
  { name: 'Expenses', component: CoupleExpensesScreen, title: 'Shared Expenses' },
  { name: 'Income', component: CoupleIncomeScreen, title: 'Shared Income' },
  { name: 'Budgets', component: CoupleBudgetsScreen, title: 'Budget' },
  { name: 'BudgetAdjust', component: CoupleBudgetAdjustScreen, title: 'Adjust Budget' },
  { name: 'Savings', component: CoupleSavingsScreen, title: 'Savings' },
  { name: 'Settlements', component: CoupleSettlementsScreen, title: 'Settlements' },
  { name: 'Goals', component: CoupleGoalsScreen, title: 'Goals' },
  { name: 'LifePlans', component: CouplePlannerHubScreen, title: 'Life Planners' },
  { name: 'LifePlanDetail', component: CouplePlannerDetailScreen, title: 'Planner Details' },
  { name: 'LifePlanForm', component: CouplePlannerFormScreen, title: 'New Planner' },
  { name: 'Timeline', component: CoupleTimelineScreen, title: 'Timeline' },
  { name: 'AI', component: CoupleCoachScreen, title: 'AI Coach' },
  { name: 'Reports', component: CoupleReportsScreen, title: 'Reports' },
  { name: 'Bills', component: CoupleBillsScreen, title: 'Bills' },
  { name: 'CoupleSettings', component: CoupleSettingsScreen, title: 'Settings' },
  { name: 'CoupleSpace', component: CoupleSpaceScreen, title: 'Couple Space' },
  { name: 'CoupleHome', component: CoupleHomeScreen, title: 'Couple' },
  { name: 'CouplePlanner', component: CouplePlannerScreen, title: 'Planners' },
  { name: 'CoupleGamification', component: CoupleGamificationScreen, title: 'Achievements' },
  { name: 'CoupleTransactionForm', component: CoupleTransactionFormScreen, title: 'Transaction' },
  { name: 'CouplePaywall', component: CouplePaywallScreen, title: 'Premium' },
];

export function CoupleSpaceNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen
        name="CoupleOverview"
        component={CoupleOverviewScreen}
        options={{ headerShown: false }}
      />
      {COUPLE_SUB_SCREENS.map(({ name, component }) => (
        <Stack.Screen
          key={name}
          name={name}
          component={component}
          options={{ headerShown: false }}
        />
      ))}
    </Stack.Navigator>
  );
}
