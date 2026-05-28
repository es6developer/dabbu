import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

export function TransactionsListScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (accessToken) setAccessToken(accessToken);
      loadTransactions();
    }, [accessToken])
  );

  async function loadTransactions() {
    try {
      const res = await api.get<any>('/transactions');
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      setTransactions(data);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }

  const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN');

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator color={colors.accent.primary} size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadTransactions} tintColor={colors.accent.primary} />}
        contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : { paddingTop: 12, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isIncome = item.type === 'income' || item.transactionType === 'credit';
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.bg.secondary }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
            >
              <View style={[styles.iconWrap, { backgroundColor: isIncome ? `${colors.status.success}18` : `${colors.status.error}18` }]}>
                <Ionicons
                  name={isIncome ? 'arrow-down' : 'arrow-up'}
                  size={16}
                  color={isIncome ? colors.status.success : colors.status.error}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.description, { color: colors.text.primary }]} numberOfLines={1}>
                  {item.description || item.category?.name || 'Transaction'}
                </Text>
                <Text style={[styles.date, { color: colors.text.tertiary }]}>
                  {new Date(item.createdAt || item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.rightCol}>
                <Text style={[styles.amount, { color: isIncome ? colors.status.success : colors.status.error }]}>
                  {isIncome ? '+' : '-'}{formatCurrency(Number(item.amount))}
                </Text>
                {item.category && (
                  <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <Text style={[styles.badgeText, { color: colors.text.tertiary }]}>{item.category.name || item.category}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
              <Ionicons name="receipt-outline" size={40} color={colors.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No transactions</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>Tap the + button to add your first transaction</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('AddExpense')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 4, padding: 16, borderRadius: 18 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardInfo: { flex: 1 },
  description: { fontSize: 14, fontWeight: '600' },
  date: { fontSize: 11, marginTop: 3 },
  rightCol: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 5 },
  badgeText: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 12 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#f7892c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
});
