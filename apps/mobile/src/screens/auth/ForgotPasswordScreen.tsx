import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../store/ToastContext';
import { useLastLensLogo } from '../../hooks/useLastLensLogo';
import { AuthInput } from '../../components/ui/AuthInput';
import { AuthButton } from '../../components/ui/AuthButton';
import { useTheme } from '../../theme';
import { palette } from '../../theme/colors';

function createStyles(colors: typeof palette.dark, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg.primary,
    },
    scrollContent: {
      flexGrow: 1,
    },
    viewingArea: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.bg.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      alignSelf: 'flex-start',
    },
    logoContainer: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.bg.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    logo: {
      width: 36,
      height: 36,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '400',
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    interactionArea: {
      flex: 1,
      paddingHorizontal: 24,
    },
    formCard: {
      backgroundColor: colors.bg.secondary,
      borderRadius: 24,
      padding: 24,
      marginBottom: 4,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.status.errorLight,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.status.error,
      flex: 1,
    },
    signInButton: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    signInText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text.link,
    },
  });
}

export function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const logoSource = useLastLensLogo();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  async function handleSendOtp() {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { email: email.trim(), purpose: 'password_reset' });
      showToast('OTP sent successfully');
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (e: any) {
      setError(e.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }}>
            <View style={[styles.viewingArea, { paddingTop: insets.top + 40 }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Image source={logoSource} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a verification code.
              </Text>
            </View>

            <View style={styles.interactionArea}>
              <View style={styles.formCard}>
                <AuthInput
                  placeholder="Email address"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleSendOtp}
                />

                {error ? (
                  <View style={styles.errorBox}>
                    <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <AuthButton
                  title="Send Verification Code"
                  onPress={handleSendOtp}
                  loading={loading}
                />
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.signInButton}
              >
                <Text style={styles.signInText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}
