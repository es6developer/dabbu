import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

export function BillingHistoryScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadInvoices();
  }, [accessToken]);

  async function loadInvoices() {
    try {
      const res = await api.get<any>('/subscription/billing');
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  }

  function getStatusStyle(status: string) {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return { bg: `${colors.status.success}18`, color: colors.status.success };
      case 'pending':
      case 'processing':
        return { bg: `${colors.status.warning}18`, color: colors.status.warning };
      case 'failed':
      case 'refunded':
        return { bg: `${colors.status.error}18`, color: colors.status.error };
      default:
        return { bg: `${colors.text.tertiary}18`, color: colors.text.tertiary };
    }
  }

  if (loading) return <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}><ActivityIndicator color={colors.accent.primary} size="large" /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={invoices}
        keyExtractor={(inv) => inv.id || inv._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);
          return (
            <View style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={[styles.invoiceDate, { color: colors.text.primary }]}>{new Date(item.date || item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                  {item.description && <Text style={[styles.invoiceDesc, { color: colors.text.tertiary }]}>{item.description}</Text>}
                </View>
                <Text style={[styles.invoiceAmount, { color: colors.text.primary }]}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.cardFooter, { borderTopColor: colors.border.subtle }]}>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.color }]}>{item.status || 'unknown'}</Text>
                </View>
                {item.receiptUrl && (
                  <TouchableOpacity style={[styles.receiptBtn, { backgroundColor: `${colors.accent.primary}18` }]} onPress={() => Linking.openURL(item.receiptUrl)}>
                    <Text style={[styles.receiptBtnText, { color: colors.accent.primary }]}>View Receipt</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={invoices.length === 0 ? styles.emptyContainer : { padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No billing history</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>Your invoices will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 16, borderRadius: 16, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardLeft: { flex: 1, marginRight: 12 },
  invoiceDate: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  invoiceDesc: { fontSize: 13 },
  invoiceAmount: { fontSize: 18, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  receiptBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  receiptBtnText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, opacity: 0.5, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14 },
});
