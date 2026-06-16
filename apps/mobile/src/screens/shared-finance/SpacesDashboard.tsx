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
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Avatar } from '../../components/ui/Avatar';

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
  couple: '💑',
  family: '👨‍👩‍👧‍👦',
  trip: '🏔️',
  friends: '👥',
  wedding: '💒',
  house_purchase: '🏠',
  office: '💼',
  event: '🎉',
  apartment: '🏢',
  sports: '⚽',
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
  return name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function SpacesDashboard() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useAuth();

  const [groups, setGroups] = useState<any[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const netBalance = useMemo(
    () => Object.values(groupBalances).reduce((s, b) => s + (b || 0), 0),
    [groupBalances],
  );

  const unsettledCount = useMemo(
    () => Object.values(groupBalances).filter((b) => Math.abs(b || 0) > 0).length,
    [groupBalances],
  );

  const settledPct = useMemo(() => {
    const total = groups.length;
    if (total === 0) return 100;
    const unsettled = Object.values(groupBalances).filter((b) => Math.abs(b || 0) > 0).length;
    return Math.round(((total - unsettled) / total) * 100);
  }, [groups, groupBalances]);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) return;
      if (!isRefresh) setLoading(true);
      try {
        const res = await api.get<any>('/shared-finance/groups');
        const list = Array.isArray(res) ? res : res?.items || [];
        setGroups(list);

        const balances: Record<string, number> = {};
        const currentUserId = (user as any)?.id;
        await Promise.allSettled(
          list.map(async (g: any) => {
            try {
              const b = await api.get<any>(`/shared-finance/groups/${g.id}/balances`);
              if (Array.isArray(b) && currentUserId) {
                const myEntry = b.find((e: any) => e.userId === currentUserId);
                if (myEntry) balances[g.id] = Number(myEntry.balance);
              }
            } catch {}
          }),
        );
        setGroupBalances(balances);
      } catch {
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, user],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleLongPress = () => {
    Vibration.vibrate(10);
  };

  type SpaceCardProps = {
    group: any;
    balance: number;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
  };

  function SpaceCard({ group, balance, index, isExpanded, onToggle }: SpaceCardProps) {
    const isOwe = balance < 0;
    const absBalance = Math.abs(balance);
    const gtype = group.type || 'friends';
    const gradient = COVER_GRADIENTS[gtype] || ['#6366F1', '#818CF8'];
    const emoji = COVER_EMOJIS[gtype] || '👥';
    const members = group.members || [];
    const memberCount = group._count?.members || members.length;
    const totalSpent = group.totalSpent || 0;
    const lastActive = group.lastActivityAt;
    const expenseCount = group._count?.expenses || 0;
    const isPrimary = index === 0;

    if (isPrimary) {
      const otherMember = members.find((m: any) => {
        const u = m.user || m;
        return u.id !== (user as any)?.id;
      });
      const otherName = otherMember
        ? `${otherMember.user?.firstName || otherMember.firstName || ''} ${otherMember.user?.lastName || otherMember.lastName || ''}`.trim()
        : '';

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
                <Text style={s.primaryBadge}>
                  {emoji} {gtype.charAt(0).toUpperCase() + gtype.slice(1)}
                </Text>
                <View style={s.activeDot} />
                <Text style={s.primaryLastActive}>
                  {lastActive ? timeSince(lastActive) : 'No activity yet'}
                  {lastActive ? '' : ''}
                </Text>
              </View>
              {absBalance > 0 && (
                <View style={[s.owePill, { backgroundColor: isOwe ? '#F59E0B20' : '#10B98120' }]}>
                  <Text style={[s.owePillText, { color: isOwe ? '#F59E0B' : '#10B981' }]}>
                    {isOwe ? `You owe ${fmt(absBalance)}` : `You're owed ${fmt(absBalance)}`}
                  </Text>
                </View>
              )}
            </View>

            <Text style={s.primaryTitle} numberOfLines={1}>
              {group.name || 'Shared Space'}
            </Text>

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
                  ✨ No expenses yet{'\n'}Share your first bill{' '}
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
            <Text style={[s.secBadge, { color: gradient[0] }]}>
              {emoji} {gtype.charAt(0).toUpperCase() + gtype.slice(1)}
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
                      </View>
                    )}
                  </View>
                );
              })}
              {memberCount > 3 && (
                <View style={[s.secAvatarMore, { backgroundColor: colors.bg.tertiary }]}>
                  <Text style={[s.secAvatarInitial, { color: colors.text.secondary, fontSize: 9 }]}>
                    +{memberCount - 3}
                  </Text>
                </View>
              )}
            </View>

            <View style={s.secMetaRight}>
              <Text style={[s.secMetaLabel, { color: colors.text.tertiary }]}>Spent</Text>
              <Text style={[s.secMetaValue, { color: colors.text.primary }]}>{fmt(totalSpent)}</Text>
            </View>

            {lastActive && (
              <View style={s.secMetaRight}>
                <Text style={[s.secMetaLabel, { color: colors.text.tertiary }]}>Active</Text>
                <Text style={[s.secMetaValue, { color: colors.text.tertiary, fontSize: 11 }]}>
                  {timeSince(lastActive)}
                </Text>
              </View>
            )}
          </View>

          {expenseCount > 0 && (
            <View style={s.budgetBarOuter}>
              <View style={[s.budgetBarFill, { width: `${Math.min((absBalance / (totalSpent || 1)) * 100, 100)}%`, backgroundColor: gradient[0] }]} />
            </View>
          )}

          <View style={s.secActions}>
            <TouchableOpacity
              style={[s.secBtnPrimary, { backgroundColor: gradient[0] }]}
              onPress={() => navigation.navigate('SharedExpenseForm', { groupId: group.id })}
            >
              <AntDesign  name="pluscircleo" size={14} color="#FFF" />
              <Text style={s.secBtnPrimaryText}>Add expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.secBtnOutline, { borderColor: colors.border.subtle }]}
              onPress={() => navigation.navigate('Settlement', { groupId: group.id, groupName: group.name })}
            >
              <Text style={[s.secBtnOutlineText, { color: colors.text.secondary }]}>
                {absBalance > 0 ? 'Settle up' : 'Settle'}
              </Text>
            </TouchableOpacity>
          </View>

          {isExpanded && expenseCount > 0 && (
            <View style={[s.recentExpenses, { borderTopColor: colors.border.subtle }]}>
              <Text style={[s.recentTitle, { color: colors.text.secondary }]}>Recent expenses</Text>
              <View style={s.recentPlaceholder}>
                <AntDesign  name="pluscircleo" size={14} color={colors.text.tertiary} />
                <Text style={[s.recentPlaceholderText, { color: colors.text.tertiary }]}>
                  {expenseCount} transactions • Tap to view all
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (loading && groups.length === 0) {
    return (
      <View style={[s.loading, { backgroundColor: '#F8FAFC' }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: '#F8FAFC' }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366F1"
          />
        }
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <View style={s.headerTop}>
            <View style={s.headerLeft}>
              <Text style={s.headerTitle}>Spaces</Text>
              <View style={s.netSummary}>
                <AntDesign  name="wallet" size={14} color="#6366F1" />
                <Text style={s.netSummaryText}>
                  {netBalance === 0
                    ? 'All settled up'
                    : `${fmt(Math.abs(netBalance))} to settle across ${unsettledCount} space${unsettledCount !== 1 ? 's' : ''}`}
                </Text>
              </View>
            </View>
            <View style={s.headerRight}>
              <View style={s.progressRing}>
                <Text style={s.progressText}>{settledPct}%</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('SettingsMain')}
                style={s.profileBtn}
              >
                {user?.avatarUrl ? (
                  <Avatar uri={user.avatarUrl} name={getInitials(user?.firstName || '')} size={36} />
                ) : (
                  <View style={s.profileFallback}>
                    <AntDesign  name="pluscircleo" size={18} color="#6366F1" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {netBalance !== 0 && (
            <View style={[s.amberPill, { backgroundColor: `${netBalance < 0 ? '#F59E0B' : '#10B981'}15` }]}>
              <AntDesign
                name={netBalance < 0 ? 'up' : 'down' as any}
                size={12}
                color={netBalance < 0 ? '#F59E0B' : '#10B981'}
              />
              <Text style={[s.amberPillText, { color: netBalance < 0 ? '#F59E0B' : '#10B981' }]}>
                {netBalance < 0
                  ? `You owe ${fmt(Math.abs(netBalance))} across ${unsettledCount} space${unsettledCount !== 1 ? 's' : ''}`
                  : `You're owed ${fmt(netBalance)} across ${unsettledCount} space${unsettledCount !== 1 ? 's' : ''}`}
              </Text>
            </View>
          )}
        </View>

        {/* Spaces list */}
        <View style={s.list}>
          {groups.length === 0 ? (
            <View style={s.emptyScreen}>
              <AntDesign  name="pluscircleo" size={48} color="#CBD5E1" />
              <Text style={s.emptyScreenTitle}>No spaces yet</Text>
              <Text style={s.emptyScreenDesc}>
                Create your first shared space to start tracking expenses together
              </Text>
              <TouchableOpacity
                style={s.createFirstBtn}
                onPress={() => navigation.navigate('CreateSharedGroup')}
              >
                <AntDesign  name="pluscircleo" size={18} color="#FFF" />
                <Text style={s.createFirstBtnText}>Create a space</Text>
              </TouchableOpacity>
            </View>
          ) : (
            groups.map((group: any, i: number) => (
              <SpaceCard
                key={group.id}
                group={group}
                balance={groupBalances[group.id] || 0}
                index={i}
                isExpanded={expandedId === group.id}
                onToggle={() => setExpandedId(expandedId === group.id ? null : group.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  netSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  netSummaryText: { fontSize: 13, fontWeight: '500', color: '#64748B' },

  progressRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  progressText: { fontSize: 11, fontWeight: '700', color: '#6366F1' },

  profileBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  profileFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F115',
    alignItems: 'center',
    justifyContent: 'center',
  },

  amberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  amberPillText: { fontSize: 12, fontWeight: '600' },

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
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  startBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

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
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secBtnPrimaryText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
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
});
