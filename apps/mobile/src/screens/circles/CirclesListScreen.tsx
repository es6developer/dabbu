import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Animated, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { CircleCard } from '../../components/ui/CircleCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { FloatingActionButton } from '../../components/ui/FloatingActionButton';

const H_PADDING = 16;

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function CirclesListScreen() {
  const navigation = useNavigation<any>();
  const { accessToken, user } = useAuth();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const cardAnims = useRef<Record<string, Animated.Value>>({});
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      const res = await api.get<any>('/shared-finance/groups', ctrl.signal);
      if (ctrl.signal.aborted) return;
      const data = Array.isArray(res) ? res : res?.data || [];
      setGroups(data);
      data.forEach((g: any, i: number) => {
        if (!cardAnims.current[g.id]) {
          const v = new Animated.Value(0);
          cardAnims.current[g.id] = v;
          Animated.spring(v, { toValue: 1, tension: 50, friction: 11, delay: i * 60, useNativeDriver: true }).start();
        }
      });
    } catch (e: any) {
      if (!ctrl.signal.aborted) setGroups([]);
    } finally {
      if (!ctrl.signal.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { loadData(); return () => abortRef.current?.abort(); }, [loadData]));

  const totalOwed = useMemo(() => {
    let owed = 0, iOwe = 0;
    groups.forEach((g: any) => {
      const members = g.members || [];
      const total = (g.expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const share = members.length > 0 ? total / members.length : 0;
      members.forEach((m: any) => {
        if (m.userId === user?.id) {
          const balance = Number(m.balance || 0);
          if (balance > 0) owed += balance;
          else iOwe += Math.abs(balance);
        }
      });
    });
    return { owed, iOwe };
  }, [groups, user?.id]);

  if (loading) {
    return (
      <BaseScreen noPadding>
        <View style={{ paddingHorizontal: H_PADDING, paddingTop: 8 }}>
          <Skeleton width={120} height={14} borderRadius={6} />
          <Skeleton width={180} height={28} style={{ marginTop: 4 }} borderRadius={6} />
        </View>
        <View style={{ margin: H_PADDING, marginTop: 16 }}>
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
        <View style={{ gap: 14, paddingHorizontal: H_PADDING, marginTop: 8 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={210} borderRadius={20} />)}
        </View>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen noPadding>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        windowSize={5} initialNumToRender={5} maxToRenderPerBatch={10}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#6C3EF4" />}
        contentContainerStyle={groups.length === 0 ? { flexGrow: 1 } : { paddingBottom: insets.bottom + 100 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: H_PADDING, paddingTop: 8 }}>
            <Text style={[typography.caption2, { color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }]}>
              Circles
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[typography.sectionHeader, { color: colors.text.primary, flex: 1 }]}>Your Circles</Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#6C3EF4' }]}
                onPress={() => navigation.navigate('CreateCircle')}
              >
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            {(totalOwed.owed > 0 || totalOwed.iOwe > 0) && (
              <LinearGradient
                colors={['#6C3EF415', '#8B5CF608']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.summaryCard, { borderColor: colors.border.subtle }]}
              >
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>You're owed</Text>
                    <Text style={[styles.summaryValue, { color: '#34C759' }]}>{fmt(totalOwed.owed)}</Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>You owe</Text>
                    <Text style={[styles.summaryValue, { color: '#FF4D4F' }]}>{fmt(totalOwed.iOwe)}</Text>
                  </View>
                </View>
              </LinearGradient>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <CircleCard
            name={item.name}
            membersCount={item.members?.length || item._count?.members || 0}
            totalExpenses={(item.expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0)}
            yourBalance={item.members?.find((m: any) => m.userId === user?.id)?.balance || 0}
            type={item.type || 'default'}
            onPress={() => navigation.navigate('SharedGroupDetail', { groupId: item.id, groupName: item.name })}
          />
        )}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: H_PADDING, paddingTop: 32 }}>
            <EmptyState
              icon="grid-outline"
              title="No circles yet"
              message="Create a circle to split expenses with your people"
              actionLabel="Create Circle"
              onAction={() => navigation.navigate('CreateCircle')}
            />
          </View>
        }
      />
      <FloatingActionButton onPress={() => navigation.navigate('CreateCircle')} icon="add" />
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 12, marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  summaryItem: {
    flex: 1, alignItems: 'center', gap: 4,
  },
  summaryLabel: {
    fontSize: 11, fontWeight: '500',
  },
  summaryValue: {
    fontSize: 20, fontWeight: '800', letterSpacing: -0.5,
  },
  summaryDivider: {
    width: 1, height: 36, marginHorizontal: 12,
  },
});
