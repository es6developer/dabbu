'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, StyleSheet, Row, spacing, radii } from '@/rn';

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
          platform: typeof navigator !== 'undefined' ? /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'android' : 'web',
        }),
      }).catch(() => {});
      if (typeof window !== 'undefined') localStorage.setItem('dabbu_referral_code', code);
    }
  }, [code, tracked]);

  return (
    <View style={s.root}>
      <Card style={{ width: '100%', maxWidth: 400, alignItems: 'center', padding: spacing.xxl }}>
        <View style={{ width: 64, height: 64, borderRadius: radii.xl, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#FFF' }}>D</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: 'var(--dabbu-text)', textAlign: 'center', marginBottom: spacing.sm }}>You&apos;ve been invited!</Text>
        <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)', textAlign: 'center', marginBottom: spacing.xl }}>Join Dabbu and start managing expenses together with your family and friends.</Text>

        <View style={{ backgroundColor: 'var(--dabbu-brandLight)', borderRadius: radii.xl, padding: spacing.lg, alignItems: 'center', width: '100%', marginBottom: spacing.xl }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: 'var(--dabbu-accent)', marginBottom: spacing.xs }}>₹{rewardAmount}</Text>
          <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>Your referral bonus awaits</Text>
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={() => (window.location.href = APP_STORE_URL)}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>Download for iOS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secBtn} onPress={() => (window.location.href = PLAY_STORE_URL)}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: 'var(--dabbu-text)' }}>Download for Android</Text>
        </TouchableOpacity>

        <Row style={{ gap: spacing.sm, marginVertical: spacing.lg }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'var(--dabbu-green)' }} />
          <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)' }}>Referral code <Text style={{ fontWeight: '600', color: 'var(--dabbu-text)', fontFamily: 'monospace' }}>{code}</Text> will be applied automatically</Text>
        </Row>

        <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)' }}>
          Already have an account?{' '}
          <Text style={{ color: 'var(--dabbu-accent)', fontWeight: '500' }} onPress={() => (window.location.href = `dabbu://referral/${code}`)}>Open app</Text>
        </Text>
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'var(--dabbu-bg)' },
  primaryBtn: { width: '100%', height: 52, borderRadius: radii.lg, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  secBtn: { width: '100%', height: 52, borderRadius: radii.lg, borderWidth: 1, borderColor: 'var(--dabbu-border)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
});
