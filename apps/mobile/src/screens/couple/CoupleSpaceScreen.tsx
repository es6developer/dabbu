import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtShort(v: number) {
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function Avatar({ name, url, size = 44, colors }: { name?: string; url?: string; size?: number; colors: any }) {
  const initials = (name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: colors.accent.primary }}>{initials}</Text>
      )}
    </View>
  );
}

export function CoupleSpaceScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (accessToken) setAccessToken(accessToken);
        const res: any = await api.get('/couple/dashboard');
        setData(res?.data || res);
      } catch (e: any) {
        setError(e?.message || 'Failed to load couple data');
      }
      setLoading(false);
    })();
  }, [accessToken]));

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Couple Space</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="heart-dislike-outline" size={48} color={colors.text.tertiary} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginTop: 12 }}>Not Connected</Text>
          <Text style={{ fontSize: 13, color: colors.text.tertiary, textAlign: 'center', marginTop: 4 }}>Connect with your partner to see shared finances</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('Settings', { screen: 'AddPartner' })}
            style={{ marginTop: 20, backgroundColor: colors.accent.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Connect Partner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { user, partner, couple, totalMonthlySpent, goalsProgress, goalsTarget, upcomingBills, partnerSince } = data;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Couple Space</Text>
        <TouchableOpacity onPress={() => (navigation as any).navigate('Settings', { screen: 'AddPartner' })}>
          <Ionicons name="settings-outline" size={22} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Partner Card */}
        <View style={[styles.partnerCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar name={user?.firstName} size={52} colors={colors} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.tertiary }}>You</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>{user?.firstName || 'You'}</Text>
            </View>
            <Ionicons name="heart-outline" size={20} color="#FF6B9D" />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.tertiary }}>Partner</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>{partner?.firstName || 'Partner'}</Text>
            </View>
            <Avatar name={partner?.firstName} size={52} colors={colors} />
          </View>
          {partnerSince && (
            <Text style={{ fontSize: 12, color: colors.text.tertiary, textAlign: 'center', marginTop: 10 }}>
              Together since {partnerSince}
            </Text>
          )}
        </View>

        {/* Monthly Stats */}
        <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>This Month</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <View style={[styles.statBox, { backgroundColor: colors.bg.tertiary }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>You Spent</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.status.error, marginTop: 2 }}>
                {fmtShort(user?.monthlySpent || 0)}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.bg.tertiary }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>Partner Spent</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.status.warning, marginTop: 2 }}>
                {fmtShort(partner?.monthlySpent || 0)}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.accent.primary + '10' }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.accent.primary, marginTop: 2 }}>
                {fmtShort(totalMonthlySpent || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Combined Goals */}
        {goalsTarget > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Combined Goals</Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bg.tertiary, marginTop: 10, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min((goalsProgress / goalsTarget) * 100, 100)}%`, height: '100%', backgroundColor: colors.status.success, borderRadius: 4 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Saved: {fmtShort(goalsProgress)}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.primary }}>Target: {fmtShort(goalsTarget)}</Text>
            </View>
          </View>
        )}

        {/* Upcoming Bills */}
        {upcomingBills?.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Upcoming Bills</Text>
              <TouchableOpacity onPress={() => (navigation as any).navigate('Bills')}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent.primary }}>See All</Text>
              </TouchableOpacity>
            </View>
            {upcomingBills.slice(0, 3).map((bill: any) => (
              <View key={bill.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="receipt-outline" size={16} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }}>{bill.name}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.status.warning }}>{fmt(bill.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Quick Actions</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { icon: 'add-circle', label: 'Add Expense', color: colors.status.error, screen: 'AddExpense' },
            { icon: 'trending-up', label: 'Add Income', color: colors.status.success, screen: 'AddExpense' },
            { icon: 'wallet', label: 'Shared Goals', color: colors.accent.primary, screen: 'Goals' },
            { icon: 'settings', label: 'Settings', color: colors.text.secondary, screen: 'Settings' },
          ].map((action) => (
            <TouchableOpacity key={action.label} activeOpacity={0.7}
              onPress={() => (navigation as any).navigate(action.screen)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.subtle }}
            >
              <Ionicons name={action.icon as any} size={16} color={action.color} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  partnerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
});
