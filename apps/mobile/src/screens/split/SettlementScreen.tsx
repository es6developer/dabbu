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

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  friends: { icon: 'people', color: '#6C3EF4' },
  couple: { icon: 'heart', color: '#FF6B9D' },
  family: { icon: 'home', color: '#34C759' },
  trip: { icon: 'airplane', color: '#F3D28F' },
  business: { icon: 'briefcase', color: '#F59E0B' },
};

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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
              const cfg = TYPE_CONFIG[g.type] || { icon: 'people', color: '#6C3EF4' };
              const members = g.members || [];
              const userMember = members.find((m: any) => m.balance !== undefined);

              return (
                <View key={g.id}>
                  <View style={[styles.groupHeader, { backgroundColor: colors.bg.card }]}>
                    <View style={[styles.groupAvatar, { backgroundColor: `${cfg.color}15` }]}>
                      <Ionicons name={`${cfg.icon}-outline` as any} size={20} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.groupName, { color: colors.text.primary }]}>{g.name}</Text>
                      <Text style={[styles.groupMemberCount, { color: colors.text.tertiary }]}>
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={[styles.groupTotal, { color: colors.text.secondary }]}>
                      {fmt(g.totalSpent || 0)}
                    </Text>
                  </View>

                  {members.filter((m: any) => m.balance !== 0).length > 0 ? (
                    members.filter((m: any) => m.balance !== 0).map((member: any, mi: number) => {
                      const balance = Number(member.balance || 0);
                      const isOwed = balance > 0;
                      const owes = balance < 0;
                      return (
                        <View
                          key={mi}
                          style={[styles.settlementCard, { backgroundColor: colors.bg.card }]}
                        >
                          <View style={styles.settlementLeft}>
                            <View style={[styles.settlementAvatar, { backgroundColor: isOwed ? '#34C75915' : '#FF4D4F15' }]}>
                              <Text style={[styles.settlementAvatarText, { color: isOwed ? '#34C759' : '#FF4D4F' }]}>
                                {member.name?.[0] || '?'}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.settlementName, { color: colors.text.primary }]}>
                                {member.name || 'Member'}
                              </Text>
                              <Text style={[styles.settlementLabel, { color: isOwed ? '#34C759' : '#FF4D4F' }]}>
                                {isOwed ? 'gets back' : 'owes'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.settlementRight}>
                            <Text style={[styles.settlementAmount, { color: isOwed ? '#34C759' : '#FF4D4F' }]}>
                              {fmt(Math.abs(balance))}
                            </Text>
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
                                <Text style={styles.payBtnText}>
                                  {owes ? 'Pay Now' : 'Request'}
                                </Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={[styles.settlementCard, { backgroundColor: colors.bg.card }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[styles.settlementAvatar, { backgroundColor: '#34C75915' }]}>
                          <Ionicons name="checkmark-circle" size={22} color="#34C759" />
                        </View>
                        <Text style={[styles.settlementName, { color: colors.text.secondary }]}>
                          All settled up
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
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
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, gap: 10,
    marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  groupAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  groupName: { fontSize: 14, fontWeight: '700' },
  groupMemberCount: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  groupTotal: { fontSize: 13, fontWeight: '700' },
  settlementCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 16, marginBottom: 8, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  settlementLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  settlementAvatar: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  settlementAvatarText: { fontSize: 16, fontWeight: '700' },
  settlementName: { fontSize: 14, fontWeight: '600' },
  settlementLabel: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  settlementRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settlementAmount: { fontSize: 16, fontWeight: '800' },
  payBtn: { borderRadius: 12, overflow: 'hidden' },
  payBtnGrad: { paddingHorizontal: 16, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  payBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14 },
});
