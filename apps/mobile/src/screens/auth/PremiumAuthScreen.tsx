import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Keyboard, TouchableWithoutFeedback, ScrollView, Dimensions, ViewStyle } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumAuthLayout } from '../../components/ui/PremiumAuthLayout';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PADDING, borderRadius, shadows } from '../../theme/design';
import { typography as designTypo } from '../../theme';
import { palette } from '../../theme/colors';
import { API_URL } from '../../config/api';
import { useGoogleAuth, getGoogleIdToken, getGoogleError } from '../../services/google-auth';

type Tab = 'login' | 'signup';

interface PendingAuth {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string | null;
  };
  sessionId?: string;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TAB_BAR_H_PAD = PADDING * 2;
const TAB_WIDTH = (SCREEN_W - TAB_BAR_H_PAD - 8) / 2;

function createStyles(colors: typeof palette.dark, isDark: boolean) {
  return StyleSheet.create({
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: PADDING + 16,
      paddingTop: 16,
    },
    tabBarFixed: {
      position: 'absolute',
      left: PADDING,
      right: PADDING,
      top: PADDING,
      zIndex: 10,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.bg.glass,
      borderRadius: borderRadius.lg,
      padding: 4,
      position: 'relative',
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      zIndex: 2,
    },
    tabText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      letterSpacing: 0.3,
    },
    tabIndicator: {
      position: 'absolute',
      width: TAB_WIDTH,
      height: '100%',
      top: 0,
      left: 4,
      backgroundColor: colors.brand.primary,
      borderRadius: borderRadius.md,
      zIndex: 1,
      ...shadows.sm,
    },
    title: {
      ...designTypo.largeTitle,
      color: colors.text.primary,
    },
    subtitle: {
      fontSize: 15,
      color: colors.text.secondary,
      marginTop: 6,
      fontFamily: 'Inter-Regular',
      lineHeight: 22,
      marginBottom: PADDING,
    },
    form: {},
    nameRow: {
      flexDirection: 'row',
      gap: 10,
    },
    nameField: {
      flex: 1,
    },
    inputContainer: {
      height: 54,
      backgroundColor: colors.bg.secondary,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    input: {
      flex: 1,
      color: colors.text.primary,
      fontSize: 15,
      fontFamily: 'Inter-Regular',
      paddingVertical: 0,
    },
    inputIcon: {
      marginRight: 12,
    },
    iconBtn: {
      marginLeft: 8,
      padding: 2,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.status.errorLight,
      padding: 14,
      borderRadius: borderRadius.lg,
      marginBottom: 12,
      gap: 10,
    },
    errorText: {
      color: colors.status.error,
      fontSize: 13,
      fontFamily: 'Inter-Medium',
      flex: 1,
    },
    footnotes: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
      marginBottom: PADDING,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    checkboxActive: {
      backgroundColor: colors.brand.primary,
      borderColor: colors.brand.primary,
    },
    checkboxLabel: {
      color: colors.text.secondary,
      fontSize: 13,
      fontFamily: 'Inter-Medium',
    },
    forgotLink: {
      color: colors.text.link,
      fontSize: 13,
      fontFamily: 'Inter-Semibold',
    },
    primaryButton: {
      height: 56,
      backgroundColor: colors.brand.primary,
      borderRadius: borderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      ...shadows.md,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      letterSpacing: 0.3,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    switchText: {
      color: colors.text.secondary,
      fontSize: 13,
      fontFamily: 'Inter-Regular',
    },
    switchLink: {
      color: colors.text.link,
      fontSize: 13,
      fontFamily: 'Inter-SemiBold',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: PADDING,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border.subtle,
    },
    dividerText: {
      color: colors.text.tertiary,
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      marginHorizontal: 12,
    },
    googleButton: {
      height: 54,
      backgroundColor: colors.bg.secondary,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      ...shadows.sm,
    },
    googleButtonText: {
      color: colors.text.primary,
      fontSize: 15,
      fontFamily: 'Inter-SemiBold',
    },
    demoButton: {
      height: 54,
      backgroundColor: colors.brand.light,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border.active,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      marginTop: 10,
    },
    demoButtonText: {
      color: colors.brand.primary,
      fontSize: 15,
      fontFamily: 'Inter-SemiBold',
    },
    privacyRow: {
      alignItems: 'center',
      marginTop: PADDING,
    },
    privacyText: {
      color: colors.text.tertiary,
      fontSize: 12,
      fontFamily: 'Inter-Medium',
    },
  });
}

interface InputFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done';
  icon?: string;
  colors: typeof palette.dark;
  styles: ReturnType<typeof createStyles>;
}

const InputField = React.forwardRef<TextInput, InputFieldProps>(
  (
    {
      placeholder,
      value,
      onChangeText,
      secureTextEntry,
      keyboardType,
      autoCapitalize,
      onSubmitEditing,
      returnKeyType,
      icon,
      colors,
      styles,
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = secureTextEntry !== undefined;

    const borderColor = focused ? colors.border.default : colors.border.default;

    return (
      <View style={[styles.inputContainer, { borderColor }]}>
        {icon && (
          <AntDesign
            name={icon as any}
            size={18}
            color={focused ? colors.brand.primary : colors.text.tertiary}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          ref={ref}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'none'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />
        {isPassword && value.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AntDesign
              name={showPassword ? 'eyeo' : 'eye'}
              size={20}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
        )}
        {!isPassword && value.length > 0 && icon === undefined && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            style={styles.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AntDesign  name="closecircleo" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

function ErrorBox({ message, colors }: { message: string; colors: typeof palette.dark }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.status.errorLight,
        padding: 14,
        borderRadius: borderRadius.lg,
        marginBottom: 12,
        gap: 10,
      }}
    >
      <AntDesign  name="exclamationcircle" size={16} color={colors.status.error} />
      <Text
        style={{
          color: colors.status.error,
          fontSize: 13,
          fontFamily: 'Inter-Medium',
          flex: 1,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

function PrimaryButton({
  title,
  loading,
  onPress,
  colors,
}: {
  title: string;
  loading: boolean;
  onPress: () => void;
  colors: typeof palette.dark;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={
          {
            height: 56,
            backgroundColor: colors.brand.primary,
            borderRadius: borderRadius.xl,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 8,
            opacity: loading ? 0.6 : 1,
            ...shadows.md,
          } as ViewStyle
        }
        onPress={onPress}
        disabled={loading}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.97,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }).start()
        }
        activeOpacity={1}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontFamily: 'Inter-SemiBold',
            letterSpacing: 0.3,
          }}
        >
          {loading ? 'Please wait...' : title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function PremiumAuthScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { login, register, googleLogin, demoLogin, completeAuth } = useAuth();
  const { response, promptAsync } = useGoogleAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>(route.params?.tab || 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const pendingAuthRef = useRef<PendingAuth | null>(null);
  const indicatorX = useRef(new Animated.Value(tab === 'login' ? 0 : TAB_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const loginEmailRef = useRef<TextInput>(null);
  const loginPwRef = useRef<TextInput>(null);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const signupEmailRef = useRef<TextInput>(null);
  const signupPwRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    if (!response) {
      return;
    }
    const idToken = getGoogleIdToken(response);
    if (idToken) {
      handleGoogleLogin(idToken);
    } else {
      const errMsg = getGoogleError(response);
      if (errMsg) {
        setError(errMsg);
        setLoading(false);
      }
    }
  }, [response]);

  useEffect(() => {
    const emailVerified = route.params?.emailVerified;
    if (emailVerified && pendingAuthRef.current) {
      const p = pendingAuthRef.current;
      pendingAuthRef.current = null;
      navigation.setParams({ emailVerified: undefined });
      completeAuth(p.accessToken, p.user, false);
    }
  }, [route.params?.emailVerified]);

  const switchTab = useCallback(
    (next: Tab) => {
      if (next === tab) {
        return;
      }
      setTab(next);
      setError('');
      Keyboard.dismiss();

      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(indicatorX, {
          toValue: next === 'login' ? 0 : TAB_WIDTH,
          friction: 9,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [tab, indicatorX, fadeAnim],
  );

  async function handleGoogleLogin(idToken: string) {
    setLoading(true);
    setError('');
    try {
      await googleLogin(idToken);
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(loginEmail.trim(), loginPassword);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (
      !firstName.trim() ||
      !signupEmail.trim() ||
      !signupPassword.trim() ||
      !confirmPassword.trim()
    ) {
      setError('Please fill in all fields');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body: Record<string, any> = {
        email: signupEmail.trim(),
        password: signupPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      body.deviceName = 'iPhone';
      body.platform = 'ios';

      const registerRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!registerRes.ok) {
        const err = await registerRes.json().catch(() => ({}));
        throw new Error(
          Array.isArray(err?.message) ? err?.message[0] : err?.message || 'Registration failed',
        );
      }

      const registerJson = await registerRes.json();
      const registerData = registerJson?.data;
      if (!registerData?.user || !registerData?.tokens) {
        throw new Error('Invalid server response');
      }

      const { user, tokens } = registerData;
      pendingAuthRef.current = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
        sessionId: tokens.sessionId,
      };
      fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail.trim(), purpose: 'email_verification' }),
      }).catch(() => {});
    } catch (e: any) {
      setError(e.message || 'Registration failed');
      setLoading(false);
      return;
    }
    setLoading(false);
    navigation.navigate(
      'OtpVerification' as never,
      {
        email: signupEmail.trim(),
        purpose: 'email_verification',
      } as never,
    );
  }

  const TAB_BAR_HEIGHT = 52;

  return (
    <PremiumAuthLayout>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <View style={styles.tabBarFixed}>
            <View style={styles.tabBar}>
              <Animated.View
                style={[styles.tabIndicator, { transform: [{ translateX: indicatorX }] }]}
              />
              <TouchableOpacity
                style={styles.tab}
                onPress={() => switchTab('login')}
                activeOpacity={0.7}
              >
                <Animated.Text
                  key={`login-tab-${isDark}`}
                  style={[
                    styles.tabText,
                    {
                      color: indicatorX.interpolate({
                        inputRange: [0, TAB_WIDTH],
                        outputRange: [colors.text.primary, colors.text.tertiary],
                      }),
                    },
                  ]}
                >
                  Sign In
                </Animated.Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => switchTab('signup')}
                activeOpacity={0.7}
              >
                <Animated.Text
                  key={`signup-tab-${isDark}`}
                  style={[
                    styles.tabText,
                    {
                      color: indicatorX.interpolate({
                        inputRange: [0, TAB_WIDTH],
                        outputRange: [colors.text.tertiary, colors.text.primary],
                      }),
                    },
                  ]}
                >
                  Sign Up
                </Animated.Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: PADDING + 16 + insets.bottom },
            ]}
          >
            <View style={{ height: PADDING + TAB_BAR_HEIGHT + PADDING }} />

            <Animated.View style={{ opacity: fadeAnim }}>
              {tab === 'login' ? (
                <>
                  <Text style={styles.title}>Welcome Back</Text>
                  <Text style={styles.subtitle}>Sign in to manage your shared finances</Text>

                  <View style={styles.form}>
                    <InputField
                      ref={loginEmailRef}
                      placeholder="Email address"
                      value={loginEmail}
                      onChangeText={setLoginEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => loginPwRef.current?.focus()}
                      icon="mail"
                      colors={colors}
                      styles={styles}
                    />
                    <InputField
                      ref={loginPwRef}
                      placeholder="Password"
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      icon="lock"
                      colors={colors}
                      styles={styles}
                    />

                    {error ? <ErrorBox message={error} colors={colors} /> : null}

                    <View style={styles.footnotes}>
                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setRememberMe(!rememberMe)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                          {rememberMe && (
                            <AntDesign  name="check" size={12} color={colors.text.inverse} />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>Remember me</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={styles.forgotLink}>Forgot password?</Text>
                      </TouchableOpacity>
                    </View>

                    <PrimaryButton
                      title="Let's Start"
                      loading={loading}
                      onPress={handleLogin}
                      colors={colors}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.title}>Create Account</Text>
                  <Text style={styles.subtitle}>
                    Start splitting expenses with family and friends
                  </Text>

                  <View style={styles.form}>
                    <View style={styles.nameRow}>
                      <View style={styles.nameField}>
                        <InputField
                          ref={firstNameRef}
                          placeholder="First name"
                          value={firstName}
                          onChangeText={setFirstName}
                          autoCapitalize="words"
                          returnKeyType="next"
                          onSubmitEditing={() => lastNameRef.current?.focus()}
                          icon="user"
                          colors={colors}
                          styles={styles}
                        />
                      </View>
                      <View style={styles.nameField}>
                        <InputField
                          ref={lastNameRef}
                          placeholder="Last name"
                          value={lastName}
                          onChangeText={setLastName}
                          autoCapitalize="words"
                          returnKeyType="next"
                          onSubmitEditing={() => signupEmailRef.current?.focus()}
                          colors={colors}
                          styles={styles}
                        />
                      </View>
                    </View>
                    <InputField
                      ref={signupEmailRef}
                      placeholder="Email address"
                      value={signupEmail}
                      onChangeText={setSignupEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => signupPwRef.current?.focus()}
                      icon="mail"
                      colors={colors}
                      styles={styles}
                    />
                    <InputField
                      ref={signupPwRef}
                      placeholder="Password"
                      value={signupPassword}
                      onChangeText={setSignupPassword}
                      secureTextEntry
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                      icon="lock"
                      colors={colors}
                      styles={styles}
                    />
                    <InputField
                      ref={confirmRef}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleSignup}
                      icon="lock"
                      colors={colors}
                      styles={styles}
                    />

                    {error ? <ErrorBox message={error} colors={colors} /> : null}

                    <PrimaryButton
                      title="Create Account"
                      loading={loading}
                      onPress={handleSignup}
                      colors={colors}
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => switchTab('login')}>
                      <Text style={styles.switchLink}>Sign In</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Animated.View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                Or {tab === 'login' ? 'Log In' : 'Sign Up'} With
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => promptAsync()}
              disabled={loading}
              activeOpacity={0.8}
            >
              <AntDesign  name="google" size={20} color={colors.text.secondary} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={async () => {
                setLoading(true);
                setError('');
                try {
                  await demoLogin();
                } catch (e: any) {
                  setError(e.message || 'Demo login failed');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              activeOpacity={0.8}
            >
              <AntDesign name="rocket1" size={20} color={colors.brand.primary}  />
              <Text style={styles.demoButtonText}>Demo Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.privacyRow}
              onPress={() => navigation.navigate('Privacy')}
              activeOpacity={0.7}
            >
              <Text style={styles.privacyText}>Privacy Policy</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </PremiumAuthLayout>
  );
}
