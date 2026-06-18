import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { fmt } from './groupUtils';

interface Props {
  balanceRows: any[];
  currentUser: any;
  stats: { totalSpent: number };
  expenses: any[];
  members: any[];
  colors: any;
  analyticsData?: any;
  analyticsLoading?: boolean;
}

function AvatarCircle({ name, size = 32 }: { name: string; size?: number }) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  const bgColors = ['#FF6B6B', '#34C759', '#38BDF8', '#FBBF24', '#A78BFA', '#F472B6', '#14B8A6', '#FF9F0A'];
  const colorIndex = (name?.length || 0) % bgColors.length;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColors[colorIndex], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.44, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color, marginVertical: 0 }} />;
}

export function GroupAnalyticsTab({ balanceRows, currentUser, stats, expenses, members, colors, analyticsData, analyticsLoading }: Props) {
  const myRow = balanceRows.find((r: any) => r.userId === currentUser?.id);
  const myPaid = myRow?.paid || 0;
  const myOwes = myRow?.owes || 0;
  const netBalance = myPaid - myOwes;

  const totalSpent = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  const sortedRows = [...balanceRows].sort((a, b) => (b.paid - b.owes) - (a.paid - a.owes));

  const creditors = sortedRows.filter(r => (r.paid - r.owes) > 0);
  const debtors = sortedRows.filter(r => (r.paid - r.owes) < 0);

  const settlements: { from: any; to: any; amount: number }[] = [];
  let remainingCreditors = creditors.map(r => ({ ...r, balance: r.paid - r.owes }));
  let remainingDebtors = debtors.map(r => ({ ...r, balance: -(r.paid - r.owes) }));

  let ci = 0, di = 0;
  while (ci < remainingCreditors.length && di < remainingDebtors.length) {
    const amt = Math.min(remainingCreditors[ci].balance, remainingDebtors[di].balance);
    if (amt > 1) {
      settlements.push({ from: remainingDebtors[di], to: remainingCreditors[ci], amount: Math.round(amt) });
    }
    remainingCreditors[ci].balance -= amt;
    remainingDebtors[di].balance -= amt;
    if (remainingCreditors[ci].balance < 1) ci++;
    if (remainingDebtors[di].balance < 1) di++;
  }

  const catData = analyticsData?.categoryTrends?.length > 0
    ? analyticsData.categoryTrends.map((c: any) => ({ name: c.category, amount: c.total, percentage: c.percentage }))
    : (() => {
        const cats: Record<string, number> = {};
        expenses.forEach((e: any) => {
          const name = e.category?.name || (typeof e.category === 'string' ? e.category : 'Other');
          cats[name] = (cats[name] || 0) + Number(e.amount || 0);
        });
        return Object.entries(cats).sort(([, a], [, b]) => b - a).map(([name, amount]) => ({ name, amount: Number(amount) }));
      })();

  const memberTotals = analyticsData?.memberSpending?.length > 0
    ? analyticsData.memberSpending.map((m: any) => ({ name: m.name, amount: m.totalPaid }))
    : (() => {
        const map: Record<string, { name: string; amount: number }> = {};
        expenses.forEach((e: any) => {
          const uid = e.paidBy;
          const member = members.find((m: any) => m.userId === uid);
          const name = member?.user?.firstName || member?.user?.email || 'Someone';
          if (!map[uid]) map[uid] = { name, amount: 0 };
          map[uid].amount += Number(e.amount || 0);
        });
        return Object.values(map).sort((a, b) => b.amount - a.amount);
      })();

  const monthData = (() => {
    const map: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const d = new Date(e.date || e.expenseDate || e.createdAt);
      const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      map[key] = (map[key] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).sort(([a], [b]) => {
      const [mA, yA] = a.split(' ');
      const [mB, yB] = b.split(' ');
      return parseInt(yA) - parseInt(yB) || new Date(`${mA} 1`).getMonth() - new Date(`${mB} 1`).getMonth();
    });
  })();

  const tc = colors.text;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={[s.card, { backgroundColor: colors.bg.card, shadowColor: colors.shadow }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AvatarCircle name={currentUser?.firstName || currentUser?.email || 'You'} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: tc.tertiary, fontWeight: '500' }}>
              {netBalance >= 0 ? 'You are owed' : 'You owe'}
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: netBalance >= 0 ? '#34C759' : '#FF3B30', letterSpacing: -0.5 }}>
              {fmt(Math.abs(netBalance))}
            </Text>
          </View>
        </View>
      </View>

      {netBalance < 0 && settlements.length > 0 && (
        <View style={[s.card, { backgroundColor: colors.bg.card, shadowColor: colors.shadow }]}>
          <Text style={[s.sectionTitle, { color: tc.tertiary }]}>HOW TO SETTLE UP</Text>
          {settlements.filter(s => s.from.userId === currentUser?.id).map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}>
              <AvatarCircle name={s.to.name} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: tc.primary }}>
                  You owe <Text style={{ fontWeight: '700', color: '#FF3B30' }}>{fmt(s.amount)}</Text>
                </Text>
                <Text style={{ fontSize: 12, color: tc.tertiary }}>Pay <Text style={{ fontWeight: '600' }}>{s.to.name}</Text></Text>
              </View>
            </View>
          ))}
          {settlements.filter(s => s.from.userId !== currentUser?.id).map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}>
              <AvatarCircle name={s.from.name} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: tc.primary }}>
                  <Text style={{ fontWeight: '700', color: '#34C759' }}>{s.from.name}</Text> owes you {fmt(s.amount)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {netBalance >= 0 && settlements.filter(s => s.to.userId !== currentUser?.id).length > 0 && (
        <View style={[s.card, { backgroundColor: colors.bg.card, shadowColor: colors.shadow }]}>
          <Text style={[s.sectionTitle, { color: tc.tertiary }]}>WHO OWES YOU</Text>
          {settlements.filter(s => s.from.userId !== currentUser?.id).map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}>
              <AvatarCircle name={s.from.name} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: tc.primary }}>
                  <Text style={{ fontWeight: '700' }}>{s.from.name}</Text> owes you <Text style={{ fontWeight: '700', color: '#34C759' }}>{fmt(s.amount)}</Text>
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {sortedRows.length > 0 && (
        <View style={[s.card, { backgroundColor: colors.bg.card, shadowColor: colors.shadow }]}>
          <Text style={[s.sectionTitle, { color: tc.tertiary }]}>BALANCES</Text>
          {sortedRows.map((r, i) => {
            const bal = r.paid - r.owes;
            return (
              <View key={r.userId}>
                {i > 0 && <Divider color={colors.border.subtle} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}>
                  <AvatarCircle name={r.name} size={32} />
                  <Text style={{ fontSize: 14, color: tc.primary, flex: 1 }} numberOfLines={1}>{r.name}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: bal >= 0 ? '#34C759' : '#FF3B30' }}>
                    {bal >= 0 ? '+' : ''}{fmt(Math.round(bal))}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={[s.card, { backgroundColor: colors.bg.card, shadowColor: colors.shadow }]}>
        <Text style={[s.sectionTitle, { color: tc.tertiary }]}>TOTAL SPENDING</Text>
        <Text style={{ fontSize: 32, fontWeight: '800', color: tc.primary, letterSpacing: -0.5 }}>{fmt(totalSpent)}</Text>
        <Text style={{ fontSize: 12, color: tc.tertiary, marginTop: 2 }}>{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</Text>
      </View>

      {analyticsData?.healthScore != null && (
        <View style={[s.card, { backgroundColor: colors.bg.card, shadowColor: colors.shadow }]}>
          <Text style={[s.sectionTitle, { color: tc.tertiary }]}>GROUP HEALTH</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: tc.primary }}>
              {analyticsData.healthScore}
              <Text style={{ fontSize: 14, fontWeight: '500', color: tc.tertiary }}>/100</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#34C759' }}>{analyticsData.settlementScore}%</Text>
                <Text style={{ fontSize: 10, color: tc.tertiary }}>settled</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#F59E0B' }}>{Math.round(analyticsData.fairnessScore * 100)}%</Text>
                <Text style={{ fontSize: 10, color: tc.tertiary }}>fairness</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {analyticsLoading && (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
        </View>
      )}

      {catData.length > 0 && (
        <View style={[s.card, { backgroundColor: colors.bg.card, shadowColor: colors.shadow }]}>
          <Text style={[s.sectionTitle, { color: tc.tertiary }]}>CATEGORIES</Text>
          {catData.map((d: any, i: number) => (
            <View key={d.name}>
              {i > 0 && <Divider color={colors.border.subtle} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 }}>
                <Text style={{ fontSize: 14, color: tc.primary, flex: 1 }}>{d.name}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: tc.primary }}>{fmt(d.amount)}</Text>
                <Text style={{ fontSize: 12, color: tc.tertiary, minWidth: 36, textAlign: 'right' }}>
                  {totalSpent > 0 ? Math.round((d.amount / totalSpent) * 100) : 0}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {memberTotals.length > 0 && (
        <View style={[s.card, { backgroundColor: colors.bg.card, shadowColor: colors.shadow }]}>
          <Text style={[s.sectionTitle, { color: tc.tertiary }]}>WHO PAID WHAT</Text>
          {memberTotals.map((d: any, i: number) => (
            <View key={d.name}>
              {i > 0 && <Divider color={colors.border.subtle} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}>
                <AvatarCircle name={d.name} size={32} />
                <Text style={{ fontSize: 14, color: tc.primary, flex: 1 }}>{d.name}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: tc.primary }}>{fmt(d.amount)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {monthData.length > 0 && (
        <View style={[s.card, { backgroundColor: colors.bg.card, shadowColor: colors.shadow }]}>
          <Text style={[s.sectionTitle, { color: tc.tertiary }]}>MONTHLY TREND</Text>
          {monthData.map(([name, amount], i) => (
            <View key={name}>
              {i > 0 && <Divider color={colors.border.subtle} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 }}>
                <Text style={{ fontSize: 14, color: tc.primary, flex: 1 }}>{name}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: tc.primary }}>{fmt(amount)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
});
