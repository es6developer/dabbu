import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

const { width: SCREEN_W } = Dimensions.get('window');

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login, guestLogin } = useAuth();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

  async function handleSendOtp() {
    if (!mobile.trim() || mobile.length < 10) {
      setError('Please enter a valid mobile number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setShowOtp(true);
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim() || otp.length < 4) {
      setError('Please enter the OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(mobile, otp);
    } catch (e: any) {
      setError(e.message || 'Invalid OTP');
      setLoading(false);
    }
  }

  async function handleGuestLogin() {
    setLoading(true);
    setError('');
    try {
      await guestLogin();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View
          
          
          
          style={StyleSheet.absoluteFill}
        />

        <Animated.View style={[styles.container, { opacity: fadeIn }]}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <View style={[styles.backCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>

          <Animated.View style={[styles.brand, { transform: [{ translateY: slideUp }] }]}>
            <View
              style={[styles.logoOuter, { backgroundColor: colors.accent.primary }]}
            >
              <Text style={styles.logoText}>D</Text>
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Welcome to Dabbu</Text>
            <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
              Sign in to manage your finances
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              },
              { transform: [{ translateY: slideUp }] },
            ]}
          >
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: `${'#FF4D4F'}12` }]}>
                <Ionicons name="alert-circle" size={16} color="#FF4D4F" />
                <Text style={[styles.errorText, { color: '#FF4D4F' }]}>{error}</Text>
              </View>
            ) : null}

            {!showOtp ? (
              <>
                <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Mobile Number</Text>
                <View style={[styles.inputRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                  <Text style={[styles.countryCode, { color: colors.text.secondary }]}>+91</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text.primary }]}
                    placeholder="Enter mobile number"
                    placeholderTextColor={colors.text.tertiary}
                    value={mobile}
                    onChangeText={(t) => { setMobile(t); setError(''); }}
                    keyboardType="phone-pad"
                    maxLength={10}
                    textContentType="telephoneNumber"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.accent.primary, borderColor: colors.brand.hover }, loading && { opacity: 0.6 }]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <View
                    style={styles.primaryBtnGrad}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Continue</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Enter OTP</Text>
                <Text style={[styles.otpSent, { color: colors.text.tertiary }]}>
                  OTP sent to {mobile}
                </Text>
                <View style={[styles.otpRow, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                  <TextInput
                    style={[styles.otpInput, { color: colors.text.primary }]}
                    placeholder="Enter OTP"
                    placeholderTextColor={colors.text.tertiary}
                    value={otp}
                    onChangeText={(t) => { setOtp(t); setError(''); }}
                    keyboardType="number-pad"
                    maxLength={6}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.accent.primary, borderColor: colors.brand.hover }, loading && { opacity: 0.6 }]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <View
                    style={styles.primaryBtnGrad}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Verify & Sign In</Text>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setShowOtp(false); setOtp(''); }} style={{ alignSelf: 'center', marginTop: 12 }}>
                  <Text style={[styles.backLink, { color: colors.text.tertiary }]}>Change number</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          <View style={styles.bottom}>
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
              <Text style={[styles.dividerText, { color: colors.text.tertiary }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
            </View>

            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
              onPress={handleGuestLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={20} color={colors.text.secondary} />
              <Text style={[styles.socialBtnText, { color: colors.text.secondary }]}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.guestBtn} onPress={handleGuestLogin} disabled={loading} activeOpacity={0.7}>
              <Ionicons name="person-outline" size={16} color={colors.text.tertiary} />
              <Text style={[styles.guestText, { color: colors.text.tertiary }]}>Continue as Guest</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Privacy')} activeOpacity={0.7}>
              <Text style={[styles.privacyText, { color: colors.text.tertiary }]}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  back: { marginBottom: 20, marginTop: 8 },
  backCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoOuter: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoText: { color: '#FFF', fontSize: 32, fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  card: { borderRadius: 28, borderWidth: 1, padding: 28, marginBottom: 24 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 16, gap: 8 },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingLeft: 14, marginBottom: 16 },
  countryCode: { fontSize: 15, fontWeight: '600', marginRight: 8 },
  input: { flex: 1, fontSize: 16, paddingVertical: 16 },
  otpSent: { fontSize: 13, marginBottom: 12 },
  otpRow: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, marginBottom: 16 },
  otpInput: { fontSize: 20, paddingVertical: 16, textAlign: 'center', letterSpacing: 8 },
  primaryBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4, borderWidth: 1.5 },
  primaryBtnGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  backLink: { fontSize: 13, fontWeight: '600' },
  bottom: { alignItems: 'center', marginTop: 'auto', paddingBottom: 20, gap: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600', marginHorizontal: 12, letterSpacing: 0.3 },
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, gap: 10, width: '100%' },
  socialBtnText: { fontSize: 15, fontWeight: '600' },
  guestBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  guestText: { fontSize: 14, fontWeight: '600' },
  privacyText: { fontSize: 12, fontWeight: '500', opacity: 0.6 },
});
