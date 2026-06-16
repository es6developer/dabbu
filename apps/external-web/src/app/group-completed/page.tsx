'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, Row, StyleSheet, spacing, radii } from '@/rn';
import { formatCurrency } from '@/lib/utils';

function GroupCompletedPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const groupName = sp.get('groupName');
  const totalSpent = sp.get('totalSpent');
  const totalPaid = sp.get('totalPaid');
  const totalOwed = sp.get('totalOwed');
  const balance = sp.get('balance');
  const settlementStatus = sp.get('settlement');
  const spent = totalSpent ? parseFloat(totalSpent) : 0;
  const paid = totalPaid ? parseFloat(totalPaid) : 0;
  const owed = totalOwed ? parseFloat(totalOwed) : 0;

  return (
    <View style={s.root}>
      <View style={s.content}>
        <View style={s.iconWrap}><Text style={{ fontSize: 40 }}>✅</Text></View>
        <Text style={s.title}>Trip Completed Successfully!</Text>
        <Text style={s.subtitle}>{groupName ? `${groupName} has been wrapped up. ` : 'The group has been wrapped up. '}All expenses have been settled and finalized.</Text>
        <Card>
          <View style={{ alignItems: 'center', paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'var(--dabbu-border)' }}>
            <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)', marginBottom: spacing.xs }}>Total Spent</Text>
            <Text style={{ fontSize: 32, fontWeight: '700', color: 'var(--dabbu-text)' }}>{formatCurrency(spent)}</Text>
          </View>
          <Row style={{ gap: spacing.lg, marginTop: spacing.lg }}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radii.lg, backgroundColor: 'var(--dabbu-surface2)' }}>
              <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)', marginBottom: spacing.xs }}>You Paid</Text>
              <Text style={{ fontSize: 20, fontWeight: '600', color: 'var(--dabbu-green)' }}>{formatCurrency(paid)}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radii.lg, backgroundColor: 'var(--dabbu-surface2)' }}>
              <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)', marginBottom: spacing.xs }}>You Owed</Text>
              <Text style={{ fontSize: 20, fontWeight: '600', color: 'var(--dabbu-red)' }}>{formatCurrency(owed)}</Text>
            </View>
          </Row>
          {settlementStatus && (
            <Row style={{ gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: radii.full, backgroundColor: 'var(--dabbu-successBg)', alignSelf: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'var(--dabbu-green)' }} />
              <Text style={{ fontSize: 12, fontWeight: '500', color: 'var(--dabbu-green)' }}>{settlementStatus === 'settled' ? 'All Settled' : 'Pending Settlement'}</Text>
            </Row>
          )}
        </Card>
        <TouchableOpacity style={s.primaryBtn}><Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>Download Settlement Receipt</Text></TouchableOpacity>
        <TouchableOpacity style={s.secBtn} onPress={() => router.push('/auth')}><Text style={{ fontSize: 15, fontWeight: '500', color: 'var(--dabbu-text)' }}>View Your Personal Summary</Text></TouchableOpacity>
        <Card style={{ alignItems: 'center', padding: spacing.xl }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: 'var(--dabbu-text)', textAlign: 'center', marginBottom: spacing.xs }}>Track all future trips with Dabbu</Text>
          <Text style={{ fontSize: 12, color: 'var(--dabbu-text-secondary)', textAlign: 'center', marginBottom: spacing.lg }}>Your next trip deserves smarter finance tracking</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/auth')}><Text style={{ fontSize: 15, fontWeight: '600', color: '#FFF' }}>Get 1 Month Premium Free</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/')} style={{ paddingVertical: spacing.md }}><Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)' }}>Start your own group</Text></TouchableOpacity>
        </Card>
        <TouchableOpacity style={{ paddingVertical: spacing.md, alignItems: 'center' }} onPress={() => window.open('https://apps.apple.com/app/dabbu-split', '_blank')}>
          <Text style={{ fontSize: 14, color: 'var(--dabbu-text-muted)' }}>Install Dabbu App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Page() { return <Suspense><GroupCompletedPage /></Suspense>; }

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'var(--dabbu-bg)' },
  content: { width: '100%', maxWidth: 500, gap: spacing.lg },
  iconWrap: { width: 72, height: 72, borderRadius: radii.xl, backgroundColor: 'var(--dabbu-successBg)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: 'var(--dabbu-text)', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'var(--dabbu-text-secondary)', textAlign: 'center', lineHeight: 20, maxWidth: 320, alignSelf: 'center' },
  primaryBtn: { height: 48, borderRadius: radii.lg, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center' },
  secBtn: { height: 48, borderRadius: radii.lg, borderWidth: 1, borderColor: 'var(--dabbu-border)', justifyContent: 'center', alignItems: 'center' },
});
