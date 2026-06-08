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
          borderColor: 'rgba(212, 168, 83, 0.3)',
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.glowLeft} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="diamond" size={18} color="#1A1835" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Go Premium</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Settings', { screen: 'Premium' })}
      >
        <Text style={styles.buttonText}>Upgrade</Text>
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
    backgroundColor: '#1A1835',
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
    backgroundColor: 'rgba(243, 210, 143, 0.08)',
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
    backgroundColor: '#F3D28F',
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
    color: '#F3D28F',
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(243, 210, 143, 0.7)',
  },
  button: {
    backgroundColor: '#F3D28F',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: '#1A1835',
    fontSize: 13,
    fontWeight: '700',
  },
});
