import React, { ReactNode } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT, width: SCREEN_W } = Dimensions.get('window');
const TOP_PANEL_HEIGHT = SCREEN_HEIGHT * 0.35;

interface PremiumAuthLayoutProps {
  children: ReactNode;
}

function AuthVectors() {
  return (
    <View style={styles.vectorsWrapper}>
      <Svg width={SCREEN_W} height={TOP_PANEL_HEIGHT} viewBox={`0 0 ${SCREEN_W} ${TOP_PANEL_HEIGHT}`}>
        <Defs>
          <SvgGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FF6B00" stopOpacity="0.15" />
            <Stop offset="1" stopColor="#FF6B00" stopOpacity="0.03" />
          </SvgGradient>
          <SvgGradient id="grad2" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#FF6B00" stopOpacity="0.08" />
            <Stop offset="1" stopColor="#FF6B00" stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Circle cx={SCREEN_W * 0.8} cy={TOP_PANEL_HEIGHT * 0.15} r={60} fill="url(#grad1)" />
        <Circle cx={SCREEN_W * 0.2} cy={TOP_PANEL_HEIGHT * 0.35} r={90} fill="url(#grad2)" />
        <Circle cx={SCREEN_W * 0.55} cy={TOP_PANEL_HEIGHT * 0.65} r={50} fill="url(#grad1)" />
        <Circle cx={SCREEN_W * 0.9} cy={TOP_PANEL_HEIGHT * 0.55} r={35} fill="url(#grad2)" />
        <Path
          d={`M 0 ${TOP_PANEL_HEIGHT * 0.6} Q ${SCREEN_W * 0.25} ${TOP_PANEL_HEIGHT * 0.5} ${SCREEN_W * 0.45} ${TOP_PANEL_HEIGHT * 0.65} T ${SCREEN_W} ${TOP_PANEL_HEIGHT * 0.55} L ${SCREEN_W} ${TOP_PANEL_HEIGHT} L 0 ${TOP_PANEL_HEIGHT} Z`}
          fill="url(#grad2)"
          opacity={0.5}
        />
        <Path
          d={`M 0 ${TOP_PANEL_HEIGHT * 0.55} Q ${SCREEN_W * 0.35} ${TOP_PANEL_HEIGHT * 0.45} ${SCREEN_W * 0.55} ${TOP_PANEL_HEIGHT * 0.58} T ${SCREEN_W} ${TOP_PANEL_HEIGHT * 0.52} L ${SCREEN_W} ${TOP_PANEL_HEIGHT} L 0 ${TOP_PANEL_HEIGHT} Z`}
          fill="#070708"
        />
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
        <View style={[styles.topPanel, { paddingTop: insets.top + 20, backgroundColor: '#131315' }]}>
          <AuthVectors />
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
  topPanel: {
    height: TOP_PANEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  vectorsWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  logo: {
    width: 72,
    height: 72,
    zIndex: 1,
  },
  formCard: {
    flex: 1,
    backgroundColor: '#131315',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
});
