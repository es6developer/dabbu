import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { api } from '../../services/api';

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TYPE_COLORS: Record<string, string> = {
  personal: '#6366F1', household: '#22C55E', roommates: '#3B82F6',
  couple: '#EC4899', family: '#F59E0B', business: '#8B5CF6',
  'travel group': '#06B6D4', 'shared subscriptions': '#14B8A6',
  friends: '#6366F1', trip: '#06B6D4', office: '#F59E0B', event: '#EC4899', apartment: '#22C55E',
};

const TYPE_ICONS: Record<string, React.ComponentProps<typeof AntDesign>['name']> = {
  personal: 'user', household: 'home', roommates: 'team',
  couple: 'heart', family: 'team', business: 'bank',
  'travel group': 'earth', 'shared subscriptions': 'wallet',
  friends: 'team', trip: 'earth', office: 'bank', event: 'gift', apartment: 'home',
};

const EXPENSE_ICONS: Record<string, React.ComponentProps<typeof AntDesign>['name']> = {
  'Food & Dining': 'rest', Groceries: 'shoppingcart', Transport: 'car',
  Shopping: 'tags', 'Bills & Utilities': 'filetext1', Entertainment: 'playcircleo',
  'Health & Fitness': 'hearto', Education: 'book', Travel: 'earth',
  Rent: 'home', Insurance: 'Safety', Other: 'ellipsis1',
};

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'appstore-o' as const },
  { key: 'expenses', label: 'Expenses', icon: 'arrowdown' as const },
  { key: 'analytics', label: 'Analytics', icon: 'barschart' as const },
  { key: 'timeline', label: 'Timeline', icon: 'clockcircleo' as const },
  { key: 'insights', label: 'AI Insights', icon: 'bulb1' as const },
];

const TAB_W = 96;

export function GroupDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const groupParam = route.params?.group || {};
  const groupId = route.params?.groupId || groupParam.id;

  const [activeTab, setActiveTab] = useState('overview');
  const [dash, setDash] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(groupParam);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const gType = (group?.type || 'personal').toLowerCase();
  const accentColor = TYPE_COLORS[gType] || colors.accent.primary;
  const typeIcon = TYPE_ICONS[gType] || 'team';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, expRes, groupRes, insRes] = await Promise.all([
        api.get(`/shared-finance/groups/${groupId}/dashboard`).catch(() => null),
        api.get(`/shared-finance/groups/${groupId}/expenses`).catch(() => ({ data: [] })),
        api.get(`/shared-finance/groups/${groupId}`).catch(() => null),
        api.get(`/shared-finance/groups/${groupId}/insights`).catch(() => null),
      ]);
      if (dashRes) setDash((dashRes as any)?.data || dashRes);
      const er = expRes as any;
      setExpenses(Array.isArray(er) ? er : er?.data || []);
      if (groupRes) setGroup((prev: any) => ({ ...prev, ...((groupRes as any)?.data || groupRes) }));
      if (insRes) {
        const i = (insRes as any)?.data || insRes;
        setInsights(Array.isArray(i) ? i : i?.insights || []);
      }
    } catch { } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await loadData(); setRefreshing(false);
  }, [loadData]);

  const summary = dash?.summary || {};
  const totalSpent = Number(summary.totalSpent || 0);
  const monthlySpending = Number(summary.monthlySpending || 0);
  const memberCount = summary.memberCount || group?.members?.length || 0;
  const recentExpenses = dash?.recentExpenses || [];
  const categoryBreakdown = dash?.categoryBreakdown || [];
  const memberStats = dash?.memberStats || [];
  const members = group?.members || [];

  // ── Vertical Tabs ──
  const renderSidebar = () => (
    <View style={[s.sidebar, { backgroundColor: colors.bg.card, borderRightColor: colors.border.subtle }]}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[s.sideTab, active && { backgroundColor: accentColor + '12', borderLeftWidth: 3, borderLeftColor: accentColor }]}
          >
            <AntDesign name={tab.icon} size={16} color={active ? accentColor : colors.text.tertiary} />
            <Text style={[s.sideTabLabel, { color: active ? accentColor : colors.text.secondary }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ── Overview ──
  const renderOverview = () => (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[
          { label: 'Total Spent', value: fmt(totalSpent), color: colors.status.error, icon: 'arrowdown' as const },
          { label: 'This Month', value: fmt(monthlySpending), color: colors.status.warning, icon: 'calendar' as const },
        ].map((m) => (
          <View key={m.label} style={[s.mCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, flex: 1 }]}>
            <View style={[s.mIcon, { backgroundColor: m.color + '12' }]}>
              <AntDesign name={m.icon} size={16} color={m.color} />
            </View>
            <Text style={[s.mLabel, { color: colors.text.tertiary }]}>{m.label}</Text>
            <Text style={[s.mValue, { color: m.color }]}>{m.value}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[
          { label: 'Budget', value: summary.monthlyBudget ? fmt(Number(summary.monthlyBudget)) : '--', color: colors.accent.primary, icon: 'wallet' as const },
          { label: 'Members', value: `${memberCount}`, color: colors.status.info, icon: 'team' as const },
        ].map((m) => (
          <View key={m.label} style={[s.mCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, flex: 1 }]}>
            <View style={[s.mIcon, { backgroundColor: m.color + '12' }]}>
              <AntDesign name={m.icon} size={16} color={m.color} />
            </View>
            <Text style={[s.mLabel, { color: colors.text.tertiary }]}>{m.label}</Text>
            <Text style={[s.mValue, { color: m.color }]}>{m.value}</Text>
          </View>
        ))}
      </View>

      {members.length > 0 && (
        <View style={[s.secCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Members</Text>
          {members.map((m: any) => {
            const u = m.user || m;
            return (
              <View key={u.id || m.id} style={[s.memberRow, { borderBottomColor: colors.border.subtle }]}>
                <View style={[s.avatar, { backgroundColor: accentColor + '20' }]}>
                  <Text style={[s.avatarText, { color: accentColor }]}>{(u.firstName || '?')[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.memberName, { color: colors.text.primary }]}>{u.firstName || 'Member'} {u.lastName || ''}</Text>
                  <Text style={[s.memberRole, { color: colors.text.tertiary }]}>{m.role || 'member'}</Text>
                </View>
                {m.role === 'admin' && (
                  <View style={[s.adminBadge, { backgroundColor: accentColor + '12' }]}>
                    <Text style={[s.adminBadgeText, { color: accentColor }]}>Admin</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {recentExpenses.length > 0 && (
        <View style={[s.secCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Recent Expenses</Text>
          {recentExpenses.slice(0, 5).map((e: any) => {
            const cat = e.category || 'Other';
            return (
              <View key={e.id} style={[s.actRow, { borderBottomColor: colors.border.subtle }]}>
                <View style={[s.actIcon, { backgroundColor: colors.status.error + '12' }]}>
                  <AntDesign name={EXPENSE_ICONS[cat] || 'ellipsis1'} size={13} color={colors.status.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.actDesc, { color: colors.text.primary }]} numberOfLines={1}>{e.description || cat}</Text>
                  <Text style={[s.actDate, { color: colors.text.tertiary }]}>{fmtDate(e.date)}</Text>
                </View>
                <Text style={[s.actAmt, { color: colors.status.error }]}>-{fmt(Number(e.amount))}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  // ── Expenses ──
  const renderExpenses = () => {
    if (expenses.length === 0) {
      return (
        <View style={[s.emptyCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <AntDesign name="arrowdown" size={32} color={colors.text.tertiary} />
          <Text style={[s.emptyText, { color: colors.text.tertiary }]}>No expenses yet</Text>
        </View>
      );
    }
    return expenses.map((e: any) => {
      const cat = e.category || 'Other';
      return (
        <View key={e.id} style={[s.txnCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <View style={s.txnRow}>
            <View style={[s.txnIcon, { backgroundColor: colors.status.error + '12' }]}>
              <AntDesign name={EXPENSE_ICONS[cat] || 'ellipsis1'} size={16} color={colors.status.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.txnDesc, { color: colors.text.primary }]} numberOfLines={1}>{e.description || cat}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                <View style={[s.catBadge, { backgroundColor: colors.status.error + '10' }]}>
                  <Text style={[s.catBadgeText, { color: colors.status.error }]}>{cat}</Text>
                </View>
                <Text style={[s.txnDate, { color: colors.text.tertiary }]}>{fmtDate(e.date)}</Text>
              </View>
            </View>
            <Text style={[s.txnAmt, { color: colors.status.error }]}>-{fmt(Number(e.amount))}</Text>
          </View>
        </View>
      );
    });
  };

  // ── Analytics ──
  const renderAnalytics = () => (
    <View style={{ gap: spacing.md }}>
      <View style={[s.secCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
        <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Summary</Text>
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          {[
            { label: 'Total Spent', value: fmt(totalSpent), color: colors.status.error },
            { label: 'Monthly Spend', value: fmt(monthlySpending), color: colors.status.warning },
            { label: 'Expense Count', value: `${summary.expenseCount || 0}`, color: colors.accent.primary },
            { label: 'Budget Remaining', value: summary.budgetRemaining ? fmt(Number(summary.budgetRemaining)) : '--', color: Number(summary.budgetRemaining || 0) >= 0 ? colors.status.success : colors.status.error },
          ].map((r) => (
            <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.secondary }}>{r.label}</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: r.color }}>{r.value}</Text>
            </View>
          ))}
        </View>
      </View>
      {categoryBreakdown.length > 0 && (
        <View style={[s.secCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Categories</Text>
          {categoryBreakdown.map((c: any) => (
            <View key={c.category} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }}>
              <View style={[s.catDot, { backgroundColor: colors.status.error + '20' }]}>
                <AntDesign name={EXPENSE_ICONS[c.category] || 'ellipsis1'} size={12} color={colors.status.error} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>{c.category}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.status.error }}>{fmt(c.total)}</Text>
                </View>
                <View style={[s.progBg, { backgroundColor: colors.bg.tertiary, marginTop: 4 }]}>
                  <View style={[s.progFill, { width: `${Math.min(c.percentage, 100)}%`, backgroundColor: colors.status.error }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
      {memberStats.length > 0 && (
        <View style={[s.secCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <Text style={[s.secTitle, { color: colors.text.tertiary }]}>Member Contributions</Text>
          {memberStats.map((ms: any) => (
            <View key={ms.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }}>
              <View style={[s.avatar, { backgroundColor: accentColor + '20', width: 32, height: 32, borderRadius: 16 }]}>
                <Text style={[s.avatarText, { color: accentColor, fontSize: 12 }]}>{(ms.name || '?')[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>{ms.name}</Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text.tertiary }}>{ms.expenseCount} expenses</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.status.error }}>{fmt(ms.totalPaid)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // ── Timeline ──
  const renderTimeline = () => {
    const events = recentExpenses || [];
    if (events.length === 0) {
      return (
        <View style={[s.emptyCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <AntDesign name="clockcircleo" size={32} color={colors.text.tertiary} />
          <Text style={[s.emptyText, { color: colors.text.tertiary }]}>No activity yet</Text>
        </View>
      );
    }
    return (
      <View style={[s.secCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
        {events.map((e: any, i: number) => (
          <View key={e.id || i} style={[s.tlRow, i < events.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.subtle }]}>
            <View style={s.tlLeft}>
              <View style={[s.tlDot, { backgroundColor: colors.status.error }]} />
              {i < events.length - 1 && <View style={[s.tlLine, { backgroundColor: colors.border.subtle }]} />}
            </View>
            <View style={{ flex: 1, paddingBottom: i < events.length - 1 ? 12 : 0 }}>
              <Text style={[s.tlTitle, { color: colors.text.primary }]}>{e.description || e.category || 'Expense'}</Text>
              <Text style={[s.tlDate, { color: colors.text.tertiary }]}>{fmtDate(e.date)}</Text>
            </View>
            <Text style={[s.tlAmt, { color: colors.status.error }]}>-{fmt(Number(e.amount))}</Text>
          </View>
        ))}
      </View>
    );
  };

  // ── AI Insights ──
  const renderInsights = () => {
    if (insights.length === 0) {
      return (
        <View style={[s.emptyCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <AntDesign name="bulb1" size={32} color={colors.text.tertiary} />
          <Text style={[s.emptyText, { color: colors.text.tertiary }]}>No insights yet. Add more expenses to get AI-powered analysis.</Text>
        </View>
      );
    }
    return (
      <View style={{ gap: spacing.sm }}>
        {insights.map((ins: any, i: number) => (
          <View key={i} style={[s.insCard, { backgroundColor: colors.bg.card, borderColor: accentColor + '20' }]}>
            <View style={[s.insIcon, { backgroundColor: accentColor + '12' }]}>
              <AntDesign name="bulb1" size={16} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.insTitle, { color: colors.text.primary }]}>{ins.title || 'Insight'}</Text>
              <Text style={[s.insText, { color: colors.text.tertiary }]}>{ins.description || ins.text || ins.message || ''}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'expenses': return renderExpenses();
      case 'analytics': return renderAnalytics();
      case 'timeline': return renderTimeline();
      case 'insights': return renderInsights();
      default: return renderOverview();
    }
  };

  if (loading && !group?.name) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      {/* Hero */}
      <LinearGradient
        colors={isDark ? ['#1A0A2E', '#2D1B69'] : [accentColor + '15', accentColor + '05']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.heroBack}>
          <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={s.heroContent}>
          <View style={[s.heroIcon, { backgroundColor: accentColor + '20' }]}>
            <AntDesign name={typeIcon} size={26} color={accentColor} />
          </View>
          <Text style={[s.heroName, { color: colors.text.primary }]}>{group?.name || 'Group'}</Text>
          {group?.description ? <Text style={[s.heroDesc, { color: colors.text.tertiary }]} numberOfLines={2}>{group.description}</Text> : null}
          <View style={[s.heroBadge, { backgroundColor: accentColor + '18' }]}>
            <View style={[s.heroBadgeDot, { backgroundColor: accentColor }]} />
            <Text style={[s.heroBadgeText, { color: accentColor }]}>{gType.charAt(0).toUpperCase() + gType.slice(1)}</Text>
          </View>
          <Text style={[s.heroSince, { color: colors.text.tertiary }]}>Created {fmtDate(group?.createdAt)}</Text>
        </View>
      </LinearGradient>

      {/* Body: Vertical Tabs + Content */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {renderSidebar()}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="small" color={colors.accent.primary} />
            </View>
          ) : renderContent()}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  // Hero
  hero: { paddingBottom: spacing.xl, paddingHorizontal: spacing['2xl'], borderBottomLeftRadius: borderRadius['3xl'], borderBottomRightRadius: borderRadius['3xl'] },
  heroBack: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  heroContent: { alignItems: 'center' },
  heroIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  heroName: { fontSize: 20, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  heroDesc: { fontSize: 12, fontWeight: '500', textAlign: 'center', lineHeight: 17, marginBottom: spacing.sm, paddingHorizontal: spacing.lg },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 18, marginBottom: 4 },
  heroBadgeDot: { width: 5, height: 5, borderRadius: 3 },
  heroBadgeText: { fontSize: 11, fontWeight: '700' },
  heroSince: { fontSize: 10, fontWeight: '500' },
  // Sidebar
  sidebar: { width: TAB_W, borderRightWidth: 1, paddingTop: spacing.sm },
  sideTab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 2 },
  sideTabLabel: { fontSize: 11, fontWeight: '700' },
  // Cards
  mCard: { borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing.lg, marginBottom: spacing.sm },
  mIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  mLabel: { fontSize: 10, fontWeight: '500', marginBottom: 2 },
  mValue: { fontSize: 17, fontWeight: '800' },
  secCard: { borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing.xl, marginBottom: spacing.sm },
  secTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700' },
  memberName: { fontSize: 13, fontWeight: '600' },
  memberRole: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  adminBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  adminBadgeText: { fontSize: 8, fontWeight: '700' },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  actIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actDesc: { fontSize: 12, fontWeight: '600' },
  actDate: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  actAmt: { fontSize: 13, fontWeight: '700' },
  // Expenses
  txnCard: { borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing.lg, marginBottom: spacing.xs },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txnIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  txnDesc: { fontSize: 13, fontWeight: '600' },
  catBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  catBadgeText: { fontSize: 8, fontWeight: '700' },
  txnDate: { fontSize: 10, fontWeight: '500' },
  txnAmt: { fontSize: 14, fontWeight: '700' },
  catDot: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  progBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 2 },
  // Timeline
  tlRow: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
  tlLeft: { alignItems: 'center', width: 10 },
  tlDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  tlLine: { width: 1, flex: 1, marginTop: 4 },
  tlTitle: { fontSize: 13, fontWeight: '600' },
  tlDate: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  tlAmt: { fontSize: 13, fontWeight: '700' },
  // Insights
  insCard: { flexDirection: 'row', gap: 12, borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing.xl, alignItems: 'flex-start' },
  insIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  insTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  insText: { fontSize: 11, fontWeight: '500', lineHeight: 16 },
  // Empty
  emptyCard: { borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing['2xl'], alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18 },
});
