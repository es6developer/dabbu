import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { DashboardGrid } from '../../components/dashboard/DashboardGrid';
import { mapCoupleDashboard } from '../../utils/dashboardMapper';

export function CoupleDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false));
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get<any>('/dashboard/couple');
      setData(mapCoupleDashboard(res));
    } catch {
      setData({});
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <DashboardGrid
        data={data || {}}
        mode="couple"
        refreshing={refreshing}
        onRefresh={onRefresh}
        onWidgetPress={(type) => {
          if (type === 'coupleGoals') navigation?.navigate('CoupleGoals');
          else if (type === 'sharedExpenses') navigation?.navigate('SharedExpenses');
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
