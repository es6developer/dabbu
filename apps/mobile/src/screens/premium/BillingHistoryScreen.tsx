import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';

export function BillingHistoryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await api.get<any[]>('/premium/billing');
      setPayments(data || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statusColors: Record<string, string> = {
    captured: '#00A86B',
    failed: '#FF5050',
    refunded: '#F5A623',
    created: '#7289DA',
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#F5A623" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#0A0A1A' }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Billing History</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#F5A623"
          />
        }
        contentContainerStyle={{ padding: 16, gap: 10 }}
      >
        {payments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyText}>No billing history yet</Text>
          </View>
        ) : (
          payments.map((p, i) => (
            <View key={p.id || i} style={styles.paymentCard}>
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentAmount}>
                  ₹{Number(p.amount).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.paymentDate}>
                  {p.paidAt
                    ? new Date(p.paidAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: (statusColors[p.status] || '#7289DA') + '20' },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColors[p.status] || '#7289DA' }]}>
                  {p.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },
  paymentLeft: { gap: 4 },
  paymentAmount: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  paymentDate: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
});
