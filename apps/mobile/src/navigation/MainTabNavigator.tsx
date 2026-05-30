import React, { useState, useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/home/DashboardScreen';
import { NotificationsScreen } from '../screens/home/NotificationsScreen';
import { NotificationCenterScreen } from '../screens/home/NotificationCenterScreen';
import { AccountsNavigator } from './AccountsNavigator';

import { SharedFinanceNavigator } from './SharedFinanceNavigator';
import { RemindersScreen } from '../screens/reminders/RemindersScreen';
import { ReminderDetailScreen } from '../screens/reminders/ReminderDetailScreen';
import { CreateReminderScreen } from '../screens/reminders/CreateReminderScreen';
import { SmsDashboardScreen } from '../screens/sms/SmsDashboardScreen';
import { SmsPermissionScreen } from '../screens/sms/SmsPermissionScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { SecurityScreen } from '../screens/settings/SecurityScreen';
import { SubscriptionScreen } from '../screens/subscriptions/SubscriptionScreen';
import { BillingHistoryScreen } from '../screens/subscriptions/BillingHistoryScreen';
import { ThemeScreen } from '../screens/settings/ThemeScreen';
import { CurrencyScreen } from '../screens/settings/CurrencyScreen';
import { HelpCenterScreen } from '../screens/settings/HelpCenterScreen';
import { ContactUsScreen } from '../screens/settings/ContactUsScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { useTheme } from '../theme';
import { isFeatureEnabled, isPremiumFeature, loadFeatures } from '../config/features';
import { useAuth } from '../store/AuthContext';


const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();
const RemindersStack = createNativeStackNavigator();
const SmsStack = createNativeStackNavigator();

const TAB_ICONS: Record<
  string,
  { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }
> = {
  Dashboard: { focused: 'grid', unfocused: 'grid-outline' },
  Accounts: { focused: 'wallet', unfocused: 'wallet-outline' },
  Shared: { focused: 'people', unfocused: 'people-outline' },
  Reminders: { focused: 'alarm', unfocused: 'alarm-outline' },
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
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Subscription' }}
      />
      <SettingsStack.Screen
        name="BillingHistory"
        component={BillingHistoryScreen}
        options={{ title: 'Billing History' }}
      />
      <SettingsStack.Screen
        name="Security"
        component={SecurityScreen}
        options={{ title: 'Security' }}
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
  { name: 'Shared', component: SharedFinanceNavigator, title: 'Split' },
  { name: 'Reminders', component: RemindersNavigator, title: 'Reminders' },
  { name: 'SMS', component: SmsNavigator, title: 'SMS', featureKey: 'sms_sync' },
  { name: 'Settings', component: SettingsNavigator, title: 'Settings' },
];

import { API_URL } from '../config/api';

export function MainTabNavigator() {
  const { colors, isDark, typography} = useTheme();
  const { user, accessToken } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    loadFeatures();
    fetch(`${API_URL}/subscription/current`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((json) => setSubscription(json.data))
      .catch(() => setSubscription(null));
  }, [accessToken]);

  const planPrice: number = Number(subscription?.plan?.price || 0);
  const isPremium = planPrice > 0;

  const visibleTabs = ALL_TABS.filter((tab) => {
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
            <View style={focused ? styles.tabIconActive : null}>
              <Ionicons
                name={focused ? icons.focused : icons.unfocused}
                size={size}
                color={iconColor}
              />
            </View>
          );
        },
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(18,18,26,0.92)' : 'rgba(255,255,255,0.92)',
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          borderTopWidth: 1,
          paddingTop: 8,
          height: 85,
          paddingBottom: 28,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
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
            tabBarStyle: tab.name === 'SMS' && Platform.OS === 'ios'
              ? { display: 'none' }
              : undefined,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconActive: {
    marginTop: -2,
  },
});
