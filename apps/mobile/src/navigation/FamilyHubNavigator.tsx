import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { iosTransitionOptions } from './animations';
import { FamilyHubScreen } from '../screens/family/FamilyHubScreen';
import { FamilySpaceScreen } from '../screens/family/FamilySpaceScreen';
import { FamilyModuleScreen } from '../screens/family/FamilyModuleScreen';
import { FamilyDashboardScreen } from '../screens/family/FamilyDashboardScreen';
import { CoupleDashboardScreen } from '../screens/dashboard/CoupleDashboardScreen';
import { PersonalDashboardScreen } from '../screens/dashboard/PersonalDashboardScreen';
import { SharedGroupDetailScreen } from '../screens/shared-finance/SharedGroupDetailScreen';
import { CreateSharedGroupScreen } from '../screens/shared-finance/CreateSharedGroupScreen';
import { SharedExpenseFormScreen } from '../screens/shared-finance/SharedExpenseFormScreen';
import { SettlementScreen } from '../screens/shared-finance/SettlementScreen';
import { CoupleFinanceScreen } from '../screens/shared-finance/CoupleFinanceScreen';
import { TripDashboardScreen } from '../screens/shared-finance/TripDashboardScreen';
import { GroupWalletScreen } from '../screens/shared-finance/GroupWalletScreen';
import { WalletTransferScreen } from '../screens/shared-finance/WalletTransferScreen';
import { AddMemberScreen } from '../screens/social/AddMemberScreen';
import { TransactionDetailScreen } from '../screens/transactions/TransactionDetailScreen';
import { FamilyChatScreen } from '../screens/family/FamilyChatScreen';
import { InviteMemberScreen } from '../screens/family/InviteMemberScreen';
import { CoupleSpaceScreen } from '../screens/couple/CoupleSpaceScreen';
import { CoupleSplashScreen } from '../screens/couple/CoupleSplashScreen';
import { CreateGoalScreen } from '../screens/family/CreateGoalScreen';
import { CreateBillScreen } from '../screens/family/CreateBillScreen';
import { CreateTaskScreen } from '../screens/family/CreateTaskScreen';
import { CreateContributionScreen } from '../screens/family/CreateContributionScreen';
import { CreateCalendarEventScreen } from '../screens/family/CreateCalendarEventScreen';

const FAMILY_MODULE_ROUTES = [
  { route: 'FamilyMembers', module: 'members', title: 'Members' },
  { route: 'FamilyGoals', module: 'goals', title: 'Goals' },
  { route: 'FamilyBills', module: 'bills', title: 'Bills' },
  { route: 'FamilyContributions', module: 'contributions', title: 'Contributions' },
  { route: 'FamilyBudget', module: 'budget', title: 'Budget' },
  { route: 'FamilyInvestments', module: 'investments', title: 'Investments' },
  { route: 'FamilyInsurance', module: 'insurance', title: 'Insurance' },
  { route: 'FamilyEmergencyFund', module: 'emergency', title: 'Emergency Fund' },
  { route: 'FamilyTasks', module: 'tasks', title: 'Tasks' },
  { route: 'FamilyCalendar', module: 'calendar', title: 'Calendar' },
  { route: 'FamilyDocuments', module: 'documents', title: 'Documents' },
  { route: 'FamilyAIAdvisor', module: 'ai-advisor', title: 'AI Advisor' },
  { route: 'FamilyReports', module: 'reports', title: 'Reports' },
  { route: 'FamilyVault', module: 'vault', title: 'Family Vault' },
];

function PlaceholderScreen({ routeName }: { routeName: string }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const label = routeName.replace('Family', '').replace('Detail', '');
  return (
    <View style={[phs.placeholder, { backgroundColor: colors.bg.primary }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={phs.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
      </TouchableOpacity>
      <Ionicons name="construct-outline" size={48} color={colors.text.tertiary} />
      <Text style={[phs.title, { color: colors.text.primary }]}>{label} Detail</Text>
      <Text style={[phs.subtitle, { color: colors.text.tertiary }]}>Coming soon</Text>
    </View>
  );
}

const phs = StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  backBtn: { position: 'absolute', top: 60, left: 16, width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  subtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
});

const Stack = createNativeStackNavigator();

export function FamilyHubNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen
        name="FamilyHome"
        component={FamilyHubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FamilyHubHome"
        component={FamilyHubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FamilySpace"
        component={FamilySpaceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FamilyDashboard"
        component={FamilyDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleDashboard"
        component={CoupleDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PersonalDashboard"
        component={PersonalDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FamilyModule"
        component={FamilyModuleScreen}
        options={{ headerShown: false }}
      />
      {FAMILY_MODULE_ROUTES.map(({ route, module: mod, title }) => (
        <Stack.Screen
          key={route}
          name={route}
          component={FamilyModuleScreen}
          initialParams={{ module: mod, title }}
          options={{ headerShown: false }}
        />
      ))}
      <Stack.Screen
        name="FamilyMemberDetail"
        options={{ headerShown: false }}
      >
        {() => <PlaceholderScreen routeName="FamilyMemberDetail" />}
      </Stack.Screen>
      <Stack.Screen
        name="FamilyGoalDetail"
        options={{ headerShown: false }}
      >
        {() => <PlaceholderScreen routeName="FamilyGoalDetail" />}
      </Stack.Screen>
      <Stack.Screen
        name="FamilyBillDetail"
        options={{ headerShown: false }}
      >
        {() => <PlaceholderScreen routeName="FamilyBillDetail" />}
      </Stack.Screen>
      <Stack.Screen
        name="SharedGroupDetail"
        component={SharedGroupDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateSharedGroup"
        component={CreateSharedGroupScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="SharedExpenseForm"
        component={SharedExpenseFormScreen}
        options={({ route }: any) => ({
          title: route.params?.edit ? 'Edit Expense' : 'New Expense',
          headerShown: true,
        })}
      />
      <Stack.Screen
        name="Settlement"
        component={SettlementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleFinance"
        component={CoupleFinanceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TripDashboard"
        component={TripDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GroupWallet"
        component={GroupWalletScreen}
        options={{ title: 'Group Wallets' }}
      />
      <Stack.Screen
        name="WalletTransfer"
        component={WalletTransferScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddMember"
        component={AddMemberScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="FamilyChat"
        component={FamilyChatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InviteMember"
        component={InviteMemberScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleSpace"
        component={CoupleSpaceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoupleSplash"
        component={CoupleSplashScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateGoal"
        component={CreateGoalScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="CreateBill"
        component={CreateBillScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="CreateContribution"
        component={CreateContributionScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="CreateCalendarEvent"
        component={CreateCalendarEventScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
