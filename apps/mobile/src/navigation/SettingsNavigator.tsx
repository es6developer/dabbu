import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { AvatarPickerScreen } from '../screens/settings/AvatarPickerScreen';
import { SecurityScreen } from '../screens/settings/SecurityScreen';
import { PremiumScreen } from '../screens/premium/PremiumScreen';
import { SubscriptionCenterScreen } from '../screens/premium/SubscriptionCenterScreen';
import { BillingHistoryScreen } from '../screens/premium/BillingHistoryScreen';
import { CancellationScreen } from '../screens/premium/CancellationScreen';
import { ReferralScreen } from '../screens/referral/ReferralScreen';
import { ThemeScreen } from '../screens/settings/ThemeScreen';
import { HelpCenterScreen } from '../screens/settings/HelpCenterScreen';
import { ContactUsScreen } from '../screens/settings/ContactUsScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { NotificationSettingsScreen } from '../screens/settings/NotificationSettingsScreen';
import { FavoriteContactsScreen } from '../screens/settings/FavoriteContactsScreen';
import { AddPartnerScreen } from '../screens/settings/AddPartnerScreen';
import { DataExportScreen } from '../screens/settings/DataExportScreen';
import { SupportScreen } from '../screens/settings/SupportScreen';
import { CustomiseDashboardScreen } from '../screens/settings/CustomiseDashboardScreen';
import { CustomiseBottomMenuScreen } from '../screens/settings/CustomiseBottomMenuScreen';

const Stack = createNativeStackNavigator();

export function SettingsNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="AvatarPicker" component={AvatarPickerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
      <Stack.Screen name="Premium" component={PremiumScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SubscriptionCenter" component={SubscriptionCenterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BillingHistory" component={BillingHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Cancellation" component={CancellationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Theme" component={ThemeScreen} options={{ title: 'Theme' }} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ title: 'Help Center' }} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} options={{ title: 'Contact Us' }} />
      <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Favorites" component={FavoriteContactsScreen} options={{ title: 'Favorites' }} />
      <Stack.Screen name="AddPartner" component={AddPartnerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DataExport" component={DataExportScreen} options={{ title: 'Export Data' }} />
      <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
      <Stack.Screen name="CustomiseDashboard" component={CustomiseDashboardScreen} options={{ title: 'Customize Dashboard' }} />
      <Stack.Screen name="CustomiseBottomMenu" component={CustomiseBottomMenuScreen} options={{ title: 'Customize Menu' }} />
    </Stack.Navigator>
  );
}
