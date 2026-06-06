import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
      <SettingsStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
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
  const { colors } = useTheme();
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
      color: '#00A86B',
      onPress: () => navigation.navigate('Expense', { screen: 'CreateTransaction' }),
    },
    {
      label: 'Scan Bill',
      icon: 'scan-outline' as const,
      color: '#E85D04',
      onPress: () => navigation.navigate('Expense', { screen: 'BillScanner' }),
    },
    {
      label: 'New Group',
      icon: 'people-outline' as const,
      color: '#5B5FE8',
      onPress: () => navigation.navigate('Spaces', { screen: 'CreateSharedGroup' }),
    },
    {
      label: 'Transfer',
      icon: 'swap-horizontal-outline' as const,
      color: '#8A5CF6',
      onPress: () => navigation.navigate('Spaces', { screen: 'WalletTransfer' }),
    },
    {
      label: 'Document',
      icon: 'folder-open-outline' as const,
      color: '#F7892C',
      onPress: () => navigation.navigate('DocumentVault'),
    },
    {
      label: 'Reminder',
      icon: 'alarm-outline' as const,
      color: '#0B84A5',
      onPress: () => navigation.navigate('Reminders', { screen: 'CreateReminder' }),
    },
    {
      label: 'Add Goal',
      icon: 'trophy-outline' as const,
      color: '#FDCB6E',
      onPress: () => navigation.navigate('Dashboard', { screen: 'GoalsList' }),
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: colors.bg.secondary,
            borderTopWidth: 0,
            borderCurve: 'continuous' as any,
            height: 60,
            paddingBottom: 6,
            paddingTop: 6,
            paddingHorizontal: 8,
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 12,
            borderRadius: 20,
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
          },
          tabBarActiveTintColor: colors.accent.primary,
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardNavigator}
          options={{
            title: 'Home',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={size}
                color={focused ? colors.accent.primary : colors.text.tertiary}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Expense"
          component={AccountsNavigator}
          options={{
            title: 'Expense',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? 'wallet' : 'wallet-outline'}
                size={size}
                color={focused ? colors.accent.primary : colors.text.tertiary}
              />
            ),
          }}
        />
        <Tab.Screen
          name="QuickAction"
          component={View}
          options={{
            title: '',
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                activeOpacity={0.85}
                style={styles.centerBtn}
                onPress={() => setShowActions(true)}
              >
                <LinearGradient
                  colors={[colors.accent.primary, colors.accent.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.centerBtnGradient}
                >
                  <Ionicons name="add" size={28} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            ),
          }}
        />
        <Tab.Screen
          name="Spaces"
          component={SharedFinanceNavigator}
          options={{
            title: 'Spaces',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={size}
                color={focused ? colors.accent.primary : colors.text.tertiary}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsNavigator}
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={size}
                color={focused ? colors.accent.primary : colors.text.tertiary}
              />
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

const styles = StyleSheet.create({
  centerBtn: {
    top: -16,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#F7892C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  centerBtnGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
