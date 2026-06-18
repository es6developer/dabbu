import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useCoupleMode, COUPLE_COLORS } from '../../hooks/useCoupleMode';
import { Avatar } from '../../components/ui/Avatar';

const HUB_CATEGORIES = [
  { key: 'couple', label: 'Couple', icon: 'heart', color: '#F43F5E' },
  { key: 'family', label: 'Family', icon: 'home', color: '#2563EB' },
  { key: 'friends', label: 'Friends', icon: 'people', color: '#16A34A' },
  { key: 'trip', label: 'Trips', icon: 'earth', color: '#0D9488' },
] as const;

function fmtCompact(v: number) {
  if (v >= 10000000) return '\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '\u20B9' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '\u20B9' + (v / 1000).toFixed(1) + 'K';
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function FamilyHubScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const couple = useCoupleMode();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/shared-finance/groups');
      const data = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.groups || [];
      setGroups(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadGroups(); }, [loadGroups]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  }, [loadGroups]);

  const categorized = useMemo(() => {
    const map: Record<string, any[]> = { couple: [], family: [], friends: [], trip: [], other: [] };
    groups.forEach((g: any) => {
      const type = (g.type || g.groupType || 'other').toLowerCase();
      if (map[type]) map[type].push(g);
      else map.other.push(g);
    });
    return map;
  }, [groups]);

  const filteredGroups = activeFilter
    ? categorized[activeFilter] || []
    : groups;

  const currentUserId = user?.id || '';

  function renderGroupCard(group: any) {
    const type = (group.type || group.groupType || 'friends').toLowerCase();
    const cat = HUB_CATEGORIES.find(c => c.key === type) || HUB_CATEGORIES[2];
    const memberCount = group.members?.length || group._count?.members || 0;
    const balance = group.balance || 0;
    const totalSpent = group.totalSpent || 0;
    const members: any[] = group.members || [];
    const maxAvatars = 4;
    const visibleMembers = members.slice(0, maxAvatars);
    const overflow = memberCount - maxAvatars;

    function getBalanceDisplay(member: any): string {
      const mb = member.balance || 0;
      if (mb === 0) return 'settled';
      return (mb < 0 ? 'owes ' : 'gets ') + fmt(Math.abs(mb));
    }

    return (
      <TouchableOpacity
        key={group.id}
        activeOpacity={0.7}
        style={[styles.groupCard, { backgroundColor: colors.bg.card, shadowColor: colors.shadow }]}
        onPress={() => navigation.navigate('SharedGroupDetail', { groupId: group.id, group })}
      >
        <View style={styles.groupHeader}>
          <View style={[styles.groupIcon, { backgroundColor: cat.color + '20' }]}>
            <AntDesign name={cat.icon as any} size={20} color={cat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.groupName, { color: colors.text.primary }]} numberOfLines={1}>
              {group.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={[styles.groupMeta, { color: colors.text.tertiary }]}>
                {memberCount} members
              </Text>
              <View style={[{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: cat.color + '20' }]}>
                <Text style={{ color: cat.color, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>{cat.label}</Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.balanceAmount, {
              color: balance > 0 ? colors.status.success : balance < 0 ? colors.status.error : colors.text.secondary
            }]}>
              {balance > 0 ? '+' : ''}{fmtCompact(balance)}
            </Text>
            <Text style={[styles.balanceLabel, { color: colors.text.tertiary }]}>
              {balance > 0 ? 'you get' : balance < 0 ? 'you owe' : 'settled'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 }}>
          {visibleMembers.map((m: any, i: number) => {
            const name = m.user?.firstName || m.user?.email || 'M';
            const color = HUB_CATEGORIES[i % HUB_CATEGORIES.length].color;
            return (
              <View key={m.id || i} style={[styles.avatar, { backgroundColor: color + '25', borderColor: color + '40' }]}>
                <Text style={[styles.avatarText, { color }]}>{getInitials(name)}</Text>
              </View>
            );
          })}
          {overflow > 0 && (
            <View style={[styles.avatar, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
              <Text style={[styles.avatarText, { color: colors.text.tertiary, fontSize: 11 }]}>+{overflow}</Text>
            </View>
          )}
        </View>

        {totalSpent > 0 && (
          <View style={[styles.groupFooter, { borderTopColor: colors.border.subtle }]}>
            <Text style={[styles.spentText, { color: colors.text.tertiary }]}>
              {fmtCompact(totalSpent)} total spent
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { color: colors.text.tertiary }]}>Family Finance</Text>
            <Text style={[styles.title, { color: colors.text.primary }]}>Your Groups</Text>
          </View>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.accent.primary + '15' }]}
            onPress={() => navigation.navigate('CreateSharedGroup')}
          >
            <AntDesign name="plus" size={22} color={colors.accent.primary}  />
          </TouchableOpacity>
        </View>

        {couple.showCoupleFeatures && (
          <TouchableOpacity
            style={[styles.coupleBanner, { backgroundColor: COUPLE_COLORS.bg }]}
            onPress={() => navigation.navigate('CoupleSplash')}
          >
            <AntDesign name="heart" size={18} color={COUPLE_COLORS.primary}  />
            <Text style={[styles.coupleText, { color: COUPLE_COLORS.primary }]}>
              {couple.isInCouple ? 'View Couple Dashboard' : 'Connect with Partner'}
            </Text>
            <AntDesign name="right" size={16} color={COUPLE_COLORS.primary}  />
          </TouchableOpacity>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, {
              backgroundColor: !activeFilter ? colors.accent.primary : colors.bg.tertiary,
            }]}
            onPress={() => setActiveFilter(null)}
          >
            <Text style={[styles.filterText, {
              color: !activeFilter ? '#FFF' : colors.text.secondary,
              fontWeight: !activeFilter ? '600' : '400',
            }]}>All</Text>
          </TouchableOpacity>
          {HUB_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.filterChip, {
                backgroundColor: activeFilter === cat.key ? cat.color : colors.bg.tertiary,
              }]}
              onPress={() => setActiveFilter(activeFilter === cat.key ? null : cat.key)}
            >
              <AntDesign name={cat.icon as any} size={14} color={activeFilter === cat.key ? '#FFF' : cat.color} />
              <Text style={[styles.filterText, {
                color: activeFilter === cat.key ? '#FFF' : colors.text.secondary,
                marginLeft: 4,
              }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.bg.card }]}>
              <View style={[styles.skeletonLine, { backgroundColor: colors.skeleton.base, width: '60%' }]} />
              <View style={[styles.skeletonLine, { backgroundColor: colors.skeleton.base, width: '40%', marginTop: 8 }]} />
            </View>
          ))
        ) : filteredGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.bg.tertiary }]}>
              <AntDesign name="team" size={40} color={colors.text.tertiary}  />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No groups yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Create a group to manage finances with family, friends, or your partner
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => navigation.navigate('CreateSharedGroup')}
            >
              <AntDesign name="plus" size={18} color="#FFF"  />
              <Text style={styles.emptyBtnText}>Create Your First Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredGroups.map(renderGroupCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 13, fontWeight: '500', letterSpacing: 0.3 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: 2 },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coupleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  coupleText: { flex: 1, fontSize: 14, fontWeight: '600' },
  filterRow: { marginTop: spacing.md, marginHorizontal: -spacing.xl },
  filterContent: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  filterText: { fontSize: 13, fontWeight: '500' },
  list: { flex: 1 },
  listContent: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: 100 },
  groupCard: {
    borderRadius: borderRadius['3xl'],
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  groupIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '600' },
  groupMeta: { fontSize: 12, marginTop: 2 },
  groupBalance: { alignItems: 'flex-end' },
  balanceAmount: { fontSize: 16, fontWeight: '700' },
  balanceLabel: { fontSize: 11, marginTop: 1 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  avatarText: { fontSize: 10, fontWeight: '700' },
  groupFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  spentText: { fontSize: 12 },
  skeletonCard: {
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  skeletonLine: { height: 14, borderRadius: 7 },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.sm },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: spacing['2xl'] },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
