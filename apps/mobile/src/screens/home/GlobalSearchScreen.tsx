import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function getCategoryIcon(cat: string): string {
  const map: Record<string, string> = {
    Food: 'rest',
    Transport: 'car',
    Shopping: 'shoppingcart',
    Bills: 'filetext1',
    Entertainment: 'playcircleo',
    Health: 'hearto',
    Education: 'book',
    Travel: 'calendar',
    Groceries: 'shoppingcart',
    Rent: 'home',
    Salary: 'wallet',
    Investment: 'caretup',
    Utilities: 'bulb1',
    Insurance: 'Safety',
    Dining: 'rest',
    Other: 'ellipsis1',
  };
  return map[cat] || ('ellipsis1' as any);
}

export function GlobalSearchScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{
    transactions: any[];
    groups: any[];
    bills: any[];
    goals: any[];
  }>({
    transactions: [],
    groups: [],
    bills: [],
    goals: [],
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (query.trim().length < 2) {
      setResults({ transactions: [], groups: [], bills: [], goals: [] });
      return;
    }
    debounceRef.current = setTimeout(() => performSearch(query.trim()), 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  async function performSearch(q: string) {
    setSearching(true);
    try {
      const [txRes, grpRes, billRes, goalRes] = await Promise.allSettled([
        api.get<any>(`/transactions/search?q=${encodeURIComponent(q)}`).catch(() => ({ data: [] })),
        api.get<any>(`/expense-groups`).catch(() => ({ data: [] })),
        api.get<any>(`/bills`).catch(() => ({ data: [] })),
        api.get<any>(`/goals`).catch(() => ({ data: [] })),
      ]);

      const transactions = (txRes as any).value?.data ?? (txRes as any).value ?? [];
      const groups = (grpRes as any).value?.data ?? (grpRes as any).value ?? [];
      const bills = (billRes as any).value?.data ?? (billRes as any).value ?? [];
      const goals = (goalRes as any).value?.data ?? (goalRes as any).value ?? [];

      const filteredGroups = Array.isArray(groups)
        ? groups.filter(
            (g: any) =>
              (g.name || '').toLowerCase().includes(q.toLowerCase()) ||
              (g.description || '').toLowerCase().includes(q.toLowerCase()),
          )
        : [];
      const filteredBills = Array.isArray(bills)
        ? bills.filter(
            (b: any) =>
              (b.name || b.title || '').toLowerCase().includes(q.toLowerCase()) ||
              (b.category || '').toLowerCase().includes(q.toLowerCase()),
          )
        : [];
      const filteredGoals = Array.isArray(goals)
        ? goals.filter((g: any) =>
            (g.name || g.title || '').toLowerCase().includes(q.toLowerCase()),
          )
        : [];

      setResults({
        transactions: Array.isArray(transactions) ? transactions : [],
        groups: filteredGroups,
        bills: filteredBills,
        goals: filteredGoals,
      });
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  }

  const totalResults =
    results.transactions.length +
    results.groups.length +
    results.bills.length +
    results.goals.length;

  function renderSection(
    title: string,
    icon: string,
    data: any[],
    renderItem: (item: any, i: number) => React.ReactNode,
  ) {
    if (data.length === 0) {
      return null;
    }
    return (
      <View style={{ marginTop: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <AntDesign name={icon as any} size={16} color={colors.text.tertiary} />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
          <Text style={[styles.sectionCount, { color: colors.text.tertiary }]}>
            ({data.length})
          </Text>
        </View>
        {data.slice(0, 5).map((item, i) => renderItem(item, i))}
        {data.length > 5 && (
          <Text style={[styles.moreText, { color: colors.accent.primary }]}>
            +{data.length - 5} more
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AntDesign  name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
          ]}
        >
          <AntDesign  name="search1" size={18} color={colors.text.tertiary} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text.primary }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search transactions, groups, bills..."
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <AntDesign  name="closecircleo" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {searching && (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
          </View>
        )}

        {!searching && query.trim().length >= 2 && totalResults === 0 && (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.default },
            ]}
          >
            <AntDesign  name="search1" size={48} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
              No results found
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Try a different search term
            </Text>
          </View>
        )}

        {!searching && query.trim().length < 2 && (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.default },
            ]}
          >
            <AntDesign  name="search1" size={48} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>Global Search</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Search across transactions, groups, bills, and goals
            </Text>
          </View>
        )}

        {!searching &&
          renderSection('Transactions', 'filetext1', results.transactions, (tx: any, i) => {
            const isIncome = tx.type === 'arrowdown';
            const txColor = isIncome ? colors.status.success : colors.status.error;
            const amount = Number(tx.amount || 0);
            return (
              <TouchableOpacity
                key={tx.id || i}
                style={[
                  styles.resultRow,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                ]}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('Expense', {
                    screen: 'TransactionDetail',
                    params: { transactionId: tx.id },
                  })
                }
              >
                <View style={[styles.resultIcon, { backgroundColor: `${txColor}12` }]}>
                  <AntDesign
                    name={getCategoryIcon(tx.category?.name || tx.category) as any}
                    size={16}
                    color={txColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.resultTitle, { color: colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {tx.description || tx.note || 'Transaction'}
                  </Text>
                  <Text style={[styles.resultSub, { color: colors.text.tertiary }]}>
                    {tx.category?.name || tx.category || 'Other'} ·{' '}
                    {new Date(tx.date || tx.createdAt).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                <Text style={[styles.resultAmount, { color: txColor }]}>
                  {isIncome ? '+' : '-'}
                  {fmt(amount)}
                </Text>
              </TouchableOpacity>
            );
          })}

        {!searching &&
          renderSection('Groups', 'team', results.groups, (g: any, i) => (
            <TouchableOpacity
              key={g.id || i}
              style={[
                styles.resultRow,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('Spaces', {
                  screen: 'SharedGroupDetail',
                  params: { groupId: g.id },
                })
              }
            >
              <View style={[styles.resultIcon, { backgroundColor: `${colors.accent.primary}12` }]}>
                <AntDesign  name="team" size={16} color={colors.accent.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.resultTitle, { color: colors.text.primary }]}
                  numberOfLines={1}
                >
                  {g.name}
                </Text>
                <Text style={[styles.resultSub, { color: colors.text.tertiary }]}>
                  {g.description || g.type || 'Group'}
                </Text>
              </View>
              <AntDesign  name="right" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          ))}

        {!searching &&
          renderSection('Bills', 'filetext1', results.bills, (b: any, i) => (
            <TouchableOpacity
              key={b.id || i}
              style={[
                styles.resultRow,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('Expense', { screen: 'BillDetail', params: { billId: b.id } })
              }
            >
              <View style={[styles.resultIcon, { backgroundColor: `${colors.status.warning}12` }]}>
                <AntDesign  name="filetext1" size={16} color={colors.status.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.resultTitle, { color: colors.text.primary }]}
                  numberOfLines={1}
                >
                  {b.name || b.title}
                </Text>
                <Text style={[styles.resultSub, { color: colors.text.tertiary }]}>
                  {b.category || 'Bill'} · Due:{' '}
                  {b.dueDate ? new Date(b.dueDate).toLocaleDateString('en-IN') : '—'}
                </Text>
              </View>
              <Text style={[styles.resultAmount, { color: colors.text.primary }]}>
                {fmt(Number(b.amount || 0))}
              </Text>
            </TouchableOpacity>
          ))}

        {!searching &&
          renderSection('Goals', 'flag', results.goals, (g: any, i) => {
            const saved = Number(g.savedAmount || g.saved || 0);
            const target = Number(g.targetAmount || g.target || 1);
            const pct = Math.min((saved / target) * 100, 100);
            return (
              <TouchableOpacity
                key={g.id || i}
                style={[
                  styles.resultRow,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                ]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('GoalDetail', { goalId: g.id })}
              >
                <View
                  style={[styles.resultIcon, { backgroundColor: `${colors.accent.primary}12` }]}
                >
                  <AntDesign  name="flag" size={16} color={colors.accent.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.resultTitle, { color: colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {g.name || g.title}
                  </Text>
                  <Text style={[styles.resultSub, { color: colors.text.tertiary }]}>
                    {fmt(saved)} of {fmt(target)} · {pct.toFixed(0)}%
                  </Text>
                </View>
                <View style={[styles.goalDot, { borderColor: colors.accent.primary }]}>
                  <Text style={[styles.goalDotText, { color: colors.accent.primary }]}>
                    {pct.toFixed(0)}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionCount: { fontSize: 13, fontWeight: '500' },
  moreText: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: { fontSize: 14, fontWeight: '600' },
  resultSub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  resultAmount: { fontSize: 14, fontWeight: '700' },
  goalDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalDotText: { fontSize: 10, fontWeight: '800' },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 60,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 },
});
