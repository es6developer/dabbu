import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { spacing, borderRadius } from '../../theme/design';

export function ArchiveNotificationsScreen() {
  const { colors: c } = useTheme();
  const theme = { background: c.bg.primary, text: c.text.primary, card: c.bg.card, subtext: c.text.secondary, muted: c.text.tertiary, primary: c.accent.primary, border: c.border.subtle };
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchArchived = useCallback(async (pageNum = 1) => {
    try {
      const res = await api.get(`/notifications/archived?limit=${limit}&offset=${(pageNum - 1) * limit}`);
      const data = res.data || res;
      if (pageNum === 1) {
        setNotifications(data.data || []);
      } else {
        setNotifications(prev => [...prev, ...(data.data || [])]);
      }
      setTotal(data.total || 0);
    } catch (err) {
      console.warn('Failed to load archived:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchArchived(1); }, [fetchArchived]));

  const handleUnarchive = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/unarchive`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.notifCard, { backgroundColor: theme.card }]}>
      <View style={styles.notifHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.notifTitle, { color: theme.text }]}>{item.title}</Text>
          <Text style={[styles.notifTime, { color: theme.muted }]}>
            {new Date(item.createdAt).toLocaleDateString()} · {item.type}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleUnarchive(item.id)} style={styles.unarchiveBtn}>
          <AntDesign name="folder1" size={20} color={theme.primary}  />
        </TouchableOpacity>
      </View>
      {item.message ? <Text style={[styles.notifMsg, { color: theme.subtext }]}>{item.message}</Text> : null}
      {item.actionUrl && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => (navigation as any).navigate('NotificationCenter')}
        >
          <Text style={[styles.actionText, { color: theme.primary }]}>View Details</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Archived</Text>
        <Text style={[styles.headerSub, { color: theme.muted }]}>{total} notifications</Text>
      </View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <AntDesign name="folder1" size={64} color={theme.muted}  />
          <Text style={[styles.emptyText, { color: theme.muted }]}>No archived notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchArchived(1); }} />}
          onEndReached={() => {
            if (notifications.length < total) {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchArchived(nextPage);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 2 },
  notifCard: { borderRadius: 12, padding: 16, marginBottom: 8 },
  notifHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  notifTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  notifTime: { fontSize: 12 },
  unarchiveBtn: { padding: 8 },
  notifMsg: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  actionBtn: { marginTop: 8 },
  actionText: { fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 16, marginTop: 16 },
});
