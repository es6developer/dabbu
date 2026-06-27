import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { useGoogleAuth, getGoogleIdToken, getGoogleError } from '../../services/google-auth';
import { useLastLensLogo } from '../../hooks/useLastLensLogo';
import { AuthInput } from '../../components/ui/AuthInput';
import { AuthButton } from '../../components/ui/AuthButton';
import { SocialButton } from '../../components/ui/SocialButton';

export function PremiumSignupScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { register, googleLogin, isAuthenticated } = useAuth();

  const logoSource = useLastLensLogo();
  const { response, promptAsync } = useGoogleAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!response) {
      return;
    }
    const idToken = getGoogleIdToken(response);
    if (idToken) {
      handleGoogleSignup(idToken);
    } else {
      const errMsg = getGoogleError(response);
      if (errMsg) {
        setError(errMsg);
        setLoading(false);
      }
    }
  }, [response]);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleBlur = useCallback(
    (field: string) => {
      const errs = { ...fieldErrors };
      if (field === 'email' && email && !validateEmail(email)) {
        errs.email = 'Invalid email format';
      } else if (field === 'email') {
        delete errs.email;
      }
      if (field === 'phone' && phone && !/^\+?[1-9]\d{9,14}$/.test(phone)) {
        errs.phone = 'Enter a valid mobile number';
      } else if (field === 'phone') {
        delete errs.phone;
      }
      if (field === 'confirm' && confirmPassword && password !== confirmPassword) {
        errs.confirm = 'Passwords do not match';
      } else if (field === 'confirm') {
        delete errs.confirm;
      }
      if (field === 'password' && password && password.length < 6) {
        errs.password = 'Min 6 characters';
      } else if (field === 'password') {
        delete errs.password;
      }
      setFieldErrors(errs);
    },
    [email, phone, confirmPassword, password, fieldErrors],
  );

  async function handleGoogleSignup(idToken: string) {
    setLoading(true);
    setError('');
    try {
      await googleLogin(idToken);
    } catch (e: any) {
      setError(e.message || 'Google sign-up failed');
      setLoading(false);
    }
  }

  const shakeError = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  async function handleSignup() {
    if (
      !firstName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError('Please fill in all fields');
      shakeError();
      return;
    }
    if (!/^\+?[1-9]\d{9,14}$/.test(phone.trim())) {
      setError('Please enter a valid mobile number');
      shakeError();
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      shakeError();
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(email.trim(), password, firstName.trim(), lastName.trim(), phone.trim());
    } catch (e: any) {
      const msg = e?.message || '';
      const knownErrors: Record<string, string> = {
        'email already in use': 'An account with this email already exists.',
        'phone already in use': 'This phone number is already registered.',
        'invalid email': 'Please enter a valid email address.',
        'password too weak': 'Password is too weak. Use at least 6 characters.',
        'rate limit': 'Too many attempts. Please wait a moment.',
        network: 'Unable to reach server. Please check your internet connection.',
      };
      const matched = Object.keys(knownErrors).find((k) =>
        msg.toLowerCase().includes(k.toLowerCase()),
      );
      setError(matched ? knownErrors[matched] : msg || 'Registration failed');
      shakeError();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View style={[styles.animatedView, { transform: [{ translateX: shakeAnim }] }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <View style={{ paddingTop: insets.top + 48, paddingHorizontal: 24 }}>
              {/* Close */}
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                <AntDesign name="close" size={20} color="#000000" />
              </TouchableOpacity>

              {/* Logo */}
              <View style={styles.logoContainer}>
                <Image source={logoSource} style={styles.logo} resizeMode="contain" />
              </View>

              {/* Header */}
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Join Dabbu and manage money smarter.</Text>

              {/* Form */}
              <View style={styles.form}>
                {/* Name Row */}
                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <AuthInput
                      placeholder="First name"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => lastNameRef.current?.focus()}
                      error={fieldErrors.first}
                    />
                  </View>
                  <View style={styles.nameField}>
                    <AuthInput
                      placeholder="Last name"
                      value={lastName}
                      onChangeText={setLastName}
                      inputRef={lastNameRef}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                    />
                  </View>
                </View>

                <AuthInput
                  placeholder="Email"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) {
                      setError('');
                    }
                  }}
                  inputRef={emailRef}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  error={fieldErrors.email}
                />

                <AuthInput
                  placeholder="Phone number"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (error) {
                      setError('');
                    }
                  }}
                  inputRef={phoneRef}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  error={fieldErrors.phone}
                />

                <AuthInput
                  placeholder="Password"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) {
                      setError('');
                    }
                  }}
                  inputRef={passwordRef}
                  secureTextEntry
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  error={fieldErrors.password}
                />

                <AuthInput
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (error) {
                      setError('');
                    }
                  }}
                  inputRef={confirmRef}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                  error={fieldErrors.confirm}
                />
              </View>

              {/* Error */}
              {error ? (
                <View style={styles.errorBox}>
                  <AntDesign name="exclamationcircle" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Create Account Button */}
              <AuthButton title="Create Account" onPress={handleSignup} loading={loading} />

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social */}
              <SocialButton
                provider="google"
                onPress={async () => {
                  try {
                    setError('');
                    await promptAsync();
                  } catch (e: any) {
                    setError(e?.message || 'Google sign-in could not be started');
                  }
                }}
                disabled={loading}
              />

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  animatedView: {
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 36,
    height: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    marginBottom: 32,
  },
  form: {
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FF3B3010',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#FF3B30',
    flex: 1,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
