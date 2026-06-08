import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PremiumAuthLayout } from '../../components/ui/PremiumAuthLayout';
import { useAuth } from '../../store/AuthContext';
import { useGoogleAuth, getGoogleIdToken, getGoogleError } from '../../services/google-auth';

type Tab = 'login' | 'signup';

export function PremiumAuthScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { login, register, googleLogin, demoLogin } = useAuth();
  const { response, promptAsync } = useGoogleAuth();
  const [tab, setTab] = useState<Tab>(route.params?.tab || 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Signup fields
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorLeft = useRef(new Animated.Value(0)).current;
  const tabWidth = 0;

  const emailRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);
  const signupEmailRef = useRef<TextInput>(null);
  const signupPwRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!response) return;
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

  function switchTab(next: Tab) {
    if (next === tab) return;
    setTab(next);
    setError('');
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: next === 'login' ? 0 : 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }

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
    if (!name.trim() || !signupEmail.trim() || !signupPassword.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const parts = name.trim().split(' ');
    setLoading(true);
    setError('');
    try {
      await register(signupEmail.trim(), signupPassword, parts[0], parts.slice(1).join(' '));
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const loginOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });
  const signupOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });
  const loginTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });
  const signupTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  return (
    <PremiumAuthLayout>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          {/* Tab bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => switchTab('login')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => switchTab('signup')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  transform: [{
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 140],
                    }),
                  }],
                },
              ]}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Login form */}
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: loginOpacity,
                  transform: [{ translateY: loginTranslateY }],
                },
              ]}
              pointerEvents={tab === 'login' ? 'auto' : 'none'}
            >
              <InputField
                placeholder="Email address"
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
              />
              <InputField
                ref={pwRef}
                placeholder="Password"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              {error && tab === 'login' ? (
                <ErrorBox message={error} />
              ) : null}

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

              <PrimaryButton
                title="Let's Start"
                loading={loading && tab === 'login'}
                onPress={handleLogin}
              />
            </Animated.View>

            {/* Signup form */}
            <Animated.View
              style={[
                styles.formContainer,
                styles.formOverlay,
                {
                  opacity: signupOpacity,
                  transform: [{ translateY: signupTranslateY }],
                },
              ]}
              pointerEvents={tab === 'signup' ? 'auto' : 'none'}
            >
              <InputField
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => signupEmailRef.current?.focus()}
              />
              <InputField
                ref={signupEmailRef}
                placeholder="Email address"
                value={signupEmail}
                onChangeText={setSignupEmail}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => signupPwRef.current?.focus()}
              />
              <InputField
                ref={signupPwRef}
                placeholder="Password"
                value={signupPassword}
                onChangeText={setSignupPassword}
                secureTextEntry
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <InputField
                ref={confirmRef}
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />

              {error && tab === 'signup' ? (
                <ErrorBox message={error} />
              ) : null}

              <PrimaryButton
                title="Create Account"
                loading={loading && tab === 'signup'}
                onPress={handleSignup}
              />
            </Animated.View>

            {/* Divider + Google */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or {tab === 'login' ? 'Log In' : 'Sign Up'} With</Text>
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

            {/* Demo Login */}
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
              <Ionicons name="rocket-outline" size={20} color="#FF6B00" />
              <Text style={styles.demoButtonText}>Demo Login</Text>
            </TouchableOpacity>

            {/* Privacy */}
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
          { borderColor: focused ? '#FF6B00' : 'rgba(255,255,255,0.08)' },
        ]}
      >
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
        {!isPassword && value.length > 0 && (
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
        <Text style={styles.primaryButtonText}>
          {loading ? 'Please wait...' : title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  /* Tab bar */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 2,
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabIndicator: {
    position: 'absolute',
    width: '50%',
    height: '80%',
    top: '10%',
    backgroundColor: '#FF6B00',
    borderRadius: 9,
    zIndex: 1,
  },

  /* Forms */
  formContainer: {
    position: 'relative',
  },
  formOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  inputContainer: {
    height: 52,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
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
  iconBtn: {
    marginLeft: 8,
    padding: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,69,69,0.12)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: '#FF4545',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  footnotes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
  checkboxActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  checkboxLabel: {
    color: '#8E8E93',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  forgotLink: {
    color: '#FF6B00',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerText: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginHorizontal: 12,
  },
  googleButton: {
    height: 52,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  demoButton: {
    height: 52,
    backgroundColor: 'rgba(255,107,0,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.25)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  demoButtonText: {
    color: '#FF6B00',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  privacyRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  privacyText: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    opacity: 0.6,
  },
});
