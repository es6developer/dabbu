import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PremiumAuthLayout } from '../../components/ui/PremiumAuthLayout';
import { useAuth } from '../../store/AuthContext';
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
const TAB_BAR_H_PAD = 48;
const TAB_WIDTH = (SCREEN_W - TAB_BAR_H_PAD - 8) / 2;

export function PremiumAuthScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { login, register, googleLogin, demoLogin, completeAuth } = useAuth();
  const { response, promptAsync } = useGoogleAuth();
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
        throw new Error(err?.message?.[0] || err?.message || 'Registration failed');
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

  const tabBarHeight = SCREEN_H * 0.2;

  return (
    <PremiumAuthLayout>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          {/* Fixed tab bar at 20% from top */}
          <View style={[styles.tabBarFixed, { top: tabBarHeight }]}>
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
                  style={[
                    styles.tabText,
                    {
                      color: indicatorX.interpolate({
                        inputRange: [0, TAB_WIDTH],
                        outputRange: ['#FFFFFF', '#8E8E93'],
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
                  style={[
                    styles.tabText,
                    {
                      color: indicatorX.interpolate({
                        inputRange: [0, TAB_WIDTH],
                        outputRange: ['#8E8E93', '#FFFFFF'],
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
            contentContainerStyle={styles.scrollContent}
          >
            {/* Spacer so scroll content starts below the fixed tab bar */}
            <View style={{ height: tabBarHeight + 60 }} />

            {/* Active form */}
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
                      icon="mail-outline"
                    />
                    <InputField
                      ref={loginPwRef}
                      placeholder="Password"
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      icon="lock-closed-outline"
                    />

                    {error ? <ErrorBox message={error} /> : null}

                    <View style={styles.footnotes}>
                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setRememberMe(!rememberMe)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                          {rememberMe && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                        </View>
                        <Text style={styles.checkboxLabel}>Remember me</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={styles.forgotLink}>Forgot password?</Text>
                      </TouchableOpacity>
                    </View>

                    <PrimaryButton title="Let's Start" loading={loading} onPress={handleLogin} />
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
                          icon="person-outline"
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
                      icon="mail-outline"
                    />
                    <InputField
                      ref={signupPwRef}
                      placeholder="Password"
                      value={signupPassword}
                      onChangeText={setSignupPassword}
                      secureTextEntry
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                      icon="lock-closed-outline"
                    />
                    <InputField
                      ref={confirmRef}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleSignup}
                      icon="lock-closed-outline"
                    />

                    {error ? <ErrorBox message={error} /> : null}

                    <PrimaryButton
                      title="Create Account"
                      loading={loading}
                      onPress={handleSignup}
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

            {/* Divider + Google + Demo + Privacy */}
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
              <Ionicons name="logo-google" size={20} color="#FFFFFF" />
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
              <Ionicons name="rocket-outline" size={20} color="#F3D28F" />
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

/* ─── Sub-components ─── */

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
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = secureTextEntry !== undefined;

    return (
      <View
        style={[
          styles.inputContainer,
          { borderColor: focused ? '#F3D28F' : 'rgba(255,255,255,0.06)' },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon as any}
            size={18}
            color={focused ? '#F3D28F' : '#636366'}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          ref={ref}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#636366"
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
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#8E8E93"
            />
          </TouchableOpacity>
        )}
        {!isPassword && value.length > 0 && !icon && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            style={styles.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={16} color="#FF4545" />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function PrimaryButton({
  title,
  loading,
  onPress,
}: {
  title: string;
  loading: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.primaryButton, loading && { opacity: 0.6 }]}
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
        <View style={styles.buttonGlow} />
        <Text style={styles.primaryButtonText}>{loading ? 'Please wait...' : title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  content: { flex: 1 },
  scrollContent: { paddingBottom: 32, paddingTop: 16 },

  tabBarFixed: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 4,
    position: 'relative',
  },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', zIndex: 2 },
  tabText: { fontSize: 14, fontFamily: 'Inter-SemiBold', letterSpacing: 0.3 },
  tabIndicator: {
    position: 'absolute',
    width: TAB_WIDTH,
    height: '100%',
    top: 0,
    left: 4,
    backgroundColor: '#F3D28F',
    borderRadius: 11,
    zIndex: 1,
  },

  title: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 5,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 24,
  },

  form: {},
  nameRow: { flexDirection: 'row', gap: 10 },
  nameField: { flex: 1 },
  inputContainer: {
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    paddingVertical: 0,
  },
  inputIcon: { marginRight: 10 },
  iconBtn: { marginLeft: 8, padding: 2 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,69,69,0.10)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorText: { color: '#FF4545', fontSize: 13, fontFamily: 'Inter-Medium', flex: 1 },

  footnotes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxActive: { backgroundColor: '#F3D28F', borderColor: '#F3D28F' },
  checkboxLabel: { color: '#8E8E93', fontSize: 13, fontFamily: 'Inter-Medium' },
  forgotLink: { color: '#F3D28F', fontSize: 13, fontFamily: 'Inter-Medium' },

  primaryButton: {
    height: 54,
    backgroundColor: '#F3D28F',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  buttonGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
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
    marginTop: 10,
    marginBottom: 4,
  },
  switchText: { color: '#8E8E93', fontSize: 13, fontFamily: 'Inter-Regular' },
  switchLink: { color: '#F3D28F', fontSize: 13, fontFamily: 'Inter-SemiBold' },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  dividerText: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginHorizontal: 12,
  },

  googleButton: {
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  googleButtonText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter-SemiBold' },

  demoButton: {
    height: 52,
    backgroundColor: 'rgba(255,107,0,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.2)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  demoButtonText: { color: '#F3D28F', fontSize: 15, fontFamily: 'Inter-SemiBold' },

  privacyRow: { alignItems: 'center', marginTop: 20 },
  privacyText: { color: '#8E8E93', fontSize: 12, fontFamily: 'Inter-Medium', opacity: 0.6 },
});
