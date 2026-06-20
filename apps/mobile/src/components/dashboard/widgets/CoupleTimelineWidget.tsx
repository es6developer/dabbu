import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadows } from '../../../theme/design';

const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const eventIcons: Record<string, React.ComponentProps<typeof AntDesign>['name']> = {
  goal_created: 'flag',
  goal_contributed: 'save',
  expense_added: 'shoppingcart',
  income_added: 'arrowdown',
  savings_added: 'pluscircle',
  couple_created: 'heart',
  bill_added: 'filetext1',
  bill_paid: 'checkcircle',
  custom: 'clockcircleo',
};

const eventColors: Record<string, string> = {
  goal_created: '#F472B6',
  goal_contributed: '#6366F1',
  expense_added: '#DC2626',
  income_added: '#16A34A',
  savings_added: '#10B981',
  couple_created: '#EC4899',
  bill_added: '#F59E0B',
  bill_paid: '#16A34A',
  custom: '#6B7280',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return '';
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
  const day = d.getDate();
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 || 12;
  return `${months[d.getMonth()]} ${day}, ${h12}:${mins}${ampm}`;
}

export function CoupleTimelineWidget({ data, onPress }: { data: any; onPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const { coupleTimeline } = data || {};
  const events = Array.isArray(coupleTimeline) ? coupleTimeline : [];

  if (!events.length) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[
          styles.card,
          { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
        ]}
      >
        <LinearGradient
          colors={isDark ? ['#6366F108', 'transparent'] : ['#6366F106', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: borderRadius['2xl'],
          }}
        />
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: '#6366F115' }]}>
            <AntDesign name="clockcircleo" size={18} color="#6366F1" />
          </View>
          <Text style={[styles.title, { color: colors.text.primary }]}>Couple Timeline</Text>
        </View>
        <TouchableOpacity
          style={[styles.emptyCta, { borderColor: colors.border.subtle }]}
          onPress={onPress}
        >
          <AntDesign name="pluscircleo" size={18} color={colors.text.tertiary} />
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
            Add your first milestone
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
    >
      <LinearGradient
        colors={isDark ? ['#6366F108', 'transparent'] : ['#6366F106', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: borderRadius['2xl'],
        }}
      />
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: '#6366F115' }]}>
          <AntDesign name="clockcircleo" size={18} color="#6366F1" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Couple Timeline</Text>
        </View>
        <AntDesign name="right" size={14} color={colors.text.tertiary} />
      </View>

      <View style={styles.timelineContainer}>
        {events.slice(0, 5).map((ev: any, i: number) => {
          const icon = eventIcons[ev.eventType || ev.type] || eventIcons.custom;
          const evColor = eventColors[ev.eventType || ev.type] || '#6B7280';
          const isLast = i === Math.min(events.length, 5) - 1;
          return (
            <View key={ev.id || i} style={styles.eventRow}>
              <View style={styles.timelineLeft}>
                <View style={[styles.eventDot, { backgroundColor: evColor }]} />
                {!isLast && (
                  <View style={[styles.verticalLine, { backgroundColor: colors.border.subtle }]} />
                )}
              </View>
              <View style={[styles.eventCard, { backgroundColor: colors.bg.tertiary }]}>
                <View style={styles.eventHeader}>
                  <View style={[styles.eventIcon, { backgroundColor: evColor + '15' }]}>
                    <AntDesign name={icon} size={12} color={evColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.eventTitle, { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {ev.title || ev.description || 'Event'}
                    </Text>
                    <Text style={[styles.eventDate, { color: colors.text.tertiary }]}>
                      {formatDate(ev.createdAt || ev.date || '')}
                    </Text>
                  </View>
                  {ev.amount ? (
                    <Text style={[styles.eventAmount, { color: evColor }]}>
                      {fmt(Number(ev.amount))}
                    </Text>
                  ) : null}
                </View>
                {ev.user?.name ? (
                  <Text style={[styles.eventUser, { color: colors.text.tertiary }]}>
                    by {ev.user.name}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
    ...shadows.md,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700' },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    marginTop: 4,
  },
  emptyText: { fontSize: 13, fontWeight: '500' },
  timelineContainer: { gap: 0 },
  eventRow: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  timelineLeft: { width: 20, alignItems: 'center' },
  eventDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, zIndex: 1 },
  verticalLine: { width: 2, flex: 1, marginTop: -2, marginBottom: -2 },
  eventCard: { flex: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: { fontSize: 12, fontWeight: '600' },
  eventDate: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  eventAmount: { fontSize: 12, fontWeight: '700' },
  eventUser: { fontSize: 10, fontWeight: '500', marginTop: 4, marginLeft: 34 },
});
