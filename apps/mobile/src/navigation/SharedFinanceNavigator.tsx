import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { SharedFinanceHomeScreen } from '../screens/shared-finance/SharedFinanceHomeScreen';
import { SharedGroupDetailScreen } from '../screens/shared-finance/SharedGroupDetailScreen';
import { CreateSharedGroupScreen } from '../screens/shared-finance/CreateSharedGroupScreen';
import { SharedExpenseFormScreen } from '../screens/shared-finance/SharedExpenseFormScreen';
import { CoupleFinanceScreen } from '../screens/shared-finance/CoupleFinanceScreen';
import { TripDashboardScreen } from '../screens/shared-finance/TripDashboardScreen';
import { SettlementScreen } from '../screens/shared-finance/SettlementScreen';
import { GroupChatScreen } from '../screens/shared-finance/GroupChatScreen';
import { SharedSubscriptionsScreen } from '../screens/shared-finance/SharedSubscriptionsScreen';
import { AccessExpiredScreen } from '../screens/shared-finance/AccessExpiredScreen';
import { TripCompletedScreen } from '../screens/shared-finance/TripCompletedScreen';
import { GroupWalletScreen } from '../screens/shared-finance/GroupWalletScreen';
import { WalletTransferScreen } from '../screens/shared-finance/WalletTransferScreen';

const Stack = createNativeStackNavigator();

export function SharedFinanceNavigator() {
  const { colors, typography } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontFamily: typography.calloutBold.fontFamily,
          fontSize: typography.calloutBold.fontSize,
          fontWeight: typography.calloutBold.fontWeight,
        },
        contentStyle: { backgroundColor: colors.bg.primary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="SharedFinanceHome"
        component={SharedFinanceHomeScreen}
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
        options={{ title: 'New Group', presentation: 'modal' }}
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
        name="TripDashboard"
        component={TripDashboardScreen}
        options={{ title: 'Trip Dashboard' }}
      />
      <Stack.Screen
        name="Settlements"
        component={SettlementScreen}
        options={{ title: 'Settlements' }}
      />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen
        name="SharedSubscriptions"
        component={SharedSubscriptionsScreen}
        options={{ title: 'Subscriptions' }}
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
    </Stack.Navigator>
  );
}
