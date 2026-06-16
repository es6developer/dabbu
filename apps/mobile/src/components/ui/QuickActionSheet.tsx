import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const CARD_WIDTH = Math.min(SCREEN_W - 64, 360);

export function QuickActionSheet({ actions, visible, onClose }: QuickActionSheetProps) {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      scaleAnim.setValue(0.85);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 0.85, duration: 120, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <View style={s.wrapper} pointerEvents="box-none">
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          s.card,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            transform: [{ scale: scaleAnim }],
            shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.12)',
          },
        ]}
      >
        <View style={s.grid}>
          {actions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={s.item}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                action.onPress();
              }}
            >
              <View style={[s.iconBox, { backgroundColor: (action.color || '#636366') + '15' }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color || '#1C1C1E'} />
              </View>
              <Text style={[s.label, { color: colors.text.secondary }]} numberOfLines={1}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  item: {
    alignItems: 'center',
    gap: 6,
    width: (CARD_WIDTH - 44) / 3,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
