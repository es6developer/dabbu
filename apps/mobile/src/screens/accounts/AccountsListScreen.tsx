import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';

const TYPE_META: Record<string, { icon: string; color: string }> = {
  savings: { icon: 'wallet', color: '#00B894' },
  checking: { icon: 'creditcard', color: '#0984E3' },
  credit_card: { icon: 'creditcard', color: '#E17055' },
  cash: { icon: 'wallet', color: '#FDCB6E' },
  investment: { icon: 'linechart', color: '#f7892c' },
};

export function AccountsListScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadAccounts();
  }, [accessToken]);

  async function loadAccounts() {
    try {
      const res = await api.get<any>('/accounts');
      setAccounts(Array.isArray(res) ? res : []);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  const total = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ListSkeleton />
      </View>
    );
  }

  const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN');

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={accounts}
        keyExtractor={(a) => a.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadAccounts}
            tintColor={colors.accent.primary}
          />
        }
        ListHeaderComponent={
          <Card variant="glass" padding="2xl" style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              Total Balance
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.text.primary }]}>
              {formatCurrency(total)}
            </Text>
            <Text style={[styles.summarySub, { color: colors.text.tertiary }]}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </Text>
          </Card>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type] || { icon: 'wallet' as const, color: '#6B7280' };
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.bg.tertiary }]}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${meta.color}18` }]}>
                <AntDesign name={meta.icon as any} size={20} color={meta.color} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.text.primary }]}>{item.name}</Text>
                <Text style={[styles.cardType, { color: colors.text.tertiary }]}>
                  {item.type.replace('_', ' ')}
                </Text>
              </View>
              <View style={styles.rightCol}>
                <Text
                  style={[
                    styles.cardBalance,
                    { color: Number(item.balance) < 0 ? colors.status.error : colors.text.primary },
                  ]}
                >
                  {formatCurrency(Math.abs(Number(item.balance)))}
                </Text>
                <View
                  style={[
                    styles.accountBadge,
                    {
                      backgroundColor:
                        Number(item.balance) < 0
                          ? colors.status.errorLight
                          : colors.status.successLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.accountBadgeText,
                      {
                        color:
                          Number(item.balance) < 0 ? colors.status.error : colors.status.success,
                      },
                    ]}
                  >
                    {Number(item.balance) < 0 ? 'Overdrawn' : 'Active'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AntDesign  name="wallet" size={56} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Your accounts, one place
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Link your accounts or add transactions to get a complete view of your finances.
            </Text>
          </View>
        }
        windowSize={10}
        maxToRenderPerBatch={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { marginHorizontal: 16, marginTop: 16, marginBottom: 12 },
  summaryLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  summaryAmount: { fontSize: 34, fontWeight: '700', marginTop: 6, letterSpacing: -1 },
  summarySub: { fontSize: 13, fontWeight: '400', marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 16,
    borderRadius: 18,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardType: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  rightCol: { alignItems: 'flex-end' },
  cardBalance: { fontSize: 16, fontWeight: '700' },
  accountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  accountBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyDesc: { fontSize: 13 },
});
