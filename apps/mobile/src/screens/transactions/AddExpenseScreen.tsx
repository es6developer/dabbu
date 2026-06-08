import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

type OptionType = 'manual' | 'camera' | 'group';

interface OptionCard {
  type: OptionType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  badge?: string;
  gradient: [string, string];
}

const OPTIONS: OptionCard[] = [
  {
    type: 'manual',
    icon: 'create-outline',
    title: 'Manual Entry',
    description: 'Enter expense details by hand - amount, category, description.',
    gradient: ['#00B894', '#00CEC9'],
  },
  {
    type: 'camera',
    icon: 'camera-outline',
    title: 'Scan Bill',
    description: 'Take a photo or upload a receipt. AI extracts the details automatically.',
    badge: 'AI',
    gradient: ['#f7892c', '#ff9f43'],
  },
  {
    type: 'group',
    icon: 'people-outline',
    title: 'Create Group',
    description: 'Create a group to split expenses with friends & family.',
    gradient: ['#14B8A6', '#14B8A6'],
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
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.primary }]} />
      <Animated.View
        style={[
          styles.content,
          { paddingTop: insets.top, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.12)',
              borderColor: colors.border.subtle,
            },
          ]}
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={[styles.hero, { backgroundColor: colors.bg.primary }]}>
          <View style={styles.heroIcon}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Add expense</Text>
          <Text style={styles.subtitle}>
            Choose the fastest way to capture and organize this spend.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
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
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.15)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
                  },
                ]}
                onPress={() => handleSelect(option.type)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor:
                        option.type === 'group' ? colors.accent.primary : option.gradient[0],
                    },
                  ]}
                >
                  <Ionicons name={option.icon} size={25} color="#FFFFFF" />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                      {option.title}
                    </Text>
                    {option.badge && (
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: isDark
                              ? 'rgba(247,137,44,0.2)'
                              : 'rgba(247,137,44,0.25)',
                          },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: colors.accent.primary }]}>
                          {option.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.cardDesc,
                      { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.6)' },
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.chevronWrap,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)',
                    },
                  ]}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.6)'}
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  hero: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginBottom: 7 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  optionsContainer: { gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardDesc: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
