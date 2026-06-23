import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { Avatar } from '../ui/Avatar';
import { COUPLE_COLORS } from '../../hooks/useCoupleMode';

const W = Dimensions.get('window').width;

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function CoupleDashboard() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, fetchCoupleStatus } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const partner = user?.partner;
  const partnerName = partner
    ? `${partner.firstName || ''} ${partner.lastName || ''}`.trim() || partner.email
    : 'Partner';

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        await fetchCoupleStatus();
        const groups: any[] = await api.get('/shared-finance/groups');
        const coupleGroup = Array.isArray(groups)
          ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
          : null;
        if (coupleGroup) {
          const dashboard = await api.get<any>(
            `/shared-finance/groups/${coupleGroup.id}/couple/dashboard`,
          );
          setData({ ...(dashboard || {}), group: coupleGroup });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchCoupleStatus],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const myName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Me';
  const daysTogether = data?.group?.createdAt
    ? Math.floor((Date.now() - new Date(data.group.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={COUPLE_COLORS.primary}
        />
      }
    >
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.avatarRow}>
          <Avatar name={myName} size={52} />
          <View style={styles.heartWrap}>
            <AntDesign  name="hearto" size={22} color={COUPLE_COLORS.heart} />
          </View>
          <Avatar name={partnerName} size={52} />
        </View>
        <Text style={styles.welcomeTitle}>
          {myName} & {partnerName}
        </Text>
        {daysTogether > 0 && <Text style={styles.welcomeSub}>{daysTogether} days together</Text>}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('CoupleFinance')}
        >
          <View style={[styles.actionIcon, { backgroundColor: COUPLE_COLORS.primary }]}>
            <AntDesign  name="wallet" size={22} color="#FFF" />
          </View>
          <Text style={styles.actionLabel}>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('CoupleExpenses')}
        >
          <View style={[styles.actionIcon, { backgroundColor: COUPLE_COLORS.accent }]}>
            <AntDesign  name="creditcard" size={22} color="#FFF" />
          </View>
          <Text style={styles.actionLabel}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('CoupleGoals')}
        >
          <View style={[styles.actionIcon, { backgroundColor: COUPLE_COLORS.heart }]}>
            <AntDesign name="Trophy" size={22} color="#FFF"  />
          </View>
          <Text style={styles.actionLabel}>Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('CoupleBudgets')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FF9F43' }]}>
            <AntDesign  name="piechart" size={22} color="#FFF" />
          </View>
          <Text style={styles.actionLabel}>Budget</Text>
        </TouchableOpacity>
      </View>

      {/* Shared Balance */}
      <View style={[styles.balanceCard, { backgroundColor: COUPLE_COLORS.card }]}>
        <Text style={styles.balanceLabel}>Shared Balance</Text>
        <Text style={styles.balanceAmount}>
          {data?.combinedBalance ? fmt(data.combinedBalance) : '\u20B90'}
        </Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Income</Text>
            <Text style={[styles.balanceItemValue, { color: '#10B981' }]}>
              {data?.totalIncome ? fmt(data.totalIncome) : '\u20B90'}
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Spent</Text>
            <Text style={[styles.balanceItemValue, { color: COUPLE_COLORS.accent }]}>
              {data?.totalExpenses ? fmt(data.totalExpenses) : '\u20B90'}
            </Text>
          </View>
        </View>
      </View>

      {/* Partner Recent Activity */}
      <View style={[styles.activityCard, { backgroundColor: COUPLE_COLORS.card }]}>
        <View style={styles.activityHeader}>
          <AntDesign  name="hearto" size={18} color={COUPLE_COLORS.primary} />
          <Text style={[styles.activityTitle, { color: COUPLE_COLORS.text }]}>
            {partnerName}'s Recent Activity
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={COUPLE_COLORS.primary}
            style={{ marginVertical: 16 }}
          />
        ) : data?.partnerRecent ? (
          <View style={{ gap: 8 }}>
            {data.partnerRecent.slice(0, 3).map((item: any, i: number) => (
              <View key={i} style={styles.activityRow}>
                <View style={[styles.activityDot, { backgroundColor: COUPLE_COLORS.primary }]} />
                <Text
                  style={[styles.activityText, { color: COUPLE_COLORS.text }]}
                  numberOfLines={1}
                >
                  {item.description || item.title || 'Activity'}
                </Text>
                <Text style={[styles.activityAmount, { color: COUPLE_COLORS.textSecondary }]}>
                  {item.amount ? fmt(item.amount) : ''}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.activityEmpty, { color: COUPLE_COLORS.textTertiary }]}>
            No recent activity
          </Text>
        )}
      </View>

      {/* Couple Navigation Grid */}
      <View style={styles.grid}>
        {[
          { label: 'Incomes', icon: 'caretup', color: '#10B981', screen: 'CoupleIncome' },
          { label: 'Savings', icon: 'save', color: '#8B5CF6', screen: 'CoupleSavings' },
          { label: 'Bills', icon: 'calendar', color: '#FF9F43', screen: 'CoupleBills' },
          { label: 'Reports', icon: 'stats-chart', color: '#3B82F6', screen: 'CoupleReports' },
          {
            label: 'Settle Up',
            icon: 'swap',
            color: '#FF6B81',
            screen: 'CoupleSettlements',
          },
          { label: 'Settings', icon: 'settings', color: '#64748B', screen: 'CoupleSettings' },
        ].map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.gridIcon, { backgroundColor: `${item.color}20` }]}>
              <AntDesign name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={styles.gridLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  welcomeCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heartWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COUPLE_COLORS.heart}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COUPLE_COLORS.text,
    textAlign: 'center',
  },
  welcomeSub: {
    fontSize: 13,
    fontWeight: '500',
    color: COUPLE_COLORS.textSecondary,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: COUPLE_COLORS.card,
    borderRadius: 16,
    paddingVertical: 14,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COUPLE_COLORS.text,
  },
  balanceCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COUPLE_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: COUPLE_COLORS.text,
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COUPLE_COLORS.border,
  },
  balanceItem: { flex: 1 },
  balanceItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COUPLE_COLORS.textTertiary,
    textTransform: 'uppercase',
  },
  balanceItemValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  gridItem: {
    width: (W - 40) / 3,
    alignItems: 'center',
    gap: 8,
    backgroundColor: COUPLE_COLORS.card,
    borderRadius: 16,
    paddingVertical: 16,
  },
  gridIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COUPLE_COLORS.text,
  },
  activityCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  activityAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  activityEmpty: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
