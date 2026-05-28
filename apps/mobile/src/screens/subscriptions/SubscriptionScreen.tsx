import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

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
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
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

  if (loading) return <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}><ActivityIndicator color={colors.accent.primary} size="large" /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}>
      {currentPlan && (
        <View style={[styles.currentPlanCard, { backgroundColor: colors.bg.secondary, borderColor: `${colors.accent.primary}40` }]}>
          <View style={styles.currentPlanHeader}>
            <Text style={[styles.currentPlanName, { color: colors.text.primary }]}>{currentPlan.plan?.name || currentPlan.name || 'Current Plan'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${colors.status.success}18` }]}>
              <Text style={[styles.statusText, { color: colors.status.success }]}>{currentPlan.status || 'active'}</Text>
            </View>
          </View>
          <Text style={[styles.currentPlanPrice, { color: colors.accent.primary }]}>₹{Number(currentPlan.plan?.price || currentPlan.price || 0).toLocaleString('en-IN')}<Text style={[styles.interval, { color: colors.text.tertiary }]}>/{currentPlan.plan?.interval || currentPlan.interval || 'month'}</Text></Text>
          {currentPlan.renewalDate && (
            <Text style={[styles.renewalText, { color: colors.text.tertiary }]}>Renewal: {new Date(currentPlan.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          )}
          <View style={[styles.featureList, { borderTopColor: colors.border.subtle }]}>
            {Object.entries((currentPlan.plan?.features || currentPlan.features || {})).filter(([, v]) => v).map(([key], i) => (
              <View key={i} style={styles.featureItem}>
                <Text style={[styles.checkmark, { color: colors.status.success }]}>✓</Text>
                <Text style={[styles.featureText, { color: colors.text.primary }]}>{key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.plansSection}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Available Plans</Text>
        {plans.map((plan) => {
          const isCurrent = currentPlan?.plan?.id === plan.id || currentPlan?.id === plan.id;
          return (
            <TouchableOpacity key={plan.id} style={[styles.planCard, { backgroundColor: colors.bg.secondary, borderColor: isCurrent ? colors.accent.primary : colors.border.subtle }]}>
              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.text.primary }]}>{plan.name}</Text>
                {isCurrent && <View style={[styles.currentBadge, { backgroundColor: colors.accent.primary }]}><Text style={styles.currentBadgeText}>Current</Text></View>}
              </View>
              <Text style={[styles.planPrice, { color: colors.text.primary }]}>₹{Number(plan.price || 0).toLocaleString('en-IN')}<Text style={[styles.planInterval, { color: colors.text.tertiary }]}>/{plan.interval || 'month'}</Text></Text>
              <View style={[styles.planFeatures, styles.planFeatureList]}>
                {Object.entries(plan.features || {}).filter(([, v]) => v).map(([key], i) => (
                  <View key={i} style={styles.planFeatureItem}>
                    <Text style={[styles.planCheckmark, { color: colors.status.success }]}>✓</Text>
                    <Text style={[styles.planFeatureText, { color: colors.text.secondary }]}>{key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</Text>
                  </View>
                ))}
              </View>
              {!isCurrent && (
                <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: colors.accent.primary }]} onPress={() => handleUpgrade(plan.id)}>
                  <Text style={styles.upgradeBtnText}>Upgrade</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
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
  currentPlanCard: { margin: 16, padding: 24, borderRadius: 20, borderWidth: 1 },
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
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  planCard: { padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planName: { fontSize: 18, fontWeight: '600' },
  currentBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  currentBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  planPrice: { fontSize: 26, fontWeight: '700', marginBottom: 12 },
  planInterval: { fontSize: 13, fontWeight: '400' },
  planFeatures: { gap: 8, marginBottom: 16 },
  planFeatureList: {},
  planFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planCheckmark: { fontSize: 12, fontWeight: '700', width: 18 },
  planFeatureText: { fontSize: 13 },
  upgradeBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  upgradeBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  billingBtn: { paddingVertical: 16, alignItems: 'center', marginBottom: 40 },
  billingBtnText: { fontSize: 15, fontWeight: '600' },
});
