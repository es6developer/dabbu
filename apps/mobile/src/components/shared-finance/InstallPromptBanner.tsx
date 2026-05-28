import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Linking, Animated, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, borderRadius, typography } from '../../theme';
import { trackInstallRedirect } from '../../services/external-sharing';

type PlatformType = 'ios' | 'android' | 'pwa';

interface InstallPromptBannerProps {
  source?: string;
  onDismiss?: () => void;
  onInstalled?: () => void;
}

const APP_STORE_URL_IOS = 'https://apps.apple.com/app/dabbu/id123456789';
const PLAY_STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=com.dabbu.app';

export const InstallPromptBanner: React.FC<InstallPromptBannerProps> = ({
  source = 'banner',
  onDismiss,
  onInstalled,
}) => {
  const { colors, isDark } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const platform: PlatformType = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'pwa';

  const handleInstall = useCallback(async () => {
    try {
      await trackInstallRedirect(source);
      const url = platform === 'ios' ? APP_STORE_URL_IOS : PLAY_STORE_URL_ANDROID;
      await Linking.openURL(url);
      onInstalled?.();
    } catch {
      // ignore
    }
  }, [platform, source, onInstalled]);

  const handleDismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setDismissed(true);
      onDismiss?.();
    });
  }, [slideAnim, onDismiss]);

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  if (dismissed) return null;

  const storeLabel = platform === 'ios' ? 'Download on the' : 'Get it on';
  const storeName = platform === 'ios' ? 'App Store' : 'Google Play';
  const badgeImage = platform === 'ios'
    ? 'https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg'
    : 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(20, 20, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderColor: colors.border.subtle,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="logo-apple" size={28} color={colors.accent.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[typography.calloutBold, { color: colors.text.primary }]}>
            Get the full Dabbu experience
          </Text>
          <Text style={[typography.subhead, { color: colors.text.secondary, marginTop: 2 }]}>
            {storeLabel} {storeName}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.storeButton, { backgroundColor: colors.accent.primary }]}
          onPress={handleInstall}
          activeOpacity={0.8}
        >
          <Ionicons
            name={platform === 'ios' ? 'logo-apple' : 'logo-google'}
            size={16}
            color="#FFFFFF"
          />
          <Text style={[typography.buttonSmall, { color: '#FFFFFF', marginLeft: 6 }]}>
            {platform === 'pwa' ? 'Install' : 'Get'}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={[typography.subhead, { color: colors.text.tertiary }]}>Not Now</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
});
