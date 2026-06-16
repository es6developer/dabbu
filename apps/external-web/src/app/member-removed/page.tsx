'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, Row, StyleSheet, spacing, radii } from '@/rn';
import { formatCurrency } from '@/lib/utils';

function MemberRemovedPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const balance = sp.get('balance');
  const outstandingBalance = balance ? parseFloat(balance) : 0;

  return (
    <View style={s.root}>
      <View style={s.content}>
        <View style={s.iconWrap}><Text style={{ fontSize: 40 }}>ℹ️</Text></View>
        <Text style={s.title}>You&apos;ve Been Removed from the Group</Text>
        <Text style={s.subtitle}>A group admin has removed you from this group.</Text>
        {outstandingBalance !== 0 && (
          <Card>
            <Row style={{ gap: spacing.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'var(--dabbu-errorBg)', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: 'var(--dabbu-red)' }}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)' }}>
                  You had an outstanding balance of{' '}
                  <Text style={{ fontWeight: '600', color: outstandingBalance > 0 ? 'var(--dabbu-green)' : 'var(--dabbu-red)' }}>{formatCurrency(Math.abs(outstandingBalance))}</Text>.
                </Text>
                <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)', marginTop: spacing.xs }}>Please contact the group admin to settle.</Text>
              </View>
            </Row>
          </Card>
        )}
        <TouchableOpacity style={s.primaryBtn} onPress={() => (window.location.href = 'mailto:support@dabbu.app')}><Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>Contact Admin</Text></TouchableOpacity>
        <TouchableOpacity style={s.secBtn} onPress={() => window.open('https://apps.apple.com/app/dabbu-split', '_blank')}><Text style={{ fontSize: 15, fontWeight: '500', color: 'var(--dabbu-text)' }}>Install Dabbu App</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/')} style={{ paddingVertical: spacing.md, alignItems: 'center' }}><Text style={{ fontSize: 14, color: 'var(--dabbu-text-muted)' }}>Start your own group</Text></TouchableOpacity>
      </View>
    </View>
  );
}

export default function Page() { return <Suspense><MemberRemovedPage /></Suspense>; }

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'var(--dabbu-bg)' },
  content: { width: '100%', maxWidth: 500, gap: spacing.lg },
  iconWrap: { width: 72, height: 72, borderRadius: radii.xl, backgroundColor: 'var(--dabbu-brandLight)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: 'var(--dabbu-text)', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'var(--dabbu-text-secondary)', textAlign: 'center', lineHeight: 20, maxWidth: 320, alignSelf: 'center' },
  primaryBtn: { height: 48, borderRadius: radii.lg, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center' },
  secBtn: { height: 48, borderRadius: radii.lg, borderWidth: 1, borderColor: 'var(--dabbu-border)', justifyContent: 'center', alignItems: 'center' },
});
