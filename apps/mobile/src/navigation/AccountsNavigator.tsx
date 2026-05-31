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
import { ExpenseTabNavigator } from './ExpenseTabNavigator';
import { CreateTransactionScreen } from '../screens/transactions/CreateTransactionScreen';
import { TransactionDetailScreen } from '../screens/transactions/TransactionDetailScreen';
import { AddExpenseScreen } from '../screens/transactions/AddExpenseScreen';
import { BillScannerScreen } from '../screens/transactions/BillScannerScreen';
import { BillsListScreen } from '../screens/bills/BillsListScreen';
import { BillDetailScreen } from '../screens/bills/BillDetailScreen';
import { MonthlyComparisonScreen } from '../screens/bills/MonthlyComparisonScreen';
import { CreateGroupScreen } from '../screens/shared-finance/CreateGroupScreen';
import { GroupDetailScreen } from '../screens/shared-finance/GroupDetailScreen';
import { GroupExpensesScreen } from '../screens/transactions/GroupExpensesScreen';
import { CreateExpenseGroupScreen } from '../screens/transactions/CreateExpenseGroupScreen';

const Stack = createNativeStackNavigator();

export function AccountsNavigator() {
  const Stack = createNativeStackNavigator();
  const { colors, typography } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { ...typography.calloutBold },
      }}
    >
      <Stack.Screen
        name="ExpenseHome"
        component={ExpenseTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: 'Add Expense' }}
      />
      <Stack.Screen
        name="BillScanner"
        component={BillScannerScreen}
        options={{ title: 'Scan Bill' }}
      />
      <Stack.Screen
        name="CreateTransaction"
        component={CreateTransactionScreen}
        options={{ title: 'New Transaction' }}
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
        options={{ title: 'Transaction Details' }}
      />
      <Stack.Screen
        name="CreateExpenseGroup"
        component={CreateExpenseGroupScreen}
        options={{ title: 'Create Expense Group' }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ title: 'Create Group' }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ title: 'Group Details' }}
      />
      <Stack.Screen
        name="GroupExpenses"
        component={GroupExpensesScreen}
        options={{ title: 'Group Expenses' }}
      />
    </Stack.Navigator>
  );
}
