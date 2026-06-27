import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { Avatar } from '../../components/ui/Avatar';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtShort(v: number) {
  if (!v) {
    return '\u20B90';
  }
  if (v >= 10000000) {
    return '\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  }
  if (v >= 100000) {
    return '\u20B9' + (v / 100000).toFixed(1) + 'L';
  }
  if (v >= 1000) {
    return '\u20B9' + (v / 1000).toFixed(1) + 'K';
  }
  return fmt(v);
}

function fmtDate(iso: string) {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function daysUntil(iso: string) {
  if (!iso) {
    return null;
  }
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return diff;
}

export function FamilyWorkspaceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<any>>();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);

  const routeFamilyId = route.params?.familyId as string | undefined;

  const loadDashboard = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        let familyId = routeFamilyId;
        if (!familyId) {
          const families: any[] = await api.get('/family');
          familyId = families?.[0]?.id;
        }
        if (!familyId) {
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const [wsRes, dashRes] = await Promise.allSettled([
          api.get(`/family/workspace/${familyId}`),
          api.get(`/family/dashboard?familyId=${familyId}`),
        ]);

        setData({
          workspace:
            wsRes.status === 'fulfilled' ? (wsRes.value as any)?.data || wsRes.value : null,
          dashboard:
            dashRes.status === 'fulfilled' ? (dashRes.value as any)?.data || dashRes.value : null,
        });
      } catch {
        /* silent */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [routeFamilyId],
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const handleQuickAction = (screen: string, params?: any) => {
    navigation.navigate(screen, params);
  };

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!data?.workspace) {
    return (
      <View style={[s.centered, { backgroundColor: colors.bg.primary, padding: 32, gap: 16 }]}>
        <View style={[s.bigCircle, { backgroundColor: colors.accent.primary + '15' }]}>
          <AntDesign name="team" size={36} color={colors.accent.primary} />
        </View>
        <Text style={[s.noWorkspaceTitle, { color: colors.text.primary }]}>No Workspace Yet</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateFamilyWorkspace')}
          style={[s.createBtn, { backgroundColor: colors.accent.primary }]}
        >
          <AntDesign name="plus" size={16} color={colors.text.inverse} />
          <Text style={[s.createBtnText, { color: colors.text.inverse }]}>Create Workspace</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { workspace, dashboard } = data;
  const dash = dashboard || {};
  const coverColor = workspace.coverColor || colors.accent.primary;
  const hero = dash.familyHero || {};
  const snapshot = dash.familySnapshot || {};
  const goals = dash.familyGoals || [];
  const bills = dash.familyBills || {};
  const health = dash.familyHealth || {};
  const insights = dash.familyInsights || [];
  const recentTransactions = dash.recentTransactions || [];
  const members = hero.members || [];
  const memberActivity = dash.memberActivity || {};
  const wealth = dash.familyWealth || {};
  const balance = (snapshot.income || 0) - (snapshot.expense || 0);
  const activeGoals = goals.filter((g: any) => g.status !== 'completed');
  const upcomingBills = (bills.upcoming || []).slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            tintColor={coverColor}
          />
        }
      >
        <LinearGradient
          colors={isDark ? ['#0A1A12', colors.bg.primary] : ['#D1FAE5', colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.5]}
        >
          <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <AntDesign name="arrowleft" size={18} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={[s.bigCircle, { backgroundColor: coverColor + '20' }]}>
                <AntDesign name={(workspace.icon || 'team') as any} size={32} color={coverColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>
                  {workspace.name}
                </Text>
                {workspace.description && (
                  <Text
                    style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 2 }}
                    numberOfLines={2}
                  >
                    {workspace.description}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  {members.slice(0, 5).map((m: any, i: number) => (
                    <View key={m.id} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                      <Avatar uri={m.avatarUrl} name={m.name} size={24} />
                    </View>
                  ))}
                  {members.length > 5 && (
                    <View style={[s.avatarOverflow, { backgroundColor: colors.bg.tertiary }]}>
                      <Text
                        style={{ fontSize: 10, fontWeight: '700', color: colors.text.secondary }}
                      >
                        +{members.length - 5}
                      </Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 12, color: colors.text.tertiary, marginLeft: 4 }}>
                    {hero.memberCount || members.length} member
                    {(hero.memberCount || members.length) !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <View style={[s.card, { backgroundColor: colors.bg.card }]}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={[s.label, { color: colors.text.tertiary }]}>Income</Text>
                <Text style={[s.value, { color: colors.status.success }]}>
                  {fmtShort(snapshot.income || 0)}
                </Text>
              </View>
              <View style={[s.vDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={[s.label, { color: colors.text.tertiary }]}>Expenses</Text>
                <Text style={[s.value, { color: colors.status.error }]}>
                  {fmtShort(snapshot.expense || 0)}
                </Text>
              </View>
              <View style={[s.vDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={[s.label, { color: colors.text.tertiary }]}>Balance</Text>
                <Text
                  style={[
                    s.value,
                    { color: balance >= 0 ? colors.status.success : colors.status.error },
                  ]}
                >
                  {fmtShort(balance)}
                </Text>
              </View>
            </View>
            {snapshot.budgetUtilization > 0 && (
              <View style={{ marginTop: 12, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                    Budget Utilization
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color:
                        snapshot.budgetUtilization > 80
                          ? colors.status.error
                          : colors.text.secondary,
                    }}
                  >
                    {snapshot.budgetUtilization}%
                  </Text>
                </View>
                <View style={[s.progressBg, { backgroundColor: colors.bg.tertiary }]}>
                  <View
                    style={[
                      s.progressFill,
                      {
                        width: `${Math.min(snapshot.budgetUtilization, 100)}%`,
                        backgroundColor:
                          snapshot.budgetUtilization > 80
                            ? colors.status.error
                            : colors.status.success,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <QuickActionCard
              label="Expense"
              icon="minuscircle"
              color="#DC2626"
              onPress={() => handleQuickAction('AddExpense', { type: 'expense' })}
              colors={colors}
            />
            <QuickActionCard
              label="Income"
              icon="pluscircle"
              color="#16A34A"
              onPress={() => handleQuickAction('AddExpense', { type: 'income' })}
              colors={colors}
            />
            <QuickActionCard
              label="Add Bill"
              icon="filetext1"
              color="#F59E0B"
              onPress={() => navigation.navigate('WalletTab', { screen: 'BillsList' })}
              colors={colors}
            />
            <QuickActionCard
              label="Family Goal"
              icon="flag"
              color="#3B82F6"
              onPress={() => handleQuickAction('GoalsList')}
              colors={colors}
            />
          </View>
        </View>

        {members.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
              Members
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {members.map((m: any) => {
                const act = memberActivity[m.id] || {};
                return (
                  <View key={m.id} style={[s.memberCard, { backgroundColor: colors.bg.card }]}>
                    <Avatar uri={m.avatarUrl} name={m.name} size={40} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: colors.text.primary,
                        marginTop: 4,
                      }}
                      numberOfLines={1}
                    >
                      {m.name}
                    </Text>
                    <View style={{ marginTop: 6, gap: 2 }}>
                      <Text style={{ fontSize: 10, color: colors.status.success }}>
                        +{fmtShort(act.income || 0)}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.status.error }}>
                        -{fmtShort(act.expense || 0)}
                      </Text>
                    </View>
                    <View style={[s.memberRole, { backgroundColor: coverColor + '15' }]}>
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: '700',
                          color: coverColor,
                          textTransform: 'capitalize',
                        }}
                      >
                        {m.role || 'member'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {activeGoals.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Goals
              </Text>
              <TouchableOpacity onPress={() => handleQuickAction('GoalsList')}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent.primary }}>
                  See all
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              {activeGoals.slice(0, 3).map((g: any) => (
                <View key={g.id} style={[s.card, { backgroundColor: colors.bg.card }]}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                      numberOfLines={1}
                    >
                      {g.name}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.secondary }}>
                      {g.progress}%
                    </Text>
                  </View>
                  <View
                    style={[s.progressBg, { backgroundColor: colors.bg.tertiary, marginTop: 6 }]}
                  >
                    <View
                      style={[
                        s.progressFill,
                        {
                          width: `${Math.min(g.progress, 100)}%`,
                          backgroundColor:
                            g.progress >= 80 ? colors.status.success : colors.accent.primary,
                        },
                      ]}
                    />
                  </View>
                  <View
                    style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}
                  >
                    <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                      {fmtShort(g.savedAmount)} / {fmtShort(g.targetAmount)}
                    </Text>
                    {g.deadline && (
                      <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                        {daysUntil(g.deadline) !== null && daysUntil(g.deadline)! > 0
                          ? `${daysUntil(g.deadline)}d left`
                          : 'Overdue'}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {upcomingBills.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
              Upcoming Bills
            </Text>
            <View style={{ gap: 8 }}>
              {upcomingBills.map((b: any) => {
                const due = daysUntil(b.dueDate);
                const isUrgent = due !== null && due <= 3;
                return (
                  <View
                    key={b.id}
                    style={[
                      s.card,
                      {
                        backgroundColor: colors.bg.card,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.txnIcon,
                        {
                          backgroundColor:
                            (isUrgent ? colors.status.error : colors.status.warning) + '15',
                        },
                      ]}
                    >
                      <AntDesign
                        name="filetext1"
                        size={16}
                        color={isUrgent ? colors.status.error : colors.status.warning}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                        numberOfLines={1}
                      >
                        {b.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                        {due !== null ? (due <= 0 ? 'Overdue' : `${due} days left`) : 'No due date'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.status.error }}>
                      {fmtShort(b.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
            Recent Transactions
          </Text>
          {recentTransactions.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', gap: 8 }}>
              <AntDesign name="wallet" size={36} color={colors.text.tertiary} />
              <Text style={{ fontSize: 14, color: colors.text.tertiary }}>No transactions yet</Text>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
                Add an expense or income above
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {recentTransactions.slice(0, 10).map((txn: any) => (
                <View key={txn.id} style={[s.txnRow, { backgroundColor: colors.bg.card }]}>
                  <View
                    style={[
                      s.txnIcon,
                      {
                        backgroundColor:
                          (txn.type === 'income' ? colors.status.success : colors.status.error) +
                          '15',
                      },
                    ]}
                  >
                    <AntDesign
                      name={txn.type === 'income' ? 'arrowup' : 'arrowdown'}
                      size={16}
                      color={txn.type === 'income' ? colors.status.success : colors.status.error}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                      numberOfLines={1}
                    >
                      {txn.description ||
                        txn.category ||
                        (txn.type === 'income' ? 'Income' : 'Expense')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {txn.userName && (
                        <Text style={{ fontSize: 10, color: colors.accent.primary }}>
                          {txn.userName}
                        </Text>
                      )}
                      <Text style={{ fontSize: 10, color: colors.text.tertiary }}>
                        {txn.category} · {fmtDate(txn.date)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: txn.type === 'income' ? colors.status.success : colors.status.error,
                    }}
                  >
                    {txn.type === 'income' ? '+' : '-'}
                    {fmtShort(Number(txn.amount))}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {health.overallScore > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
              Financial Health
            </Text>
            <View
              style={[
                s.card,
                {
                  backgroundColor: colors.bg.card,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                },
              ]}
            >
              <View
                style={[
                  s.healthRing,
                  {
                    borderColor:
                      health.overallScore >= 70
                        ? colors.status.success
                        : health.overallScore >= 40
                          ? colors.status.warning
                          : colors.status.error,
                  },
                ]}
              >
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                  {health.overallScore}
                </Text>
                <Text style={{ fontSize: 9, color: colors.text.tertiary }}>/100</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Savings</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.secondary }}>
                    {health.categoryScores?.savings || 0}%
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Debt</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.secondary }}>
                    {health.categoryScores?.debt || 0}%
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Goals</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.secondary }}>
                    {health.categoryScores?.goals || 0}%
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Emergency Fund</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.secondary }}>
                    {health.categoryScores?.emergencyFund || 0}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {insights.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
              Insights
            </Text>
            <View style={{ gap: 8 }}>
              {insights.slice(0, 3).map((insight: string, i: number) => (
                <View
                  key={i}
                  style={[
                    s.insightCard,
                    {
                      backgroundColor: colors.accent.primary + '08',
                      borderColor: colors.accent.primary + '20',
                    },
                  ]}
                >
                  <AntDesign name="bulb1" size={14} color={colors.accent.primary} />
                  <Text
                    style={{ flex: 1, fontSize: 12, color: colors.text.secondary, lineHeight: 18 }}
                  >
                    {insight}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {wealth.netWorth > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 6 }}>
            <Text style={{ fontSize: 11, color: colors.text.tertiary, textAlign: 'center' }}>
              Combined Net Worth · {fmtShort(wealth.netWorth)}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function QuickActionCard({ label, icon, color, onPress, colors }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.actionCard, { backgroundColor: colors.bg.card }]}
      activeOpacity={0.7}
    >
      <View style={[s.actionIcon, { backgroundColor: color + '15' }]}>
        <AntDesign name={icon as any} size={20} color={color} />
      </View>
      <Text style={[s.actionLabel, { color: colors.text.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bigCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noWorkspaceTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  createBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  createBtnText: { fontSize: 15, fontWeight: '700' },
  card: { borderRadius: 16, padding: 16 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 18, fontWeight: '800' },
  vDivider: { width: 1, height: 36, marginHorizontal: 4 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  actionCard: {
    width: (width - 50) / 2,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14 },
  txnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCard: { width: 110, borderRadius: 16, padding: 12, alignItems: 'center' },
  memberRole: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  avatarOverflow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
