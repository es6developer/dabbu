import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';

type IconName = string;

interface FormFooterProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
  secondaryTitle?: string;
  onSecondaryPress?: () => void;
}

export function FormFooter({
  title,
  onPress,
  loading,
  disabled,
  icon = 'checkcircleo',
  style,
  secondaryTitle,
  onSecondaryPress,
}: FormFooterProps) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  }, [onPress]);

  return (
    <View style={styles.footer}>
      {secondaryTitle && onSecondaryPress && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onSecondaryPress();
          }}
          activeOpacity={0.7}
          style={[styles.secondaryBtn, { backgroundColor: colors.bg.tertiary }]}
        >
          <Text style={[styles.secondaryText, { color: colors.text.secondary }]}>
            {secondaryTitle}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={[
          styles.primaryBtnWrap,
          (disabled || loading) && { opacity: 0.65 },
          style,
        ]}
      >
        <LinearGradient
          colors={[colors.accent.primary, colors.accent.secondary || colors.accent.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryBtn}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <AntDesign name={icon as any} size={18} color="#FFFFFF" />
              <Text style={styles.primaryText}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: 6,
  },
  primaryBtnWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  primaryBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
