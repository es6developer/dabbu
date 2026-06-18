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
import { usePremium, UsageInfo } from '../../store/PremiumContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { PlanTier, TIER_COLORS } from '../../config/entitlements';

export function SubscriptionCenterScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    subscription,
    loading,
    refresh,
    getUsage,
    usage,
    cancel,
    resume,
    restorePurchases,
    checkLimit,
    isPremium,
    daysRemaining,
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
      refresh();
      getUsage();
      loadBillingHistory();
    }, [])
  );

  const loadBillingHistory = async () => {
    setBillingLoading(true);
    setInvoicesLoading(true);
    try {
      const [billingData, invoicesData] = await Promise.all([
        api.get<any>('/premium/billing'),
        api.get<any>('/premium/invoices'),
      ]);
      setBillingHistory((billingData?.data || billingData || []).slice(0, 5));
      setInvoices((invoicesData?.data || invoicesData || []).slice(0, 3));
    } catch {} finally {
      setBillingLoading(false);
      setInvoicesLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), getUsage(), loadBillingHistory()]);
    setRefreshing(false);
  };

  const handleCancel = () => {
    navigation.navigate('Cancellation');
  };

  const handleReactivate = async () => {
    setProcessing(true);
    try {
      await resume();
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

  const usageBars = [
    { key: 'goals', label: 'Goals', icon: 'flag' },
    { key: 'budgets', label: 'Budgets', icon: 'piechart' },
    { key: 'transactions', label: 'Transactions This Month', icon: 'swap' },
    { key: 'documents', label: 'Documents', icon: 'folder1' },
    { key: 'exports', label: 'Exports This Month', icon: 'download' },
    { key: 'family_members', label: 'Family Members', icon: 'team' },
  ];

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Active', color: '#00A86B', bg: '#00A86B15' },
    cancelled: { label: 'Cancelled', color: '#FF5050', bg: '#FF505015' },
    past_due: { label: 'Past Due', color: '#F5A623', bg: '#F5A62315' },
    paused: { label: 'Paused', color: '#6B7280', bg: '#6B728015' },
    halted: { label: 'Halted', color: '#FF5050', bg: '#FF505015' },
    incomplete: { label: 'Pending', color: '#F5A623', bg: '#F5A62315' },
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
  const tier: PlanTier = subscription?.plan?.code?.includes('FAMILY') ? 'FAMILY'
    : subscription?.plan?.code?.includes('PREMIUM') ? 'PREMIUM' : 'FREE';
  const tierColor = TIER_COLORS[tier];

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, gap: spacing.lg, paddingHorizontal: spacing.lg }}>
          {/* Current Plan Card */}
          <LinearGradient
            colors={tier === 'FAMILY' ? ['#2E1A47', '#4A1A6E'] : ['#1F1A3A', '#2E1A47']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.planCard}
          >
            <View style={styles.planCardTop}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>
                  {subscription?.plan?.name || 'Free'}
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
                  <Text style={styles.priceValue}>₹{subscription?.plan?.price || 0}</Text>
                  <Text style={styles.pricePeriod}>/{subscription?.plan?.interval || 'mo'}</Text>
                </View>
              )}
            </View>

            {subscription?.currentPeriodEnd && (
              <View style={styles.planCardBottom}>
                <AntDesign name="calendar" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.planDate}>
                  {isCancelled ? 'Access until ' : 'Renewal: '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            )}

            {daysRemaining > 0 && isActive && (
              <View style={[styles.daysBadge, { backgroundColor: 'rgba(255,215,0,0.15)' }]}>
                <AntDesign name="clockcircleo" size={14} color="#FFD700" />
                <Text style={styles.daysText}>{daysRemaining} days remaining</Text>
              </View>
            )}

            {isCancelled && (
              <View style={[styles.planWarning, { backgroundColor: `${colors.status.warning}20` }]}>
                <AntDesign name="exclamationcircle" size={14} color={colors.status.warning} />
                <Text style={[styles.planWarningText, { color: colors.status.warning }]}>
                  Cancellation scheduled. Your subscription will end on{' '}
                  {subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                    : ''}
                </Text>
              </View>
            )}

            {!isActive && !isCancelled && (
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: '#FFD700' }]}
                onPress={handleChangePlan}
              >
                <Text style={styles.retryBtnText}>Subscribe Now</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

          {/* Payment Method */}
          {isActive && (
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
          )}

          {/* Usage Progress */}
          {usageBars.map(({ key, label, icon }) => {
            const usageInfo = (usage as Record<string, UsageInfo>)?.[key];
            const current = usageInfo?.used || 0;
            const limit = usageInfo?.limit || 0;
            const remaining = usageInfo?.remaining || 0;
            const isUnlimited = limit === -1;
            const percentUsed = isUnlimited ? 0 : limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
            const isLimitReached = !isUnlimited && current >= limit;

            if (!isActive && key !== 'goals' && key !== 'budgets' && key !== 'transactions') return null;

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
                  <View style={styles.usageBarContainer}>
                    <View style={[styles.progressBar, { backgroundColor: colors.bg.tertiary }]}>
                      <View style={[
                        styles.progressFill,
                        { width: `${percentUsed}%`, backgroundColor: isLimitReached ? '#FF5050' : percentUsed >= 80 ? '#F5A623' : '#00A86B' },
                      ]} />
                    </View>
                    <Text style={[styles.usageRemaining, { color: colors.text.tertiary }]}>
                      {remaining} remaining
                    </Text>
                  </View>
                )}
                {isLimitReached && (
                  <TouchableOpacity style={styles.upgradePrompt} onPress={() => navigation.navigate('Premium')}>
                    <Text style={styles.upgradePromptText}>Upgrade for unlimited {label.toLowerCase()}</Text>
                    <AntDesign name="arrowright" size={14} color="#FFD700" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Premium Features */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              {tier === 'FREE' ? 'Locked Premium Features' : 'Your Premium Features'}
            </Text>
            <View style={[styles.featureCard, { backgroundColor: colors.bg.card }]}>
              {[
                { icon: 'linechart', label: 'Advanced Reports', enabled: isActive && tier !== 'FREE' },
                { icon: 'bulb1', label: 'AI Coach', enabled: isActive && tier !== 'FREE' },
                { icon: 'Trophy', label: 'Net Worth Tracking', enabled: isActive && tier !== 'FREE' },
                { icon: 'heart', label: 'Financial Health Score', enabled: isActive && tier !== 'FREE' },
                { icon: 'download', label: 'Export (PDF/Excel)', enabled: isActive && tier !== 'FREE' },
                { icon: 'folder1', label: 'Document Vault', enabled: isActive && tier !== 'FREE' },
                { icon: 'linechart', label: 'Investment Tracker', enabled: isActive && tier !== 'FREE' },
                { icon: 'team', label: 'Family Space', enabled: isActive && tier === 'FAMILY' },
                { icon: 'calendar', label: 'Family Calendar', enabled: isActive && tier === 'FAMILY' },
                { icon: 'customerservice', label: 'Priority Support', enabled: isActive && tier !== 'FREE' },
              ].map((f, i) => (
                <View key={i} style={[
                  styles.featureRow,
                  i < 9 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
                ]}>
                  <View style={[styles.featureIcon, { backgroundColor: f.enabled ? '#00A86B15' : colors.bg.tertiary }]}>
                    <AntDesign name={f.icon as any} size={14} color={f.enabled ? '#00A86B' : colors.text.tertiary} />
                  </View>
                  <Text style={[styles.featureLabel, { color: f.enabled ? colors.text.primary : colors.text.tertiary }]}>
                    {f.label}
                  </Text>
                  {f.enabled && <AntDesign name="checkcircle" size={16} color="#00A86B" />}
                  {!f.enabled && tier === 'FREE' && <AntDesign name="lock" size={14} color={colors.text.tertiary} />}
                </View>
              ))}
            </View>
          </View>

          {/* Invoices */}
          {invoices.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Invoices</Text>
              <View style={[styles.billingList, { backgroundColor: colors.bg.card }]}>
                {invoices.map((inv: any, i: number) => (
                  <View key={inv.id || i} style={[
                    styles.billingRow,
                    i < invoices.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
                  ]}>
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
                    <View style={[styles.billingStatus, { backgroundColor: (inv.status === 'paid' ? '#00A86B' : inv.status === 'pending' ? '#F5A623' : '#FF5050') + '20' }]}>
                      <Text style={[styles.billingStatusText, { color: inv.status === 'paid' ? '#00A86B' : inv.status === 'pending' ? '#F5A623' : '#FF5050' }]}>
                        {(inv.status || 'UNKNOWN').toUpperCase()}
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
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Billing History</Text>
              <TouchableOpacity onPress={() => navigation.navigate('BillingHistory')} activeOpacity={0.7}>
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
                <Text style={[styles.emptyBillingText, { color: colors.text.tertiary }]}>No billing history yet</Text>
              </View>
            ) : (
              <View style={[styles.billingList, { backgroundColor: colors.bg.card }]}>
                {billingHistory.map((p: any, i: number) => (
                  <View key={p.id || i} style={[
                    styles.billingRow,
                    i < billingHistory.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
                  ]}>
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
                    <View style={[styles.billingStatus, { backgroundColor: (p.status === 'captured' ? '#00A86B' : p.status === 'failed' ? '#FF5050' : '#F5A623') + '20' }]}>
                      <Text style={[styles.billingStatusText, { color: p.status === 'captured' ? '#00A86B' : p.status === 'failed' ? '#FF5050' : '#F5A623' }]}>
                        {(p.status || 'UNKNOWN').toUpperCase()}
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
                  <Text style={[styles.actionBtnText, { color: colors.text.primary }]}>
                    {tier === 'FAMILY' ? 'Manage Subscription' : tier === 'PREMIUM' ? 'Upgrade to Family' : 'Change Plan'}
                  </Text>
                  <AntDesign name="right" size={16} color={colors.text.tertiary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#FF505015', borderColor: '#FF505020' }]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <AntDesign name="closecircleo" size={18} color="#FF5050" />
                  <Text style={[styles.actionBtnText, { color: '#FF5050' }]}>Cancel Subscription</Text>
                  <AntDesign name="right" size={16} color="#FF5050" />
                </TouchableOpacity>
              </>
            )}

            {isCancelled && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#00A86B15', borderColor: '#00A86B20' }]}
                onPress={handleReactivate}
                disabled={processing}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#00A86B" />
                ) : (
                  <>
                    <AntDesign name="checkcircleo" size={18} color="#00A86B" />
                    <Text style={[styles.actionBtnText, { color: '#00A86B' }]}>Reactivate Subscription</Text>
                    <AntDesign name="right" size={16} color="#00A86B" />
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600' },
  scrollContent: { paddingTop: spacing.md, paddingBottom: 40 },
  planCard: { borderRadius: 24, padding: spacing['2xl'], gap: spacing.md },
  planCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planInfo: { gap: spacing.sm },
  planName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999, gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  priceTag: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 12 },
  priceValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  pricePeriod: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  planCardBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planDate: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  daysBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start',
  },
  daysText: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  planWarning: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: 12,
  },
  planWarningText: { fontSize: 12, fontWeight: '500', flex: 1 },
  retryBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  retryBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  usageCard: { borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  usageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  usageLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  usageIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  usageLabel: { fontSize: 14, fontWeight: '600' },
  usageCount: { fontSize: 13, fontWeight: '600' },
  usageBarContainer: { gap: 4 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  usageRemaining: { fontSize: 11, fontWeight: '500' },
  upgradePrompt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,215,0,0.1)',
  },
  upgradePromptText: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  featureCard: { borderRadius: 16, overflow: 'hidden' },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md,
  },
  featureIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  billingList: { borderRadius: 16, overflow: 'hidden' },
  billingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  billingAmount: { fontSize: 15, fontWeight: '700' },
  billingDate: { fontSize: 12, marginTop: 2 },
  billingStatus: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
  billingStatusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  emptyBilling: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing['3xl'], borderRadius: 16, gap: spacing.sm,
  },
  emptyBillingText: { fontSize: 13, fontWeight: '500' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.lg,
    borderRadius: 12, borderWidth: 1, gap: spacing.md,
  },
  actionBtnText: { flex: 1, fontSize: 15, fontWeight: '600' },
});
