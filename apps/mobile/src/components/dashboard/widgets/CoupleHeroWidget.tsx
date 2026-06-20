import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadows } from '../../../theme/design';

function getDaysSince(dateStr?: string) {
  if (!dateStr) {
    return null;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return null;
  }
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatPartnerSince(dateStr?: string) {
  if (!dateStr) {
    return '';
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return dateStr;
  }
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function CoupleHeroWidget({ data, onPress }: { data: any; onPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const { coupleHero } = data || {};
  const user = coupleHero?.user || {};
  const partner = coupleHero?.partner || {};
  const name1 = user?.firstName || 'Partner 1';
  const name2 = partner?.firstName || 'Partner 2';
  const togetherSince = coupleHero?.since || '';
  const days = getDaysSince(togetherSince);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{ borderRadius: borderRadius['2xl'], overflow: 'hidden', ...shadows.md }}
    >
      <LinearGradient
        colors={isDark ? ['#1E0A3C', '#2D1B69'] : ['#F5F0FF', '#EDE9FE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.avatarsRow}>
          <View style={[styles.avatarRing, { borderColor: colors.accent.primary }]}>
            <View style={[styles.avatar, { backgroundColor: colors.accent.primary }]}>
              <Text style={styles.avatarText}>{name1[0]?.toUpperCase() || '?'}</Text>
            </View>
          </View>
          <View style={[styles.heartCircle, { backgroundColor: colors.accent.primary + '15' }]}>
            <AntDesign name="heart" size={16} color="#F472B6" />
          </View>
          <View style={[styles.avatarRing, { borderColor: '#F472B6' }]}>
            <View style={[styles.avatar, { backgroundColor: '#F472B6' }]}>
              <Text style={styles.avatarText}>{name2[0]?.toUpperCase() || '?'}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.names, { color: colors.text.primary }]}>
          {name1} & {name2}
        </Text>

        {togetherSince ? (
          <View style={styles.sinceRow}>
            <AntDesign name="calendar" size={12} color={colors.text.tertiary} />
            <Text style={[styles.since, { color: colors.text.tertiary }]}>
              Partner since {formatPartnerSince(togetherSince)}
            </Text>
          </View>
        ) : null}

        {days !== null && (
          <View style={[styles.daysBadge, { backgroundColor: colors.accent.primary + '15' }]}>
            <AntDesign name="clockcircleo" size={12} color={colors.accent.primary} />
            <Text style={[styles.days, { color: colors.accent.primary }]}>
              {days} days together
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, alignItems: 'center', gap: 10 },
  avatarsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  heartCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  names: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  sinceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  since: { fontSize: 12, fontWeight: '500' },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  days: { fontSize: 12, fontWeight: '700' },
});
