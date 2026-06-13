'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Card,
  Row,
  Spacer,
  Avatar,
  StyleSheet,
  spacing,
  radii,
} from '@/rn';
import { api, type Group } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { checkGroupAccess, resolveAccessStatus } from '@/lib/access-check';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface InviteData {
  group: Group;
  inviter: { name: string; avatar?: string };
  permissions: string[];
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated } = useAuth();

  const redirectIfNeeded = useCallback(
    async (groupId: string) => {
      const response = await checkGroupAccess(groupId);
      const { status, shouldRedirect } = resolveAccessStatus(response);
      if (!shouldRedirect) {
        return;
      }
      const routeMap: Record<string, string> = {
        expired: '/access-expired',
        completed: '/group-completed',
        archived: '/group-archived',
        removed: '/member-removed',
        closed: '/access-expired',
      };
      const route = routeMap[status] || '/access-expired';
      const qp = new URLSearchParams();
      const d = response.data;
      if (d?.groupName) {
        qp.set('groupName', d.groupName);
      }
      if (d?.groupType) {
        qp.set('groupType', d.groupType);
      }
      if (response.reason) {
        qp.set('reason', response.reason);
      }
      if (d?.totalSpent !== undefined) {
        qp.set('totalSpent', String(d.totalSpent));
      }
      if (d?.personalBalance !== undefined) {
        qp.set('balance', String(d.personalBalance));
      }
      if (d?.totalPaid !== undefined) {
        qp.set('totalPaid', String(d.totalPaid));
      }
      if (d?.totalOwed !== undefined) {
        qp.set('totalOwed', String(d.totalOwed));
      }
      if (d?.settlementStatus) {
        qp.set('settlement', d.settlementStatus);
      }
      if (d?.memberCount !== undefined) {
        qp.set('members', String(d.memberCount));
      }
      if (d?.yourContribution !== undefined) {
        qp.set('contribution', String(d.yourContribution));
      }
      if (d?.dateRange?.start) {
        qp.set('dateStart', d.dateRange.start);
      }
      if (d?.dateRange?.end) {
        qp.set('dateEnd', d.dateRange.end);
      }
      const qs = qp.toString();
      router.replace(qs ? `${route}?${qs}` : route);
    },
    [router],
  );

  useEffect(() => {
    if (token) {
      loadInvite();
    }
  }, [token]);

  const loadInvite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.groups.getInvite(token);
      if (res.error) {
        if (res.status === 401 || res.status === 403) {
          setError(
            res.status === 401
              ? 'This invite link is invalid or has expired'
              : "You don't have permission to access this invite",
          );
          return;
        }
        if (res.status === 410) {
          router.replace('/access-expired?reason=expired&message=invite_revoked');
          return;
        }
        setError(res.error);
        return;
      }
      const raw = res.data!;
      const g = raw.group as any;
      let group: Group = {
        id: g.id,
        name: g.name,
        type: g.type,
        description: g.description,
        memberCount: g._count?.members || 0,
        totalBalance: 0,
        members: [],
        createdAt: '',
        currency: g.currency || 'INR',
        _count: g._count,
      };
      const full = await api.groups.get(group.id);
      if (full.data) {
        group = full.data;
      }
      setInvite({ group, inviter: raw.inviter || { name: 'Someone' }, permissions: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/auth?redirect=/i/${token}`);
      return;
    }
    setJoining(true);
    const res = await api.groups.join(token);
    if (res.error) {
      toast.error(res.error);
      setJoining(false);
      return;
    }
    toast.success('Joined the group!');
    router.push(`/groups/${res.data?.groupId || invite?.group?.id}`);
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loader}>
          <Text style={styles.loaderText}>D</Text>
        </View>
        <View style={styles.loaderBar} />
        <View style={[styles.loaderBar, { width: 128 }]} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Card style={styles.errorCard}>
          <View style={styles.errorIconWrap}>
            <Text style={styles.errorIcon}>!</Text>
          </View>
          <Spacer />
          <Text style={styles.errorTitle}>Invite Not Found</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Spacer />
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/')}>
            <Text style={styles.primaryBtnText}>Go Home</Text>
          </TouchableOpacity>
        </Card>
      </View>
    );
  }

  if (!invite) {
    return null;
  }

  const group = invite.group;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent}>
      <View style={styles.glowBg} />
      <Card style={styles.inviteCard}>
        <View style={styles.inviteHeader}>
          <View style={styles.groupIcon}>
            <Text style={styles.groupIconText}>{getInitials(group.name)}</Text>
          </View>
          <View style={styles.inviteBadge}>
            <Text style={styles.inviteBadgeText}>You&apos;re invited!</Text>
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description && <Text style={styles.groupDesc}>{group.description}</Text>}
          <Row style={styles.groupStats}>
            <Row style={{ gap: 4 }}>
              <Text style={styles.statIcon}>👥</Text>
              <Text style={styles.statText}>{group.memberCount} members</Text>
            </Row>
            <Row style={{ gap: 4 }}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={styles.statText}>{formatCurrency(group.totalBalance)}</Text>
            </Row>
          </Row>
        </View>

        <View style={styles.membersSection}>
          <Text style={styles.sectionLabel}>Members</Text>
          {group.members.slice(0, 8).map((member) => (
            <Row key={member.id} style={styles.memberRow}>
              <Row style={{ gap: spacing.md, flex: 1 }}>
                <Avatar initials={getInitials(member.name)} size={32} online={member.isOnline} />
                <View>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>{member.role}</Text>
                </View>
              </Row>
              <Text
                style={[
                  styles.memberBalance,
                  member.balance > 0
                    ? styles.green
                    : member.balance < 0
                      ? styles.red
                      : styles.muted,
                ]}
              >
                {member.balance === 0 ? 'Settled' : formatCurrency(member.balance)}
              </Text>
            </Row>
          ))}
          {group.members.length > 8 && (
            <Text style={styles.moreMembers}>+{group.members.length - 8} more members</Text>
          )}
        </View>

        <View style={styles.actions}>
          {isAuthenticated ? (
            <TouchableOpacity
              style={[styles.primaryBtn, joining && { opacity: 0.6 }]}
              onPress={handleJoin}
              disabled={joining}
            >
              <Text style={styles.primaryBtnText}>
                {joining ? 'Joining...' : `Join ${group.name}`}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleJoin}>
                <Text style={styles.primaryBtnText}>Sign in to Join</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push(`/auth?redirect=/i/${token}`)}
              >
                <Text style={styles.secondaryBtnText}>Continue as Guest</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'var(--dabbu-bg, #000000)',
  },
  scrollContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    minHeight: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'var(--dabbu-bg, #000000)',
  },
  glowBg: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 600,
    height: 400,
    marginLeft: -300,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    borderRadius: 300,
  },
  loader: {
    width: 48,
    height: 48,
    borderRadius: radii.xl,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loaderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loaderBar: {
    width: 192,
    height: 16,
    borderRadius: radii.sm,
    backgroundColor: 'var(--dabbu-surface2, #1A1A1E)',
    marginBottom: spacing.md,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 28,
    color: 'var(--dabbu-red, #EF4444)',
    fontWeight: '800',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  inviteCard: {
    width: '100%',
    maxWidth: 500,
    padding: spacing.xxl,
  },
  inviteHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  groupIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  groupIconText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    marginBottom: spacing.md,
  },
  inviteBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'var(--dabbu-accent, #8B5CF6)',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '800',
    color: 'var(--dabbu-text, #FFFFFF)',
    textAlign: 'center',
  },
  groupDesc: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  groupStats: {
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  statIcon: {
    fontSize: 16,
  },
  statText: {
    fontSize: 13,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  membersSection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    marginBottom: spacing.md,
  },
  memberRow: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  memberRole: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
    textTransform: 'capitalize',
  },
  memberBalance: {
    fontSize: 13,
    fontWeight: '600',
  },
  green: {
    color: 'var(--dabbu-green, #10B981)',
  },
  red: {
    color: 'var(--dabbu-red, #EF4444)',
  },
  muted: {
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  moreMembers: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
  primaryBtn: {
    height: 56,
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
    height: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border, #2A2A2E)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
});
