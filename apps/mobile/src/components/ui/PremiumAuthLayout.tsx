import React, { ReactNode } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');
const TOP_PANEL_HEIGHT = 80;

interface PremiumAuthLayoutProps {
  children: ReactNode;
}

function AuthHeaderGlow() {
  return (
    <View style={styles.glowWrapper}>
      <Svg width={SCREEN_W} height={TOP_PANEL_HEIGHT} viewBox={`0 0 ${SCREEN_W} 80`}>
        <Defs>
          <SvgGradient id="headerGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FF6B00" stopOpacity="0.12" />
            <Stop offset="0.5" stopColor="#FF6B00" stopOpacity="0.04" />
            <Stop offset="1" stopColor="#FF6B00" stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Rect x="0" y="0" width={SCREEN_W} height="80" fill="url(#headerGlow)" />
      </Svg>
    </View>
  );
}

export function PremiumAuthLayout({ children }: PremiumAuthLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <AuthHeaderGlow />
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formCard}>{children}</View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070708',
  },
  flex: {
    flex: 1,
  },
  topBar: {
    height: TOP_PANEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070708',
    overflow: 'visible',
  },
  glowWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TOP_PANEL_HEIGHT,
    zIndex: 0,
  },
  logo: {
    width: 36,
    height: 36,
    zIndex: 1,
  },
  formCard: {
    flex: 1,
    backgroundColor: '#131315',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 24,
    paddingTop: 28,
  },
});
