import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { DashboardGrid } from '../../components/dashboard/DashboardGrid';
import { mapPersonalDashboard } from '../../utils/dashboardMapper';

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function PersonalDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedCards, setFeedCards] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false));
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, feedRes, anomalyRes] = await Promise.all([
        api.get<any>('/dashboard/personal'),
        api.get('/ai/today-feed').catch(() => ({data: []})),
        api.get('/ai/anomalies').catch(() => ({data: []})),
      ]);
      setData(mapPersonalDashboard(dashRes));
      const feed = (feedRes as any)?.data || feedRes;
      setFeedCards(Array.isArray(feed?.cards) ? feed.cards : Array.isArray(feed) ? feed : []);
      const anoms = Array.isArray((anomalyRes as any)?.data) ? (anomalyRes as any).data : [];
      setAnomalies(anoms);
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

  const visibleAnomalies = anomalies.filter(a => {
    const id = a.id || a.title || '';
    return a.severity !== 'low' && !dismissedAnomalies.has(id);
  });

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      {visibleAnomalies.slice(0, 1).map((a: any, i: number) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.status.error + '15', borderWidth: 1, borderColor: colors.status.error + '25' }}>
          <AntDesign name="warning" size={16} color={colors.status.error} style={{ marginRight: 8 }} />
          <Text style={{ flex: 1, fontSize: 12, color: colors.status.error, fontWeight: '600' }} numberOfLines={1}>
            {a.title || a.message || 'Anomaly detected'}
          </Text>
          <TouchableOpacity onPress={() => {
            const id = a.id || a.title || '';
            setDismissedAnomalies(prev => new Set(prev).add(id));
          }}>
            <AntDesign name="close" size={14} color={colors.status.error} />
          </TouchableOpacity>
        </View>
      ))}
      {feedCards.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 72 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 6 }}
        >
          {feedCards.slice(0, 5).map((card: any, i: number) => (
            <TouchableOpacity
              key={i}
              style={[s.feedChip, { backgroundColor: card.type === 'warning' ? colors.status.error + '18' : colors.accent.primary + '15', borderColor: card.type === 'warning' ? colors.status.error + '30' : colors.accent.primary + '25' }]}
              onPress={() => navigation?.navigate('DabbuAI')}
            >
              <AntDesign name={card.type === 'warning' ? 'warning' : 'bulb1'} size={14} color={card.type === 'warning' ? colors.status.error : colors.accent.primary} />
              <Text style={[s.feedChipText, { color: card.type === 'warning' ? colors.status.error : colors.accent.primary }]} numberOfLines={1}>
                {card.title || card.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  feedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, maxWidth: 240,
  },
  feedChipText: { fontSize: 12, fontWeight: '600' },
});
