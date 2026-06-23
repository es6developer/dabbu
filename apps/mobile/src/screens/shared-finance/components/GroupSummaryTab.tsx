import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../../services/api';
import { fmt, TYPE_THEMES } from './groupUtils';

import { alertService } from "../../../components/ui";
interface Props {
  settlements: any[];
  settlementsLoading: boolean;
  simplified: boolean;
  onToggleSimplified: () => void;
  myBalanceRow: any;
  balanceRows: any[];
  currentUser: any;
  type: string;
  name: string;
  members: any[];
  stats: { totalSpent: number; totalTransactions: number; pendingSettlements: number };
  expenses: any[];
  sortedExpenses: any[];
  activity: any[];
  colors: any;
  groupId: string;
}

export function GroupSummaryTab({
  settlements, settlementsLoading, simplified, onToggleSimplified,
  myBalanceRow, balanceRows, currentUser, type, name, members,
  stats, expenses, sortedExpenses, activity, colors, groupId,
}: Props) {
  const navigation = useNavigation<any>();
  const [insights, setInsights] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const localSettlements = settlements
    .filter((s: any) => !simplified || s.from === currentUser?.id || s.to === currentUser?.id)
    .map((s: any) => {
      const isMeFrom = s.from === currentUser?.id;
      const isMeTo = s.to === currentUser?.id;
      const memberMap = new Map(balanceRows.map((r) => [r.userId, r]));
      const toRow = memberMap.get(s.to);
      return {
        from: s.from, fromName: isMeTo ? 'You' : s.fromName,
        to: s.to, toName: isMeFrom ? 'You' : s.toName,
        amount: s.amount, upiId: isMeFrom ? toRow?.upiId : undefined,
        type: isMeFrom ? ('pay' as const) : ('remind' as const),
      };
    });

  const catEntries = (() => {
    const cats: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const c = (e.category || 'Other').toLowerCase();
      cats[c] = (cats[c] || 0) + Number(e.amount || 0);
    });
    return Object.entries(cats).sort(([, a], [, b]) => b - a);
  })();

  const recentActivity = activity.slice(0, 5);

  return (
    <View style={[tabStyles.panel, { paddingHorizontal: 20, paddingTop: 14 }]}>
      {settlementsLoading ? (
        <View style={[tabStyles.heroCard, { backgroundColor: colors.bg.card, alignItems: 'center', paddingVertical: 16 }]}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
        </View>
      ) : (
        <View style={[tabStyles.heroCard, { backgroundColor: colors.bg.card }]}>
          <View style={tabStyles.heroHeader}>
            <AntDesign name="swap" size={18} color={colors.accent.primary} />
            <Text style={[tabStyles.heroTitle, { color: colors.text.primary }]}>
              {myBalanceRow && myBalanceRow.balance < 0
                ? `You owe ${fmt(Math.abs(myBalanceRow.balance))}`
                : `You are owed ${fmt(myBalanceRow?.balance || 0)}`}
            </Text>
          </View>
          {settlements.length > 0 && (
            <>
              <TouchableOpacity onPress={onToggleSimplified} style={tabStyles.simplifyToggle}>
                <AntDesign name={simplified ? 'checksquare' : 'checksquareo'} size={18} color={colors.accent.primary} />
                <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.text.secondary }]}>Simplified settlements</Text>
              </TouchableOpacity>
              {localSettlements.map((st, i) => (
                <View key={i} style={tabStyles.settlementRow}>
                  <View style={[tabStyles.avatar, { backgroundColor: colors.accent.primary }]}>
                    <Text style={tabStyles.avatarText}>{st.fromName === 'You' ? st.toName[0]?.toUpperCase() : st.fromName[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.text.primary }]}>
                      {st.type === 'pay' ? `Pay ${st.toName}` : `${st.fromName} pays you`}
                    </Text>
                    <Text style={[{ fontSize: 12, color: colors.text.tertiary, marginTop: 1 }]}>{fmt(st.amount)}</Text>
                  </View>
                  {st.type === 'pay' && st.upiId ? (
                    <TouchableOpacity style={[tabStyles.upiBtn, { backgroundColor: '#34C759' }]} onPress={() => {
                      const upiLink = `upi://pay?pa=${encodeURIComponent(st.upiId!)}&pn=${encodeURIComponent(st.toName)}&am=${st.amount}&cu=INR&tn=Settling%20via%20Dabbu`;
                      Linking.openURL(upiLink).catch(() => alertService.alert('Unable to open UPI', 'No UPI app found.'));
                    }}>
                      <AntDesign name="wallet" size={14} color="#FFF" />
                      <Text style={tabStyles.btnText}>Pay</Text>
                    </TouchableOpacity>
                  ) : st.type === 'remind' ? (
                    <TouchableOpacity style={[tabStyles.upiBtn, { backgroundColor: colors.status.warning }]} onPress={() => {
                      const msg = `Hey ${st.fromName}, just a reminder to pay me ${fmt(st.amount)} on Dabbu!`;
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                      Linking.openURL(whatsappUrl).catch(() => alertService.alert('Reminder', msg));
                    }}>
                      <AntDesign name="bells" size={14} color="#FFF" />
                      <Text style={tabStyles.btnText}>Remind</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </>
          )}
          <TouchableOpacity style={[tabStyles.viewAll, { borderTopColor: colors.border.subtle }]} onPress={() => navigation.navigate('Settlement', { groupId })}>
            <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }]}>View all settlements</Text>
            <AntDesign name="right" size={14} color={colors.accent.primary} />
          </TouchableOpacity>
        </View>
      )}

      {type === 'trip' && expenses.length > 0 && (
        <View style={[tabStyles.card, { backgroundColor: colors.bg.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[tabStyles.iconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
              <AntDesign name="enviroment" size={20} color={colors.accent.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 15, fontWeight: '700', color: colors.text.primary }]}>{name}</Text>
              <Text style={[{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }]}>
                {members.length} member{members.length !== 1 ? 's' : ''} · {fmt(stats.totalSpent)} total
              </Text>
            </View>
          </View>
          {(() => {
            const dates = sortedExpenses.map((e: any) => new Date(e.date || e.expenseDate || e.createdAt).getTime()).filter((t: number) => !isNaN(t)).sort();
            if (dates.length === 0) return null;
            const firstDay = new Date(dates[0]);
            const lastDay = new Date(dates[dates.length - 1]);
            const days = Math.max(1, Math.round((lastDay.getTime() - firstDay.getTime()) / 86400000) + 1);
            return (
              <View style={tabStyles.tripStats}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[{ fontSize: 16, fontWeight: '800', color: colors.text.primary }]}>{days} days</Text>
                  <Text style={[{ fontSize: 11, marginTop: 2, color: colors.text.tertiary }]}>Duration</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[{ fontSize: 16, fontWeight: '800', color: colors.text.primary }]}>{expenses.length}</Text>
                  <Text style={[{ fontSize: 11, marginTop: 2, color: colors.text.tertiary }]}>Expenses</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[{ fontSize: 16, fontWeight: '800', color: colors.accent.primary }]}>{fmt(stats.totalSpent)}</Text>
                  <Text style={[{ fontSize: 11, marginTop: 2, color: colors.text.tertiary }]}>Total</Text>
                </View>
              </View>
            );
          })()}
        </View>
      )}

      {catEntries.length > 0 && (
        <View style={[tabStyles.card, { backgroundColor: colors.bg.card }]}>
          <Text style={tabStyles.sectionTitle}>Categories</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {catEntries.slice(0, 4).map(([cat, amt]) => {
              const pct = Math.round((amt as number / stats.totalSpent) * 100);
              return (
                <View key={cat as string} style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: `${colors.accent.primary}12` }]}>
                  <Text style={[{ fontSize: 12, fontWeight: '600', color: colors.accent.primary }]}>
                    {(cat as string).charAt(0).toUpperCase() + (cat as string).slice(1)} · {pct}%
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <TouchableOpacity style={[tabStyles.card, { backgroundColor: colors.bg.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        onPress={() => {
          if (!insightsOpen && insights.length === 0 && !insightsLoading) {
            setInsightsLoading(true);
            api.get<any[]>(`/shared-finance/groups/${groupId}/insights`)
              .then((res) => setInsights(Array.isArray(res) ? res : []))
              .catch(() => setInsights([]))
              .finally(() => setInsightsLoading(false));
          }
          setInsightsOpen(!insightsOpen);
        }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AntDesign name="bulb1" size={18} color={colors.status.warning} />
          <Text style={[{ fontSize: 14, fontWeight: '700', color: colors.text.primary }]}>AI Insights</Text>
        </View>
        <AntDesign name={(insightsOpen ? 'caretup' : 'caretdown') as any} size={18} color={colors.text.tertiary} />
      </TouchableOpacity>

      {insightsOpen && (
        <View style={[tabStyles.card, { backgroundColor: colors.bg.card }]}>
          {insightsLoading ? (
            <ActivityIndicator size="small" color={colors.accent.primary} style={{ marginVertical: 12 }} />
          ) : insights.length === 0 ? (
            <Text style={[{ fontSize: 13, color: colors.text.tertiary, textAlign: 'center', marginVertical: 12 }]}>
              No insights available yet. Add more expenses to get personalized recommendations.
            </Text>
          ) : (
            insights.slice(0, 5).map((insight: any, i: number) => {
              const sevColor = insight.severity === 'critical' ? '#EF4444' : insight.severity === 'warning' ? '#F59E0B' : insight.severity === 'success' ? '#10B981' : '#3B82F6';
              return (
                <View key={i} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12, borderLeftWidth: 3, marginBottom: 8, backgroundColor: `${sevColor}10`, borderLeftColor: sevColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontSize: 13, fontWeight: '700', color: colors.text.primary }]}>{insight.title}</Text>
                    <Text style={[{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }]}>{insight.message}</Text>
                  </View>
                  {insight.actionable && (
                    <TouchableOpacity style={[{ backgroundColor: sevColor, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }]}
                      onPress={() => {
                        if (insight.actionRoute === '/expenses/add') navigation.navigate('SharedExpenseForm', { groupId, edit: false });
                        else if (insight.actionRoute === '/settlements') navigation.navigate('Settlement', { groupId });
                      }}>
                      <Text style={[{ color: '#FFF', fontSize: 11, fontWeight: '700' }]}>{insight.actionLabel || 'Go'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      {recentActivity.length > 0 && (
        <View style={[tabStyles.card, { backgroundColor: colors.bg.card }]}>
          <Text style={tabStyles.sectionTitle}>Recent Activity</Text>
          {recentActivity.map((item: any) => {
            const typeColor = item.type === 'wallet' || item.type === 'expense_added' ? '#60A5FA'
              : item.type === 'member' || item.type === 'member_joined' ? '#34C759'
              : item.type?.includes('settlement') ? colors.status.warning
              : item.type === 'payment_completed' || item.type === 'settlement_confirmed' ? '#34C759'
              : colors.accent.primary;
            return (
              <View key={item.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderLeftWidth: 3, paddingLeft: 10, marginBottom: 2, borderLeftColor: typeColor }]}>
                <View style={[{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.tertiary }]}>
                  <AntDesign name={item.icon as any} size={16} color={colors.accent.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.text.primary }]}>{item.title}</Text>
                  <Text style={[{ fontSize: 12, marginTop: 2, color: colors.text.tertiary }]}>{item.detail}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const tabStyles = {
  panel: { gap: 12, flexGrow: 1 },
  heroCard: { borderRadius: 20, padding: 16 },
  heroHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 12 },
  heroTitle: { fontSize: 16, fontWeight: '800' as const },
  simplifyToggle: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 4 },
  settlementRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(128,128,128,0.15)' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center' as const, justifyContent: 'center' as const },
  avatarText: { color: '#FFF', fontSize: 13, fontWeight: '800' as const },
  upiBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  btnText: { color: '#FFF', fontSize: 11, fontWeight: '800' as const },
  viewAll: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 4, paddingTop: 12, marginTop: 4, borderTopWidth: 0.5 },
  card: { borderRadius: 18, padding: 16 },
  iconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const },
  tripStats: { flexDirection: 'row' as const, justifyContent: 'space-around' as const, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(128,128,128,0.15)' },
  sectionTitle: { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8, color: '#888' },
};
