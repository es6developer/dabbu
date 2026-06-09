import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { PremiumLoginScreen } from '../screens/auth/PremiumLoginScreen';
import { PremiumSignupScreen } from '../screens/auth/PremiumSignupScreen';
import { PremiumOtpScreen } from '../screens/auth/PremiumOtpScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { BiometricSetupScreen } from '../screens/auth/BiometricSetupScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';

export type AuthStackParamList = {
  Onboarding: { referralCode?: string } | undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
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
      <Stack.Screen name="Login" component={PremiumLoginScreen} />
      <Stack.Screen name="Signup" component={PremiumSignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="OtpVerification" component={PremiumOtpScreen} />
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
      <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}
