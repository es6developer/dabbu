import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Modal, Dimensions, StatusBar, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, borderRadius, typography } from '../../theme';
import { BannerData } from '../../services/external-sharing';

interface UpgradeBannerProps {
  banner: BannerData;
  onDismiss: (bannerId: string) => void;
  onClick: (banner: BannerData) => void;
  onShow?: (bannerId: string) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
  banner,
  onDismiss,
  onClick,
  onShow,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(banner.bannerType === 'slide_in' ? -100 : 100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    onShow?.(banner.id);
    const animations: Animated.CompositeAnimation[] = [];

    if (banner.bannerType === 'modal') {
      animations.push(
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
      );
    }

    animations.push(
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    );

    Animated.parallel(animations).start();
  }, []);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: banner.bannerType === 'slide_in' ? -100 : 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onDismiss(banner.id);
    });
  }, [banner.bannerType, slideAnim, opacityAnim, onDismiss]);

  const handleCTA = useCallback(() => {
    onClick(banner);
    if (banner.ctaAction === 'dismiss') {
      handleDismiss();
    }
  }, [banner, onClick, handleDismiss]);

  const renderContent = () => (
    <LinearGradient
      colors={banner.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.gradientContainer,
        banner.bannerType === 'modal' && styles.modalContainer,
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          <Text style={[typography.calloutBold, { color: '#FFFFFF' }]}>
            {banner.title}
          </Text>
          <Text style={[typography.subhead, { color: 'rgba(255,255,255,0.8)', marginTop: 4 }]}>
            {banner.description}
          </Text>
        </View>
        {banner.ctaAction !== 'dismiss' && (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleCTA}
            activeOpacity={0.8}
          >
            <Text style={[typography.buttonSmall, { color: banner.gradient[0] }]}>
              {banner.ctaText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleDismiss}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </LinearGradient>
  );

  if (banner.bannerType === 'modal') {
    return (
      <Modal visible={visible} transparent animationType="none">
        <StatusBar barStyle="light-content" />
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }]}>
          <Animated.View
            style={[
              styles.modalWrapper,
              {
                transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            {renderContent()}
          </Animated.View>
        </View>
      </Modal>
    );
  }

  if (!visible) return null;

  const isSticky = banner.bannerType === 'sticky';
  const containerStyle = isSticky
    ? [styles.stickyContainer, { paddingBottom: insets.bottom || spacing.md }]
    : banner.bannerType === 'slide_in'
    ? [styles.slideInContainer, { paddingTop: insets.top }]
    : styles.inlineContainer;

  return (
    <Animated.View
      style={[
        containerStyle,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      {renderContent()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  stickyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  slideInContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  inlineContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  gradientContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalContainer: {
    minHeight: 200,
    justifyContent: 'center',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    marginLeft: spacing.md,
  },
  closeButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWrapper: {
    width: '85%',
    maxWidth: 400,
  },
});
