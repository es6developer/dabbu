import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { PremiumLoginScreen } from '../screens/auth/PremiumLoginScreen';
import { PremiumSignupScreen } from '../screens/auth/PremiumSignupScreen';
import { PremiumOtpScreen } from '../screens/auth/PremiumOtpScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { BiometricSetupScreen } from '../screens/auth/BiometricSetupScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { PremiumAuthScreen } from '../screens/auth/PremiumAuthScreen';
import { OtpVerificationScreen } from '../screens/auth/OtpVerificationScreen';
import { PinSetupScreen } from '../screens/auth/PinSetupScreen';

export type AuthStackParamList = {
  Onboarding: { referralCode?: string } | undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  OtpVerification: { email: string; purpose: 'email_verification' | 'password_reset' | 'login' };
  BiometricSetup: undefined;
  Privacy: undefined;
  PremiumAuth: undefined;
  OtpVerificationLegacy: { email: string; purpose: string };
  PinSetup: { onComplete?: () => void } | undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator(): React.ReactElement | null {
  const theme = useTheme();
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
      screenOptions={{ ...iosTransitionOptions(theme), headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen
        name="Login"
        component={PremiumLoginScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Signup" component={PremiumSignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="OtpVerification" component={PremiumOtpScreen} />
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
      <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="PremiumAuth" component={PremiumAuthScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="OtpVerificationLegacy" component={OtpVerificationScreen} />
      <Stack.Screen name="PinSetup" component={PinSetupScreen} />
    </Stack.Navigator>
  );
}
