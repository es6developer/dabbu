import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';
import { useGoogleAuth, getGoogleIdToken } from '../../services/google-auth';

export function SignupScreen() {
  const navigation = useNavigation<any>();
  const { googleLogin } = useAuth();
  const { colors, isDark } = useTheme();
  const { response, promptAsync } = useGoogleAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('referralCode').then((code) => {
      if (code) {
        setReferralCode(code);
        AsyncStorage.removeItem('referralCode');
      }
    });
  }, []);

  useEffect(() => {
    if (response) {
      const idToken = getGoogleIdToken(response);
      if (idToken) {
        handleGoogleSignup(idToken);
      } else if (response.type === 'error') {
        console.error('Google auth response error:', response);
        setError('Google sign-in was cancelled or failed');
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
      setError(e.message || 'Google sign-in failed');
      setLoading(false);
    }
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={styles.container}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <View style={[styles.backCircle, { backgroundColor: colors.bg.tertiary }]}>
              <AntDesign  name="arrowleft" size={20} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.brand}>
            <View
              style={[
                styles.logoContainer,
                { backgroundColor: colors.bg.secondary },
              ]}
            >
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
              Start managing money together with your family and friends
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}12` }]}>
              <AntDesign  name="exclamationcircle" size={16} color={colors.status.error} />
              <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.googleBtn,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
            onPress={async () => {
              try {
                setError('');
                await promptAsync();
              } catch (e: any) {
                console.error('Google sign-in prompt failed:', e);
                setError(e?.message || 'Google sign-in could not be started');
              }
            }}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <AntDesign  name="google" size={20} color={colors.text.primary} />
                <Text style={[styles.googleBtnText, { color: colors.text.primary }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {referralCode && (
            <View style={[styles.referralBadge, { backgroundColor: `${colors.accent.primary}12` }]}>
              <AntDesign  name="gift" size={14} color={colors.accent.primary} />
              <Text style={[styles.referralBadgeText, { color: colors.accent.primary }]}>
                Referral code applied: {referralCode}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.linkText, { color: colors.text.tertiary }]}>
              Already have an account?{' '}
            </Text>
            <Text style={[styles.linkBold, { color: colors.accent.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  back: { marginBottom: 20 },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { alignItems: 'center', marginBottom: 24 },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoImage: { width: 60, height: 60 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 28 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, flex: 1 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  googleBtnText: { fontSize: 16, fontWeight: '600' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  linkText: { fontSize: 14 },
  linkBold: { fontSize: 14, fontWeight: '600' },
  referralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  referralBadgeText: { fontSize: 13, fontWeight: '600' },
});
