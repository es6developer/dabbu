import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface ActionItem {
  label: string;
  icon: string;
  color?: string;
  onPress: () => void;
}

interface QuickActionSheetProps {
  actions: ActionItem[];
  activeItem?: string;
  visible: boolean;
  onClose: () => void;
}

export function QuickActionSheet({ actions, visible, onClose }: QuickActionSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  const dropAnims = useRef<Animated.Value[]>([]);
  if (dropAnims.current.length !== actions.length) {
    dropAnims.current = actions.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    let mounted = true;
    if (visible) {
      setRendered(true);
      dropAnims.current.forEach((a) => a.setValue(0));
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.stagger(
        50,
        dropAnims.current.map((a) =>
          Animated.spring(a, {
            toValue: 1,
            friction: 9,
            tension: 100,
            useNativeDriver: true,
          }),
        ),
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ...dropAnims.current.map((a) =>
          Animated.timing(a, { toValue: 0, duration: 100, useNativeDriver: true }),
        ),
      ]).start(() => {
        if (mounted) setRendered(false);
      });
    }
    return () => { mounted = false; };
  }, [visible]);

  const handlePress = useCallback((action: ActionItem) => {
    onClose();
    action.onPress();
  }, [onClose]);

  if (!rendered) return null;

  const tabBarHeight = Platform.OS === 'ios' ? 68 + insets.bottom : 56;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <View style={[s.dropArea, { bottom: tabBarHeight + 8 }]} pointerEvents="box-none">
        {actions.map((action, i) => {
          const translateY = dropAnims.current[i]?.interpolate({
            inputRange: [0, 1],
            outputRange: [40, 0],
          });
          const opacity = dropAnims.current[i]?.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, 0, 1],
          });
          return (
            <Animated.View
              key={i}
              style={[
                s.dropItem,
                {
                  opacity,
                  transform: [{ translateY: translateY ?? 40 }],
                },
              ]}
            >
              <TouchableOpacity
                style={[s.pill, { backgroundColor: action.color || colors.accent.primary }]}
                activeOpacity={0.85}
                onPress={() => handlePress(action)}
              >
                <AntDesign name={action.icon as any} size={20} color="#FFF" />
                <Text style={[s.pillLabel, { color: '#FFF' }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dropArea: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    gap: 8,
  },
  dropItem: {
    width: '100%',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  pillLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
