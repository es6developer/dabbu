import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/design';

export function BillingHistoryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      const data = await api.get<any>(`/premium/billing?page=${pageNum}&limit=20`);
      const items = data?.data || data || [];
      if (append) {
        setPayments(prev => [...prev, ...items]);
      } else {
        setPayments(items);
      }
      setTotalPages(data?.totalPages || 1);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const loadMore = () => {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      load(nextPage, true);
    }
  };

  const statusColors: Record<string, string> = {
    captured: '#00A86B', failed: '#FF5050', refunded: '#F5A623',
    created: '#7289DA', paid: '#00A86B', pending: '#F5A623',
  };

  const statusIcons: Record<string, any> = {
    captured: 'checkcircle', failed: 'closecircle', refunded: 'exclamationcircle',
    paid: 'checkcircle', pending: 'clockcircleo',
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A1A', paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A1A' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <AntDesign name="left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
          Billing History
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(1); load(); }} tintColor="#FFD700" />
        }
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        onMomentumScrollEnd={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
            loadMore();
          }
        }}
      >
        {payments.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 }}>
            <AntDesign name="filetext1" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>No billing history yet</Text>
          </View>
        ) : (
          payments.map((p, i) => (
            <View key={p.id || i} style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: (statusColors[p.status] || '#7289DA') + '20',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <AntDesign name={statusIcons[p.status] || 'question'} size={16} color={statusColors[p.status] || '#7289DA'} />
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                    ₹{Number(p.amount).toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    {p.paidAt
                      ? new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {p.method ? ` • ${p.method.toUpperCase()}` : ''}
                  </Text>
                </View>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: (statusColors[p.status] || '#7289DA') + '20' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: statusColors[p.status] || '#7289DA' }}>
                  {(p.status || 'UNKNOWN').toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}
        {loadingMore && (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#FFD700" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
