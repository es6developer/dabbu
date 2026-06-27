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
  Platform,
} from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { WebView } from 'react-native-webview';
import { useAnalytics } from '../../hooks/useAnalytics';
import { usePremium } from '../../store/PremiumContext';
import { PlanTier } from '../../config/entitlements';

import { alertService } from '../../components/ui';
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 64) / 3;

const TIER_PLANS: {
  tier: PlanTier;
  label: string;
  monthly: string;
  yearly: string;
  badge: string | null;
  savings: string | null;
}[] = [
  { tier: 'FREE', label: 'Free', monthly: '₹0', yearly: '₹0', badge: null, savings: null },
  {
    tier: 'PREMIUM',
    label: 'Premium',
    monthly: '₹99/mo',
    yearly: '₹999/yr',
    badge: 'POPULAR',
    savings: 'Save 16%',
  },
  {
    tier: 'FAMILY',
    label: 'Family',
    monthly: '₹199/mo',
    yearly: '₹1,999/yr',
    badge: 'RECOMMENDED',
    savings: 'Save 17%',
  },
];

const FEATURE_LIST: { key: string; free: boolean; premium: boolean; family: boolean }[] = [
  { key: 'Personal Dashboard', free: true, premium: true, family: true },
  { key: 'Manual Expense Tracking', free: true, premium: true, family: true },
  { key: 'Couple Dashboard', free: true, premium: true, family: true },
  { key: 'Basic AI Insights', free: true, premium: true, family: true },
  { key: 'UPI Settlements', free: true, premium: true, family: true },
  { key: 'Net Worth Tracking', free: false, premium: true, family: true },
  { key: 'Financial Health Score', free: false, premium: true, family: true },
  { key: 'AI Coach', free: false, premium: true, family: true },
  { key: 'Advanced Reports', free: false, premium: true, family: true },
  { key: 'PDF & Excel Export', free: false, premium: true, family: true },
  { key: 'Custom Categories', free: false, premium: true, family: true },
  { key: 'Investment Tracker', free: false, premium: true, family: true },
  { key: 'Document Vault', free: false, premium: true, family: true },
  { key: 'Bill Predictions', free: false, premium: true, family: true },
  { key: 'Emergency Fund Tracker', free: false, premium: true, family: true },
  { key: 'Priority Support', free: false, premium: true, family: true },
  { key: 'Family Dashboard', free: false, premium: false, family: true },
  { key: 'Family Calendar', free: false, premium: false, family: true },
  { key: 'Family AI Advisor', free: false, premium: false, family: true },
  { key: 'Shared Document Vault', free: false, premium: false, family: true },
  { key: 'Up to 6 Members', free: false, premium: false, family: true },
];

const TESTIMONIALS = [
  {
    name: 'Priya S.',
    text: 'Premium completely changed how I manage money. The AI coach is like having a personal finance advisor!',
    plan: 'Premium',
  },
  {
    name: 'Rahul M.',
    text: 'Family plan is a game changer. My wife and I finally have a shared view of our finances.',
    plan: 'Family',
  },
  {
    name: 'Ankit K.',
    text: 'The net worth tracker and health score give me clarity I never had before. Worth every rupee!',
    plan: 'Premium',
  },
];

const FAQS = [
  {
    q: 'Can I switch plans anytime?',
    a: 'Yes! You can upgrade, downgrade, or cancel anytime. Upgrades take effect immediately, downgrades at period end.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We support UPI, Credit/Debit Cards, Net Banking, and Wallets through Razorpay.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. We use bank-grade encryption and never share your financial data with third parties.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, you can cancel anytime. Your premium features remain active until the end of your billing period.',
  },
  {
    q: 'How does the family plan work?',
    a: 'You can invite up to 5 family members (total 6). Each member gets their own login with shared family features.',
  },
];

function CheckoutOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        source={{ uri: url }}
        onNavigationStateChange={(navState) => {
          if (
            navState.url.includes('success') ||
            navState.url.includes('callback') ||
            navState.url.includes('/subscriptions/') ||
            navState.url.includes('razorpay.com/payments/')
          ) {
            onClose();
          }
        }}
      />
      <TouchableOpacity style={styles.checkoutCloseBtn} onPress={onClose} activeOpacity={0.7}>
        <AntDesign name="close" size={22} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

function ProcessingOverlay() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.processingOverlay]}>
      <View style={styles.processingCard}>
        <ActivityIndicator size="large" color="#F5A623" />
        <Text style={styles.processingTitle}>Processing Payment</Text>
        <Text style={styles.processingText}>Please wait while we confirm your subscription...</Text>
      </View>
    </View>
  );
}

export function PremiumScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { trackFeature } = useAnalytics();
  const { isPremium, subscription, refresh } = usePremium();
  const tabBarHeight = useBottomTabBarHeight();

  const [selectedPlan, setSelectedPlan] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [serverPlans, setServerPlans] = useState<any[] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const heroScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
    loadCurrentSubscription();
    api
      .get<any[]>('/premium/plans')
      .then((plans) => {
        if (Array.isArray(plans) && plans.length > 0) {
          setServerPlans(plans);
        }
      })
      .catch(() => {});
    return () => {
      if (pollRef.current) {
        clearTimeout(pollRef.current);
      }
    };
  }, []);

  const loadCurrentSubscription = useCallback(async () => {
    try {
      const sub = await api.get<any>('/premium/current');
      setCurrentSub(sub);
      if (sub?.status === 'active' && sub?.plan?.code !== 'FREE') {
        setProcessing(false);
        if (pollRef.current) {
          clearTimeout(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPayment = useCallback(async (): Promise<boolean> => {
    try {
      const result: any = await api.post('/premium/verify');
      return result?.verified === true;
    } catch {
      return false;
    }
  }, []);

  const waitForActivation = useCallback(() => {
    setProcessing(true);
    let attempts = 0;
    const maxAttempts = 20;
    const tick = async () => {
      attempts++;
      const activated = await verifyPayment();
      if (activated) {
        const sub = await api.get<any>('/premium/current').catch(() => null);
        if (sub) {
          setCurrentSub(sub);
        }
        setProcessing(false);
        if (pollRef.current) {
          clearTimeout(pollRef.current);
          pollRef.current = null;
        }
        refresh();
        alertService.alert('Welcome to Premium!', 'Your subscription is now active.');
        return;
      }
      if (attempts >= maxAttempts) {
        setProcessing(false);
        if (pollRef.current) {
          clearTimeout(pollRef.current);
          pollRef.current = null;
        }
        const sub = await api.get<any>('/premium/current').catch(() => null);
        if (sub?.status === 'active' && sub?.plan?.code !== 'FREE') {
          setCurrentSub(sub);
          refresh();
          alertService.alert('Welcome to Premium!', 'Your subscription is now active.');
        } else {
          alertService.alert(
            'Still processing',
            'Your payment was received but activation is taking longer than expected.',
          );
          loadCurrentSubscription();
        }
        return;
      }
      pollRef.current = setTimeout(tick, 2000) as any;
    };
    tick();
  }, [verifyPayment, loadCurrentSubscription, refresh]);

  const handleWebViewClose = useCallback(() => {
    setCheckoutUrl(null);
    waitForActivation();
  }, [waitForActivation]);

  const handleSubscribe = async () => {
    if (selectedPlan === 0) {
      navigation.navigate('HomeTab');
      return;
    }
    const actualPlanCode =
      selectedPlan === 1
        ? billingCycle === 'yearly'
          ? 'PREMIUM_YEARLY'
          : 'PREMIUM_MONTHLY'
        : billingCycle === 'yearly'
          ? 'FAMILY_YEARLY'
          : 'FAMILY_MONTHLY';

    trackFeature('Premium', actualPlanCode);
    setSubscribing(true);
    try {
      const result: any = await api.post('/premium/subscribe', { planCode: actualPlanCode });
      if (result?.checkoutUrl) {
        setCheckoutUrl(result.checkoutUrl);
      } else {
        alertService.alert('Error', 'Failed to initiate payment. Please try again.');
      }
    } catch (e: any) {
      alertService.alert('Error', e?.message || 'Subscription failed. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg.primary }]}>
        <ListSkeleton />
      </View>
    );
  }

  if (isPremium) {
    const endDate = currentSub?.currentPeriodEnd
      ? new Date(currentSub.currentPeriodEnd).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A1A' }}>
        <ScrollView style={[styles.container, { backgroundColor: '#0A0A1A' }]}>
          <View style={[styles.activeHeader, { paddingTop: insets.top }]}>
            <View style={styles.premiumBadgeLarge}>
              <AntDesign name="star" size={24} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>DABBU PREMIUM</Text>
            </View>
            <Text style={styles.activeTitle}>You're on {currentSub?.plan?.name || 'Premium'}</Text>
          </View>
          <View style={styles.activeDetails}>
            <View style={styles.detailCard}>
              <AntDesign name="calendar" size={20} color="#FFD700" />
              <View>
                <Text style={styles.detailLabel}>Current Period Ends</Text>
                <Text style={styles.detailValue}>{endDate}</Text>
              </View>
            </View>
            <View style={styles.detailCard}>
              <AntDesign name="creditcard" size={20} color="#FFD700" />
              <View>
                <Text style={styles.detailLabel}>Plan</Text>
                <Text style={styles.detailValue}>{currentSub?.plan?.name || 'Premium'}</Text>
              </View>
            </View>
            {currentSub?.cancelAtPeriodEnd && (
              <View style={styles.detailCard}>
                <AntDesign name="exclamationcircle" size={20} color="#FF5050" />
                <View>
                  <Text style={[styles.detailLabel, { color: '#FF5050' }]}>
                    Cancellation Scheduled
                  </Text>
                  <Text style={styles.detailValue}>Ends on {endDate}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity
              style={styles.billingBtn}
              onPress={() => navigation.navigate('BillingHistory')}
            >
              <AntDesign name="filetext1" size={18} color="#FFFFFF" />
              <Text style={styles.billingBtnText}> Billing History</Text>
            </TouchableOpacity>
            {!currentSub?.cancelAtPeriodEnd && currentSub?.plan?.code !== 'FREE' && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => navigation.navigate('Cancellation')}
              >
                <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
        {processing && <ProcessingOverlay />}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A1A' }}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero Section */}
        <Animated.View
          style={[styles.heroSection, { opacity: fadeAnim, transform: [{ scale: heroScale }] }]}
        >
          <View style={[styles.heroGradient, { paddingTop: insets.top + 20 }]}>
            <View style={styles.premiumBadgeSmall}>
              <AntDesign name="star" size={14} color="#FFD700" />
              <Text style={styles.premiumBadgeSmallText}>PREMIUM</Text>
            </View>
            <Text style={styles.heroTitle}>Take Control of</Text>
            <Text style={styles.heroTitleAccent}>Your Financial Future</Text>
            <Text style={styles.heroSubtitle}>
              From basic tracking to AI-powered financial intelligence. Choose the plan that fits
              your life.
            </Text>
          </View>
        </Animated.View>

        {/* Billing Cycle Toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingCycle === 'monthly' && styles.billingOptionTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'yearly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('yearly')}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingCycle === 'yearly' && styles.billingOptionTextActive,
              ]}
            >
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save ~16%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Pricing Cards */}
        <Animated.View
          style={[
            styles.plansSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.plansRow}>
            {TIER_PLANS.map((plan, index) => {
              const isSelected = selectedPlan === index;
              const price = billingCycle === 'monthly' ? plan.monthly : plan.yearly;
              return (
                <TouchableOpacity
                  key={plan.tier}
                  onPress={() => setSelectedPlan(index)}
                  activeOpacity={0.8}
                  style={styles.planCardWrap}
                >
                  <View
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                      plan.tier === 'PREMIUM' && isSelected && { borderColor: '#FFD700' },
                      plan.tier === 'FAMILY' && isSelected && { borderColor: '#C084FC' },
                    ]}
                  >
                    {plan.badge && (
                      <View
                        style={[
                          styles.planBadge,
                          plan.tier === 'FAMILY' && { backgroundColor: '#C084FC' },
                        ]}
                      >
                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.planLabel,
                        plan.tier === 'PREMIUM' && { color: '#FFD700' },
                        plan.tier === 'FAMILY' && { color: '#C084FC' },
                      ]}
                    >
                      {plan.label}
                    </Text>
                    <Text
                      style={[
                        styles.planPrice,
                        plan.tier === 'PREMIUM' && { color: '#FFD700' },
                        plan.tier === 'FAMILY' && { color: '#C084FC' },
                      ]}
                    >
                      {price}
                    </Text>
                    {plan.savings && billingCycle === 'yearly' && (
                      <View style={styles.savingsPill}>
                        <Text style={styles.savingsPillText}>{plan.savings}</Text>
                      </View>
                    )}
                    {isSelected && (
                      <View style={styles.selectedDot}>
                        <AntDesign
                          name="checkcircle"
                          size={18}
                          color={plan.tier === 'FAMILY' ? '#C084FC' : '#FFD700'}
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Comparison Table */}
        <Animated.View style={[styles.comparisonSection, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Compare Plans</Text>
          <View style={styles.comparisonTable}>
            {FEATURE_LIST.map((feat, i) => (
              <View
                key={i}
                style={[
                  styles.comparisonRow,
                  i < FEATURE_LIST.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: 'rgba(255,255,255,0.08)',
                  },
                ]}
              >
                <Text style={styles.comparisonFeature}>{feat.key}</Text>
                <View style={styles.comparisonChecks}>
                  <Text
                    style={[
                      styles.checkMark,
                      feat.free ? styles.checkActive : styles.checkInactive,
                    ]}
                  >
                    {feat.free ? '✓' : '—'}
                  </Text>
                  <Text
                    style={[
                      styles.checkMark,
                      feat.premium ? styles.checkActive : styles.checkInactive,
                    ]}
                  >
                    {feat.premium ? '✓' : '—'}
                  </Text>
                  <Text
                    style={[
                      styles.checkMark,
                      feat.family ? styles.checkActive : styles.checkInactive,
                    ]}
                  >
                    {feat.family ? '✓' : '—'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Testimonials */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.sectionTitle}>Loved by Users</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testimonialsScroll}
          >
            {TESTIMONIALS.map((t, i) => (
              <View key={i} style={styles.testimonialCard}>
                <Text style={styles.testimonialQuote}>"{t.text}"</Text>
                <View style={styles.testimonialAuthor}>
                  <View style={styles.testimonialAvatar}>
                    <Text style={styles.testimonialAvatarText}>{t.name[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.testimonialName}>{t.name}</Text>
                    <Text style={styles.testimonialPlan}>{t.plan} User</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQS.map((faq, i) => (
            <View key={i} style={styles.faqCard}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <Animated.View
        style={[
          styles.stickyCta,
          { paddingBottom: insets.bottom + tabBarHeight + 16, opacity: fadeAnim },
        ]}
      >
        <TouchableOpacity
          style={[styles.upgradeBtn, (subscribing || processing) && styles.upgradeBtnDisabled]}
          onPress={handleSubscribe}
          disabled={subscribing || processing}
          activeOpacity={0.85}
        >
          {subscribing || processing ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <AntDesign name="star" size={18} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.upgradeText}>
                {selectedPlan === 0
                  ? 'Get Started Free'
                  : `Start ${TIER_PLANS[selectedPlan].label} • ${billingCycle === 'monthly' ? 'Free trial' : 'Best value'}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.guaranteeText}>Cancel anytime • No questions asked</Text>
      </Animated.View>

      {checkoutUrl && <CheckoutOverlay url={checkoutUrl} onClose={handleWebViewClose} />}
      {processing && <ProcessingOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroSection: { width },
  heroGradient: { paddingHorizontal: 24, paddingBottom: 20, alignItems: 'center' },
  premiumBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  premiumBadgeSmallText: { color: '#FFD700', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  premiumBadgeLarge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  premiumBadgeText: { color: '#FFD700', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  heroTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  heroTitleAccent: { fontSize: 32, fontWeight: '800', color: '#FFD700', textAlign: 'center' },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 48,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  billingOptionActive: { backgroundColor: 'rgba(255,215,0,0.2)' },
  billingOptionText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  billingOptionTextActive: { color: '#FFD700' },
  saveBadge: {
    backgroundColor: '#00A86B',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  plansSection: { paddingHorizontal: 16, marginBottom: 24 },
  plansRow: { flexDirection: 'row', gap: 12 },
  planCardWrap: { width: CARD_WIDTH },
  planCard: {
    borderRadius: 16,
    padding: 16,
    paddingTop: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  planCardSelected: {
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderWidth: 1.5,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  planBadge: {
    position: 'absolute',
    top: -8,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FFD700',
  },
  planBadgeText: { color: '#000', fontSize: 9, fontWeight: '800' },
  planLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  planPrice: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  savingsPill: {
    marginTop: 6,
    backgroundColor: 'rgba(0,168,107,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  savingsPillText: { color: '#00A86B', fontSize: 10, fontWeight: '700' },
  selectedDot: { position: 'absolute', top: 10, right: 10 },
  comparisonSection: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  comparisonTable: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  comparisonFeature: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  comparisonChecks: { flexDirection: 'row', gap: 16, width: 120, justifyContent: 'flex-end' },
  checkMark: { width: 30, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  checkActive: { color: '#00A86B' },
  checkInactive: { color: 'rgba(255,255,255,0.2)' },
  testimonialsSection: { paddingLeft: 16, marginBottom: 24 },
  testimonialsScroll: { paddingRight: 16, gap: 12 },
  testimonialCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    width: width * 0.75,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  testimonialQuote: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  testimonialAuthor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  testimonialAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,215,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialAvatarText: { color: '#FFD700', fontSize: 14, fontWeight: '700' },
  testimonialName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  testimonialPlan: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  faqSection: { paddingHorizontal: 16, marginBottom: 24 },
  faqCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  faqQuestion: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  faqAnswer: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 18 },
  stickyCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0A0A1A',
  },
  upgradeBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFD700',
  },
  upgradeBtnDisabled: { opacity: 0.7 },
  upgradeText: { color: '#000', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  guaranteeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 8,
  },
  activeHeader: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },
  activeTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginTop: 8 },
  activeDetails: { padding: 20, gap: 12 },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },
  detailLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  detailValue: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cancelBtn: {
    backgroundColor: 'rgba(255,50,50,0.15)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: { color: '#FF5050', fontSize: 14, fontWeight: '700' },
  billingBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  billingBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  processingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 40,
  },
  processingTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  processingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  checkoutCloseBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
