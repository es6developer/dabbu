import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { SpacesDashboard } from '../screens/shared-finance/SpacesDashboard';
import { SharedGroupDetailScreen } from '../screens/shared-finance/SharedGroupDetailScreen';
import { CreateSharedGroupScreen } from '../screens/shared-finance/CreateSharedGroupScreen';
import { SharedExpenseFormScreen } from '../screens/shared-finance/SharedExpenseFormScreen';
import { SettlementScreen } from '../screens/shared-finance/SettlementScreen';
import { AddMemberScreen } from '../screens/social/AddMemberScreen';

const Stack = createNativeStackNavigator();

export function SpacesNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen
        name="SpacesDashboard"
        component={SpacesDashboard}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SharedGroupDetail"
        component={SharedGroupDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateSharedGroup"
        component={CreateSharedGroupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SharedExpenseForm"
        component={SharedExpenseFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settlement"
        component={SettlementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="AddMember" component={AddMemberScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
