import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { COUPLE_COLORS } from '../../hooks/useCoupleMode';

interface Props {
  onToggle?: (active: boolean) => void;
}

export function CoupleModeToggle({ onToggle }: Props) {
  const { colors, isDark } = useTheme();
  const { user, toggleCoupleMode } = useAuth();
  const { showToast } = useToast();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isCouple = !!user?.isCouple;
  const isCoupleMode = !!user?.isCoupleMode;
  const togglingRef = useRef(false);

  if (!isCouple) {
    return null;
  }

  const handleToggle = useCallback(
    (value: boolean) => {
      if (togglingRef.current) {
        return;
      }
      togglingRef.current = true;
      setTimeout(() => {
        togglingRef.current = false;
      }, 500);

      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      toggleCoupleMode(value);
      onToggle?.(value);
      showToast(value ? 'Couple Mode ON — pink theme active' : 'Couple Mode OFF', 'info');
    },
    [toggleCoupleMode, onToggle, pulseAnim, showToast],
  );

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          backgroundColor: isCoupleMode ? COUPLE_COLORS.bg : colors.bg.card,
          borderColor: isCoupleMode ? COUPLE_COLORS.border : colors.border.subtle,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        activeOpacity={0.7}
        onPress={() => handleToggle(!isCoupleMode)}
      >
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: isCoupleMode ? COUPLE_COLORS.primary : `${colors.accent.primary}12`,
            },
          ]}
        >
          <Ionicons
            name={isCoupleMode ? 'heart' : 'heart-outline'}
            size={18}
            color={isCoupleMode ? '#FFF' : colors.accent.primary}
          />
        </View>
        <View style={styles.textWrap}>
          <Text
            style={[
              styles.label,
              { color: isCoupleMode ? COUPLE_COLORS.text : colors.text.primary },
            ]}
          >
            Couple Mode
          </Text>
          <Text
            style={[
              styles.subLabel,
              { color: isCoupleMode ? COUPLE_COLORS.textSecondary : colors.text.tertiary },
            ]}
          >
            {isCoupleMode ? 'Active - Pink theme' : 'Tap to activate'}
          </Text>
        </View>
        <Switch
          value={isCoupleMode}
          onValueChange={handleToggle}
          trackColor={{ false: isDark ? '#333' : '#E5E7EB', true: COUPLE_COLORS.primary }}
          thumbColor={isCoupleMode ? '#FFF' : isDark ? '#666' : '#FFF'}
          ios_backgroundColor={isDark ? '#333' : '#E5E7EB'}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
});
