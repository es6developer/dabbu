import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

function getDaysSince(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function FamilyHeroWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { familyHero } = data || {};
  const familyName = familyHero?.familyName || 'Family';
  const memberCount = familyHero?.memberCount ?? 0;
  const familySince = familyHero?.familySince || '';
  const days = getDaysSince(familySince);
  const members = familyHero?.members || [];

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View>
          <Text style={[styles.title, { color: colors.text.primary }]}>{familyName}</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{memberCount} members</Text>
        </View>
        <View style={styles.avatarStack}>
          {members.slice(0, 3).map((m: any, i: number) => (
            <View key={i} style={[styles.miniAvatar, { backgroundColor: colors.accent.primary, marginLeft: i > 0 ? -10 : 0 }]}>
              <Text style={styles.miniAvatarText}>{((m.name || m)[0] || '?').toUpperCase()}</Text>
            </View>
          ))}
          {memberCount > 3 && (
            <View style={[styles.miniAvatar, { backgroundColor: colors.bg.tertiary, marginLeft: -10 }]}>
              <Text style={[styles.miniAvatarText, { color: colors.text.secondary }]}>+{memberCount - 3}</Text>
            </View>
          )}
        </View>
      </View>
      {familySince ? (
        <Text style={[styles.since, { color: colors.text.secondary }]}>Family Since {familySince}</Text>
      ) : null}
      {days !== null && (
        <Text style={[styles.days, { color: colors.accent.primary }]}>{days} days together</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  miniAvatarText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  since: { fontSize: 12, fontWeight: '500' },
  days: { fontSize: 13, fontWeight: '700' },
});
