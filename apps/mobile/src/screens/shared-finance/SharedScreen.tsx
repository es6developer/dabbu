import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { SkeletonCard } from '../../components/ui/AnimatedSkeleton';

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

const TYPE_CONFIG: Record<string, { icon: string; gradient: [string, string]; label: string; color: string }> = {
  couple: { icon: 'heart', gradient: ['#FF6B9D', '#FF8FB3'], label: 'Couple', color: '#FF6B9D' },
  family: { icon: 'home', gradient: ['#6C3EF4', '#8B5CF6'], label: 'Family', color: '#6C3EF4' },
  friends: { icon: 'people', gradient: ['#34C759', '#5EE99D'], label: 'Friends', color: '#34C759' },
  trip: { icon: 'airplane', gradient: ['#F3D28F', '#FFB347'], label: 'Trip', color: '#F3D28F' },
  roommates: { icon: 'business', gradient: ['#4F6EF7', '#7C8FF8'], label: 'Roommates', color: '#4F6EF7' },
  apartment: { icon: 'home', gradient: ['#8A5CF6', '#B794F4'], label: 'Apartment', color: '#8A5CF6' },
  office: { icon: 'briefcase', gradient: ['#6366F1', '#818CF8'], label: 'Office', color: '#6366F1' },
  event: { icon: 'calendar', gradient: ['#FF6B6B', '#FF8E8E'], label: 'Event', color: '#FF6B6B' },
  default: { icon: 'people', gradient: ['#6C3EF4', '#8B5CF6'], label: 'Group', color: '#6C3EF4' },
};

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

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#6C3EF4" />
        }
      >
        <LinearGradient
          colors={['#1A1A3E', '#12121A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 16, paddingBottom: 28, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        >
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerLabel}>Shared Spaces</Text>
              <Text style={s.headerTitle}>Spaces</Text>
            </View>
            <TouchableOpacity style={s.createBtn} onPress={() => navigation.navigate('CreateSharedGroup')} activeOpacity={0.8}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          {groups.length > 0 && (
            <View style={s.headerStats}>
              <View style={s.headerStat}>
                <Text style={s.headerStatVal}>{groups.length}</Text>
                <Text style={s.headerStatLabel}>Spaces</Text>
              </View>
              <View style={[s.headerStatDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
              <View style={s.headerStat}>
                <Text style={s.headerStatVal}>{groups.reduce((s, g) => s + (g.members?.length || g._count?.members || 0), 0)}</Text>
                <Text style={s.headerStatLabel}>Members</Text>
              </View>
              <View style={[s.headerStatDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
              <View style={s.headerStat}>
                <Text style={s.headerStatVal}>{groups.reduce((s, g) => s + (g.expenses?.length || 0), 0)}</Text>
                <Text style={s.headerStatLabel}>Expenses</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {loading ? (
          <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 16 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} style={{ height: i === 1 ? 160 : 100 }} />)}
          </View>
        ) : groups.length === 0 ? (
          <View style={s.emptyWrap}>
            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
              <LinearGradient colors={['#6C3EF4', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.emptyIcon}>
                <Ionicons name="people" size={36} color="#FFF" />
              </LinearGradient>
              <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No shared spaces yet</Text>
              <Text style={[s.emptySub, { color: colors.text.tertiary }]}>
                Create a shared group to split expenses with friends, family, or roommates
              </Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('CreateSharedGroup')} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={s.emptyBtnText}>Create your first space</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {premiumGroups.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <View style={s.secHeader}>
                  <View style={s.secHeaderLeft}>
                    <View style={[s.secHeaderDot, { backgroundColor: '#6C3EF4' }]} />
                    <Text style={[s.secTitle, { color: colors.text.primary }]}>Premium Spaces</Text>
                  </View>
                  <Text style={[s.secCount, { color: colors.text.tertiary }]}>{premiumGroups.length}</Text>
                </View>
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                >
                  {premiumGroups.map((group: any) => {
                    const cfg = TYPE_CONFIG[group.type] || TYPE_CONFIG.default;
                    const mc = group.members?.length || group._count?.members || 0;
                    const te = (group.expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                    const ds = group.type === 'couple' ? 'CoupleFinance' : 'FamilyDashboard';
                    return (
                      <TouchableOpacity
                        key={group.id} activeOpacity={0.7}
                        style={[s.premiumCard, { backgroundColor: colors.bg.secondary }]}
                        onPress={() => navigation.navigate(ds, { groupId: group.id, groupName: group.name })}
                      >
                        <LinearGradient colors={cfg.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.premiumIcon}>
                          <Ionicons name={cfg.icon as any} size={28} color="#FFF" />
                        </LinearGradient>
                        <Text style={[s.premiumName, { color: colors.text.primary }]} numberOfLines={1}>{group.name || group.title}</Text>
                        <View style={[s.typeBadge, { backgroundColor: `${cfg.color}20` }]}>
                          <Text style={[s.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                        <View style={s.premiumMeta}>
                          <Text style={[s.premiumMetaText, { color: colors.text.tertiary }]}>
                            <Ionicons name="people-outline" size={11} color={colors.text.tertiary} /> {mc}
                          </Text>
                          {te > 0 && <Text style={[s.premiumAmount, { color: colors.text.primary }]}>{fmt(te)}</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {otherGroups.length > 0 && (
              <View style={{ marginTop: premiumGroups.length > 0 ? 24 : 16 }}>
                <View style={s.secHeader}>
                  <View style={s.secHeaderLeft}>
                    <View style={[s.secHeaderDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={[s.secTitle, { color: colors.text.primary }]}>All Spaces</Text>
                  </View>
                  <Text style={[s.secCount, { color: colors.text.tertiary }]}>{otherGroups.length}</Text>
                </View>
                <View style={{ paddingHorizontal: 20, gap: 10 }}>
                  {otherGroups.map((group: any) => {
                    const cfg = TYPE_CONFIG[group.type] || TYPE_CONFIG.default;
                    const mc = group.members?.length || group._count?.members || 0;
                    const te = (group.expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                    return (
                      <TouchableOpacity
                        key={group.id} activeOpacity={0.7}
                        style={[s.listCard, { backgroundColor: colors.bg.secondary }]}
                        onPress={() => navigation.navigate('SharedGroupDetail', { groupId: group.id, groupName: group.name })}
                      >
                        <LinearGradient colors={cfg.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.listIcon}>
                          <Ionicons name={cfg.icon as any} size={20} color="#FFF" />
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                          <View style={s.listTop}>
                            <Text style={[s.listName, { color: colors.text.primary }]} numberOfLines={1}>{group.name || group.title}</Text>
                            <View style={[s.listTypeBadge, { backgroundColor: `${cfg.color}18` }]}>
                              <Text style={[s.listTypeText, { color: cfg.color }]}>{cfg.label}</Text>
                            </View>
                          </View>
                          <View style={s.listBottom}>
                            <Text style={[s.listMeta, { color: colors.text.tertiary }]}>
                              <Ionicons name="people-outline" size={11} color={colors.text.tertiary} /> {mc} member{mc !== 1 ? 's' : ''}
                            </Text>
                            {te > 0 && <Text style={[s.listAmount, { color: colors.text.primary }]}>{fmt(te)}</Text>}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
              <View style={s.secHeader}>
                <View style={s.secHeaderLeft}>
                  <View style={[s.secHeaderDot, { backgroundColor: '#34C759' }]} />
                  <Text style={[s.secTitle, { color: colors.text.primary }]}>Quick Actions</Text>
                </View>
              </View>
              <View style={{ gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={[s.quickAction, { backgroundColor: colors.bg.secondary }]}
                  onPress={() => navigation.navigate('Settlement')}
                  activeOpacity={0.7}
                >
                  <View style={[s.qaIcon, { backgroundColor: '#34C75915' }]}>
                    <Ionicons name="swap-horizontal" size={20} color="#34C759" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.qaLabel, { color: colors.text.primary }]}>Settlements</Text>
                    <Text style={[s.qaSub, { color: colors.text.tertiary }]}>Settle up balances with members</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.quickAction, { backgroundColor: colors.bg.secondary }]}
                  onPress={() => navigation.navigate('GroupWallet')}
                  activeOpacity={0.7}
                >
                  <View style={[s.qaIcon, { backgroundColor: '#F3D28F15' }]}>
                    <Ionicons name="wallet" size={20} color="#F3D28F" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.qaLabel, { color: colors.text.primary }]}>Group Wallets</Text>
                    <Text style={[s.qaSub, { color: colors.text.tertiary }]}>Manage shared funds and transfers</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.quickAction, { backgroundColor: colors.bg.secondary }]}
                  onPress={() => navigation.navigate('SplitTemplates')}
                  activeOpacity={0.7}
                >
                  <View style={[s.qaIcon, { backgroundColor: '#8B5CF615' }]}>
                    <Ionicons name="copy-outline" size={20} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.qaLabel, { color: colors.text.primary }]}>Split Templates</Text>
                    <Text style={[s.qaSub, { color: colors.text.tertiary }]}>Save and reuse split configurations</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[s.createCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
              onPress={() => navigation.navigate('CreateSharedGroup')}
              activeOpacity={0.7}
            >
              <LinearGradient colors={['#6C3EF4', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.createIcon}>
                <Ionicons name="add" size={24} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[s.createLabel, { color: colors.text.primary }]}>Create New Space</Text>
                <Text style={[s.createSub, { color: colors.text.tertiary }]}>Start a new shared group with your people</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  headerTitle: { color: '#FFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  createBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  headerStats: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14 },
  headerStat: { flex: 1, alignItems: 'center' },
  headerStatDivider: { width: 1, height: 28 },
  headerStatVal: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  headerStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '500', marginTop: 1 },
  secHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  secHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secHeaderDot: { width: 8, height: 8, borderRadius: 4 },
  secTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  secCount: { fontSize: 13, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60, gap: 10 },
  emptyIcon: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#6C3EF4', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginTop: 12 },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  premiumCard: {
    width: 170, borderRadius: 24, padding: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  premiumIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  premiumName: { fontSize: 15, fontWeight: '700' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  typeBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  premiumMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  premiumMetaText: { fontSize: 12, fontWeight: '500' },
  premiumAmount: { fontSize: 16, fontWeight: '800' },
  listCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  listIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  listTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listName: { fontSize: 15, fontWeight: '700', flex: 1 },
  listTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  listTypeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  listBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  listMeta: { fontSize: 12, fontWeight: '500' },
  listAmount: { fontSize: 14, fontWeight: '700' },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  qaIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 15, fontWeight: '700' },
  qaSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  createCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 20,
    padding: 16, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', gap: 12,
  },
  createIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  createLabel: { fontSize: 16, fontWeight: '700' },
  createSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
});
