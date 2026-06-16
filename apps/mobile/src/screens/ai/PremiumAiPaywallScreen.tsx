import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ReAnimated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useAiColors, AiCard, AnimatedProgressRing } from './components/AiShared';

const { width: SCREEN_W } = Dimensions.get('window');

const PLANS = [
  { id: 'monthly', label: 'Monthly', price: '₹199', period: '/month', savings: null },
  { id: 'quarterly', label: 'Quarterly', price: '₹499', period: '/quarter', savings: 'Save 16%' },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '₹1,499',
    period: '/year',
    savings: 'Save 37%',
    popular: true,
  },
];

const FEATURES = [
  {
    name: 'Financial DNA',
    free: false,
    desc: 'Your unique financial fingerprint with behavioral analysis',
  },
  {
    name: 'Cashflow Prediction',
    free: false,
    desc: 'AI predicts your end-of-month balance with 89% accuracy',
  },
  { name: 'AI Monthly Reviews', free: false, desc: 'Magazine-style monthly financial reports' },
  { name: 'Family Intelligence', free: false, desc: 'Complete family financial health dashboard' },
  { name: 'Couple Intelligence', free: false, desc: 'Relationship finance compatibility scoring' },
  {
    name: 'Goal Forecasting',
    free: false,
    desc: 'AI predicts goal completion with probability scoring',
  },
  { name: 'Anomaly Detection', free: false, desc: 'Real-time unusual spending pattern alerts' },
  {
    name: 'Savings Opportunities',
    free: false,
    desc: 'AI discovers ways to save money automatically',
  },
  { name: 'Basic Insights', free: true, desc: 'Weekly spending summaries and category breakdowns' },
  { name: 'Budget Tracking', free: true, desc: 'Set and track monthly budgets' },
  { name: 'Smart Alerts', free: true, desc: 'Priority-based payment reminders' },
  { name: 'Receipt Scanning', free: true, desc: 'OCR-based receipt data extraction' },
];

export function PremiumAiPaywallScreen() {
  const AI_COLORS = useAiColors();
  const s = useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1 },
        closeBtn: {
          position: 'absolute',
          right: 20,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: AI_COLORS.card,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: AI_COLORS.border,
        },
        heroSection: { alignItems: 'center', paddingHorizontal: 32, paddingBottom: 16 },
        heroIconWrap: {
          width: 80,
          height: 80,
          borderRadius: 24,
          backgroundColor: `${AI_COLORS.primary}20`,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        },
        heroTitle: { fontSize: 28, fontWeight: '800', color: AI_COLORS.text, letterSpacing: -0.5 },
        heroDesc: {
          fontSize: 14,
          color: AI_COLORS.textSecondary,
          textAlign: 'center',
          marginTop: 8,
          lineHeight: 20,
        },
        previewCard: { width: 150, padding: 16, borderRadius: 20, borderWidth: 1 },
        previewIcon: {
          width: 48,
          height: 48,
          borderRadius: 14,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 10,
        },
        previewTitle: { fontSize: 14, fontWeight: '700', color: AI_COLORS.text },
        previewDesc: { fontSize: 12, fontWeight: '600', marginTop: 4 },
        sectionLabel: { fontSize: 16, fontWeight: '700', color: AI_COLORS.text, marginBottom: 12 },
        planCard: {
          backgroundColor: AI_COLORS.card,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          position: 'relative',
        },
        radio: {
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
        radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
        planLabel: { fontSize: 15, fontWeight: '600', color: AI_COLORS.text },
        planSavings: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        planPrice: { fontSize: 20, fontWeight: '800', color: AI_COLORS.text },
        planPeriod: { fontSize: 11, color: AI_COLORS.textTertiary },
        popularBadge: {
          position: 'absolute',
          top: -8,
          right: 16,
          backgroundColor: AI_COLORS.primary,
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 8,
        },
        popularText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
        compCard: {
          backgroundColor: AI_COLORS.card,
          borderRadius: 16,
          borderWidth: 1,
          overflow: 'hidden',
        },
        compHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: AI_COLORS.border,
        },
        compRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
        ctaBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: AI_COLORS.primary,
          borderRadius: 16,
          paddingVertical: 16,
        },
        ctaText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
        ctaSub: { fontSize: 12, color: AI_COLORS.textTertiary, textAlign: 'center', marginTop: 8 },
      }),
    [AI_COLORS],
  );
  const PREVIEW_CARDS = [
    {
      icon: 'linechart' as const,
      title: 'Financial DNA',
      desc: 'Saver Score: 82',
      color: AI_COLORS.primary,
    },
    {
      icon: 'linechart' as const,
      title: 'Predictions',
      desc: 'Month-end: ₹24,500',
      color: AI_COLORS.success,
    },
    {
      icon: 'team' as const,
      title: 'Family Health',
      desc: 'Score: 76/100',
      color: AI_COLORS.purple,
    },
  ];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const scrollX = useRef(new Animated.Value(0)).current;

  return (
    <View style={[s.screen, { backgroundColor: AI_COLORS.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Close */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.closeBtn, { top: insets.top + 12 }]}
        >
          <AntDesign  name="close" size={24} color={AI_COLORS.text} />
        </TouchableOpacity>

        {/* Hero */}
        <ReAnimated.View
          entering={FadeInUp.duration(500)}
          style={[s.heroSection, { paddingTop: insets.top + 60 }]}
        >
          <View style={s.heroIconWrap}>
            <AntDesign name="star" size={40} color={AI_COLORS.primary} />
          </View>
          <Text style={s.heroTitle}>Unlock Dabbu AI</Text>
          <Text style={s.heroDesc}>
            Get AI-powered financial intelligence. Predict, analyze, and optimize your finances like
            never before.
          </Text>
        </ReAnimated.View>

        {/* Preview Cards Carousel */}
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 8 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: false,
          })}
          snapToInterval={160}
          decelerationRate="fast"
        >
          {PREVIEW_CARDS.map((card, i) => (
            <ReAnimated.View key={i} entering={FadeInUp.duration(400).delay(i * 100)}>
              <View
                style={[
                  s.previewCard,
                  { backgroundColor: `${card.color}15`, borderColor: `${card.color}30` },
                ]}
              >
                <View style={[s.previewIcon, { backgroundColor: `${card.color}25` }]}>
                  <AntDesign name={card.icon as any} size={28} color={card.color} />
                </View>
                <Text style={s.previewTitle}>{card.title}</Text>
                <Text style={[s.previewDesc, { color: card.color }]}>{card.desc}</Text>
              </View>
            </ReAnimated.View>
          ))}
        </Animated.ScrollView>

        {/* Plans */}
        <ReAnimated.View
          entering={FadeInUp.duration(500)}
          style={{ paddingHorizontal: 16, marginTop: 20, gap: 8 }}
        >
          <Text style={s.sectionLabel}>Choose your plan</Text>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.7}
              onPress={() => setSelectedPlan(plan.id)}
              style={[
                s.planCard,
                { borderColor: selectedPlan === plan.id ? AI_COLORS.primary : AI_COLORS.border },
                selectedPlan === plan.id && { borderWidth: 2 },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={[
                    s.radio,
                    {
                      borderColor:
                        selectedPlan === plan.id ? AI_COLORS.primary : AI_COLORS.textTertiary,
                    },
                    selectedPlan === plan.id && { backgroundColor: AI_COLORS.primary },
                  ]}
                >
                  {selectedPlan === plan.id && <View style={s.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.planLabel}>{plan.label}</Text>
                  {plan.savings && (
                    <Text style={[s.planSavings, { color: AI_COLORS.success }]}>
                      {plan.savings}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.planPrice}>{plan.price}</Text>
                  <Text style={s.planPeriod}>{plan.period}</Text>
                </View>
                {plan.popular && (
                  <View style={s.popularBadge}>
                    <Text style={s.popularText}>BEST VALUE</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ReAnimated.View>

        {/* Features Comparison */}
        <ReAnimated.View
          entering={FadeInUp.duration(600)}
          style={{ paddingHorizontal: 16, marginTop: 24 }}
        >
          <Text style={s.sectionLabel}>What's included</Text>
          <View style={[s.compCard, { borderColor: AI_COLORS.border }]}>
            <View style={s.compHeader}>
              <Text
                style={{ flex: 1, fontSize: 13, fontWeight: '600', color: AI_COLORS.textSecondary }}
              >
                Feature
              </Text>
              <Text
                style={{
                  width: 50,
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: '600',
                  color: AI_COLORS.textTertiary,
                }}
              >
                FREE
              </Text>
              <Text
                style={{
                  width: 50,
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: '600',
                  color: AI_COLORS.primary,
                }}
              >
                PREMIUM
              </Text>
            </View>
            {FEATURES.map((f, i) => (
              <View
                key={i}
                style={[
                  s.compRow,
                  i < FEATURES.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: AI_COLORS.border,
                  },
                ]}
              >
                <Text style={{ flex: 1, fontSize: 13, color: AI_COLORS.text }}>{f.name}</Text>
                <View style={{ width: 50, alignItems: 'center' }}>
                  {f.free ? (
                    <AntDesign  name="check" size={18} color={AI_COLORS.success} />
                  ) : (
                    <AntDesign  name="close" size={18} color={AI_COLORS.textTertiary} />
                  )}
                </View>
                <View style={{ width: 50, alignItems: 'center' }}>
                  <AntDesign  name="check" size={18} color={AI_COLORS.primary} />
                </View>
              </View>
            ))}
          </View>
        </ReAnimated.View>

        {/* CTA */}
        <ReAnimated.View
          entering={FadeInUp.duration(600)}
          style={{ paddingHorizontal: 16, marginTop: 24 }}
        >
          <TouchableOpacity style={s.ctaBtn}>
            <AntDesign  name="star" size={20} color="#FFF" />
            <Text style={s.ctaText}>Start Free Trial</Text>
          </TouchableOpacity>
          <Text style={s.ctaSub}>7-day free trial, cancel anytime</Text>
        </ReAnimated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
