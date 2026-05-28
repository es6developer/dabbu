import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SharedFinanceHomeScreen } from '../screens/shared-finance/SharedFinanceHomeScreen';
import { CreateGroupScreen } from '../screens/shared-finance/CreateGroupScreen';
import { GroupDetailScreen } from '../screens/shared-finance/GroupDetailScreen';
import { GroupDashboardScreen } from '../screens/shared-finance/GroupDashboardScreen';
import { GroupSettingsScreen } from '../screens/shared-finance/GroupSettingsScreen';
import { CreateGroupExpenseScreen } from '../screens/shared-finance/CreateGroupExpenseScreen';
import { GroupExpenseDetailScreen } from '../screens/shared-finance/GroupExpenseDetailScreen';
import { SettlementsScreen } from '../screens/shared-finance/SettlementsScreen';
import { CreateSettlementScreen } from '../screens/shared-finance/CreateSettlementScreen';
import { CoupleFinanceDashboardScreen } from '../screens/shared-finance/CoupleFinanceDashboardScreen';
import { TripDetailScreen } from '../screens/shared-finance/TripDetailScreen';
import { TripDashboardScreen } from '../screens/shared-finance/TripDashboardScreen';
import { SharedSubscriptionsScreen } from '../screens/shared-finance/SharedSubscriptionsScreen';
import { CreateSharedSubscriptionScreen } from '../screens/shared-finance/CreateSharedSubscriptionScreen';
import { GroupChatScreen } from '../screens/shared-finance/GroupChatScreen';
import { ContributionRulesScreen } from '../screens/shared-finance/ContributionRulesScreen';
import { InviteMembersScreen } from '../screens/shared-finance/InviteMembersScreen';
import { InviteAcceptScreen } from '../screens/shared-finance/InviteAcceptScreen';
import { GroupPersonalityScreen } from '../screens/shared-finance/GroupPersonalityScreen';
import { AiGroupPollsScreen } from '../screens/shared-finance/AiGroupPollsScreen';
import { AiGroceryScreen } from '../screens/shared-finance/AiGroceryScreen';
import { TripStoryScreen } from '../screens/shared-finance/TripStoryScreen';
import { FinancialHealthScreen } from '../screens/shared-finance/FinancialHealthScreen';
import { YearlyWrappedScreen } from '../screens/shared-finance/YearlyWrappedScreen';
import { SavingsChallengesScreen } from '../screens/shared-finance/SavingsChallengesScreen';
import { AiSettlementRemindersScreen } from '../screens/shared-finance/AiSettlementRemindersScreen';

const Stack = createNativeStackNavigator();

export function SharedFinanceNavigator() {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: '#0A0A0F' },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '600' },
      contentStyle: { backgroundColor: '#0A0A0F' },
    }}>
      <Stack.Screen name="SharedFinanceHome" component={SharedFinanceHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Create Group' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Group' }} />
      <Stack.Screen name="GroupDashboard" component={GroupDashboardScreen} options={{ title: 'Group Dashboard' }} />
      <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="CreateGroupExpense" component={CreateGroupExpenseScreen} options={{ title: 'Add Expense' }} />
      <Stack.Screen name="GroupExpenseDetail" component={GroupExpenseDetailScreen} options={{ title: 'Expense Details' }} />
      <Stack.Screen name="Settlements" component={SettlementsScreen} options={{ title: 'Settlements' }} />
      <Stack.Screen name="CreateSettlement" component={CreateSettlementScreen} options={{ title: 'New Settlement' }} />
      <Stack.Screen name="CoupleFinanceDashboard" component={CoupleFinanceDashboardScreen} options={{ title: 'Couple Finance' }} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Trip' }} />
      <Stack.Screen name="TripDashboard" component={TripDashboardScreen} options={{ title: 'Trip Dashboard' }} />
      <Stack.Screen name="SharedSubscriptions" component={SharedSubscriptionsScreen} options={{ title: 'Subscriptions' }} />
      <Stack.Screen name="CreateSharedSubscription" component={CreateSharedSubscriptionScreen} options={{ title: 'New Subscription' }} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="ContributionRules" component={ContributionRulesScreen} options={{ title: 'Contribution Rules' }} />
      <Stack.Screen name="InviteMembers" component={InviteMembersScreen} options={{ title: 'Invite Members' }} />
      <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} options={{ title: 'Join Group' }} />
      <Stack.Screen name="GroupPersonality" component={GroupPersonalityScreen} options={{ title: 'Group Personality' }} />
      <Stack.Screen name="AiGroupPolls" component={AiGroupPollsScreen} options={{ title: 'Polls' }} />
      <Stack.Screen name="AiGrocery" component={AiGroceryScreen} options={{ title: 'Grocery' }} />
      <Stack.Screen name="TripStory" component={TripStoryScreen} options={{ title: 'Trip Story' }} />
      <Stack.Screen name="FinancialHealth" component={FinancialHealthScreen} options={{ title: 'Financial Health' }} />
      <Stack.Screen name="YearlyWrapped" component={YearlyWrappedScreen} options={{ title: 'Dabbu Wrapped' }} />
      <Stack.Screen name="SavingsChallenges" component={SavingsChallengesScreen} options={{ title: 'Challenges' }} />
      <Stack.Screen name="AiSettlementReminders" component={AiSettlementRemindersScreen} options={{ title: 'Reminders' }} />
    </Stack.Navigator>
  );
}
