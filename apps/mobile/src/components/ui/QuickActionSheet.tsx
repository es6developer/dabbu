import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const { height: SCREEN_H } = Dimensions.get('window');

interface ActionItem {
  label: string;
  icon: string;
  onPress: () => void;
}

interface QuickActionSheetProps {
  actions: ActionItem[];
  activeItem?: string;
  visible: boolean;
  onClose: () => void;
}

export function QuickActionSheet({ actions, activeItem, visible, onClose }: QuickActionSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const sheetTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[s.backdrop, { opacity: fadeAnim }]}
        pointerEvents="auto"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          s.sheet,
          {
            paddingBottom: insets.bottom + 20,
            transform: [{ translateY: sheetTranslateY }],
            backgroundColor: '#1C1C1E',
          },
        ]}
      >
        <View style={[s.handle, { backgroundColor: '#3A3A3C' }]} />
        <View style={s.grid}>
          {actions.map((action, i) => {
            const isActive = action.label === activeItem;
            return (
              <TouchableOpacity
                key={i}
                style={s.item}
                activeOpacity={0.7}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
              >
                <View
                  style={[
                    s.bubble,
                    {
                      backgroundColor: isActive ? 'rgba(255, 107, 0, 0.15)' : '#2C2C2E',
                    },
                  ]}
                >
                  <Ionicons
                    name={action.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={isActive ? '#FF6B00' : '#8E8E93'}
                  />
                </View>
                <Text style={[s.label, { color: colors.text.secondary }]}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  item: {
    alignItems: 'center',
    gap: 6,
    width: 72,
  },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
  },
});
