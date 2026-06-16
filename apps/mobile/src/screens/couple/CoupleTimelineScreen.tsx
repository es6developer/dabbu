import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const { width } = Dimensions.get('window');

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  expense_added: { icon: 'shoppingcart', color: '#FF6B6B' },
  goal_contribution: { icon: 'flag', color: '#A78BFA' },
  goal_created: { icon: 'flag', color: '#60A5FA' },
  milestone_reached: { icon: 'star', color: '#F59E0B' },
  income_added: { icon: 'linechart', color: '#34C759' },
  bill_paid: { icon: 'creditcard', color: '#FF8A65' },
  savings_contribution: { icon: 'save', color: '#14B8A6' },
  planner_started: { icon: 'find', color: '#8B5CF6' },
  planner_progress: { icon: 'reload1', color: '#8B5CF6' },
  investment_added: { icon: 'linechart', color: '#34C759' },
  debt_cleared: { icon: 'checkcircle', color: '#10B981' },
};

function EventCard({ event }: { event: any }) {
  const { colors } = useTheme();
  const cfg = EVENT_ICONS[event.eventType] || { icon: 'ellipsis1', color: '#64748B' };
  const date = new Date(event.createdAt);
  const timeStr = date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  const amount = event.amount
    ? `\u20B9${Number(event.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : '';

  return (
    <View style={{
      flexDirection: 'row', gap: 14, paddingVertical: 14, paddingHorizontal: 20,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.default,
    }}>
      <View style={{
        width: 42, height: 42, borderRadius: 14,
        backgroundColor: `${cfg.color}18`,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <AntDesign name={cfg.icon as any} size={20} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>{event.title}</Text>
        {event.description && (
          <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>{event.description}</Text>
        )}
        {amount ? (
          <Text style={{ fontSize: 15, fontWeight: '700', color: cfg.color, marginTop: 4 }}>{amount}</Text>
        ) : null}
        <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 4 }}>{timeStr}</Text>
      </View>
    </View>
  );
}

export function CoupleTimelineScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTimeline = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1 && !append) setLoading(true);
    try {
      const res = await api.get<any>(`/couple/timeline?page=${pageNum}&limit=20`);
      const newEvents = res?.events || [];
      setEvents(prev => append ? [...prev, ...newEvents] : newEvents);
      setHasMore(newEvents.length === 20);
      setPage(pageNum);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTimeline(1);
  }, [fetchTimeline]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchTimeline(page + 1, true);
  }, [hasMore, loadingMore, page, fetchTimeline]);

  if (loading) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{
        paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.default,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AntDesign  name="left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>Timeline</Text>
            <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Your financial story</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
            <AntDesign  name="clockcircleo" size={48} color={colors.text.tertiary} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.tertiary, textAlign: 'center' }}>
              No activity yet
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.tertiary, textAlign: 'center' }}>
              Timeline will show expenses, goals, bills, and more as you use Couple Mode.
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color={colors.accent.primary} style={{ padding: 16 }} /> : null
        }
      />
    </View>
  );
}
