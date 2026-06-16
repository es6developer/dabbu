import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken, warmupBackend } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { PADDING, borderRadius, shadows, fabShadow } from '../../theme/design';
import { SkeletonList } from '../../components/ui/AnimatedSkeleton';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumEmptyState } from '../../components/ui/PremiumEmptyState';

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function getBarColor(pct: number) {
  if (pct > 90) {
    return '#FF4D4F';
  }
  if (pct > 70) {
    return '#F59E0B';
  }
  return '#34C759';
}

export function BudgetsListScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const loadBudgets = useCallback(
    async (refresh = false) => {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      warmupBackend().catch(() => {});
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const settleTimer = setTimeout(() => setLoading(false), 3000);
      try {
        const res = await api.get<any>('/budgets');
        setBudgets(Array.isArray(res) ? res : []);
      } catch (e) {
        /* empty */
      } finally {
        clearTimeout(settleTimer);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadBudgets();
    }, [loadBudgets]),
  );

  const totalBudget = budgets.reduce(
    (s: number, b: any) => s + Number(b.limit || b.amount || 0),
    0,
  );
  const totalSpent = budgets.reduce(
    (s: number, b: any) => s + Number(b.spent || b._sum?.amount || 0),
    0,
  );
  const overallPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  if (loading && budgets.length === 0) {
    return (
      <View style={[s.loading, { backgroundColor: colors.bg.primary, paddingHorizontal: PADDING }]}>
        <SkeletonList count={4} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: PADDING, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: colors.text.primary,
              letterSpacing: -0.5,
            }}
          >
            Budgets
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateBudget')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: `${colors.accent.primary}10`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add-outline" size={20} color={colors.accent.primary} />
          </TouchableOpacity>
        </View>
        {budgets.length > 0 && (
          <View
            style={{
              backgroundColor: colors.bg.card,
              borderRadius: borderRadius.lg,
              padding: 16,
              marginTop: 4,
              ...shadows.sm,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary }}>
                Overall Budget Health
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: getBarColor(overallPct) }}>
                {Math.round(overallPct)}% used
              </Text>
            </View>
            <View
              style={{
                height: 10,
                backgroundColor: colors.bg.tertiary,
                borderRadius: 5,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  borderRadius: 5,
                  width: `${overallPct}%`,
                  backgroundColor: getBarColor(overallPct),
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>
                {fmt(totalSpent)}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                of {fmt(totalBudget)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {budgets.length > 0 ? (
        <FlatList
          data={budgets}
          keyExtractor={(b) => b.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: PADDING, paddingTop: 8, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadBudgets(true)}
              tintColor={colors.accent.primary}
            />
          }
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false,
          })}
          renderItem={({ item }) => {
            const spent = Number(item.spent || item._sum?.amount || 0);
            const limit = Number(item.limit || item.amount || 0);
            const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            const barColor = getBarColor(pct);
            const remaining = Math.max(limit - spent, 0);
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('BudgetDetail', { budgetId: item.id })}
                style={{
                  backgroundColor: colors.bg.card,
                  borderRadius: borderRadius.lg,
                  padding: 18,
                  marginBottom: 10,
                  ...shadows.md,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                    {item.name || item.category?.name || 'Budget'}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: `${colors.accent.primary}10`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: colors.accent.primary,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.period || 'Monthly'}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    height: 12,
                    backgroundColor: colors.bg.tertiary,
                    borderRadius: 6,
                    overflow: 'hidden',
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      borderRadius: 6,
                      width: `${pct}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>
                      SPENT
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                      {fmt(spent)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>
                      REMAINING
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: remaining > 0 ? '#34C759' : '#FF4D4F',
                      }}
                    >
                      {fmt(remaining)}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: `${barColor}12`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: barColor }}>
                      {Math.round(pct)}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <PremiumEmptyState
          icon="wallet-outline"
          title="No budgets yet"
          message="Take control of your spending. Create a budget to track every category."
          action={
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateBudget')}
              style={{
                backgroundColor: colors.accent.primary,
                paddingVertical: 14,
                paddingHorizontal: 28,
                borderRadius: 14,
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                Create Budget
              </Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreateBudget')}
        style={[s.fab, { backgroundColor: colors.accent.primary }, fabShadow]}
      >
        <Ionicons name="add-outline" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: {
    position: 'absolute',
    right: PADDING,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
