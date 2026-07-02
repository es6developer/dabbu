import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePremium } from '../../store/PremiumContext';
import { getFeatureTier, TIER_COLORS } from '../../config/entitlements';

const { width } = Dimensions.get('window');

interface PremiumGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showPaywall?: boolean;
}

export function PremiumGate({ featureKey, children, fallback, showPaywall = true }: PremiumGateProps) {
  const { canAccess, checkEntitlement } = usePremium();
  const allowed = canAccess(featureKey);

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showPaywall) {
    return <PaywallInline featureKey={featureKey} />;
  }

  return null;
}

function PaywallInline({ featureKey }: { featureKey: string }) {
  const navigation = useNavigation<any>();
  const { checkEntitlement } = usePremium();
  const result = checkEntitlement(featureKey);
  const requiredTier = result.upgradePlan || 'PREMIUM';
  const tierColor = TIER_COLORS[requiredTier] || '#FFD700';
  const featureTier = getFeatureTier(featureKey);

  const FEATURE_LABELS: Record<string, string> = {
    net_worth: 'Net Worth Tracking',
    health_score: 'Financial Health Score',
    advanced_reports: 'Advanced Reports',
    ai_coach: 'AI Coach',
    advanced_ai_insights: 'AI Insights',
    export_pdf: 'PDF Export',
    export_excel: 'Excel Export',
    custom_categories: 'Custom Categories',
    investment_tracker: 'Investment Tracker',
    bill_prediction: 'Bill Predictions',
    emergency_fund_tracker: 'Emergency Fund Tracker',
    document_vault: 'Document Vault',
    priority_support: 'Priority Support',
    unlimited_transactions: 'Unlimited Transactions',
    unlimited_goals: 'Unlimited Goals',
    unlimited_budgets: 'Unlimited Budgets',
    unlimited_history: 'Unlimited History',
    family_dashboard: 'Family Dashboard',
    family_space: 'Family Space',
    family_goals: 'Family Goals',
    family_wealth: 'Family Wealth',
    family_contributions: 'Family Contributions',
    family_calendar: 'Family Calendar',
    family_bills: 'Family Bills',
    family_investments: 'Family Investments',
    family_ai_advisor: 'Family AI Advisor',
    family_reports: 'Family Reports',
    family_health_score: 'Family Health Score',
    shared_vault: 'Shared Vault',
    shared_documents: 'Shared Documents',
    shared_ai: 'Shared AI',
    up_to_6_members: 'Up to 6 Members',
  };

  const label = FEATURE_LABELS[featureKey] || featureKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: tierColor + '15' }]}>
        <AntDesign name="lock1" size={32} color={tierColor} />
      </View>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.subtitle}>
        This feature requires {requiredTier === 'FAMILY' ? 'Family' : 'Premium'} plan
      </Text>
      <TouchableOpacity
        style={[styles.upgradeBtn, { backgroundColor: tierColor }]}
        onPress={() => navigation.navigate('Premium')}
        activeOpacity={0.85}
      >
        <AntDesign name="star" size={16} color="#000" style={{ marginRight: 6 }} />
        <Text style={styles.upgradeBtnText}>
          Upgrade to {requiredTier === 'FAMILY' ? 'Family' : 'Premium'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface PaywallModalProps {
  visible: boolean;
  featureKey: string;
  onClose: () => void;
}

export function PaywallModal({ visible, featureKey, onClose }: PaywallModalProps) {
  const navigation = useNavigation<any>();
  const { checkEntitlement } = usePremium();
  const result = checkEntitlement(featureKey);
  const requiredTier = result.upgradePlan || 'PREMIUM';
  const tierColor = TIER_COLORS[requiredTier] || '#FFD700';

  const FEATURE_LABELS: Record<string, string> = {
    net_worth: 'Net Worth Tracking',
    health_score: 'Financial Health Score',
    advanced_reports: 'Advanced Reports',
    ai_coach: 'AI Coach',
    advanced_ai_insights: 'AI Insights',
    export_pdf: 'PDF Export',
    export_excel: 'Excel Export',
    custom_categories: 'Custom Categories',
    investment_tracker: 'Investment Tracker',
    bill_prediction: 'Bill Predictions',
    emergency_fund_tracker: 'Emergency Fund Tracker',
    document_vault: 'Document Vault',
    priority_support: 'Priority Support',
  };

  const label = FEATURE_LABELS[featureKey] || featureKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const PREMIUM_FEATURES = [
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
  ];

  const FAMILY_FEATURES = [
    'Everything in Premium',
    'Family Dashboard',
    'Family Calendar',
    'Family AI Advisor',
    'Shared Document Vault',
    'Up to 6 Members',
  ];

  const features = requiredTier === 'FAMILY' ? FAMILY_FEATURES : PREMIUM_FEATURES;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <AntDesign name="close" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          <View style={[styles.modalIconWrap, { backgroundColor: tierColor + '15' }]}>
            <AntDesign name="lock1" size={28} color={tierColor} />
          </View>

          <Text style={styles.modalTitle}>Unlock {label}</Text>
          <Text style={styles.modalSubtitle}>
            Upgrade to {requiredTier === 'FAMILY' ? 'Family' : 'Premium'} to access this feature
          </Text>

          <View style={styles.modalFeatures}>
            {features.map((feat, i) => (
              <View key={i} style={styles.modalFeatureRow}>
                <AntDesign name="check" size={14} color={tierColor} />
                <Text style={styles.modalFeatureText}>{feat}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.modalUpgradeBtn, { backgroundColor: tierColor }]}
            onPress={() => {
              onClose();
              navigation.navigate('Premium');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.modalUpgradeBtnText}>
              Upgrade to {requiredTier === 'FAMILY' ? 'Family' : 'Premium'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

interface UsageLimitBannerProps {
  featureKey: string;
  style?: any;
}

export function UsageLimitBanner({ featureKey, style }: UsageLimitBannerProps) {
  const navigation = useNavigation<any>();
  const { checkLimit, isPremium } = usePremium();
  const [limitInfo, setLimitInfo] = React.useState<{ current: number; limit: number; remaining: number } | null>(null);

  React.useEffect(() => {
    checkLimit(featureKey).then(setLimitInfo);
  }, [featureKey]);

  if (isPremium || !limitInfo || limitInfo.limit === 0 || limitInfo.remaining > 2) {
    return null;
  }

  const isAtLimit = limitInfo.remaining === 0;

  return (
    <View
      style={[
        styles.usageBanner,
        isAtLimit ? styles.usageBannerError : styles.usageBannerWarning,
        style,
      ]}
    >
      <AntDesign
        name={isAtLimit ? 'exclamationcircle' : 'infocirlceo'}
        size={14}
        color={isAtLimit ? '#FF5050' : '#F5A623'}
      />
      <Text style={[styles.usageBannerText, isAtLimit && { color: '#FF5050' }]}>
        {isAtLimit
          ? `You've reached the free limit (${limitInfo.limit}/${limitInfo.limit})`
          : `${limitInfo.remaining} of ${limitInfo.limit} remaining this period`}
      </Text>
      {!isAtLimit && (
        <TouchableOpacity onPress={() => navigation.navigate('Premium')}>
          <Text style={styles.usageBannerUpgrade}>Upgrade</Text>
        </TouchableOpacity>
      )}
      {isAtLimit && (
        <TouchableOpacity onPress={() => navigation.navigate('Premium')}>
          <Text style={[styles.usageBannerUpgrade, { color: '#FF5050' }]}>Upgrade</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#000',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  upgradeBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalFeatures: {
    gap: 12,
    marginBottom: 28,
  },
  modalFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalFeatureText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
  },
  modalUpgradeBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalUpgradeBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  },

  // Usage Banner
  usageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  usageBannerWarning: {
    backgroundColor: 'rgba(245,166,35,0.12)',
  },
  usageBannerError: {
    backgroundColor: 'rgba(255,80,80,0.12)',
  },
  usageBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#F5A623',
  },
  usageBannerUpgrade: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD700',
  },
});
