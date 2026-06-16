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
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>D</Text>
          </View>
        </View>
        <Text style={[styles.heading, { color: 'var(--dabbu-text)' }]}>
          Sign in to <Text style={{ color: 'var(--dabbu-accent)' }}>Dabbu</Text>
        </Text>
        <Text style={styles.desc}>Join shared expenses and split bills with your group</Text>
        <Spacer size="xl" />
        <View style={styles.btnWrap}>
          <GoogleLogin
            theme="outline"
            size="large"
            shape="rectangular"
            text="signin_with"
            width={300}
            onSuccess={onSuccess}
            onError={onError}
          />
        </View>
        <Spacer size="xl" />
        <Text style={styles.tos}>
          By continuing, you agree to Dabbu&apos;s <Text style={styles.tosLink}>Terms</Text> and{' '}
          <Text style={styles.tosLink}>Privacy Policy</Text>
        </Text>
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

const Spacer = ({ size }: { size?: string }) => {
  const h = size === 'xl' ? 24 : size === 'lg' ? 16 : 12;
  return <View style={{ height: h }} />;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'var(--dabbu-bg)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'var(--dabbu-surface)',
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border)',
    padding: spacing.xxl + 8,
    alignItems: 'center',
  },
  logoWrap: {
    marginBottom: spacing.xl,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: 'var(--dabbu-accent)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary)',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  btnWrap: {
    width: '100%',
    alignItems: 'center',
  },
  tos: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted)',
    textAlign: 'center',
    lineHeight: 18,
  },
  tosLink: {
    color: 'var(--dabbu-accent)',
    textDecorationLine: 'underline',
  },
});
