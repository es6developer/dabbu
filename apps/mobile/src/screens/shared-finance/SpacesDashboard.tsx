import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useLensChange } from '../../hooks/useLensChange';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { api } from '../../services/api';

import { alertService } from '../../components/ui';
function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d: string) {
  if (!d) {
    return '';
  }
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function typeMeta(t: string, colors: any) {
  const meta: Record<string, { icon: string; color: string }> = {
    couple: { icon: 'heart', color: '#EC4899' },
    family: { icon: 'team', color: '#3B82F6' },
    trip: { icon: 'earth', color: '#06B6D4' },
    friends: { icon: 'team', color: '#6366F1' },
    wedding: { icon: 'heart', color: '#BE185D' },
    house_purchase: { icon: 'home', color: '#F97316' },
    office: { icon: 'bank', color: colors.accent.secondary },
    event: { icon: 'star', color: colors.accent.secondary },
    apartment: { icon: 'home', color: '#1F2937' },
    sports: { icon: 'Trophy', color: colors.accent.primary },
    roommates: { icon: 'team', color: '#6366F1' },
  };
  return meta[t?.toLowerCase()] || { icon: 'team', color: '#6366F1' };
}

export function SpacesDashboard() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false, refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else if (!silent) {
      setLoading(true);
    }
    try {
      const res = await api.get<any>(`/shared-finance/groups`);
      const list = Array.isArray(res) ? res : res?.items || res?.data || [];
      setGroups(list);
    } catch {
      void 0;
    } finally {
      setLoading(false);
    }
  }, []);

  useSilentRefresh(
    useCallback(
      (isInitial) => {
        loadData(!isInitial);
      },
      [loadData],
    ),
  );

  useLensChange(
    useCallback(() => {
      loadData(true);
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(false, true);
    setRefreshing(false);
  }, [loadData]);

  const totalSpent = groups.reduce((s, g) => s + Number(g.totalSpent || 0), 0);
  const totalIncome = groups.reduce(
    (s, g) => s + Number(g.totalIncome || Number(g.totalSpent || 0)),
    0,
  );
  const netTotal = totalIncome - totalSpent;

  const handleExpenseAction = useCallback(() => {
    if (groups.length === 0) {
      navigation.navigate('CreateSharedGroup');
      return;
    }
    if (groups.length === 1) {
      navigation.navigate('SharedExpenseForm', { groupId: groups[0].id });
      return;
    }
    alertService.alert(
      'Add expense to...',
      'Choose which space to add this expense to',
      groups
        .map(
          (g) =>
            ({
              text: g.name,
              onPress: () => navigation.navigate('SharedExpenseForm', { groupId: g.id }),
            }) as any,
        )
        .concat({ text: 'Cancel', style: 'cancel' }),
    );
  }, [groups, navigation]);

  const handleSettleAction = useCallback(() => {
    if (groups.length === 0) {
      navigation.navigate('CreateSharedGroup');
      return;
    }
    if (groups.length === 1) {
      navigation.navigate('Settlement', { groupId: groups[0].id });
      return;
    }
    alertService.alert(
      'Settle up in...',
      'Choose a space',
      groups
        .map(
          (g) =>
            ({
              text: g.name,
              onPress: () => navigation.navigate('Settlement', { groupId: g.id }),
            }) as any,
        )
        .concat({ text: 'Cancel', style: 'cancel' }),
    );
  }, [groups, navigation]);

  return (
    <View style={[s.container, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.3]}
        style={{ flex: 1 }}
      >
        <View
          style={[s.header, { paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.xl }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 4,
                height: 24,
                borderRadius: 2,
                backgroundColor: colors.accent.primary,
              }}
            />
            <Text style={[s.title, { color: colors.text.primary }]}>Spaces</Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.xl, paddingTop: 0, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Summary Card */}
          <View style={[s.balanceCard, { backgroundColor: colors.bg.card, ...shadows.md }]}>
            <Text style={[s.balanceLabel, { color: colors.text.tertiary }]}>Overall Summary</Text>
            <View style={s.monthlyRow}>
              <View style={s.monthlyItem}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}
                >
                  <AntDesign name="arrowdown" size={12} color={colors.status.error} />
                  <Text style={[s.monthlyLabel, { color: colors.status.error }]}>Spent</Text>
                </View>
                <Text style={[s.monthlyValue, { color: colors.text.primary }]}>
                  {fmt(totalSpent)}
                </Text>
              </View>
              <View style={s.monthlyItem}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}
                >
                  <AntDesign name="arrowup" size={12} color={colors.status.success} />
                  <Text style={[s.monthlyLabel, { color: colors.status.success }]}>Income</Text>
                </View>
                <Text style={[s.monthlyValue, { color: colors.text.primary }]}>
                  {fmt(totalIncome)}
                </Text>
              </View>
              <View style={s.monthlyItem}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}
                >
                  <AntDesign
                    name="swap"
                    size={12}
                    color={netTotal >= 0 ? colors.status.success : colors.status.error}
                  />
                  <Text
                    style={[
                      s.monthlyLabel,
                      { color: netTotal >= 0 ? colors.status.success : colors.status.error },
                    ]}
                  >
                    Left
                  </Text>
                </View>
                <Text style={[s.monthlyValue, { color: colors.text.primary }]}>
                  {fmt(netTotal)}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[
                s.actionBtn,
                {
                  backgroundColor: colors.status.error + '12',
                  borderWidth: 1,
                  borderColor: colors.status.error + '25',
                },
              ]}
              onPress={handleExpenseAction}
            >
              <View style={[s.actionIcon, { backgroundColor: colors.status.error }]}>
                <AntDesign name="arrowdown" size={18} color="#FFF" />
              </View>
              <Text style={[s.actionLabel, { color: colors.status.error }]}>Spend</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.actionBtn,
                {
                  backgroundColor: '#6366F1' + '12',
                  borderWidth: 1,
                  borderColor: '#6366F1' + '25',
                },
              ]}
              onPress={handleSettleAction}
            >
              <View style={[s.actionIcon, { backgroundColor: '#6366F1' }]}>
                <AntDesign name="swap" size={18} color="#FFF" />
              </View>
              <Text style={[s.actionLabel, { color: '#6366F1' }]}>Settle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.actionBtn,
                {
                  backgroundColor: colors.accent.primary + '12',
                  borderWidth: 1,
                  borderColor: colors.accent.primary + '25',
                },
              ]}
              onPress={() => navigation.navigate('CreateSharedGroup')}
            >
              <View style={[s.actionIcon, { backgroundColor: colors.accent.primary }]}>
                <AntDesign name="addusergroup" size={18} color="#FFF" />
              </View>
              <Text style={[s.actionLabel, { color: colors.accent.primary }]}>Space</Text>
            </TouchableOpacity>
          </View>

          {/* Your Spaces */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: spacing.md,
              marginTop: spacing.xs,
            }}
          >
            <View
              style={{
                width: 4,
                height: 14,
                borderRadius: 2,
                backgroundColor: colors.accent.primary,
              }}
            />
            <Text style={[s.sectionTitle, { color: colors.text.secondary }]}>Your Spaces</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => navigation.navigate('CreateSharedGroup')}>
              <AntDesign name="pluscircleo" size={18} color={colors.accent.primary} />
            </TouchableOpacity>
          </View>

          {loading && groups.length === 0 ? (
            Array.from({ length: 2 }).map((_, i) => (
              <View key={i} style={[s.skeletonCard, { backgroundColor: colors.bg.card }]} />
            ))
          ) : groups.length === 0 ? (
            <View
              style={[
                s.emptyCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
            >
              <View style={[s.emptyIconBg, { backgroundColor: colors.accent.primary + '12' }]}>
                <AntDesign name="addusergroup" size={28} color={colors.accent.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No spaces yet</Text>
              <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
                Create a shared space to track expenses together. Splitting bills with friends and
                family is now simple and fair.
              </Text>
              <TouchableOpacity
                style={[s.createBtn, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('CreateSharedGroup')}
              >
                <AntDesign name="plus" size={16} color="#FFF" />
                <Text style={s.createBtnText}>Create Space</Text>
              </TouchableOpacity>
            </View>
          ) : (
            groups.map((g: any) => {
              const meta = typeMeta(g.type, colors);
              const totalSpentG = Number(g.totalSpent || 0);
              const totalIncomeG = Number(g.totalIncome || totalSpentG);
              const totalLeftG = totalIncomeG - totalSpentG;
              const creator = g.creator;
              const creatorName = creator
                ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim()
                : '';
              const memberCount = g._count?.members || 0;
              const expenseCount = g._count?.expenses || 0;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    s.card,
                    { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                  ]}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('SharedGroupDetail', { groupId: g.id, group: g })
                  }
                >
                  <LinearGradient
                    colors={[meta.color + '08', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: borderRadius['2xl'],
                    }}
                  />
                  <View style={s.cardTop}>
                    <View style={[s.cardIcon, { backgroundColor: meta.color + '15' }]}>
                      <AntDesign name={meta.icon as any} size={18} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardName, { color: colors.text.primary }]} numberOfLines={1}>
                        {g.name}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}
                      >
                        <View style={[s.typeBadge, { backgroundColor: meta.color + '12' }]}>
                          <Text style={[s.typeBadgeText, { color: meta.color }]}>
                            {g.type || 'friends'}
                          </Text>
                        </View>
                        {creatorName ? (
                          <Text
                            style={[s.cardMeta, { color: colors.text.tertiary }]}
                            numberOfLines={1}
                          >
                            {creatorName}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <AntDesign name="right" size={14} color={colors.text.tertiary} />
                  </View>
                  <View style={[s.divider, { backgroundColor: colors.border.subtle }]} />
                  <View style={s.cardStats}>
                    <View style={s.statItem}>
                      <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Spent</Text>
                      <Text style={[s.statValue, { color: colors.status.error }]}>
                        {fmt(totalSpentG)}
                      </Text>
                    </View>
                    <View style={s.statItem}>
                      <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Income</Text>
                      <Text style={[s.statValue, { color: colors.status.success }]}>
                        {fmt(totalIncomeG)}
                      </Text>
                    </View>
                    <View style={s.statItem}>
                      <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Left</Text>
                      <Text
                        style={[
                          s.statValue,
                          { color: totalLeftG >= 0 ? colors.status.success : colors.status.error },
                        ]}
                      >
                        {fmt(totalLeftG)}
                      </Text>
                    </View>
                  </View>
                  <View style={s.cardMetaRow}>
                    <AntDesign name="user" size={10} color={colors.text.tertiary} />
                    <Text style={[s.metaText, { color: colors.text.tertiary }]}>
                      {memberCount} member{memberCount !== 1 ? 's' : ''} · {expenseCount} expense
                      {expenseCount !== 1 ? 's' : ''}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <AntDesign name="calendar" size={10} color={colors.text.tertiary} />
                    <Text style={[s.metaText, { color: colors.text.tertiary }]}>
                      {fmtDate(g.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  balanceCard: {
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  balanceLabel: { fontSize: 13, fontWeight: '500', marginBottom: spacing.md },
  monthlyRow: { flexDirection: 'row', gap: spacing.lg },
  monthlyItem: { flex: 1 },
  monthlyLabel: { fontSize: 11, fontWeight: '700' },
  monthlyValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing['2xl'] },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius['2xl'],
    gap: spacing.xs,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  skeletonCard: { height: 60, borderRadius: borderRadius.xl, marginBottom: spacing.sm },
  emptyCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: spacing.xs },
  emptyDesc: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: spacing.sm,
  },
  createBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  typeBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  cardMeta: { fontSize: 10, fontWeight: '500' },
  divider: { height: 1, marginVertical: spacing.sm },
  cardStats: { flexDirection: 'row', gap: spacing.xs },
  statItem: { flex: 1, gap: 2 },
  statLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 14, fontWeight: '700' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  metaText: { fontSize: 10, fontWeight: '500' },
});
