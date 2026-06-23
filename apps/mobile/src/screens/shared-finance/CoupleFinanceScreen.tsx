import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useLensChange } from '../../hooks/useLensChange';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { AntDesign } from '@expo/vector-icons';
import { Avatar } from '../../components/ui/Avatar';
import { useTheme, palette } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

import { alertService } from '../../components/ui';
const { width } = Dimensions.get('window');

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) {
    return 'Today';
  }
  if (diff === 1) {
    return 'Yesterday';
  }
  if (diff < 7) {
    return `${diff}d ago`;
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getCategoryIcon(cat: string): { icon: string; color: string } {
  const map: Record<string, { icon: string; color: string }> = {
    Food: { icon: 'rest', color: '#FF6B6B' },
    Groceries: { icon: 'shoppingcart', color: '#34C759' },
    Travel: { icon: 'earth', color: '#60A5FA' },
    Rent: { icon: 'home', color: '#FB923C' },
    Bills: { icon: 'filetext1', color: '#F59E0B' },
    Shopping: { icon: 'shoppingcart', color: '#F472B6' },
    Entertainment: { icon: 'play', color: '#14B8A6' },
    Medical: { icon: 'heart', color: '#FF4D4F' },
    salary: { icon: 'solution1', color: '#34C759' },
    income: { icon: 'linechart', color: '#34C759' },
  };
  return map[cat] || { icon: 'minuscircleo', color: '#9CA3AF' };
}

export function CoupleFinanceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();

  const groupId = route.params?.groupId;
  const groupName = route.params?.groupName || 'Couple Finance';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleInviteByPhone = useCallback(async () => {
    const digits = partnerPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      alertService.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    if (!groupId) {
      return;
    }
    setInviteLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post(`/shared-finance/groups/${groupId}/members/add-by-phone`, {
        phone: digits,
      });
      setPartnerPhone('');
      alertService.alert('Invite Sent', 'Your partner has been added to the couple space.');
      loadData(true);
    } catch (e: any) {
      alertService.alert(
        'Error',
        e?.message || 'Failed to add partner. They may need to sign up first.',
      );
    } finally {
      setInviteLoading(false);
    }
  }, [partnerPhone, groupId, accessToken]);

  const loadData = useCallback(
    async (silent = false, refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        if (!groupId) {
          setData(null);
          return;
        }
        const [dashboard, incomesData, expenseList] = await Promise.all([
          api.get<any>(`/shared-finance/groups/${groupId}/couple/dashboard`),
          api
            .get<any>(`/shared-finance/groups/${groupId}/couple/incomes`)
            .catch(() => ({ incomes: [], summary: { totalMonthly: 0 } })),
          api.get<any[]>(`/shared-finance/groups/${groupId}/expenses`).catch(() => []),
        ]);
        setData({
          ...(dashboard || {}),
          incomes: incomesData?.incomes || [],
          incomeSummary: incomesData?.summary || {
            totalMonthly: 0,
            partner1Total: 0,
            partner2Total: 0,
          },
          expenses: Array.isArray(expenseList) ? expenseList : [],
          group: dashboard?.group || {},
        });
      } catch (e: any) {
        if (e.message !== 'Session expired. Please login again.') {
          setError(e.message || 'Unable to load');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, groupId],
  );

  useSilentRefresh(
    useCallback(
      (isInitial) => {
        loadData(!isInitial);
      },
      [loadData],
    ),
  );

  useLensChange(
    useCallback(() => {
      loadData(true);
    }, [loadData]),
  );

  const profile = data?.profile;
  const partner1 = profile?.partner1;
  const partner2 = profile?.partner2;
  const partner1Name = partner1?.firstName || partner1?.email || 'You';
  const partner2Name = partner2?.firstName || partner2?.email || 'Partner';
  const ratio = profile?.splitRatio || '50:50';

  const expenses = data?.expenses || [];
  const incomes = data?.incomes || [];

  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const thisMonthExpenses = expenses
    .filter((e: any) => {
      const d = new Date(e.date || e.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const totalIncome = incomes.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

  const partner1Paid = expenses
    .filter((e: any) => e.paidBy === partner1?.id)
    .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const partner2Paid = expenses
    .filter((e: any) => e.paidBy === partner2?.id)
    .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const totalPaid = partner1Paid + partner2Paid;
  const p1Pct = totalPaid > 0 ? Math.round((partner1Paid / totalPaid) * 100) : 0;
  const p2Pct = totalPaid > 0 ? Math.round((partner2Paid / totalPaid) * 100) : 0;

  const allActivity = [
    ...expenses.map((e: any) => ({ ...e, _type: 'wallet' as const })),
    ...incomes.map((i: any) => ({
      ...i,
      _type: 'arrowdown' as const,
      description: i.source || 'Income',
      paidBy: i.createdBy,
    })),
  ].sort(
    (a: any, b: any) =>
      new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime(),
  );

  const monthlySpent = data?.sharedBudget?.spent || thisMonthExpenses;
  const insights = data?.insights || [];
  const goals = data?.goals || [];
  const savingsProgress = data?.savingsProgress;
  const savingsGoal = savingsProgress?.goal || 0;
  const savingsSaved = savingsProgress?.saved || 0;
  const savingsPct = savingsProgress?.percentage || 0;
  const monthlyOverview = data?.monthlyOverview;

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ padding: 24, paddingTop: insets.top + 8, gap: 16 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width="100%" height={160} borderRadius={24} />
          <Skeleton width="100%" height={90} borderRadius={18} />
          <Skeleton width="100%" height={90} borderRadius={18} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <ScrollView
        style={[s.screen, { backgroundColor: colors.bg.primary }]}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}
      >
        <View style={{ flexDirection: 'row', paddingHorizontal: 20 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[s.backBtn, { backgroundColor: colors.bg.glassLight }]}
          >
            <AntDesign name="left" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={[s.heroEmpty, { backgroundColor: colors.bg.secondary }]}>
          <View style={s.heartIconWrap}>
            <AntDesign name="heart" size={64} color={colors.accent.primary} />
          </View>
          <Text style={[s.heroTitle, { color: colors.text.primary }]}>
            Connect with your Partner
          </Text>
          <Text style={[s.heroSub, { color: colors.text.secondary }]}>
            Add your partner by phone number to start sharing finances
          </Text>
          <View
            style={[
              s.phoneRow,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <TextInput
              style={[s.phoneInput, { color: colors.text.primary }]}
              placeholder="Phone number"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="phone-pad"
              maxLength={10}
              value={partnerPhone}
              onChangeText={(t) => setPartnerPhone(t.replace(/\D/g, ''))}
            />
          </View>
          <TouchableOpacity
            style={[s.inviteBtn, { opacity: inviteLoading ? 0.6 : 1 }]}
            onPress={handleInviteByPhone}
            disabled={inviteLoading}
            activeOpacity={0.8}
          >
            {inviteLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <AntDesign name="adduser" size={18} color="#FFF" />
                <Text style={s.inviteBtnText}>Connect Partner</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(false, true)}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 28,
            paddingHorizontal: 20,
            backgroundColor: '#14B8A6',
          }}
        >
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
              <AntDesign name="arrowleft" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Couple Finance</Text>
            <TouchableOpacity
              style={s.headerBtn}
              onPress={() => navigation.navigate('DabbuAI', { groupId, groupName })}
            >
              <AntDesign name="star" size={20} color="#FFD700" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerBtn}
              onPress={() => navigation.navigate('CoupleReports', { groupId })}
            >
              <AntDesign name="barschart" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={s.partnerHero}>
            <View style={s.avatarRow}>
              <Avatar
                uri={partner1?.avatarUrl}
                name={`${partner1?.firstName || ''} ${partner1?.lastName || ''}`.trim()}
                size={46}
              />
              <View style={[s.heartBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <AntDesign name="hearto" size={16} color="#FFEBB4" />
              </View>
              <Avatar
                uri={partner2?.avatarUrl}
                name={`${partner2?.firstName || ''} ${partner2?.lastName || ''}`.trim()}
                size={46}
              />
            </View>
            <Text style={s.partnerNames}>
              {partner1Name} & {partner2Name}
            </Text>
            <Text style={s.partnerRatio}>Split Ratio: {ratio}</Text>
          </View>
        </View>

        <View style={s.tabRow}>
          {['overview', 'activity'].map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab as any)}
                style={[
                  s.tabBtn,
                  active && { borderBottomWidth: 2, borderBottomColor: colors.accent.primary },
                ]}
              >
                <Text
                  style={[
                    s.tabText,
                    { color: active ? colors.accent.primary : colors.text.tertiary },
                  ]}
                >
                  {tab === 'overview' ? 'Overview' : 'Activity'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'overview' ? (
          <View style={{ paddingHorizontal: 20, gap: 14, paddingTop: 8 }}>
            <View style={s.heroFinanceCard}>
              <View style={s.heroFinanceTop}>
                <Text style={s.heroFinanceLabel}>Total Income</Text>
                <Text style={s.heroFinanceLabel}>Total Expenses</Text>
              </View>
              <View style={s.heroFinanceRow}>
                <Text style={s.heroFinanceAmount}>{fmt(totalIncome)}</Text>
                <Text style={s.heroFinanceAmount}>{fmt(totalExpenses)}</Text>
              </View>
              <View
                style={[
                  s.netRow,
                  {
                    backgroundColor:
                      totalIncome >= totalExpenses
                        ? 'rgba(52,199,89,0.15)'
                        : 'rgba(255,77,79,0.15)',
                  },
                ]}
              >
                <AntDesign
                  name={(totalIncome >= totalExpenses ? 'caretup' : 'caretdown') as any}
                  size={14}
                  color={totalIncome >= totalExpenses ? '#34C759' : '#FF4D4F'}
                />
                <Text
                  style={[
                    s.netText,
                    { color: totalIncome >= totalExpenses ? '#34C759' : '#FF4D4F' },
                  ]}
                >
                  Net {totalIncome >= totalExpenses ? 'Surplus' : 'Deficit'}:{' '}
                  {fmt(Math.abs(totalIncome - totalExpenses))}
                </Text>
              </View>
            </View>

            <View style={[s.card, { backgroundColor: colors.bg.card }]}>
              <Text style={[s.cardTitle, { color: colors.text.primary }]}>Spending by Partner</Text>
              <View style={{ gap: 14, marginTop: 10 }}>
                <View>
                  <View style={s.barLabelRow}>
                    <View style={s.barLabelLeft}>
                      <View style={[s.barDot, { backgroundColor: colors.accent.primary }]} />
                      <Text style={[s.barName, { color: colors.text.primary }]}>
                        {partner1Name}
                      </Text>
                    </View>
                    <Text style={[s.barAmount, { color: colors.text.primary }]}>
                      {fmt(partner1Paid)}
                    </Text>
                  </View>
                  <View style={[s.barOuter, { backgroundColor: colors.bg.tertiary }]}>
                    <View
                      style={[
                        s.barFill,
                        { width: `${p1Pct}%`, backgroundColor: colors.accent.primary },
                      ]}
                    />
                  </View>
                  <Text style={[s.barPct, { color: colors.text.tertiary }]}>{p1Pct}% of total</Text>
                </View>
                <View>
                  <View style={s.barLabelRow}>
                    <View style={s.barLabelLeft}>
                      <View style={[s.barDot, { backgroundColor: colors.accent.primary }]} />
                      <Text style={[s.barName, { color: colors.text.primary }]}>
                        {partner2Name}
                      </Text>
                    </View>
                    <Text style={[s.barAmount, { color: colors.text.primary }]}>
                      {fmt(partner2Paid)}
                    </Text>
                  </View>
                  <View style={[s.barOuter, { backgroundColor: colors.bg.tertiary }]}>
                    <View
                      style={[
                        s.barFill,
                        { width: `${p2Pct}%`, backgroundColor: colors.accent.primary },
                      ]}
                    />
                  </View>
                  <Text style={[s.barPct, { color: colors.text.tertiary }]}>{p2Pct}% of total</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[s.statCard, { backgroundColor: colors.bg.card, flex: 1 }]}>
                <View style={[s.statIconWrap, { backgroundColor: `${colors.accent.primary}18` }]}>
                  <AntDesign name="wallet" size={18} color={colors.accent.primary} />
                </View>
                <Text style={[s.statValue, { color: colors.text.primary }]}>
                  {fmt(monthlySpent)}
                </Text>
                <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Monthly Spend</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: colors.bg.card, flex: 1 }]}>
                <View style={[s.statIconWrap, { backgroundColor: '#34C75918' }]}>
                  <AntDesign name="save" size={18} color="#34C759" />
                </View>
                <Text style={[s.statValue, { color: colors.text.primary }]}>
                  {fmt(savingsSaved)}
                </Text>
                <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Savings</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: colors.bg.card, flex: 1 }]}>
                <View style={[s.statIconWrap, { backgroundColor: '#F59E0B18' }]}>
                  <AntDesign name="calendar" size={18} color="#F59E0B" />
                </View>
                <Text style={[s.statValue, { color: colors.text.primary }]}>
                  {totalExpenses > 0 ? expenses.length : 0}
                </Text>
                <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Transactions</Text>
              </View>
            </View>

            {totalIncome > 0 && totalExpenses > 0 && (
              <View style={[s.card, { backgroundColor: colors.bg.card }]}>
                <Text style={[s.cardTitle, { color: colors.text.primary }]}>
                  Income vs Expenses
                </Text>
                <View style={{ marginTop: 10, gap: 10 }}>
                  <View>
                    <View style={s.vsLabelRow}>
                      <Text style={[s.vsLabel, { color: colors.text.tertiary }]}>Income</Text>
                      <Text style={[s.vsAmount, { color: '#34C759' }]}>{fmt(totalIncome)}</Text>
                    </View>
                    <View style={[s.vsBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                      <View
                        style={[
                          s.vsBarFill,
                          {
                            width: `${Math.min((totalIncome / Math.max(totalIncome, totalExpenses)) * 100, 100)}%`,
                            backgroundColor: '#34C759',
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View>
                    <View style={s.vsLabelRow}>
                      <Text style={[s.vsLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                      <Text style={[s.vsAmount, { color: '#FF4D4F' }]}>{fmt(totalExpenses)}</Text>
                    </View>
                    <View style={[s.vsBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                      <View
                        style={[
                          s.vsBarFill,
                          {
                            width: `${Math.min((totalExpenses / Math.max(totalIncome, totalExpenses)) * 100, 100)}%`,
                            backgroundColor: '#FF4D4F',
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

            {monthlyOverview && (
              <View style={[s.card, { backgroundColor: colors.bg.card }]}>
                <View style={s.cardHeader}>
                  <Text style={[s.cardTitle, { color: colors.text.primary }]}>
                    Monthly Comparison
                  </Text>
                  <AntDesign name="linechart" size={18} color={colors.text.tertiary} />
                </View>
                <View style={{ marginTop: 8, gap: 6 }}>
                  <View style={s.compRow}>
                    <Text style={[s.compLabel, { color: colors.text.tertiary }]}>This Month</Text>
                    <Text style={[s.compValue, { color: colors.text.primary }]}>
                      {fmt(monthlyOverview.currentMonthTotal || 0)}
                    </Text>
                  </View>
                  <View style={s.compRow}>
                    <Text style={[s.compLabel, { color: colors.text.tertiary }]}>Last Month</Text>
                    <Text style={[s.compValue, { color: colors.text.primary }]}>
                      {fmt(monthlyOverview.lastMonthTotal || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {insights.length > 0 && (
              <View style={{ gap: 8 }}>
                {insights.map((insight: string, i: number) => {
                  const isPositive =
                    insight.includes('less') ||
                    insight.includes('Great') ||
                    insight.includes('on track') ||
                    insight.includes('decreased');
                  return (
                    <View
                      key={i}
                      style={[
                        s.insightCard,
                        { backgroundColor: isPositive ? '#34C75912' : '#F59E0B12' },
                      ]}
                    >
                      <AntDesign
                        name={isPositive ? 'bulb1' : 'linechart'}
                        size={16}
                        color={isPositive ? '#34C759' : '#F59E0B'}
                      />
                      <Text style={[s.insightText, { color: colors.text.primary }]}>{insight}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {goals.length > 0 && (
              <View style={[s.card, { backgroundColor: colors.bg.card }]}>
                <Text style={[s.cardTitle, { color: colors.text.primary }]}>Shared Goals</Text>
                {goals.slice(0, 3).map((goal: any, i: number) => (
                  <View key={goal.id || i} style={{ marginTop: 12 }}>
                    <View style={s.goalTopRow}>
                      <AntDesign name="flag" size={16} color={colors.accent.primary} />
                      <Text
                        style={[s.goalName, { color: colors.text.primary, marginLeft: 8, flex: 1 }]}
                      >
                        {goal.name}
                      </Text>
                      <Text style={[s.goalPct, { color: colors.text.tertiary }]}>
                        {goal.progress}%
                      </Text>
                    </View>
                    <View
                      style={[s.progressBar, { backgroundColor: colors.bg.tertiary, marginTop: 6 }]}
                    >
                      <View
                        style={[s.progressFill, { width: `${Math.min(goal.progress, 100)}%` }]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 10, paddingTop: 8 }}>
            {allActivity.length === 0 ? (
              <View style={s.emptyWrap}>
                <AntDesign name="clockcircleo" size={48} color={colors.text.tertiary} />
                <Text style={[s.emptyTitle, { color: colors.text.secondary }]}>
                  No activity yet
                </Text>
                <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
                  Add an expense or income to get started
                </Text>
              </View>
            ) : (
              allActivity.slice(0, 30).map((item: any, i: number) => {
                const cat = getCategoryIcon(item.category || item.type || 'other');
                const isExpense = item._type === 'wallet';
                const isIncome = item._type === 'arrowdown';
                const actorName =
                  item.paidBy === partner1?.id
                    ? partner1Name
                    : item.paidBy === partner2?.id
                      ? partner2Name
                      : 'You';
                return (
                  <TouchableOpacity
                    key={item.id || i}
                    activeOpacity={0.7}
                    style={[s.activityRow, { backgroundColor: colors.bg.card }]}
                    onPress={() => {
                      if (isExpense) {
                        navigation.navigate('TransactionDetail', {
                          transactionId: item.id,
                          groupId,
                        });
                      }
                    }}
                  >
                    <View style={s.activityIcon}>
                      <AntDesign
                        name={isIncome ? 'caretup' : (cat.icon as any)}
                        size={18}
                        color="#FFF"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[s.activityDesc, { color: colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {item.description || item.category || (isIncome ? 'Income' : 'Expense')}
                      </Text>
                      <Text style={[s.activityMeta, { color: colors.text.tertiary }]}>
                        {actorName} · {fmtDate(item.date || item.createdAt)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        s.activityAmount,
                        { color: isIncome ? '#34C759' : colors.text.primary },
                      ]}
                    >
                      {isIncome ? '+' : ''}
                      {fmt(item.amount || 0)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  partnerHero: { alignItems: 'center', marginTop: 14 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  heartBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  partnerNames: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 8 },
  partnerRatio: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', marginTop: 4 },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: '700' },

  heroFinanceCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  heroFinanceTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  heroFinanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  heroFinanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroFinanceAmount: { fontSize: 26, fontWeight: '800', color: '#F97316', letterSpacing: -1 },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  netText: { fontSize: 13, fontWeight: '700' },

  card: {
    borderRadius: 20,
    padding: 18,
    gap: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabelLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barDot: { width: 10, height: 10, borderRadius: 5 },
  barName: { fontSize: 13, fontWeight: '600' },
  barAmount: { fontSize: 14, fontWeight: '700' },
  barOuter: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barPct: { fontSize: 11, fontWeight: '500', marginTop: 3 },

  statCard: {
    borderRadius: 18,
    padding: 14,
    gap: 6,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center' },

  vsLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  vsLabel: { fontSize: 12, fontWeight: '600' },
  vsAmount: { fontSize: 14, fontWeight: '700' },
  vsBarOuter: { height: 8, borderRadius: 4, overflow: 'hidden' },
  vsBarFill: { height: '100%', borderRadius: 4 },

  compRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  compLabel: { fontSize: 13 },
  compValue: { fontSize: 14, fontWeight: '700' },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  insightText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 17 },

  goalTopRow: { flexDirection: 'row', alignItems: 'center' },
  goalName: { fontSize: 13, fontWeight: '600' },
  goalPct: { fontSize: 12, fontWeight: '700' },
  progressBar: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: palette.brand.primary, borderRadius: 3 },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDesc: { fontSize: 14, fontWeight: '600' },
  activityMeta: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  activityAmount: { fontSize: 16, fontWeight: '800' },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyDesc: { fontSize: 13, fontWeight: '500', textAlign: 'center' },

  heroEmpty: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  heartIconWrap: { marginBottom: 12 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginTop: 20,
    width: '100%',
    height: 48,
  },
  countryCode: { fontSize: 16, fontWeight: '700', marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 16, height: '100%' },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 16,
    width: '100%',
  },
  inviteBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
