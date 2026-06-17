import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { CoupleSpaceScreen } from '../screens/couple/CoupleSpaceScreen';
import { CoupleSplashScreen } from '../screens/couple/CoupleSplashScreen';
import { CoupleSettingsScreen } from '../screens/couple/CoupleSettingsScreen';
import { CoupleTransactionFormScreen } from '../screens/couple/CoupleTransactionFormScreen';
import { CoupleGoalsScreen } from '../screens/couple/CoupleGoalsScreen';
import { CoupleBillsScreen } from '../screens/couple/CoupleBillsScreen';

const Stack = createNativeStackNavigator();

export function CoupleSpaceNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)} initialRouteName="CoupleSplash">
      <Stack.Screen name="CoupleSplash" component={CoupleSplashScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CoupleSpaceHome" component={CoupleSpaceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CoupleSettings" component={CoupleSettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CoupleTransactionForm" component={CoupleTransactionFormScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="Goals" component={CoupleGoalsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Bills" component={CoupleBillsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
