import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';

const fmt = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 10000000) return '₹' + (abs / 10000000).toFixed(1) + 'Cr';
  if (abs >= 100000) return '₹' + (abs / 100000).toFixed(1) + 'L';
  return '₹' + (abs || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export function SharedCirclesScreen() {
  const navigation = useNavigation<any>();
  const { accessToken, user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
      if (accessToken) setAccessToken(accessToken);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await api.get<any>('/expense-groups/dashboard');
        const data = Array.isArray(res) ? res : [];
        setGroups(data);
      } catch (e: any) {
        setError(e.message || 'Unable to load');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const renderItem = ({ item }: { item: any }) => {
    const members = item.members || [];
    const memberCount = members.length || item._count?.members || 0;
    const balance = item.balance ?? 0;
    const settled = balance === 0;
    const youAreOwed = balance > 0;

    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
        onPress={() => navigation.navigate('GroupExpenses', { groupId: item.id, groupName: item.name })}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={[s.iconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
            <AntDesign name={(item.icon === 'heart' ? 'heart' : 'team') as any} size={22} color={colors.accent.primary} />
          </View>
          <View style={s.cardInfo}>
            <Text style={[s.cardName, { color: colors.text.primary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[s.cardMeta, { color: colors.text.tertiary }]}>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={[
                s.balance,
                {
                  color: settled ? colors.text.tertiary : youAreOwed ? colors.status.success : colors.status.error,
                },
              ]}
            >
              {settled ? 'Settled' : `${youAreOwed ? '+' : '-'}${fmt(Math.abs(balance))}`}
            </Text>
            <Text style={[s.balanceLabel, { color: colors.text.tertiary }]}>
              {settled ? '' : youAreOwed ? 'you are owed' : 'you owe'}
            </Text>
          </View>
        </View>

        {members.length > 0 && (
          <View style={s.memberRow}>
            {members.slice(0, 5).map((m: any, i: number) => {
              const u = m.user || m;
              return (
                <View key={u?.id || i} style={[s.avatarWrap, { marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i }]}>
                  <Avatar uri={u.avatarUrl} name={`${u.firstName || ''} ${u.lastName || ''}`.trim()} size={24} />
                </View>
              );
            })}
            {memberCount > 5 && (
              <View style={[s.overflowBadge, { backgroundColor: colors.bg.tertiary }]}>
                <Text style={[s.overflowText, { color: colors.text.tertiary }]}>+{memberCount - 5}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={{ color: colors.text.tertiary, fontSize: 14 }}>Loading groups...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={groups.length === 0 ? s.emptyContainer : { padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.accent.primary} />
        }
<<<<<<< Updated upstream
        ListHeaderComponent={
          <View style={{ marginBottom: 16, paddingTop: insets.top + 8 }}>
            <View style={s.headerRow}>
              <View>
                <Text style={[s.greeting, { color: colors.text.tertiary }]}>Shared</Text>
                <Text style={[s.title, { color: colors.text.primary }]}>Groups</Text>
=======
        contentContainerStyle={
          filtered.length === 0 ? s.emptyContainer : { paddingBottom: insets.bottom + 100 }
        }
      >
        {/* ─── Header ─── */}
        <View style={{ paddingHorizontal: H_PADDING, paddingTop: insets.top + 12 }}>
          <Text style={[s.greeting, { color: colors.text.tertiary }]}>{getGreeting()}</Text>
          <View style={s.headerRow}>
            <Text style={[s.title, { color: colors.text.primary }]}>My Circles</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[s.iconBtn, { backgroundColor: colors.accent.primary + '12' }]}
                onPress={() => navigation.navigate('Analytics')}
              >
                <Ionicons name="bar-chart-outline" size={20} color={colors.accent.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.iconBtn, { backgroundColor: colors.accent.primary }]}
                onPress={handleCreateGroup}
              >
                <AntDesign  name="plus" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── Stats Row ─── */}
        {groups.length > 0 && (
          <View style={{ paddingHorizontal: H_PADDING, marginTop: 20 }}>
            <View style={s.statsRow}>
              <StatCard
                icon="people"
                value={String(totalMembers)}
                label="Members"
                color={colors.accent.primary}
              />
              <StatCard
                icon="layers"
                value={String(groups.length)}
                label="Circles"
                color={colors.status.success}
              />
              <StatCard
                icon="trending-up"
                value={String(activeCount)}
                label="Active"
                color={colors.status.warning}
              />
            </View>
          </View>
        )}

        {/* ─── Plan Info ─── */}
        {planInfo.tier === 'free' && groups.length > 0 && (
          <View style={{ paddingHorizontal: H_PADDING, marginTop: 14 }}>
            <View
              style={[
                s.planBar,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              <View style={s.planBarLeft}>
                <View style={[s.planBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                  <View
                    style={[
                      s.planBarFill,
                      {
                        width: `${(groups.length / planInfo.maxGroups) * 100}%`,
                        backgroundColor:
                          groups.length >= planInfo.maxGroups
                            ? colors.status.error
                            : colors.accent.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[s.planText, { color: colors.text.secondary }]}>
                  {groups.length} of {planInfo.maxGroups} circles
                </Text>
>>>>>>> Stashed changes
              </View>
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('CreateExpenseGroup')}
              >
                <AntDesign name="plus" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <View style={[s.emptyIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
              <AntDesign name="team" size={48} color={colors.accent.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No groups yet</Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              Create a group to split expenses with friends, family, or roommates
            </Text>
            <TouchableOpacity
              style={[s.emptyCta, { backgroundColor: colors.accent.primary }]}
              onPress={() => navigation.navigate('CreateExpenseGroup')}
            >
              <Text style={s.emptyCtaText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 17, fontWeight: '700' },
  cardMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  balance: { fontSize: 16, fontWeight: '700' },
  balanceLabel: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  avatarWrap: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  overflowBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  overflowText: { fontSize: 9, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 },
  emptyCta: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
