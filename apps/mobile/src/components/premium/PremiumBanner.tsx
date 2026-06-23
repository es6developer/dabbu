import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';

interface PremiumBannerProps {
  feature?: string;
  dismissible?: boolean;
  variant?: 'default' | 'compact' | 'creditcard';
}

export function PremiumBanner({
  feature,
  dismissible = true,
  variant = 'default',
}: PremiumBannerProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDismissed(true));
  };

  if (dismissed) return null;

  const handleUpgrade = () => {
    navigation.navigate('Settings', { screen: 'Premium' });
  };

  if (variant === 'compact') {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          {
            backgroundColor: colors.bg.card,
            borderColor: colors.border.subtle,
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          },
        ]}
      >
        <View style={[styles.compactIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
          <AntDesign name="star" size={14} color={colors.accent.primary} />
        </View>
        <Text style={[styles.compactText, { color: colors.text.secondary }]} numberOfLines={1}>
          {feature ? `Unlimited ${feature} with Premium` : 'Upgrade to Premium'}
        </Text>
        <TouchableOpacity
          style={[styles.compactBtn, { backgroundColor: colors.accent.primary }]}
          onPress={handleUpgrade}
          activeOpacity={0.8}
        >
          <Text style={styles.compactBtnText}>Upgrade</Text>
        </TouchableOpacity>
        {dismissible && (
          <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AntDesign name="close" size={14} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }

  if (variant === 'creditcard') {
    return (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          },
        ]}
      >
        <LinearGradient
          colors={['#1F1A3A', '#2E1A47']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardTextSection}>
              <Text style={styles.cardTitle}>Go Premium</Text>
              <Text style={styles.cardDesc}>
                {feature ? `Unlock unlimited ${feature} and more` : 'Unlock all premium features'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.cardBtn, { backgroundColor: colors.accent.primary }]}
              onPress={handleUpgrade}
              activeOpacity={0.8}
            >
              <Text style={styles.cardBtnText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
          {dismissible && (
            <TouchableOpacity style={styles.cardDismiss} onPress={handleDismiss}>
              <AntDesign name="close" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.defaultContainer,
        {
          backgroundColor: colors.bg.card,
          borderColor: colors.border.subtle,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      <View style={styles.defaultContent}>
        <View style={[styles.defaultIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
          <AntDesign name="star" size={18} color={colors.accent.primary} />
        </View>
        <View style={styles.defaultTextSection}>
          <Text style={[styles.defaultTitle, { color: colors.text.primary }]}>Upgrade to Premium</Text>
          <Text style={[styles.defaultDesc, { color: colors.text.secondary }]}>
            {feature ? `Get unlimited ${feature} & advanced insights` : 'Unlock reports, analytics & more'}
          </Text>
        </View>
      </View>
      <View style={styles.defaultActions}>
        <TouchableOpacity
          style={[styles.defaultBtn, { backgroundColor: colors.accent.primary }]}
          onPress={handleUpgrade}
          activeOpacity={0.8}
        >
          <Text style={styles.defaultBtnText}>Upgrade</Text>
        </TouchableOpacity>
        {dismissible && (
          <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AntDesign name="close" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  defaultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: borderRadius['3xl'],
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  defaultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  defaultIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultTextSection: {
    flex: 1,
  },
  defaultTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  defaultDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  defaultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  defaultBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  defaultBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  compactIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  compactBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  compactBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContainer: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  cardGradient: {
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    position: 'relative',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },
  cardBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 999,
  },
  cardBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cardDismiss: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
});
