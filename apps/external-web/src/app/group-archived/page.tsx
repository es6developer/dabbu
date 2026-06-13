'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, Row, StyleSheet, spacing, radii } from '@/rn';
import { formatCurrency } from '@/lib/utils';

function GroupArchivedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const groupName = searchParams.get('groupName');
  const totalSpent = searchParams.get('totalSpent');
  const contribution = searchParams.get('contribution');
  const settlementStatus = searchParams.get('settlement');

  const spent = totalSpent ? parseFloat(totalSpent) : 0;
  const contrib = contribution ? parseFloat(contribution) : 0;

  return (
    <View style={styles.root}>
      <View style={styles.glowBg} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>📦</Text>
        </View>
        <Text style={styles.title}>This Group Has Been Archived</Text>
        <Text style={styles.subtitle}>
          {groupName ? `${groupName} is no longer active.` : 'This group is no longer active.'} The
          data is preserved but no new changes can be made.
        </Text>

        {spent > 0 && (
          <Card>
            <Row style={styles.statRow}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>{formatCurrency(spent)}</Text>
            </Row>
            <View style={styles.divider} />
            <Row style={styles.statRow}>
              <Text style={styles.statLabel}>Your Contribution</Text>
              <Text style={styles.statValue}>{formatCurrency(contrib)}</Text>
            </Row>
            {settlementStatus && (
              <>
                <View style={styles.divider} />
                <Row style={styles.statRow}>
                  <Text style={styles.statLabel}>Settlement</Text>
                  <Text
                    style={[
                      styles.statValueSm,
                      settlementStatus === 'settled' ? styles.green : styles.muted,
                    ]}
                  >
                    {settlementStatus === 'settled' ? 'Settled' : 'Pending'}
                  </Text>
                </Row>
              </>
            )}
          </Card>
        )}

        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth')}>
          <Text style={styles.primaryBtnText}>Continue your finance journey with Dabbu</Text>
        </TouchableOpacity>

        <Text style={styles.promoText}>
          Dabbu helps you track personal and shared expenses effortlessly
        </Text>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/')}>
          <Text style={styles.secondaryBtnText}>Get started free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.appBtn}
          onPress={() => window.open('https://apps.apple.com/app/dabbu-split', '_blank')}
        >
          <Text style={styles.appBtnText}>Install Dabbu App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Page() {
  return (
    <Suspense>
      <GroupArchivedPage />
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
  glowBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(139, 92, 246, 0.02)',
  },
  content: {
    width: '100%',
    maxWidth: 500,
    gap: spacing.lg,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radii.xl,
    backgroundColor: 'var(--dabbu-surface2, #1A1A1E)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 40,
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
    lineHeight: 20,
    maxWidth: 320,
    alignSelf: 'center',
  },
  statRow: {
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  statValueSm: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'var(--dabbu-border, #2A2A2E)',
    marginVertical: spacing.sm,
  },
  green: {
    color: 'var(--dabbu-green, #10B981)',
  },
  muted: {
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  primaryBtn: {
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  promoText: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
    textAlign: 'center',
  },
  secondaryBtn: {
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border, #2A2A2E)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  appBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  appBtnText: {
    fontSize: 14,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
});
