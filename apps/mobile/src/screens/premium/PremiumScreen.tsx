import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import RazorpayCheckout from 'react-native-razorpay';
import { useAnalytics } from '../../hooks/useAnalytics';
import { usePremium } from '../../store/PremiumContext';
import { alertService } from '../../components/ui';

const { width } = Dimensions.get('window');

const PLANS = [
  {
    id: 'premium_monthly',
    code: 'PREMIUM_MONTHLY',
    label: 'Premium',
    price: '₹99',
    period: '/month',
    color: '#FFD700',
    features: [
      'Net Worth Tracking',
      'Financial Health Score',
      'AI Money Coach',
      'Advanced Reports',
      'PDF & Excel Export',
      'Custom Categories',
      'Investment Tracker',
      'Document Vault',
      'Bill Predictions',
      'Emergency Fund Tracker',
      'Priority Support',
    ],
  },
  {
    id: 'family_monthly',
    code: 'FAMILY_MONTHLY',
    label: 'Family',
    price: '₹199',
    period: '/month',
    color: '#C084FC',
    badge: 'BEST VALUE',
    features: [
      'Everything in Premium',
      'Family Dashboard',
      'Family Calendar',
      'Family AI Advisor',
      'Shared Document Vault',
      'Up to 6 Members',
    ],
  },
];

const PLANS_YEARLY = [
  {
    id: 'premium_yearly',
    code: 'PREMIUM_YEARLY',
    label: 'Premium',
    price: '₹999',
    period: '/year',
    color: '#FFD700',
    savings: 'Save 16%',
    features: [
      'Net Worth Tracking',
      'Financial Health Score',
      'AI Money Coach',
      'Advanced Reports',
      'PDF & Excel Export',
      'Custom Categories',
      'Investment Tracker',
      'Document Vault',
      'Bill Predictions',
      'Emergency Fund Tracker',
      'Priority Support',
    ],
  },
  {
    id: 'family_yearly',
    code: 'FAMILY_YEARLY',
    label: 'Family',
    price: '₹1,999',
    period: '/year',
    color: '#C084FC',
    badge: 'BEST VALUE',
    savings: 'Save 17%',
    features: [
      'Everything in Premium',
      'Family Dashboard',
      'Family Calendar',
      'Family AI Advisor',
      'Shared Document Vault',
      'Up to 6 Members',
    ],
  },
];

function ProcessingOverlay() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.processingOverlay]}>
      <View style={styles.processingCard}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.processingTitle}>Processing Payment</Text>
        <Text style={styles.processingText}>Please wait while we confirm your subscription...</Text>
      </View>
    </View>
  );
}

export function PremiumScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { trackFeature } = useAnalytics();
  const { isPremium, refresh } = usePremium();
  const tabBarHeight = useBottomTabBarHeight();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const activePlans = billingCycle === 'monthly' ? PLANS : PLANS_YEARLY;
  const selectedPlan = activePlans[selectedPlanIndex];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    loadCurrentSubscription();
  }, []);

  const loadCurrentSubscription = useCallback(async () => {
    try {
      const sub = await api.get<any>('/premium/current');
      setCurrentSub(sub);
      if (sub?.status === 'active' && sub?.plan?.code !== 'FREE') {
        setProcessing(false);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubscribe = async () => {
    trackFeature('Premium', selectedPlan.code);
    setSubscribing(true);
    try {
      const result: any = await api.post('/premium/create-order', { planCode: selectedPlan.code });
      if (!result?.orderId) {
        alertService.alert('Error', 'Failed to create order. Please try again.');
        setSubscribing(false);
        return;
      }

      const options = {
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: result.amount,
        currency: result.currency || 'INR',
        name: 'Dabbu',
        description: `${selectedPlan.label} Subscription`,
        order_id: result.orderId,
        prefill: {
          contact: '',
          email: '',
        },
        theme: {
          color: '#FFD700',
        },
      };

      RazorpayCheckout.open(options)
        .then(async (data: any) => {
          setProcessing(true);
          try {
            const verifyResult: any = await api.post('/premium/verify', {
              razorpayOrderId: data.razorpay_order_id,
              razorpayPaymentId: data.razorpay_payment_id,
              razorpaySignature: data.razorpay_signature,
            });
            if (verifyResult?.verified) {
              await refresh();
              await loadCurrentSubscription();
              alertService.alert('Welcome to Premium!', 'Your subscription is now active.');
            } else {
              alertService.alert('Verification Failed', 'Payment was made but verification failed. Contact support.');
            }
          } catch {
            alertService.alert('Error', 'Payment succeeded but verification failed. Contact support.');
          } finally {
            setProcessing(false);
          }
        })
        .catch((error: any) => {
          if (error?.code !== 0) {
            alertService.alert('Payment Failed', error?.description || 'Payment was cancelled or failed.');
          }
        });
    } catch (e: any) {
      alertService.alert('Error', e?.message || 'Subscription failed. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#000' }]}>
        <ListSkeleton />
      </View>
    );
  }

  // Active premium subscription management
  if (isPremium && currentSub?.plan?.code !== 'FREE') {
    const endDate = currentSub?.currentPeriodEnd
      ? new Date(currentSub.currentPeriodEnd).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <View style={[styles.activeHeader, { paddingTop: insets.top + 16 }]}>
            <View style={styles.activeBadge}>
              <AntDesign name="star" size={20} color="#FFD700" />
              <Text style={styles.activeBadgeText}>DABBU {currentSub?.plan?.name?.toUpperCase() || 'PREMIUM'}</Text>
            </View>
            <Text style={styles.activeTitle}>You're all set</Text>
            <Text style={styles.activeSubtitle}>Enjoying premium features</Text>
          </View>

          <View style={styles.activeCards}>
            <View style={styles.activeCard}>
              <AntDesign name="calendar" size={18} color="#FFD700" />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeCardLabel}>Renews on</Text>
                <Text style={styles.activeCardValue}>{endDate}</Text>
              </View>
            </View>
            <View style={styles.activeCard}>
              <AntDesign name="creditcard" size={18} color="#FFD700" />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeCardLabel}>Current Plan</Text>
                <Text style={styles.activeCardValue}>{currentSub?.plan?.name || 'Premium'}</Text>
              </View>
            </View>
          </View>

          {currentSub?.cancelAtPeriodEnd && (
            <View style={styles.cancelNotice}>
              <AntDesign name="exclamationcircle" size={16} color="#FF5050" />
              <Text style={styles.cancelNoticeText}>
                Your subscription will end on {endDate}
              </Text>
            </View>
          )}

          <View style={styles.activeActions}>
            <TouchableOpacity
              style={styles.activeActionBtn}
              onPress={() => navigation.navigate('BillingHistory')}
            >
              <AntDesign name="filetext1" size={16} color="#FFF" />
              <Text style={styles.activeActionText}>Billing History</Text>
            </TouchableOpacity>
            {!currentSub?.cancelAtPeriodEnd && (
              <TouchableOpacity
                style={[styles.activeActionBtn, styles.cancelActionBtn]}
                onPress={() => navigation.navigate('Cancellation')}
              >
                <Text style={styles.cancelActionText}>Cancel Subscription</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
        {processing && <ProcessingOverlay />}
      </View>
    );
  }

  // Plan selection screen (free users or edge case)
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + tabBarHeight + 100 }}
      >
        {/* Hero */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim, paddingTop: insets.top + 20 }]}>
          <View style={styles.heroPill}>
            <AntDesign name="star" size={12} color="#FFD700" />
            <Text style={styles.heroPillText}>DABBU PREMIUM</Text>
          </View>
          <Text style={styles.heroTitle}>Unlock your{'\n'}financial power</Text>
          <Text style={styles.heroSubtitle}>
            Go beyond basic tracking. Get AI insights, investment tracking, and family features.
          </Text>
        </Animated.View>

        {/* Billing Toggle */}
        <View style={styles.toggleWrap}>
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, billingCycle === 'monthly' && styles.toggleBtnActive]}
              onPress={() => setBillingCycle('monthly')}
            >
              <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, billingCycle === 'yearly' && styles.toggleBtnActive]}
              onPress={() => setBillingCycle('yearly')}
            >
              <Text style={[styles.toggleText, billingCycle === 'yearly' && styles.toggleTextActive]}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plan Cards */}
        <Animated.View style={[styles.plansWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {activePlans.map((plan, index) => {
            const isSelected = selectedPlanIndex === index;
            return (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.85}
                onPress={() => setSelectedPlanIndex(index)}
                style={[styles.planCard, isSelected && { borderColor: plan.color }]}
              >
                {plan.badge && (
                  <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <View>
                    <Text style={[styles.planLabel, { color: plan.color }]}>{plan.label}</Text>
                    <View style={styles.planPriceRow}>
                      <Text style={[styles.planPrice, { color: '#FFF' }]}>{plan.price}</Text>
                      <Text style={styles.planPeriod}>{plan.period}</Text>
                    </View>
                  </View>
                  <View style={[styles.planRadio, isSelected && { borderColor: plan.color, backgroundColor: plan.color + '20' }]}>
                    {isSelected && <View style={[styles.planRadioDot, { backgroundColor: plan.color }]} />}
                  </View>
                </View>
                {plan.savings && (
                  <View style={styles.savingsTag}>
                    <Text style={styles.savingsTagText}>{plan.savings}</Text>
                  </View>
                )}
                <View style={styles.planDivider} />
                <View style={styles.planFeatures}>
                  {plan.features.map((feat, fi) => (
                    <View key={fi} style={styles.planFeatureRow}>
                      <AntDesign name="check" size={14} color={plan.color} />
                      <Text style={styles.planFeatureText}>{feat}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* What you get */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Why upgrade?</Text>
          {[
            { icon: 'bulb1', title: 'AI Money Coach', desc: 'Get personalized financial advice powered by AI' },
            { icon: 'barschart', title: 'Investment Tracker', desc: 'Track SIPs, stocks, FDs and watch your wealth grow' },
            { icon: 'Safety', title: 'Health Score', desc: 'Know your financial health with a single score' },
            { icon: 'download', title: 'Export Reports', desc: 'Download PDF & Excel reports for tax and analysis' },
          ].map((item, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <AntDesign name={item.icon as any} size={20} color="#FFD700" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{item.title}</Text>
                <Text style={styles.benefitDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.stickyCta, { paddingBottom: insets.bottom + tabBarHeight + 12 }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, (subscribing || processing) && { opacity: 0.6 }]}
          onPress={handleSubscribe}
          disabled={subscribing || processing}
          activeOpacity={0.85}
        >
          {subscribing || processing ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.ctaText}>
              Start {selectedPlan.label} — {selectedPlan.price}{selectedPlan.period}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.ctaSubtext}>Cancel anytime · No questions asked</Text>
      </View>

      {processing && <ProcessingOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: { paddingHorizontal: 28, paddingBottom: 32, alignItems: 'center' },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  heroPillText: { color: '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },

  // Toggle
  toggleWrap: { paddingHorizontal: 48, marginBottom: 24 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  toggleBtnActive: { backgroundColor: 'rgba(255,215,0,0.15)' },
  toggleText: { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '600' },
  toggleTextActive: { color: '#FFD700' },

  // Plans
  plansWrap: { paddingHorizontal: 20, gap: 14 },
  planCard: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 22,
    position: 'relative',
  },
  planBadge: {
    position: 'absolute',
    top: -1,
    right: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  planBadgeText: { color: '#000', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planPrice: { fontSize: 32, fontWeight: '900' },
  planPeriod: { fontSize: 15, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  planRadioDot: { width: 10, height: 10, borderRadius: 6 },
  savingsTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,168,107,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 10,
  },
  savingsTagText: { color: '#00A86B', fontSize: 11, fontWeight: '700' },
  planDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 16,
  },
  planFeatures: { gap: 10 },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planFeatureText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500', flex: 1 },

  // Benefits section
  sectionWrap: { paddingHorizontal: 24, marginTop: 36, gap: 14 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: { fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 2 },
  benefitDesc: { fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 18 },

  // Sticky CTA
  stickyCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: 'rgba(0,0,0,0.92)',
    backdropFilter: 'blur(20px)',
  },
  ctaBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#000', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  ctaSubtext: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },

  // Active subscription
  activeHeader: { paddingHorizontal: 28, paddingBottom: 32, alignItems: 'center' },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  activeBadgeText: { color: '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  activeTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  activeSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.4)' },
  activeCards: { paddingHorizontal: 20, gap: 10 },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 18,
  },
  activeCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  activeCardValue: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  cancelNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: 'rgba(255,80,80,0.1)',
    borderRadius: 14,
    padding: 14,
  },
  cancelNoticeText: { color: '#FF5050', fontSize: 13, fontWeight: '600', flex: 1 },
  activeActions: { paddingHorizontal: 20, marginTop: 16, gap: 10 },
  activeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
  },
  activeActionText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  cancelActionBtn: { backgroundColor: 'rgba(255,50,50,0.1)' },
  cancelActionText: { color: '#FF5050', fontSize: 15, fontWeight: '600' },

  // Overlays
  processingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingCard: {
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 40,
  },
  processingTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  processingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
