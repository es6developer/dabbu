'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, Row, StyleSheet, spacing, radii } from '@/rn';
import { formatCurrency } from '@/lib/utils';

function GroupCompletedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const groupName = searchParams.get('groupName');
  const totalSpent = searchParams.get('totalSpent');
  const totalPaid = searchParams.get('totalPaid');
  const totalOwed = searchParams.get('totalOwed');
  const balance = searchParams.get('balance');
  const settlementStatus = searchParams.get('settlement');

  const spent = totalSpent ? parseFloat(totalSpent) : 0;
  const paid = totalPaid ? parseFloat(totalPaid) : 0;
  const owed = totalOwed ? parseFloat(totalOwed) : 0;
  const bal = balance ? parseFloat(balance) : 0;

  return (
    <View style={styles.root}>
      <View style={styles.glowBg} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>✅</Text>
        </View>
        <Text style={styles.title}>Trip Completed Successfully!</Text>
        <Text style={styles.subtitle}>
          {groupName ? `${groupName} has been wrapped up. ` : 'The group has been wrapped up. '}
          All expenses have been settled and finalized.
        </Text>

        <Card style={styles.summaryCard}>
          <View style={styles.totalSpentWrap}>
            <Text style={styles.totalLabel}>Total Spent</Text>
            <Text style={styles.totalValue}>{formatCurrency(spent)}</Text>
          </View>
          <Row style={{ gap: spacing.lg }}>
            <View style={styles.splitStat}>
              <Text style={styles.statLabel}>You Paid</Text>
              <Text style={[styles.statValue, styles.green]}>{formatCurrency(paid)}</Text>
            </View>
            <View style={styles.splitStat}>
              <Text style={styles.statLabel}>You Owed</Text>
              <Text style={[styles.statValue, styles.red]}>{formatCurrency(owed)}</Text>
            </View>
          </Row>
          {settlementStatus && (
            <View style={styles.statusWrap}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {settlementStatus === 'settled' ? 'All Settled' : 'Pending Settlement'}
              </Text>
            </View>
          )}
        </Card>

        <TouchableOpacity style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Download Settlement Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/auth')}>
          <Text style={styles.secondaryBtnText}>View Your Personal Summary</Text>
        </TouchableOpacity>

        <View style={styles.promoSection}>
          <Card variant="accent" style={styles.promoCard}>
            <Text style={styles.promoTitle}>Track all future trips with Dabbu</Text>
            <Text style={styles.promoDesc}>Your next trip deserves smarter finance tracking</Text>
            <TouchableOpacity style={styles.promoBtn} onPress={() => router.push('/auth')}>
              <Text style={styles.promoBtnText}>Get 1 Month Premium Free</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/')} style={styles.startBtn}>
              <Text style={styles.startBtnText}>Start your own group</Text>
            </TouchableOpacity>
          </Card>
        </View>

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
      <GroupCompletedPage />
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
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
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
  summaryCard: {
    gap: spacing.lg,
  },
  totalSpentWrap: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'var(--dabbu-border, #2A2A2E)',
  },
  totalLabel: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
    marginBottom: spacing.xs,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '800',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  splitStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  green: {
    color: 'var(--dabbu-green, #10B981)',
  },
  red: {
    color: 'var(--dabbu-red, #EF4444)',
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm - 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'var(--dabbu-green, #10B981)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'var(--dabbu-green, #10B981)',
  },
  primaryBtn: {
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
  promoSection: {
    marginTop: spacing.md,
  },
  promoCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  promoDesc: {
    fontSize: 12,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  promoBtn: {
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  promoBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startBtn: {
    paddingVertical: spacing.md,
  },
  startBtnText: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
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
