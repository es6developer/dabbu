import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MyWalletScreen } from '../screens/transactions/MyWalletScreen';
import { SharedCirclesScreen } from '../screens/transactions/SharedCirclesScreen';
import { useTheme } from '../theme';

const Tab = createBottomTabNavigator();

export function ExpenseTabNavigator() {
  const { colors, typography } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="SharedCircles"
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
        tabBarLabelStyle: { ...typography.tab },
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { ...typography.calloutBold },
      }}
    >
      <Tab.Screen
        name="MyWallet"
        component={MyWalletScreen}
        options={{
          title: 'My Wallet',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'wallet' : 'wallet-outline'}
              size={size}
              color={focused ? colors.accent.primary : colors.text.tertiary}
            />
          ),
        }}
      />
      <Tab.Screen
        name="SharedCircles"
        component={SharedCirclesScreen}
        options={{
          title: 'Shared Circles',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={focused ? colors.accent.primary : colors.text.tertiary}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
