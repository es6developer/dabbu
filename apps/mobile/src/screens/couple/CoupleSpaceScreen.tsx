import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';
import { PADDING, borderRadius, shadows, fabShadow } from '../../theme/design';

const { width } = Dimensions.get('window');

interface Props {
  onModulePress?: (routeName: string) => void;
}

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

const modules = [
  {
    key: 'CoupleIncome',
    icon: 'trending-up-outline',
    label: 'Income',
    desc: 'Add & manage income',
    color: '#34C759',
  },
  {
    key: 'CoupleExpenses',
    icon: 'cart-outline',
    label: 'Expenses',
    desc: 'Personal, shared & split',
    color: '#FF6B6B',
  },
  {
    key: 'CoupleBudgets',
    icon: 'wallet-outline',
    label: 'Budgets',
    desc: 'Monthly budget tracking',
    color: '#F59E0B',
  },
  {
    key: 'CoupleSavings',
    icon: 'save-outline',
    label: 'Savings',
    desc: 'Save together',
    color: '#60A5FA',
  },
  {
    key: 'CoupleGoals',
    icon: 'trophy-outline',
    label: 'Goals',
    desc: 'Shared wishlist & goals',
    color: '#A78BFA',
  },
  {
    key: 'CoupleBills',
    icon: 'calendar-outline',
    label: 'Bills',
    desc: 'Upcoming & recurring',
    color: '#FF8A65',
  },
  {
    key: 'CoupleSettlements',
    icon: 'cash-outline',
    label: 'Settle',
    desc: 'Balances & settle up',
    color: '#14B8A6',
  },
  {
    key: 'CoupleReports',
    icon: 'stats-chart-outline',
    label: 'Reports',
    desc: 'Spending insights',
    color: '#4F46E5',
  },
  {
    key: 'CoupleSettings',
    icon: 'settings-outline',
    label: 'Settings',
    desc: 'Preferences & profile',
    color: '#64748B',
  },
];

function ModuleCard({
  mod,
  colors,
  onPress,
}: {
  mod: (typeof modules)[0];
  colors: any;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
      style={{ width: (width - PADDING * 2 - 12) / 3 }}
    >
      <Animated.View
        style={{
          backgroundColor: colors.bg.card,
          borderRadius: 18,
          padding: 10,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          aspectRatio: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: `${mod.color}18`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={mod.icon as any} size={18} color={mod.color} />
        </View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text.primary }}>
          {mod.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function CoupleSpaceScreen({ onModulePress }: Props) {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coupleData, setCoupleData] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchCoupleData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        setError('No couple space found. Create a couple group to get started.');
        setCoupleData(null);
        return;
      }
      const dashboard = await api.get<any>(
        `/shared-finance/groups/${coupleGroup.id}/couple/dashboard`,
      );
      setCoupleData({ ...(dashboard || {}), group: coupleGroup });
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load couple data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupleData();
  }, [fetchCoupleData]);

  const goTo = (route: string) =>
    onModulePress ? onModulePress(route) : navigation.navigate(route);

  if (loading) {
    return <LoadingScreen />;
  }

  const p1 = coupleData?.profile?.partner1;
  const p2 = coupleData?.profile?.partner2;
  const group = coupleData?.group;
  const partnerStats = coupleData?.partnerStats;
  const savingsProgress = coupleData?.savingsProgress;
  const goals = coupleData?.goals || [];

  const partner1Name = p1?.firstName || 'Partner 1';
  const partner2Name = p2?.firstName || 'Partner 2';
  const p1Initial = partner1Name[0] || 'P';
  const p2Initial = partner2Name[0] || 'T';
  const totalPaid =
    (partnerStats?.partner1?.totalPaid || 0) + (partnerStats?.partner2?.totalPaid || 0);
  const daysTogether = group?.createdAt ? daysSince(group.createdAt) : 0;
  const togetherSince = group?.createdAt
    ? new Date(group.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '';
  const sharedBudget = coupleData?.sharedBudget;
  const budgetUsed = sharedBudget?.spent ?? 0;
  const budgetTotal = sharedBudget?.budget ?? 0;
  const budgetPct = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;
  const savingsAmount = savingsProgress?.saved ?? 0;
  const savingsTarget = savingsProgress?.goal ?? 0;
  const savingsPct =
    savingsProgress?.percentage ??
    (savingsTarget > 0 ? Math.round((savingsAmount / savingsTarget) * 100) : 0);

  if (error && !coupleData) {
    return (
      <View style={[s.root, { backgroundColor: colors.accent.primary }]}>
        <View style={[s.errorPanel, { paddingTop: insets.top + 50 }]}>
          <View style={{ paddingHorizontal: PADDING }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-back" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <Ionicons name="heart-dislike-outline" size={56} color="rgba(255,255,255,0.4)" />
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800' }}>No Couple Space</Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 20,
                paddingHorizontal: 40,
              }}
            >
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => fetchCoupleData()}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 14,
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCoupleData(true);
            }}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: colors.accent.primary,
            paddingTop: insets.top + 12,
            paddingBottom: 24,
            paddingHorizontal: PADDING,
            borderBottomLeftRadius: borderRadius.xl,
            borderBottomRightRadius: borderRadius.xl,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>Couple Space</Text>
            <TouchableOpacity
              onPress={() => goTo('CoupleSettings')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="settings-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.15)',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800' }}>{p1Initial}</Text>
              </View>
              <Ionicons name="heart" size={20} color="#FFEBB4" style={{ opacity: 0.8 }} />
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.15)',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800' }}>{p2Initial}</Text>
              </View>
            </View>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>
              {partner1Name} & {partner2Name}
            </Text>
            {togetherSince && (
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  fontWeight: '500',
                  marginTop: 4,
                }}
              >
                Together since {togetherSince}
              </Text>
            )}
          </View>
        </View>

        <UpgradeBanner message="Couple Space analytics & insights with Premium" />

        {/* Content */}
        <View style={{ paddingHorizontal: PADDING, paddingTop: 20, gap: 16 }}>
          {/* Hero Card */}
          <View
            style={{
              backgroundColor: colors.bg.card,
              borderRadius: borderRadius.xl,
              padding: 20,
              ...shadows.lg,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary }}>
                Total Shared Expenses
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 10,
                  backgroundColor: `${colors.accent.primary}10`,
                }}
              >
                <Ionicons name="calendar-outline" size={11} color={colors.accent.primary} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent.primary }}>
                  {daysTogether}d
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 34,
                fontWeight: '800',
                color: colors.text.primary,
                letterSpacing: -1.5,
                marginBottom: 14,
              }}
            >
              {fmt(totalPaid)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    marginBottom: 2,
                  }}
                >
                  {partner1Name}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.status.success }}>
                  +{fmt(partnerStats?.partner1?.totalPaid || 0)}
                </Text>
              </View>
              <View
                style={{
                  width: 1,
                  height: 36,
                  backgroundColor: colors.border.subtle,
                  marginHorizontal: 12,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    marginBottom: 2,
                  }}
                >
                  {partner2Name}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.status.success }}>
                  +{fmt(partnerStats?.partner2?.totalPaid || 0)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                {
                  icon: 'receipt-outline',
                  label: 'Expenses',
                  color: colors.accent.primary,
                  screen: 'CoupleExpenses',
                },
                {
                  icon: 'add-circle-outline',
                  label: 'Add',
                  color: colors.status.success,
                  screen: 'SharedExpenseForm',
                  params: { groupId: group?.id, edit: false },
                },
                {
                  icon: 'swap-horizontal-outline',
                  label: 'Settle',
                  color: colors.accent.secondary,
                  screen: 'CoupleSettlements',
                },
              ].map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={() =>
                    onModulePress
                      ? onModulePress(btn.screen)
                      : navigation.navigate(btn.screen, btn.params)
                  }
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    paddingVertical: 11,
                    borderRadius: 12,
                    backgroundColor: btn.color,
                  }}
                >
                  <Ionicons name={btn.icon as any} size={14} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Budget */}
          {budgetTotal > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => goTo('CoupleBudgets')}
              style={{
                backgroundColor: colors.bg.card,
                borderRadius: borderRadius.lg,
                padding: 18,
                ...shadows.md,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: `${colors.accent.primary}12`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="wallet-outline" size={18} color={colors.accent.primary} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                      Monthly Budget
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: colors.text.tertiary,
                        marginTop: 1,
                      }}
                    >
                      {fmt(budgetTotal)} / month
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
              <View
                style={{
                  height: 8,
                  backgroundColor: colors.bg.tertiary,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    borderRadius: 4,
                    width: `${Math.min(budgetPct, 100)}%`,
                    backgroundColor: budgetPct > 80 ? colors.status.error : colors.accent.primary,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary }}>
                  {fmt(budgetUsed)} used
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: budgetPct > 80 ? colors.status.error : colors.text.tertiary,
                  }}
                >
                  {budgetPct}%
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Savings */}
          {savingsTarget > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => goTo('CoupleSavings')}
              style={{
                backgroundColor: colors.bg.card,
                borderRadius: borderRadius.lg,
                padding: 18,
                ...shadows.md,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: `${colors.status.success}15`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="save-outline" size={18} color={colors.status.success} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                      Savings Goal
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: colors.text.tertiary,
                        marginTop: 1,
                      }}
                    >
                      {fmt(savingsAmount)} of {fmt(savingsTarget)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
              <View
                style={{
                  height: 8,
                  backgroundColor: colors.bg.tertiary,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    borderRadius: 4,
                    width: `${Math.min(savingsPct, 100)}%`,
                    backgroundColor: colors.status.success,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary }}>
                  {savingsPct}% completed
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Modules Grid */}
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: colors.text.primary,
                marginBottom: 14,
                letterSpacing: -0.3,
              }}
            >
              All Modules
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {modules.map((mod) => (
                <ModuleCard key={mod.key} mod={mod} colors={colors} onPress={() => goTo(mod.key)} />
              ))}
            </View>
          </View>

          {/* Goals */}
          {goals.length > 0 && (
            <View
              style={{
                backgroundColor: colors.bg.card,
                borderRadius: borderRadius.lg,
                padding: 18,
                ...shadows.md,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: `${colors.accent.primary}12`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="gift-outline" size={18} color={colors.accent.primary} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                    Shared Wishlist
                  </Text>
                </View>
                <TouchableOpacity onPress={() => goTo('CoupleGoals')}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>
                    View All
                  </Text>
                </TouchableOpacity>
              </View>
              {goals.slice(0, 3).map((item: any, i: number) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 6,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 10,
                      backgroundColor: `${colors.accent.primary}10`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="gift-outline" size={14} color={colors.accent.primary} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                    {item.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() =>
          onModulePress
            ? onModulePress('SharedExpenseForm')
            : navigation.navigate('SharedExpenseForm', { groupId: group?.id, edit: false })
        }
        style={[s.fab, { backgroundColor: colors.accent.primary }, fabShadow]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  errorPanel: { flex: 1 },
  fab: {
    position: 'absolute',
    right: PADDING,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
