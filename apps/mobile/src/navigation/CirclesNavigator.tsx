import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { CirclesListScreen } from '../screens/circles/CirclesListScreen';
import { CreateCircleScreen } from '../screens/circles/CreateCircleScreen';
import { SplitExpenseScreen } from '../screens/split/SplitExpenseScreen';
import { SettlementScreen } from '../screens/split/SettlementScreen';
import { SharedGroupDetailScreen } from '../screens/shared-finance/SharedGroupDetailScreen';
import { SharedExpenseFormScreen } from '../screens/shared-finance/SharedExpenseFormScreen';
import { CoupleFinanceScreen } from '../screens/shared-finance/CoupleFinanceScreen';
import { FamilyDashboardScreen } from '../screens/shared-finance/FamilyDashboardScreen';
import { TripDashboardScreen } from '../screens/shared-finance/TripDashboardScreen';
import { AccessExpiredScreen } from '../screens/shared-finance/AccessExpiredScreen';
import { TripCompletedScreen } from '../screens/shared-finance/TripCompletedScreen';
import { GroupWalletScreen } from '../screens/shared-finance/GroupWalletScreen';
import { WalletTransferScreen } from '../screens/shared-finance/WalletTransferScreen';
import { SplitTemplatesScreen } from '../screens/shared-finance/SplitTemplatesScreen';
import { AddMemberScreen } from '../screens/social/AddMemberScreen';
import { ExternalSplitLinkScreen } from '../screens/split/ExternalSplitLinkScreen';
import { CoupleIncomeScreen } from '../screens/couple/CoupleIncomeScreen';
import { CoupleReportsScreen } from '../screens/couple/CoupleReportsScreen';
import { TransactionDetailScreen } from '../screens/transactions/TransactionDetailScreen';

const Stack = createNativeStackNavigator();

export function CirclesNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={iosTransitionOptions(theme)}
    >
      <Stack.Screen
        name="CirclesList"
        component={CirclesListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateCircle"
        component={CreateCircleScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="SplitExpense"
        component={SplitExpenseScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="Settlement"
        component={SettlementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SharedGroupDetail"
        component={SharedGroupDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SharedExpenseForm"
        component={SharedExpenseFormScreen}
        options={{ title: 'Add Expense' }}
      />
      <Stack.Screen
        name="CoupleFinance"
        component={CoupleFinanceScreen}
        options={{ title: 'Couple Finance' }}
      />
      <Stack.Screen
        name="CoupleIncome"
        component={CoupleIncomeScreen}
        options={{ title: 'Income' }}
      />
      <Stack.Screen
        name="CoupleReports"
        component={CoupleReportsScreen}
        options={{ title: 'Reports' }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FamilyDashboard"
        component={FamilyDashboardScreen}
        options={{ title: 'Family Dashboard' }}
      />
      <Stack.Screen
        name="TripDashboard"
        component={TripDashboardScreen}
        options={{ title: 'Trip Dashboard' }}
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
        name="AddMember"
        component={AddMemberScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="ExternalSplitLink"
        component={ExternalSplitLinkScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
