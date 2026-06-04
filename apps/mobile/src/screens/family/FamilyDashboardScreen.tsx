import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function FamilyDashboardScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadFamilies();
  }, [accessToken]);

  async function loadFamilies() {
    try {
      const res = await api.get<any>('/family');
      setFamilies(Array.isArray(res) ? res : []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator color={colors.accent.primary} size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={families}
        keyExtractor={(f) => f.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadFamilies} tintColor={colors.accent.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.bg.tertiary }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.accent.primary }]}>
                <Text style={styles.avatarText}>{item.name?.charAt(0) || 'F'}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.text.primary }]}>{item.name}</Text>
                <Text style={[styles.cardMeta, { color: colors.text.tertiary }]}>{item._count?.members || 0} members</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </View>
            <View style={[styles.cardActions, { borderTopColor: colors.border.subtle }]}>
              <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('FamilyChat')}>
                <View style={[styles.actionIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
                  <Ionicons name="chatbubbles" size={18} color={colors.accent.primary} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text.tertiary }]}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.action}>
                <View style={[styles.actionIcon, { backgroundColor: `${colors.status.info}15` }]}>
                  <Ionicons name="checkbox" size={18} color={colors.status.info} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text.tertiary }]}>Tasks</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.action}>
                <View style={[styles.actionIcon, { backgroundColor: `${colors.status.warning}15` }]}>
                  <Ionicons name="alarm" size={18} color={colors.status.warning} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text.tertiary }]}>Reminders</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.accent.primary}10` }]}>
              <Ionicons name="people-outline" size={44} color={colors.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No family group</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>Create a family to share reminders and tasks</Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]} onPress={() => navigation.navigate('CreateFamily')}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Create Family</Text>
            </TouchableOpacity>
          </View>
        }
        windowSize={10}
        maxToRenderPerBatch={10}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.accent.primary, bottom: insets.bottom + 100 }]} onPress={() => navigation.navigate('CreateFamily')}>
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { marginHorizontal: 16, marginVertical: 6, padding: 18, borderRadius: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 },
  action: { alignItems: 'center', gap: 4 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 100, gap: 12 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyDesc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  fab: { position: 'absolute', right: 24, width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#f7892c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
});
