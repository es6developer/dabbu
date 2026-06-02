import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton, SkeletonCard } from '../../components/ui/AnimatedSkeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SPACE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; gradient: [string, string]; emoji: string }
> = {
  friends: { label: 'Friends', icon: 'people', gradient: ['#4F6EF7', '#7C8FF8'], emoji: '👥' },
  trip: { label: 'Trip', icon: 'airplane', gradient: ['#00B894', '#00D9A6'], emoji: '✈️' },
  family: { label: 'Family', icon: 'home', gradient: ['#E85D04', '#FF8A3C'], emoji: '👨‍👩‍👧‍👦' },
  couple: { label: 'Couple', icon: 'heart', gradient: ['#FF6B9D', '#FF8FB3'], emoji: '💑' },
  roommates: {
    label: 'Roommates',
    icon: 'business',
    gradient: ['#6C5CE7', '#A29BFE'],
    emoji: '🏠',
  },
  office: { label: 'Office', icon: 'briefcase', gradient: ['#247BA0', '#4A9FC7'], emoji: '💼' },
  event: { label: 'Event', icon: 'calendar', gradient: ['#D64550', '#FF6B6B'], emoji: '🎉' },
  apartment: {
    label: 'Apartment',
    icon: 'building',
    gradient: ['#8A5CF6', '#B794F4'],
    emoji: '🏢',
  },
  default: { label: 'Group', icon: 'people', gradient: ['#4F6EF7', '#7C8FF8'], emoji: '👥' },
};

const GROUP_TYPES = [
  { key: 'all', label: 'All' },
  ...Object.entries(SPACE_TYPE_CONFIG)
    .filter(([k]) => k !== 'default')
    .map(([k, v]) => ({ key: k, label: v.label })),
];

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function pct(v: number) {
  return Math.round(v) + '%';
}

export function SharedFinanceHomeScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const [groupsRes, goalsRes] = await Promise.allSettled([
          api.get<any>('/shared-finance/groups', ctrl.signal),
          api.get<any>('/goals', ctrl.signal),
        ]);
        if (ctrl.signal.aborted) {
          return;
        }
        const groupsData =
          groupsRes.status === 'fulfilled'
            ? Array.isArray(groupsRes.value)
              ? groupsRes.value
              : Array.isArray(groupsRes.value?.data)
                ? groupsRes.value.data
                : []
            : [];
        const goalsData =
          goalsRes.status === 'fulfilled'
            ? Array.isArray(goalsRes.value?.data)
              ? goalsRes.value.data
              : Array.isArray(goalsRes.value)
                ? goalsRes.value
                : []
            : [];
        setGroups(groupsData);
        setGoals(goalsData);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } catch (e: any) {
        if (!ctrl.signal.aborted && e.message !== 'Session expired. Please login again.') {
          setGroups([]);
          setGoals([]);
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
          setGoalsLoading(false);
        }
      }
    },
    [accessToken, fadeAnim],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

  const filtered = useMemo(() => {
    let list = [...groups];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) => g.name?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== 'all') {
      list = list.filter((g) => g.type === typeFilter);
    }
    return list;
  }, [groups, search, typeFilter]);

  async function handleDelete(group: any) {
    Alert.alert('Delete Space', `Delete "${group.name}"? All shared data will be lost.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/shared-finance/groups/${group.id}`);
            setGroups((prev) => prev.filter((g) => g.id !== group.id));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete space');
          }
        },
      },
    ]);
  }

  const goalTotal = useMemo(() => {
    let saved = 0,
      target = 0;
    goals.forEach((g) => {
      saved += Number(g.saved || g.currentAmount || 0);
      target += Number(g.target || g.targetAmount || 0);
    });
    return { saved, target, pct: target > 0 ? Math.min((saved / target) * 100, 100) : 0 };
  }, [goals]);

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={[s.header, { paddingTop: insets.top + 16, paddingHorizontal: 24 }]}>
          <View>
            <Skeleton width={80} height={14} />
            <Skeleton width={140} height={28} style={{ marginTop: 4 }} />
          </View>
          <Skeleton width={44} height={44} borderRadius={14} />
        </View>
        <Skeleton
          width="90%"
          height={80}
          borderRadius={20}
          style={{ marginHorizontal: 24, marginBottom: 16 }}
        />
        <Skeleton
          width="90%"
          height={44}
          borderRadius={12}
          style={{ marginHorizontal: 24, marginBottom: 12 }}
        />
        <Skeleton
          width="60%"
          height={36}
          borderRadius={18}
          style={{ marginHorizontal: 24, marginBottom: 16 }}
        />
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} style={{ marginHorizontal: 24, marginBottom: 12 }} />
        ))}
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        initialNumToRender={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={
          filtered.length === 0 ? s.emptyContainer : { paddingBottom: insets.bottom + 100 }
        }
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[s.header, { paddingTop: insets.top + 16 }]}>
              <View>
                <Text style={[s.subtitle, { color: colors.text.tertiary }]}>Financial OS</Text>
                <Text style={[s.title, { color: colors.text.primary }]}>Your Spaces</Text>
              </View>
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('CreateSharedGroup')}
              >
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
            {goals.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Goals' })}
                style={s.goalsBanner}
              >
                <LinearGradient
                  colors={[colors.accent.primary + '20', colors.accent.secondary + '15']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.goalsBannerInner}
                >
                  <View style={s.goalsBannerTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={[s.goalsIcon, { backgroundColor: colors.accent.primary + '25' }]}
                      >
                        <Ionicons name="trophy-outline" size={16} color={colors.accent.primary} />
                      </View>
                      <Text style={[s.goalsBannerTitle, { color: colors.text.primary }]}>
                        Goal Progress
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                  </View>
                  <View style={s.goalsBannerBar}>
                    <View style={[s.goalsBannerTrack, { backgroundColor: colors.bg.tertiary }]}>
                      <View
                        style={[
                          s.goalsBannerFill,
                          {
                            width: `${goalTotal.pct}%`,
                            backgroundColor: colors.accent.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[s.goalsBannerPct, { color: colors.accent.primary }]}>
                      {pct(goalTotal.pct)}
                    </Text>
                  </View>
                  <View style={s.goalsBannerStats}>
                    <Text style={[s.goalsBannerStat, { color: colors.text.tertiary }]}>
                      <Text style={{ color: colors.status.success }}>{fmt(goalTotal.saved)}</Text>{' '}
                      saved of {fmt(goalTotal.target)}
                    </Text>
                    <Text style={[s.goalsBannerCount, { color: colors.text.tertiary }]}>
                      {goals.length} goal{goals.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <View style={s.searchRow}>
              <View style={[s.searchBar, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
                <TextInput
                  style={[s.searchInput, { color: colors.text.primary }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search spaces..."
                  placeholderTextColor={colors.text.tertiary}
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={GROUP_TYPES}
              keyExtractor={(item) => item.key}
              contentContainerStyle={s.typeFilterRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    s.typeChip,
                    typeFilter === item.key
                      ? { backgroundColor: colors.accent.primary }
                      : { backgroundColor: colors.bg.tertiary },
                  ]}
                  onPress={() => setTypeFilter(item.key)}
                >
                  <Text
                    style={[
                      s.typeChipText,
                      { color: typeFilter === item.key ? '#FFF' : colors.text.secondary },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Animated.View>
        }
        renderItem={({ item }) => {
          const type = item.type || 'default';
          const cfg = SPACE_TYPE_CONFIG[type] || SPACE_TYPE_CONFIG.default;
          const totalSpent = Number(item.totalSpent || 0);
          const memberCount = item._count?.members || item.members?.length || 0;
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('SharedGroupDetail', {
                  groupId: item.id,
                  groupName: item.name,
                })
              }
              onLongPress={() => handleDelete(item)}
              style={s.cardOuter}
            >
              <View style={s.card}>
                <LinearGradient
                  colors={cfg.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.cardCover}
                >
                  <View style={s.cardCoverOverlay}>
                    <View style={s.cardCoverTop}>
                      <View style={s.cardCoverIcon}>
                        <Ionicons name={cfg.icon as any} size={20} color="#FFF" />
                      </View>
                      <View style={[s.cardTypeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Text style={s.cardTypeBadgeText}>{cfg.label}</Text>
                      </View>
                    </View>
                    <Text style={s.cardCoverName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={s.cardCoverDesc} numberOfLines={1}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </LinearGradient>
                <View style={s.cardBody}>
                  <View style={s.cardStats}>
                    <View style={s.cardStat}>
                      <Text style={[s.cardStatLabel, { color: colors.text.tertiary }]}>
                        Total Spent
                      </Text>
                      <Text style={[s.cardStatValue, { color: colors.text.primary }]}>
                        {fmt(totalSpent)}
                      </Text>
                    </View>
                    <View style={s.cardStat}>
                      <Text style={[s.cardStatLabel, { color: colors.text.tertiary }]}>
                        Members
                      </Text>
                      <Text style={[s.cardStatValue, { color: colors.text.primary }]}>
                        {memberCount}
                      </Text>
                    </View>
                    <View style={s.cardStat}>
                      <Text style={[s.cardStatLabel, { color: colors.text.tertiary }]}>Txns</Text>
                      <Text style={[s.cardStatValue, { color: colors.text.primary }]}>
                        {item._count?.expenses || item.expenseCount || 0}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <LinearGradient
              colors={[`${colors.accent.primary}20`, `${colors.accent.secondary}20`]}
              style={s.emptyIcon}
            >
              <Ionicons name="grid-outline" size={44} color={colors.accent.primary} />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>
              {search || typeFilter !== 'all' ? 'No spaces found' : 'No spaces yet'}
            </Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              {search || typeFilter !== 'all'
                ? 'Try a different search or filter'
                : 'Create a space to split expenses with your people'}
            </Text>
            {!search && typeFilter === 'all' && (
              <TouchableOpacity
                style={[s.emptyCta, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('CreateSharedGroup')}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={s.emptyCtaText}>Create Space</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.accent.primary, bottom: insets.bottom + 24 }]}
        onPress={() => navigation.navigate('CreateSharedGroup')}
      >
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  goalsBanner: { marginHorizontal: 24, marginBottom: 16 },
  goalsBannerInner: { borderRadius: 20, padding: 16, gap: 10 },
  goalsBannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalsIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalsBannerTitle: { fontSize: 15, fontWeight: '700' },
  goalsBannerBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalsBannerTrack: { flex: 1, height: 8, borderRadius: 999, overflow: 'hidden' },
  goalsBannerFill: { height: '100%', borderRadius: 999 },
  goalsBannerPct: { fontSize: 13, fontWeight: '700', width: 40, textAlign: 'right' },
  goalsBannerStats: { flexDirection: 'row', justifyContent: 'space-between' },
  goalsBannerStat: { fontSize: 12 },
  goalsBannerCount: { fontSize: 12, fontWeight: '600' },

  searchRow: { paddingHorizontal: 24, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 10 },
  typeFilterRow: { paddingHorizontal: 24, gap: 8, paddingBottom: 16 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  typeChipText: { fontSize: 12, fontWeight: '600' },

  cardOuter: { marginHorizontal: 24, marginBottom: 16 },
  card: { borderRadius: 20, overflow: 'hidden', backgroundColor: 'transparent' },
  cardCover: { height: 120 },
  cardCoverOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cardCoverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
  },
  cardCoverIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardTypeBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  cardCoverName: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  cardCoverDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  cardBody: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardStats: { flexDirection: 'row', gap: 12 },
  cardStat: { flex: 1, gap: 2 },
  cardStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardStatValue: { fontSize: 15, fontWeight: '700' },

  empty: { alignItems: 'center', gap: 12, paddingTop: 40 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 48 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#f7892c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
});
