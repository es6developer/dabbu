'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  View, Text, ScrollView, TouchableOpacity, Card, Row, Avatar, StyleSheet, spacing, radii,
} from '@/rn';
import { api, type Group } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { checkGroupAccess, resolveAccessStatus } from '@/lib/access-check';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface InviteData { group: Group; inviter: { name: string; avatar?: string }; permissions: string[] }

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const redirectIfNeeded = useCallback(async (groupId: string) => {
    const response = await checkGroupAccess(groupId);
    const { status, shouldRedirect } = resolveAccessStatus(response);
    if (!shouldRedirect) return;
    const routeMap: Record<string, string> = { expired: '/access-expired', completed: '/group-completed', archived: '/group-archived', removed: '/member-removed', closed: '/access-expired' };
    const route = routeMap[status] || '/access-expired';
    const qp = new URLSearchParams();
    const d = response.data;
    if (d?.groupName) qp.set('groupName', d.groupName);
    if (d?.groupType) qp.set('groupType', d.groupType);
    if (response.reason) qp.set('reason', response.reason);
    if (d?.totalSpent !== undefined) qp.set('totalSpent', String(d.totalSpent));
    if (d?.personalBalance !== undefined) qp.set('balance', String(d.personalBalance));
    if (d?.totalPaid !== undefined) qp.set('totalPaid', String(d.totalPaid));
    if (d?.totalOwed !== undefined) qp.set('totalOwed', String(d.totalOwed));
    if (d?.settlementStatus) qp.set('settlement', d.settlementStatus);
    if (d?.memberCount !== undefined) qp.set('members', String(d.memberCount));
    if (d?.yourContribution !== undefined) qp.set('contribution', String(d.yourContribution));
    if (d?.dateRange?.start) qp.set('dateStart', d.dateRange.start);
    if (d?.dateRange?.end) qp.set('dateEnd', d.dateRange.end);
    const qs = qp.toString();
    router.replace(qs ? `${route}?${qs}` : route);
  }, [router]);

  useEffect(() => { if (token) loadInvite(); }, [token]);

  const loadInvite = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.groups.getInvite(token);
      if (res.error) {
        if (res.status === 401 || res.status === 403) { setError(res.status === 401 ? 'This invite link is invalid or has expired' : "You don't have permission to access this invite"); return; }
        if (res.status === 410) { router.replace('/access-expired?reason=expired&message=invite_revoked'); return; }
        setError(res.error); return;
      }
      const raw = res.data!;
      const group = raw.group;
      const full = await api.groups.get(group.id);
      setInvite({ group: full.data || group, inviter: raw.inviter || { name: 'Someone' }, permissions: [] });
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!isAuthenticated) { router.push(`/auth?redirect=/i/${token}`); return; }
    setJoining(true);
    const res = await api.groups.join(token);
    if (res.error) { toast.error(res.error); setJoining(false); return; }
    toast.success('Joined the group!');
    router.push(`/groups/${res.data?.groupId || invite?.group?.id}`);
  };

  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) return <View style={s.centered}><View style={s.loader}><Text style={s.loaderText}>D</Text></View><View style={{ width: 192, height: 12, borderRadius: radii.sm, backgroundColor: 'var(--dabbu-surface2)', marginBottom: spacing.md }} /></View>;

  if (error) return (
    <View style={s.centered}>
      <Card style={{ width: '100%', maxWidth: 400, alignItems: 'center', padding: spacing.xxl }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'var(--dabbu-errorBg)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: 'var(--dabbu-red)' }}>!</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: 'var(--dabbu-text)', textAlign: 'center', marginBottom: spacing.sm }}>Invite Not Found</Text>
        <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)', textAlign: 'center', marginBottom: spacing.lg }}>{error}</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/')}><Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>Go Home</Text></TouchableOpacity>
      </Card>
    </View>
  );

  if (!invite) return null;
  const group = invite.group;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scrollContent}>
      <Card style={{ width: '100%', maxWidth: 500, padding: spacing.xxl }}>
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <View style={{ width: 64, height: 64, borderRadius: radii.xl, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFF' }}>{initials(group.name)}</Text>
          </View>
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, backgroundColor: 'var(--dabbu-brandLight)', marginBottom: spacing.md }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: 'var(--dabbu-accent)' }}>You&apos;re invited!</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: 'var(--dabbu-text)', textAlign: 'center' }}>{group.name}</Text>
          {group.description && <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)', textAlign: 'center', marginTop: spacing.xs }}>{group.description}</Text>}
          <Row style={{ gap: spacing.lg, marginTop: spacing.md }}>
            <Row style={{ gap: 4 }}><Text style={{ fontSize: 16 }}>👥</Text><Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>{group.memberCount} members</Text></Row>
            <Row style={{ gap: 4 }}><Text style={{ fontSize: 16 }}>💰</Text><Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>{formatCurrency(group.totalBalance)}</Text></Row>
          </Row>
        </View>

        <View style={{ marginBottom: spacing.xl }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: 'var(--dabbu-text-secondary)', marginBottom: spacing.md }}>Members</Text>
          {group.members.slice(0, 8).map((member) => (
            <Row key={member.id} style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.md, marginBottom: 4 }}>
              <Row style={{ gap: spacing.md, flex: 1 }}>
                <Avatar initials={initials(member.name)} size={32} online={member.isOnline} />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: 'var(--dabbu-text)' }}>{member.name}</Text>
                  <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)', textTransform: 'capitalize' }}>{member.role}</Text>
                </View>
              </Row>
              <Text style={{ fontSize: 13, fontWeight: '500', color: member.balance > 0 ? 'var(--dabbu-green)' : member.balance < 0 ? 'var(--dabbu-red)' : 'var(--dabbu-text-muted)' }}>
                {member.balance === 0 ? 'Settled' : formatCurrency(member.balance)}
              </Text>
            </Row>
          ))}
          {group.members.length > 8 && <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)', textAlign: 'center', marginTop: spacing.sm }}>+{group.members.length - 8} more members</Text>}
        </View>

        <TouchableOpacity style={[s.primaryBtn, joining && { opacity: 0.6 }]} onPress={handleJoin} disabled={joining}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>{joining ? 'Joining...' : isAuthenticated ? `Join ${group.name}` : 'Sign in to Join'}</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'var(--dabbu-bg)' },
  scrollContent: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg, minHeight: '100%' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'var(--dabbu-bg)' },
  loader: { width: 48, height: 48, borderRadius: radii.xl, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  loaderText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  primaryBtn: { height: 52, borderRadius: radii.lg, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center' },
});
