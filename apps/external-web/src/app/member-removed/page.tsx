'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, Row, StyleSheet, spacing, radii } from '@/rn';
import { formatCurrency } from '@/lib/utils';

function MemberRemovedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const balance = searchParams.get('balance');

  const outstandingBalance = balance ? parseFloat(balance) : 0;

  return (
    <View style={styles.root}>
      <View style={styles.glowBg} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>ℹ️</Text>
        </View>
        <Text style={styles.title}>You&apos;ve Been Removed from the Group</Text>
        <Text style={styles.subtitle}>A group admin has removed you from this group.</Text>

        {outstandingBalance !== 0 && (
          <Card style={styles.balanceCard}>
            <Row style={{ gap: spacing.md }}>
              <View style={styles.warningIcon}>
                <Text style={styles.warningIconText}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceText}>
                  You had an outstanding balance of{' '}
                  <Text
                    style={[
                      styles.balanceValue,
                      outstandingBalance > 0 ? styles.green : styles.red,
                    ]}
                  >
                    {formatCurrency(Math.abs(outstandingBalance))}
                  </Text>
                  .
                </Text>
                <Text style={styles.balanceHint}>Please contact the group admin to settle.</Text>
              </View>
            </Row>
          </Card>
        )}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => (window.location.href = 'mailto:support@dabbu.app')}
        >
          <Text style={styles.primaryBtnText}>Contact Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => window.open('https://apps.apple.com/app/dabbu-split', '_blank')}
        >
          <Text style={styles.secondaryBtnText}>Install Dabbu App</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/')} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Start your own group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Page() {
  return (
    <Suspense>
      <MemberRemovedPage />
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
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
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
  balanceCard: {
    borderWidth: 1,
    borderColor: 'var(--dabbu-border, #2A2A2E)',
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningIconText: {
    fontSize: 18,
    color: 'var(--dabbu-red, #EF4444)',
    fontWeight: '800',
  },
  balanceText: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
  },
  balanceValue: {
    fontWeight: '700',
  },
  balanceHint: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
    marginTop: spacing.xs,
  },
  green: {
    color: 'var(--dabbu-green, #10B981)',
  },
  red: {
    color: 'var(--dabbu-red, #EF4444)',
  },
  primaryBtn: {
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
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
  ghostBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontSize: 14,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
});
