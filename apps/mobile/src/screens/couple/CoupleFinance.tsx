import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Dimensions, Animated, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - 20 * 2 - CARD_GAP) / 2;

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function shortFmt(v: number) {
  if (v >= 10000000) return `\u20B9${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `\u20B9${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20B9${(v / 1000).toFixed(1)}K`;
  return `\u20B9${Math.round(v)}`;
}

function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.skeletonCard, { backgroundColor: colors.skeleton.base }]}>
      <View style={[styles.skelAccent, { backgroundColor: colors.skeleton.highlight }]} />
      <View style={styles.skelBody}>
        <View style={[styles.skelCircle, { backgroundColor: colors.skeleton.highlight }]} />
        <View style={[styles.skelLine, { width: '60%', backgroundColor: colors.skeleton.highlight }]} />
        <View style={[styles.skelLine, { width: '40%', backgroundColor: colors.skeleton.highlight }]} />
        <View style={[styles.skelLine, { width: '80%', backgroundColor: colors.skeleton.highlight }]} />
      </View>
    </View>
  );
}

function WidgetCard({
  icon,
  title,
  color,
  children,
  onPress,
  delay,
}: {
  icon: string;
  title: string;
  color: string;
  children: React.ReactNode;
  onPress?: () => void;
  delay: number;
}) {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: colors.bg.card,
            shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.08)',
            borderLeftColor: color,
          },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: `${color}18` },
          ]}
        >
          <AntDesign name={icon as any} size={18} color={color} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
          {title}
        </Text>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function CoupleFinance({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const COLORS = {
    expenses: colors.status.error,
    income: colors.status.success,
    settlement: '#F97316',
    contribution: colors.accent.secondary,
    whoPaid: '#14B8A6',
  };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const dashboard = await api.get<any>('/couple/dashboard');
      setData(dashboard);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard(true);
  }, [fetchDashboard]);

  const expenses = data?.sharedMonthlyExpenses ?? 0;
  const income = data?.sharedMonthlyIncome ?? 0;
  const recentExpenses: any[] = data?.recentExpenses ?? [];
  const recentIncomes: any[] = data?.recentIncomes ?? [];
  const sharedBalance = data?.sharedBalance?.amount ?? 0;
  const monthlySnapshot = data?.monthlySnapshot ?? {};
  const userSpent = monthlySnapshot?.userSpent ?? 0;
  const partnerSpent = monthlySnapshot?.partnerSpent ?? 0;
  const totalSpent = userSpent + partnerSpent || 1;
  const userName = data?.userName || 'You';
  const partnerName = data?.partnerName || 'Partner';

  const recentExpensesSlice = recentExpenses.slice(0, 3);
  const recentIncomesSlice = recentIncomes.slice(0, 3);

  const settlementAmount = (data?.sharedBalance?.owes ?? 0) > 0
    ? data.sharedBalance.amount
    : 0;
  const settlementLabel = data?.sharedBalance?.owes;
  const isYouOwe = settlementLabel === 'you';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 44,
          paddingTop: insets.top + 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* ── Header ──────────────────────────────── */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Money Hub
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CoupleSettings')}
            activeOpacity={0.7}
            style={[styles.settingsBtn, { backgroundColor: colors.bg.tertiary }]}
          >
            <AntDesign name="setting" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={{ color: colors.status.error, fontSize: 16 }}>{error}</Text>
          </View>
        ) : loading ? (
          <View style={styles.grid}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {/* 1. Shared Expenses */}
            <WidgetCard
              icon="shoppingcart"
              title="Shared Expenses"
              color={COLORS.expenses}
              delay={0}
              onPress={() => navigation.navigate('Expenses')}
            >
              <Text style={[styles.amountLabel, { color: COLORS.expenses }]}>
                {fmt(expenses)}
              </Text>
              {recentExpensesSlice.length > 0 ? (
                <View style={styles.cardList}>
                  {recentExpensesSlice.map((exp, i) => (
                    <View key={i} style={styles.cardListItem}>
                      <Text style={[styles.cardListItemText, { color: colors.text.secondary }]} numberOfLines={1}>
                        {exp.name ?? exp.category ?? 'Expense'}
                      </Text>
                      <Text style={[styles.cardListItemAmount, { color: colors.text.primary }]}>
                        {fmt(exp.amount ?? 0)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No expenses yet</Text>
              )}
            </WidgetCard>

            {/* 2. Shared Income */}
            <WidgetCard
              icon="linechart"
              title="Shared Income"
              color={COLORS.income}
              delay={100}
              onPress={() => navigation.navigate('Income')}
            >
              <Text style={[styles.amountLabel, { color: COLORS.income }]}>
                {fmt(income)}
              </Text>
              {recentIncomesSlice.length > 0 ? (
                <View style={styles.cardList}>
                  {recentIncomesSlice.map((inc, i) => (
                    <View key={i} style={styles.cardListItem}>
                      <Text style={[styles.cardListItemText, { color: colors.text.secondary }]} numberOfLines={1}>
                        {inc.name ?? inc.category ?? 'Income'}
                      </Text>
                      <Text style={[styles.cardListItemAmount, { color: colors.text.primary }]}>
                        {fmt(inc.amount ?? 0)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No income yet</Text>
              )}
            </WidgetCard>

            {/* 3. Settlement */}
            <WidgetCard
              icon="swap"
              title="Settlement"
              color={COLORS.settlement}
              delay={300}
              onPress={() => navigation.navigate('Settlements')}
            >
              {settlementAmount > 0 ? (
                <>
                  <Text style={[styles.amountLabel, { color: COLORS.settlement }]}>
                    {fmt(settlementAmount)}
                  </Text>
                  <Text style={[styles.owesText, { color: colors.text.secondary }]}>
                    {isYouOwe ? 'You owe' : 'Owes you'}
                  </Text>
                  <View style={[styles.settleBtn, { backgroundColor: `${COLORS.settlement}18` }]}>
                    <AntDesign name="wallet" size={12} color={COLORS.settlement} />
                    <Text style={[styles.settleBtnText, { color: COLORS.settlement }]}>Settle Up</Text>
                  </View>
                </>
              ) : (
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>All settled up</Text>
              )}
            </WidgetCard>

            {/* 5. Contribution Tracking */}
            <WidgetCard
              icon="piechart"
              title="Contributions"
              color={COLORS.contribution}
              delay={400}
              onPress={() => navigation.navigate('BudgetsList')}
            >
              <View style={styles.cardList}>
                <View style={styles.contributionRow}>
                  <Text style={[styles.contributionLabel, { color: colors.text.secondary }]} numberOfLines={1}>
                    {userName}
                  </Text>
                  <View style={[styles.progressTrack, { backgroundColor: colors.bg.tertiary }]}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.round((userSpent / totalSpent) * 100)}%`,
                          backgroundColor: COLORS.contribution,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.contributionPct, { color: colors.text.primary }]}>
                    {Math.round((userSpent / totalSpent) * 100)}%
                  </Text>
                </View>
                <View style={styles.contributionRow}>
                  <Text style={[styles.contributionLabel, { color: colors.text.secondary }]} numberOfLines={1}>
                    {partnerName}
                  </Text>
                  <View style={[styles.progressTrack, { backgroundColor: colors.bg.tertiary }]}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.round((partnerSpent / totalSpent) * 100)}%`,
                          backgroundColor: COLORS.contribution,
                          opacity: 0.5,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.contributionPct, { color: colors.text.primary }]}>
                    {Math.round((partnerSpent / totalSpent) * 100)}%
                  </Text>
                </View>
              </View>
            </WidgetCard>

            {/* 6. Who Paid What */}
            <WidgetCard
              icon="team"
              title="Who Paid What"
              color={COLORS.whoPaid}
              delay={500}
              onPress={() => navigation.navigate('BudgetsList')}
            >
              {recentExpensesSlice.length > 0 ? (
                <View style={styles.cardList}>
                  {recentExpensesSlice.map((exp, i) => (
                    <View key={i} style={styles.cardListItem}>
                      <View style={styles.payerRow}>
                        <View
                          style={[
                            styles.payerDot,
                            { backgroundColor: exp.paidBy === userName ? COLORS.whoPaid : `${COLORS.whoPaid}50` },
                          ]}
                        />
                        <Text style={[styles.cardListItemText, { color: colors.text.secondary }]} numberOfLines={1}>
                          {exp.paidBy ?? 'Someone'}
                        </Text>
                      </View>
                      <Text style={[styles.cardListItemAmount, { color: colors.text.primary }]}>
                        {fmt(exp.amount ?? 0)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No recent expenses</Text>
              )}
              <View style={[styles.pieIndicator, { backgroundColor: `${COLORS.whoPaid}18` }]}>
                <View style={[styles.pieDot, { backgroundColor: COLORS.whoPaid }]} />
                <Text style={[styles.pieLabel, { color: colors.text.secondary }]}>
                  {userName}: {fmt(userSpent)}
                </Text>
                <View style={[styles.pieDot, { backgroundColor: COLORS.whoPaid, opacity: 0.5 }]} />
                <Text style={[styles.pieLabel, { color: colors.text.secondary }]}>
                  {partnerName}: {fmt(partnerSpent)}
                </Text>
              </View>
            </WidgetCard>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 28,
    padding: 18,
    borderLeftWidth: 3.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  amountLabel: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardList: {
    gap: 4,
  },
  cardListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardListItemText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    marginRight: 4,
  },
  cardListItemAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  owesText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -4,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 24,
    marginTop: 4,
  },
  settleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contributionLabel: {
    fontSize: 10,
    fontWeight: '600',
    width: 48,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    borderRadius: 6,
  },
  contributionPct: {
    fontSize: 12,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  payerDot: {
    width: 6,
    height: 6,
    borderRadius: 6,
  },
  pieIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 24,
    marginTop: 4,
  },
  pieDot: {
    width: 6,
    height: 6,
    borderRadius: 6,
  },
  pieLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginRight: 6,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: 28,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  skelAccent: {
    width: 3.5,
    height: '100%',
  },
  skelBody: {
    flex: 1,
    padding: 18,
    gap: 10,
  },
  skelCircle: {
    width: 36,
    height: 36,
    borderRadius: 26,
  },
  skelLine: {
    height: 10,
    borderRadius: 10,
  },
});
