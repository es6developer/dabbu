import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { BillScannerScreen } from '../screens/transactions/BillScannerScreen';
import { BillsListScreen } from '../screens/bills/BillsListScreen';
import { BillDetailScreen } from '../screens/bills/BillDetailScreen';
import { MonthlyComparisonScreen } from '../screens/bills/MonthlyComparisonScreen';
import { TransactionDetailScreen } from '../screens/transactions/TransactionDetailScreen';
import { CreateExpenseGroupScreen } from '../screens/transactions/CreateExpenseGroupScreen';
import { GroupExpensesScreen } from '../screens/transactions/GroupExpensesScreen';
import { MyWalletScreen } from '../screens/transactions/MyWalletScreen';
import { SharedCirclesScreen } from '../screens/transactions/SharedCirclesScreen';
import { SubscriptionScreen } from '../screens/subscriptions/SubscriptionScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { MyWalletScreen } from '../screens/transactions/MyWalletScreen';
import { SharedCirclesScreen } from '../screens/transactions/SharedCirclesScreen';

import { AddExpenseScreen } from '../screens/expense/AddExpenseScreen';
import { CreateCategoryScreen } from '../screens/expense/CreateCategoryScreen';
import { SharedExpenseFormScreen } from '../screens/shared-finance/SharedExpenseFormScreen';
import { SettlementScreen } from '../screens/shared-finance/SettlementScreen';
import { AddMemberScreen } from '../screens/social/AddMemberScreen';

export function AccountsNavigator() {
  const Stack = createNativeStackNavigator();
  const theme = useTheme();
  const { colors } = theme;
  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen
        name="ExpenseHome"
        component={MyWalletScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
<<<<<<< Updated upstream
        name="SharedCircles"
        component={SharedCirclesScreen}
        options={{ headerShown: false }}
=======
        name="MyWallet"
        component={MyWalletScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SharedCircles"
        component={SharedCirclesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CategorySelection"
        component={CategorySelectionScreen}
        options={{ headerShown: false, presentation: 'modal' }}
>>>>>>> Stashed changes
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: 'Add Expense', headerShown: false }}
      />
      <Stack.Screen
        name="CreateCategory"
        component={CreateCategoryScreen}
        options={{ title: 'Create Category', headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="BillScanner"
        component={BillScannerScreen}
        options={{ title: 'Scan Bill' }}
      />

      <Stack.Screen name="BillsList" component={BillsListScreen} options={{ title: 'My Bills' }} />
      <Stack.Screen
        name="BillDetail"
        component={BillDetailScreen}
        options={{ title: 'Bill Details' }}
      />
      <Stack.Screen
        name="MonthlyComparison"
        component={MonthlyComparisonScreen}
        options={{ title: 'Month Comparison' }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: 'Transaction Details', headerShown: false }}
      />
      <Stack.Screen
        name="CreateExpenseGroup"
        component={CreateExpenseGroupScreen}
        options={{ title: 'Create Circle', headerShown: false }}
      />
      <Stack.Screen
        name="GroupExpenses"
        component={GroupExpensesScreen}
        options={{ title: 'Group Expenses', headerShown: false }}
      />
      <Stack.Screen
        name="Subscriptions"
        component={SubscriptionScreen}
        options={{ title: 'Subscriptions' }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Reports & Analytics' }}
      />
      <Stack.Screen
        name="SharedExpenseForm"
        component={SharedExpenseFormScreen}
        options={{ title: 'Split Expense', presentation: 'modal' }}
      />
      <Stack.Screen
        name="Settlement"
        component={SettlementScreen}
        options={{ title: 'Settle Up', presentation: 'modal' }}
      />
      <Stack.Screen
        name="AddMember"
        component={AddMemberScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
