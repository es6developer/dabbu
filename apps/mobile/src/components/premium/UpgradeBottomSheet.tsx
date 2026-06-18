import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UpgradeBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  feature?: string;
  featureLabel?: string;
  currentLimit?: number;
  premiumLimit?: string;
  plan?: 'PREMIUM' | 'FAMILY';
}

export function UpgradeBottomSheet({
  visible,
  onDismiss,
  feature,
  featureLabel,
  currentLimit,
  premiumLimit = 'Unlimited',
  plan = 'PREMIUM',
}: UpgradeBottomSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleUpgrade = () => {
    onDismiss();
    navigation.navigate('Settings', { screen: 'Premium' });
  };

  const planGradient = plan === 'FAMILY' ? (['#D97706', '#B45309'] as const) : (['#7C3AED', '#6D28D9'] as const);
  const planColor = plan === 'FAMILY' ? '#D97706' : '#7C3AED';

  const upgradeFeatures = plan === 'FAMILY'
    ? [
        { icon: 'team', label: 'Family dashboard & analytics' },
        { icon: 'user', label: 'Up to 6 family members' },
        { icon: 'linechart', label: 'Shared wealth tracking' },
        { icon: 'star', label: 'Priority support' },
      ]
    : [
        { icon: 'infinito', label: feature ? `Unlimited ${featureLabel || feature}` : 'Unlimited access' },
        { icon: 'linechart', label: 'Advanced analytics & reports' },
        { icon: 'bulb1', label: 'AI-powered insights' },
        { icon: 'star', label: 'Priority support' },
      ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + spacing.lg,
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB' }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={planGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <AntDesign name="star" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>Upgrade to {plan === 'FAMILY' ? 'Family' : 'Premium'}</Text>
              <Text style={styles.headerSubtitle}>
                {feature
                  ? `Unlock ${featureLabel || feature} and all premium features`
                  : 'Get unlimited access to all features'}
              </Text>
            </LinearGradient>

            {currentLimit !== undefined && feature && (
              <View style={[styles.limitCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8F8FA' }]}>
                <View style={styles.limitRow}>
                  <View style={styles.limitItem}>
                    <Text style={[styles.limitLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }]}>
                      Current
                    </Text>
                    <Text style={[styles.limitValue, { color: isDark ? '#FFF' : '#111' }]}>
                      {currentLimit} {featureLabel || feature}
                    </Text>
                  </View>
                  <AntDesign name="arrowright" size={20} color={planColor} />
                  <View style={styles.limitItem}>
                    <Text style={[styles.limitLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }]}>
                      Premium
                    </Text>
                    <Text style={[styles.limitValue, { color: planColor }]}>
                      {premiumLimit}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.featureList}>
              {upgradeFeatures.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: `${planColor}15` }]}>
                    <AntDesign name={f.icon as any} size={14} color={planColor} />
                  </View>
                  <Text style={[styles.featureText, { color: isDark ? '#FFF' : '#111' }]}>
                    {f.label}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.priceText, { color: isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }]}>
              {plan === 'FAMILY' ? 'From ₹199/month' : 'From ₹99/month'} • Cancel anytime
            </Text>

            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: planColor }]}
              onPress={handleUpgrade}
              activeOpacity={0.85}
            >
              <AntDesign name="star" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.upgradeBtnText}>
                Upgrade to {plan === 'FAMILY' ? 'Family' : 'Premium'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={[styles.laterText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    maxHeight: SCREEN_HEIGHT * 0.88,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  headerGradient: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing['2xl'],
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  limitCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  limitItem: {
    alignItems: 'center',
    gap: 4,
  },
  limitLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  limitValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  featureList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  upgradeBtn: {
    height: 52,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  laterBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  laterText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
