import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { PremiumAuthScreen } from '../screens/auth/PremiumAuthScreen';
import { PremiumOtpScreen } from '../screens/auth/PremiumOtpScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { BiometricSetupScreen } from '../screens/auth/BiometricSetupScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';

export type AuthStackParamList = {
  Onboarding: { referralCode?: string } | undefined;
  Login: { tab?: 'login' | 'signup' } | undefined;
  Signup: { tab?: 'login' | 'signup' } | undefined;
  ForgotPassword: undefined;
  OtpVerification: { email: string; purpose: 'email_verification' | 'password_reset' | 'login' };
  BiometricSetup: undefined;
  Privacy: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator(): React.ReactElement | null {
  const { colors } = useTheme();
  const [route, setRoute] = useState<'Onboarding' | 'Login' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then((val) => {
      setRoute(val === 'true' ? 'Login' : 'Onboarding');
    });
  }, []);

  if (!route) {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={route}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg.primary },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={PremiumAuthScreen} initialParams={{ tab: 'login' }} />
      <Stack.Screen name="Signup" component={PremiumAuthScreen} initialParams={{ tab: 'signup' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="OtpVerification" component={PremiumOtpScreen} />
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
      <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}
