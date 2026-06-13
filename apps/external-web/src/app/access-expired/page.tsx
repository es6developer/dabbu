'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, Row, StyleSheet, spacing, radii } from '@/rn';

const REASON_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  removed: {
    title: 'Access Removed',
    subtitle:
      'A group admin has removed you from this group. You can request access again if needed.',
  },
  closed: {
    title: 'Group Closed',
    subtitle: 'This group has been permanently closed. The expenses have been finalized.',
  },
  expired: {
    title: 'Access Expired',
    subtitle: 'This invite link is no longer active. It may have expired or been revoked.',
  },
  completed: {
    title: 'Trip Completed',
    subtitle:
      'This group has been marked as complete. Access to shared data is no longer available.',
  },
  revoked: {
    title: 'Invite Revoked',
    subtitle:
      'The invitation has been revoked by the group admin. Please contact them for a new invite.',
  },
  default: {
    title: 'Access Expired',
    subtitle:
      'Your access to this group is no longer active. This could be because the group was closed, the invite expired, or you were removed.',
  },
};

function AccessExpiredPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const reason = searchParams.get('reason') || 'default';
  const groupName = searchParams.get('groupName');
  const groupType = searchParams.get('groupType');
  const dateStart = searchParams.get('dateStart');
  const dateEnd = searchParams.get('dateEnd');

  const msg = REASON_MESSAGES[reason] || REASON_MESSAGES.default;

  return (
    <View style={styles.root}>
      <View style={styles.glowBg} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🔒</Text>
        </View>
        <Text style={styles.title}>{msg.title}</Text>
        <Text style={styles.subtitle}>{msg.subtitle}</Text>

        {groupName && (
          <Card>
            <Row style={styles.groupRow}>
              <Text style={styles.groupName}>{groupName}</Text>
              {groupType && (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{groupType}</Text>
                </View>
              )}
            </Row>
            {dateStart && dateEnd && (
              <Text style={styles.dateRange}>
                {new Date(dateStart).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                –{' '}
                {new Date(dateEnd).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            )}
          </Card>
        )}

        <TouchableOpacity style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Request Access Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => window.open('https://apps.apple.com/app/dabbu-split', '_blank')}
        >
          <Text style={styles.secondaryBtnText}>Install Dabbu App</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => (window.location.href = 'mailto:support@dabbu.app')}
          style={styles.ghostBtn}
        >
          <Text style={styles.ghostBtnText}>Contact Group Admin</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.promoSection}>
          <View style={styles.promoIconWrap}>
            <Text style={styles.promoIcon}>⚡</Text>
          </View>
          <Text style={styles.promoTitle}>Track your own expenses with Dabbu</Text>
          <Text style={styles.promoDesc}>Get 1 month of Premium FREE when you sign up</Text>
          <TouchableOpacity style={styles.promoBtn} onPress={() => router.push('/auth')}>
            <Text style={styles.promoBtnText}>Get 1 Month Premium FREE</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.startBtn}>
            <Text style={styles.startBtnText}>Start your own group</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function Page() {
  return (
    <Suspense>
      <AccessExpiredPage />
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
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
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
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
  groupRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  typeBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'var(--dabbu-accent, #8B5CF6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRange: {
    fontSize: 12,
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
    flexDirection: 'row',
    gap: spacing.sm,
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
  divider: {
    height: 1,
    backgroundColor: 'var(--dabbu-border, #2A2A2E)',
    marginVertical: spacing.sm,
  },
  promoSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  promoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  promoIcon: {
    fontSize: 24,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
    textAlign: 'center',
  },
  promoDesc: {
    fontSize: 12,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    textAlign: 'center',
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
});
