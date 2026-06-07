import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useApiGet } from '../../hooks/useApi';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const TYPE_ICONS: Record<string, string> = {
  friends: 'people', couple: 'heart', family: 'home', trip: 'airplane', business: 'briefcase',
};

const TYPE_COLORS: Record<string, string> = {
  friends: '#6C3EF4', couple: '#FF6B9D', family: '#34C759', trip: '#60A5FA', business: '#F59E0B',
};

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function groupTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    friends: 'Friends', couple: 'Couple', family: 'Family', trip: 'Trip', business: 'Business',
  };
  return labels[type] || type || 'Group';
}

export function SettlementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: groups, loading, refreshing, refresh } = useApiGet<any[]>('/shared-finance/groups');

  const groupId = route.params?.groupId;

  const settlementGroups = useMemo(() => {
    if (!groups) return [];
    const list = Array.isArray(groups) ? groups : [];
    if (groupId) return list.filter((g: any) => g.id === groupId);
    return list.filter((g: any) => g.status === 'ACTIVE');
  }, [groups, groupId]);

  if (loading) return <LoadingScreen />;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#6C3EF4" />}
      >
        <LinearGradient
          colors={['#6C3EF4', '#8B5CF6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settlements</Text>
            <View style={{ width: 32 }} />
          </View>
          <Text style={styles.headerSubtitle}>Settle up with your groups</Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
          {settlementGroups.length > 0 ? (
            settlementGroups.map((g: any) => {
              const typeColor = TYPE_COLORS[g.type] || '#6C3EF4';
              const icon = TYPE_ICONS[g.type] || 'people';
              const perPerson = g._count?.members > 0 ? Math.round(g.totalSpent / g._count.members) : 0;

              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.card, { backgroundColor: colors.bg.card }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('SharedGroupDetail', { groupId: g.id })}
                >
                  <View style={styles.cardLeft}>
                    <View style={[styles.avatar, { backgroundColor: `${typeColor}15` }]}>
                      <Ionicons name={`${icon}-outline` as any} size={22} color={typeColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.text.primary }]}>{g.name}</Text>
                      <Text style={[styles.cardSubtitle, { color: colors.text.tertiary }]}>
                        {groupTypeLabel(g.type)} · {g._count?.members || 0} members · Total: {fmt(g.totalSpent)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.payBtn}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('SharedGroupDetail', { groupId: g.id })}
                  >
                    <LinearGradient
                      colors={['#6C3EF4', '#8B5CF6']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.payBtnGrad}
                    >
                      <Text style={styles.payBtnText}>View</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: '#34C75915' }]}>
                <Ionicons name="checkmark-circle" size={40} color="#34C759" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>All settled up!</Text>
              <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>No pending settlements</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 20, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#6C3EF4' },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  cardAmount: { fontSize: 18, fontWeight: '800' },
  payBtn: { borderRadius: 14, overflow: 'hidden' },
  payBtnGrad: { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  payBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14 },
});
