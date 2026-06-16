import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { API_URL } from '../../config/api';

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalAdmins: number;
  activeSubscriptions: number;
  totalTransactions: number;
  newUsersToday: number;
  revenueThisMonth: number;
  userGrowth: number;
}

type Params = { AdminDashboard: { token: string } };

export function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Params, 'AdminDashboard'>>();
  const token = route.params?.token || '';

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [flagsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/feature-flags`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/admin/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const flagsJson = await flagsRes.json();
      const statsJson = await statsRes.json();
      if (flagsJson.data) setFlags(flagsJson.data);
      if (statsJson.data) setStats(statsJson.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  const toggleFlag = async (flag: FeatureFlag) => {
    setTogglingId(flag.id);
    setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, isEnabled: !f.isEnabled } : f)));
    try {
      await fetch(`${API_URL}/admin/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isEnabled: !flag.isEnabled }),
      });
    } catch {
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, isEnabled: flag.isEnabled } : f)));
    } finally {
      setTogglingId(null);
    }
  };

  const flagIcons: Record<string, string> = {
    dashboard: 'grid-outline', expenses: 'cash-outline', wallet: 'wallet-outline',
    circles: 'people-outline', shared_spaces: 'globe-outline', goals: 'flag-outline',
    couple: 'heart-outline', analytics: 'bar-chart-outline', ai_copilot: 'sparkles-outline',
    bills: 'receipt-outline', budgets: 'pie-chart-outline', investments: 'trending-up-outline',
    family: 'home-outline', premium: 'diamond-outline', referral: 'share-outline',
    chat: 'chatbubbles-outline', notifications: 'notifications-outline', settings: 'settings-outline',
    reports: 'document-text-outline', reminders: 'alarm-outline', documents: 'folder-outline',
    split: 'cut-outline', sms_detection: 'scan-outline',
  };

  const getFlagColor = (name: string) => {
    const colors: Record<string, string> = {
      dashboard: '#6C3EF4', expenses: '#22C55E', wallet: '#3B82F6', circles: '#F59E0B',
      shared_spaces: '#8B5CF6', goals: '#EC4899', couple: '#EF4444', analytics: '#14B8A6',
      ai_copilot: '#A855F7', bills: '#F97316', budgets: '#EAB308', investments: '#06B6D4',
      family: '#84CC16', premium: '#D946EF', referral: '#0EA5E9', chat: '#6366F1',
      notifications: '#F43F5E', settings: '#64748B', reports: '#78716C', reminders: '#38BDF8',
      documents: '#A8A29E', split: '#2DD4BF', sms_detection: '#FB923C',
    };
    return colors[name] || '#6C3EF4';
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6C3EF4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#6C3EF4" />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {stats && (
          <View style={styles.statsGrid}>
            <StatCard icon="people-outline" label="Users" value={stats.totalUsers.toString()} color="#6C3EF4" />
            <StatCard icon="person-add-outline" label="New Today" value={stats.newUsersToday.toString()} color="#22C55E" />
            <StatCard icon="shield-outline" label="Admins" value={stats.totalAdmins.toString()} color="#3B82F6" />
            <StatCard icon="diamond-outline" label="Premium" value={stats.activeSubscriptions.toString()} color="#F59E0B" />
            <StatCard icon="cash-outline" label="Transactions" value={stats.totalTransactions.toLocaleString()} color="#14B8A6" />
            <StatCard icon="trending-up-outline" label="Revenue (Mo)" value={`₹${(stats.revenueThisMonth).toLocaleString()}`} color="#EC4899" />
          </View>
        )}

        <Text style={styles.sectionTitle}>Feature Flags</Text>
        <Text style={styles.sectionSubtitle}>Toggle features on/off across the entire app</Text>

        <View style={styles.flagsList}>
          {flags.map((flag) => (
            <View key={flag.id} style={[styles.flagRow, !flag.isEnabled && styles.disabledRow]}>
              <View style={[styles.flagIconBox, { backgroundColor: `${getFlagColor(flag.name)}20` }]}>
                <Ionicons name={(flagIcons[flag.name] || 'ellipse-outline') as any} size={20} color={getFlagColor(flag.name)} />
              </View>
              <View style={styles.flagInfo}>
                <Text style={styles.flagName}>{flag.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</Text>
                <Text style={styles.flagDesc}>{flag.description || ''}</Text>
              </View>
              <Switch
                value={flag.isEnabled}
                onValueChange={() => toggleFlag(flag)}
                trackColor={{ false: '#333', true: '#6C3EF480' }}
                thumbColor={flag.isEnabled ? '#6C3EF4' : '#666'}
                disabled={togglingId === flag.id}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0A1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1A1528', justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  statCard: { width: '47%', backgroundColor: '#1A1528', borderRadius: 14, padding: 16, borderLeftWidth: 3, gap: 6 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: '#888' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', paddingHorizontal: 20, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#666', paddingHorizontal: 20, marginBottom: 16 },
  flagsList: { paddingHorizontal: 16, gap: 8 },
  flagRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1528', borderRadius: 14, padding: 14, gap: 12 },
  disabledRow: { opacity: 0.6 },
  flagIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  flagInfo: { flex: 1 },
  flagName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  flagDesc: { fontSize: 11, color: '#888', marginTop: 2 },
});
