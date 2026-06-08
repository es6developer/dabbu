import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { FamilyDashboardScreen } from '../screens/family/FamilyDashboardScreen';
import { FamilyChatScreen } from '../screens/family/FamilyChatScreen';
import { CreateFamilyScreen } from '../screens/family/CreateFamilyScreen';

const Stack = createNativeStackNavigator();

export function FamilyNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.bg.primary },
      }}
    >
      <Stack.Screen
        name="FamilyDashboard"
        component={FamilyDashboardScreen}
        options={{ title: 'Family' }}
      />
      <Stack.Screen name="FamilyChat" component={FamilyChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen
        name="CreateFamily"
        component={CreateFamilyScreen}
        options={{ title: 'Create Family' }}
      />
    </Stack.Navigator>
  );
}
