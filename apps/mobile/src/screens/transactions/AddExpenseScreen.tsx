import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 60) / 2;

interface OptionCard {
  type: 'manual' | 'camera' | 'group';
  icon: string;
  title: string;
  description: string;
  badge?: string;
  color: string;
  gradient: [string, string];
}

export function AddExpenseScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const OPTIONS: OptionCard[] = [
    {
      type: 'manual',
      icon: 'edit',
      title: 'Manual Entry',
      description: 'Enter amount, category & description by hand.',
      color: colors.accent.secondary,
      gradient: [colors.accent.secondary, colors.accent.hover],
    },
    {
      type: 'camera',
      icon: 'camera',
      title: 'Scan Bill',
      description: 'Snap a receipt. AI extracts everything automatically.',
      badge: 'AI',
      color: '#F59E0B',
      gradient: ['#F59E0B', '#D97706'],
    },
    {
      type: 'group',
      icon: 'team',
      title: 'Create Group',
      description: 'Set up a circle to split expenses with friends & family.',
      color: '#14B8A6',
      gradient: ['#14B8A6', '#0D9488'],
    },
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  function handleSelect(type: OptionCard['type']) {
    const map: Record<string, string> = {
      manual: 'CreateTransaction',
      camera: 'BillScanner',
      group: 'CreateExpenseGroup',
    };
    navigation.navigate(map[type]);
  }

  return (
    <View style={[s.container, { backgroundColor: colors.bg.primary }]}>
      <Animated.View
        style={[
          s.content,
          { paddingTop: insets.top, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[s.closeBtn, { backgroundColor: `${colors.accent.secondary}10` }]}>
            <AntDesign  name="close" size={22} color={colors.accent.secondary} />
          </TouchableOpacity>
        </View>

        <View style={s.hero}>
          <View style={[s.heroIcon, { backgroundColor: `${colors.accent.secondary}12` }]}>
            <AntDesign  name="wallet" size={32} color={colors.accent.secondary} />
          </View>
          <Text style={s.heroTitle}>Add expense</Text>
          <Text style={s.heroDesc}>Choose how you'd like to capture this spend.</Text>
        </View>

        <View style={s.grid}>
          {OPTIONS.map((option, index) => {
            const delay = 100 + index * 100;
            return (
              <Animated.View
                key={option.type}
                style={[
                  s.cardWrap,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30 + delay * 0.3, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[s.card, { backgroundColor: colors.bg.card }]}
                  onPress={() => handleSelect(option.type)}
                  activeOpacity={0.75}
                >
                  <LinearGradient
                    colors={option.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.cardIcon}
                  >
                    <AntDesign name={option.icon as any} size={26} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <View style={s.cardTitleRow}>
                      <Text style={s.cardTitle}>{option.title}</Text>
                      {option.badge && (
                        <View style={[s.badge, { backgroundColor: `${option.color}18` }]}>
                          <Text style={[s.badgeText, { color: option.color }]}>{option.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.cardDesc, { color: colors.text.tertiary }]}>
                      {option.description}
                    </Text>
                  </View>
                  <AntDesign  name="right" size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', marginBottom: 28, gap: 12 },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  heroDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  grid: { gap: 12 },
  cardWrap: {},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardDesc: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
});
