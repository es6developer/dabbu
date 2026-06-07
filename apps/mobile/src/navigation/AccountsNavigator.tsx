import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { AddExpenseScreen } from '../screens/transactions/AddExpenseScreen';
import { BillScannerScreen } from '../screens/transactions/BillScannerScreen';
import { CreateTransactionScreen } from '../screens/transactions/CreateTransactionScreen';
import { BillsListScreen } from '../screens/bills/BillsListScreen';
import { BillDetailScreen } from '../screens/bills/BillDetailScreen';
import { MonthlyComparisonScreen } from '../screens/bills/MonthlyComparisonScreen';
import { TransactionDetailScreen } from '../screens/transactions/TransactionDetailScreen';
import { CreateExpenseGroupScreen } from '../screens/transactions/CreateExpenseGroupScreen';
import { GroupExpensesScreen } from '../screens/transactions/GroupExpensesScreen';
import { SubscriptionScreen } from '../screens/subscriptions/SubscriptionScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { ExpenseTabNavigator } from './ExpenseTabNavigator';
import { CategorySelectionScreen } from '../screens/expense/CategorySelectionScreen';
import { AddExpenseScreen as NewAddExpenseScreen } from '../screens/expense/AddExpenseScreen';
import { SharedExpenseFormScreen } from '../screens/shared-finance/SharedExpenseFormScreen';
import { SettlementScreen } from '../screens/shared-finance/SettlementScreen';

export function AccountsNavigator() {
  const Stack = createNativeStackNavigator();
  const { colors, typography } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { ...(typography.calloutBold as any), color: colors.text.primary },
      }}
    >
      <Stack.Screen
        name="ExpenseHome"
        component={ExpenseTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CategorySelection"
        component={CategorySelectionScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: 'Add Expense', headerShown: false }}
      />
      <Stack.Screen
        name="NewAddExpense"
        component={NewAddExpenseScreen}
        options={{ title: 'Add Expense', headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="BillScanner"
        component={BillScannerScreen}
        options={{ title: 'Scan Bill' }}
      />
      <Stack.Screen
        name="CreateTransaction"
        component={CreateTransactionScreen}
        options={({ route }: any) => ({
          title: route.params?.transaction?.id ? 'Edit Transaction' : 'New Transaction',
        })}
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
    </Stack.Navigator>
  );
}
