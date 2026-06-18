import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { DashboardGrid } from '../../components/dashboard/DashboardGrid';
import { mapFamilyDashboard } from '../../utils/dashboardMapper';

export function FamilyDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [families, setFamilies] = useState<any[]>([]);
  const [activeFamily, setActiveFamily] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<'list' | 'dashboard'>('list');

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadFamilies();
  }, [accessToken]);

  async function loadFamilies() {
    try {
      const res = await api.get<any>('/family');
      setFamilies(Array.isArray(res) ? res : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  const selectFamily = useCallback(async (family: any) => {
    setActiveFamily(family);
    setMode('dashboard');
    try {
      const res = await api.get<any>(`/dashboard/family?familyId=${family.id}`);
      setDashboardData(mapFamilyDashboard({
        ...res,
        familyHero: { ...res?.familyHero, familyName: family.name, memberCount: family._count?.members || 0 },
      }));
    } catch {
      setDashboardData({});
    }
  }, []);

  const onRefresh = useCallback(async () => {
    if (!activeFamily) return;
    setRefreshing(true);
    try {
      const res = await api.get<any>(`/dashboard/family?familyId=${activeFamily.id}`);
      setDashboardData(mapFamilyDashboard({
        ...res,
        familyHero: {
          ...res?.familyHero,
          familyName: activeFamily.name,
          memberCount: activeFamily._count?.members || 0,
        },
      }));
    } catch {
      /* ignore */
    }
    setRefreshing(false);
  }, [activeFamily]);

  const backToList = useCallback(() => {
    setMode('list');
    setActiveFamily(null);
    setDashboardData(null);
  }, []);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (mode === 'list') {
    return (
      <View style={[s.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={s.listContent}>
          <View style={s.header}>
            <Text style={[s.headerTitle, { color: colors.text.primary }]}>Family Dashboard</Text>
            <Text style={[s.headerSub, { color: colors.text.tertiary }]}>
              {families.length} {families.length === 1 ? 'family' : 'families'}
            </Text>
          </View>
          {families.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[s.card, { backgroundColor: colors.bg.secondary }]}
              onPress={() => selectFamily(f)}
              activeOpacity={0.7}
            >
              <View style={s.cardBody}>
                <View style={[s.avatar, { backgroundColor: colors.accent.primary }]}>
                  <Text style={s.avatarText}>{(f.name || 'F')[0].toUpperCase()}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={[s.cardName, { color: colors.text.primary }]}>{f.name}</Text>
                  <Text style={[s.cardMeta, { color: colors.text.tertiary }]}>
                    {f._count?.members || 0} members
                  </Text>
                </View>
                <AntDesign name="right" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          ))}
          {families.length === 0 && (
            <View style={s.empty}>
              <AntDesign name="team" size={44} color={colors.accent.primary} />
              <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No family group</Text>
              <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
                Create or join a family to see your family dashboard
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={[s.topBar, { borderBottomColor: colors.border.subtle }]}>
        <TouchableOpacity onPress={backToList} style={s.backBtn}>
          <AntDesign name="arrowleft" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[s.topTitle, { color: colors.text.primary }]}>{activeFamily?.name}</Text>
        <View style={{ width: 36 }} />
      </View>
      <DashboardGrid
        data={dashboardData || {}}
        mode="family"
        refreshing={refreshing}
        onRefresh={onRefresh}
        onWidgetPress={(type) => {
          if (type === 'familyGoals') navigation?.navigate('FamilyGoals', { familyId: activeFamily?.id });
          else if (type === 'familyBills') navigation?.navigate('FamilyBills', { familyId: activeFamily?.id });
        }}
        onNavigate={(screen, params) => navigation?.navigate(screen, params)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  header: { paddingVertical: 16, paddingHorizontal: 4 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  card: { padding: 16, borderRadius: 20, marginBottom: 12 },
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1, marginLeft: 14 },
  cardName: { fontSize: 17, fontWeight: '700' },
  cardMeta: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyDesc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '700' },
});
