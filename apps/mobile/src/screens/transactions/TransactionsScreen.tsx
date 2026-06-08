import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { SkeletonCard } from '../../components/ui/AnimatedSkeleton';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';

const SCREEN_WIDTH = Dimensions.get('window').width;

function moneyFormat(v: number | string | undefined | null): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return n < 0
    ? `-₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) {
    return '';
  }
  const date = new Date(d);
  const today = new Date();
  const diff = Math.ceil((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) {
    return 'Today';
  }
  if (diff === 1) {
    return 'Yesterday';
  }
  if (diff < 7) {
    return `${diff} days ago`;
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const FILTER_OPTIONS = ['All', 'Income', 'Expense', 'Transfer'];
const SORT_OPTIONS = ['Newest', 'Oldest', 'Highest', 'Lowest'];

export function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuth();
  const { trackScreen, trackFeature } = useAnalytics();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    try {
      const res = await api.get<any>('/transactions/stats');
      const txs = res?.recentTransactions || [];
      setTransactions(txs);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      trackScreen('Transactions');
      loadData();
    }, [loadData]),
  );

  const filtered = transactions.filter((tx) => {
    if (activeFilter === 'All') {
      return true;
    }
    if (activeFilter === 'Income') {
      return Number(tx.amount) > 0;
    }
    if (activeFilter === 'Expense') {
      return Number(tx.amount) <= 0;
    }
    return true;
  });

  const totalFiltered = filtered.reduce((s, tx) => s + Number(tx.amount), 0);
  const incomeTotal = filtered
    .filter((tx) => Number(tx.amount) > 0)
    .reduce((s, tx) => s + Number(tx.amount), 0);
  const expenseTotal = Math.abs(
    filtered.filter((tx) => Number(tx.amount) <= 0).reduce((s, tx) => s + Number(tx.amount), 0),
  );

  const handleDelete = (tx: any) => {
    Alert.alert('Delete Transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/transactions/${tx.id}`);
            setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
            trackFeature('Transaction', 'delete');
          } catch {
            /* ignore */
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isIncome = Number(item.amount) > 0;
    return (
      <TouchableOpacity
        style={[styles.txRow, { backgroundColor: colors.bg.secondary }]}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('Expense', {
            screen: 'TransactionDetail',
            params: { transactionId: item.id },
          })
        }
        onLongPress={() => handleDelete(item)}
      >
        <View style={[styles.txIcon, { backgroundColor: isIncome ? '#00B89418' : '#FF6B6B18' }]}>
          <Ionicons
            name={isIncome ? 'arrow-down' : 'arrow-up'}
            size={16}
            color={isIncome ? '#00B894' : '#FF6B6B'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.txName, { color: colors.text.primary }]} numberOfLines={1}>
            {item.description || item.category?.name || item.category || 'Transaction'}
          </Text>
          <Text style={[styles.txDate, { color: colors.text.tertiary }]}>
            {fmtDate(item.date || item.createdAt)}
            {item.category ? ` · ${item.category?.name || item.category}` : ''}
          </Text>
        </View>
        <Text style={[styles.txAmount, { color: isIncome ? '#00B894' : colors.text.primary }]}>
          {isIncome ? '+' : '-'}
          {moneyFormat(Math.abs(Number(item.amount)))}
        </Text>
      </TouchableOpacity>
    );
  };

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Transactions</Text>
            <Text style={[styles.headerSub, { color: colors.text.tertiary }]}>
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.filterToggle, { backgroundColor: colors.bg.secondary }]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options-outline" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Summary Bar */}
        <View style={[styles.summaryBar, { backgroundColor: colors.bg.secondary }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: '#00B894' }]}>
              {moneyFormat(incomeTotal)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>
              {moneyFormat(expenseTotal)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Net</Text>
            <Text
              style={[styles.summaryValue, { color: totalFiltered >= 0 ? '#00B894' : '#FF6B6B' }]}
            >
              {moneyFormat(totalFiltered)}
            </Text>
          </View>
        </View>

        <UpgradeBanner message="Upgrade for advanced filters, export & insights" />

        {/* Filter Chips */}
        {showFilters && (
          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      activeFilter === opt ? colors.accent.primary : colors.bg.tertiary,
                  },
                ]}
                onPress={() => setActiveFilter(opt)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: activeFilter === opt ? '#FFF' : colors.text.secondary },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="receipt-outline" size={48} color={colors.text.tertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Start tracking</Text>
          <Text style={[styles.emptySub, { color: colors.text.tertiary }]}>
            Add your first transaction to begin your financial journey with Dabbu.
          </Text>
          {activeFilter === 'All' && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => navigation.navigate('Expense', { screen: 'CreateTransaction' })}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.addBtnText}>Add Transaction</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor={colors.accent.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          windowSize={10}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  filterToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  summaryBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  summaryDivider: { width: 1, height: 28 },

  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  filterChipText: { fontSize: 13, fontWeight: '600' },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txName: { fontSize: 14, fontWeight: '600' },
  txDate: { fontSize: 11, marginTop: 1 },
  txAmount: { fontSize: 15, fontWeight: '700' },

  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 8 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 12,
  },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
