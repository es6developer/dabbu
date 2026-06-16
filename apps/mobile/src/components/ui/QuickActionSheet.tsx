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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const { height: SCREEN_H } = Dimensions.get('window');
const TAB_BAR_OFFSET = Platform.OS === 'ios' ? 90 : 80;

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

export function QuickActionSheet({ actions, activeItem, visible, onClose }: QuickActionSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  const sheetTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });

  const backdropBottom = insets.bottom + TAB_BAR_OFFSET;

  return (
    <View style={[s.container, { bottom: backdropBottom }]} pointerEvents="box-none">
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          s.sheet,
          {
            transform: [{ translateY: sheetTranslateY }],
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View style={[s.handle, { backgroundColor: isDark ? '#3A3A3C' : '#D1D1D6' }]} />

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
                <Ionicons
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
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
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
    borderWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
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
    justifyContent: 'space-between',
    rowGap: 16,
  },
  item: {
    alignItems: 'center',
    gap: 6,
    width: '30%',
  },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
