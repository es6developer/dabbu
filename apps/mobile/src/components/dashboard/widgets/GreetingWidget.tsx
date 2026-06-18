import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getChangeLabel(change?: number) {
  if (change == null) return '';
  return change > 0 ? `+${change}%` : `${change}%`;
}

export function GreetingWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { greeting } = data || {};
  const name = greeting?.name || 'User';
  const balance = greeting?.balance || 0;
  const change = greeting?.change;

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View>
          <Text style={[styles.greeting, { color: colors.text.secondary }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.name, { color: colors.text.primary }]}>
            {name}
          </Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.accent.primary }]}>
          <Text style={styles.avatarText}>{name[0]?.toUpperCase() || '?'}</Text>
        </View>
      </View>
      <View style={styles.balanceRow}>
        <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>Current Balance</Text>
        <Text style={[styles.balance, { color: colors.text.primary }]}>
          ₹{(balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
      </View>
      {change !== undefined && (
        <View style={[styles.changeBadge, { backgroundColor: change >= 0 ? '#DCFCE7' : '#FEE2E2' }]}>
          <Ionicons name={change >= 0 ? 'trending-up' : 'trending-down'} size={12} color={change >= 0 ? '#16A34A' : '#DC2626'} />
          <Text style={[styles.changeText, { color: change >= 0 ? '#16A34A' : '#DC2626' }]}>
            {getChangeLabel(change)} this month
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 14, fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', marginTop: 2, letterSpacing: -0.5 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  balanceRow: { gap: 2 },
  balanceLabel: { fontSize: 12, fontWeight: '500' },
  balance: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  changeText: { fontSize: 11, fontWeight: '700' },
});
