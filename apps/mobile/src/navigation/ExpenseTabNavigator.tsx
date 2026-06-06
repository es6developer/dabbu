import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '../theme';
import { MyWalletScreen } from '../screens/transactions/MyWalletScreen';
import { SharedCirclesScreen } from '../screens/transactions/SharedCirclesScreen';

const Tab = createMaterialTopTabNavigator();

export function ExpenseTabNavigator() {
  const { colors, typography } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="SharedCircles"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.bg.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarIndicatorStyle: {
          backgroundColor: colors.accent.primary,
          height: 3,
          borderRadius: 3,
        },
        tabBarLabelStyle: {
          fontFamily: typography.calloutBold.fontFamily,
          fontSize: 14,
          fontWeight: '700',
          textTransform: 'none',
        },
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      <Tab.Screen name="MyWallet" component={MyWalletScreen} options={{ title: 'My Wallet' }} />
      <Tab.Screen
        name="SharedCircles"
        component={SharedCirclesScreen}
        options={{ title: 'Shared Circles' }}
      />
    </Tab.Navigator>
  );
}
