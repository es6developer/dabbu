import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { PADDING, borderRadius, shadows } from '../../theme/design';

type OptionType = 'manual' | 'camera' | 'group';

interface OptionCard {
  type: OptionType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  badge?: string;
  color: string;
}

const OPTIONS: OptionCard[] = [
  {
    type: 'manual',
    icon: 'create-outline',
    title: 'Manual Entry',
    description: 'Enter expense details by hand - amount, category, description.',
    color: '#4F46E5',
  },
  {
    type: 'camera',
    icon: 'camera-outline',
    title: 'Scan Bill',
    description: 'Take a photo or upload a receipt. AI extracts the details automatically.',
    badge: 'AI',
    color: '#F59E0B',
  },
  {
    type: 'group',
    icon: 'people-outline',
    title: 'Create Group',
    description: 'Create a group to split expenses with friends & family.',
    color: '#14B8A6',
  },
];

export function AddExpenseScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  function handleSelect(type: OptionType) {
    if (type === 'manual') {
      navigation.navigate('CreateTransaction');
    } else if (type === 'camera') {
      navigation.navigate('BillScanner');
    } else {
      navigation.navigate('CreateExpenseGroup');
    }
  }

  return (
    <View style={[s.container, { backgroundColor: colors.bg.primary }]}>
      <Animated.View
        style={[
          s.content,
          { paddingTop: insets.top, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: `${colors.accent.primary}10`,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Ionicons name="close" size={22} color={colors.accent.primary} />
        </TouchableOpacity>

        <View style={{ marginBottom: 24 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: `${colors.accent.primary}12`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Ionicons name="wallet-outline" size={28} color={colors.accent.primary} />
          </View>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: 30,
              fontWeight: '800',
              letterSpacing: -1,
              marginBottom: 8,
            }}
          >
            Add expense
          </Text>
          <Text
            style={{ color: colors.text.tertiary, fontSize: 15, fontWeight: '500', lineHeight: 22 }}
          >
            Choose the fastest way to capture and organize this spend.
          </Text>
        </View>

        <View style={{ gap: 14 }}>
          {OPTIONS.map((option, index) => (
            <Animated.View
              key={option.type}
              style={{
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30 + index * 15, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 18,
                  borderRadius: borderRadius.xl,
                  backgroundColor: colors.bg.card,
                  ...shadows.md,
                  gap: 14,
                }}
                onPress={() => handleSelect(option.type)}
                activeOpacity={0.75}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: `${option.color}12`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={option.icon} size={25} color={option.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '800',
                        color: colors.text.primary,
                        letterSpacing: -0.2,
                      }}
                    >
                      {option.title}
                    </Text>
                    {option.badge && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: `${option.color}15`,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: option.color,
                            letterSpacing: 0.5,
                          }}
                        >
                          {option.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.text.tertiary,
                      fontWeight: '500',
                      lineHeight: 18,
                    }}
                  >
                    {option.description}
                  </Text>
                </View>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: `${colors.accent.primary}08`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: PADDING, paddingBottom: 40 },
});
