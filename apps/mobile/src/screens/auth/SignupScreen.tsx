import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { useGoogleAuth, getGoogleIdToken } from '../../services/google-auth';

export function SignupScreen() {
  const navigation = useNavigation<any>();
  const { googleLogin } = useAuth();
  const { colors } = useTheme();
  const { response, promptAsync } = useGoogleAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const fadeAnim = useState(() => new Animated.Value(0))[0];
  const slideAnim = useState(() => new Animated.Value(20))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={{
            flex: 1,
            paddingHorizontal: spacing['2xl'],
            paddingTop: 60,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={s.brand}>
            <View style={[s.logoContainer, { backgroundColor: colors.bg.secondary }]}>
              <Image
                source={require('../../../assets/logo.png')}
                style={s.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[s.title, { color: colors.text.primary }]}>Create account</Text>
            <Text style={[s.subtitle, { color: colors.text.secondary }]}>
              Start managing money together with your family and friends
            </Text>
          </View>

          {error ? (
            <View style={[s.errorBox, { backgroundColor: `${colors.status.error}12` }]}>
              <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
              <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              s.googleBtn,
              { backgroundColor: colors.bg.secondary, opacity: termsAccepted ? 1 : 0.5 },
            ]}
            onPress={async () => {
              try {
                setError('');
                await promptAsync();
              } catch (e: any) {
                setError(e?.message || 'Google sign-in could not be started');
              }
            }}
            disabled={loading || !termsAccepted}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <AntDesign name="google" size={18} color={colors.text.primary} />
                <Text style={[s.googleBtnText, { color: colors.text.primary }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {referralCode ? (
            <View style={[s.referralBadge, { backgroundColor: `${colors.accent.primary}12` }]}>
              <AntDesign name="gift" size={12} color={colors.accent.primary} />
              <Text style={[s.referralBadgeText, { color: colors.accent.primary }]}>
                Referral code applied: {referralCode}
              </Text>
            </View>
          ) : null}

          <View style={s.divider}>
            <View style={[s.dividerLine, { backgroundColor: colors.border.subtle }]} />
            <Text style={[s.dividerText, { color: colors.text.tertiary }]}>or</Text>
            <View style={[s.dividerLine, { backgroundColor: colors.border.subtle }]} />
          </View>

          <TouchableOpacity
            style={[
              s.emailBtn,
              { backgroundColor: colors.accent.primary, opacity: termsAccepted ? 1 : 0.5 },
            ]}
            onPress={() => navigation.navigate('Login')}
            disabled={!termsAccepted}
          >
            <Text style={s.emailBtnText}>Continue with Email</Text>
          </TouchableOpacity>

          {/* Terms agreement */}
          <TouchableOpacity
            style={s.termsRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.7}
          >
            <View
              style={[
                s.checkbox,
                {
                  borderColor: colors.border.default,
                  backgroundColor: termsAccepted ? colors.accent.primary : 'transparent',
                },
              ]}
            >
              {termsAccepted && <AntDesign name="check" size={12} color="#FFF" />}
            </View>
            <Text style={[s.termsText, { color: colors.text.secondary }]}>
              I agree to the{' '}
              <Text
                style={[s.termsLink, { color: colors.accent.primary }]}
                onPress={() => Linking.openURL('https://dabbu.app/terms')}
              >
                Terms of Service
              </Text>{' '}
              &{' '}
              <Text
                style={[s.termsLink, { color: colors.accent.primary }]}
                onPress={() => Linking.openURL('https://dabbu.app/privacy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.linkRow} onPress={() => navigation.navigate('Login')}>
            <Text style={[s.linkText, { color: colors.text.tertiary }]}>
              Already have an account?
            </Text>
            <Text style={[s.linkBold, { color: colors.accent.primary }]}> Sign In</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  back: {
    width: 40,
    height: 40,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
  },
  brand: { alignItems: 'center', marginBottom: spacing['3xl'] },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoImage: { width: 48, height: 48 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, marginBottom: spacing.sm },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: { fontSize: 13, flex: 1 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
  },
  googleBtnText: { fontSize: 16, fontWeight: '500' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
    gap: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: '500' },
  emailBtn: {
    height: 54,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emailBtnText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  linkRow: { flexDirection: 'row', justifyContent: 'center' },
  linkText: { fontSize: 14 },
  linkBold: { fontSize: 14, fontWeight: '600' },
  referralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing.md,
  },
  referralBadgeText: { fontSize: 13, fontWeight: '600' },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },
  termsLink: { fontSize: 13, fontWeight: '700' },
});
