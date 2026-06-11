import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { FamilyDashboardScreen } from '../screens/family/FamilyDashboardScreen';
import { FamilyChatScreen } from '../screens/family/FamilyChatScreen';
import { CreateFamilyScreen } from '../screens/family/CreateFamilyScreen';
import { TasksListScreen } from '../screens/tasks/TasksListScreen';
import { CreateTaskScreen } from '../screens/tasks/CreateTaskScreen';

const Stack = createNativeStackNavigator();

export function FamilyNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
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
      <Stack.Screen name="TasksList" component={TasksListScreen} options={{ title: 'Tasks' }} />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ title: 'New Task' }}
      />
    </Stack.Navigator>
  );
}
