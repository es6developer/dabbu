import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FamilyDashboardScreen } from '../screens/family/FamilyDashboardScreen';
import { FamilyChatScreen } from '../screens/family/FamilyChatScreen';
import { CreateFamilyScreen } from '../screens/family/CreateFamilyScreen';

const Stack = createNativeStackNavigator();

export function FamilyNavigator() {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: '#0A0A0F' },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '600' },
      contentStyle: { backgroundColor: '#0A0A0F' },
    }}>
      <Stack.Screen name="FamilyDashboard" component={FamilyDashboardScreen} options={{ title: 'Family' }} />
      <Stack.Screen name="FamilyChat" component={FamilyChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="CreateFamily" component={CreateFamilyScreen} options={{ title: 'Create Family' }} />
    </Stack.Navigator>
  );
}
