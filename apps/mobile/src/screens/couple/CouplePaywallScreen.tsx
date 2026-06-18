import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { usePremium } from '../../store/PremiumContext';

const { width } = Dimensions.get('window');

const COUPLE_FEATURES = [
  { key: 'couple_dashboard', free: true, premium: true, family: true, label: 'Couple Dashboard' },
  { key: 'couple_invite', free: true, premium: true, family: true, label: 'Couple Invitation' },
  { key: 'net_worth', free: false, premium: true, family: true, label: 'Net Worth Tracking' },
  { key: 'health_score', free: false, premium: true, family: true, label: 'Financial Health Score' },
  { key: 'advanced_ai', free: false, premium: true, family: true, label: 'Advanced AI Insights' },
  { key: 'ai_coach', free: false, premium: true, family: true, label: 'AI Financial Coach' },
  { key: 'investment_tracker', free: false, premium: true, family: true, label: 'Investment Tracker' },
  { key: 'export_pdf', free: false, premium: true, family: true, label: 'PDF Export' },
  { key: 'document_vault', free: false, premium: true, family: true, label: 'Document Vault' },
  { key: 'family_space', free: false, premium: false, family: true, label: 'Family Space' },
  { key: 'family_dashboard', free: false, premium: false, family: true, label: 'Family Dashboard' },
  { key: 'family_calendar', free: false, premium: false, family: true, label: 'Family Calendar' },
  { key: 'family_ai_advisor', free: false, premium: false, family: true, label: 'Family AI Advisor' },
];

const PLANS = [
  {
    tier: 'FREE',
    name: 'Free',
    price: '₹0',
    color: '#FFFFFF',
    bgColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  {
    tier: 'PREMIUM',
    name: 'Premium',
    price: '₹99/mo',
    color: '#FFD700',
    bgColor: 'rgba(255,215,0,0.08)',
    borderColor: 'rgba(255,215,0,0.3)',
    badge: 'MOST POPULAR',
    badgeColor: '#FFD700',
  },
  {
    tier: 'FAMILY',
    name: 'Family',
    price: '₹199/mo',
    color: '#7B68EE',
    bgColor: 'rgba(123,104,238,0.08)',
    borderColor: 'rgba(123,104,238,0.3)',
    badge: 'RECOMMENDED',
    badgeColor: '#7B68EE',
  },
];

const Cell = ({ enabled, color }: { enabled: boolean; color: string }) => (
  <Text style={[styles.cell, { color }]}>
    {enabled ? '✓' : '—'}
  </Text>
);

export default function CouplePaywallScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { subscribe } = usePremium();

  const handleSubscribe = async (planCode: string) => {
    try {
      await subscribe(planCode);
      navigation.goBack();
    } catch (e: any) {
      console.warn('Subscribe failed', e.message);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <AntDesign name="close" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Couple & Family Plans</Text>
        <Text style={styles.subtitle}>
          Compare plans and unlock premium couple features
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.comparisonTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colHeader, styles.colFeature]}>Feature</Text>
            {PLANS.map((p) => (
              <Text key={p.tier} style={[styles.colHeader, { color: p.color }]}>
                {p.name}
              </Text>
            ))}
          </View>

          {COUPLE_FEATURES.map((feat, i) => (
            <View
              key={feat.key}
              style={[
                styles.tableRow,
                i % 2 === 0 && { backgroundColor: 'rgba(255,255,255,0.03)' },
              ]}
            >
              <Text style={[styles.featureLabel, styles.colFeature]}>{feat.label}</Text>
              <Cell enabled={feat.free} color={PLANS[0].color} />
              <Cell enabled={feat.premium} color={PLANS[1].color} />
              <Cell enabled={feat.family} color={PLANS[2].color} />
            </View>
          ))}
        </View>

        <Text style={styles.plansTitle}>Choose Your Plan</Text>

        {PLANS.filter((p) => p.tier !== 'FREE').map((plan) => (
          <TouchableOpacity
            key={plan.tier}
            style={[
              styles.planCard,
              {
                backgroundColor: plan.bgColor,
                borderColor: plan.borderColor,
              },
            ]}
            onPress={() => {
              const code = plan.tier === 'PREMIUM' ? 'PREMIUM_MONTHLY' : 'FAMILY_MONTHLY';
              handleSubscribe(code);
            }}
          >
            {plan.badge && (
              <View style={[styles.badge, { backgroundColor: plan.badgeColor }]}>
                <Text style={[styles.badgeText, { color: plan.badge === 'RECOMMENDED' ? '#FFF' : '#000' }]}>
                  {plan.badge}
                </Text>
              </View>
            )}
            <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
            <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
            <Text style={styles.planDesc}>
              {plan.tier === 'PREMIUM'
                ? 'Unlock all premium couple features'
                : 'Everything in Premium plus family features for up to 6 members'}
            </Text>
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: plan.color }]}
              onPress={() => {
                const code = plan.tier === 'PREMIUM' ? 'PREMIUM_MONTHLY' : 'FAMILY_MONTHLY';
                handleSubscribe(code);
              }}
            >
              <Text style={[styles.ctaText, { color: plan.badge === 'RECOMMENDED' ? '#FFF' : '#000' }]}>
                Subscribe
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  scroll: { padding: 16, paddingBottom: 40 },
  comparisonTable: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  colHeader: { flex: 1, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  colFeature: { flex: 2, textAlign: 'left', paddingLeft: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  featureLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  cell: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  plansTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', textAlign: 'center', marginTop: 32, marginBottom: 16 },
  planCard: { borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, position: 'relative' },
  badge: { position: 'absolute', top: -8, right: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  planName: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  planPrice: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  planDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 },
  ctaBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '800' },
});
