import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/home/HomeScreen';
import { NotificationsScreen } from '../screens/home/NotificationsScreen';
import { NotificationCenterScreen } from '../screens/home/NotificationCenterScreen';
import { AccountsNavigator } from './AccountsNavigator';
import { SharedFinanceNavigator } from './SharedFinanceNavigator';
import { GoalsNavigator } from './GoalsNavigator';
import { GoalsListScreen } from '../screens/goals/GoalsListScreen';
import { GoalDetailScreen } from '../screens/goals/GoalDetailScreen';
import { DocumentVaultScreen } from '../screens/documents/DocumentVaultScreen';
import { DocumentDetailScreen } from '../screens/documents/DocumentDetailScreen';
import { BadgeWallScreen } from '../screens/documents/BadgeWallScreen';
import { BudgetsListScreen } from '../screens/budgets/BudgetsListScreen';
import { CreateBudgetScreen } from '../screens/budgets/CreateBudgetScreen';
import { NetWorthScreen } from '../screens/home/NetWorthScreen';
import { LoanTrackerScreen } from '../screens/home/LoanTrackerScreen';
import { GlobalSearchScreen } from '../screens/home/GlobalSearchScreen';
import { AiInsightsScreen } from '../screens/ai/AiInsightsScreen';
import { AIDashboard } from '../screens/ai/AIDashboard';
import { AiHomeDashboardScreen } from '../screens/ai/AiHomeDashboardScreen';
import { FinancialDnaScreen } from '../screens/ai/FinancialDnaScreen';
import { FinancialCopilotScreen } from '../screens/ai/FinancialCopilotScreen';
import { MonthlyAiReviewScreen } from '../screens/ai/MonthlyAiReviewScreen';
import { SmartGoalCoachScreen } from '../screens/ai/SmartGoalCoachScreen';
import { CoupleAiScreen } from '../screens/ai/CoupleAiScreen';
import { FamilyAiScreen } from '../screens/ai/FamilyAiScreen';
import { GroupSpaceAiScreen } from '../screens/ai/GroupSpaceAiScreen';
import { AiSavingsScreen } from '../screens/ai/AiSavingsScreen';
import { AnomalyDetectionScreen } from '../screens/ai/AnomalyDetectionScreen';
import { SmartNotificationScreen } from '../screens/ai/SmartNotificationScreen';
import { PremiumAiPaywallScreen } from '../screens/ai/PremiumAiPaywallScreen';
import { TodayFeedScreen } from '../screens/ai/TodayFeedScreen';
import { RemindersScreen } from '../screens/reminders/RemindersScreen';
import { ReminderDetailScreen } from '../screens/reminders/ReminderDetailScreen';
import { CreateReminderScreen } from '../screens/reminders/CreateReminderScreen';
import { SmsDashboardScreen } from '../screens/sms/SmsDashboardScreen';
import { SmsPermissionScreen } from '../screens/sms/SmsPermissionScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { AvatarPickerScreen } from '../screens/settings/AvatarPickerScreen';
import { SecurityScreen } from '../screens/settings/SecurityScreen';
import { PremiumScreen } from '../screens/premium/PremiumScreen';
import { BillingHistoryScreen } from '../screens/premium/BillingHistoryScreen';
import { ReferralScreen } from '../screens/referral/ReferralScreen';
import { ThemeScreen } from '../screens/settings/ThemeScreen';
import { HelpCenterScreen } from '../screens/settings/HelpCenterScreen';
import { ContactUsScreen } from '../screens/settings/ContactUsScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { CustomiseDashboardScreen } from '../screens/settings/CustomiseDashboardScreen';
import { CustomiseBottomMenuScreen } from '../screens/settings/CustomiseBottomMenuScreen';
import { NotificationSettingsScreen } from '../screens/settings/NotificationSettingsScreen';
import { FavoriteContactsScreen } from '../screens/settings/FavoriteContactsScreen';
import { AddPartnerScreen } from '../screens/settings/AddPartnerScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { CoupleSpaceNavigator } from './CoupleSpaceNavigator';
import { CirclesNavigator } from './CirclesNavigator';
import { CategorySelectionScreen } from '../screens/expense/CategorySelectionScreen';
import { AddExpenseScreen } from '../screens/expense/AddExpenseScreen';
import { AdminLoginScreen } from '../screens/admin/AdminLoginScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { useTheme } from '../theme';
import { useAuth } from '../store/AuthContext';
import { usePreferences } from '../store/PreferencesContext';
import { useCoupleMode, COUPLE_COLORS } from '../hooks/useCoupleMode';
import { QuickActionSheet } from '../components/ui/QuickActionSheet';
import { iosTransitionOptions } from './animations';

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();
const RemindersStack = createNativeStackNavigator();
const SmsStack = createNativeStackNavigator();

function DashboardNavigator() {
  const theme = useTheme();
  return (
    <DashboardStack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <DashboardStack.Screen
        name="DashboardMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="NotificationCenter"
        component={NotificationCenterScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="GoalsList"
        component={GoalsListScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="Reminders"
        component={RemindersNavigator}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen name="SMS" component={SmsNavigator} options={{ headerShown: false }} />
      <DashboardStack.Screen
        name="DocumentVault"
        component={DocumentVaultScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="DocumentDetail"
        component={DocumentDetailScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="BadgeWall"
        component={BadgeWallScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiInsights"
        component={AiInsightsScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiHomeDashboard"
        component={AiHomeDashboardScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AIDashboard"
        component={AIDashboard}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiFinancialDna"
        component={FinancialDnaScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiFinancialCopilot"
        component={FinancialCopilotScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiMonthlyReview"
        component={MonthlyAiReviewScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiGoalCoach"
        component={SmartGoalCoachScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiCouple"
        component={CoupleAiScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiFamily"
        component={FamilyAiScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiGroupSpace"
        component={GroupSpaceAiScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiSavings"
        component={AiSavingsScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiAnomalies"
        component={AnomalyDetectionScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiNotifications"
        component={SmartNotificationScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="AiPremiumPaywall"
        component={PremiumAiPaywallScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="TodayFeed"
        component={TodayFeedScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="NetWorth"
        component={NetWorthScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="LoanTracker"
        component={LoanTrackerScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="GlobalSearch"
        component={GlobalSearchScreen}
        options={{ headerShown: false }}
      />
    </DashboardStack.Navigator>
  );
}

function SettingsNavigator() {
  const theme = useTheme();
  return (
    <SettingsStack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <SettingsStack.Screen
        name="Security"
        component={SecurityScreen}
        options={{ title: 'Security' }}
      />
      <SettingsStack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="BillingHistory"
        component={BillingHistoryScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen name="Theme" component={ThemeScreen} options={{ title: 'Theme' }} />
      <SettingsStack.Screen
        name="Help"
        component={HelpCenterScreen}
        options={{ title: 'Help Center' }}
      />
      <SettingsStack.Screen
        name="Contact"
        component={ContactUsScreen}
        options={{ title: 'Contact Us' }}
      />
      <SettingsStack.Screen
        name="Privacy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Privacy Policy' }}
      />
      <SettingsStack.Screen
        name="Referral"
        component={ReferralScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <SettingsStack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="BudgetsList"
        component={BudgetsListScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="CreateBudget"
        component={CreateBudgetScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <SettingsStack.Screen
        name="CoupleSpace"
        component={CoupleSpaceNavigator}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="CustomiseDashboard"
        component={CustomiseDashboardScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="CustomiseBottomMenu"
        component={CustomiseBottomMenuScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="FavoriteContacts"
        component={FavoriteContactsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="AddPartner"
        component={AddPartnerScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="AvatarPicker"
        component={AvatarPickerScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="AdminLogin"
        component={AdminLoginScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <SettingsStack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ headerShown: false }}
      />
    </SettingsStack.Navigator>
  );
}

function RemindersNavigator() {
  const theme = useTheme();
  return (
    <RemindersStack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <RemindersStack.Screen
        name="RemindersList"
        component={RemindersScreen}
        options={{ headerShown: false }}
      />
      <RemindersStack.Screen
        name="CreateReminder"
        component={CreateReminderScreen}
        options={{ title: 'New Reminder' }}
      />
      <RemindersStack.Screen
        name="ReminderDetail"
        component={ReminderDetailScreen}
        options={{ title: 'Reminder' }}
      />
    </RemindersStack.Navigator>
  );
}

function SmsNavigator() {
  const theme = useTheme();
  return (
    <SmsStack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <SmsStack.Screen
        name="SmsDashboard"
        component={SmsDashboardScreen}
        options={{ headerShown: false }}
      />
      <SmsStack.Screen
        name="SmsPermission"
        component={SmsPermissionScreen}
        options={{ title: 'SMS Settings' }}
      />
    </SmsStack.Navigator>
  );
}

export function MainTabNavigator() {
  const theme = useTheme();
  const { colors } = theme;
  const { user, accessToken, isPremium } = useAuth();
  const { getTabVisibility, bottomBarVisible, quickActionVisible } = usePreferences();
  const { showCoupleFeatures } = useCoupleMode();
  const [showActions, setShowActions] = useState(false);
  const navigation = useNavigation<any>();

  const qaVisible = getTabVisibility('QuickAction');

  const quickActions = [
    {
      label: 'Add Expense',
      icon: 'add-circle-outline',
      color: '#DC2626',
      onPress: () => navigation.navigate('Expense', { screen: 'CategorySelection', params: { type: 'expense' } }),
    },
    {
      label: 'Add Income',
      icon: 'trending-up-outline',
      color: '#16A34A',
      onPress: () =>
        navigation.navigate('Expense', { screen: 'CategorySelection', params: { type: 'income' } }),
    },
    {
      label: 'Wallet',
      icon: 'wallet-outline',
      color: '#2563EB',
      onPress: () => navigation.navigate('Expense', { screen: 'ExpenseHome' }),
    },
    {
      label: 'Net Worth',
      icon: 'bar-chart-outline',
      color: '#7C3AED',
      onPress: () => navigation.navigate('Dashboard', { screen: 'NetWorth' }),
    },
    {
      label: 'Create Goal',
      icon: 'flag-outline',
      color: '#F59E0B',
      onPress: () => navigation.navigate('Goals'),
    },
    {
      label: 'Expense Group',
      icon: 'people-outline',
      color: '#14B8A6',
      onPress: () => navigation.navigate('Expense', { screen: 'GroupExpenses' }),
    },
  ];

  const isDark = theme.isDark;

  return (
    <View style={{ flex: 1 }}>
      {showCoupleFeatures && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Ionicons
              key={i}
              name="heart-outline"
              size={24 + i * 8}
              color={`${COUPLE_COLORS.heart}08`}
              style={{
                position: 'absolute',
                top: 60 + (i % 3) * 120,
                left: 20 + (i % 2) * (i * 30 + 40),
                transform: [{ rotate: `${i * 15}deg` }],
              }}
            />
          ))}
        </View>
      )}
      <Tab.Navigator
        tabBar={(props) => (
          <IOSTabBar
            {...props}
            colors={colors}
            isDark={isDark}
            showCenterButton={qaVisible && quickActionVisible}
            bottomBarVisible={bottomBarVisible}
            onCenterPress={() => setShowActions(true)}
          />
        )}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.accent.primary,
          tabBarInactiveTintColor: colors.text.tertiary,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardNavigator}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Expense"
          component={AccountsNavigator}
          options={{ tabBarButton: () => null }}
        />
        <Tab.Screen
          name="Circles"
          component={CirclesNavigator}
          options={{ tabBarButton: () => null }}
        />
        <Tab.Screen
          name="Spaces"
          component={SharedFinanceNavigator}
          options={{
            tabBarLabel: 'Spaces',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'globe' : 'globe-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Goals"
          component={GoalsNavigator}
          options={{
            tabBarLabel: 'Goals',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsNavigator}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            ),
          }}
        />
      </Tab.Navigator>

      {quickActionVisible && (
        <QuickActionSheet
          visible={showActions}
          onClose={() => setShowActions(false)}
          actions={quickActions}
        />
      )}
    </View>
  );
}

function IOSTabBar({
  state,
  descriptors,
  navigation,
  colors,
  isDark,
  showCenterButton,
  bottomBarVisible,
  onCenterPress,
}: any) {
  if (!bottomBarVisible) {
    return null;
  }
  const { getTabVisibility } = usePreferences();
  const { showCoupleFeatures, isInCouple, isCoupleModeActive } = useCoupleMode();
  const coupleHiddenTabs = new Set(showCoupleFeatures ? ['Expense', 'Spaces'] : []);
  const visibleRoutes = state.routes.filter(
    (r: any) =>
      r.name !== 'Circles' &&
      r.name !== 'Expense' &&
      getTabVisibility(r.name) &&
      !coupleHiddenTabs.has(r.name),
  );

  function renderTab(route: any) {
    const descriptor = descriptors[route.key];
    const { options } = descriptor;
    const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (event.defaultPrevented) {
        return;
      }
      const homeScreens: Record<string, string> = {
        Dashboard: 'DashboardMain',
        Expense: 'ExpenseHome',
        Spaces: 'SharedFinanceHome',
        Goals: 'GoalsList',
        Settings: 'SettingsMain',
      };
      navigation.navigate(route.name, { screen: homeScreens[route.name] || route.name });
    };

    const focusedColor = showCoupleFeatures ? COUPLE_COLORS.primary : colors.accent.primary;
    const unfocusedColor = showCoupleFeatures ? COUPLE_COLORS.textTertiary : colors.text.tertiary;

    const icon = options.tabBarIcon
      ? options.tabBarIcon({
          focused: isFocused,
          color: isFocused ? focusedColor : unfocusedColor,
          size: 22,
        })
      : null;

    return (
      <TouchableOpacity
        key={route.key}
        activeOpacity={0.7}
        style={tabStyles.tabItem}
        onPress={onPress}
      >
        {icon}
        <Text
          style={[
            tabStyles.label,
            {
              color: isFocused ? focusedColor : unfocusedColor,
              fontWeight: isFocused ? '600' : '400',
            },
          ]}
        >
          {options.tabBarLabel || route.name}
        </Text>
      </TouchableOpacity>
    );
  }

  const midIndex = Math.floor(visibleRoutes.length / 2);

  return (
    <View style={tabStyles.floatingWrapper}>
      <View
        style={[
          tabStyles.outerWrapper,
          {
            backgroundColor: isDark ? 'rgba(28,28,30,0.94)' : 'rgba(249,249,249,0.94)',
            shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.15)',
          },
        ]}
      >
        <View style={tabStyles.innerRow}>
          {visibleRoutes.slice(0, midIndex).map(renderTab)}
          {showCenterButton && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={tabStyles.centerFab}
              onPress={onCenterPress}
            >
              <View style={[tabStyles.centerFabInner, { backgroundColor: colors.accent.primary }]}>
                <Ionicons name="add" size={28} color="#FFF" />
              </View>
            </TouchableOpacity>
          )}
          {visibleRoutes.slice(midIndex).map(renderTab)}
        </View>
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  floatingWrapper: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  outerWrapper: {
    borderRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-evenly',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  centerFab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  centerFabInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
