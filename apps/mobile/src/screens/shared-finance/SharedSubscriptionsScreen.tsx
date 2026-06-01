import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const SERVICE_ICONS: Record<string, string> = {
  netflix: 'logo-netflix',
  spotify: 'logo-spotify',
  amazon: 'logo-amazon',
  youtube: 'logo-youtube',
  google: 'logo-google',
  apple: 'logo-apple',
  default: 'tv-outline',
};

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  if (isNaN(d.getTime())) {
    return 0;
  }
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function SharedSubscriptionsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const res = await api.get<any>('/shared-subscriptions');
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setSubscriptions(data);
      } catch (e: any) {
        // ignore
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  async function toggleContribution(subId: string, memberId: string, paid: boolean) {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.patch(`/shared-subscriptions/${subId}/members/${memberId}`, {
        paid: !paid,
      });
      await loadData(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update');
    }
  }

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ padding: 24, paddingTop: insets.top + 16, gap: 16 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width={180} height={28} style={{ marginTop: 4 }} />
          <Skeleton width="100%" height={140} borderRadius={20} />
          <Skeleton width="100%" height={140} borderRadius={20} />
          <Skeleton width="100%" height={140} borderRadius={20} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={[s.subtitle, { color: colors.text.tertiary }]}>Shared Finance</Text>
            <Text style={[s.title, { color: colors.text.primary }]}>Subscriptions</Text>
          </View>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: colors.accent.primary }]}
            onPress={() => Alert.alert('Add Subscription', 'Form coming soon')}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {subscriptions.length === 0 ? (
          <View style={s.empty}>
            <LinearGradient
              colors={[`${colors.accent.primary}20`, `${colors.accent.secondary}20`]}
              style={s.emptyIcon}
            >
              <Ionicons name="tv-outline" size={44} color={colors.accent.primary} />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>
              No shared subscriptions
            </Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              Add subscriptions you share with your group
            </Text>
            <TouchableOpacity
              style={[s.emptyCta, { backgroundColor: colors.accent.primary }]}
              onPress={() => Alert.alert('Add Subscription', 'Form coming soon')}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={s.emptyCtaText}>Add Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.list}>
            {subscriptions.map((sub) => {
              const iconName = SERVICE_ICONS[sub.service?.toLowerCase()] || SERVICE_ICONS.default;
              const nextBillingDays = sub.nextBillingDate ? daysUntil(sub.nextBillingDate) : 0;
              const members = Array.isArray(sub.members) ? sub.members : [];
              const paidCount = members.filter((m: any) => m.paid).length;
              return (
                <LinearGradient
                  key={sub.id}
                  colors={[colors.bg.secondary, colors.bg.tertiary]}
                  style={s.subCard}
                >
                  <View style={s.subTop}>
                    <LinearGradient colors={[...colors.accent.gradient]} style={s.subIcon}>
                      <Ionicons name={iconName as any} size={22} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.subName, { color: colors.text.primary }]}>
                        {sub.name || sub.service || 'Subscription'}
                      </Text>
                      <Text style={[s.subProvider, { color: colors.text.tertiary }]}>
                        {sub.provider || sub.service}
                      </Text>
                    </View>
                    <View style={s.subAmountRow}>
                      <Text style={[s.subAmount, { color: colors.text.primary }]}>
                        {fmt(sub.amount || 0)}
                      </Text>
                      <Text style={[s.subPeriod, { color: colors.text.tertiary }]}>
                        /{sub.billingCycle || 'mo'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.subMeta}>
                    <View style={s.subMetaItem}>
                      <Ionicons name="calendar-outline" size={14} color={colors.text.tertiary} />
                      <Text style={[s.subMetaText, { color: colors.text.tertiary }]}>
                        {nextBillingDays > 0
                          ? `Next billing in ${nextBillingDays}d`
                          : nextBillingDays === 0
                            ? 'Due today'
                            : `Overdue by ${Math.abs(nextBillingDays)}d`}
                      </Text>
                    </View>
                    <View style={s.subMetaItem}>
                      <Ionicons name="person-outline" size={14} color={colors.text.tertiary} />
                      <Text style={[s.subMetaText, { color: colors.text.tertiary }]}>
                        {sub.paidBy ? `${sub.paidByName || 'Someone'} pays` : 'Who pays?'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.contributionSection}>
                    <Text style={[s.contributionLabel, { color: colors.text.tertiary }]}>
                      Contributions ({paidCount}/{members.length} paid)
                    </Text>
                    <View style={s.contributionChips}>
                      {members.map((m: any) => (
                        <TouchableOpacity
                          key={m.id}
                          style={[
                            s.contributionChip,
                            {
                              backgroundColor: m.paid
                                ? `${colors.status.success}20`
                                : `${colors.status.warning}15`,
                              borderColor: m.paid
                                ? `${colors.status.success}40`
                                : `${colors.status.warning}30`,
                            },
                          ]}
                          onPress={() => toggleContribution(sub.id, m.memberId || m.id, m.paid)}
                        >
                          <Ionicons
                            name={m.paid ? 'checkmark-circle' : 'time-outline'}
                            size={14}
                            color={m.paid ? colors.status.success : colors.status.warning}
                          />
                          <Text
                            style={[
                              s.contributionName,
                              {
                                color: m.paid ? colors.status.success : colors.status.warning,
                              },
                            ]}
                          >
                            {m.name || 'Member'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </LinearGradient>
              );
            })}
          </View>
        )}

        {subscriptions.length > 0 && (
          <TouchableOpacity
            style={[s.fabBtn, { backgroundColor: colors.accent.primary }]}
            onPress={() => Alert.alert('Add Subscription', 'Form coming soon')}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={s.fabBtnText}>Add Subscription</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 20, gap: 12 },
  subCard: { borderRadius: 20, padding: 18, gap: 14 },
  subTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subName: { fontSize: 16, fontWeight: '700' },
  subProvider: { fontSize: 12, marginTop: 2 },
  subAmountRow: { alignItems: 'flex-end' },
  subAmount: { fontSize: 18, fontWeight: '800' },
  subPeriod: { fontSize: 11 },
  subMeta: { gap: 4 },
  subMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subMetaText: { fontSize: 12 },
  contributionSection: { gap: 8 },
  contributionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contributionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  contributionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  contributionName: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 48 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyCtaText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  fabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 16,
  },
  fabBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
