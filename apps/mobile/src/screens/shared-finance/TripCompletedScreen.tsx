import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CelebrationOverlay } from '../../components/ui/CelebrationOverlay';

interface TripCompletedScreenProps {
  route?: {
    params?: {
      groupName?: string;
      totalSpent?: number;
      totalExpenses?: number;
      memberCount?: number;
      yourShare?: number;
      currency?: string;
    };
  };
  navigation?: any;
}

export function TripCompletedScreen({ route, navigation }: TripCompletedScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showCelebration, setShowCelebration] = useState(true);

  const {
    groupName = 'Trip',
    totalSpent = 0,
    totalExpenses = 0,
    memberCount = 0,
    yourShare = 0,
    currency = 'INR',
  } = route?.params || {};

  const formatAmount = (val: number) =>
    `${currency === 'INR' ? '₹' : '$'}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <View style={{ flex: 1 }}>
      <CelebrationOverlay
        visible={showCelebration}
        onDismiss={() => setShowCelebration(false)}
        title="Trip Completed!"
        subtitle="All expenses settled successfully"
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg.primary }]}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 32 }}
      >
      <View style={styles.hero}>
        <View
          
          style={styles.iconWrap}
        >
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.status.success} />
        </View>

        <Text style={[styles.heroTitle, { color: colors.text.primary }]}>
          Trip Completed Successfully!
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>{groupName}</Text>
      </View>

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
        ]}
      >
        <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>Trip Summary</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>
              {formatAmount(totalSpent)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Total Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{totalExpenses}</Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Expenses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{memberCount}</Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Members</Text>
          </View>
        </View>

        <View style={[styles.yourShareRow, { backgroundColor: `${colors.accent.primary}15` }]}>
          <View>
            <Text style={[styles.yourShareLabel, { color: colors.text.secondary }]}>
              Your Total Share
            </Text>
            <Text style={[styles.yourShareValue, { color: colors.accent.primary }]}>
              {formatAmount(yourShare)}
            </Text>
          </View>
          <Ionicons name="wallet-outline" size={28} color={colors.accent.primary} />
        </View>
      </View>

      <View style={styles.conversion}>
        <Text style={[styles.conversionTitle, { color: colors.text.primary }]}>
          Your next trip deserves smarter shared finance.
        </Text>

        <View style={styles.perkRow}>
          <Ionicons name="sparkles-outline" size={20} color={colors.status.warning} />
          <Text style={[styles.perkText, { color: colors.text.secondary }]}>
            Get 1 month premium free
          </Text>
        </View>
        <View style={styles.perkRow}>
          <Ionicons name="globe-outline" size={20} color={colors.accent.primary} />
          <Text style={[styles.perkText, { color: colors.text.secondary }]}>
            Manage all future trips with Dabbu
          </Text>
        </View>
        <View style={styles.perkRow}>
          <Ionicons name="people-outline" size={20} color={colors.status.success} />
          <Text style={[styles.perkText, { color: colors.text.secondary }]}>
            Invite friends for realtime expense splitting
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: colors.accent.primary }]}
          onPress={() => Linking.openURL('https://dabbu.app/premium')}
          activeOpacity={0.85}
        >
          <View
            
            
            
            style={styles.ctaGradient}
          >
            <Ionicons name="rocket-outline" size={20} color="#FFF" />
            <Text style={styles.ctaText}>Claim Your Free Premium Trial</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() => {
            if (navigation) {
              navigation.navigate('SharedFinanceHome');
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.secondaryCtaText, { color: colors.text.secondary }]}>
            Start Your Own Trip Group
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  heroTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', paddingHorizontal: 24 },
  heroSubtitle: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 20, gap: 20 },
  summaryTitle: { fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: '#e0e0e020' },
  yourShareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
  },
  yourShareLabel: { fontSize: 13, fontWeight: '500' },
  yourShareValue: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  conversion: { marginHorizontal: 20, marginTop: 28, gap: 16 },
  conversionTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  perkText: { fontSize: 14, fontWeight: '500', flex: 1 },
  ctaBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryCta: { alignItems: 'center', paddingVertical: 14 },
  secondaryCtaText: { fontSize: 14, fontWeight: '600' },
});
