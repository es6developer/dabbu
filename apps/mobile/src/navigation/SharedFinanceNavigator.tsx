import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { SharedScreen } from '../screens/shared-finance/SharedScreen';
import { SharedGroupDetailScreen } from '../screens/shared-finance/SharedGroupDetailScreen';
import { CreateSharedGroupScreen } from '../screens/shared-finance/CreateSharedGroupScreen';
import { SharedExpenseFormScreen } from '../screens/shared-finance/SharedExpenseFormScreen';
import { CoupleFinanceScreen } from '../screens/shared-finance/CoupleFinanceScreen';
import { FamilyDashboardScreen } from '../screens/shared-finance/FamilyDashboardScreen';
import { TripDashboardScreen } from '../screens/shared-finance/TripDashboardScreen';
import { SettlementScreen } from '../screens/shared-finance/SettlementScreen';
import { AccessExpiredScreen } from '../screens/shared-finance/AccessExpiredScreen';
import { TripCompletedScreen } from '../screens/shared-finance/TripCompletedScreen';
import { GroupWalletScreen } from '../screens/shared-finance/GroupWalletScreen';
import { WalletTransferScreen } from '../screens/shared-finance/WalletTransferScreen';
import { SplitTemplatesScreen } from '../screens/shared-finance/SplitTemplatesScreen';
import { AddMemberScreen } from '../screens/social/AddMemberScreen';
import { CoupleIncomeScreen } from '../screens/couple/CoupleIncomeScreen';
import { CoupleReportsScreen } from '../screens/couple/CoupleReportsScreen';
import { TransactionDetailScreen } from '../screens/transactions/TransactionDetailScreen';

const Stack = createNativeStackNavigator();

export function SharedFinanceNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={iosTransitionOptions(theme)}
    >
      <Stack.Screen
        name="SharedFinanceHome"
        component={SharedScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SharedGroupDetail"
        component={SharedGroupDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateSharedGroup"
        component={CreateSharedGroupScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="SharedExpenseForm"
        component={SharedExpenseFormScreen}
        options={({ route }: any) => ({
          title: route.params?.edit ? 'Edit Expense' : 'New Expense',
        })}
      />
      <Stack.Screen
        name="CoupleFinance"
        component={CoupleFinanceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FamilyDashboard"
        component={FamilyDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TripDashboard"
        component={TripDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settlement"
        component={SettlementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AccessExpired"
        component={AccessExpiredScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="TripCompleted"
        component={TripCompletedScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="GroupWallet"
        component={GroupWalletScreen}
        options={{ title: 'Group Wallets' }}
      />
      <Stack.Screen
        name="WalletTransfer"
        component={WalletTransferScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SplitTemplates"
        component={SplitTemplatesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleIncome"
        component={CoupleIncomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleReports"
        component={CoupleReportsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddMember"
        component={AddMemberScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
