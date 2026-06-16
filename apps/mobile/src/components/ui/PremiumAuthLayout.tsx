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
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface PremiumAuthLayoutProps {
  children: ReactNode;
  subtitle?: string;
}

function HeaderGradient({ color }: { color: string }) {
  return (
    <View style={styles.glowWrapper}>
      <Svg width={SCREEN_W} height={220} viewBox={`0 0 ${SCREEN_W} 220`}>
        <Defs>
          <SvgGradient id="topGlow" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.2" />
            <Stop offset="0.5" stopColor={color} stopOpacity="0.06" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Rect x="0" y="0" width={SCREEN_W} height="220" fill="url(#topGlow)" />
      </Svg>
    </View>
  );
}

export function PremiumAuthLayout({ children, subtitle }: PremiumAuthLayoutProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 25}
      >
        <View style={[styles.headerSection, { backgroundColor: colors.bg.primary, paddingTop: insets.top + 40 }]}>
          <HeaderGradient color={colors.accent.primary} />
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.brandName, { color: colors.text.primary }]}>Dabbu</Text>
          {subtitle ? <Text style={[styles.tagline, { color: colors.text.tertiary }]}>{subtitle}</Text> : null}
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.bg.secondary, borderTopColor: colors.border.default }]}>
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
    paddingBottom: 12,
  },
  glowWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    zIndex: 0,
  },
  logo: {
    width: 40,
    height: 40,
    zIndex: 1,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Inter-Bold',
    marginTop: 8,
    letterSpacing: -0.5,
    zIndex: 1,
  },
  tagline: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    letterSpacing: 0.2,
    zIndex: 1,
  },
  formCard: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
});
