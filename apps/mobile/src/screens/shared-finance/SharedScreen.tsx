import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { SkeletonCard } from '../../components/ui/AnimatedSkeleton';

function moneyFormat(v: number | string | undefined | null): string {
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

  const loadData = useCallback(async () => {
    if (accessToken) setAccessToken(accessToken);
    try {
      const sharedRes = await api.get<any>('/shared-finance/groups');
      setGroups(listFromResponse(sharedRes));
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const premiumGroups = groups.filter((g: any) => g.type === 'couple' || g.type === 'family');
  const otherGroups = groups.filter((g: any) => g.type !== 'couple' && g.type !== 'family');

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#6C3EF4" />}
      >
        <LinearGradient
          colors={['#6C3EF4', '#8B5CF6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: 20 }}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Spaces</Text>
              <Text style={styles.headerSub}>{groups.length} shared group{groups.length !== 1 ? 's' : ''}</Text>
            </View>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('CreateSharedGroup')}
            >
              <Ionicons name="add" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 8 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} style={{ height: i === 1 ? 160 : 100 }} />)}
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient colors={['#6C3EF4', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyIcon}>
              <Ionicons name="people" size={32} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No shared spaces yet</Text>
            <Text style={[styles.emptySub, { color: colors.text.tertiary }]}>Create a shared group to split expenses with friends, family, or roommates</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateSharedGroup')}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.emptyBtnText}>Create your first space</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {premiumGroups.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Premium Spaces</Text>
                  <TouchableOpacity>
                    <Text style={styles.seeAll}>See all</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                >
                  {premiumGroups.map((group: any) => {
                    const cfg = TYPE_CONFIG[group.type] || TYPE_CONFIG.default;
                    const memberCount = group.members?.length || group._count?.members || 0;
                    const totalExpenses = (group.expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                    const destScreen = group.type === 'couple' ? 'CoupleFinance' : 'FamilyDashboard';

                    return (
                      <TouchableOpacity
                        key={group.id}
                        style={[styles.gridCard, { backgroundColor: colors.bg.card }]}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate(destScreen, { groupId: group.id, groupName: group.name })}
                      >
                        <LinearGradient colors={cfg.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gridGradient}>
                          <Ionicons name={cfg.icon as any} size={28} color="#FFF" />
                        </LinearGradient>
                        <Text style={[styles.gridName, { color: colors.text.primary }]} numberOfLines={1}>{group.name || group.title}</Text>
                        <Text style={[styles.gridMeta, { color: colors.text.tertiary }]}>{memberCount} member{memberCount !== 1 ? 's' : ''}</Text>
                        {totalExpenses > 0 && (
                          <Text style={[styles.gridAmount, { color: colors.text.primary }]}>{moneyFormat(totalExpenses)}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {otherGroups.length > 0 && (
              <View style={{ marginTop: premiumGroups.length > 0 ? 24 : 16 }}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Other Spaces</Text>
                  <Text style={[styles.sectionCount, { color: colors.text.tertiary }]}>{otherGroups.length} group{otherGroups.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 10 }}>
                  {otherGroups.map((group: any) => {
                    const cfg = TYPE_CONFIG[group.type] || TYPE_CONFIG.default;
                    const memberCount = group.members?.length || group._count?.members || 0;
                    const totalExpenses = (group.expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

                    return (
                      <TouchableOpacity
                        key={group.id}
                        style={[styles.listCard, { backgroundColor: colors.bg.card }]}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('SharedGroupDetail', { groupId: group.id, groupName: group.name })}
                      >
                        <LinearGradient colors={cfg.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.listIcon}>
                          <Ionicons name={cfg.icon as any} size={20} color="#FFF" />
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.listName, { color: colors.text.primary }]} numberOfLines={1}>{group.name || group.title}</Text>
                          <Text style={[styles.listMeta, { color: colors.text.tertiary }]}>
                            {cfg.label} · {memberCount} member{memberCount !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {totalExpenses > 0 && (
                            <Text style={[styles.listAmount, { color: colors.text.primary }]}>{moneyFormat(totalExpenses)}</Text>
                          )}
                          <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 24 }}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Quick Actions</Text>
              </View>
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.bg.card }]} onPress={() => navigation.navigate('Settlement')}>
                <View style={[styles.qaIcon, { backgroundColor: '#34C75915' }]}>
                  <Ionicons name="swap-horizontal" size={20} color="#34C759" />
                </View>
                <Text style={[styles.qaText, { color: colors.text.primary }]}>Settlements</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.bg.card }]} onPress={() => navigation.navigate('GroupWallet')}>
                <View style={[styles.qaIcon, { backgroundColor: '#F3D28F15' }]}>
                  <Ionicons name="wallet" size={20} color="#F3D28F" />
                </View>
                <Text style={[styles.qaText, { color: colors.text.primary }]}>Group Wallets</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.bg.card }]} onPress={() => navigation.navigate('SplitTemplates')}>
                <View style={[styles.qaIcon, { backgroundColor: '#8B5CF615' }]}>
                  <Ionicons name="copy-outline" size={20} color="#8B5CF6" />
                </View>
                <Text style={[styles.qaText, { color: colors.text.primary }]}>Split Templates</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.createSpaceCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
              onPress={() => navigation.navigate('CreateSharedGroup')}
              activeOpacity={0.7}
            >
              <LinearGradient colors={['#6C3EF4', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.createSpaceIcon}>
                <Ionicons name="add" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.createSpaceText, { color: colors.text.primary }]}>Create New Space</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { color: '#FFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500', marginTop: 2 },
  createBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#6C3EF4' },
  sectionCount: { fontSize: 12, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6C3EF4', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  gridCard: {
    width: 160, borderRadius: 20, padding: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  gridGradient: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  gridName: { fontSize: 14, fontWeight: '700' },
  gridMeta: { fontSize: 11, fontWeight: '500' },
  gridAmount: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  listCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  listIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  listName: { fontSize: 14, fontWeight: '700' },
  listMeta: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  listAmount: { fontSize: 13, fontWeight: '700' },
  quickAction: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  qaIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qaText: { flex: 1, fontSize: 14, fontWeight: '600' },
  createSpaceCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 14,
    padding: 16, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', gap: 12,
  },
  createSpaceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  createSpaceText: { flex: 1, fontSize: 15, fontWeight: '700' },
});
