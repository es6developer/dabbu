import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExpenseTabNavigator } from './ExpenseTabNavigator';
import { CreateTransactionScreen } from '../screens/transactions/CreateTransactionScreen';
import { TransactionDetailScreen } from '../screens/transactions/TransactionDetailScreen';
import { AddExpenseScreen } from '../screens/transactions/AddExpenseScreen';
import { BillScannerScreen } from '../screens/transactions/BillScannerScreen';
import { BillsListScreen } from '../screens/bills/BillsListScreen';
import { BillDetailScreen } from '../screens/bills/BillDetailScreen';
import { MonthlyComparisonScreen } from '../screens/bills/MonthlyComparisonScreen';

const Stack = createNativeStackNavigator();

export function AccountsNavigator() {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: '#0A0A0F' },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '600' },
      contentStyle: { backgroundColor: '#0A0A0F' },
    }}>
      <Stack.Screen name="ExpenseHome" component={ExpenseTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense' }} />
      <Stack.Screen name="BillScanner" component={BillScannerScreen} options={{ title: 'Scan Bill' }} />
      <Stack.Screen name="CreateTransaction" component={CreateTransactionScreen} options={{ title: 'New Transaction' }} />
      <Stack.Screen name="BillsList" component={BillsListScreen} options={{ title: 'My Bills' }} />
      <Stack.Screen name="BillDetail" component={BillDetailScreen} options={{ title: 'Bill Details' }} />
      <Stack.Screen name="MonthlyComparison" component={MonthlyComparisonScreen} options={{ title: 'Month Comparison' }} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{ title: 'Transaction Details' }} />
    </Stack.Navigator>
  );
}
