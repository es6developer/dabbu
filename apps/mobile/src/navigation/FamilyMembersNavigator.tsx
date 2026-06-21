import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import FamilyMembersScreen from '../screens/family/FamilyMembersScreen';
import { InviteMemberScreen } from '../screens/family/InviteMemberScreen';

const Stack = createNativeStackNavigator();

export function FamilyMembersNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen name="FamilyMembersHome" component={FamilyMembersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="InviteMember" component={InviteMemberScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
