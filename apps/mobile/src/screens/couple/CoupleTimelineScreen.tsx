import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const { width } = Dimensions.get('window');

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  expense_added: { icon: 'cart-outline', color: '#FF6B6B' },
  goal_contribution: { icon: 'trophy-outline', color: '#A78BFA' },
  goal_created: { icon: 'flag-outline', color: '#60A5FA' },
  milestone_reached: { icon: 'star', color: '#F59E0B' },
  income_added: { icon: 'trending-up-outline', color: '#34C759' },
  bill_paid: { icon: 'card-outline', color: '#FF8A65' },
  savings_contribution: { icon: 'save-outline', color: '#14B8A6' },
  planner_started: { icon: 'map-outline', color: '#8B5CF6' },
  planner_progress: { icon: 'refresh-outline', color: '#8B5CF6' },
  investment_added: { icon: 'trending-up', color: '#34C759' },
  debt_cleared: { icon: 'shield-checkmark-outline', color: '#10B981' },
};

function EventCard({ event }: { event: any }) {
  const cfg = EVENT_ICONS[event.eventType] || { icon: 'ellipsis-horizontal', color: '#64748B' };
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
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1E293B',
    }}>
      <View style={{
        width: 42, height: 42, borderRadius: 14,
        backgroundColor: `${cfg.color}18`,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>{event.title}</Text>
        {event.description && (
          <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{event.description}</Text>
        )}
        {amount ? (
          <Text style={{ fontSize: 15, fontWeight: '700', color: cfg.color, marginTop: 4 }}>{amount}</Text>
        ) : null}
        <Text style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{timeStr}</Text>
      </View>
    </View>
  );
}

export function CoupleTimelineScreen() {
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
    <View style={{ flex: 1, backgroundColor: '#0D0B1A' }}>
      <View style={{
        paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1E293B',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>Timeline</Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>Your financial story</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
            <Ionicons name="time-outline" size={48} color="#475569" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B', textAlign: 'center' }}>
              No activity yet
            </Text>
            <Text style={{ fontSize: 12, color: '#475569', textAlign: 'center' }}>
              Timeline will show expenses, goals, bills, and more as you use Couple Mode.
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color="#8B5CF6" style={{ padding: 16 }} /> : null
        }
      />
    </View>
  );
}
