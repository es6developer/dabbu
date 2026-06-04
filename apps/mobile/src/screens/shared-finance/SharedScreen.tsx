import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';

const SCREEN_WIDTH = Dimensions.get('window').width;

function moneyFormat(v: number | string | undefined | null): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return n < 0
    ? `-₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function listFromResponse(res: any): any[] {
  if (!res) {return [];}
  if (Array.isArray(res)) {return res;}
  if (res.items) {return Array.isArray(res.items) ? res.items : [];}
  return [];
}

export function SharedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuth();
  const { trackScreen, trackFeature } = useAnalytics();

  const [groups, setGroups] = useState<any[]>([]);
  const [expenseGroups, setExpenseGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (accessToken) {setAccessToken(accessToken);}
    try {
      const [sharedRes, expenseRes] = await Promise.allSettled([
        api.get<any>('/shared-finance/groups'),
        api.get<any>('/expense-groups'),
      ]);
      if (sharedRes.status === 'fulfilled') {
        setGroups(listFromResponse(sharedRes.value));
      }
      if (expenseRes.status === 'fulfilled') {
        setExpenseGroups(listFromResponse(expenseRes.value));
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      trackScreen('Shared');
      loadData();
    }, [loadData]),
  );

  const coupleFamilyGroups = groups.filter((g) => g.type === 'couple' || g.type === 'family');
  const otherGroups = groups.filter((g) => g.type !== 'couple' && g.type !== 'family');

  const typeColors: Record<string, string> = {
    couple: '#FF6B9D', family: '#5B5FE8', friends: '#00B894',
    trip: '#FDCB6E', roommates: '#F7892C', apartment: '#8A5CF6',
    office: '#6366F1', event: '#FF6B6B',
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Spaces</Text>
              <Text style={[styles.headerSub, { color: colors.text.tertiary }]}>
                {groups.length} shared group{groups.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => {
                trackFeature('Shared', 'create');
                navigation.navigate('Shared', { screen: 'CreateSharedGroup' });
              }}
            >
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 8 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.skeleton.base, height: i === 1 ? 160 : 100 }]} />
            ))}
          </View>
        ) : groups.length === 0 && expenseGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#5B5FE8', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIcon}
            >
              <Ionicons name="people" size={32} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No shared spaces yet</Text>
            <Text style={[styles.emptySub, { color: colors.text.tertiary }]}>
              Create a shared group to split expenses with friends, family, or roommates
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => navigation.navigate('Shared', { screen: 'CreateSharedGroup' })}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.emptyBtnText}>Create your first space</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Couple & Family Cards */}
            {coupleFamilyGroups.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>Family & Couple</Text>
                <View style={{ gap: 10, marginTop: 8 }}>
                  {coupleFamilyGroups.map((group) => {
                    const color = group.type === 'couple' ? '#FF6B9D' : '#5B5FE8';
                    const memberCount = group.members?.length || group._count?.members || 0;
                    return (
                      <TouchableOpacity
                        key={group.id}
                        style={[styles.groupCard, { backgroundColor: colors.bg.secondary }]}
                        activeOpacity={0.7}
                        onPress={() => {
                          trackFeature('Shared', 'open_group');
                          navigation.navigate('Shared', {
                            screen: group.type === 'couple' ? 'CoupleFinance' : 'FamilyDashboard',
                            params: { groupId: group.id },
                          });
                        }}
                      >
                        <LinearGradient
                          colors={[color, color + 'CC']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.groupGradient}
                        >
                          <Ionicons
                            name={group.type === 'couple' ? 'heart' : 'home'}
                            size={24}
                            color="#FFF"
                          />
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.groupName, { color: colors.text.primary }]}>
                            {group.name || group.title}
                          </Text>
                          <Text style={[styles.groupType, { color: colors.text.tertiary }]}>
                            {group.type === 'couple' ? 'Couple' : 'Family'} · {memberCount} member{memberCount !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Other Groups */}
            {otherGroups.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>Groups</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {otherGroups.map((group) => {
                    const color = typeColors[group.type] || colors.accent.primary;
                    const memberCount = group.members?.length || group._count?.members || 0;
                    return (
                      <TouchableOpacity
                        key={group.id}
                        style={[styles.horizontalCard, { backgroundColor: colors.bg.secondary }]}
                        activeOpacity={0.7}
                        onPress={() => {
                          trackFeature('Shared', 'open_group');
                          navigation.navigate('Shared', { screen: 'SharedGroupDetail', params: { groupId: group.id } });
                        }}
                      >
                        <View style={[styles.horizIcon, { backgroundColor: `${color}18` }]}>
                          <Ionicons name="people" size={22} color={color} />
                        </View>
                        <Text style={[styles.horizName, { color: colors.text.primary }]} numberOfLines={1}>
                          {group.name || group.title}
                        </Text>
                        <Text style={[styles.horizMeta, { color: colors.text.tertiary }]}>
                          {memberCount} members
                        </Text>
                        <View style={[styles.horizTag, { backgroundColor: `${color}18` }]}>
                          <Text style={[styles.horizTagText, { color }]}>{group.type}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Expense Spaces */}
            {expenseGroups.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>Expense Spaces</Text>
                <View style={{ gap: 10, marginTop: 8 }}>
                  {expenseGroups.slice(0, 5).map((space) => {
                    const color = typeColors[space.type] || colors.accent.primary;
                    return (
                      <TouchableOpacity
                        key={space.id}
                        style={[styles.groupCard, { backgroundColor: colors.bg.secondary }]}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('Accounts', { screen: 'GroupExpenses', params: { groupId: space.id } })}
                      >
                        <View style={[styles.spaceIcon, { backgroundColor: `${color}18` }]}>
                          <Ionicons name="layers" size={20} color={color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.groupName, { color: colors.text.primary }]}>{space.name}</Text>
                          <Text style={[styles.groupType, { color: colors.text.tertiary }]}>
                            {moneyFormat(space.totalAmount || space.balance || 0)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Quick Actions */}
            <View style={{ paddingHorizontal: 16, marginTop: 20, gap: 10 }}>
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: colors.bg.secondary }]}
                onPress={() => {
                  trackFeature('Shared', 'settlement');
                  navigation.navigate('Shared', { screen: 'Settlement' });
                }}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#00B89418' }]}>
                  <Ionicons name="swap-horizontal" size={20} color="#00B894" />
                </View>
                <Text style={[styles.qaText, { color: colors.text.primary }]}>Settlements</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: colors.bg.secondary }]}
                onPress={() => {
                  trackFeature('Shared', 'chat');
                  navigation.navigate('Shared', { screen: 'GroupChat' });
                }}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#74B9FF18' }]}>
                  <Ionicons name="chatbubbles" size={20} color="#74B9FF" />
                </View>
                <Text style={[styles.qaText, { color: colors.text.primary }]}>Group Chat</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: colors.bg.secondary }]}
                onPress={() => {
                  trackFeature('Shared', 'wallet');
                  navigation.navigate('Shared', { screen: 'GroupWallet' });
                }}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#FDCB6E18' }]}>
                  <Ionicons name="wallet" size={20} color="#FDCB6E" />
                </View>
                <Text style={[styles.qaText, { color: colors.text.primary }]}>Group Wallets</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  createBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },

  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    gap: 12,
  },
  groupGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: { fontSize: 15, fontWeight: '700' },
  groupType: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  horizontalCard: {
    width: 150,
    padding: 16,
    borderRadius: 18,
    marginRight: 10,
    alignItems: 'center',
    gap: 8,
  },
  horizIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  horizName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  horizMeta: { fontSize: 11, fontWeight: '500' },
  horizTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  horizTagText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  spaceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  qaIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  qaText: { flex: 1, fontSize: 14, fontWeight: '600' },

  skeletonCard: { borderRadius: 18, marginBottom: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingTop: 60, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
