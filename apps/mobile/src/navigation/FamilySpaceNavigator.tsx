import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { FamilyOverviewScreen } from '../screens/family/FamilyOverviewScreen';
import FamilyMembersScreen from '../screens/family/FamilyMembersScreen';
import { FamilySpaceScreen } from '../screens/family/FamilySpaceScreen';
import { FamilyHubScreen } from '../screens/family/FamilyHubScreen';
import { FamilyDashboardScreen } from '../screens/family/FamilyDashboardScreen';
import FamilyBillsScreen from '../screens/family/FamilyBillsScreen';
import FamilyBudgetScreen from '../screens/family/FamilyBudgetScreen';
import FamilyContributionsScreen from '../screens/family/FamilyContributionsScreen';
import FamilyGoalsScreen from '../screens/family/FamilyGoalsScreen';
import FamilyInvestmentsScreen from '../screens/family/FamilyInvestmentsScreen';
import FamilyInsuranceScreen from '../screens/family/FamilyInsuranceScreen';
import FamilyEmergencyFundScreen from '../screens/family/FamilyEmergencyFundScreen';
import FamilyTasksScreen from '../screens/family/FamilyTasksScreen';
import FamilyCalendarScreen from '../screens/family/FamilyCalendarScreen';
import FamilyDocumentsScreen from '../screens/family/FamilyDocumentsScreen';
import FamilyAIAdvisorScreen from '../screens/family/FamilyAIAdvisorScreen';
import FamilyReportsScreen from '../screens/family/FamilyReportsScreen';
import FamilyVaultScreen from '../screens/family/FamilyVaultScreen';
import { FamilyChatScreen } from '../screens/family/FamilyChatScreen';
import { FamilySettingsScreen } from '../screens/family/FamilySettingsScreen';
import { FamilyModuleScreen } from '../screens/family/FamilyModuleScreen';
import { InviteMemberScreen } from '../screens/family/InviteMemberScreen';
import { CreateGoalScreen } from '../screens/family/CreateGoalScreen';
import { CreateBillScreen } from '../screens/family/CreateBillScreen';
import { CreateTaskScreen } from '../screens/family/CreateTaskScreen';
import { CreateContributionScreen } from '../screens/family/CreateContributionScreen';
import { CreateCalendarEventScreen } from '../screens/family/CreateCalendarEventScreen';
import { CreateFamilyScreen } from '../screens/family/CreateFamilyScreen';

const Stack = createNativeStackNavigator();

const FAMILY_SUB_SCREENS = [
  { name: 'Members', component: FamilyMembersScreen, title: 'Members' },
  { name: 'FamilySpace', component: FamilySpaceScreen, title: 'Family Space' },
  { name: 'FamilyHub', component: FamilyHubScreen, title: 'Family Hub' },
  { name: 'FamilyDashboard', component: FamilyDashboardScreen, title: 'Dashboard' },
  { name: 'Money', component: FamilyBillsScreen, title: 'Bills & Budget' },
  { name: 'Bills', component: FamilyBillsScreen, title: 'Bills' },
  { name: 'Budget', component: FamilyBudgetScreen, title: 'Budget' },
  { name: 'Contributions', component: FamilyContributionsScreen, title: 'Contributions' },
  { name: 'Goals', component: FamilyGoalsScreen, title: 'Goals' },
  { name: 'Investments', component: FamilyInvestmentsScreen, title: 'Investments' },
  { name: 'Insurance', component: FamilyInsuranceScreen, title: 'Insurance' },
  { name: 'EmergencyFund', component: FamilyEmergencyFundScreen, title: 'Emergency Fund' },
  { name: 'Tasks', component: FamilyTasksScreen, title: 'Tasks' },
  { name: 'Calendar', component: FamilyCalendarScreen, title: 'Calendar' },
  { name: 'Documents', component: FamilyDocumentsScreen, title: 'Documents' },
  { name: 'AI', component: FamilyAIAdvisorScreen, title: 'AI Advisor' },
  { name: 'Reports', component: FamilyReportsScreen, title: 'Reports' },
  { name: 'Vault', component: FamilyVaultScreen, title: 'Vault' },
  { name: 'FamilyChat', component: FamilyChatScreen, title: 'Chat' },
  { name: 'FamilySettings', component: FamilySettingsScreen, title: 'Settings' },
  { name: 'FamilyModule', component: FamilyModuleScreen, title: 'Module' },
  { name: 'InviteMember', component: InviteMemberScreen, title: 'Invite Member' },
  { name: 'CreateGoal', component: CreateGoalScreen, title: 'New Goal' },
  { name: 'CreateBill', component: CreateBillScreen, title: 'New Bill' },
  { name: 'CreateTask', component: CreateTaskScreen, title: 'New Task' },
  { name: 'CreateContribution', component: CreateContributionScreen, title: 'New Contribution' },
  { name: 'CreateCalendarEvent', component: CreateCalendarEventScreen, title: 'New Event' },
  { name: 'CreateFamily', component: CreateFamilyScreen, title: 'Create Family' },
];

export function FamilySpaceNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen
        name="FamilyOverview"
        component={FamilyOverviewScreen}
        options={{ headerShown: false }}
      />
      {FAMILY_SUB_SCREENS.map(({ name, component }) => (
        <Stack.Screen
          key={name}
          name={name}
          component={component}
          options={{ headerShown: false }}
        />
      ))}
    </Stack.Navigator>
  );
}
