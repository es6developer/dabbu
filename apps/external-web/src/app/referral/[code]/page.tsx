'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, StyleSheet, spacing, radii } from '@/rn';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dabbu-1ff9.onrender.com/api/v1';
const APP_STORE_URL = 'https://apps.apple.com/app/dabbu';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.dabbu.app';

export default function ReferralPage() {
  const params = useParams();
  const code = params.code as string;
  const [tracked, setTracked] = useState(false);
  const [rewardAmount] = useState(100);

  useEffect(() => {
    if (code && !tracked) {
      setTracked(true);
      fetch(`${API_BASE_URL}/referral/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          deviceId: typeof window !== 'undefined' ? localStorage.getItem('dabbu_device_id') : null,
          platform:
            typeof navigator !== 'undefined'
              ? /iPhone|iPad|iPod/.test(navigator.userAgent)
                ? 'ios'
                : 'android'
              : 'web',
        }),
      }).catch(() => {});
      if (typeof window !== 'undefined') {
        localStorage.setItem('dabbu_referral_code', code);
      }
    }
  }, [code, tracked]);

  return (
    <View style={styles.root}>
      <View style={styles.gradientBg} />
      <Card style={styles.card}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>D</Text>
        </View>

        <Text style={styles.title}>You&apos;ve been invited!</Text>
        <Text style={styles.subtitle}>
          Join Dabbu and start managing expenses together with your family and friends.
        </Text>

        <View style={styles.rewardBox}>
          <Text style={styles.rewardAmount}>₹{rewardAmount}</Text>
          <Text style={styles.rewardLabel}>Your referral bonus awaits</Text>
        </View>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => (window.location.href = APP_STORE_URL)}
        >
          <Text style={styles.btnPrimaryText}>Download for iOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => (window.location.href = PLAY_STORE_URL)}
        >
          <Text style={styles.btnSecondaryText}>Download for Android</Text>
        </TouchableOpacity>

        <View style={styles.codeRow}>
          <View style={styles.liveDot} />
          <Text style={styles.codeText}>
            Referral code <Text style={styles.codeBold}>{code}</Text> will be applied automatically
          </Text>
        </View>

        <Text style={styles.footer}>
          Already have an account?{' '}
          <Text
            style={styles.footerLink}
            onPress={() => (window.location.href = `dabbu://referral/${code}`)}
          >
            Open app
          </Text>
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'var(--dabbu-bg, #000000)',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 256,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: spacing.xxl,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: 'var(--dabbu-text, #FFFFFF)',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  rewardBox: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.xl,
  },
  rewardAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: 'var(--dabbu-accent, #8B5CF6)',
    marginBottom: spacing.xs,
  },
  rewardLabel: {
    fontSize: 13,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  btnPrimary: {
    width: '100%',
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnSecondary: {
    width: '100%',
    height: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border, #2A2A2E)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'var(--dabbu-green, #10B981)',
  },
  codeText: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  codeBold: {
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
    fontFamily: 'monospace',
  },
  footer: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  footerLink: {
    color: 'var(--dabbu-accent, #8B5CF6)',
    fontWeight: '600',
  },
});
