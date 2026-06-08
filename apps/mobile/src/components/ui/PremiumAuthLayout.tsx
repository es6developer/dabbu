import React, { ReactNode } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOP_PANEL_HEIGHT = SCREEN_HEIGHT * 0.35;

interface PremiumAuthLayoutProps {
  children: ReactNode;
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
        <LinearGradient
          colors={['#131315', '#070708']}
          locations={[0, 1]}
          style={[styles.topPanel, { paddingTop: insets.top + 20 }]}
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </LinearGradient>

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
  },
  logo: {
    width: 72,
    height: 72,
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
