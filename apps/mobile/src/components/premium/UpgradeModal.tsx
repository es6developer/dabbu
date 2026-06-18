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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UpgradeModalProps {
  visible: boolean;
  onDismiss: () => void;
  feature?: string;
}

export function UpgradeModal({ visible, onDismiss, feature }: UpgradeModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
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

  const features = [
    { icon: 'infinito', label: feature ? `Unlimited ${feature}` : 'Unlimited access' },
    { icon: 'linechart', label: 'Advanced analytics & reports' },
    { icon: 'bulb1', label: 'AI-powered insights' },
    { icon: 'star', label: 'Priority support' },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.container}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + spacing.lg,
              backgroundColor: colors.bg.card,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border.subtle }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.accent.primary}15` }]}>
                <AntDesign name="star" size={32} color={colors.accent.primary} />
              </View>
            </View>

            <Text style={[styles.title, { color: colors.text.primary }]}>
              Upgrade to unlock{feature ? ` ${feature}` : ' premium features'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              Get unlimited access to all premium features and take control of your finances.
            </Text>

            {feature && (
              <View style={[styles.limitCard, { backgroundColor: colors.bg.secondary }]}>
                <Text style={[styles.limitLabel, { color: colors.text.secondary }]}>Current limit</Text>
                <Text style={[styles.limitValue, { color: colors.text.primary }]}>3 {feature}</Text>
                <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
                <Text style={[styles.limitLabel, { color: colors.text.secondary }]}>Premium</Text>
                <Text style={[styles.limitValue, { color: colors.accent.primary }]}>Unlimited</Text>
              </View>
            )}

            <View style={styles.featureList}>
              {features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: `${colors.status.success}15` }]}>
                    <AntDesign name={f.icon as any} size={14} color={colors.status.success} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.text.primary }]}>{f.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: colors.accent.primary }]}
              onPress={handleUpgrade}
              activeOpacity={0.85}
            >
              <AntDesign name="star" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={[styles.laterText, { color: colors.text.tertiary }]}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing['2xl'],
  },
  limitCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  limitLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  limitValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 30,
    marginHorizontal: spacing.md,
  },
  featureList: {
    gap: spacing.md,
    marginBottom: spacing['2xl'],
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
  },
  laterText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
