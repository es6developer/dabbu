import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useGroupDetail } from '../../hooks/useGroupDetail';
import { ApiDebugOverlay } from '../../components/ApiDebugOverlay';

const TYPE_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }
> = {
  friends: { icon: 'people', label: 'Friends', color: '#74B9FF' },
  trip: { icon: 'airplane', label: 'Trip', color: '#00B894' },
  family: { icon: 'home', label: 'Family', color: '#FDCB6E' },
  couple: { icon: 'heart', label: 'Couple', color: '#FF6B6B' },
  roommates: { icon: 'business', label: 'Roommates', color: '#A29BFE' },
  office: { icon: 'briefcase', label: 'Office', color: '#f7892c' },
};

const SEGMENTS = ['expenses', 'balances', 'settlements'] as const;
type Segment = (typeof SEGMENTS)[number];

function renderBalance(
  item: any,
  meta: (typeof TYPE_META)[keyof typeof TYPE_META],
  colors: any,
  typography: any,
  cur: string,
) {
  return (
    <View style={s.item}>
      <View style={[s.avatar, { backgroundColor: meta.color + '25' }]}>
        <Text style={{ color: meta.color, fontWeight: '700', fontSize: 16 }}>
          {item.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.callout, { color: colors.text.primary }]}>{item.name}</Text>
        <Text style={[typography.caption1, { color: colors.text.tertiary, marginTop: 2 }]}>
          {item.role}
        </Text>
      </View>
      <Text
        style={[
          typography.callout,
          { color: (item.balance || 0) >= 0 ? '#34C759' : '#FF3B30', fontWeight: '700' },
        ]}
      >
        {cur}
        {(item.balance ?? 0).toFixed(0)}
      </Text>
    </View>
  );
}

function renderSettlement(item: any, colors: any, typography: any, cur: string) {
  return (
    <View style={s.item}>
      <View style={[s.avatar, { backgroundColor: '#34C75920' }]}>
        <Ionicons name="swap-horizontal" size={20} color="#34C759" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.callout, { color: colors.text.primary }]}>
          {item.from?.name} → {item.to?.name}
        </Text>
        <Text style={[typography.caption1, { color: colors.text.tertiary, marginTop: 2 }]}>
          {item.status}
        </Text>
      </View>
      <Text style={[typography.callout, { color: colors.text.primary, fontWeight: '700' }]}>
        {cur}
        {Number(item.amount ?? 0).toFixed(0)}
      </Text>
    </View>
  );
}

function renderExpense(
  item: any,
  meta: (typeof TYPE_META)[keyof typeof TYPE_META],
  colors: any,
  typography: any,
  cur: string,
  onPress: () => void,
) {
  return (
    <TouchableOpacity style={s.item} onPress={onPress}>
      <View style={[s.avatar, { backgroundColor: meta.color + '25' }]}>
        <Ionicons name="receipt-outline" size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.callout, { color: colors.text.primary }]} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={[typography.caption1, { color: colors.text.tertiary, marginTop: 2 }]}>
          Paid by {item.paidBy?.name}
        </Text>
      </View>
      <Text style={[typography.callout, { color: colors.text.primary, fontWeight: '700' }]}>
        {cur}
        {Number(item.amount ?? 0).toFixed(0)}
      </Text>
    </TouchableOpacity>
  );
}

export function GroupDetailScreen() {
  const { colors, typography } = useTheme();
  const {
    group,
    initialLoading,
    refreshing,
    error,
    activeSegment,
    setActiveSegment,
    loadGroup,
    navigation,
    groupId,
    handleInviteExternal,
    invitingExternal,
  } = useGroupDetail();

  const meta = useMemo(
    () => (group ? TYPE_META[group.type] || TYPE_META.friends : TYPE_META.friends),
    [group],
  );

  const segmentData = useMemo(() => {
    if (!group) {
      return [];
    }
    switch (activeSegment) {
      case 'balances':
        return group.members;
      case 'settlements':
        return group.settlements;
      default:
        return group.expenses;
    }
  }, [activeSegment, group]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const cur = group?.currency || '₹';
      if (activeSegment === 'balances') {
        return renderBalance(item, meta, colors, typography, cur);
      }
      if (activeSegment === 'settlements') {
        return renderSettlement(item, colors, typography, cur);
      }
      return renderExpense(item, meta, colors, typography, cur, () =>
        navigation.navigate('GroupExpenseDetail', { groupId, expenseId: item.id }),
      );
    },
    [activeSegment, group, meta, colors, typography, navigation, groupId],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  if (initialLoading && !group) {
    return (
      <SafeAreaView style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !group) {
    return (
      <SafeAreaView style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={46} color={colors.status.error} />
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: 16 }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: colors.accent.primary }]}
            onPress={() => loadGroup()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const g = group!;
  const cur = g.currency || '₹';

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <ApiDebugOverlay />
      <FlatList
        data={segmentData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={s.header}>
            <View style={s.headerTop}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('GroupSettings', { groupId })}>
                <Ionicons name="settings-outline" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={[s.typeBadge, { backgroundColor: meta.color + '20' }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
              <Text style={{ color: meta.color, fontWeight: '600', fontSize: 13 }}>
                {meta.label}
              </Text>
            </View>

            <Text style={[typography.title1, { color: colors.text.primary, marginTop: 8 }]}>
              {g.name}
            </Text>

            <View style={s.statsRow}>
              {[
                {
                  label: 'Total Spent',
                  value: `${cur}${g.totalSpent.toFixed(0)}`,
                  color: colors.text.primary,
                },
                {
                  label: 'Your Balance',
                  value: `${g.balance >= 0 ? '+' : ''}${cur}${g.balance.toFixed(0)}`,
                  color: g.balance >= 0 ? '#34C759' : '#FF3B30',
                },
                { label: 'Members', value: String(g.memberCount), color: colors.text.primary },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={[s.statCard, { backgroundColor: colors.bg.tertiary }]}
                >
                  <Text style={[typography.title2, { color: stat.color }]}>{stat.value}</Text>
                  <Text
                    style={[typography.caption1, { color: colors.text.tertiary, marginTop: 4 }]}
                  >
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.accent.primary, flex: 1 }]}
                onPress={() => navigation.navigate('GroupDashboard', { groupId })}
              >
                <Ionicons name="stats-chart-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13, marginLeft: 4 }}>
                  Dashboard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.bg.tertiary, flex: 1 }]}
                onPress={() =>
                  navigation.navigate('InviteMembers', { groupId, groupName: group?.name })
                }
              >
                <Ionicons name="person-add-outline" size={16} color={colors.text.primary} />
                <Text
                  style={{
                    color: colors.text.primary,
                    fontWeight: '600',
                    fontSize: 13,
                    marginLeft: 4,
                  }}
                >
                  Invite
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.bg.tertiary, flex: 0 }]}
                onPress={handleInviteExternal}
                disabled={invitingExternal}
              >
                <Ionicons name="share-outline" size={16} color={colors.accent.primary} />
              </TouchableOpacity>
            </View>

            <View style={[s.tabRow, { backgroundColor: colors.bg.tertiary }]}>
              {SEGMENTS.map((seg) => {
                const active = seg === activeSegment;
                return (
                  <TouchableOpacity
                    key={seg}
                    onPress={() => setActiveSegment(seg)}
                    style={[s.tab, active && { backgroundColor: colors.accent.primary }]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: active ? '#FFFFFF' : colors.text.tertiary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {seg}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons
              name={
                activeSegment === 'balances'
                  ? 'people-outline'
                  : activeSegment === 'settlements'
                    ? 'swap-horizontal-outline'
                    : 'receipt-outline'
              }
              size={40}
              color={colors.text.tertiary}
            />
            <Text style={[typography.callout, { color: colors.text.tertiary, marginTop: 16 }]}>
              {activeSegment === 'balances'
                ? 'No members'
                : activeSegment === 'settlements'
                  ? 'No settlements'
                  : 'No expenses'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadGroup(true)}
            tintColor={colors.accent.primary}
          />
        }
      />

      <View style={[s.fabRow, { bottom: 16 }]}>
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.accent.primary }]}
          onPress={() => navigation.navigate('CreateGroupExpense', { groupId })}
        >
          <Ionicons name="add-circle" size={22} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14, marginLeft: 6 }}>
            Add Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.fab,
            {
              backgroundColor: colors.bg.glassLight,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            },
          ]}
          onPress={() => navigation.navigate('CreateSettlement', { groupId })}
        >
          <Ionicons name="swap-horizontal" size={20} color={colors.text.primary} />
          <Text
            style={{ color: colors.text.primary, fontWeight: '600', fontSize: 14, marginLeft: 6 }}
          >
            Settle Up
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  retryBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statsRow: { flexDirection: 'row', marginTop: 20, gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  tabRow: { flexDirection: 'row', borderRadius: 12, padding: 3, marginTop: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  fabRow: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 10 },
  fab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
