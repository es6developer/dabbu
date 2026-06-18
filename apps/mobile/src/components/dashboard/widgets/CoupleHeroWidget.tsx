import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

function getDaysSince(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function CoupleHeroWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { coupleHero } = data || {};
  const name1 = coupleHero?.partner1Name || 'Partner 1';
  const name2 = coupleHero?.partner2Name || 'Partner 2';
  const togetherSince = coupleHero?.togetherSince || '';
  const days = getDaysSince(togetherSince);

  return (
    <View style={styles.container}>
      <View style={styles.namesRow}>
        <View style={[styles.avatar, { backgroundColor: colors.accent.primary }]}>
          <Text style={styles.avatarText}>{name1[0]?.toUpperCase() || '?'}</Text>
        </View>
        <Text style={[styles.heart, { color: '#EF4444' }]}>❤</Text>
        <View style={[styles.avatar, { backgroundColor: '#F472B6' }]}>
          <Text style={styles.avatarText}>{name2[0]?.toUpperCase() || '?'}</Text>
        </View>
      </View>
      <Text style={[styles.names, { color: colors.text.primary }]}>{name1} & {name2}</Text>
      {togetherSince ? (
        <Text style={[styles.since, { color: colors.text.secondary }]}>Together Since {togetherSince}</Text>
      ) : null}
      {days !== null && (
        <Text style={[styles.days, { color: colors.accent.primary }]}>{days} days together</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, alignItems: 'center' },
  namesRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  heart: { fontSize: 20 },
  names: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  since: { fontSize: 12, fontWeight: '500' },
  days: { fontSize: 13, fontWeight: '700' },
});
