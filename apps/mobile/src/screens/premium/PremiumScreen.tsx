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
  Alert,
  Platform,
} from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { WebView } from 'react-native-webview';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAuth } from '../../store/AuthContext';

const { width } = Dimensions.get('window');

const PLANS = [
  { code: 'PREMIUM_MONTHLY', label: 'Monthly', price: '\u20B999', period: '/mo', badge: null },
  { code: 'PREMIUM_YEARLY', label: 'Yearly', price: '\u20B9999', period: '/yr', badge: 'BEST VALUE' },
  { code: 'FAMILY_MONTHLY', label: 'Family Monthly', price: '\u20B9199', period: '/mo', badge: null },
  { code: 'FAMILY_YEARLY', label: 'Family Yearly', price: '\u20B91999', period: '/yr', badge: 'RECOMMENDED' },
];

const FALLBACK_PLANS = PLANS;

const PREMIUM_FEATURES = [
  { icon: 'linechart', label: 'Financial Health Score' },
  { icon: 'wallet', label: 'Net Worth Tracking' },
  { icon: 'linechart', label: 'Advanced AI Insights' },
  { icon: 'bulb1', label: 'AI Financial Coach' },
  { icon: 'setting', label: 'Custom Categories' },
  { icon: 'linechart', label: 'Investment Tracker' },
  { icon: 'bells', label: 'Bill Predictions' },
  { icon: 'Safety', label: 'Emergency Fund Tracker' },
  { icon: 'folder1', label: 'Document Vault' },
  { icon: 'download', label: 'Export to PDF & Excel' },
  { icon: 'calendar', label: 'Unlimited History' },
  { icon: 'filter', label: 'Advanced Reports' },
  { icon: 'message1', label: 'Priority Support' },
];

const FAMILY_FEATURES = [
  { icon: 'team', label: 'Family Dashboard' },
  { icon: 'home', label: 'Family Wealth Dashboard' },
  { icon: 'flag', label: 'Shared Family Goals' },
  { icon: 'calendar', label: 'Family Calendar' },
  { icon: 'bulb1', label: 'Family AI Advisor' },
  { icon: 'folder1', label: 'Shared Document Vault' },
  { icon: 'linechart', label: 'Family Health Score' },
  { icon: 'copy1', label: 'Up to 6 Members' },
];

const FREE_FEATURES = [
  'Expense & Income Tracking',
  'Basic Reports',
  'Basic Goals (up to 3)',
  'Basic Budgets (up to 3)',
  'Basic AI Insights',
  'UPI Settlements',
  'Couple Invitation',
  '100 Transactions/Month',
  '3 Months History',
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
        <AntDesign  name="close" size={22} color="#FFF" />
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
  const { refreshPremiumStatus } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedPlan, setSelectedPlan] = useState(3);
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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
    api.get<any[]>('/premium/plans').then((plans) => {
      if (Array.isArray(plans) && plans.length > 0) {
        setServerPlans(plans);
      }
    }).catch(() => {});
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
      /* noop */
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
        refreshPremiumStatus();
        Alert.alert('Welcome to Premium!', 'Your subscription is now active.');
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
          refreshPremiumStatus();
          Alert.alert('Welcome to Premium!', 'Your subscription is now active.');
        } else {
          Alert.alert(
            'Still processing',
            'Your payment was received but activation is taking longer than expected. Please check your subscription status in a few moments.',
          );
          loadCurrentSubscription();
        }
        return;
      }
      pollRef.current = setTimeout(tick, 2000) as any;
    };
    tick();
  }, [verifyPayment, loadCurrentSubscription, refreshPremiumStatus]);

  const handleWebViewClose = useCallback(() => {
    setCheckoutUrl(null);
    waitForActivation();
  }, [waitForActivation]);

  const handleSubscribe = async () => {
    const plan = plans[selectedPlan];
    trackFeature('Premium', plan.code);
    setSubscribing(true);
    try {
      const result: any = await api.post('/premium/subscribe', { planCode: plan.code });
      if (result?.checkoutUrl) {
        setCheckoutUrl(result.checkoutUrl);
      } else {
        Alert.alert('Error', 'Failed to initiate payment. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Subscription failed. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Your subscription will be cancelled at the end of the current billing period.',
      [
        { text: 'Keep Premium', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/premium/cancel');
              Alert.alert('Cancelled', 'Subscription will end at the billing period end.');
              loadCurrentSubscription();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to cancel');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg.primary }]}>
        <ListSkeleton />
      </View>
    );
  }

  const plans = (serverPlans && serverPlans.length > 0 ? serverPlans.map((p: any) => ({
    code: p.code || 'CUSTOM',
    label: p.name || 'Plan',
    price: p.priceDisplay || `₹${p.amount}`,
    period: `/${p.interval || 'mo'}`,
    badge: p.badge || null,
  })) : FALLBACK_PLANS);

  if (currentSub?.status === 'active' && currentSub?.plan?.code !== 'FREE') {
    const endDate = new Date(currentSub.currentPeriodEnd).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A1A' }}>
        <ScrollView style={[styles.container, { backgroundColor: '#0A0A1A' }]}>
          <View style={[styles.activeHeader, { paddingTop: insets.top }]}>
            <View style={styles.premiumBadgeLarge}>
<<<<<<< Updated upstream
              <AntDesign name="star" size={24} color="#FFD700" />
=======
              <Ionicons  name="diamond" size={24} color="#FFD700" />
>>>>>>> Stashed changes
              <Text style={styles.premiumBadgeText}>DABBU PREMIUM</Text>
            </View>
            <Text style={styles.activeTitle}>You're on Premium</Text>
          </View>
          <View style={styles.activeDetails}>
            <View style={styles.detailCard}>
              <AntDesign  name="calendar" size={20} color="#FFD700" />
              <View>
                <Text style={styles.detailLabel}>Current Period Ends</Text>
                <Text style={styles.detailValue}>{endDate}</Text>
              </View>
            </View>
            <View style={styles.detailCard}>
              <AntDesign  name="creditcard" size={20} color="#FFD700" />
              <View>
                <Text style={styles.detailLabel}>Plan</Text>
                <Text style={styles.detailValue}>{currentSub.plan?.name || 'Premium'}</Text>
              </View>
            </View>
            {currentSub.cancelAtPeriodEnd && (
              <View style={styles.detailCard}>
                <AntDesign  name="exclamationcircle" size={20} color="#FF5050" />
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
              <AntDesign  name="filetext1" size={18} color="#FFFFFF" />
              <Text style={styles.billingBtnText}> Billing History</Text>
            </TouchableOpacity>
            {!currentSub.cancelAtPeriodEnd && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
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
        <Animated.View
          style={[styles.heroSection, { opacity: fadeAnim, transform: [{ scale: heroScale }] }]}
        >
          <View style={[styles.heroGradient, { paddingTop: insets.top }]}>
            <View style={styles.premiumBadgeSmall}>
<<<<<<< Updated upstream
              <AntDesign name="star" size={14} color="#FFD700" />
=======
              <Ionicons name="diamond" size={14} color="#FFD700" />
>>>>>>> Stashed changes
              <Text style={styles.premiumBadgeSmallText}>PREMIUM</Text>
            </View>
            <Text style={styles.heroTitle}>Unlock the Full</Text>
            <Text style={styles.heroTitleAccent}>Dabbu Experience</Text>
            <Text style={styles.heroSubtitle}>
              Premium unlocks financial intelligence, forecasts, and advanced insights. All basic
              features are free forever.
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.featuresSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.featureComparison}>
            <View style={styles.freeCol}>
              <Text style={styles.colTitle}>Free</Text>
              <Text style={styles.colPrice}>₹0</Text>
              <Text style={styles.colPeriod}>Forever</Text>
              <View style={styles.featureList}>
                {FREE_FEATURES.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <AntDesign  name="checkcircleo" size={16} color="#00A86B" />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.premiumCol}>
              <View style={styles.mostPopularBadge}>
                <Text style={styles.mostPopularText}>MOST POPULAR</Text>
              </View>
              <View style={styles.premiumColContent}>
                <Text style={[styles.colTitle, { color: '#FFD700' }]}>Premium</Text>
                <Text style={[styles.colPrice, { color: '#FFD700' }]}>₹99</Text>
                <Text style={[styles.colPeriod, { color: '#FFD700' }]}>per month</Text>
                <View style={styles.featureList}>
                  {PREMIUM_FEATURES.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <AntDesign  name="checkcircleo" size={16} color="#00A86B" />
                      <Text style={styles.featureText}>{f.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.familyCol}>
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
              <View style={styles.familyColContent}>
                <Text style={[styles.colTitle, { color: '#7B68EE' }]}>Family</Text>
                <Text style={[styles.colPrice, { color: '#7B68EE' }]}>₹199</Text>
                <Text style={[styles.colPeriod, { color: '#7B68EE' }]}>per month</Text>
                <View style={styles.featureList}>
                  {FAMILY_FEATURES.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <AntDesign  name="checkcircleo" size={16} color="#00A86B" />
                      <Text style={styles.featureText}>{f.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.plansSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.plansTitle}>Choose Your Plan</Text>
          <Text style={styles.plansSubtitle}>Auto-pay subscription • Cancel anytime</Text>

          {/* Monthly / Yearly Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, selectedInterval === 'month' && styles.toggleBtnActive]}
              onPress={() => setSelectedInterval('month')}
            >
              <Text style={[styles.toggleText, selectedInterval === 'month' && styles.toggleTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, selectedInterval === 'year' && styles.toggleBtnActive]}
              onPress={() => setSelectedInterval('year')}
            >
              <Text style={[styles.toggleText, selectedInterval === 'year' && styles.toggleTextActive]}>Yearly</Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>SAVE 20%</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.plansGrid}>
            {plans
              .filter((p) => selectedInterval === 'month' ? p.code.includes('MONTHLY') : p.code.includes('YEARLY'))
              .map((plan, index) => {
              const isSelected = selectedPlan === index;
              return (
                <TouchableOpacity
                  key={plan.code}
                  onPress={() => setSelectedPlan(index)}
                  activeOpacity={0.8}
                  style={styles.planCardWrap}
                >
                  <View style={[styles.planCard, isSelected && styles.planCardSelected]}>
                    {plan.badge && (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                      </View>
                    )}
                    <Text style={[styles.planLabel, isSelected && { color: '#C084FC' }]}>
                      {plan.label}
                    </Text>
                    <Text style={[styles.planPrice, isSelected && { color: '#C084FC' }]}>
                      {plan.price}
                    </Text>
                    <Text
                      style={[styles.planPeriod, isSelected && { color: 'rgba(192,132,252,0.7)' }]}
                    >
                      {plan.period}
                    </Text>
                    {isSelected && (
                      <View style={styles.selectedDot}>
                        <AntDesign  name="checkcircleo" size={18} color="#C084FC" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Testimonials */}
          <View style={styles.testimonialsSection}>
            <Text style={styles.testimonialsTitle}>Loved by thousands</Text>
            {[
              { quote: 'Completely transformed how we manage family finances. The AI insights are incredible!', author: 'Rahul S., Premium User', rating: 5 },
              { quote: 'The family dashboard helped me and my partner finally get on the same page about money.', author: 'Priya M., Family Premium', rating: 5 },
              { quote: 'Worth every rupee. The investment tracker and net worth view give me peace of mind.', author: 'Amit K., Premium User', rating: 5 },
            ].map((t, i) => (
              <View key={i} style={styles.testimonialCard}>
                <View style={styles.stars}>
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <Text key={si} style={styles.starIcon}>★</Text>
                  ))}
                </View>
                <Text style={styles.testimonialQuote}>"{t.quote}"</Text>
                <Text style={styles.testimonialAuthor}>— {t.author}</Text>
              </View>
            ))}
          </View>

          {/* FAQ */}
          <View style={styles.faqSection}>
            <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
            {[
              { q: 'Can I switch plans anytime?', a: 'Yes, you can upgrade or downgrade your plan anytime. Changes take effect immediately for upgrades and at the next billing cycle for downgrades.' },
              { q: 'Is there a free trial?', a: 'We offer a 7-day money-back guarantee on all paid plans. You can cancel within 7 days for a full refund, no questions asked.' },
              { q: 'Can I cancel anytime?', a: 'Absolutely. You can cancel from your Subscription Settings. Your access continues until the end of the billing period.' },
              { q: 'How does Family Premium work?', a: 'Family Premium allows up to 6 members to share one subscription. Each member gets their own account with shared access to family features.' },
              { q: 'Is my data secure?', a: 'Yes. We use bank-grade AES-256 encryption for all data. Your financial information is never shared with third parties.' },
            ].map((faq, i) => (
              <TouchableOpacity
                key={i}
                style={styles.faqCard}
                onPress={() => {
                  if (openFaq === i) setOpenFaq(null);
                  else setOpenFaq(i);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <AntDesign name={openFaq === i ? 'up' : 'down'} size={14} color="rgba(255,255,255,0.5)" />
                </View>
                {openFaq === i && (
                  <Text style={styles.faqAnswer}>{faq.a}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

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
          <View style={[styles.upgradeBtnGradient]} />
          {subscribing || processing ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
<<<<<<< Updated upstream
              <AntDesign name="star" size={18} color="#000" style={{ marginRight: 8 }} />
=======
              <Ionicons name="diamond" size={18} color="#000" style={{ marginRight: 8 }} />
>>>>>>> Stashed changes
              <Text style={styles.upgradeText}>Go Premium • {plans[selectedPlan].price}</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.guaranteeText}>Cancel anytime • 7-day money back guarantee</Text>
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
  heroGradient: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },
  premiumBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
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
  featuresSection: { paddingHorizontal: 16, marginTop: 24 },
  featureComparison: { flexDirection: 'row', gap: 12 },
  freeCol: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  premiumCol: {
    flex: 1,
    position: 'relative',
    marginTop: 10,
  },
  premiumColContent: {
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    overflow: 'hidden',
  },
  mostPopularBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#FFD700',
  },
  mostPopularText: { color: '#000', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  familyCol: {
    flex: 1,
    position: 'relative',
    marginTop: 10,
  },
  familyColContent: {
    backgroundColor: 'rgba(123,104,238,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(123,104,238,0.3)',
    overflow: 'hidden',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#7B68EE',
    zIndex: 1,
  },
  recommendedText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  colTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  colPrice: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  colPeriod: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 12 },
  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', flex: 1 },
  plansSection: { paddingHorizontal: 16, marginTop: 32 },
  plansTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  plansSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginBottom: 16,
  },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 3, marginBottom: 16, marginHorizontal: 16 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  toggleBtnActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  toggleText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  toggleTextActive: { color: '#FFFFFF' },
  saveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#FFD700' },
  saveBadgeText: { fontSize: 9, fontWeight: '800', color: '#000', letterSpacing: 0.3 },
  planCardWrap: { width: (width - 44) / 2 },
  planCard: {
    borderRadius: 16,
    padding: 18,
    paddingTop: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  planCardSelected: {
    backgroundColor: 'rgba(192,132,252,0.10)',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
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
    backgroundColor: '#C084FC',
  },
  planBadgeText: { color: '#000', fontSize: 9, fontWeight: '800' },
  planLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  planPrice: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  planPeriod: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  selectedDot: { position: 'absolute', top: 10, right: 10 },
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
    overflow: 'hidden',
    position: 'relative',
  },
  upgradeBtnGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
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
  activePlan: { fontSize: 16, color: '#FFD700', marginTop: 4, fontWeight: '600' },
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
  processingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
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
  testimonialsSection: { paddingHorizontal: 16, marginTop: 32 },
  testimonialsTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 16 },
  testimonialCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 12 },
  stars: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  starIcon: { fontSize: 16, color: '#FFD700' },
  testimonialQuote: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', lineHeight: 20 },
  testimonialAuthor: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
  faqSection: { paddingHorizontal: 16, marginTop: 32, marginBottom: 32 },
  faqTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 16 },
  faqCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 8 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQuestion: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  faqAnswer: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 10, lineHeight: 20 },
});
