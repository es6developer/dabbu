import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/home/HomeScreen';
import { NotificationsScreen } from '../screens/home/NotificationsScreen';
import { NotificationCenterScreen } from '../screens/home/NotificationCenterScreen';
import { AccountsNavigator } from './AccountsNavigator';
import { SharedFinanceNavigator } from './SharedFinanceNavigator';
import { GoalsListScreen } from '../screens/goals/GoalsListScreen';
import { GoalDetailScreen } from '../screens/goals/GoalDetailScreen';
import { DocumentVaultScreen } from '../screens/documents/DocumentVaultScreen';
import { DocumentDetailScreen } from '../screens/documents/DocumentDetailScreen';
import { BadgeWallScreen } from '../screens/documents/BadgeWallScreen';
import { AiInsightsScreen } from '../screens/ai/AiInsightsScreen';
import { RemindersScreen } from '../screens/reminders/RemindersScreen';
import { ReminderDetailScreen } from '../screens/reminders/ReminderDetailScreen';
import { CreateReminderScreen } from '../screens/reminders/CreateReminderScreen';
import { SmsDashboardScreen } from '../screens/sms/SmsDashboardScreen';
import { SmsPermissionScreen } from '../screens/sms/SmsPermissionScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
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
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { CoupleSpaceNavigator } from './CoupleSpaceNavigator';
import { CirclesNavigator } from './CirclesNavigator';
import { CategorySelectionScreen } from '../screens/expense/CategorySelectionScreen';
import { AddExpenseScreen } from '../screens/expense/AddExpenseScreen';
import { useTheme } from '../theme';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';
import { QuickActionSheet } from '../components/ui/QuickActionSheet';

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();
const RemindersStack = createNativeStackNavigator();
const SmsStack = createNativeStackNavigator();

function DashboardNavigator() {
  const { colors, typography } = useTheme();
  return (
    <DashboardStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontFamily: typography.calloutBold.fontFamily,
          fontSize: typography.calloutBold.fontSize,
          fontWeight: typography.calloutBold.fontWeight,
        },
        contentStyle: { backgroundColor: colors.bg.primary },
      }}
    >
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
    </DashboardStack.Navigator>
  );
}

function SettingsNavigator() {
  const { colors, typography } = useTheme();
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontFamily: typography.calloutBold.fontFamily,
          fontSize: typography.calloutBold.fontSize,
          fontWeight: typography.calloutBold.fontWeight,
        },
        contentStyle: { backgroundColor: colors.bg.primary },
      }}
    >
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
    </SettingsStack.Navigator>
  );
}

function RemindersNavigator() {
  const { colors, typography } = useTheme();
  return (
    <RemindersStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontFamily: typography.calloutBold.fontFamily,
          fontSize: typography.calloutBold.fontSize,
          fontWeight: typography.calloutBold.fontWeight,
        },
        contentStyle: { backgroundColor: colors.bg.primary },
      }}
    >
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
  const { colors, typography } = useTheme();
  return (
    <SmsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontFamily: typography.calloutBold.fontFamily,
          fontSize: typography.calloutBold.fontSize,
          fontWeight: typography.calloutBold.fontWeight,
        },
        contentStyle: { backgroundColor: colors.bg.primary },
      }}
    >
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
  const { user, accessToken } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) {
        return;
      }
      api
        .get<any>('/premium/check')
        .then((res) => {
          if (res?.isPremium) {
            setIsPremium(true);
          }
        })
        .catch(() => {});
    }, [accessToken]),
  );

  const quickActions = [
    {
      label: 'Add Expense',
      icon: 'add-circle-outline' as const,
      color: '#F97316',
      onPress: () => navigation.navigate('Expense', { screen: 'CategorySelection' }),
    },
    {
      label: 'Create Circle',
      icon: 'people-outline' as const,
      color: '#F97316',
      onPress: () => navigation.navigate('Circles', { screen: 'CreateCircle' }),
    },
    {
      label: 'Split Payment',
      icon: 'swap-horizontal-outline' as const,
      color: '#34C759',
      onPress: () => navigation.navigate('Circles', { screen: 'SplitExpense' }),
    },
    {
      label: 'Reports',
      icon: 'stats-chart-outline' as const,
      color: '#F3D28F',
      onPress: () => navigation.navigate('Settings', { screen: 'Reports' }),
    },
    {
      label: 'Couple Space',
      icon: 'heart-outline' as const,
      color: '#FF6B9D',
      onPress: () => navigation.navigate('Settings', { screen: 'CoupleSpace' }),
    },
    {
      label: 'Settle Up',
      icon: 'cash-outline' as const,
      color: '#34C759',
      onPress: () => navigation.navigate('Circles', { screen: 'Settlement' }),
    },
    {
      label: 'Add Goal',
      icon: 'trophy-outline' as const,
      color: '#F59E0B',
      onPress: () => navigation.navigate('Dashboard', { screen: 'GoalsList' }),
    },
  ];

  const isDark = theme.isDark;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => (
          <GlossyTabBar
            {...props}
            colors={colors}
            isDark={isDark}
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
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Expense"
          component={AccountsNavigator}
          options={{
            tabBarLabel: 'Expenses',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="QuickAction"
          component={View}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => null,
          }}
        />
        <Tab.Screen
          name="Spaces"
          component={SharedFinanceNavigator}
          options={{
            tabBarLabel: 'Spaces',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsNavigator}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            ),
          }}
        />
      </Tab.Navigator>

      <QuickActionSheet
        visible={showActions}
        onClose={() => setShowActions(false)}
        actions={quickActions}
      />
    </View>
  );
}

function GlossyTabBar({ state, descriptors, navigation, colors, isDark, onCenterPress }: any) {
  const routes = state.routes.filter((r: any) => r.name !== 'QuickAction');
  const centerIndex = state.routes.findIndex((r: any) => r.name === 'QuickAction');

  return (
    <View
      style={[
        tabStyles.outerWrapper,
        { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
      ]}
    >
      <View style={[tabStyles.blur, { backgroundColor: colors.bg.secondary }]}>
        <View
          style={[
            tabStyles.innerRow,
            { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
          ]}
        >
          {state.routes.map((route: any, index: number) => {
            const descriptor = descriptors[route.key];
            const { options } = descriptor;
            const isFocused = state.index === index;

            if (route.name === 'QuickAction') {
              return (
                <TouchableOpacity
                  key={route.key}
                  activeOpacity={0.8}
                  style={tabStyles.centerWrap}
                  onPress={onCenterPress}
                >
                  <View
                    style={[
                      tabStyles.centerBtn,
                      { backgroundColor: colors.accent.primary, borderColor: colors.brand.hover },
                    ]}
                  >
                    <Ionicons name="add" size={28} color="#FFF" />
                  </View>
                </TouchableOpacity>
              );
            }

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
                Settings: 'SettingsMain',
              };
              if (isFocused) {
                navigation.navigate(route.name, { screen: homeScreens[route.name] || route.name });
              } else {
                navigation.navigate(route.name, { screen: homeScreens[route.name] || route.name });
              }
            };

            const icon = options.tabBarIcon
              ? options.tabBarIcon({
                  focused: isFocused,
                  color: isFocused ? colors.accent.primary : colors.text.tertiary,
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
                <View
                  style={[
                    tabStyles.iconWrap,
                    isFocused && {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
                    },
                  ]}
                >
                  {icon}
                </View>
                <Text
                  style={[
                    tabStyles.label,
                    { color: isFocused ? colors.accent.primary : colors.text.tertiary },
                  ]}
                >
                  {options.tabBarLabel || route.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: Platform.OS === 'ios' ? 18 : 10,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  blur: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrap: {
    width: 40,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    marginTop: -16,
  },
  centerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
});
