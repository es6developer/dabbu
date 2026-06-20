import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { WidgetType, getWidgetDef } from './WidgetRegistry';

interface WidgetWrapperProps {
  type: WidgetType;
  data: any;
  onPress?: () => void;
  onToggle?: () => void;
  onLongPress?: () => void;
  enabled?: boolean;
  isDraggable?: boolean;
  onNavigate?: (screen: string, params?: any) => void;
}

export function WidgetWrapper({
  type,
  data,
  onPress,
  onToggle,
  onLongPress,
  enabled = true,
  isDraggable = false,
  onNavigate,
}: WidgetWrapperProps) {
  const { colors } = useTheme();
  const def = getWidgetDef(type);
  if (!def) {
    return null;
  }

  const Component = def.component;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isDraggable,
      onPanResponderGrant: () => {
        Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start();
      },
      onPanResponderRelease: () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
      },
    }),
  ).current;

  if (!enabled) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}
      {...(isDraggable ? panResponder.panHandlers : {})}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[
          styles.container,
          {
            backgroundColor: colors.bg.card,
            borderColor: colors.border.subtle,
            minHeight: def.defaultHeight,
          },
        ]}
      >
        <Component data={data} onPress={onPress} onNavigate={onNavigate} />
      </TouchableOpacity>
      {onToggle && (
        <TouchableOpacity
          onPress={onToggle}
          style={[styles.toggleBtn, { backgroundColor: colors.bg.tertiary }]}
        >
          <AntDesign name="ellipsis1" size={14} color={colors.text.tertiary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12, position: 'relative' },
  container: { borderRadius: 20, borderWidth: 1, padding: 16, overflow: 'hidden' },
  toggleBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
});
