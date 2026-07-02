import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadows } from '../../../theme/design';

const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export function UpcomingBillsWidget({ data, onPress }: { data: any; onPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const { upcomingBills } = data || {};
  const bills = Array.isArray(upcomingBills) ? upcomingBills : [];

  if (!bills.length) {
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
          colors={isDark ? ['#F59E0B08', 'transparent'] : ['#F59E0B06', 'transparent']}
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
          <View style={[styles.iconBox, { backgroundColor: '#F59E0B15' }]}>
            <AntDesign name="filetext1" size={18} color="#F59E0B" />
          </View>
          <Text style={[styles.title, { color: colors.text.primary }]}>Upcoming Bills</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No upcoming bills</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: '#F59E0B' }]}
            onPress={onPress}
          >
            <AntDesign name="plus" size={14} color="#FFF" />
            <Text style={styles.addBtnText}>Add Bill</Text>
          </TouchableOpacity>
        </View>
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
        colors={isDark ? ['#F59E0B08', 'transparent'] : ['#F59E0B06', 'transparent']}
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
        <View style={[styles.iconBox, { backgroundColor: '#F59E0B15' }]}>
          <AntDesign name="filetext1" size={18} color="#F59E0B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Upcoming Bills</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtnSmall, { backgroundColor: '#F59E0B15' }]}
          onPress={onPress}
        >
          <AntDesign name="plus" size={12} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      {bills.slice(0, 4).map((bill: any, i: number) => (
        <View
          key={bill.id || i}
          style={[
            styles.billRow,
            i < bills.length - 1 && {
              borderBottomWidth: 1,
              borderBottomColor: colors.border.subtle,
            },
          ]}
        >
          <View style={[styles.billIcon, { backgroundColor: '#F59E0B15' }]}>
            <AntDesign name="filetext1" size={14} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.billName, { color: colors.text.primary }]} numberOfLines={1}>
              {bill.name || 'Bill'}
            </Text>
            {bill.daysRemaining !== undefined && (
              <Text
                style={[
                  styles.billDue,
                  { color: bill.daysRemaining <= 3 ? '#DC2626' : colors.text.tertiary },
                ]}
              >
                {bill.daysRemaining === 0 ? 'Due today' : `${bill.daysRemaining} days left`}
              </Text>
            )}
          </View>
          <Text style={[styles.billAmount, { color: colors.text.primary }]}>
            {fmt(Number(bill.amount) || 0)}
          </Text>
        </View>
      ))}
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
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', gap: 14, paddingVertical: spacing.sm },
  emptyText: { fontSize: 13, fontWeight: '500' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 28,
  },
  addBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  addBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  billIcon: {
    width: 32,
    height: 32,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billName: { fontSize: 13, fontWeight: '600' },
  billDue: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  billAmount: { fontSize: 14, fontWeight: '700' },
});
