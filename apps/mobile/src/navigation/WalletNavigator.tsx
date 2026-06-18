import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { MyWalletScreen } from '../screens/transactions/MyWalletScreen';
import { WalletHomeScreen } from '../screens/wallet/WalletHomeScreen';
import { AccountDetailScreen } from '../screens/accounts/AccountDetailScreen';
import { FinancialCenterScreen } from '../screens/finance/FinancialCenterScreen';
import { BillScannerScreen } from '../screens/transactions/BillScannerScreen';
import { BillsListScreen } from '../screens/bills/BillsListScreen';
import { BillDetailScreen } from '../screens/bills/BillDetailScreen';
import { SubscriptionScreen } from '../screens/subscriptions/SubscriptionScreen';
import { TransactionDetailScreen } from '../screens/transactions/TransactionDetailScreen';
import { CategorySelectionScreen } from '../screens/expense/CategorySelectionScreen';
import { AddExpenseScreen } from '../screens/expense/AddExpenseScreen';

const Stack = createNativeStackNavigator();

export function WalletNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen
        name="WalletHome"
        component={WalletHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyWallet"
        component={MyWalletScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AccountDetail"
        component={AccountDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FinancialCenter"
        component={FinancialCenterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BillScanner"
        component={BillScannerScreen}
        options={{ title: 'Scan Bill' }}
      />
      <Stack.Screen
        name="BillsList"
        component={BillsListScreen}
        options={{ title: 'My Bills' }}
      />
      <Stack.Screen
        name="BillDetail"
        component={BillDetailScreen}
        options={{ title: 'Bill Details' }}
      />
      <Stack.Screen
        name="Subscriptions"
        component={SubscriptionScreen}
        options={{ title: 'Subscriptions' }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: 'Transaction Details', headerShown: false }}
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
    </Stack.Navigator>
  );
}
