import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';

interface UpgradeBannerProps {
  variant?: 'top' | 'inline';
  message?: string;
}

export function UpgradeBanner({
  variant = 'top',
  message = 'Unlock unlimited groups, advanced analytics & more',
}: UpgradeBannerProps) {
  const { user, isPremium, refreshPremiumStatus } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const slideAnim = useRef(new Animated.Value(variant === 'top' ? -80 : 30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refreshPremiumStatus();
      }
    }, [user]),
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!user || isPremium) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor: colors.border.default,
          backgroundColor: colors.bg.primary,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={[styles.glowLeft, { backgroundColor: colors.brand.light }]} />
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.brand.primary }]}>
          <Ionicons name="diamond" size={18} color="#FFFFFF" />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.brand.primary }]}>Go Premium</Text>
          <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.brand.primary }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Settings', { screen: 'Premium' })}
      >
        <Text style={[styles.buttonText, { color: colors.text.inverse }]}>Upgrade</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  glowLeft: {
    position: 'absolute',
    left: -20,
    top: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
