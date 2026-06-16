'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, Row, StyleSheet, spacing, radii } from '@/rn';

const REASON_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  removed: { title: 'Access Removed', subtitle: 'A group admin has removed you from this group. You can request access again if needed.' },
  closed: { title: 'Group Closed', subtitle: 'This group has been permanently closed. The expenses have been finalized.' },
  expired: { title: 'Access Expired', subtitle: 'This invite link is no longer active. It may have expired or been revoked.' },
  completed: { title: 'Trip Completed', subtitle: 'This group has been marked as complete. Access to shared data is no longer available.' },
  revoked: { title: 'Invite Revoked', subtitle: 'The invitation has been revoked by the group admin. Please contact them for a new invite.' },
  default: { title: 'Access Expired', subtitle: 'Your access to this group is no longer active. This could be because the group was closed, the invite expired, or you were removed.' },
};

function AccessExpiredPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const reason = sp.get('reason') || 'default';
  const groupName = sp.get('groupName');
  const groupType = sp.get('groupType');
  const dateStart = sp.get('dateStart');
  const dateEnd = sp.get('dateEnd');
  const msg = REASON_MESSAGES[reason] || REASON_MESSAGES.default;

  return (
    <View style={s.root}>
      <View style={s.content}>
        <View style={s.iconWrap}><Text style={{ fontSize: 40 }}>🔒</Text></View>
        <Text style={s.title}>{msg.title}</Text>
        <Text style={s.subtitle}>{msg.subtitle}</Text>
        {groupName && (
          <Card>
            <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: 'var(--dabbu-text)' }}>{groupName}</Text>
              {groupType && <View style={s.badge}><Text style={{ fontSize: 10, fontWeight: '600', color: 'var(--dabbu-accent)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{groupType}</Text></View>}
            </Row>
            {dateStart && dateEnd && (
              <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)' }}>
                {new Date(dateStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(dateEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            )}
          </Card>
        )}
        <TouchableOpacity style={s.primaryBtn}><Text style={{ fontSize: 15, fontWeight: '600', color: '#FFF' }}>Request Access Again</Text></TouchableOpacity>
        <TouchableOpacity style={s.secBtn} onPress={() => window.open('https://apps.apple.com/app/dabbu-split', '_blank')}><Text style={{ fontSize: 15, fontWeight: '500', color: 'var(--dabbu-text)' }}>Install Dabbu App</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => (window.location.href = 'mailto:support@dabbu.app')} style={{ paddingVertical: spacing.sm, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: 'var(--dabbu-text-muted)' }}>Contact Group Admin</Text>
        </TouchableOpacity>
        <View style={{ height: 1, backgroundColor: 'var(--dabbu-border)', marginVertical: spacing.sm }} />
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <View style={s.promoIcon}><Text style={{ fontSize: 24 }}>⚡</Text></View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: 'var(--dabbu-text)', textAlign: 'center' }}>Track your own expenses with Dabbu</Text>
          <Text style={{ fontSize: 12, color: 'var(--dabbu-text-secondary)', textAlign: 'center' }}>Get 1 month of Premium FREE when you sign up</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/auth')}><Text style={{ fontSize: 15, fontWeight: '600', color: '#FFF' }}>Get 1 Month Premium FREE</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/')} style={{ paddingVertical: spacing.md }}><Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)' }}>Start your own group</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function Page() { return <Suspense><AccessExpiredPage /></Suspense>; }

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'var(--dabbu-bg)' },
  content: { width: '100%', maxWidth: 500, gap: spacing.lg },
  iconWrap: { width: 72, height: 72, borderRadius: radii.xl, backgroundColor: 'var(--dabbu-errorBg)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: 'var(--dabbu-text)', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'var(--dabbu-text-secondary)', textAlign: 'center', lineHeight: 20, maxWidth: 320, alignSelf: 'center' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.full, backgroundColor: 'var(--dabbu-brandLight)' },
  primaryBtn: { height: 48, borderRadius: radii.lg, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center' },
  secBtn: { height: 48, borderRadius: radii.lg, borderWidth: 1, borderColor: 'var(--dabbu-border)', justifyContent: 'center', alignItems: 'center' },
  promoIcon: { width: 48, height: 48, borderRadius: radii.xl, backgroundColor: 'var(--dabbu-brandLight)', justifyContent: 'center', alignItems: 'center' },
});
