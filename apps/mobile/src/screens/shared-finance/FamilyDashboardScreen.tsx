import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
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

const ROLE_ICONS: Record<string, string> = {
  admin: 'shield-checkmark',
  member: 'person',
  viewer: 'eye-outline',
};
const ROLE_COLORS: Record<string, string> = {
  admin: '#FFD700',
  member: '#00A86B',
  viewer: '#8E8E93',
};

export function FamilyDashboardScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { colors } = useTheme();

  const groupId = route.params?.groupId;
  const groupName = route.params?.groupName || 'Family';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        if (accessToken) setAccessToken(accessToken);
        if (groupId) {
          const res = await api.get<any>(`/shared-finance/groups/${groupId}/family-dashboard`);
          setData(res);
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

  if (error) {
    return (
      <View
        style={[
          s.screen,
          {
            backgroundColor: colors.bg.primary,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: insets.top,
          },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={48} color={colors.status.error} />
        <Text style={[s.errorText, { color: colors.text.primary, marginTop: 12 }]}>{error}</Text>
        <TouchableOpacity
          style={[s.retry, { backgroundColor: colors.accent.primary }]}
          onPress={() => loadData()}
        >
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const summary = data?.summary || {};
  const memberStats = data?.memberStats || [];
  const roleCounts = data?.roleCounts || {};
  const goals = data?.goals || [];
  const upcomingBills = data?.upcomingBills || [];
  const categoryBreakdown = data?.categoryBreakdown || [];
  const totalMonthlySpending = summary.monthlySpending || 0;
  const monthlyBudget = summary.monthlyBudget || 0;
  const budgetUsed = monthlyBudget > 0 ? (totalMonthlySpending / monthlyBudget) * 100 : 0;

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

      <LinearGradient
        colors={['#2D6A4F', '#1B4332']}
        style={s.heroSection}
      >
        <View style={s.heroIconWrap}>
          <Ionicons name="people" size={28} color="#FFF" />
        </View>
        <Text style={s.heroTitle}>{groupName}</Text>
        <View style={s.heroMeta}>
          <Text style={s.heroMetaText}>{summary.memberCount || 0} members</Text>
          <View style={s.heroMetaDot} />
          <Text style={s.heroMetaText}>{summary.totalExpenses || 0} expenses</Text>
        </View>
        <View style={[s.budgetBarOuter, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <View style={[s.budgetBarFill, { width: `${Math.min(budgetUsed, 100)}%` }]} />
        </View>
        <Text style={s.heroSub}>
          Spent {fmt(totalMonthlySpending)} / {fmt(monthlyBudget)} this month
        </Text>
      </LinearGradient>

      <View style={s.widgetsGrid}>
        <View style={[s.widgetCard, { backgroundColor: colors.bg.secondary }]}>
          <View style={s.widgetHeader}>
            <Ionicons name="cash-outline" size={18} color={colors.accent.primary} />
            <Text style={[s.widgetTitle, { color: colors.text.primary }]}>Family Spending</Text>
          </View>
          <Text style={[s.widgetAmount, { color: colors.text.primary }]}>
            {fmt(totalMonthlySpending)}
          </Text>
          <Text style={[s.widgetLabel, { color: colors.text.tertiary }]}>this month</Text>
        </View>

        <View style={[s.widgetCard, { backgroundColor: colors.bg.secondary }]}>
          <View style={s.widgetHeader}>
            <Ionicons name="wallet-outline" size={18} color={colors.status.success} />
            <Text style={[s.widgetTitle, { color: colors.text.primary }]}>Family Savings</Text>
          </View>
          <Text style={[s.widgetAmount, { color: colors.status.success }]}>
            {fmt(data?.goalsTotalSaved || 0)}
          </Text>
          <Text style={[s.widgetLabel, { color: colors.text.tertiary }]}>total saved</Text>
        </View>
      </View>

      {memberStats.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Family Members</Text>
            <View style={s.roleChips}>
              {roleCounts.admin > 0 && (
                <View style={[s.roleChip, { backgroundColor: `${ROLE_COLORS.admin}18` }]}>
                  <Text style={[s.roleChipText, { color: ROLE_COLORS.admin }]}>
                    {roleCounts.admin} Admin
                  </Text>
                </View>
              )}
              {roleCounts.member > 0 && (
                <View style={[s.roleChip, { backgroundColor: `${ROLE_COLORS.member}18` }]}>
                  <Text style={[s.roleChipText, { color: ROLE_COLORS.member }]}>
                    {roleCounts.member} Member
                  </Text>
                </View>
              )}
              {roleCounts.viewer > 0 && (
                <View style={[s.roleChip, { backgroundColor: `${ROLE_COLORS.viewer}18` }]}>
                  <Text style={[s.roleChipText, { color: ROLE_COLORS.viewer }]}>
                    {roleCounts.viewer} Viewer
                  </Text>
                </View>
              )}
            </View>
          </View>
          {memberStats.map((member: any, i: number) => (
            <View key={member.userId || i} style={[s.memberCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={[s.memberAvatar, { backgroundColor: `${ROLE_COLORS[member.role] || '#666'}20` }]}>
                <Text style={[s.memberInit, { color: ROLE_COLORS[member.role] || '#666' }]}>
                  {(member.name || '?')[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.memberNameRow}>
                  <Text style={[s.memberName, { color: colors.text.primary }]}>{member.name}</Text>
                  <Ionicons
                    name={(ROLE_ICONS[member.role] || 'person') as any}
                    size={12}
                    color={ROLE_COLORS[member.role] || '#666'}
                  />
                </View>
                <Text style={[s.memberMeta, { color: colors.text.tertiary }]}>
                  Paid {fmt(member.totalPaid)} · {member.expenseCount} expenses
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {upcomingBills.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Upcoming Payments</Text>
          {upcomingBills.map((bill: any, i: number) => (
            <View key={bill.id || i} style={[s.billCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={[s.billIcon, { backgroundColor: `${colors.status.warning}18` }]}>
                <Ionicons name="receipt-outline" size={16} color={colors.status.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.billName, { color: colors.text.primary }]}>{bill.type}</Text>
                {bill.dueDate && (
                  <Text style={[s.billDue, { color: colors.text.tertiary }]}>
                    Due {new Date(bill.dueDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                )}
              </View>
              <Text style={[s.billAmount, { color: colors.text.primary }]}>{fmt(bill.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {goals.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Goal Progress</Text>
          {goals.map((goal: any, i: number) => (
            <View key={goal.id || i} style={[s.goalCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={s.goalTop}>
                <Ionicons name="flag-outline" size={20} color={colors.accent.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.goalName, { color: colors.text.primary }]}>{goal.name}</Text>
                  <Text style={[s.goalTarget, { color: colors.text.tertiary }]}>
                    {fmt(goal.savedAmount)} / {fmt(goal.targetAmount)}
                  </Text>
                </View>
                <Text style={[s.goalPct, { color: colors.accent.primary }]}>
                  {goal.progress}%
                </Text>
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
            </View>
          ))}
        </View>
      )}

      {categoryBreakdown.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Spending by Category</Text>
          {categoryBreakdown.map((cat: any, i: number) => (
            <View key={cat.category || i} style={s.catRow}>
              <Text style={[s.catName, { color: colors.text.primary }]}>{cat.category}</Text>
              <View style={[s.catBarOuter, { backgroundColor: colors.bg.tertiary }]}>
                <View
                  style={[
                    s.catBarFill,
                    {
                      width: `${cat.percentage}%`,
                      backgroundColor: colors.accent.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[s.catValue, { color: colors.text.tertiary }]}>{fmt(cat.total)}</Text>
            </View>
          ))}
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
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 16 },
  heroMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  heroMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 8,
  },
  budgetBarOuter: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetBarFill: { height: '100%', backgroundColor: '#FFF', borderRadius: 4 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  widgetsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  widgetCard: { flex: 1, padding: 16, borderRadius: 18 },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  widgetTitle: { fontSize: 13, fontWeight: '700' },
  widgetAmount: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  widgetLabel: { fontSize: 11 },

  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  roleChips: { flexDirection: 'row', gap: 6 },
  roleChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleChipText: { fontSize: 10, fontWeight: '700' },

  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInit: { fontSize: 16, fontWeight: '700' },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberMeta: { fontSize: 11, marginTop: 2 },

  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
  },
  billIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  billName: { fontSize: 14, fontWeight: '600' },
  billDue: { fontSize: 11, marginTop: 2 },
  billAmount: { fontSize: 15, fontWeight: '700' },

  goalCard: { borderRadius: 18, padding: 16, marginBottom: 10 },
  goalTop: { flexDirection: 'row', alignItems: 'center' },
  goalName: { fontSize: 15, fontWeight: '700' },
  goalTarget: { fontSize: 12, marginTop: 2 },
  goalPct: { fontSize: 16, fontWeight: '800' },
  goalBarOuter: { width: '100%', height: 6, borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 3 },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  catName: { fontSize: 12, fontWeight: '600', width: 80 },
  catBarOuter: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 3 },
  catValue: { fontSize: 12, fontWeight: '600', width: 60, textAlign: 'right' },

  errorText: { fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },
  retry: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
