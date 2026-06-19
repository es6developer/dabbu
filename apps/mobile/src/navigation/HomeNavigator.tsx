import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '../theme';
import { DashboardNavigator } from './DashboardNavigator';
import { CoupleSpaceNavigator } from './CoupleSpaceNavigator';
import { FamilyHubNavigator } from './FamilyHubNavigator';

const Tab = createMaterialTopTabNavigator();

export function HomeNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.bg.primary },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 13, textTransform: 'none' },
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarIndicatorStyle: { backgroundColor: colors.brand.primary, height: 3 },
        lazy: true,
      }}
    >
      <Tab.Screen
        name="Personal"
        component={DashboardNavigator}
        options={{ tabBarLabel: 'Personal' }}
      />
      <Tab.Screen
        name="Couple"
        component={CoupleSpaceNavigator}
        options={{ tabBarLabel: 'Couple' }}
      />
      <Tab.Screen
        name="Family"
        component={FamilyHubNavigator}
        options={{ tabBarLabel: 'Family' }}
      />
    </Tab.Navigator>
  );
}
