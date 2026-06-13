'use client';

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { View, Text, StyleSheet, spacing, radii } from '@/rn';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const redirect = searchParams.get('redirect') || '/';

  const onSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) {
        toast.error('Google sign-in failed');
        return;
      }
      let groupId: string | undefined;
      const inviteMatch = redirect.match(/\/(?:i|invite)\/([a-f0-9]+)/);
      if (inviteMatch) {
        const inviteRes = await api.groups.getInvite(inviteMatch[1]);
        if (inviteRes.data?.group?.id) {
          groupId = inviteRes.data.group.id;
        }
      }
      const res = await api.auth.google(credentialResponse.credential, groupId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const data = res.data as any;
      login(data.tokens?.accessToken || data.token, data.user);
      toast.success('Welcome to Dabbu!');
      router.push(redirect);
    },
    [router, redirect, login],
  );

  const onError = useCallback(() => {
    toast.error('Google sign-in failed. Please try again.');
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.bgGradient} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.decoCircle1} />
      <View style={styles.decoCircle2} />
      <View style={styles.dot1} />
      <View style={styles.dot2} />
      <View style={styles.dot3} />

      <View style={styles.cardWrap}>
        <View style={styles.cardBorder} />
        <View style={styles.card}>
          <View style={styles.cardTopLine} />

          <View style={styles.cardContent}>
            <View style={styles.logoWrap}>
              <View style={styles.logoGlow} />
              <View style={styles.logo}>
                <Text style={styles.logoText}>D</Text>
              </View>
            </View>

            <Text style={styles.heading}>
              Sign in to <Text style={styles.accent}>Dabbu</Text>
            </Text>
            <Text style={styles.desc}>Join shared expenses and split bills with your group</Text>
          </View>

          <View style={styles.btnWrap}>
            <View style={styles.btnBorder} />
            <View style={styles.btnInner}>
              <GoogleLogin
                theme="filled_black"
                size="large"
                shape="pill"
                text="signin_with"
                width={280}
                onSuccess={onSuccess}
                onError={onError}
              />
            </View>
          </View>

          <Text style={styles.tos}>
            By continuing, you agree to Dabbu&apos;s <Text style={styles.tosLink}>Terms</Text> and{' '}
            <Text style={styles.tosLink}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function Page() {
  return (
    <Suspense>
      <AuthPage />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'var(--dabbu-bg, #000000)',
    overflow: 'hidden',
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--dabbu-bg)',
  },
  glowTop: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 800,
    height: 500,
    marginLeft: -400,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    borderRadius: 400,
  },
  glowBottom: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    width: 600,
    height: 300,
    marginLeft: -300,
    backgroundColor: 'rgba(139, 92, 246, 0.03)',
    borderRadius: 300,
  },
  decoCircle1: {
    position: 'absolute',
    top: '25%',
    left: -128,
    width: 256,
    height: 256,
    borderRadius: 128,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.04)',
  },
  decoCircle2: {
    position: 'absolute',
    bottom: '25%',
    right: -128,
    width: 256,
    height: 256,
    borderRadius: 128,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.04)',
  },
  dot1: {
    position: 'absolute',
    top: 80,
    left: 40,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  dot2: {
    position: 'absolute',
    bottom: 128,
    right: 64,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  dot3: {
    position: 'absolute',
    top: '33%',
    right: '25%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
    position: 'relative',
  },
  cardBorder: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: radii.xxl + 4,
    backgroundColor:
      'linear-gradient(to bottom, rgba(139,92,246,0.15), transparent, rgba(139,92,246,0.04))',
    zIndex: 0,
  },
  card: {
    backgroundColor: 'var(--dabbu-surface)',
    borderRadius: radii.xxl + 4,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border)',
    overflow: 'hidden',
    position: 'relative',
  },
  cardTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  cardContent: {
    alignItems: 'center',
    padding: spacing.xxl,
    paddingTop: spacing.xl + 16,
  },
  logoWrap: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  logoGlow: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  accent: {
    color: 'var(--dabbu-accent, #8B5CF6)',
  },
  desc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 260,
    lineHeight: 20,
  },
  btnWrap: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    position: 'relative',
  },
  btnBorder: {
    position: 'absolute',
    top: -1,
    left: spacing.xxl - 1,
    right: spacing.xxl - 1,
    bottom: spacing.xxl - 1,
    borderRadius: radii.xl + 2,
    backgroundColor: 'rgba(139,92,246,0.06)',
  },
  btnInner: {
    backgroundColor: 'var(--dabbu-bg)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border)',
    padding: spacing.xl,
    alignItems: 'center',
  },
  tos: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    lineHeight: 18,
  },
  tosLink: {
    color: 'rgba(255,255,255,0.3)',
    textDecorationLine: 'underline',
  },
});
