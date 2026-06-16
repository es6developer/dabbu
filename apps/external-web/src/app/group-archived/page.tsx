'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, Row, StyleSheet, spacing, radii } from '@/rn';
import { formatCurrency } from '@/lib/utils';

function GroupArchivedPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const groupName = sp.get('groupName');
  const totalSpent = sp.get('totalSpent');
  const contribution = sp.get('contribution');
  const settlementStatus = sp.get('settlement');
  const spent = totalSpent ? parseFloat(totalSpent) : 0;
  const contrib = contribution ? parseFloat(contribution) : 0;

  return (
    <View style={s.root}>
      <View style={s.content}>
        <View style={s.iconWrap}><Text style={{ fontSize: 40 }}>📦</Text></View>
        <Text style={s.title}>This Group Has Been Archived</Text>
        <Text style={s.subtitle}>{groupName ? `${groupName} is no longer active.` : 'This group is no longer active.'} The data is preserved but no new changes can be made.</Text>
        {spent > 0 && (
          <Card>
            <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.xs }}>
              <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)' }}>Total Spent</Text>
              <Text style={s.statValue}>{formatCurrency(spent)}</Text>
            </Row>
            <View style={s.div} />
            <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.xs }}>
              <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)' }}>Your Contribution</Text>
              <Text style={s.statValue}>{formatCurrency(contrib)}</Text>
            </Row>
            {settlementStatus && (
              <>
                <View style={s.div} />
                <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.xs }}>
                  <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)' }}>Settlement</Text>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: settlementStatus === 'settled' ? 'var(--dabbu-green)' : 'var(--dabbu-text-muted)' }}>
                    {settlementStatus === 'settled' ? 'Settled' : 'Pending'}
                  </Text>
                </Row>
              </>
            )}
          </Card>
        )}
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/auth')}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFF', textAlign: 'center' }}>Continue your finance journey with Dabbu</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)', textAlign: 'center' }}>Dabbu helps you track personal and shared expenses effortlessly</Text>
        <TouchableOpacity style={s.secBtn} onPress={() => router.push('/')}><Text style={{ fontSize: 15, fontWeight: '500', color: 'var(--dabbu-text)' }}>Get started free</Text></TouchableOpacity>
        <TouchableOpacity style={{ paddingVertical: spacing.md, alignItems: 'center' }} onPress={() => window.open('https://apps.apple.com/app/dabbu-split', '_blank')}>
          <Text style={{ fontSize: 14, color: 'var(--dabbu-text-muted)' }}>Install Dabbu App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Page() { return <Suspense><GroupArchivedPage /></Suspense>; }

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'var(--dabbu-bg)' },
  content: { width: '100%', maxWidth: 500, gap: spacing.lg },
  iconWrap: { width: 72, height: 72, borderRadius: radii.xl, backgroundColor: 'var(--dabbu-surface2)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: 'var(--dabbu-text)', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'var(--dabbu-text-secondary)', textAlign: 'center', lineHeight: 20, maxWidth: 320, alignSelf: 'center' },
  statValue: { fontSize: 18, fontWeight: '600', color: 'var(--dabbu-text)' },
  div: { height: 1, backgroundColor: 'var(--dabbu-border)', marginVertical: spacing.sm },
  primaryBtn: { height: 48, borderRadius: radii.lg, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center' },
  secBtn: { height: 48, borderRadius: radii.lg, borderWidth: 1, borderColor: 'var(--dabbu-border)', justifyContent: 'center', alignItems: 'center' },
});
