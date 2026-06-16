import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useTheme } from '../../theme';

export function BillingHistoryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
        <ListSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign  name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>
          Billing History
        </Text>
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
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={{ padding: 16, gap: 10 }}
      >
        {payments.length === 0 ? (
          <View style={styles.emptyState}>
            <AntDesign  name="filetext1" size={48} color={colors.text.tertiary} />
            <Text style={{ fontSize: 14, color: colors.text.tertiary }}>
              No billing history yet
            </Text>
          </View>
        ) : (
          payments.map((p, i) => (
            <View
              key={p.id || i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.bg.secondary,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <View style={styles.paymentLeft}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                  ₹{Number(p.amount).toLocaleString('en-IN')}
                </Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>
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

const styles = {
  container: { flex: 1 } as const,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  } as const,
  paymentLeft: { gap: 4 } as const,
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 } as const,
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 } as const,
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  } as const,
};
