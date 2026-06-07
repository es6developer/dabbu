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

  const typeColors: Record<string, string> = {
    couple: '#FF6B9D', family: '#6C3EF4', friends: '#34C759',
    trip: '#F3D28F', roommates: '#8B5CF6', apartment: '#8A5CF6',
    office: '#6366F1', event: '#FF6B6B',
  };

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
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
              {groups.map((group) => {
                const color = typeColors[group.type] || colors.accent.primary;
                const memberCount = group.members?.length || group._count?.members || 0;
                const totalExpenses = (group.expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                const isSpecial = group.type === 'couple' || group.type === 'family';
                const icon = group.type === 'couple' ? 'heart' : group.type === 'family' ? 'home' : 'people';
                const destScreen = group.type === 'couple' ? 'CoupleFinance' : group.type === 'family' ? 'FamilyDashboard' : 'SharedGroupDetail';

                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupCard, { backgroundColor: colors.bg.card }]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate(destScreen, { groupId: group.id, groupName: group.name })}
                  >
                    <LinearGradient colors={[color, color + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.groupGradient}>
                      <Ionicons name={icon as any} size={22} color="#FFF" />
                    </LinearGradient>
                    <View style={styles.groupInfo}>
                      <Text style={[styles.groupName, { color: colors.text.primary }]} numberOfLines={1}>{group.name || group.title}</Text>
                      <Text style={[styles.groupMeta, { color: colors.text.tertiary }]}>{memberCount} member{memberCount !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={styles.groupRight}>
                      {totalExpenses > 0 && (
                        <Text style={[styles.groupAmount, { color: colors.text.primary }]}>{moneyFormat(totalExpenses)}</Text>
                      )}
                      <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 4 }}>
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
            </View>
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
  groupCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  groupGradient: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: '700' },
  groupMeta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  groupRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupAmount: { fontSize: 14, fontWeight: '700' },
  quickAction: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  qaIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qaText: { flex: 1, fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6C3EF4', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
