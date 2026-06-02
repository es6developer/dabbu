import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';

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
    description: 'Enter expense details by hand — amount, category, description.',
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
    description: 'Create a group to track expenses together with friends & family.',
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
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
            ]}
          >
            <Ionicons name="close" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Add Expense</Text>
        <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
          Choose how you want to add this expense
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {OPTIONS.map((option, i) => (
            <TouchableOpacity
              key={option.type}
              style={[
                styles.card,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8f9ff' },
              ]}
              onPress={() => handleSelect(option.type)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={option.type === 'group' ? [...colors.accent.gradient] : option.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconWrap}
              >
              <Ionicons name={option.icon} size={26} color="#FFFFFF" />
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
                { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
              ]}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 8 },
  headerTop: { marginBottom: 20 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  optionsContainer: { padding: 16, gap: 16 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, gap: 16 },
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
