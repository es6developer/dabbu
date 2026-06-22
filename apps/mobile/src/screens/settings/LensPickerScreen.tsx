import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useLensStore, LensMode } from '../../store/lensStore';
import { useAuth } from '../../store/AuthContext';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LENS_OPTIONS: Array<{
  key: LensMode;
  label: string;
  description: string;
  icon: string;
  colors: { primary: string; gradient: string[]; accent: string };
}> = [
  {
    key: 'PERSONAL',
    label: 'Personal',
    description: 'Your individual finances, goals, and insights',
    icon: 'user',
    colors: { primary: '#7C3AED', gradient: ['#F0E6FF', '#F5F5F8'], accent: '#7C3AED15' },
  },
  {
    key: 'PARTNERED',
    label: 'Partnered',
    description: 'Shared finances with your partner',
    icon: 'heart',
    colors: { primary: '#F43F5E', gradient: ['#FFE4E8', '#FFF5F7'], accent: '#F43F5E15' },
  },
  {
    key: 'FAMILY',
    label: 'Family',
    description: 'Manage household and family expenses together',
    icon: 'team',
    colors: { primary: '#059669', gradient: ['#D1FAE5', '#F0FDF4'], accent: '#05966915' },
  },
  {
    key: 'FULL',
    label: 'Full Access',
    description: 'Everything across all lenses in one view',
    icon: 'appstore-o',
    colors: { primary: '#D97706', gradient: ['#FEF3C7', '#FFFBEB'], accent: '#D9770615' },
  },
];

export function LensPickerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const activeLens = useLensStore((s) => s.activeLens);
  const setLens = useLensStore((s) => s.setLens);
  const updateLens = useLensStore((s) => s.updateLens);
  const loading = useLensStore((s) => s.isLoading);
  const { accessToken } = useAuth();
  const scaleAnims = useRef<Record<string, Animated.Value>>({});

  const getScaleAnim = (key: string) => {
    if (!scaleAnims.current[key]) {
      scaleAnims.current[key] = new Animated.Value(1);
    }
    return scaleAnims.current[key];
  };

  const handleSelect = (lens: LensMode) => {
    LayoutAnimation.configureNext({
      duration: 300,
      update: { type: 'easeInEaseOut' },
      create: { type: 'easeInEaseOut', property: 'opacity', duration: 200 },
      delete: { type: 'easeInEaseOut', property: 'opacity', duration: 200 },
    });
    if (lens === activeLens) {
      navigation.goBack();
      return;
    }
    setLens(lens);
    updateLens(accessToken, lens).catch(() => {});
    navigation.goBack();
  };

  const handlePressIn = (key: string) => {
    const anim = getScaleAnim(key);
    Animated.spring(anim, {
      toValue: 0.97,
      tension: 150,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (key: string) => {
    const anim = getScaleAnim(key);
    Animated.spring(anim, {
      toValue: 1,
      tension: 100,
      friction: 14,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.3]}
        style={{ flex: 1 }}
      >
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <AntDesign name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: colors.text.primary }]}>Choose Your Lens</Text>
            <View style={{ width: 36 }} />
          </View>
          <Text style={[s.subtitle, { color: colors.text.tertiary }]}>
            Each lens gives you a tailored view of your finances
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
        >
          {LENS_OPTIONS.map((option) => {
            const isActive = activeLens === option.key;
            const darkGrad = isDark ? ['#1C1C1E', '#141417'] : option.colors.gradient;
            const scale = getScaleAnim(option.key);
            return (
              <Animated.View
                key={option.key}
                style={[s.cardWrapper, { transform: [{ scale }] }]}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => handleSelect(option.key)}
                  onPressIn={() => handlePressIn(option.key)}
                  onPressOut={() => handlePressOut(option.key)}
                  disabled={loading}
                  style={[
                    s.card,
                    {
                      backgroundColor: colors.bg.card,
                      borderColor: isActive ? option.colors.primary : colors.border.subtle,
                      borderWidth: isActive ? 2 : 1,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={darkGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.cardGradient}
                  >
                    <View style={s.cardContent}>
                      <View style={s.cardTop}>
                        <View
                          style={[
                            s.iconBox,
                            {
                              backgroundColor: isDark
                                ? `${option.colors.primary}25`
                                : option.colors.accent,
                            },
                          ]}
                        >
                          <AntDesign
                            name={option.icon as any}
                            size={28}
                            color={option.colors.primary}
                          />
                        </View>
                        {isActive && (
                          <View style={[s.activeBadge, { backgroundColor: option.colors.primary }]}>
                            <AntDesign name="check" size={14} color="#FFF" />
                          </View>
                        )}
                      </View>
                      <Text style={[s.cardTitle, { color: colors.text.primary }]}>
                        {option.label}
                      </Text>
                      <Text style={[s.cardDesc, { color: colors.text.tertiary }]}>
                        {option.description}
                      </Text>

                      {/* Color preview dots */}
                      <View style={s.colorRow}>
                        <View style={[s.colorDot, { backgroundColor: option.colors.primary }]} />
                        <View
                          style={[s.colorDot, { backgroundColor: option.colors.primary + '80' }]}
                        />
                        <View
                          style={[s.colorDot, { backgroundColor: option.colors.primary + '40' }]}
                        />
                        <View
                          style={[s.colorDot, { backgroundColor: option.colors.primary + '20' }]}
                        />
                      </View>

                      {isActive && (
                        <View
                          style={[s.activeLabel, { backgroundColor: option.colors.primary + '15' }]}
                        >
                          <Text style={[s.activeLabelText, { color: option.colors.primary }]}>
                            Active
                          </Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  cardWrapper: {
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: 20,
  },
  cardContent: {
    padding: 20,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  activeLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  activeLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
