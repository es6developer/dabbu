import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';
import { spacing } from '../../theme/design';
import { api } from '../../services/api';

const FILTERS = ['All', 'Income', 'Expense', 'Shared', 'Bills'];

function fmt(v: number) {
  const n = v || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function TransactionsList() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState('All');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false, refresh = false) => {
    if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
    try {
      const res = await api.get('/transactions?limit=50');
      setTransactions(Array.isArray(res) ? res : (res as any)?.data || []);
    } catch {
      // handled by empty state
    } finally {
      if (refresh) setRefreshing(false); else setLoading(false);
    }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { loadData(!isInitial); }, [loadData]));

  const filtered = transactions.filter((tx: any) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Income') return tx.type === 'arrowdown';
    if (activeFilter === 'Expense') return tx.type === 'wallet' || tx.type === 'expense';
    if (activeFilter === 'Shared') return tx.shared === true;
    return true;
  });

  const now = new Date();
  const monthlyTxns = transactions.filter((t: any) => {
    const d = new Date(t.date || t.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyIncome = monthlyTxns.filter((t: any) => t.type === 'arrowdown').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const monthlyExpense = monthlyTxns.filter((t: any) => t.type === 'wallet' || t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

  if (loading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(false, true)} tintColor={colors.accent.primary} />}
      >
        {/* ── Header ──────────────────────────────── */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <AntDesign  name="left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text className="text-[17px] font-bold" style={{ color: colors.text.primary }}>
            Transactions
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => navigation.navigate('WalletTab', { screen: 'MyWallet', params: { search: '' } })}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bg.tertiary }}
            >
              <AntDesign  name="search1" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Filter Pills ────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: spacing.lg }}
          className="mb-4"
        >
          {FILTERS.map((f) => {
            const isActive = f === activeFilter;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.7}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: isActive
                    ? colors.accent.primary
                    : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : colors.bg.secondary,
                  borderWidth: 1,
                  borderColor: isActive
                    ? 'transparent'
                    : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : colors.border.default,
                }}
              >
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: isActive ? '#FFFFFF' : colors.text.secondary }}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Monthly Summary ─────────────────────── */}
        {monthlyTxns.length > 0 && (
          <View className="mx-5 mb-4">
            <Card variant="default" padding="lg">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[13px] font-medium" style={{ color: colors.text.secondary }}>
                  {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
                <View className="flex-row items-center gap-1">
                  <AntDesign  name="calendar" size={13} color={colors.text.tertiary} />
                  <Text className="text-[11px] font-medium" style={{ color: colors.text.tertiary }}>
                    This Month
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-[11px] font-medium" style={{ color: colors.text.secondary }}>
                    Income
                  </Text>
                  <Text className="text-[18px] font-bold mt-0.5" style={{ color: '#10B981' }}>
                    {fmt(monthlyIncome)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-medium" style={{ color: colors.text.secondary }}>
                    Spent
                  </Text>
                  <Text
                    className="text-[18px] font-bold mt-0.5"
                    style={{ color: colors.text.primary }}
                  >
                    {fmt(monthlyExpense)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-medium" style={{ color: colors.text.secondary }}>
                    Saved
                  </Text>
                  <Text className="text-[18px] font-bold mt-0.5" style={{ color: '#10B981' }}>
                    {fmt(monthlyIncome - monthlyExpense)}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* ── Transaction List ─────────────────────── */}
        <View className="mx-5 mb-8">
          {filtered.map((tx: any) => {
            const isExpense = tx.type === 'wallet' || tx.type === 'expense';
            return (
              <TouchableOpacity key={tx.id} onPress={() => navigation.navigate('WalletTab', { screen: 'TransactionDetail', params: { transactionId: tx.id } })} activeOpacity={0.7}>
                <Card variant="default" padding="md" style={{ marginBottom: spacing.lg }}>
                  <View className="flex-row items-center">
                    <View
                      className="w-11 h-11 rounded-xl items-center justify-center"
                      style={{
                        backgroundColor: isExpense ? 'rgba(239, 68, 68, 0.10)' : 'rgba(16, 185, 129, 0.10)',
                      }}
                    >
                      <AntDesign
                        name={isExpense ? 'down' : 'up'}
                        size={18}
                        color={isExpense ? '#EF4444' : '#10B981'}
                      />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text
                        className="text-[14px] font-semibold"
                        style={{ color: colors.text.primary }}
                      >
                        {tx.description || tx.name || 'Transaction'}
                      </Text>
                      <Text
                        className="text-[11px] font-medium mt-0.5"
                        style={{ color: colors.text.tertiary }}
                      >
                        {typeof tx.category === 'string' ? tx.category : tx.category?.name || ''}
                      </Text>
                    </View>
                    <Text
                      className="text-[15px] font-bold"
                      style={{ color: isExpense ? colors.text.primary : '#10B981' }}
                    >
                      {isExpense ? '-' : '+'}{fmt(Math.abs(Number(tx.amount || 0)))}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
          {filtered.length === 0 && (
            <View className="items-center py-20">
              <AntDesign name="wallet" size={48} color={colors.text.tertiary} />
              <Text className="text-[15px] font-semibold mt-4" style={{ color: colors.text.primary }}>No transactions found</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── FAB ────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => navigation.navigate('WalletTab', { screen: 'AddExpense' })}
        activeOpacity={0.8}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-2xl items-center justify-center"
        style={{
          backgroundColor: colors.accent.primary,
          shadowColor: colors.accent.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <AntDesign  name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
