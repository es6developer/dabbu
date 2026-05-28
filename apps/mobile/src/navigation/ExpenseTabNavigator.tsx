import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TransactionsListScreen } from '../screens/transactions/TransactionsListScreen';
import { AccountsListScreen } from '../screens/accounts/AccountsListScreen';
import { useTheme } from '../theme';

const Tab = createBottomTabNavigator();

export function ExpenseTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.bg.primary,
          borderTopColor: colors.border.subtle,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="TransactionsList"
        component={TransactionsListScreen}
        options={{
          title: 'Transactions',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'list' : 'list-outline'}
              size={size}
              color={focused ? colors.accent.primary : colors.text.tertiary}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AccountsList"
        component={AccountsListScreen}
        options={{
          title: 'Accounts',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'wallet' : 'wallet-outline'}
              size={size}
              color={focused ? colors.accent.primary : colors.text.tertiary}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
