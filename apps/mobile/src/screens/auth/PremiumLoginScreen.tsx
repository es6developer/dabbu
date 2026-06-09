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
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { PADDING, borderRadius, shadows } from '../../theme/design';

export function PremiumLoginScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@dabbu.app');
  const [password, setPassword] = useState('Demo123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 10, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back + Brand */}
          <View style={{ paddingHorizontal: PADDING, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: '#F8F9FA',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
            </TouchableOpacity>
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: 48, height: 48, marginBottom: 14 }}
              resizeMode="contain"
            />
            <Text
              style={{ fontSize: 28, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 }}
            >
              Welcome back
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
              Sign in to continue managing your finances
            </Text>
          </View>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingHorizontal: PADDING,
            }}
          >
            {/* Email */}
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: emailFocused ? '#5A4FCF' : '#6B7280',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                Email
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8F9FA',
                  borderRadius: borderRadius.md,
                  borderWidth: 1.5,
                  borderColor: emailFocused ? '#5A4FCF' : '#F8F9FA',
                  paddingHorizontal: 14,
                }}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? '#5A4FCF' : '#9CA3AF'}
                />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: '500',
                    color: '#1A1A1A',
                    paddingVertical: 14,
                    marginLeft: 10,
                  }}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: passFocused ? '#5A4FCF' : '#6B7280',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                Password
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8F9FA',
                  borderRadius: borderRadius.md,
                  borderWidth: 1.5,
                  borderColor: passFocused ? '#5A4FCF' : '#F8F9FA',
                  paddingHorizontal: 14,
                }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passFocused ? '#5A4FCF' : '#9CA3AF'}
                />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: '500',
                    color: '#1A1A1A',
                    paddingVertical: 14,
                    marginLeft: 10,
                  }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

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

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={{ alignSelf: 'flex-end', marginBottom: 24, marginTop: -4 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#5A4FCF' }}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: '#5A4FCF',
                paddingVertical: 16,
                borderRadius: borderRadius.md,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.5 : 1,
                ...shadows.md,
                shadowColor: '#5A4FCF',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
              <Text
                style={{ marginHorizontal: 12, fontSize: 12, fontWeight: '600', color: '#9CA3AF' }}
              >
                or continue with
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
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#5A4FCF' }}>
                  Create one
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
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={12} color="#9CA3AF" />
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#9CA3AF' }}>
                256-bit encrypted connection
              </Text>
            </View>
          </Animated.View>
        </Animated.ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
});
