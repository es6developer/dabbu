import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function CoupleFinanceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { accessToken, user: currentUser } = useAuth();
  const { colors, isDark } = useTheme();

  const groupId = route.params?.groupId;
  const groupName = route.params?.groupName || 'Couple Finance';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        if (accessToken) setAccessToken(accessToken);
        if (groupId) {
          const res = await api.get<any>(`/shared-finance/groups/${groupId}/couple/dashboard`);
          setData(res);
        } else {
          setData(null);
        }
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  async function sendInvite() {
    if (!partnerEmail.trim()) {
      Alert.alert('Email required', "Enter your partner's email");
      return;
    }
    setSendingInvite(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.post('/shared-finance/couple/invite', { receiverEmail: partnerEmail.trim() });
      Alert.alert('Invite Sent', `Invitation sent to ${partnerEmail.trim()}`);
      setPartnerEmail('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  }

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ padding: 24, paddingTop: insets.top + 8, gap: 16 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width="100%" height={180} borderRadius={24} />
          <Skeleton width="100%" height={80} borderRadius={18} />
          <Skeleton width="100%" height={80} borderRadius={18} />
          <Skeleton width="100%" height={80} borderRadius={18} />
        </View>
      </View>
    );
  }

  if (!data?.profile) {
    return (
      <ScrollView
        style={[s.screen, { backgroundColor: colors.bg.primary }]}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.backBtn, { backgroundColor: colors.bg.glassLight }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>

        <LinearGradient colors={['#FF6B9D', '#c44a7c']} style={s.heroEmpty}>
          <View style={s.heartIconWrap}>
            <Ionicons name="heart-circle" size={64} color="#FFF" />
          </View>
          <Text style={s.heroTitle}>Couple Finance</Text>
          <Text style={s.heroSub}>Track shared expenses, savings, and goals together</Text>
        </LinearGradient>

        <View style={[s.inviteCard, { backgroundColor: colors.bg.secondary }]}>
          <Ionicons name="link-outline" size={24} color={colors.accent.primary} />
          <Text style={[s.inviteTitle, { color: colors.text.primary }]}>
            Connect with your Partner
          </Text>
          <Text style={[s.inviteDesc, { color: colors.text.tertiary }]}>
            Send an invite to your partner to start sharing finances
          </Text>
          <View
            style={[
              s.inviteInputRow,
              { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
            ]}
          >
            <TextInput
              style={[s.inviteInput, { color: colors.text.primary }]}
              value={partnerEmail}
              onChangeText={setPartnerEmail}
              placeholder="partner@email.com"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[s.sendBtn, { backgroundColor: colors.accent.primary }]}
              onPress={sendInvite}
              disabled={sendingInvite}
            >
              {sendingInvite ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={s.sendBtnText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={[s.infoCard, { backgroundColor: colors.bg.tertiary }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.status.info} />
          <Text style={[s.infoText, { color: colors.text.tertiary }]}>
            Your data is encrypted and private. Only you and your partner can see this information.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const profile = data.profile;
  const partner1 = profile.partner1;
  const partner2 = profile.partner2;
  const partner1Name = partner1?.firstName || partner1?.email || 'You';
  const partner2Name = partner2?.firstName || partner2?.email || 'Partner';
  const ratio = profile.splitRatio || '50:50';
  const monthlySpent = data.sharedBudget?.spent || 0;
  const monthlyBudget = data.sharedBudget?.budget || 0;
  const budgetUsed = monthlyBudget > 0 ? (monthlySpent / monthlyBudget) * 100 : 0;
  const savingsGoal = data.savingsProgress?.goal || 0;
  const savingsSaved = data.savingsProgress?.saved || 0;
  const savingsPct = data.savingsProgress?.percentage || 0;
  const upcomingBills = data.upcomingBills || [];
  const goals = data.goals || [];
  const insights = data.insights || [];
  const monthlyOverview = data.monthlyOverview;
  const comparison = monthlyOverview?.totalChangePercent || 0;

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={colors.accent.primary}
        />
      }
    >
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.backBtn, { backgroundColor: colors.bg.glassLight }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <LinearGradient colors={['#FF6B9D', '#c44a7c']} style={s.heroSection}>
        <View style={s.heroPartners}>
          <View style={s.partnerAvatar}>
            <Text style={s.partnerInit}>{partner1Name[0]?.toUpperCase() || '?'}</Text>
          </View>
          <Ionicons name="heart" size={20} color="#FFF" style={{ marginHorizontal: 8 }} />
          <View style={[s.partnerAvatar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <Text style={s.partnerInit}>{partner2Name[0]?.toUpperCase() || '?'}</Text>
          </View>
        </View>
        <Text style={s.heroRatio}>{ratio}</Text>
        <Text style={s.heroRatioLabel}>Contribution Ratio</Text>

        <View style={s.budgetBarOuter}>
          <View style={[s.budgetBarFill, { width: `${Math.min(budgetUsed, 100)}%` }]} />
        </View>
        <Text style={s.budgetBarLabel}>
          Shared Budget: {fmt(monthlySpent)} / {fmt(monthlyBudget)}
        </Text>
      </LinearGradient>

      {insights.length > 0 && (
        <View style={s.insightsSection}>
          {insights.map((insight: string, i: number) => {
            const isPositive =
              insight.includes('less') || insight.includes('Great') || insight.includes('on track');
            return (
              <View
                key={i}
                style={[
                  s.insightCard,
                  {
                    backgroundColor: isPositive
                      ? `${colors.status.success}12`
                      : `${colors.status.warning}12`,
                  },
                ]}
              >
                <Ionicons
                  name={isPositive ? 'bulb-outline' : 'trending-up-outline'}
                  size={18}
                  color={isPositive ? colors.status.success : colors.status.warning}
                />
                <Text style={[s.insightText, { color: colors.text.primary }]}>{insight}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={s.widgetsGrid}>
        <View style={[s.widgetCard, { backgroundColor: colors.bg.secondary }]}>
          <View style={s.widgetHeader}>
            <Ionicons name="cash-outline" size={18} color={colors.accent.primary} />
            <Text style={[s.widgetTitle, { color: colors.text.primary }]}>Our Spending</Text>
          </View>
          <Text style={[s.widgetAmount, { color: colors.text.primary }]}>
            {fmt(monthlySpent)}
          </Text>
          <Text style={[s.widgetLabel, { color: colors.text.tertiary }]}>this month</Text>
          {monthlyOverview?.lastMonthTotal > 0 && (
            <View style={s.widgetTrend}>
              <Ionicons
                name={comparison <= 0 ? 'trending-down' : 'trending-up'}
                size={14}
                color={comparison <= 0 ? colors.status.success : colors.status.error}
              />
              <Text
                style={[
                  s.trendText,
                  {
                    color: comparison <= 0 ? colors.status.success : colors.status.error,
                  },
                ]}
              >
                {Math.abs(comparison).toFixed(0)}% vs last month
              </Text>
            </View>
          )}
        </View>

        <View style={[s.widgetCard, { backgroundColor: colors.bg.secondary }]}>
          <View style={s.widgetHeader}>
            <Ionicons name="wallet-outline" size={18} color={colors.accent.primary} />
            <Text style={[s.widgetTitle, { color: colors.text.primary }]}>Our Savings</Text>
          </View>
          <Text style={[s.widgetAmount, { color: colors.status.success }]}>{fmt(savingsSaved)}</Text>
          {savingsGoal > 0 ? (
            <>
              <View style={[s.progressBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                <View
                  style={[
                    s.progressBarFill,
                    {
                      width: `${Math.min(savingsPct, 100)}%`,
                      backgroundColor: colors.accent.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[s.widgetLabel, { color: colors.text.tertiary }]}>
                {savingsPct}% of {fmt(savingsGoal)} goal
              </Text>
            </>
          ) : (
            <Text style={[s.widgetLabel, { color: colors.text.tertiary }]}>
              Set a savings goal to track progress
            </Text>
          )}
        </View>
      </View>

      {upcomingBills.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Upcoming Bills</Text>
          {upcomingBills.map((bill: any, i: number) => (
            <View key={bill.id || i} style={[s.billCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={[s.billIcon, { backgroundColor: `${colors.status.warning}18` }]}>
                <Ionicons name="receipt-outline" size={18} color={colors.status.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.billName, { color: colors.text.primary }]}>
                  {bill.type} bill
                </Text>
                {bill.dueDate && (
                  <Text style={[s.billDue, { color: colors.text.tertiary }]}>
                    Due {new Date(bill.dueDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                )}
              </View>
              <Text style={[s.billAmount, { color: colors.text.primary }]}>
                {fmt(bill.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {goals.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Shared Goals</Text>
          {goals.map((goal: any, i: number) => (
            <View key={goal.id || i} style={[s.goalCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={s.goalTop}>
                <Ionicons name="flag-outline" size={20} color={colors.accent.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.goalName, { color: colors.text.primary }]}>{goal.name}</Text>
                  <Text style={[s.goalTarget, { color: colors.text.tertiary }]}>
                    Target: {fmt(goal.targetAmount || 0)}
                  </Text>
                </View>
              </View>
              <View style={[s.goalBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                <View
                  style={[
                    s.goalBarFill,
                    {
                      width: `${Math.min(goal.progress, 100)}%`,
                      backgroundColor: colors.accent.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[s.goalProgress, { color: colors.text.tertiary }]}>
                {fmt(goal.savedAmount || 0)} saved ({goal.progress}%)
              </Text>
            </View>
          ))}
        </View>
      )}

      {monthlyOverview && (
        <View style={[s.comparisonCard, { backgroundColor: colors.bg.secondary }]}>
          <View style={s.comparisonHeader}>
            <Ionicons name="trending-up-outline" size={20} color={colors.text.primary} />
            <Text style={[s.comparisonTitle, { color: colors.text.primary }]}>
              Monthly Comparison
            </Text>
          </View>
          <View style={s.comparisonRow}>
            <Text style={[s.comparisonLabel, { color: colors.text.tertiary }]}>This month</Text>
            <Text style={[s.comparisonValue, { color: colors.text.primary }]}>
              {fmt(monthlyOverview.currentMonthTotal || 0)}
            </Text>
          </View>
          <View style={s.comparisonRow}>
            <Text style={[s.comparisonLabel, { color: colors.text.tertiary }]}>Last month</Text>
            <Text style={[s.comparisonValue, { color: colors.text.primary }]}>
              {fmt(monthlyOverview.lastMonthTotal || 0)}
            </Text>
          </View>
          <View style={s.comparisonRow}>
            <Text style={[s.comparisonLabel, { color: colors.text.tertiary }]}>Change</Text>
            <Text
              style={[
                s.comparisonValue,
                {
                  color:
                    (monthlyOverview.totalChange || 0) <= 0
                      ? colors.status.success
                      : colors.status.error,
                },
              ]}
            >
              {(monthlyOverview.totalChange || 0) <= 0 ? '' : '+'}
              {fmt(monthlyOverview.totalChange || 0)}
            </Text>
          </View>
        </View>
      )}

      {data.salarySuggestion && (
        <View style={[s.suggestionCard, { backgroundColor: `${colors.accent.primary}12` }]}>
          <Ionicons name="calculator-outline" size={20} color={colors.accent.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.suggestionTitle, { color: colors.text.primary }]}>
              Salary-Based Split
            </Text>
            <Text style={[s.suggestionDesc, { color: colors.text.tertiary }]}>
              Recommended split: {data.salarySuggestion.mine}:{data.salarySuggestion.partner}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
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
  heroSection: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  heroPartners: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInit: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  heroRatio: { fontSize: 32, fontWeight: '800', color: '#FFF', letterSpacing: 2 },
  heroRatioLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 16 },
  budgetBarOuter: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetBarFill: { height: '100%', backgroundColor: '#FFF', borderRadius: 4 },
  budgetBarLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  insightsSection: { paddingHorizontal: 20, marginTop: 16, gap: 8 },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  insightText: { fontSize: 13, fontWeight: '500', flex: 1 },

  widgetsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  widgetCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
  },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  widgetTitle: { fontSize: 13, fontWeight: '700' },
  widgetAmount: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  widgetLabel: { fontSize: 11 },
  widgetTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  trendText: { fontSize: 11, fontWeight: '600' },
  progressBarOuter: {
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3 },

  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },

  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
  },
  billIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billName: { fontSize: 14, fontWeight: '600' },
  billDue: { fontSize: 11, marginTop: 2 },
  billAmount: { fontSize: 15, fontWeight: '700' },

  goalCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  goalTop: { flexDirection: 'row', alignItems: 'center' },
  goalName: { fontSize: 15, fontWeight: '700' },
  goalTarget: { fontSize: 12, marginTop: 2 },
  goalBarOuter: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  goalBarFill: { height: '100%', borderRadius: 3 },
  goalProgress: { fontSize: 12, marginTop: 4 },

  comparisonCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 18,
    borderRadius: 18,
  },
  comparisonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  comparisonTitle: { fontSize: 15, fontWeight: '700' },
  comparisonRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  comparisonLabel: { fontSize: 13 },
  comparisonValue: { fontSize: 14, fontWeight: '700' },

  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
  },
  suggestionTitle: { fontSize: 14, fontWeight: '700' },
  suggestionDesc: { fontSize: 12, marginTop: 2 },

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
  inviteCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  inviteTitle: { fontSize: 17, fontWeight: '700' },
  inviteDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  inviteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    width: '100%',
  },
  inviteInput: { flex: 1, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  sendBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
