import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { LifeDashboardScreen } from '../screens/home/LifeDashboardScreen';
import { NotificationsScreen } from '../screens/home/NotificationsScreen';
import { NotificationCenterScreen } from '../screens/home/NotificationCenterScreen';
import { GoalsListScreen } from '../screens/goals/GoalsListScreen';
import { GoalDetailScreen } from '../screens/goals/GoalDetailScreen';
import { NetWorthScreen } from '../screens/home/NetWorthScreen';
import { HealthScoreScreen } from '../screens/health/HealthScoreScreen';
import { EmergencyFundScreen } from '../screens/savings/EmergencyFundScreen';
import { FinancialCenterScreen } from '../screens/finance/FinancialCenterScreen';
import { DabbuAIScreen } from '../screens/ai/DabbuAIScreen';
import { DocumentVaultScreen } from '../screens/documents/DocumentVaultScreen';
import { DocumentDetailScreen } from '../screens/documents/DocumentDetailScreen';
import { BadgeWallScreen } from '../screens/documents/BadgeWallScreen';
import { StreaksScreen } from '../screens/home/StreaksScreen';
import { GlobalSearchScreen } from '../screens/home/GlobalSearchScreen';
import { SpaceDetailScreen } from '../screens/spaces/SpaceDetailScreen';
import { CreateSpaceScreen } from '../screens/spaces/CreateSpaceScreen';
import { SpacesDashboardScreen } from '../screens/spaces/SpacesDashboardScreen';
import { YearlySummaryScreen } from '../screens/home/YearlySummaryScreen';
import { HousePlannerScreen } from '../screens/lifehub/HousePlannerScreen';
import { BabyPlannerScreen } from '../screens/lifehub/BabyPlannerScreen';
import { RetirementPlannerScreen } from '../screens/lifehub/RetirementPlannerScreen';
import { InvestmentPlannerScreen } from '../screens/lifehub/InvestmentPlannerScreen';
import { CarPlannerScreen } from '../screens/lifehub/CarPlannerScreen';
import { EducationPlannerScreen } from '../screens/lifehub/EducationPlannerScreen';
import { VacationPlannerScreen } from '../screens/lifehub/VacationPlannerScreen';
import { WeddingPlannerScreen } from '../screens/lifehub/WeddingPlannerScreen';
import { LifeEventsListScreen } from '../screens/life-events/LifeEventsListScreen';
import { LifeEventDetailScreen } from '../screens/life-events/LifeEventDetailScreen';
import { CreateLifeEventScreen } from '../screens/life-events/CreateLifeEventScreen';
import { CoupleSavingsScreen } from '../screens/couple/CoupleSavingsScreen';
import { CoupleGoalsScreen } from '../screens/couple/CoupleGoalsScreen';
import { CoupleTimelineScreen } from '../screens/couple/CoupleTimelineScreen';
import { CoupleBudgetsScreen } from '../screens/couple/CoupleBudgetsScreen';
import { AddExpenseScreen } from '../screens/expense/AddExpenseScreen';
import { CoupleSpaceScreen } from '../screens/couple/CoupleSpaceScreen';
import { CreateFamilyWorkspaceScreen } from '../screens/family/CreateFamilyWorkspaceScreen';
import { FamilyWorkspaceScreen } from '../screens/family/FamilyWorkspaceScreen';

const Stack = createNativeStackNavigator();

export function DashboardNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen name="LifeDashboard" component={LifeDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GoalsList" component={GoalsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NetWorth" component={NetWorthScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HealthScore" component={HealthScoreScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EmergencyFund" component={EmergencyFundScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FinancialCenter" component={FinancialCenterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DabbuAI" component={DabbuAIScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DocumentVault" component={DocumentVaultScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BadgeWall" component={BadgeWallScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Streaks" component={StreaksScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SpaceDetail" component={SpaceDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateSpace" component={CreateSpaceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SpacesDashboard" component={SpacesDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HousePlanner" component={HousePlannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BabyPlanner" component={BabyPlannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RetirementPlanner" component={RetirementPlannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="InvestmentPlanner" component={InvestmentPlannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CarPlanner" component={CarPlannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EducationPlanner" component={EducationPlannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VacationPlanner" component={VacationPlannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WeddingPlanner" component={WeddingPlannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LifeEventsList" component={LifeEventsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LifeEventDetail" component={LifeEventDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateLifeEvent" component={CreateLifeEventScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CoupleSavings" component={CoupleSavingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CoupleGoals" component={CoupleGoalsScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="CoupleTimeline" component={CoupleTimelineScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CoupleBudgets" component={CoupleBudgetsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="CoupleSpace" component={CoupleSpaceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateFamilyWorkspace" component={CreateFamilyWorkspaceScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="FamilyWorkspace" component={FamilyWorkspaceScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
