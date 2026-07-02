import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useLensStore, LensMode } from '../../store/lensStore';
import { useAuth } from '../../store/AuthContext';

const LENS_OPTIONS: Array<{
  key: LensMode;
  label: string;
  description: string;
  icon: string;
  colors: { primary: string; secondary: string; gradient: string[]; accent: string; darkGradient: string[] };
}> = [
  {
    key: 'PERSONAL',
    label: 'Personal',
    description: 'Your individual finances, goals, and insights',
    icon: 'user',
    colors: { primary: '#7C3AED', secondary: '#A78BFA', gradient: ['#F0E6FF', '#F5F5F8'], accent: '#7C3AED15', darkGradient: ['#1A0A2E', '#0C0C0E'] },
  },
  {
    key: 'PARTNERED',
    label: 'Partnered',
    description: 'Shared finances with your partner',
    icon: 'heart',
    colors: { primary: '#F43F5E', secondary: '#FB7185', gradient: ['#FFE4E8', '#FFF5F7'], accent: '#F43F5E15', darkGradient: ['#1A0A12', '#0C0C0E'] },
  },
  {
    key: 'FAMILY',
    label: 'Family',
    description: 'Manage household and family expenses together',
    icon: 'team',
    colors: { primary: '#0D9488', secondary: '#2DD4BF', gradient: ['#E8F2E6', '#F7F5F0'], accent: '#0D948812', darkGradient: ['#081812', '#0C0E0C'] },
  },
  {
    key: 'FULL',
    label: 'Full Access',
    description: 'Everything across all lenses in one view',
    icon: 'appstore-o',
    colors: { primary: '#4338CA', secondary: '#818CF8', gradient: ['#EEEEFF', '#F6F5F2'], accent: '#4338CA12', darkGradient: ['#0E0E22', '#0C0C12'] },
  },
];

export function LensPickerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const activeLens = useLensStore((s) => s.activeLens);
  const updateLens = useLensStore((s) => s.updateLens);
  const isSwitching = useLensStore((s) => s.isSwitching);
  const { accessToken } = useAuth();
  const scaleAnims = useRef<Record<string, Animated.Value>>({});

  const getScaleAnim = (key: string) => {
    if (!scaleAnims.current[key]) {
      scaleAnims.current[key] = new Animated.Value(1);
    }
    return scaleAnims.current[key];
  };

  const handleSelect = async (lens: LensMode) => {
    if (lens === activeLens) {
      navigation.goBack();
      return;
    }
    try {
      await updateLens(accessToken, lens);
      navigation.goBack();
    } catch {
      // error already set in store
    }
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
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24 }}>
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
          contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 44 }}
        >
          {LENS_OPTIONS.map((option) => {
            const isActive = activeLens === option.key;
            const darkGrad = isDark ? option.colors.darkGradient : option.colors.gradient;
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
                  disabled={isSwitching}
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
                    colors={isActive ? darkGrad : [colors.bg.card, colors.bg.card]}
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
                              backgroundColor: isActive
                                ? `${option.colors.primary}25`
                                : colors.bg.tertiary,
                            },
                          ]}
                        >
                          <AntDesign
                            name={option.icon as any}
                            size={28}
                            color={isActive ? option.colors.primary : colors.text.tertiary}
                          />
                        </View>
                        {isActive && (
                          <View style={[s.activeBadge, { backgroundColor: option.colors.primary }]}>
                            <AntDesign name="check" size={14} color="#FFF" />
                          </View>
                        )}
                      </View>
                      <Text style={[s.cardTitle, { color: isActive ? colors.text.primary : colors.text.secondary }]}>
                        {option.label}
                      </Text>
                      <Text style={[s.cardDesc, { color: isActive ? colors.text.secondary : colors.text.tertiary }]}>
                        {option.description}
                      </Text>

                      {/* Palette preview strip */}
                      <View style={s.paletteStrip}>
                        <View style={[s.paletteDot, { backgroundColor: option.colors.primary, borderColor: option.colors.primary }]} />
                        <View style={[s.paletteDot, { backgroundColor: option.colors.secondary, borderColor: option.colors.secondary }]} />
                        <View style={[s.paletteDot, { backgroundColor: option.colors.primary + '60', borderColor: option.colors.primary + '60' }]} />
                        <View style={[s.paletteDot, { backgroundColor: option.colors.primary + '30', borderColor: option.colors.primary + '30' }]} />
                      </View>

                      {isActive && (
                        <View
                          style={[s.activeLabel, { backgroundColor: option.colors.primary + '15' }]}
                        >
                          <Text style={[s.activeLabelText, { color: option.colors.primary }]}>
                            Active Lens
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

      {isSwitching && (
        <View style={[s.loaderOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }]}>
          <View style={[s.loaderCard, { backgroundColor: colors.bg.card }]}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text style={[s.loaderText, { color: colors.text.primary }]}>Switching Lens...</Text>
            <Text style={[s.loaderSubtext, { color: colors.text.tertiary }]}>Loading your new view</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  cardWrapper: {
    borderRadius: 28,
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
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: 28,
  },
  cardContent: {
    padding: 24,
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
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    width: 24,
    height: 24,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 16,
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
    borderRadius: 28,
  },
  paletteStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    alignItems: 'center',
  },
  paletteDot: {
    width: 28,
    height: 28,
    borderRadius: 28,
    borderWidth: 2,
  },
  activeLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  activeLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loaderCard: {
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 44,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loaderText: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 4,
  },
  loaderSubtext: {
    fontSize: 16,
    fontWeight: '500',
  },
});
