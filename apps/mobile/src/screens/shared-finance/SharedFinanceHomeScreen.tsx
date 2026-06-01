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

const GROUP_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'friends', label: 'Friends' },
  { key: 'trip', label: 'Trip' },
  { key: 'family', label: 'Family' },
  { key: 'couple', label: 'Couple' },
  { key: 'roommates', label: 'Roommates' },
  { key: 'office', label: 'Office' },
  { key: 'event', label: 'Event' },
  { key: 'apartment', label: 'Apartment' },
] as const;

const TYPE_ICONS: Record<string, string> = {
  friends: 'people',
  trip: 'airplane',
  family: 'home',
  couple: 'heart',
  roommates: 'business',
  office: 'briefcase',
  event: 'calendar',
  apartment: 'building',
  default: 'people',
};

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function SharedFinanceHomeScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const cardGradient = [colors.bg.secondary, colors.bg.tertiary];
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<any[]>([]);
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
        const res = await api.get<any>('/shared-finance/groups', ctrl.signal);
        if (ctrl.signal.aborted) {
          return;
        }
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setGroups(data);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } catch (e: any) {
        if (!ctrl.signal.aborted && e.message !== 'Session expired. Please login again.') {
          setGroups([]);
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
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
    Alert.alert('Delete Group', `Delete "${group.name}"? All shared data will be lost.`, [
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
            Alert.alert('Error', e.message || 'Failed to delete group');
          }
        },
      },
    ]);
  }

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
                <Text style={[s.subtitle, { color: colors.text.tertiary }]}>Shared Finance</Text>
                <Text style={[s.title, { color: colors.text.primary }]}>Your Groups</Text>
              </View>
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('CreateSharedGroup')}
              >
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={s.searchRow}>
              <View style={[s.searchBar, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
                <TextInput
                  style={[s.searchInput, { color: colors.text.primary }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search groups..."
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
                      {
                        color: typeFilter === item.key ? '#FFF' : colors.text.secondary,
                      },
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
          const typeIcon = TYPE_ICONS[type] || TYPE_ICONS.default;
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
              <LinearGradient
                colors={cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.card}
              >
                <View style={s.cardTop}>
                  <LinearGradient colors={[...colors.accent.gradient]} style={s.cardAvatar}>
                    <Ionicons name={typeIcon as any} size={22} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardName, { color: colors.text.primary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={s.cardMetaRow}>
                      <Ionicons name="people-outline" size={11} color={colors.text.secondary} />
                      <Text style={[s.cardMembers, { color: colors.text.secondary }]}>
                        {memberCount} member{memberCount !== 1 ? 's' : ''}
                      </Text>
                      <View
                        style={[s.typeBadge, { backgroundColor: `${colors.accent.primary}20` }]}
                      >
                        <Text style={[s.typeBadgeText, { color: colors.accent.primary }]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={s.statsRow}>
                  <View
                    style={[
                      s.stat,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.statLabel,
                        {
                          color: isDark ? 'rgba(255,255,255,0.4)' : colors.text.secondary,
                        },
                      ]}
                    >
                      Total Spent
                    </Text>
                    <Text style={[s.statVal, { color: colors.text.primary }]}>
                      {fmt(totalSpent)}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.stat,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.statLabel,
                        {
                          color: isDark ? 'rgba(255,255,255,0.4)' : colors.text.secondary,
                        },
                      ]}
                    >
                      Txns
                    </Text>
                    <Text style={[s.statVal, { color: colors.text.primary }]}>
                      {item._count?.expenses || item.expenseCount || 0}
                    </Text>
                  </View>
                </View>

                {item.description ? (
                  <View
                    style={[
                      s.descriptionRow,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      },
                    ]}
                  >
                    <Text
                      style={[s.descriptionText, { color: colors.text.tertiary }]}
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                  </View>
                ) : null}
              </LinearGradient>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <LinearGradient
              colors={[`${colors.accent.primary}20`, `${colors.accent.secondary}20`]}
              style={s.emptyIcon}
            >
              <Ionicons name="people" size={44} color={colors.accent.primary} />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>
              {search || typeFilter !== 'all' ? 'No groups found' : 'No shared groups yet'}
            </Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              {search || typeFilter !== 'all'
                ? 'Try a different search or filter'
                : 'Create a group to start tracking shared expenses'}
            </Text>
            {!search && typeFilter === 'all' && (
              <TouchableOpacity
                style={[s.emptyCta, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('CreateSharedGroup')}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={s.emptyCtaText}>Create Group</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <TouchableOpacity
        style={[
          s.fab,
          {
            backgroundColor: colors.accent.primary,
            bottom: insets.bottom + 24,
          },
        ]}
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
  subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  typeChipText: { fontSize: 12, fontWeight: '600' },
  cardOuter: { marginHorizontal: 24, marginBottom: 12 },
  card: { borderRadius: 20, padding: 18, gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 17, fontWeight: '700' },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  cardMembers: { fontSize: 12 },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statVal: { fontSize: 15, fontWeight: '700' },
  descriptionRow: {
    borderRadius: 10,
    padding: 10,
  },
  descriptionText: { fontSize: 13 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 60 },
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
