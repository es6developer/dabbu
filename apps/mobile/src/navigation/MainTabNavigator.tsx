import React, { useState, useCallback } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/home/DashboardScreen';
import { NotificationsScreen } from '../screens/home/NotificationsScreen';
import { NotificationCenterScreen } from '../screens/home/NotificationCenterScreen';
import { AccountsNavigator } from './AccountsNavigator';
import { SharedFinanceNavigator } from './SharedFinanceNavigator';
import { GoalsListScreen } from '../screens/goals/GoalsListScreen';
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
import { ThemeScreen } from '../screens/settings/ThemeScreen';
import { CurrencyScreen } from '../screens/settings/CurrencyScreen';
import { HelpCenterScreen } from '../screens/settings/HelpCenterScreen';
import { ContactUsScreen } from '../screens/settings/ContactUsScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { CustomiseDashboardScreen } from '../screens/settings/CustomiseDashboardScreen';
import { CustomiseBottomMenuScreen } from '../screens/settings/CustomiseBottomMenuScreen';
import { useTheme } from '../theme';
import { isFeatureEnabled, isPremiumFeature, loadFeatures } from '../config/features';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();
const RemindersStack = createNativeStackNavigator();
const SmsStack = createNativeStackNavigator();

const TAB_ICONS: Record<
  string,
  { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }
> = {
  Dashboard: { focused: 'compass', unfocused: 'compass-outline' },
  Accounts: { focused: 'receipt', unfocused: 'receipt-outline' },
  Shared: { focused: 'grid', unfocused: 'grid-outline' },
  Goals: { focused: 'trophy', unfocused: 'trophy-outline' },
  Reminders: { focused: 'notifications', unfocused: 'notifications-outline' },
  SMS: { focused: 'chatbubbles', unfocused: 'chatbubbles-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

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
        component={DashboardScreen}
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
        name="Currency"
        component={CurrencyScreen}
        options={{ title: 'Currency' }}
      />
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
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Reports' }}
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

interface TabConfig {
  name: string;
  component: React.ComponentType<any>;
  title: string;
  premium?: boolean;
  featureKey?: string;
}

const ALL_TABS: TabConfig[] = [
  { name: 'Dashboard', component: DashboardNavigator, title: 'Dashboard' },
  { name: 'Accounts', component: AccountsNavigator, title: 'Expenses' },
  { name: 'Shared', component: SharedFinanceNavigator, title: 'Spaces' },
  { name: 'Goals', component: GoalsListScreen, title: 'Goals' },
  { name: 'Reminders', component: RemindersNavigator, title: 'Reminders' },
  { name: 'SMS', component: SmsNavigator, title: 'SMS', featureKey: 'sms_sync' },
  { name: 'Settings', component: SettingsNavigator, title: 'Settings' },
];

import { API_URL } from '../config/api';

export function MainTabNavigator() {
  const { colors, isDark, typography } = useTheme();
  const { user, accessToken } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [bottomMenuConfig, setBottomMenuConfig] = useState<any[]>([]);

  const loadPreferences = useCallback(() => {
    if (!accessToken) {
      return;
    }
    loadFeatures();
    api
      .get<any>('/premium/check')
      .then((res) => {
        if (res?.isPremium) {
          setSubscription({ plan: { price: 1 } });
        }
      })
      .catch(() => {});
    api
      .get<any>('/user/preferences')
      .then((res) => {
        if (res?.bottomMenuConfig) {
          setBottomMenuConfig(res.bottomMenuConfig);
        }
      })
      .catch(() => {});
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences]),
  );

  const planPrice: number = Number(subscription?.plan?.price || 0);
  const isPremium = planPrice > 0;

  const getTabOrder = useCallback(() => {
    if (bottomMenuConfig.length === 0) {
      return ALL_TABS;
    }
    const configMap = new Map(bottomMenuConfig.map((c: any) => [c.id, c]));
    const configured = ALL_TABS.filter((tab) => {
      const cfg = configMap.get(tab.name);
      return cfg ? cfg.visible !== false : true;
    }).sort((a, b) => {
      const aCfg = configMap.get(a.name);
      const bCfg = configMap.get(b.name);
      return (aCfg?.order ?? 99) - (bCfg?.order ?? 99);
    });
    const settingsTab = ALL_TABS.find((t) => t.name === 'Settings');
    if (settingsTab && !configured.some((t) => t.name === 'Settings')) {
      configured.push(settingsTab);
    }
    return configured;
  }, [bottomMenuConfig]);

  const visibleTabs = getTabOrder().filter((tab) => {
    if (tab.name === 'SMS' && Platform.OS === 'ios') {
      return false;
    }
    if (tab.featureKey) {
      if (isPremiumFeature(tab.featureKey as any) && !isPremium) {
        return false;
      }
      if (!isFeatureEnabled(tab.featureKey as any)) {
        return false;
      }
    }
    if (tab.premium && !isPremium) {
      return false;
    }
    return true;
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconColor = focused ? colors.accent.primary : colors.text.tertiary;
          return (
            <Ionicons
              name={focused ? icons.focused : icons.unfocused}
              size={focused ? size : size - 2}
              color={iconColor}
            />
          );
        },
        tabBarStyle: {
          backgroundColor: colors.bg.secondary,
          borderTopWidth: 0,
          borderCurve: 'continuous',
          height: 52,
          paddingBottom: 0,
          paddingHorizontal: 4,
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          borderRadius: 16,
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '500' },
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { ...typography.calloutBold },
      })}
    >
      {visibleTabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            headerShown: false,
            title: tab.title,
            tabBarStyle:
              tab.name === 'SMS' && Platform.OS === 'ios' ? { display: 'none' } : undefined,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({});
