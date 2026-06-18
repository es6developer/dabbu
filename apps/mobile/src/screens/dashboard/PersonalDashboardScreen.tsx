import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { DashboardGrid } from '../../components/dashboard/DashboardGrid';
import { mapPersonalDashboard } from '../../utils/dashboardMapper';

export function PersonalDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(mapPersonalDashboard({}));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const timeout = setTimeout(() => { if (mountedRef.current) setLoading(false); }, 5000);
    fetchDashboard().finally(() => { if (mountedRef.current) { clearTimeout(timeout); setLoading(false); } });
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, anomalyRes] = await Promise.all([
        api.get<any>('/dashboard/personal'),
        api.get('/ai/anomalies').catch(() => ({})),
      ]);
      if (!mountedRef.current) return;
      setData(mapPersonalDashboard(dashRes));
      const anoms = Array.isArray((anomalyRes as any)?.data) ? (anomalyRes as any).data : [];
      setAnomalies(anoms);
    } catch {
      if (mountedRef.current) setData(mapPersonalDashboard({}));
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    if (mountedRef.current) setRefreshing(false);
  }, [fetchDashboard]);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  const visibleAnomalies = anomalies.filter(a => {
    const id = a.id || a.title || '';
    return a.severity !== 'low' && !dismissedAnomalies.has(id);
  });

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      {visibleAnomalies.slice(0, 1).map((a: any, i: number) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.status.error + '15', borderWidth: 1, borderColor: colors.status.error + '25' }}>
          <AntDesign name="warning" size={16} color={colors.status.error} style={{ marginRight: 8 }} />
          <Text style={{ flex: 1, fontSize: 12, color: colors.status.error, fontWeight: '600' }} numberOfLines={1}>{a.title || a.message || 'Anomaly detected'}</Text>
          <TouchableOpacity onPress={() => { const id = a.id || a.title || ''; setDismissedAnomalies(prev => new Set(prev).add(id)); }}>
            <AntDesign name="close" size={14} color={colors.status.error} />
          </TouchableOpacity>
        </View>
      ))}
      <DashboardGrid
        data={data || {}}
        mode="personal"
        refreshing={refreshing}
        onRefresh={onRefresh}
        onWidgetPress={(type) => {
          if (type === 'goals') navigation?.navigate('GoalsList');
          else if (type === 'upcomingBills') navigation?.navigate('BillsList');
          else if (type === 'recentTransactions') navigation?.navigate('Transactions');
          else if (type === 'budgetsOverview') navigation?.navigate('Budgets');
        }}
        onNavigate={(screen, params) => navigation?.navigate(screen, params)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
