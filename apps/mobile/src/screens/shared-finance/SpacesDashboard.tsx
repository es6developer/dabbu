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

<<<<<<< Updated upstream
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
=======
const COVER_GRADIENTS: Record<string, [string, string]> = {
  couple: ['#7C3AED', '#A78BFA'],
  family: ['#2563EB', '#60A5FA'],
  trip: ['#0D9488', '#2DD4BF'],
  friends: ['#DC2626', '#FB7185'],
  wedding: ['#BE185D', '#F472B6'],
  house_purchase: ['#F97316', '#FDBA74'],
  office: ['#4F46E5', '#818CF8'],
  event: ['#D97706', '#FCD34D'],
  apartment: ['#1F2937', '#6B7280'],
  sports: ['#059669', '#34D399'],
};

const COVER_EMOJIS: Record<string, string> = {
  couple: 'heart',
  family: 'team',
  trip: 'enviroment',
  friends: 'team',
  wedding: 'heart',
  house_purchase: 'home',
  office: 'briefcase',
  event: 'star',
  apartment: 'building',
  sports: 'Trophy',
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    const coverColor = COVER_COLORS[gtype] || colors.accent.primary;
=======
    const gradient = COVER_GRADIENTS[gtype] || ['#6366F1', '#818CF8'];
    const icon = COVER_EMOJIS[gtype] || 'team';
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
      return (
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={onToggle}
          onLongPress={handleLongPress}
          style={[s.primaryCard, { shadowColor: gradient[0] }]}
        >
          <View style={[s.primaryGradient, { backgroundColor: gradient[0] }]}>
            <View style={s.primaryTop}>
              <View style={s.primaryBadgeRow}>
                <AntDesign name={icon as any} size={18} color="rgba(255,255,255,0.85)" />
                <Text style={s.primaryBadge}>
                  {gtype.charAt(0).toUpperCase() + gtype.slice(1)}
                </Text>
                <View style={s.activeDot} />
                <Text style={s.primaryLastActive}>
                  {lastActive ? timeSince(lastActive) : 'No activity yet'}
                  {lastActive ? '' : ''}
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
            {/* Members */}
            <View style={s.memberRow}>
              <View style={s.avatarStack}>
                {memberAvatars.map((m: any, i: number) => (
                  <View key={m.id || i} style={[s.avatar, { marginLeft: i > 0 ? -8 : 0, borderColor: isPrimary ? 'rgba(255,255,255,0.3)' : colors.bg.card }]}>
                    {m.avatar ? <Avatar uri={m.avatar} name={m.name} size={24} /> : (
                      <View style={[s.avatarFallback, { backgroundColor: isPrimary ? 'rgba(255,255,255,0.2)' : colors.bg.tertiary }]}>
                        <Text style={[s.avatarInitial, { color: isPrimary ? '#FFF' : colors.text.secondary }]}>{getInitials(m.name || '?')}</Text>
=======
            {otherName ? (
              <View style={s.primaryMembers}>
                {members.slice(0, 2).map((m: any, i: number) => {
                  const u = m.user || m;
                  return (
                    <View key={u?.id || i} style={[s.primaryAvatar, { marginLeft: i > 0 ? -12 : 0 }]}>
                      {u?.avatarUrl ? (
                        <Avatar uri={u.avatarUrl} name={getInitials(u.firstName || '')} size={32} />
                      ) : (
                        <View style={s.primaryAvatarFallback}>
                          <Text style={s.primaryAvatarInitial}>
                            {getInitials(u?.firstName || u?.name || '?')}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
                <Text style={s.primaryMemberName}>{otherName}</Text>
              </View>
            ) : (
              <Text style={s.primaryMemberCount}>{memberCount} members</Text>
            )}

            {!expenseCount && (
              <View style={s.emptyState}>
                <Text style={s.emptyStateText}>
                  No expenses yet{'\n'}Share your first bill{' '}
                  {otherName ? `with ${otherName.split(' ')[0]}` : ''} →
                </Text>
              </View>
            )}

            {!expenseCount && (
              <TouchableOpacity
                style={s.startBtn}
                onPress={() =>
                  navigation.navigate('SharedExpenseForm', { groupId: group.id })
                }
              >
                <AntDesign  name="pluscircleo" size={16} color="#FFF" />
                <Text style={s.startBtnText}>
                  {otherName ? `Add expense with ${otherName.split(' ')[0]}` : 'Add expense'}
                </Text>
              </TouchableOpacity>
            )}

            {expenseCount > 0 && (
              <TouchableOpacity
                style={s.startBtn}
                onPress={() =>
                  navigation.navigate('SharedExpenseForm', { groupId: group.id })
                }
              >
                <Text style={s.startBtnText}>Start tracking shared expenses →</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    const owes = absBalance > 0
      ? Object.entries(groupBalances)
          .filter(([gid, bal]) => gid === group.id && bal !== undefined)
          .map(([gid, bal]) => bal)
      : [];

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onToggle}
        onLongPress={handleLongPress}
        style={[s.secondaryCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
      >
        <View style={s.secTop}>
          <View style={s.secBadgeRow}>
            <AntDesign name={icon as any} size={18} color={gradient[0]} />
            <Text style={[s.secBadge, { color: gradient[0] }]}>
              {gtype.charAt(0).toUpperCase() + gtype.slice(1)}
            </Text>
            {absBalance > 0 && (
              <View style={[s.owePill, { backgroundColor: isOwe ? '#F59E0B20' : '#10B98120' }]}>
                <Text style={[s.owePillText, { color: isOwe ? '#F59E0B' : '#10B981' }]}>
                  {isOwe ? `You owe ${fmt(absBalance)}` : `Owed ${fmt(absBalance)}`}
                </Text>
              </View>
            )}
          </View>

          <Text style={[s.secTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {group.name || 'Shared Space'}
          </Text>

          <View style={s.secMetaRow}>
            <View style={s.secAvatars}>
              {members.slice(0, 3).map((m: any, i: number) => {
                const u = m.user || m;
                return (
                  <View key={u?.id || i} style={[s.secAvatarWrap, { marginLeft: i > 0 ? -8 : 0 }]}>
                    {u?.avatarUrl ? (
                      <Avatar uri={u.avatarUrl} name={getInitials(u.firstName || '')} size={24} />
                    ) : (
                      <View style={[s.secAvatarFallback, { backgroundColor: colors.bg.tertiary }]}>
                        <Text style={[s.secAvatarInitial, { color: colors.text.secondary }]}>
                          {getInitials(u?.firstName || u?.name || '?')}
                        </Text>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <View style={s.headerTop}>
            <View style={s.headerLeft}>
              <Text style={s.headerTitle}>Spaces</Text>
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
          {netBalance !== 0 && (
            <View style={[s.balanceBanner, { backgroundColor: (netBalance < 0 ? '#F59E0B' : '#22C55E') + '10' }]}>
              <AntDesign name={netBalance < 0 ? 'arrowup' : 'arrowdown'} size={10} color={netBalance < 0 ? '#F59E0B' : '#22C55E'} />
              <Text style={[s.balanceBannerText, { color: netBalance < 0 ? '#F59E0B' : '#22C55E' }]}>
                {netBalance < 0 ? `You owe ${fmt(Math.abs(netBalance))}` : `You're owed ${fmt(netBalance)}`}
              </Text>
            </View>
          )}
=======

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3 },
  netRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  netText: { fontSize: 13, fontWeight: '400' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settledRing: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
=======

  /* Header */
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 34, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
>>>>>>> Stashed changes
  },
  settledText: { fontSize: 10, fontWeight: '700' },
  profileBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  profileFallback: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  balanceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, alignSelf: 'flex-start', marginTop: spacing.md,
  },
<<<<<<< Updated upstream
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
=======

  /* List */
  list: { paddingHorizontal: 20, gap: 16 },

  /* Primary Card */
  primaryCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  primaryGradient: {
    padding: 20,
    gap: 12,
  },
  primaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  primaryBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryBadge: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#34D399' },
  primaryLastActive: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  primaryTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  primaryMembers: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  primaryAvatar: { borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  primaryAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAvatarInitial: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  primaryMemberName: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginLeft: 8 },
  primaryMemberCount: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  emptyState: { marginTop: 8 },
  emptyStateText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)', lineHeight: 20 },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  /* Secondary Card */
  secondaryCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  secTop: { gap: 10 },
  secBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secBadge: { fontSize: 11, fontWeight: '600' },
  secTitle: { fontSize: 17, fontWeight: '700' },
  secMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  secAvatars: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  secAvatarWrap: { borderRadius: 12, borderWidth: 2, borderColor: '#FFF' },
  secAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secAvatarInitial: { fontSize: 10, fontWeight: '700' },
  secAvatarMore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  secMetaRight: { alignItems: 'flex-end' },
  secMetaLabel: { fontSize: 10, fontWeight: '500' },
  secMetaValue: { fontSize: 13, fontWeight: '700', marginTop: 1 },

  owePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  owePillText: { fontSize: 11, fontWeight: '700' },

  budgetBarOuter: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  budgetBarFill: { height: '100%', borderRadius: 2 },

  secActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  secBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  secBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  secBtnOutline: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  secBtnOutlineText: { fontSize: 12, fontWeight: '700' },

  recentExpenses: { borderTopWidth: 1, paddingTop: 12, marginTop: 8 },
  recentTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  recentPlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentPlaceholderText: { fontSize: 12, fontWeight: '500' },

  /* Empty */
  emptyScreen: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyScreenTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  emptyScreenDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  createFirstBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
>>>>>>> Stashed changes
});
