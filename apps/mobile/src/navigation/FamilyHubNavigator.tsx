import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { iosTransitionOptions } from './animations';
import { FamilyHubScreen } from '../screens/family/FamilyHubScreen';
import { SharedGroupDetailScreen } from '../screens/shared-finance/SharedGroupDetailScreen';
import { CreateSharedGroupScreen } from '../screens/shared-finance/CreateSharedGroupScreen';
import { SharedExpenseFormScreen } from '../screens/shared-finance/SharedExpenseFormScreen';
import { SettlementScreen } from '../screens/shared-finance/SettlementScreen';
import { CoupleFinanceScreen } from '../screens/shared-finance/CoupleFinanceScreen';
import { TripDashboardScreen } from '../screens/shared-finance/TripDashboardScreen';
import { GroupWalletScreen } from '../screens/shared-finance/GroupWalletScreen';
import { WalletTransferScreen } from '../screens/shared-finance/WalletTransferScreen';
import { AddMemberScreen } from '../screens/social/AddMemberScreen';
import { TransactionDetailScreen } from '../screens/transactions/TransactionDetailScreen';
import { RemindersScreen } from '../screens/reminders/RemindersScreen';
import { RemindersListScreen } from '../screens/reminders/RemindersListScreen';
import { ReminderDetailScreen } from '../screens/reminders/ReminderDetailScreen';
import { CreateReminderScreen } from '../screens/reminders/CreateReminderScreen';

const Stack = createNativeStackNavigator();

const SHARED_GROUP_SCREENS = [
  { name: 'SharedGroupDetail', component: SharedGroupDetailScreen },
  { name: 'CreateSharedGroup', component: CreateSharedGroupScreen },
  { name: 'SharedExpenseForm', component: SharedExpenseFormScreen },
  { name: 'Settlement', component: SettlementScreen },
  { name: 'CoupleFinance', component: CoupleFinanceScreen },
  { name: 'TripDashboard', component: TripDashboardScreen },
  { name: 'GroupWallet', component: GroupWalletScreen },
  { name: 'WalletTransfer', component: WalletTransferScreen },
  { name: 'AddMember', component: AddMemberScreen },
  { name: 'TransactionDetail', component: TransactionDetailScreen },
  { name: 'Reminders', component: RemindersScreen },
  { name: 'RemindersList', component: RemindersListScreen },
  { name: 'ReminderDetail', component: ReminderDetailScreen },
  { name: 'CreateReminder', component: CreateReminderScreen },
];

export function FamilyHubNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen
        name="FamilyHome"
        component={FamilyHubScreen}
        options={{ headerShown: false }}
      />
      {SHARED_GROUP_SCREENS.map(({ name, component }) => (
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
