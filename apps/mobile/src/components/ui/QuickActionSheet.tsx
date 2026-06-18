import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
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

const CARD_WIDTH = Math.min(SCREEN_W - 64, 340);

export function QuickActionSheet({ actions, visible, onClose }: QuickActionSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
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

  const tabBarHeight = Platform.OS === 'ios' ? 82 + insets.bottom : 64;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
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
            bottom: tabBarHeight + 12,
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
              <Animated.View
                style={[
                  s.bubble,
                  { backgroundColor: (action.color || '#636366') + '18' },
                ]}
              >
                <AntDesign
                  name={action.icon as any}
                  size={24}
                  color={action.color || '#1C1C1E'}
                />
              </Animated.View>
              <Text style={[s.label, { color: isDark ? '#8E8E93' : '#636366' }]}>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    position: 'absolute',
    left: 32,
    right: 32,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  item: {
    alignItems: 'center',
    gap: 6,
    width: (CARD_WIDTH - 44) / 3,
  },
  bubble: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
