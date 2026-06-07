import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';
import { MyWalletScreen } from '../screens/transactions/MyWalletScreen';
import { SharedCirclesScreen } from '../screens/transactions/SharedCirclesScreen';

const SEGMENTS = ['My Wallet', 'Shared Circles'];
const SCREEN_WIDTH = Dimensions.get('window').width;

export function ExpenseTabNavigator() {
  const { colors } = useTheme();
  const [active, setActive] = useState(1);
  const slideAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [screen, setScreen] = useState<'MyWallet' | 'SharedCircles'>('SharedCircles');

  const switchTo = useCallback(
    (index: number) => {
      if (index === active) return;
      const next = index === 0 ? 'MyWallet' as const : 'SharedCircles' as const;
      fadeAnim.setValue(1);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: index,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: false,
          }),
        ]),
      ]).start();
      setTimeout(() => {
        setScreen(next);
        setActive(index);
      }, 80);
    },
    [active, slideAnim, fadeAnim],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{ flex: 1 }}>
        {screen === 'MyWallet' ? <MyWalletScreen /> : <SharedCirclesScreen />}
      </View>
      <SegmentedControl
        segments={SEGMENTS}
        active={active}
        onSelect={switchTo}
        colors={colors}
      />
    </View>
  );
}

function SegmentedControl({
  segments,
  active,
  onSelect,
  colors,
}: {
  segments: string[];
  active: number;
  onSelect: (i: number) => void;
  colors: any;
}) {
  const offset = useRef(new Animated.Value(active * 2)).current;

  React.useEffect(() => {
    Animated.spring(offset, {
      toValue: active * 2,
      useNativeDriver: false,
      tension: 100,
      friction: 10,
    }).start();
  }, [active, offset]);

  return (
    <View style={[segStyles.wrapper, { backgroundColor: colors.bg.tertiary }]}>
      <View style={segStyles.inner}>
        <Animated.View
          style={[
            segStyles.slider,
            {
              backgroundColor: colors.bg.primary,
              transform: [
                {
                  translateX: offset.interpolate({
                    inputRange: [0, 2],
                    outputRange: [0, (SCREEN_WIDTH - 48) / 2],
                  }),
                },
              ],
            },
          ]}
        />
        {segments.map((label, i) => (
          <TouchableOpacity
            key={label}
            style={segStyles.segment}
            onPress={() => onSelect(i)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                segStyles.label,
                {
                  color: i === active ? colors.accent.primary : colors.text.tertiary,
                  fontWeight: i === active ? '700' : '500',
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 80 : 72,
    borderRadius: 14,
    padding: 3,
  },
  inner: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 40,
  },
  slider: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    width: '50%',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: 14,
  },
});
