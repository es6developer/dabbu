import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { usePremium } from '../../store/PremiumContext';

interface UpgradeBannerProps {
  variant?: 'top' | 'inline';
  message?: string;
}

export function UpgradeBanner({
  variant = 'top',
  message = 'Unlock unlimited groups, advanced analytics & more',
}: UpgradeBannerProps) {
  const { user } = useAuth();
  const { checkEntitlement, refreshSubscription } = usePremium();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const slideAnim = useRef(new Animated.Value(variant === 'top' ? -80 : 30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refreshSubscription();
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

  if (!user || checkEntitlement('export_pdf').allowed) {
    return null;
  }

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
        marginHorizontal: 16,
        marginVertical: 8,
      }}
    >
      <LinearGradient
        colors={['#1F1A3A', '#2E1A47']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.containerGradient}
      >
        <View style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <AntDesign name="star" size={18} color="#FFFFFF" />
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
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  containerGradient: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  button: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 84,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
