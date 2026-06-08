import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { SkeletonCard } from '../../components/ui/AnimatedSkeleton';

const { width: SCREEN_W } = Dimensions.get('window');
const BILL_CARD_W = 165;

function fmt(v: number | string | undefined | null): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function listFromResponse(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.items) return Array.isArray(res.items) ? res.items : [];
  return [];
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  couple: { icon: 'heart', label: 'Couple', color: '#FF6B9D' },
  family: { icon: 'home', label: 'Family', color: '#FF6B00' },
  friends: { icon: 'people', label: 'Friends', color: '#34C759' },
  trip: { icon: 'airplane', label: 'Trip', color: '#F3D28F' },
  roommates: { icon: 'business', label: 'Roommates', color: '#4F6EF7' },
  apartment: { icon: 'home', label: 'Apartment', color: '#8A5CF6' },
  office: { icon: 'briefcase', label: 'Office', color: '#818CF8' },
  event: { icon: 'calendar', label: 'Event', color: '#FF6B6B' },
  default: { icon: 'people', label: 'Group', color: '#FF6B00' },
};

interface GroupCardProps {
  group: any;
  onPress: () => void;
}

function GroupCard({ group, onPress }: GroupCardProps) {
  const cfg = TYPE_CONFIG[group.type] || TYPE_CONFIG.default;
  const mc = group.members?.length || group._count?.members || 0;
  const balance = group.balance || 0;
  const positive = balance >= 0;
  const recentActivity = group.updatedAt || group.createdAt;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.98, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.timing(borderAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.timing(borderAnim, { toValue: 0, duration: 150, useNativeDriver: false }),
    ]).start();
  };

  const borderOpacity = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.04, 0.4],
  });

  const members = group.members || [];
  const maxAvatars = 4;
  const overflow = mc > maxAvatars ? mc - maxAvatars : 0;
  const displayMembers = members.slice(0, maxAvatars);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            s.groupCard,
            { borderColor: `rgba(255, 255, 255, ${borderOpacity})` },
          ]}
        >
          {/* Left Block */}
          <View style={s.groupLeft}>
            <Text style={s.groupName} numberOfLines={1}>{group.name || group.title}</Text>
            <View style={s.groupMetaRow}>
              <View style={[s.groupTypeDot, { backgroundColor: cfg.color }]} />
              <Text style={s.groupMeta}>{cfg.label} · {mc} member{mc !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          {/* Center Block - Avatars */}
          <View style={s.groupCenter}>
            <View style={s.avatarStack}>
              {displayMembers.map((m: any, i: number) => {
                const u = m.user || m;
                const initial = (u.firstName?.[0] || u.email?.[0] || '?').toUpperCase();
                return (
                  <View
                    key={u.id || i}
                    style={[s.avatarCircle, { zIndex: maxAvatars - i, marginLeft: i === 0 ? 0 : -8 }]}
                  >
                    <Text style={s.avatarText}>{initial}</Text>
                  </View>
                );
              })}
              {overflow > 0 && (
                <View style={[s.avatarCircle, s.avatarOverflow, { marginLeft: -8 }]}>
                  <Text style={s.avatarOverflowText}>+{overflow}</Text>
                </View>
              )}
              {mc === 0 && (
                <View style={[s.avatarCircle, s.avatarInvite]}>
                  <Ionicons name="add" size={14} color="#FF6B00" />
                </View>
              )}
            </View>
          </View>

          {/* Right Block */}
          <View style={s.groupRight}>
            <Text style={[s.groupBalance, { color: balance === 0 ? '#8E8E93' : positive ? '#27D376' : '#FF4545' }]}>
              {balance === 0 ? '₹0' : `${positive ? '+' : ''}${fmt(Math.abs(balance))}`}
            </Text>
            {recentActivity && (
              <Text style={s.groupActivity}>Recent: {timeAgo(recentActivity)}</Text>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SharedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { accessToken } = useAuth();

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    if (accessToken) setAccessToken(accessToken);
    try {
      const sharedRes = await api.get<any>('/shared-finance/groups');
      setGroups(listFromResponse(sharedRes));
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loading]);

  const premiumGroups = groups.filter((g: any) => g.type === 'couple' || g.type === 'family');
  const otherGroups = groups.filter((g: any) => g.type !== 'couple' && g.type !== 'family');

  const recentBills = groups
    .flatMap((g: any) => (g.expenses || []).slice(0, 3))
    .filter(Boolean)
    .slice(0, 8);

  return (
    <View style={[s.screen, { backgroundColor: '#070708' }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor="#FF6B00"
          />
        }
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerEyebrow}>SPACES</Text>
              <Text style={s.headerTitle}>Shared Spaces</Text>
            </View>
            <TouchableOpacity
              style={s.createBtn}
              onPress={() => navigation.navigate('CreateSharedGroup')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
          {groups.length > 1 && (
            <View style={s.headerCount}>
              <Text style={s.headerCountNum}>{groups.length}</Text>
              <Text style={s.headerCountLabel}>active spaces</Text>
            </View>
          )}
        </View>

        {/* Loading */}
        {loading ? (
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md, marginTop: spacing.sm }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} style={{ height: i === 1 ? 150 : 96 }} />)}
          </View>
        ) : groups.length === 0 ? (
          /* Empty State */
          <View style={s.emptyWrap}>
            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
              <View style={[s.emptyIcon, { backgroundColor: 'rgba(255,107,0,0.12)' }]}>
                <Ionicons name="layers-outline" size={36} color="#FF6B00" />
              </View>
              <Text style={[s.emptyTitle, { color: '#FFF' }]}>No shared spaces yet</Text>
              <Text style={[s.emptySub, { color: '#8E8E93' }]}>
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
            </Animated.View>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Recent Active Bills */}
            {recentBills.length > 0 && (
              <View style={{ marginBottom: 28 }}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Recent Active Bills</Text>
                  <Text style={s.sectionCount}>{recentBills.length}</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                  decelerationRate="fast"
                >
                  {recentBills.map((bill: any, i: number) => (
                    <View key={bill.id || i} style={s.billCard}>
                      <Text style={s.billVendor} numberOfLines={1}>
                        {bill.description || bill.vendor || 'Expense'}
                      </Text>
                      <Text style={s.billDate}>
                        {bill.date ? new Date(bill.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                      </Text>
                      <Text style={s.billAmount}>{fmt(bill.amount)}</Text>
                      <TouchableOpacity style={s.splitBtn} activeOpacity={0.7}>
                        <Text style={s.splitBtnText}>Split Now</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Couple & Family Spaces */}
            {premiumGroups.length > 0 && (
              <View style={{ marginBottom: 28 }}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Couple & Family</Text>
                  <Text style={s.sectionCount}>{premiumGroups.length}</Text>
                </View>
                <View style={{ paddingHorizontal: 20, gap: 12 }}>
                  {premiumGroups.map((group: any) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onPress={() => {
                        const ds = group.type === 'couple' ? 'CoupleFinance' : 'FamilyDashboard';
                        navigation.navigate(ds, { groupId: group.id, groupName: group.name });
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* All Spaces */}
            {(premiumGroups.length === 0 || otherGroups.length > 0) && (
              <View style={{ paddingHorizontal: 20 }}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>All Spaces</Text>
                  <Text style={s.sectionCount}>{groups.length}</Text>
                </View>
                <View style={{ gap: 12 }}>
                  {otherGroups.length > 0
                    ? otherGroups.map((group: any) => (
                        <GroupCard
                          key={group.id}
                          group={group}
                          onPress={() =>
                            navigation.navigate('SharedGroupDetail', { groupId: group.id, groupName: group.name })
                          }
                        />
                      ))
                    : premiumGroups.length > 0 && (
                        <Text style={{ color: '#8E8E93', fontSize: 13, fontWeight: '500', textAlign: 'center', paddingVertical: 12 }}>
                          All your active spaces are shown above
                        </Text>
                      )}
                </View>
              </View>
            )}

            {/* Create New */}
            <TouchableOpacity
              style={[s.createCard, { borderColor: 'rgba(255,107,0,0.3)' }]}
              onPress={() => navigation.navigate('CreateSharedGroup')}
              activeOpacity={0.7}
            >
              <View style={[s.createIconWrap, { backgroundColor: 'rgba(255,107,0,0.12)' }]}>
                <Ionicons name="add" size={24} color="#FF6B00" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.createLabel, { color: '#FFF' }]}>Create New Space</Text>
                <Text style={[s.createSub, { color: '#8E8E93' }]}>
                  Split expenses with friends, family or roommates
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#FF6B00" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {/* FAB - Scan Receipt */}
      <View style={[s.fabWrap, { bottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={s.fab}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Expense', { screen: 'CategorySelection' })}
        >
          <Ionicons name="scan-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  /* Header */
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.35)', marginBottom: 2 },
  headerTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: '#FFF' },
  createBtn: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: '#FF6B00',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  headerCount: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  headerCountNum: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  headerCountLabel: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, paddingHorizontal: 0,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, color: '#FFF' },
  sectionCount: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },

  /* Empty */
  emptyWrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60 },
  emptyIcon: { width: 88, height: 88, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6B00', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  /* Bill Cards */
  billCard: {
    width: BILL_CARD_W, height: 150,
    backgroundColor: '#121214', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: 14, justifyContent: 'space-between',
  },
  billVendor: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  billDate: { fontSize: 11, fontWeight: '500', color: '#8E8E93', marginTop: 1 },
  billAmount: { fontSize: 20, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  splitBtn: {
    height: 24, borderRadius: 8,
    backgroundColor: 'rgba(255,107,0,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  splitBtnText: { fontSize: 11, fontWeight: '700', color: '#FF6B00' },

  /* Group Cards */
  groupCard: {
    minHeight: 96,
    backgroundColor: '#121214', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  groupLeft: { flex: 1, marginRight: 12 },
  groupName: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 4 },
  groupMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  groupTypeDot: { width: 5, height: 5, borderRadius: 2.5 },
  groupMeta: { fontSize: 12, fontWeight: '500', color: '#8E8E93' },

  groupCenter: { marginRight: 12 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#121214',
  },
  avatarText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  avatarOverflow: { backgroundColor: 'rgba(255,107,0,0.2)' },
  avatarOverflowText: { fontSize: 9, fontWeight: '700', color: '#FF6B00' },
  avatarInvite: { backgroundColor: 'rgba(255,107,0,0.1)', borderColor: 'rgba(255,107,0,0.3)' },

  groupRight: { alignItems: 'flex-end' },
  groupBalance: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  groupActivity: { fontSize: 10, fontWeight: '500', color: '#8E8E93', marginTop: 2 },

  /* Create Card */
  createCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 24,
    padding: 16, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed',
    gap: 14, backgroundColor: 'rgba(255,107,0,0.03)',
  },
  createIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  createLabel: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  createSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  /* FAB */
  fabWrap: { position: 'absolute', right: 24, alignItems: 'center' },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FF6B00',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 8,
  },
});
