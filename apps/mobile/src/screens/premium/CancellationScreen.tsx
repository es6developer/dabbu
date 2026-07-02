import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Animated, ActivityIndicator } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { usePremium } from '../../store/PremiumContext';

import { alertService } from "../../components/ui";
const CANCEL_REASONS = [
  { id: 'PRICE', label: 'Too expensive', icon: 'wallet' },
  { id: 'USAGE', label: 'Not using enough', icon: 'clockcircleo' },
  { id: 'FEATURES', label: 'Missing features', icon: 'frown' },
  { id: 'TECHNICAL', label: 'Technical issues', icon: 'exception' },
  { id: 'ALTERNATIVE', label: 'Found an alternative', icon: 'swap' },
  { id: 'OTHER', label: 'Other reason', icon: 'meh' },
];

export function CancellationScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { refresh, isPremium } = usePremium();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [step, setStep] = useState<'reason' | 'offer' | 'confirmation'>('reason');
  const [offer, setOffer] = useState<any>(null);
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
      setLoading(true);
      try {
        const result = await api.post<any>('/premium/cancellation/recovery', {
          reason: selectedReason,
          reasonText: details || undefined,
        });
        setOffer(result);
        setStep('offer');
      } catch (e: any) {
        alertService.alert('Error', e?.message || 'Failed to process');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      await api.post('/premium/cancel', {
        reason: selectedReason,
        reasonCode: selectedReason,
      });
      await refresh();
      setStep('confirmation');
    } catch (e: any) {
      alertService.alert('Error', e?.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    setLoading(true);
    try {
      await api.post('/premium/cancellation/accept');
      await refresh();
      alertService.alert('Offer Accepted!', 'Your special offer has been applied. Welcome back!', [
        { text: 'Great!', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      alertService.alert('Error', e?.message || 'Failed to apply offer');
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
            <View style={[styles.confirmIcon, { backgroundColor: '#FF505015' }]}>
              <AntDesign name="exclamationcircle" size={48} color="#FF5050" />
            </View>
            <Text style={styles.confirmTitle}>Subscription Cancelled</Text>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.mainContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {step === 'reason' && (
            <>
              <View style={styles.empathySection}>
                <View style={[styles.empathyIcon, { backgroundColor: '#FF505010' }]}>
                  <AntDesign name="frowno" size={40} color="#FF5050" />
                </View>
                <Text style={styles.empathyTitle}>We're sorry to see you go</Text>
                <Text style={[styles.empathySubtitle, { color: 'rgba(255,255,255,0.6)' }]}>
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
                        backgroundColor: selectedReason === reason.id ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.05)',
                        borderColor: selectedReason === reason.id ? '#FFD700' : 'rgba(255,255,255,0.08)',
                      },
                    ]}
                    onPress={() => setSelectedReason(reason.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.reasonIcon, { backgroundColor: selectedReason === reason.id ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)' }]}>
                      <AntDesign name={reason.icon as any} size={18} color={selectedReason === reason.id ? '#FFD700' : 'rgba(255,255,255,0.5)'} />
                    </View>
                    <Text style={[styles.reasonLabel, { color: selectedReason === reason.id ? '#FFD700' : '#FFFFFF' }]}>
                      {reason.label}
                    </Text>
                    <View style={styles.radioOuter}>
                      {selectedReason === reason.id && <View style={[styles.radioInner, { backgroundColor: '#FFD700' }]} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedReason && (
                <TextInput
                  style={[styles.textInput, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }]}
                  placeholder="Tell us more (optional)"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: selectedReason ? '#FFD700' : 'rgba(255,255,255,0.1)' }]}
                onPress={handleContinue}
                disabled={!selectedReason || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: selectedReason ? '#000' : 'rgba(255,255,255,0.4)' }]}>
                    Continue
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.keepBtn} onPress={handleKeepPremium} activeOpacity={0.7}>
                <Text style={[styles.keepText, { color: '#FFD700' }]}>Keep My Premium</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'offer' && offer && (
            <>
              <View style={styles.empathySection}>
                <View style={[styles.offerIcon, { backgroundColor: 'rgba(255,215,0,0.15)' }]}>
                  <AntDesign name="gift" size={40} color="#FFD700" />
                </View>
                <Text style={styles.empathyTitle}>Wait! Here's a special offer</Text>
                <Text style={[styles.empathySubtitle, { color: 'rgba(255,255,255,0.6)' }]}>
                  We'd love to keep you as a premium member
                </Text>
              </View>

              <View style={[styles.offerCardDisplay, { backgroundColor: 'rgba(255,215,0,0.08)', borderColor: 'rgba(255,215,0,0.3)' }]}>
                <View style={[styles.offerCardIcon, { backgroundColor: 'rgba(255,215,0,0.15)' }]}>
                  <AntDesign name="gift" size={32} color="#FFD700" />
                </View>
                <Text style={styles.offerCardTitle}>{offer.description}</Text>
                <Text style={styles.offerCardExpiry}>
                  Offer expires {new Date(offer.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#FFD700' }]}
                onPress={handleAcceptOffer}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: '#000' }]}>Accept Offer & Keep Premium</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.keepBtn} onPress={handleContinue} activeOpacity={0.7}>
                <Text style={[styles.keepText, { color: 'rgba(255,255,255,0.4)' }]}>
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
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 19, fontWeight: '600' },
  scrollContent: { paddingBottom: 44 },
  mainContent: { paddingHorizontal: spacing['2xl'] },
  empathySection: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.md },
  empathyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  empathyTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  empathySubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: spacing.xl },
  reasonsList: { gap: spacing.sm, marginBottom: spacing.lg },
  reasonCard: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.lg,
    borderRadius: borderRadius.xl, borderWidth: 1.5, gap: spacing.md,
  },
  reasonIcon: { width: 36, height: 36, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  reasonLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  radioOuter: { width: 22, height: 22, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 12 },
  textInput: {
    borderRadius: borderRadius['2xl'], borderWidth: 1.5, padding: spacing.xl,
    fontSize: 16, fontWeight: '500', lineHeight: 24, minHeight: 100, marginBottom: spacing['2xl'],
  },
  primaryBtn: { height: 54, borderRadius: borderRadius['3xl'], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  primaryBtnText: { fontSize: 19, fontWeight: '700' },
  keepBtn: { alignItems: 'center', paddingVertical: spacing.md },
  keepText: { fontSize: 16, fontWeight: '600' },
  confirmContent: { alignItems: 'center', paddingHorizontal: spacing['2xl'], paddingTop: 80, gap: spacing.lg },
  confirmIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  confirmSubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  content: { flex: 1, justifyContent: 'center' },
  offerCardDisplay: {
    borderRadius: borderRadius.xl, borderWidth: 1.5, padding: spacing['2xl'],
    alignItems: 'center', gap: spacing.md, marginBottom: spacing['2xl'],
  },
  offerCardIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  offerCardTitle: { fontSize: 19, fontWeight: '800', color: '#FFD700', textAlign: 'center' },
  offerCardExpiry: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  offerIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
