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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface PremiumAuthLayoutProps {
  children: ReactNode;
  subtitle?: string;
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
        <View style={[styles.headerSection, { paddingTop: insets.top + 40 }]}>
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
    marginTop: 8,
    letterSpacing: -0.5,
    zIndex: 1,
  },
  tagline: {
    fontSize: 13,
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
