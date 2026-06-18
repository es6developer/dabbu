import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { usePremium } from '../../store/PremiumContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

export function SubscriptionCenterScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    subscription,
    loading,
    refreshSubscription,
    getUsage,
    usage,
    cancelSubscription,
    reactivateSubscription,
    restorePurchases,
    checkLimit,
  } = usePremium();

  const [refreshing, setRefreshing] = useState(false);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSubscription();
      getUsage();
      loadBillingHistory();
    }, [])
  );

  const loadBillingHistory = async () => {
    setBillingLoading(true);
    setInvoicesLoading(true);
    try {
      const [billingData, invoicesData] = await Promise.all([
        api.get<any[]>('/premium/billing'),
        api.get<any[]>('/premium/invoices'),
      ]);
      setBillingHistory((billingData || []).slice(0, 5));
      setInvoices((invoicesData?.data || invoicesData || []).slice(0, 3));
    } catch {
      // silent
    } finally {
      setBillingLoading(false);
      setInvoicesLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshSubscription(), getUsage(), loadBillingHistory()]);
    setRefreshing(false);
  };

  const handleCancel = () => {
    navigation.navigate('Cancellation');
  };

  const handleReactivate = async () => {
    setProcessing(true);
    try {
      await reactivateSubscription();
      Alert.alert('Reactivated!', 'Your subscription has been reactivated.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reactivate');
    } finally {
      setProcessing(false);
    }
  };

  const handleChangePlan = () => {
    navigation.navigate('Premium');
  };

  const isActive = subscription?.status === 'active';
  const isCancelled = subscription?.cancelAtPeriodEnd;
  const endDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const usageBars = [
    { key: 'family_hubs', label: 'Family Hubs', icon: 'home' },
    { key: 'goals', label: 'Goals', icon: 'flag' },
    { key: 'budgets', label: 'Budgets', icon: 'piechart' },
  ];

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Active', color: colors.status.success, bg: `${colors.status.success}15` },
    cancelled: { label: 'Cancelled', color: colors.status.error, bg: `${colors.status.error}15` },
    past_due: { label: 'Past Due', color: colors.status.warning, bg: `${colors.status.warning}15` },
    paused: { label: 'Paused', color: colors.text.tertiary, bg: `${colors.text.tertiary}15` },
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <View style={{ padding: spacing['2xl'], gap: spacing.lg }}>
          <Skeleton height={180} borderRadius={20} />
          <Skeleton height={80} borderRadius={16} />
          <Skeleton height={80} borderRadius={16} />
          <Skeleton height={120} borderRadius={16} />
        </View>
      </View>
    );
  }

  const status = isCancelled ? 'cancelled' : (subscription?.status || 'inactive');
  const statusInfo = statusConfig[status] || { label: 'Inactive', color: colors.text.tertiary, bg: colors.bg.tertiary };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AntDesign name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, gap: spacing.lg, paddingHorizontal: spacing.lg }}>

          {/* Current Plan Card */}
          <LinearGradient
            colors={['#1F1A3A', '#2E1A47']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.planCard}
          >
            <View style={styles.planCardTop}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>
                  {subscription?.plan?.name || 'Premium'}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
              </View>
              {isActive && !isCancelled && (
                <View style={[styles.priceTag, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={styles.priceValue}>
                    ₹{subscription?.plan?.amount || subscription?.amount || 0}
                  </Text>
                  <Text style={styles.pricePeriod}>
                    /{subscription?.plan?.interval || 'mo'}
                  </Text>
                </View>
              )}
            </View>

            {endDate && (
              <View style={styles.planCardBottom}>
                <AntDesign name="calendar" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.planDate}>
                  {isCancelled ? 'Access until ' : 'Renewal: '}
                  {endDate}
                </Text>
              </View>
            )}

            {isCancelled && (
              <View style={[styles.planWarning, { backgroundColor: `${colors.status.warning}20` }]}>
                <AntDesign name="exclamationcircle" size={14} color={colors.status.warning} />
                <Text style={[styles.planWarningText, { color: colors.status.warning }]}>
                  Cancellation scheduled. Your subscription will end on {endDate}.
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Payment Method */}
          <View style={[styles.usageCard, { backgroundColor: colors.bg.card }]}>
            <View style={styles.usageHeader}>
              <View style={styles.usageLeft}>
                <View style={[styles.usageIcon, { backgroundColor: `${colors.accent.primary}10` }]}>
                  <AntDesign name="creditcard" size={16} color={colors.accent.primary} />
                </View>
                <Text style={[styles.usageLabel, { color: colors.text.primary }]}>Payment Method</Text>
              </View>
              <Text style={[styles.usageCount, { color: colors.text.secondary }]}>
                {subscription?.paymentMethod || (isActive ? 'AutoPay' : '—')}
              </Text>
            </View>
          </View>

          {/* Usage Progress */}
          {usageBars.map(({ key, label, icon }) => {
            const current = usage[key] || 0;
            const limit = 3;
            const progress = Math.min(current / limit, 1);
            const isUnlimited = subscription?.plan?.code !== 'FREE';

            return (
              <View key={key} style={[styles.usageCard, { backgroundColor: colors.bg.card }]}>
                <View style={styles.usageHeader}>
                  <View style={styles.usageLeft}>
                    <View style={[styles.usageIcon, { backgroundColor: `${colors.accent.primary}10` }]}>
                      <AntDesign name={icon as any} size={16} color={colors.accent.primary} />
                    </View>
                    <Text style={[styles.usageLabel, { color: colors.text.primary }]}>{label}</Text>
                  </View>
                  <Text style={[styles.usageCount, { color: colors.text.secondary }]}>
                    {isUnlimited ? 'Unlimited' : `${current}/${limit}`}
                  </Text>
                </View>
                {!isUnlimited && (
                  <View style={[styles.progressBar, { backgroundColor: colors.bg.tertiary }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progress * 100}%`,
                          backgroundColor: progress >= 0.8 ? colors.status.error : colors.accent.primary,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            );
          })}

          {/* Premium Features */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Premium Features
            </Text>
            <View style={[styles.featureCard, { backgroundColor: colors.bg.card }]}>
              {[
                { icon: 'linechart', label: 'Full Reports', enabled: isActive },
                { icon: 'bulb1', label: 'AI Insights', enabled: isActive },
                { icon: 'message1', label: 'AI Coach', enabled: isActive },
                { icon: 'download', label: 'Export (PDF/Excel)', enabled: isActive },
                { icon: 'Trophy', label: 'Net Worth Tracking', enabled: isActive },
                { icon: 'heart', label: 'Financial Health Score', enabled: isActive },
                { icon: 'team', label: 'Family Analytics', enabled: isActive },
                { icon: 'customerservice', label: 'Priority Support', enabled: isActive },
              ].map((f, i) => (
                <View
                  key={i}
                  style={[
                    styles.featureRow,
                    i < 7 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
                  ]}
                >
                  <View style={[styles.featureIcon, { backgroundColor: f.enabled ? `${colors.status.success}15` : colors.bg.tertiary }]}>
                    <AntDesign name={f.icon as any} size={14} color={f.enabled ? colors.status.success : colors.text.tertiary} />
                  </View>
                  <Text style={[styles.featureLabel, { color: f.enabled ? colors.text.primary : colors.text.tertiary }]}>
                    {f.label}
                  </Text>
                  {f.enabled && (
                    <AntDesign name="checkcircle" size={16} color={colors.status.success} />
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Invoices */}
          {invoices.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Invoices
              </Text>
              <View style={[styles.billingList, { backgroundColor: colors.bg.card }]}>
                {invoices.map((inv: any, i: number) => (
                  <View
                    key={inv.id || i}
                    style={[
                      styles.billingRow,
                      i < invoices.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
                    ]}
                  >
                    <View>
                      <Text style={[styles.billingAmount, { color: colors.text.primary }]}>
                        ₹{Number(inv.amount).toLocaleString('en-IN')}
                      </Text>
                      <Text style={[styles.billingDate, { color: colors.text.tertiary }]}>
                        {inv.paidAt
                          ? new Date(inv.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {inv.invoiceNumber ? ` • ${inv.invoiceNumber}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.billingStatus, { backgroundColor: (statusColors[inv.status] || '#7289DA') + '20' }]}>
                      <Text style={[styles.billingStatusText, { color: statusColors[inv.status] || '#7289DA' }]}>
                        {inv.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Billing History */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Billing History
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('BillingHistory')}
                activeOpacity={0.7}
              >
                <Text style={[styles.seeAll, { color: colors.accent.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {billingLoading ? (
              <View style={{ gap: spacing.sm }}>
                <Skeleton height={52} borderRadius={12} />
                <Skeleton height={52} borderRadius={12} />
              </View>
            ) : billingHistory.length === 0 ? (
              <View style={[styles.emptyBilling, { backgroundColor: colors.bg.card }]}>
                <AntDesign name="filetext1" size={24} color={colors.text.tertiary} />
                <Text style={[styles.emptyBillingText, { color: colors.text.tertiary }]}>
                  No billing history yet
                </Text>
              </View>
            ) : (
              <View style={[styles.billingList, { backgroundColor: colors.bg.card }]}>
                {billingHistory.map((p: any, i: number) => (
                  <View
                    key={p.id || i}
                    style={[
                      styles.billingRow,
                      i < billingHistory.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
                    ]}
                  >
                    <View>
                      <Text style={[styles.billingAmount, { color: colors.text.primary }]}>
                        ₹{Number(p.amount).toLocaleString('en-IN')}
                      </Text>
                      <Text style={[styles.billingDate, { color: colors.text.tertiary }]}>
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={[styles.billingStatus, { backgroundColor: (statusColors[p.status] || '#7289DA') + '20' }]}>
                      <Text style={[styles.billingStatusText, { color: statusColors[p.status] || '#7289DA' }]}>
                        {p.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.section}>
            {isActive && !isCancelled && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
                  onPress={handleChangePlan}
                  activeOpacity={0.7}
                >
                  <AntDesign name="swap" size={18} color={colors.text.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.text.primary }]}>Change Plan</Text>
                  <AntDesign name="right" size={16} color={colors.text.tertiary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: `${colors.status.error}10`, borderColor: `${colors.status.error}20` }]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <AntDesign name="closecircleo" size={18} color={colors.status.error} />
                  <Text style={[styles.actionBtnText, { color: colors.status.error }]}>Cancel Subscription</Text>
                  <AntDesign name="right" size={16} color={colors.status.error} />
                </TouchableOpacity>
              </>
            )}

            {isCancelled && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: `${colors.status.success}10`, borderColor: `${colors.status.success}20` }]}
                onPress={handleReactivate}
                disabled={processing}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={colors.status.success} />
                ) : (
                  <>
                    <AntDesign name="checkcircleo" size={18} color={colors.status.success} />
                    <Text style={[styles.actionBtnText, { color: colors.status.success }]}>Reactivate Subscription</Text>
                    <AntDesign name="right" size={16} color={colors.status.success} />
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
              onPress={() => navigation.navigate('BillingHistory')}
              activeOpacity={0.7}
            >
              <AntDesign name="filetext1" size={18} color={colors.text.primary} />
              <Text style={[styles.actionBtnText, { color: colors.text.primary }]}>Full Billing History</Text>
              <AntDesign name="right" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
              onPress={async () => {
                try {
                  setProcessing(true);
                  await restorePurchases();
                  Alert.alert('Restored!', 'Your subscription has been restored.');
                } catch (e: any) {
                  Alert.alert('Error', e?.message || 'No previous purchase found');
                } finally {
                  setProcessing(false);
                }
              }}
              disabled={processing}
              activeOpacity={0.7}
            >
              {processing ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <>
                  <AntDesign name="reload1" size={18} color={colors.text.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.text.primary }]}>Restore Purchase</Text>
                  <AntDesign name="right" size={16} color={colors.text.tertiary} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const statusColors: Record<string, string> = {
  captured: '#00A86B',
  failed: '#FF5050',
  refunded: '#F5A623',
  created: '#7289DA',
  paid: '#00A86B',
  pending: '#F5A623',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
  planCard: {
    borderRadius: borderRadius['3xl'],
    padding: spacing['2xl'],
    gap: spacing.md,
  },
  planCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planInfo: {
    gap: spacing.sm,
  },
  planName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pricePeriod: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  planCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  planWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  planWarningText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  usageCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    gap: spacing.sm,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  usageIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  usageCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  featureCard: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  billingList: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  billingAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  billingDate: {
    fontSize: 12,
    marginTop: 2,
  },
  billingStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  billingStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyBilling: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    borderRadius: borderRadius['2xl'],
    gap: spacing.sm,
  },
  emptyBillingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  actionBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});
