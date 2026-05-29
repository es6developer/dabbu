import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PremiumUpgradeModalProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade: () => void;
  groupName?: string;
  currentLimit: number;
  premiumLimit: number;
}

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'people-outline', text: 'Up to 30 members per group' },
  { icon: 'stats-chart-outline', text: 'Advanced analytics & reports' },
  { icon: 'cloud-download-outline', text: 'Export PDF/Excel' },
  { icon: 'cloud-outline', text: 'Cloud backup' },
  { icon: 'sparkles-outline', text: 'AI-powered spending insights' },
  { icon: 'infinite-outline', text: 'Unlimited groups' },
];

export function PremiumUpgradeModal({
  visible, onDismiss, onUpgrade, groupName, currentLimit, premiumLimit,
}: PremiumUpgradeModalProps) {
  const { colors, spacing, borderRadius: br, typography } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.bg.secondary }]}>
          <LinearGradient
            colors={['#f7892c', '#e06b00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientHeader}
          >
            <View style={styles.crownIcon}>
              <Ionicons name="diamond" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
            <Text style={styles.premiumSubtitle}>
              {groupName ? `"${groupName}" has reached its limit.` : 'Free plan limit reached.'}
            </Text>
          </LinearGradient>

          <View style={styles.body}>
            <View style={styles.limitCard}>
              <View style={styles.limitItem}>
                <Text style={[styles.limitLabel, { color: colors.text.tertiary }]}>Current</Text>
                <Text style={[styles.limitValue, { color: colors.text.primary }]}>{currentLimit} members</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.accent.primary} />
              <View style={styles.limitItem}>
                <Text style={[styles.limitLabel, { color: colors.text.tertiary }]}>Premium</Text>
                <Text style={[styles.limitValue, { color: colors.accent.primary }]}>{premiumLimit} members</Text>
              </View>
            </View>

            <View style={styles.featuresList}>
              {FEATURES.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.accent.primary + '20' }]}>
                    <Ionicons name={f.icon} size={16} color={colors.accent.primary} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.text.primary }]}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: colors.accent.primary }]}
              onPress={onUpgrade}
              activeOpacity={0.8}
            >
              <Ionicons name="diamond-outline" size={20} color="#FFFFFF" />
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.laterBtn, { borderColor: colors.border.subtle }]}
              onPress={onDismiss}
            >
              <Text style={[styles.laterBtnText, { color: colors.text.secondary }]}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradientHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  crownIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  premiumSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    textAlign: 'center',
  },
  body: {
    padding: 24,
  },
  limitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(247,137,44,0.08)',
    marginBottom: 24,
  },
  limitItem: {
    alignItems: 'center',
  },
  limitLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  limitValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  featuresList: {
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  actions: {
    padding: 24,
    paddingTop: 0,
    gap: 12,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  laterBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  laterBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
