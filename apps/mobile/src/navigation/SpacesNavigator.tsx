import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { SpacesDashboardScreen } from '../screens/spaces/SpacesDashboardScreen';
import { SpaceDetailScreen } from '../screens/spaces/SpaceDetailScreen';
import { CreateSpaceScreen } from '../screens/spaces/CreateSpaceScreen';
import { AddSpaceExpenseScreen } from '../screens/spaces/AddSpaceExpenseScreen';
import { AddMemberScreen } from '../screens/social/AddMemberScreen';

const Stack = createNativeStackNavigator();

export function SpacesNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen
        name="SpacesDashboard"
        component={SpacesDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SpaceDetail"
        component={SpaceDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateSpace"
        component={CreateSpaceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddSpaceExpense"
        component={AddSpaceExpenseScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddMember"
        component={AddMemberScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
