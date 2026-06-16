import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { CircleCard } from '../../components/ui/CircleCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

const H_PADDING = 16;

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function CirclesListScreen() {
  const navigation = useNavigation<any>();
  const { accessToken, user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const cardAnims = useRef<Record<string, Animated.Value>>({});
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const res = await api.get<any>('/shared-finance/groups', ctrl.signal);
        if (ctrl.signal.aborted) {
          return;
        }
        const data = Array.isArray(res) ? res : res?.data || [];
        setGroups(data);
        data.forEach((g: any, i: number) => {
          if (!cardAnims.current[g.id]) {
            const v = new Animated.Value(0);
            cardAnims.current[g.id] = v;
            Animated.spring(v, {
              toValue: 1,
              tension: 50,
              friction: 11,
              delay: i * 60,
              useNativeDriver: true,
            }).start();
          }
        });
      } catch (e: any) {
        if (!ctrl.signal.aborted) {
          setGroups([]);
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => abortRef.current?.abort();
    }, [loadData]),
  );

  const totalOwed = useMemo(() => {
    let owed = 0,
      iOwe = 0;
    groups.forEach((g: any) => {
      const members = g.members || [];
      const total = (g.expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const share = members.length > 0 ? total / members.length : 0;
      members.forEach((m: any) => {
        if (m.userId === user?.id) {
          const balance = Number(m.balance || 0);
          if (balance > 0) {
            owed += balance;
          } else {
            iOwe += Math.abs(balance);
          }
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
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={210} borderRadius={20} />
          ))}
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
        windowSize={5}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={
          groups.length === 0 ? { flexGrow: 1 } : { paddingBottom: insets.bottom + 100 }
        }
        ListHeaderComponent={
          <View>
            <View style={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 20 }}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Circles</Text>
                  <Text style={[styles.headerSub, { color: colors.text.tertiary }]}>
                    {groups.length} circle{groups.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.bg.tertiary }]}
                  onPress={() => navigation.navigate('CreateCircle')}
                >
                  <AntDesign  name="plus" size={22} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {(totalOwed.owed > 0 || totalOwed.iOwe > 0) && (
              <View style={{ paddingHorizontal: H_PADDING, marginTop: -20 }}>
                <View style={[styles.summaryCard, { shadowColor: colors.accent.primary }]}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>You're owed</Text>
                      <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                        {fmt(totalOwed.owed)}
                      </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>You owe</Text>
                      <Text style={[styles.summaryValue, { color: '#FF4D4F' }]}>
                        {fmt(totalOwed.iOwe)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.summaryQuickActions}>
                    <TouchableOpacity
                      style={styles.settleBtn}
                      onPress={() => navigation.navigate('Settlement')}
                    >
                      <AntDesign  name="swap" size={12} color="#FFF" />
                      <Text style={[styles.settleBtnText, { color: colors.text.primary }]}>
                        Settle Up
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.splitBtn}
                      onPress={() => navigation.navigate('SplitExpense')}
                    >
                      <AntDesign  name="pluscircleo" size={12} color={colors.accent.primary} />
                      <Text style={[styles.splitBtnText, { color: colors.accent.primary }]}>
                        Split
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const anim = cardAnims.current[item.id] || new Animated.Value(1);
          return (
            <Animated.View
              style={{
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
                ],
                opacity: anim,
              }}
            >
              <CircleCard
                name={item.name}
                membersCount={item.members?.length || item._count?.members || 0}
                totalExpenses={(item.expenses || []).reduce(
                  (s: number, e: any) => s + Number(e.amount || 0),
                  0,
                )}
                yourBalance={item.members?.find((m: any) => m.userId === user?.id)?.balance || 0}
                type={item.type || 'default'}
                onPress={() =>
                  navigation.navigate('SharedGroupDetail', {
                    groupId: item.id,
                    groupName: item.name,
                  })
                }
              />
            </Animated.View>
          );
        }}
        ListFooterComponent={
          groups.length > 0 ? (
            <TouchableOpacity
              style={[
                styles.createCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
              onPress={() => navigation.navigate('CreateCircle')}
              activeOpacity={0.7}
            >
              <View style={styles.createCardIcon}>
                <AntDesign  name="plus" size={24} color="#FFF" />
              </View>
              <Text style={[styles.createCardText, { color: colors.text.primary }]}>
                Create New Circle
              </Text>
              <AntDesign  name="right" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: H_PADDING }}>
            <EmptyState
              icon="appstore1"
              title="No circles yet"
              message="Create a circle to split expenses with your people"
              actionLabel="Create Circle"
              onAction={() => navigation.navigate('CreateCircle')}
            />
          </View>
        }
      />
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { color: '#FFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500', marginTop: 2 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500' },
  summaryValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  summaryQuickActions: { flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'center' },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#34C759',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  settleBtnText: { fontSize: 12, fontWeight: '700' },
  splitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  splitBtnText: { fontSize: 12, fontWeight: '700' },
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  createCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCardText: { flex: 1, fontSize: 15, fontWeight: '700' },
});
