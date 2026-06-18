import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { usePremium } from '../../store/PremiumContext';

const CANCEL_REASONS = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'not_using', label: 'Not using enough' },
  { id: 'missing_features', label: 'Missing features' },
  { id: 'technical_issues', label: 'Technical issues' },
  { id: 'other', label: 'Other' },
];

const RECOVERY_OFFERS = [
  {
    id: 'month_free',
    title: '1 Month Free',
    description: 'Get one month of Premium completely free!',
    icon: 'gift',
  },
  {
    id: 'twenty_percent',
    title: '20% Off',
    description: 'Enjoy 20% discount on your next billing cycle',
    icon: 'star',
  },
  {
    id: 'annual_savings',
    title: 'Annual Upgrade Discount',
    description: 'Switch to annual and save up to 40%',
    icon: 'clockcircleo',
  },
];

export function CancellationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { refreshSubscription } = usePremium();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [step, setStep] = useState<'reason' | 'offer' | 'confirmation'>('reason');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleContinue = async () => {
    if (!selectedReason) return;

    if (showRecovery && step === 'reason') {
      setStep('offer');
      return;
    }

    setLoading(true);
    try {
      await api.post('/premium/cancel', {
        reason: selectedReason,
        details: details || undefined,
      });
      await refreshSubscription();
      setStep('confirmation');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!selectedOffer) return;
    setLoading(true);
    try {
      await api.post('/premium/recovery', { offerId: selectedOffer });
      await refreshSubscription();
      Alert.alert('Offer Accepted!', 'Your special offer has been applied. Welcome back!', [
        { text: 'Great!', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to apply offer');
    } finally {
      setLoading(false);
    }
  };

  const handleKeepPremium = () => {
    navigation.goBack();
  };

  if (step === 'confirmation') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <View style={[styles.content, { paddingTop: insets.top }]}>
          <Animated.View style={[styles.confirmContent, { opacity: fadeAnim }]}>
            <View style={[styles.confirmIcon, { backgroundColor: `${colors.status.error}15` }]}>
              <AntDesign name="exclamationcircle" size={48} color={colors.status.error} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text.primary }]}>Subscription Cancelled</Text>
            <Text style={[styles.confirmSubtitle, { color: colors.text.secondary }]}>
              Your subscription has been cancelled. You will continue to have access until the end of your current billing period.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AntDesign name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Cancel Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View
          style={[
            styles.mainContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {step === 'reason' && (
            <>
              <View style={styles.empathySection}>
                <View style={[styles.empathyIcon, { backgroundColor: `${colors.status.error}10` }]}>
                  <AntDesign name="frowno" size={40} color={colors.status.error} />
                </View>
                <Text style={[styles.empathyTitle, { color: colors.text.primary }]}>
                  We're sorry to see you go
                </Text>
                <Text style={[styles.empathySubtitle, { color: colors.text.secondary }]}>
                  Help us improve by telling us why you're leaving
                </Text>
              </View>

              <View style={styles.reasonsList}>
                {CANCEL_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[
                      styles.reasonCard,
                      {
                        backgroundColor: selectedReason === reason.id
                          ? `${colors.accent.primary}10`
                          : colors.bg.card,
                        borderColor: selectedReason === reason.id
                          ? colors.accent.primary
                          : colors.border.subtle,
                      },
                    ]}
                    onPress={() => setSelectedReason(reason.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioOuter}>
                      {selectedReason === reason.id && (
                        <View style={[styles.radioInner, { backgroundColor: colors.accent.primary }]} />
                      )}
                    </View>
                    <Text style={[styles.reasonLabel, { color: colors.text.primary }]}>
                      {reason.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedReason && (
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.bg.card,
                      borderColor: colors.border.subtle,
                      color: colors.text.primary,
                    },
                  ]}
                  placeholder="Tell us more (optional)"
                  placeholderTextColor={colors.text.tertiary}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: selectedReason ? colors.accent.primary : colors.bg.tertiary,
                  },
                ]}
                onPress={handleContinue}
                disabled={!selectedReason || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.primaryBtnText,
                    !selectedReason && { color: colors.text.tertiary },
                  ]}>
                    Continue
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.keepBtn} onPress={handleKeepPremium} activeOpacity={0.7}>
                <Text style={[styles.keepText, { color: colors.accent.primary }]}>
                  Keep My Premium
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'offer' && (
            <>
              <View style={styles.empathySection}>
                <View style={[styles.offerIcon, { backgroundColor: `${colors.status.warning}15` }]}>
                  <AntDesign name="gift" size={40} color={colors.status.warning} />
                </View>
                <Text style={[styles.empathyTitle, { color: colors.text.primary }]}>
                  Wait! Here's a special offer
                </Text>
                <Text style={[styles.empathySubtitle, { color: colors.text.secondary }]}>
                  We'd love to keep you as a premium member. Choose an exclusive offer below:
                </Text>
              </View>

              <View style={styles.offersList}>
                {RECOVERY_OFFERS.map((offer) => (
                  <TouchableOpacity
                    key={offer.id}
                    style={[
                      styles.offerCard,
                      {
                        backgroundColor: selectedOffer === offer.id
                          ? `${colors.accent.primary}10`
                          : colors.bg.card,
                        borderColor: selectedOffer === offer.id
                          ? colors.accent.primary
                          : colors.border.subtle,
                      },
                    ]}
                    onPress={() => setSelectedOffer(offer.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.offerIconSmall, { backgroundColor: `${colors.status.warning}15` }]}>
                      <AntDesign name={offer.icon as any} size={20} color={colors.status.warning} />
                    </View>
                    <View style={styles.offerTextSection}>
                      <Text style={[styles.offerTitle, { color: colors.text.primary }]}>
                        {offer.title}
                      </Text>
                      <Text style={[styles.offerDesc, { color: colors.text.secondary }]}>
                        {offer.description}
                      </Text>
                    </View>
                    <View style={styles.radioOuter}>
                      {selectedOffer === offer.id && (
                        <View style={[styles.radioInner, { backgroundColor: colors.accent.primary }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: selectedOffer ? colors.accent.primary : colors.bg.tertiary,
                  },
                ]}
                onPress={handleAcceptOffer}
                disabled={!selectedOffer || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.primaryBtnText,
                    !selectedOffer && { color: colors.text.tertiary },
                  ]}>
                    {selectedOffer ? 'Accept Offer & Keep Premium' : 'Select an Offer'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.keepBtn}
                onPress={handleContinue}
                activeOpacity={0.7}
              >
                <Text style={[styles.keepText, { color: colors.text.tertiary }]}>
                  No thanks, continue cancellation
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

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
    paddingBottom: 40,
  },
  mainContent: {
    paddingHorizontal: spacing['2xl'],
  },
  empathySection: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  empathyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empathyTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  empathySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.xl,
  },
  reasonsList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  textInput: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    marginBottom: spacing['2xl'],
  },
  primaryBtn: {
    height: 52,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  keepBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  keepText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmContent: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: 80,
    gap: spacing.lg,
  },
  confirmIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  offersList: {
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  offerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerIconSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTextSection: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  offerDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
