import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { CoupleSpaceScreen } from '../screens/couple/CoupleSpaceScreen';
import { CoupleIncomeScreen } from '../screens/couple/CoupleIncomeScreen';
import { CoupleExpensesScreen } from '../screens/couple/CoupleExpensesScreen';
import { CoupleBudgetsScreen } from '../screens/couple/CoupleBudgetsScreen';
import { CoupleSavingsScreen } from '../screens/couple/CoupleSavingsScreen';
import { CoupleGoalsScreen } from '../screens/couple/CoupleGoalsScreen';
import { CoupleBillsScreen } from '../screens/couple/CoupleBillsScreen';
import { CoupleSettlementsScreen } from '../screens/couple/CoupleSettlementsScreen';
import { CoupleReportsScreen } from '../screens/couple/CoupleReportsScreen';
import { CoupleSettingsScreen } from '../screens/couple/CoupleSettingsScreen';

const Stack = createNativeStackNavigator();

export function CoupleSpaceNavigator() {
  const { colors, typography } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
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
        name="CoupleSpaceHome"
        component={CoupleSpaceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleIncome"
        component={CoupleIncomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleExpenses"
        component={CoupleExpensesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleBudgets"
        component={CoupleBudgetsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleSavings"
        component={CoupleSavingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleGoals"
        component={CoupleGoalsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleBills"
        component={CoupleBillsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleSettlements"
        component={CoupleSettlementsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleReports"
        component={CoupleReportsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleSettings"
        component={CoupleSettingsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
