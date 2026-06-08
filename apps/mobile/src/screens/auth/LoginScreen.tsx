import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';
import { useGoogleAuth, getGoogleIdToken, getGoogleError } from '../../services/google-auth';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { googleLogin, guestLogin } = useAuth();
  const { colors, isDark } = useTheme();
  const { response, promptAsync } = useGoogleAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

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

  async function handleGoogleLogin(idToken: string) {
    setLoading(true);
    setError('');
    try {
      await googleLogin(idToken);
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
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
        <Animated.View style={[styles.container, { opacity: fadeIn }]}>
          <Animated.View style={[styles.brand, { transform: [{ translateY: slideUp }] }]}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.text.primary }]}>Dabbu</Text>
            <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
              Family Finance, Simplified
            </Text>
          </Animated.View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${'#FF4D4F'}12` }]}>
              <Ionicons name="alert-circle" size={16} color="#FF4D4F" />
              <Text style={[styles.errorText, { color: '#FF4D4F' }]}>{error}</Text>
            </View>
          ) : null}

          <Animated.View style={{ transform: [{ translateY: slideUp }] }}>
            <TouchableOpacity
              style={[
                styles.googleBtn,
                { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
              ]}
              onPress={() => promptAsync()}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={22} color={colors.text.primary} />
                  <Text style={[styles.googleBtnText, { color: colors.text.primary }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuestLogin}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.guestText, { color: colors.text.tertiary }]}>
                Continue as Guest
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('Privacy')} activeOpacity={0.7}>
              <Text style={[styles.privacyText, { color: colors.text.tertiary }]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 88, height: 88, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, fontWeight: '500' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
    marginBottom: 12,
  },
  googleBtnText: { fontSize: 16, fontWeight: '600' },
  guestBtn: { alignItems: 'center', paddingVertical: 10 },
  guestText: { fontSize: 14, fontWeight: '500' },
  footer: { alignItems: 'center', marginTop: 40 },
  privacyText: { fontSize: 12, fontWeight: '500', opacity: 0.6 },
});
