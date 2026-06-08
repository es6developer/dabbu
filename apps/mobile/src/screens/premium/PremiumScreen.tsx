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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { WebView } from 'react-native-webview';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAuth } from '../../store/AuthContext';

const { width } = Dimensions.get('window');

const PLANS = [
  { code: 'MONTHLY_89', label: 'Monthly', price: '\u20B989', period: '/mo', badge: null },
  { code: 'QUARTERLY_219', label: 'Quarterly', price: '\u20B9219', period: '/qtr', badge: null },
  { code: 'HALFYEARLY_389', label: 'Half-Yearly', price: '\u20B9389', period: '/6mo', badge: null },
  { code: 'YEARLY_699', label: 'Yearly', price: '\u20B9699', period: '/yr', badge: 'BEST VALUE' },
];

const PREMIUM_FEATURES = [
  { icon: 'git-branch', label: 'Unlimited Groups' },
  { icon: 'people', label: 'Unlimited Members' },
  { icon: 'scan', label: 'Unlimited OCR Scans' },
  { icon: 'notifications', label: 'Unlimited Reminders' },
  { icon: 'options', label: 'Customise Dashboard' },
  { icon: 'menu', label: 'Customise Bottom Tabs' },
  { icon: 'stats-chart', label: 'Advanced Analytics' },
  { icon: 'trending-up', label: 'Financial Insights' },
  { icon: 'color-palette', label: 'Premium Themes' },
  { icon: 'flask', label: 'Early Access Features' },
  { icon: 'sparkles', label: 'Future AI Features' },
  { icon: 'wallet', label: 'Subscription Management' },
];

const FREE_FEATURES = [
  'Expense Management',
  'Income Management',
  'Basic Reports',
  'Maximum 5 Groups',
  '10 Members Per Group',
  '5 OCR Scans/Month',
  '10 Reminders',
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
            navState.url.includes('/subscriptions/')
          ) {
            onClose();
          }
        }}
      />
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
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [currentSub, setCurrentSub] = useState<any>(null);
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
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
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
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  const waitForActivation = useCallback(() => {
    setProcessing(true);
    let attempts = 0;
    const maxAttempts = 30;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const sub = await api.get<any>('/premium/current');
        if (sub?.status === 'active' && sub?.plan?.code !== 'FREE') {
          setCurrentSub(sub);
          setProcessing(false);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          refreshPremiumStatus();
          Alert.alert('Welcome to Premium!', 'Your subscription is now active.');
        }
      } catch {
        /* noop */
      }
      if (attempts >= maxAttempts) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setProcessing(false);
        Alert.alert(
          'Still processing',
          'Your payment was received but activation is taking longer than expected. Please check your subscription status in a few moments.',
        );
        loadCurrentSubscription();
      }
    }, 2000);
  }, [loadCurrentSubscription]);

  const handleWebViewClose = useCallback(() => {
    setCheckoutUrl(null);
    waitForActivation();
  }, [waitForActivation]);

  const handleSubscribe = async () => {
    const plan = PLANS[selectedPlan];
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
        <ActivityIndicator size="large" color="#F5A623" />
      </View>
    );
  }

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
              <Ionicons name="diamond" size={24} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>DABBU PREMIUM</Text>
            </View>
            <Text style={styles.activeTitle}>You're on Premium</Text>
          </View>
          <View style={styles.activeDetails}>
            <View style={styles.detailCard}>
              <Ionicons name="calendar" size={20} color="#FFD700" />
              <View>
                <Text style={styles.detailLabel}>Current Period Ends</Text>
                <Text style={styles.detailValue}>{endDate}</Text>
              </View>
            </View>
            <View style={styles.detailCard}>
              <Ionicons name="card" size={20} color="#FFD700" />
              <View>
                <Text style={styles.detailLabel}>Plan</Text>
                <Text style={styles.detailValue}>{currentSub.plan?.name || 'Premium'}</Text>
              </View>
            </View>
            {currentSub.cancelAtPeriodEnd && (
              <View style={styles.detailCard}>
                <Ionicons name="alert-circle" size={20} color="#FF5050" />
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
              <Ionicons name="receipt" size={18} color="#FFFFFF" />
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
              <Ionicons name="diamond" size={14} color="#FFD700" />
              <Text style={styles.premiumBadgeSmallText}>PREMIUM</Text>
            </View>
            <Text style={styles.heroTitle}>Unlock the Full</Text>
            <Text style={styles.heroTitleAccent}>Dabbu Experience</Text>
            <Text style={styles.heroSubtitle}>
              Premium gives your family unlimited access to all features, advanced analytics, and
              future AI tools.
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
                    <Ionicons name="checkmark-circle" size={16} color="#00A86B" />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.premiumCol}>
              <View style={styles.mostPopularBadge}>
                <Text style={styles.mostPopularText}>MOST POPULAR</Text>
              </View>
              <Text style={[styles.colTitle, { color: '#FFD700' }]}>Premium</Text>
              <Text style={[styles.colPrice, { color: '#FFD700' }]}>₹89</Text>
              <Text style={[styles.colPeriod, { color: '#FFD700' }]}>per month</Text>
              <View style={styles.featureList}>
                {PREMIUM_FEATURES.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#00A86B" />
                    <Text style={styles.featureText}>{f.label}</Text>
                  </View>
                ))}
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
          <View style={styles.plansGrid}>
            {PLANS.map((plan, index) => {
              const isSelected = selectedPlan === index;
              return (
                <TouchableOpacity
                  key={plan.code}
                  onPress={() => setSelectedPlan(index)}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                      { borderColor: isSelected ? '#FFD700' : 'rgba(255,255,255,0.1)' },
                    ]}
                  >
                    {plan.badge && (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                      </View>
                    )}
                    <Text style={[styles.planLabel, isSelected && { color: '#FFD700' }]}>
                      {plan.label}
                    </Text>
                    <Text style={[styles.planPrice, isSelected && { color: '#FFD700' }]}>
                      {plan.price}
                    </Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                    {isSelected && (
                      <View style={styles.selectedDot}>
                        <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                      </View>
                    )}
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
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
              <Ionicons name="diamond" size={18} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.upgradeText}>Go Premium • {PLANS[selectedPlan].price}</Text>
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
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    position: 'relative',
    overflow: 'visible',
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
  plansGrid: { gap: 10 },
  planCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
  },
  planCardSelected: { backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 2 },
  planBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#FFD700',
  },
  planBadgeText: { color: '#000', fontSize: 9, fontWeight: '700' },
  planLabel: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  planPrice: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginTop: 4 },
  planPeriod: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  selectedDot: { position: 'absolute', top: 12, right: 12 },
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
});
