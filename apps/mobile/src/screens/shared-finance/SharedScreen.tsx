import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';

const { width: SCREEN_W } = Dimensions.get('window');

function fmt(v: number | string | undefined | null): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function listFromResponse(res: any): any[] {
  if (!res) {
    return [];
  }
  if (Array.isArray(res)) {
    return res;
  }
  if (res.items) {
    return Array.isArray(res.items) ? res.items : [];
  }
  return [];
}

function timeAgo(dateStr: string): string {
  if (!dateStr) {
    return '';
  }
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs}h ago`;
  }
  const days = Math.floor(hrs / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return `${Math.floor(days / 7)}w ago`;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  couple: { icon: 'heart', label: 'Couple', color: '#FF6B9D' },
  family: { icon: 'home', label: 'Family', color: '#FF6B00' },
  friends: { icon: 'people', label: 'Friends', color: '#34C759' },
  trip: { icon: 'airplane', label: 'Trip', color: '#60A5FA' },
  roommates: { icon: 'business', label: 'Roommates', color: '#818CF8' },
  apartment: { icon: 'home', label: 'Apartment', color: '#FF6B00' },
  office: { icon: 'briefcase', label: 'Office', color: '#818CF8' },
  event: { icon: 'calendar', label: 'Event', color: '#FF6B6B' },
  default: { icon: 'people', label: 'Group', color: '#FF6B00' },
};

const ALL_TYPES = ['all', 'couple', 'family', 'friends', 'trip', 'roommates', 'other'] as const;

const FILTER_COLORS: Record<string, string> = {
  all: '#FF6B00',
  couple: '#FF6B9D',
  family: '#FF6B00',
  friends: '#34C759',
  trip: '#60A5FA',
  roommates: '#818CF8',
  other: '#8E8E93',
};

interface GroupCardProps {
  group: any;
  onPress: () => void;
  themeColor: string;
  netBalance?: number;
}

function GroupCard({ group, onPress, themeColor, netBalance }: GroupCardProps) {
  const { colors } = useTheme();
  const mc = group.members?.length || group._count?.members || 0;
  const balance = netBalance ?? 0;
  const isPositive = balance >= 0;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const members = group.members || [];
  const maxAvatars = 3;
  const displayAvatars = Math.min(mc, maxAvatars);
  const overflow = Math.max(mc - maxAvatars, 0);
  const getInitial = (m: any) => {
    const u = m.user || m;
    return ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).trim() || '?';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      onPressIn={() => {
        Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      }}
    >
      <Animated.View
        style={[
          s.groupCard,
          {
            backgroundColor: colors.bg.card,
            borderColor: colors.border.default,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={s.groupInner}>
          <View style={s.groupLeft}>
            <Text style={[s.groupName, { color: colors.text.primary }]} numberOfLines={1}>
              {group.name || group.title}
            </Text>
            <View style={s.memberBadge}>
              <Ionicons name="people-outline" size={12} color={colors.text.secondary} />
              <Text style={[s.memberCountText, { color: colors.text.secondary }]}>
                {mc} member{mc !== 1 ? 's' : ''}
              </Text>
              <View style={[s.metaDot, { backgroundColor: colors.text.secondary }]} />
              <Text style={[s.memberActivity, { color: colors.text.secondary }]}>
                {timeAgo(group.updatedAt || group.createdAt)}
              </Text>
            </View>
          </View>

          <View style={s.avatarCluster}>
            {Array.from({ length: displayAvatars }).map((_, i) => {
              const u = members[i]?.user || members[i];
              return (
                <View
                  key={u?.id || i}
                  style={[
                    s.avatarCircle,
                    {
                      backgroundColor: colors.bg.tertiary,
                      borderColor: colors.bg.card,
                      marginLeft: i === 0 ? 0 : -8,
                      zIndex: displayAvatars - i,
                    },
                  ]}
                >
                  <Text style={[s.avatarLetter, { color: colors.text.secondary }]}>
                    {u ? getInitial(u) : '?'}
                  </Text>
                </View>
              );
            })}
            <View
              style={[
                s.avatarCircle,
                s.overflowBadge,
                {
                  backgroundColor: `${themeColor}20`,
                  borderColor: colors.bg.card,
                  marginLeft: -8,
                },
              ]}
            >
              {overflow > 0 ? (
                <Text style={[s.overflowText, { color: themeColor }]}>+{overflow}</Text>
              ) : (
                <Ionicons name="add" size={14} color={themeColor} />
              )}
            </View>
          </View>

          <View style={s.groupRight}>
            <Text
              style={[
                s.balanceText,
                { color: balance === 0 ? '#8E8E93' : isPositive ? '#34C759' : '#FF4545' },
              ]}
            >
              {balance === 0 ? 'Settled' : `${isPositive ? '+' : ''}${fmt(Math.abs(balance))}`}
            </Text>
            <View style={[s.typeBadge, { backgroundColor: `${themeColor}15` }]}>
              <View style={[s.typeDot, { backgroundColor: themeColor }]} />
              <Text style={[s.typeBadgeText, { color: themeColor }]}>
                {TYPE_CONFIG[group.type]?.label || 'Group'}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function SharedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { accessToken, user } = useAuth();

  const [groups, setGroups] = useState<any[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);
      try {
        const sharedRes = await api.get<any>('/shared-finance/groups');
        const groupList = listFromResponse(sharedRes);
        setGroups(groupList);

        // Fetch real balances for groups with expenses
        const groupIdsWithExpenses = groupList
          .filter((g: any) => (g._count?.expenses || 0) > 0)
          .map((g: any) => g.id);
        if (groupIdsWithExpenses.length > 0) {
          const balanceResults = await Promise.allSettled(
            groupIdsWithExpenses.map((gid: string) =>
              api.get<any>(`/shared-finance/groups/${gid}/balances`),
            ),
          );
          const balancesMap: Record<string, number> = {};
          const currentUserId = (user as any)?.id;
          balanceResults.forEach((r, idx) => {
            if (r.status === 'fulfilled' && Array.isArray(r.value)) {
              if (currentUserId) {
                const myEntry = r.value.find((b: any) => b.userId === currentUserId);
                if (myEntry) {
                  balancesMap[groupIdsWithExpenses[idx]] = Number(myEntry.balance);
                }
              }
              // If no current user entry found, show any non-zero balance as pending
              if (!balancesMap[groupIdsWithExpenses[idx]]) {
                const anyNonZero = r.value.find((b: any) => Math.abs(Number(b.balance)) > 0.01);
                if (anyNonZero) {
                  balancesMap[groupIdsWithExpenses[idx]] = Number(anyNonZero.balance);
                }
              }
            }
          });
          setGroupBalances(balancesMap);
        } else {
          setGroupBalances({});
        }
      } catch {
        setError('Could not load spaces. Check your connection.');
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

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loading]);

  const filteredGroups =
    filter === 'all'
      ? groups
      : filter === 'other'
        ? groups.filter(
            (g: any) => !['couple', 'family', 'friends', 'trip', 'roommates'].includes(g.type),
          )
        : groups.filter((g: any) => g.type === filter);

  const totalMembers = groups.reduce(
    (s: number, g: any) => s + (g.members?.length || g._count?.members || 0),
    0,
  );

  const stats = [
    { label: 'Total Spaces', value: String(groups.length), color: colors.accent.primary },
    { label: 'Total Members', value: String(totalMembers), color: '#60A5FA' },
    {
      label: 'Pending',
      value: String(groups.filter((g: any) => g.balance && g.balance !== 0).length),
      color: '#F59E0B',
    },
    {
      label: 'This Month',
      value: String(
        groups.filter((g: any) => {
          const d = new Date(g.updatedAt || g.createdAt);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
      ),
      color: '#34C759',
    },
  ];

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData(true);
            }}
            tintColor="#FF6B00"
          />
        }
      >
        {/* ─── Header ─── */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <View style={s.headerRow}>
            <View>
              <Text style={[s.headerEyebrow, { color: colors.text.tertiary }]}>SPACES</Text>
              <Text style={[s.headerTitle, { color: colors.text.primary }]}>Shared Spaces</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={s.templateBtn}
                onPress={() => navigation.navigate('SplitTemplates')}
                activeOpacity={0.8}
              >
                <Ionicons name="layers-outline" size={20} color="#FF6B00" />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.createBtn}
                onPress={() => navigation.navigate('CreateSharedGroup')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <UpgradeBanner message="Create unlimited shared spaces with Premium" />

        {/* ─── Loading ─── */}
        {loading && (
          <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} style={{ flex: 1 }} width="100%" height={60} borderRadius={14} />
              ))}
            </View>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={80} borderRadius={16} />
            ))}
          </View>
        )}

        {/* ─── Error ─── */}
        {error && !loading && (
          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { backgroundColor: 'rgba(255,69,69,0.12)' }]}>
              <Ionicons name="cloud-offline-outline" size={36} color="#FF4545" />
            </View>
            <Text style={[s.emptyTitle, { color: '#FF4545' }]}>{error}</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => loadData()} activeOpacity={0.85}>
              <Ionicons name="refresh-outline" size={18} color="#FFF" />
              <Text style={s.emptyBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Content ─── */}
        {!loading && !error && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Stats Row */}
            {groups.length > 0 && (
              <View style={s.statsRow}>
                {stats.map((stat, idx) => (
                  <View key={idx} style={[s.statCard, { backgroundColor: colors.bg.card }]}>
                    <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                    <Text style={[s.statLabel, { color: colors.text.tertiary }]}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Filter Chips */}
            {groups.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterRow}
              >
                {ALL_TYPES.map((type) => {
                  const count =
                    type === 'all'
                      ? groups.length
                      : type === 'other'
                        ? groups.filter(
                            (g: any) =>
                              !['couple', 'family', 'friends', 'trip', 'roommates'].includes(
                                g.type,
                              ),
                          ).length
                        : groups.filter((g: any) => g.type === type).length;
                  if (count === 0 && type !== 'all') {
                    return null;
                  }
                  const active = filter === type;
                  const chipColor = FILTER_COLORS[type] || '#8E8E93';
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        s.filterChip,
                        active
                          ? { backgroundColor: chipColor }
                          : { backgroundColor: colors.bg.tertiary },
                      ]}
                      onPress={() => setFilter(type)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          s.filterChipText,
                          { color: active ? '#FFF' : colors.text.secondary },
                        ]}
                      >
                        {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                      <View
                        style={[
                          s.filterChipCount,
                          {
                            backgroundColor: active
                              ? 'rgba(255,255,255,0.2)'
                              : 'rgba(255,255,255,0.08)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.filterChipCountText,
                            { color: active ? '#FFF' : colors.text.tertiary },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Empty State */}
            {groups.length === 0 && (
              <View style={s.emptyWrap}>
                <View style={[s.emptyIcon, { backgroundColor: 'rgba(255,107,0,0.12)' }]}>
                  <Ionicons name="layers-outline" size={36} color="#FF6B00" />
                </View>
                <Text style={[s.emptyTitle, { color: colors.text.primary }]}>
                  No shared spaces yet
                </Text>
                <Text style={[s.emptySub, { color: colors.text.secondary }]}>
                  Create a space to split expenses with your people
                </Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => navigation.navigate('CreateSharedGroup')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={s.emptyBtnText}>Create your first space</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Groups List */}
            {filteredGroups.length > 0 && (
              <View style={{ paddingHorizontal: 20, gap: 10 }}>
                {filteredGroups.map((group: any) => {
                  const cfg = TYPE_CONFIG[group.type] || TYPE_CONFIG.default;
                  return (
                    <GroupCard
                      key={group.id}
                      group={group}
                      themeColor={cfg.color}
                      netBalance={groupBalances[group.id]}
                      onPress={() => {
                        if (group.type === 'couple') {
                          navigation.navigate('CoupleFinance', {
                            groupId: group.id,
                            groupName: group.name,
                          });
                        } else if (group.type === 'family') {
                          navigation.navigate('FamilyDashboard', {
                            groupId: group.id,
                            groupName: group.name,
                          });
                        } else {
                          navigation.navigate('SharedGroupDetail', {
                            groupId: group.id,
                            groupName: group.name,
                          });
                        }
                      }}
                    />
                  );
                })}
              </View>
            )}

            {/* No results for filter */}
            {groups.length > 0 && filteredGroups.length === 0 && (
              <View style={[s.emptyWrap, { paddingTop: 20 }]}>
                <Text style={[s.emptySub, { color: colors.text.secondary }]}>
                  No spaces match this filter
                </Text>
              </View>
            )}

            {/* Create New */}
            {groups.length > 0 && (
              <TouchableOpacity
                style={[
                  s.createCard,
                  {
                    borderColor: `${colors.accent.primary}40`,
                    backgroundColor: `${colors.accent.primary}05`,
                  },
                ]}
                onPress={() => navigation.navigate('CreateSharedGroup')}
                activeOpacity={0.7}
              >
                <View style={[s.createIconWrap, { backgroundColor: `${colors.accent.primary}18` }]}>
                  <Ionicons name="add" size={22} color={colors.accent.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.createLabel, { color: colors.text.primary }]}>
                    Create New Space
                  </Text>
                  <Text style={[s.createSub, { color: colors.text.secondary }]}>
                    Split expenses with friends, family or roommates
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={colors.accent.primary} />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  /* Header */
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  templateBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },

  /* Stats */
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginTop: 12, marginBottom: 8 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.2, textTransform: 'uppercase' },

  /* Filter */
  filterRow: { paddingHorizontal: 20, gap: 8, marginBottom: 16, paddingVertical: 4 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  filterChipCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  filterChipCountText: { fontSize: 11, fontWeight: '700' },

  /* Group Card */
  groupCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 80,
    padding: 16,
  },
  groupInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupLeft: {
    flex: 1,
    marginRight: 12,
  },
  groupName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  memberCountText: { fontSize: 12, fontWeight: '500' },
  memberActivity: { fontSize: 11, fontWeight: '400' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5 },

  /* Avatar Cluster */
  avatarCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarLetter: { fontSize: 11, fontWeight: '600' },
  overflowBadge: { borderWidth: 1.5 },
  overflowText: { fontSize: 10, fontWeight: '700' },

  /* Right side */
  groupRight: { alignItems: 'flex-end' },
  balanceText: { fontSize: 16, fontWeight: '800' },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  typeDot: { width: 5, height: 5, borderRadius: 2.5 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  /* Empty */
  emptyWrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  /* Create Card */
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 12,
  },
  createIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createLabel: { fontSize: 15, fontWeight: '700' },
  createSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
});
