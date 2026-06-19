import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { SpacesDashboardScreen } from '../screens/spaces/SpacesDashboardScreen';
import { SpaceDetailScreen } from '../screens/spaces/SpaceDetailScreen';
import { CreateSpaceScreen } from '../screens/spaces/CreateSpaceScreen';

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
    </Stack.Navigator>
  );
}
