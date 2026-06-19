import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { useGoogleAuth, getGoogleIdToken, getGoogleError } from '../../services/google-auth';

interface InputFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done';
  inputRef?: React.RefObject<TextInput>;
  icon?: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  colors: any;
  error?: boolean;
}

function InputField({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  onSubmitEditing,
  returnKeyType,
  inputRef,
  icon,
  focused,
  onFocus,
  onBlur,
  colors,
  error,
}: InputFieldProps & { error?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry !== undefined;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg.secondary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: error
          ? colors.status.error
          : focused
            ? colors.accent.primary
            : colors.border.default,
        paddingHorizontal: 14,
        marginBottom: 12,
      }}
    >
      {icon && (
        <AntDesign
          name={icon as any}
          size={18}
          color={focused ? colors.accent.primary : colors.text.tertiary}
        />
      )}
      <TextInput
        ref={inputRef}
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: '500',
          color: colors.text.primary,
          paddingVertical: 14,
          marginLeft: icon ? 10 : 0,
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.text.tertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isPassword && !showPassword}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'none'}
        onFocus={onFocus}
        onBlur={onBlur}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
      />
      {isPassword && value.length > 0 && (
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <AntDesign
            name={showPassword ? 'eyeo' : 'eye'}
            size={20}
            color={colors.text.tertiary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function PremiumSignupScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { register, googleLogin } = useAuth();
  const { colors } = useTheme();
  const { response, promptAsync } = useGoogleAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleBlur = (field: string) => {
    setFocusedField(null);
    const errs = { ...fieldErrors };
    if (field === 'email' && email && !validateEmail(email)) {
      errs.email = 'Invalid email format';
    } else if (field === 'email') {
      delete errs.email;
    }
    if (field === 'phone' && phone && !/^\+?[1-9]\d{9,14}$/.test(phone)) {
      errs.phone = 'Enter a valid mobile number (10-15 digits)';
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
  };
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 10, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!response) return;
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

  async function handleGoogleSignup(idToken: string) {
    setLoading(true);
    setError('');
    try {
      await googleLogin(idToken, referralCode || undefined);
    } catch (e: any) {
      setError(e.message || 'Google sign-up failed');
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (
      !firstName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError('Please fill in all fields');
      return;
    }
    if (!/^\+?[1-9]\d{9,14}$/.test(phone.trim())) {
      setError('Please enter a valid mobile number');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(email.trim(), password, firstName.trim(), lastName.trim(), phone.trim(), referralCode || undefined);
    } catch (e: any) {
      const msg = e?.message || '';
      const knownErrors: Record<string, string> = {
        'email already in use': 'An account with this email already exists.',
        'phone already in use': 'This phone number is already registered.',
        'invalid email': 'Please enter a valid email address.',
        'password too weak': 'Password is too weak. Use at least 6 characters with mixed case.',
        'rate limit': 'Too many attempts. Please wait a moment.',
        'network': 'Unable to reach server. Please check your internet connection.',
      };
      const matched = Object.keys(knownErrors).find((k) =>
        msg.toLowerCase().includes(k.toLowerCase()),
      );
      setError(matched ? knownErrors[matched] : msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingTop: insets.top + 16,
                paddingBottom: 16,
              }}
            >
              {/* Header */}
              <View style={{ paddingHorizontal: spacing.xl, marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: colors.bg.secondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <AntDesign  name="close" size={22} color={colors.text.primary} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 20,
                      backgroundColor: colors.bg.secondary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <Image
                      source={require('../../../assets/logo.png')}
                      style={{ width: 56, height: 56 }}
                      resizeMode="contain"
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: '800',
                      color: colors.text.primary,
                      letterSpacing: -0.5,
                      textAlign: 'center',
                    }}
                  >
                    Create your account
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '500',
                      color: colors.text.secondary,
                      marginTop: 6,
                      lineHeight: 20,
                      textAlign: 'center',
                    }}
                  >
                    Join millions managing money smarter with Dabbu
                  </Text>
                </View>
              </View>

              <View style={{ paddingHorizontal: spacing.xl }}>
                {/* Name Row */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      placeholder="First name"
                      value={firstName}
                      onChangeText={(t) => {
                        setFirstName(t);
                        if (fieldErrors.first) {
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n.first;
                            return n;
                          });
                        }
                      }}
                      autoCapitalize="words"
                      returnKeyType="next"
                      icon="user"
                      onSubmitEditing={() => lastNameRef.current?.focus()}
                      colors={colors}
                      focused={focusedField === 'first'}
                      onFocus={() => setFocusedField('first')}
                      onBlur={() => handleBlur('first')}
                      error={!!fieldErrors.first}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <InputField
                      placeholder="Last name"
                      value={lastName}
                      onChangeText={(t) => {
                        setLastName(t);
                        if (fieldErrors.last) {
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n.last;
                            return n;
                          });
                        }
                      }}
                      autoCapitalize="words"
                      returnKeyType="next"
                      inputRef={lastNameRef}
                      onSubmitEditing={() => emailRef.current?.focus()}
                      colors={colors}
                      focused={focusedField === 'last'}
                      onFocus={() => setFocusedField('last')}
                      onBlur={() => handleBlur('last')}
                      error={!!fieldErrors.last}
                    />
                  </View>
                </View>

                <InputField
                  placeholder="Email address"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (t && !validateEmail(t)) {
                      setFieldErrors((prev) => ({ ...prev, email: 'Invalid email format' }));
                    } else {
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n.email;
                        return n;
                      });
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  icon="mail"
                  inputRef={emailRef}
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  colors={colors}
                  focused={focusedField === 'email'}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => handleBlur('email')}
                  error={!!fieldErrors.email}
                />
                <InputField
                  placeholder="Mobile number"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (t && !/^\+?[1-9]\d{9,14}$/.test(t)) {
                      setFieldErrors((prev) => ({ ...prev, phone: 'Enter a valid mobile number' }));
                    } else {
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n.phone;
                        return n;
                      });
                    }
                  }}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  icon="phone"
                  inputRef={phoneRef}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  colors={colors}
                  focused={focusedField === 'phone'}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => handleBlur('phone')}
                  error={!!fieldErrors.phone}
                />
                <InputField
                  placeholder="Password"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (t && t.length < 6) {
                      setFieldErrors((prev) => ({ ...prev, password: 'Min 6 characters' }));
                    } else {
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n.password;
                        return n;
                      });
                    }
                    if (confirmPassword && t !== confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirm: 'Passwords do not match' }));
                    } else if (confirmPassword) {
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n.confirm;
                        return n;
                      });
                    }
                  }}
                  secureTextEntry
                  returnKeyType="next"
                  icon="lock"
                  inputRef={passwordRef}
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  colors={colors}
                  focused={focusedField === 'password'}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => handleBlur('password')}
                  error={!!fieldErrors.password}
                />
                <InputField
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (t && password !== t) {
                      setFieldErrors((prev) => ({ ...prev, confirm: 'Passwords do not match' }));
                    } else {
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n.confirm;
                        return n;
                      });
                    }
                  }}
                  secureTextEntry
                  returnKeyType="done"
                  icon="lock"
                  inputRef={confirmRef}
                  onSubmitEditing={handleSignup}
                  colors={colors}
                  focused={focusedField === 'confirm'}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => handleBlur('confirm')}
                  error={!!fieldErrors.confirm}
                />

                <InputField
                  placeholder="Referral code (optional)"
                  value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters"
                  returnKeyType="next"
                  icon="gift"
                  colors={colors}
                  focused={focusedField === 'referral'}
                  onFocus={() => setFocusedField('referral')}
                  onBlur={() => setFocusedField(null)}
                  error={false}
                />

                {/* Error */}
                {error ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: colors.status.errorLight,
                      marginBottom: 12,
                    }}
                  >
                    <AntDesign  name="exclamationcircle" size={16} color={colors.status.error} />
                    <Text
                      style={{ fontSize: 13, fontWeight: '500', color: colors.status.error, flex: 1 }}
                    >
                      {error}
                    </Text>
                  </View>
                ) : null}

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border.default }} />
                  <Text
                    style={{
                      marginHorizontal: 12,
                      fontSize: 12,
                      fontWeight: '600',
                      color: colors.text.tertiary,
                    }}
                  >
                    or sign up with
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border.default }} />
                </View>

                {/* Google */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={async () => {
                    try {
                      setError('');
                      await promptAsync();
                    } catch (e: any) {
                      setError(e?.message || 'Google sign-in could not be started');
                    }
                  }}
                  disabled={loading}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    paddingVertical: 14,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.bg.secondary,
                    borderWidth: 1,
                    borderColor: colors.border.default,
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  <AntDesign  name="google" size={20} color={colors.text.primary} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>
                    Google
                  </Text>
                </TouchableOpacity>

                {/* Footer */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.secondary }}>
                    Already have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent.primary }}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 16,
                    marginBottom: 8,
                  }}
                >
                  <AntDesign  name="checkcircle" size={12} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text.tertiary }}>
                    256-bit encrypted connection
                  </Text>
                </View>
                {/* Field Errors */}
                {Object.keys(fieldErrors).length > 0 && (
                  <View style={{ marginTop: -4, marginBottom: 8 }}>
                    {Object.entries(fieldErrors).map(([key, msg]) => (
                      <Text
                        key={key}
                        style={{ fontSize: 12, color: colors.status.error, marginBottom: 2 }}
                      >
                        {msg}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: spacing.xl, paddingTop: 12 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSignup}
                disabled={loading}
                style={{
                  backgroundColor: colors.accent.primary,
                  paddingVertical: 16,
                  borderRadius: borderRadius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loading ? 0.5 : 1,
                  ...shadows.md,
                  shadowColor: colors.accent.primary,
                }}
              >
                <Text style={{ color: colors.text.inverse, fontSize: 16, fontWeight: '700' }}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
}
