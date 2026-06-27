import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';

const { width: SCREEN_W } = Dimensions.get('window');

interface PremiumAuthLayoutProps {
  children: ReactNode;
  subtitle?: string;
}

export function PremiumAuthLayout({ children, subtitle }: PremiumAuthLayoutProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 25}
      >
        <LinearGradient
          colors={[colors.bg.gradientStart, colors.bg.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerSection, { paddingTop: insets.top + 40 }]}
        >
          <View style={[styles.glowBadge, { backgroundColor: colors.accent.primary + '15' }]}>
            <View style={[styles.glowInner, { backgroundColor: colors.accent.primary + '20' }]}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={[styles.brandName, { color: colors.text.primary }]}>Dabbu</Text>
          {subtitle ? (
            <Text style={[styles.tagline, { color: colors.text.tertiary }]}>{subtitle}</Text>
          ) : null}
        </LinearGradient>

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.bg.secondary,
              borderTopColor: colors.border.subtle,
              ...shadows.lg,
            },
          ]}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerSection: {
    alignItems: 'center',
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  glowBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  glowInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 40,
    height: 40,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 20,
  },
  formCard: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'],
  },
});
