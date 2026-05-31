import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

const INTERVAL_LABELS: Record<string, string> = {
  monthly: 'mo',
  quarterly: 'qtr',
  semiannual: '6mo',
  yearly: 'yr',
};

const FEATURE_LABELS: Record<string, string> = {
  expense_income_tracking: 'Expense + income tracking',
  basic_reports: 'Basic reports',
  advanced_reports: 'Advanced reports',
  smart_alerts: 'Smart alerts',
  unlimited_groups: 'Unlimited groups',
  unlimited_members: 'Unlimited members',
  family_sharing: 'Family sharing',
  custom_categories: 'Custom categories',
  analytics_dashboard: 'Analytics dashboard',
  priority_support: 'Priority support',
  export_data: 'Export data',
  unlimited_accounts: 'Unlimited accounts',
  budget_forecasting: 'Budget forecasting',
  reminders: 'Reminders',
  groups: 'Groups',
  group_limit: 'Group limit',
  group_join_limit: 'Group join limit',
  ocr_scans_per_month: 'OCR scans / month',
};

function formatInterval(interval: string, price: number) {
  if (price === 0 && interval === 'monthly') return 'forever';
  return INTERVAL_LABELS[interval] ?? interval;
}

function formatFeatureLabel(key: string, value: any) {
  const label = FEATURE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  if (typeof value === 'number') {
    switch (key) {
      case 'ocr_scans_per_month':
        return `${value} OCR scans / month`;
      case 'group_limit':
        return `Up to ${value} groups`;
      case 'group_join_limit':
        return `Join up to ${value} groups`;
      case 'max_members':
        return `Up to ${value} members`;
      case 'max_reminders':
        return `Up to ${value} reminders`;
      default:
        return `${label}: ${value}`;
    }
  }

  return label;
}

function getVisibleFeatureEntries(features: Record<string, any>) {
  return Object.entries(features || {})
    .filter(([, value]) => value !== false && value !== null && value !== undefined)
    .sort(([keyA], [keyB]) => {
      const order = ['expense_income_tracking', 'advanced_reports', 'smart_alerts', 'unlimited_groups', 'unlimited_members', 'family_sharing', 'custom_categories', 'analytics_dashboard', 'priority_support', 'export_data', 'ocr_scans_per_month', 'group_limit', 'group_join_limit'];
      return order.indexOf(keyA) - order.indexOf(keyB);
    })
    .slice(0, 6);
}

export function SubscriptionScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadData();
  }, [accessToken]);

  async function loadData() {
    try {
      const [subRes, plansRes] = await Promise.all([
        api.get<any>('/subscription/current').catch(() => ({ data: null })),
        api.get<any>('/subscription/plans'),
      ]);
      setCurrentPlan(subRes.data);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleUpgrade(planId: string) {
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.post('/subscription/create', { planId });
      Alert.alert('Success', 'Plan upgraded successfully');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to upgrade plan');
    }
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary, paddingHorizontal: 24, gap: 16 }]}> 
        <Skeleton width={180} height={16} />
        <Skeleton width="100%" height={120} borderRadius={20} />
        <Skeleton width="100%" height={80} borderRadius={16} />
        <Skeleton width="100%" height={80} borderRadius={16} />
        <Skeleton width="75%" height={60} borderRadius={16} />
      </View>
    );
  }

  const visiblePlans = [...plans].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const planGroups = visiblePlans.reduce<Record<string, any[]>>((acc, plan) => {
    const groupName = plan.name || 'Plan';
    acc[groupName] = acc[groupName] || [];
    acc[groupName].push(plan);
    return acc;
  }, {});

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}>
      <LinearGradient colors={[colors.accent.primary, colors.accent.secondary]} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroLabel}>Premium Money Mastery</Text>
        <Text style={styles.heroTitle}>₹89/mo · ₹219/qtr · ₹389/6mo · ₹699/yr</Text>
        <Text style={styles.heroSubtitle}>Unlock unlimited groups, advanced analytics, AI alerts, and family sharing with the best value plan.</Text>
      </LinearGradient>

      {currentPlan && (
        <View style={[styles.currentPlanCard, { backgroundColor: colors.bg.secondary, borderColor: `${colors.accent.primary}40` }]}> 
          <View style={styles.currentPlanHeader}>
            <Text style={[styles.currentPlanName, { color: colors.text.primary }]}>{currentPlan.plan?.name || 'Current Plan'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${colors.status.success}18` }]}> 
              <Text style={[styles.statusText, { color: colors.status.success }]}>{currentPlan.status || 'active'}</Text>
            </View>
          </View>
          <Text style={[styles.currentPlanPrice, { color: colors.accent.primary }]}>₹{Number(currentPlan.plan?.price || currentPlan.price || 0).toLocaleString('en-IN')}<Text style={[styles.interval, { color: colors.text.tertiary }]}>/{formatInterval(currentPlan.plan?.interval || currentPlan.interval || 'monthly', Number(currentPlan.plan?.price || currentPlan.price || 0))}</Text></Text>
          {currentPlan.renewalDate && (
            <Text style={[styles.renewalText, { color: colors.text.tertiary }]}>Renewal: {new Date(currentPlan.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          )}
          <View style={[styles.featureList, { borderTopColor: colors.border.subtle }]}> 
            {getVisibleFeatureEntries(currentPlan.plan?.features || currentPlan.features || {}).map(([key, value], i) => (
              <View key={i} style={styles.featureItem}>
                <Text style={[styles.checkmark, { color: colors.status.success }]}>✓</Text>
                <Text style={[styles.featureText, { color: colors.text.primary }]}>{formatFeatureLabel(key, value)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.plansSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Available Plans</Text>
          <Text style={[styles.sectionCaption, { color: colors.text.secondary }]}>Choose the plan that fits your team and workflow.</Text>
        </View>

        {Object.entries(planGroups).map(([groupName, groupPlans]) => (
          <View key={groupName} style={styles.planGroup}> 
            <Text style={[styles.planGroupTitle, { color: colors.text.primary }]}>{groupName}</Text>
            <Text style={[styles.planGroupSubtitle, { color: colors.text.secondary }]}>{groupName === 'Premium' ? 'Most flexible plan with the best value billing options.' : 'Free forever plan to get started quickly.'}</Text>
            {groupPlans.map((plan) => {
              const isCurrent = currentPlan?.plan?.id === plan.id || currentPlan?.id === plan.id;
              const isPopular = plan.interval === 'quarterly';
              const isBest = plan.interval === 'yearly';
              return (
                <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.bg.secondary, borderColor: isCurrent ? colors.accent.primary : colors.border.subtle, shadowColor: colors.accent.primary }]}> 
                  <View style={styles.planHeader}>
                    <Text style={[styles.planName, { color: colors.text.primary }]}>{plan.name}</Text>
                    <View style={styles.planTagRow}>
                      {isPopular && <View style={[styles.planBadge, { backgroundColor: colors.status.warningLight }]}><Text style={[styles.planBadgeText, { color: colors.status.warning }]}>Most Popular</Text></View>}
                      {isBest && <View style={[styles.planBadge, { backgroundColor: colors.accent.secondary }]}><Text style={[styles.planBadgeText, { color: colors.text.inverse }]}>Best Value</Text></View>}
                      {isCurrent && <View style={[styles.currentBadge, { backgroundColor: colors.accent.primary }]}><Text style={styles.currentBadgeText}>Current</Text></View>}
                    </View>
                  </View>

                  <Text style={[styles.planPrice, { color: colors.text.primary }]}>₹{Number(plan.price || 0).toLocaleString('en-IN')}<Text style={[styles.planInterval, { color: colors.text.tertiary }]}>/{formatInterval(plan.interval || 'monthly', Number(plan.price || 0))}</Text></Text>
                  <Text style={[styles.planDescription, { color: colors.text.secondary }]} numberOfLines={2}>{plan.description || 'Premium access and smarter money management.'}</Text>

                  <View style={styles.planFeatures}> 
                    {getVisibleFeatureEntries(plan.features || {}).map(([key, value], index) => (
                      <View key={index} style={styles.planFeatureItem}>
                        <Text style={[styles.planCheckmark, { color: colors.status.success }]}>✓</Text>
                        <Text style={[styles.planFeatureText, { color: colors.text.secondary }]}>{formatFeatureLabel(key, value)}</Text>
                      </View>
                    ))}
                  </View>

                  {!isCurrent ? (
                    <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: colors.accent.primary }]} onPress={() => handleUpgrade(plan.id)}>
                      <Text style={styles.upgradeBtnText}>Upgrade</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.planAction, { borderColor: colors.accent.primary }]}>
                      <Text style={[styles.planActionText, { color: colors.accent.primary }]}>Current plan</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.billingBtn} onPress={() => navigation.navigate('BillingHistory')}>
        <Text style={[styles.billingBtnText, { color: colors.accent.primary }]}>View Billing History →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: { margin: 16, borderRadius: 24, padding: 24, marginBottom: 12 },
  heroLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 8, letterSpacing: 0.6 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 10, lineHeight: 32 },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20 },
  currentPlanCard: { marginHorizontal: 16, marginBottom: 20, padding: 24, borderRadius: 20, borderWidth: 1 },
  currentPlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  currentPlanName: { fontSize: 22, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  currentPlanPrice: { fontSize: 32, fontWeight: '700', marginBottom: 8 },
  interval: { fontSize: 14, fontWeight: '400' },
  renewalText: { fontSize: 13, marginBottom: 16 },
  featureList: { borderTopWidth: 1, paddingTop: 16, gap: 10 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkmark: { fontSize: 14, fontWeight: '700', width: 20 },
  featureText: { fontSize: 14 },
  plansSection: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  sectionCaption: { fontSize: 13, marginTop: 4 },
  planGroup: { marginBottom: 24 },
  planGroupTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  planGroupSubtitle: { fontSize: 13, marginBottom: 16 },
  planCard: { padding: 20, borderRadius: 18, marginBottom: 12, borderWidth: 1, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planName: { fontSize: 18, fontWeight: '700' },
  planBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  planBadgeText: { fontSize: 11, fontWeight: '700' },
  currentBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  currentBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  planPrice: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  planInterval: { fontSize: 14, fontWeight: '500' },
  planDescription: { fontSize: 13, marginBottom: 16, lineHeight: 20 },
  planFeatures: { gap: 10, marginBottom: 20 },
  planFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planCheckmark: { fontSize: 12, fontWeight: '700', width: 18 },
  planFeatureText: { fontSize: 13 },
  upgradeBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  upgradeBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  planAction: { paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  planActionText: { fontSize: 14, fontWeight: '700' },
  billingBtn: { paddingVertical: 16, alignItems: 'center', marginBottom: 40 },
  billingBtnText: { fontSize: 15, fontWeight: '700' },
