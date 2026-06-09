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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { PADDING, borderRadius, shadows } from '../../theme/design';

interface InputFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done';
  inputRef?: React.RefObject<TextInput>;
  icon?: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
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
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry !== undefined;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: '#ac99d7',
        paddingHorizontal: 14,
        marginBottom: 12,
      }}
    >
      {icon && <Ionicons name={icon} size={18} color={focused ? '#8B5CF6' : '#9CA3AF'} />}
      <TextInput
        ref={inputRef}
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: '500',
          color: '#1A1A1A',
          paddingVertical: 14,
          marginLeft: icon ? 10 : 0,
        }}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
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
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#9CA3AF"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function PremiumSignupScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 10, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleSignup() {
    if (!firstName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(email.trim(), password, firstName.trim(), lastName.trim());
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 24,
            }}
          >
            {/* Header */}
            <View style={{ paddingHorizontal: PADDING, marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Image
                    source={require('../../../assets/logo.png')}
                    style={{ width: 48, height: 48, marginBottom: 14 }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: '800',
                      color: '#1A1A1A',
                      letterSpacing: -0.5,
                    }}
                  >
                    Create your account
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '500',
                      color: '#6B7280',
                      marginTop: 6,
                      lineHeight: 20,
                    }}
                  >
                    Join millions managing money smarter with Dabbu
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: '#F8F9FA',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={22} color="#1A1A1A" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ paddingHorizontal: PADDING }}>
              {/* Name Row */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <InputField
                    placeholder="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    icon="person-outline"
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                    focused={focusedField === 'first'}
                    onFocus={() => setFocusedField('first')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    placeholder="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    inputRef={lastNameRef}
                    onSubmitEditing={() => emailRef.current?.focus()}
                    focused={focusedField === 'last'}
                    onFocus={() => setFocusedField('last')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <InputField
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                icon="mail-outline"
                inputRef={emailRef}
                onSubmitEditing={() => passwordRef.current?.focus()}
                focused={focusedField === 'email'}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
              <InputField
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="next"
                icon="lock-closed-outline"
                inputRef={passwordRef}
                onSubmitEditing={() => confirmRef.current?.focus()}
                focused={focusedField === 'password'}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <InputField
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                returnKeyType="done"
                icon="lock-closed-outline"
                inputRef={confirmRef}
                onSubmitEditing={handleSignup}
                focused={focusedField === 'confirm'}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
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
                    backgroundColor: '#FF4D4F10',
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="alert-circle" size={16} color="#FF4D4F" />
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#FF4D4F', flex: 1 }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Create Account Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSignup}
                disabled={loading}
                style={{
                  backgroundColor: '#8B5CF6',
                  paddingVertical: 16,
                  borderRadius: borderRadius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loading ? 0.5 : 1,
                  ...shadows.md,
                  shadowColor: '#8B5CF6',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                <Text
                  style={{
                    marginHorizontal: 12,
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#9CA3AF',
                  }}
                >
                  or sign up with
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
              </View>

              {/* Google */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  paddingVertical: 14,
                  borderRadius: borderRadius.md,
                  backgroundColor: '#F8F9FA',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              >
                <Ionicons name="logo-google" size={20} color="#1A1A1A" />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A' }}>Google</Text>
              </TouchableOpacity>

              {/* Footer */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#6B7280' }}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B5CF6' }}>Sign In</Text>
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
                <Ionicons name="shield-checkmark-outline" size={12} color="#9CA3AF" />
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#9CA3AF' }}>
                  256-bit encrypted connection
                </Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
});
