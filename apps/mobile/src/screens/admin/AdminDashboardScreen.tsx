import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, TouchableOpacity, RefreshControl,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../config/api';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';

interface FeatureFlag { id: string; name: string; description: string | null; isEnabled: boolean; }
interface DashboardStats { totalUsers: number; activeUsers: number; totalAdmins: number; activeSubscriptions: number; totalTransactions: number; newUsersToday: number; revenueThisMonth: number; userGrowth: number; }
type Params = { AdminDashboard: { token: string } };

export function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Params, 'AdminDashboard'>>();
  const token = route.params?.token || '';
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [flagsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/feature-flags`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const flagsJson = await flagsRes.json();
      const statsJson = await statsRes.json();
      if (flagsJson.data) setFlags(flagsJson.data);
      if (statsJson.data) setStats(statsJson.data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  const toggleFlag = async (flag: FeatureFlag) => {
    setTogglingId(flag.id);
    setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, isEnabled: !f.isEnabled } : f));
    try {
      await fetch(`${API_URL}/admin/feature-flags/${flag.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isEnabled: !flag.isEnabled }),
      });
    } catch { setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, isEnabled: flag.isEnabled } : f)); }
    finally { setTogglingId(null); }
  };

  const flagIcons: Record<string, string> = {
    dashboard: 'appstore1', expenses: 'wallet', wallet: 'creditcard', circles: 'team',
    shared_spaces: 'earth', goals: 'flag', couple: 'heart', analytics: 'barchart',
    ai_copilot: 'bulb1', bills: 'filetext1', budgets: 'piechart', investments: 'linechart',
    family: 'home', premium: 'diamond', referral: 'sharealt', chat: 'message1',
    notifications: 'bells', settings: 'setting', reports: 'filetext1',
    reminders: 'clockcircleo', documents: 'folder1', split: 'scissor1', sms_detection: 'scan1',
  };

  const getFlagColor = (name: string) => {
    const colorMap: Record<string, string> = {
      dashboard: '#7C3AED', expenses: '#22C55E', wallet: '#3B82F6', circles: '#F59E0B',
      shared_spaces: '#7C3AED', goals: '#FF2D55', couple: '#FF3B30', analytics: '#34C759',
      ai_copilot: '#A855F7', bills: '#F97316', budgets: '#EAB308', investments: '#06B6D4',
      family: '#84CC16', premium: '#D946EF', referral: '#0EA5E9', chat: colors.accent.primary,
      notifications: '#F43F5E', settings: '#64748B', reports: '#78716C', reminders: '#38BDF8',
      documents: '#A8A29E', split: '#2DD4BF', sms_detection: '#FB923C',
    };
    return colorMap[name] || '#7C3AED';
  };

  if (loading) {
    return <View style={[st.container, { backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.accent.primary} />
    </View>;
  }

  return (
    <View style={[st.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[st.header, { paddingTop: insets.top + spacing.xl }]}>
        <Text style={[st.headerTitle, { color: colors.text.primary }]}>Admin Panel</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[st.logoutBtn, { backgroundColor: colors.bg.secondary }]}>
          <AntDesign name="logout" size={16} color={colors.status.error} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.accent.primary} />} contentContainerStyle={{ paddingBottom: spacing['5xl'] }}>
        {stats ? (
          <View style={st.statsGrid}>
            {[
              { icon: 'team', label: 'Users', value: stats.totalUsers.toString(), color: '#7C3AED' },
              { icon: 'adduser', label: 'New Today', value: stats.newUsersToday.toString(), color: '#22C55E' },
              { icon: 'Safety', label: 'Admins', value: stats.totalAdmins.toString(), color: '#3B82F6' },
              { icon: 'star', label: 'Premium', value: stats.activeSubscriptions.toString(), color: '#F59E0B' },
              { icon: 'wallet', label: 'Transactions', value: stats.totalTransactions.toLocaleString(), color: '#14B8A6' },
              { icon: 'linechart', label: 'Revenue (Mo)', value: `₹${stats.revenueThisMonth.toLocaleString()}`, color: '#EC4899' },
            ].map((item, i) => (
              <View key={i} style={[st.statCard, { backgroundColor: colors.bg.secondary, borderLeftColor: item.color }]}>
                <AntDesign name={item.icon as any} size={16} color={item.color} />
                <Text style={[st.statValue, { color: colors.text.primary }]}>{item.value}</Text>
                <Text style={[st.statLabel, { color: colors.text.tertiary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={[st.sectionTitle, { color: colors.text.primary }]}>Feature Flags</Text>
        <Text style={[st.sectionSubtitle, { color: colors.text.tertiary }]}>Toggle features on/off across the entire app</Text>

        <View style={st.flagsList}>
          {flags.map((flag) => (
            <View key={flag.id} style={[st.flagRow, { backgroundColor: colors.bg.secondary }, !flag.isEnabled && st.disabledRow]}>
              <View style={[st.flagIconBox, { backgroundColor: `${getFlagColor(flag.name)}18` }]}>
                <AntDesign name={(flagIcons[flag.name] || 'appstore1') as any} size={16} color={getFlagColor(flag.name)} />
              </View>
              <View style={st.flagInfo}>
                <Text style={[st.flagName, { color: colors.text.primary }]}>{flag.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                <Text style={[st.flagDesc, { color: colors.text.tertiary }]}>{flag.description || ''}</Text>
              </View>
              <Switch
                value={flag.isEnabled}
                onValueChange={() => toggleFlag(flag)}
                trackColor={{ false: colors.border.subtle, true: `${colors.accent.primary}60` }}
                thumbColor={flag.isEnabled ? colors.accent.primary : colors.text.tertiary}
                disabled={togglingId === flag.id}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['2xl'], paddingBottom: spacing.lg },
  headerTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  logoutBtn: { width: 40, height: 40, borderRadius: borderRadius['2xl'], justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing['3xl'] },
  statCard: { width: '47%', borderRadius: borderRadius['2xl'], padding: spacing.lg, borderLeftWidth: 3, gap: spacing.xs },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '600', paddingHorizontal: spacing['2xl'], marginBottom: spacing.xs },
  sectionSubtitle: { fontSize: 13, fontWeight: '400', paddingHorizontal: spacing['2xl'], marginBottom: spacing.lg },
  flagsList: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  flagRow: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius['2xl'], padding: spacing.md, gap: spacing.sm },
  disabledRow: { opacity: 0.5 },
  flagIconBox: { width: 40, height: 40, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center' },
  flagInfo: { flex: 1 },
  flagName: { fontSize: 14, fontWeight: '600' },
  flagDesc: { fontSize: 11, fontWeight: '400', marginTop: spacing.xs },
});
