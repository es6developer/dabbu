import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Vibration,
  Animated,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { spacing, borderRadius, shadows, sectionHeader } from '../../theme/design';

const COVER_COLORS: Record<string, string> = {
  couple: '#7C3AED',
  family: '#2563EB',
  trip: '#0D9488',
  friends: '#DC2626',
  wedding: '#BE185D',
  house_purchase: '#F97316',
  office: '#4F46E5',
  event: '#D97706',
  apartment: '#1F2937',
  sports: '#059669',
};

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function timeSince(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getInitials(name: string) {
  return name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
}

export function SpacesDashboard() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useAuth();

  const [groups, setGroups] = useState<any[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const netBalance = useMemo(() => Object.values(groupBalances).reduce((s, b) => s + (b || 0), 0), [groupBalances]);
  const unsettledCount = useMemo(() => Object.values(groupBalances).filter(b => Math.abs(b || 0) > 0).length, [groupBalances]);
  const settledPct = useMemo(() => {
    const total = groups.length;
    if (total === 0) return 100;
    const unsettled = Object.values(groupBalances).filter(b => Math.abs(b || 0) > 0).length;
    return Math.round(((total - unsettled) / total) * 100);
  }, [groups, groupBalances]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.get<any>('/shared-finance/groups');
      const list = Array.isArray(res) ? res : res?.items || [];
      setGroups(list);
      const balances: Record<string, number> = {};
      const currentUserId = (user as any)?.id;
      await Promise.allSettled(list.map(async (g: any) => {
        try {
          const b = await api.get<any>(`/shared-finance/groups/${g.id}/balances`);
          if (Array.isArray(b) && currentUserId) {
            const myEntry = b.find((e: any) => e.userId === currentUserId);
            if (myEntry) balances[g.id] = Number(myEntry.balance);
          }
        } catch {}
      }));
      setGroupBalances(balances);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [accessToken, user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  function SpaceCard({ group, balance, index, isExpanded, onToggle }: {
    group: any; balance: number; index: number; isExpanded: boolean; onToggle: () => void;
  }) {
    const isOwe = balance < 0;
    const absBalance = Math.abs(balance);
    const gtype = group.type || 'friends';
    const coverColor = COVER_COLORS[gtype] || colors.accent.primary;
    const members = group.members || [];
    const memberCount = group._count?.members || members.length;
    const totalSpent = group.totalSpent || 0;
    const lastActive = group.lastActivityAt;
    const expenseCount = group._count?.expenses || 0;
    const isPrimary = index === 0;

    const memberAvatars = members.slice(0, 3).map((m: any) => {
      const u = m.user || m;
      return { id: u?.id, name: u?.firstName || '', avatar: u?.avatarUrl };
    });

    const otherMember = members.find((m: any) => {
      const u = m.user || m;
      return u.id !== (user as any)?.id;
    });
    const otherName = otherMember
      ? `${otherMember.user?.firstName || otherMember.firstName || ''}`.trim()
      : '';

    return (
      <TouchableOpacity activeOpacity={0.95} onPress={onToggle} onLongPress={() => Vibration.vibrate(10)}>
        <View style={isPrimary ? s.primaryCard : [s.secondaryCard, { backgroundColor: colors.bg.card }]}>
          <View style={isPrimary ? [s.primaryInner, { backgroundColor: coverColor }] : undefined}>
            {/* Badge Row */}
            <View style={s.badgeRow}>
              <View style={[s.badge, isPrimary ? s.badgeLight : { backgroundColor: `${coverColor}0A` }]}>
                <AntDesign name={gtype === 'couple' ? 'heart' : 'team'} size={10} color={isPrimary ? '#FFF' : coverColor} />
                <Text style={[s.badgeLabel, { color: isPrimary ? 'rgba(255,255,255,0.85)' : coverColor }]}>
                  {gtype.charAt(0).toUpperCase() + gtype.slice(1)}
                </Text>
              </View>
              {lastActive && (
                <Text style={[s.lastActive, { color: isPrimary ? 'rgba(255,255,255,0.55)' : colors.text.tertiary }]}>
                  {timeSince(lastActive)}
                </Text>
              )}
            </View>

            {/* Title */}
            <Text style={[s.spaceTitle, { color: isPrimary ? '#FFF' : colors.text.primary }]} numberOfLines={1}>
              {group.name || 'Shared Space'}
            </Text>

            {/* Members */}
            <View style={s.memberRow}>
              <View style={s.avatarStack}>
                {memberAvatars.map((m: any, i: number) => (
                  <View key={m.id || i} style={[s.avatar, { marginLeft: i > 0 ? -8 : 0, borderColor: isPrimary ? 'rgba(255,255,255,0.3)' : colors.bg.card }]}>
                    {m.avatar ? <Avatar uri={m.avatar} name={m.name} size={24} /> : (
                      <View style={[s.avatarFallback, { backgroundColor: isPrimary ? 'rgba(255,255,255,0.2)' : colors.bg.tertiary }]}>
                        <Text style={[s.avatarInitial, { color: isPrimary ? '#FFF' : colors.text.secondary }]}>{getInitials(m.name || '?')}</Text>
                      </View>
                    )}
                  </View>
                ))}
                {memberCount > 3 && (
                  <View style={[s.avatarMore, { backgroundColor: colors.bg.tertiary, borderColor: isPrimary ? 'rgba(255,255,255,0.3)' : colors.bg.card }]}>
                    <Text style={[s.avatarInitial, { fontSize: 9, color: colors.text.secondary }]}>+{memberCount - 3}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.memberCount, { color: isPrimary ? 'rgba(255,255,255,0.65)' : colors.text.secondary }]}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>

            {/* Balance */}
            {absBalance > 0 && (
              <View style={[s.balancePill, { backgroundColor: isPrimary ? 'rgba(255,255,255,0.15)' : (isOwe ? '#F59E0B10' : '#22C55E10') }]}>
                <AntDesign name={isOwe ? 'arrowup' : 'arrowdown'} size={10} color={isPrimary ? '#FFF' : (isOwe ? '#F59E0B' : '#22C55E')} />
                <Text style={[s.balanceText, { color: isPrimary ? '#FFF' : (isOwe ? '#F59E0B' : '#22C55E') }]}>
                  {isOwe ? `You owe ${fmt(absBalance)}` : `You're owed ${fmt(absBalance)}`}
                </Text>
              </View>
            )}

            {/* Progress Bar */}
            {totalSpent > 0 && (
              <View style={[s.progressBar, { backgroundColor: isPrimary ? 'rgba(255,255,255,0.15)' : colors.border.subtle }]}>
                <View style={[s.progressFill, { width: `${Math.min((absBalance / totalSpent) * 100, 100)}%`, backgroundColor: isPrimary ? '#FFF' : coverColor }]} />
              </View>
            )}

            {/* Actions */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: isPrimary ? 'rgba(255,255,255,0.18)' : coverColor }]}
                onPress={() => navigation.navigate('SharedExpenseForm', { groupId: group.id })}>
                <AntDesign name="pluscircleo" size={12} color="#FFF" />
                <Text style={s.actionBtnText}>Add</Text>
              </TouchableOpacity>
              {absBalance > 0 && (
                <TouchableOpacity
                  style={[s.actionBtnOutline, { borderColor: isPrimary ? 'rgba(255,255,255,0.25)' : colors.border.subtle }]}
                  onPress={() => navigation.navigate('Settlement', { groupId: group.id, groupName: group.name })}>
                  <Text style={[s.actionBtnOutlineText, { color: isPrimary ? 'rgba(255,255,255,0.8)' : colors.text.secondary }]}>Settle</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading && groups.length === 0) {
    return <View style={[s.loading, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator size="large" color={colors.accent.primary} />
    </View>;
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['5xl'] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} tintColor={colors.accent.primary} />}
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + spacing.xl }]}>
          <View style={s.headerRow}>
            <View>
              <Text style={[s.headerTitle, { color: colors.text.primary }]}>Spaces</Text>
              <View style={s.netRow}>
                <AntDesign name="wallet" size={12} color={colors.text.secondary} />
                <Text style={[s.netText, { color: colors.text.secondary }]}>
                  {netBalance === 0 ? 'All settled up' : `${fmt(Math.abs(netBalance))} to settle across ${unsettledCount} space${unsettledCount !== 1 ? 's' : ''}`}
                </Text>
              </View>
            </View>
            <View style={s.headerRight}>
              <View style={[s.settledRing, { borderColor: colors.accent.primary }]}>
                <Text style={[s.settledText, { color: colors.accent.primary }]}>{settledPct}%</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('SettingsMain')} style={s.profileBtn}>
                {user?.avatarUrl ? <Avatar uri={user.avatarUrl} name={getInitials(user?.firstName || '')} size={36} /> : (
                  <View style={[s.profileFallback, { backgroundColor: `${colors.accent.primary}0A` }]}>
                    <AntDesign name="user" size={16} color={colors.accent.primary} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {netBalance !== 0 && (
            <View style={[s.balanceBanner, { backgroundColor: (netBalance < 0 ? '#F59E0B' : '#22C55E') + '10' }]}>
              <AntDesign name={netBalance < 0 ? 'arrowup' : 'arrowdown'} size={10} color={netBalance < 0 ? '#F59E0B' : '#22C55E'} />
              <Text style={[s.balanceBannerText, { color: netBalance < 0 ? '#F59E0B' : '#22C55E' }]}>
                {netBalance < 0 ? `You owe ${fmt(Math.abs(netBalance))}` : `You're owed ${fmt(netBalance)}`}
              </Text>
            </View>
          )}
        </View>

        {/* Space Cards */}
        <View style={s.list}>
          {groups.length === 0 ? (
            <View style={s.empty}>
              <AntDesign name="team" size={44} color={colors.text.tertiary} />
              <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No spaces yet</Text>
              <Text style={[s.emptyDesc, { color: colors.text.secondary }]}>
                Create your first shared space to track expenses together
              </Text>
              <TouchableOpacity
                style={[s.createBtn, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('CreateSharedGroup')}>
                <AntDesign name="pluscircleo" size={16} color="#FFF" />
                <Text style={s.createBtnText}>Create a space</Text>
              </TouchableOpacity>
            </View>
          ) : groups.map((group: any, i: number) => (
            <SpaceCard
              key={group.id} group={group}
              balance={groupBalances[group.id] || 0}
              index={i}
              isExpanded={expandedId === group.id}
              onToggle={() => setExpandedId(expandedId === group.id ? null : group.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3 },
  netRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  netText: { fontSize: 13, fontWeight: '400' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settledRing: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
  },
  settledText: { fontSize: 10, fontWeight: '700' },
  profileBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  profileFallback: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  balanceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, alignSelf: 'flex-start', marginTop: spacing.md,
  },
  balanceBannerText: { fontSize: 12, fontWeight: '600' },
  list: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  // Primary Card
  primaryCard: { borderRadius: borderRadius['4xl'], overflow: 'hidden', ...shadows.lg },
  primaryInner: { padding: spacing.xl, gap: spacing.sm },
  // Secondary Card
  secondaryCard: { borderRadius: borderRadius['3xl'], padding: spacing.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent', ...shadows.md },
  // Shared styles
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 999 },
  badgeLight: { backgroundColor: 'rgba(255,255,255,0.18)' },
  badgeLabel: { fontSize: 10, fontWeight: '600' },
  lastActive: { fontSize: 10, fontWeight: '400' },
  spaceTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2, marginTop: 2 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatar: { borderRadius: 12, borderWidth: 2 },
  avatarFallback: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 10, fontWeight: '700' },
  avatarMore: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: -8, borderWidth: 2 },
  memberCount: { fontSize: 11, fontWeight: '400' },
  balancePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999, alignSelf: 'flex-start' },
  balanceText: { fontSize: 11, fontWeight: '600' },
  progressBar: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: spacing.xs },
  progressFill: { height: '100%', borderRadius: 2 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius['2xl'] },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  actionBtnOutline: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius['2xl'], borderWidth: 1 },
  actionBtnOutlineText: { fontSize: 12, fontWeight: '600' },
  // Empty
  empty: { alignItems: 'center', paddingTop: spacing['8xl'], gap: spacing.md },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyDesc: { fontSize: 13, fontWeight: '400', textAlign: 'center', paddingHorizontal: spacing['5xl'], lineHeight: 20 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md, borderRadius: borderRadius['2xl'], marginTop: spacing.sm },
  createBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
