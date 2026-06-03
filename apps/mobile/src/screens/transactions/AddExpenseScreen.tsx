import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    gradient: ['#6C5CE7', '#A29BFE'],
  },
];

export function AddExpenseScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

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
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <LinearGradient
        colors={
          isDark
            ? ['#11111A', colors.bg.primary, '#0A0A0F']
            : ['#FFF8F1', colors.bg.primary, '#F8F9FA']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(10,10,15,0.05)',
              borderColor: colors.border.subtle,
            },
          ]}
        >
          <Ionicons name="close" size={22} color={colors.text.primary} />
        </TouchableOpacity>

        <LinearGradient
          colors={[colors.accent.primary, isDark ? '#B45309' : '#F97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Add expense</Text>
          <Text style={styles.subtitle}>Choose the fastest way to capture and organize this spend.</Text>
        </LinearGradient>

        <View style={styles.optionsContainer}>
          {OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.84)',
                    borderColor: colors.border.subtle,
                  },
                ]}
                onPress={() => handleSelect(option.type)}
                activeOpacity={0.75}
              >
                <LinearGradient
                  colors={option.type === 'group' ? [...colors.accent.gradient] : option.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconWrap}
                >
                <Ionicons name={option.icon} size={25} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                    {option.title}
                  </Text>
                  {option.badge && (
                    <View style={[styles.badge, { backgroundColor: colors.accent.primary + '20' }]}>
                      <Text style={[styles.badgeText, { color: colors.accent.primary }]}>
                        {option.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardDesc, { color: colors.text.tertiary }]}>
                  {option.description}
                </Text>
              </View>
              <View
                style={[
                  styles.chevronWrap,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)' },
                ]}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
    padding: 22,
    marginBottom: 18,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { color: '#FFFFFF', fontSize: 29, fontWeight: '800', marginBottom: 7 },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 20, fontWeight: '600' },
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
  cardTitle: { fontSize: 17, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
