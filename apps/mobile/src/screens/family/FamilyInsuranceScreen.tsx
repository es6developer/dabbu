import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

interface Policy {
  id: string;
  type: string;
  name: string;
  coverage: number;
  premium: number;
  nextDue: string;
  status: string;
  icon?: string;
}

const typeConfig: Record<string, { icon: keyof typeof AntDesign.glyphMap; color: string }> = {
  Health: { icon: 'heart', color: '#EC4899' },
  Life: { icon: 'team', color: '#8B5CF6' },
  Term: { icon: 'Safety', color: '#3B82F6' },
  Car: { icon: 'car', color: '#10B981' },
  Home: { icon: 'home', color: '#F59E0B' },
};

const statusColors: Record<string, string> = {
  Active: '#10B981',
  Pending: '#F59E0B',
  Lapsed: '#EF4444',
};

const PolicyCard: React.FC<{ policy: Policy }> = ({ policy }) => {
  const config = typeConfig[policy.type] || { icon: 'Safety' as const, color: '#6B7280' };
  const statusColor = statusColors[policy.status];
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + 'Cr';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
    return '₹' + amount.toLocaleString('en-IN');
  };

  return (
    <View style={styles.policyCard}>
      <View style={styles.policyHeader}>
        <View style={[styles.policyIcon, { backgroundColor: config.color + '20' }]}>
          <AntDesign name={config.icon} size={22} color={config.color} />
        </View>
        <View style={styles.policyInfo}>
          <Text style={styles.policyName}>{policy.name}</Text>
          <Text style={styles.policyType}>{policy.type} Insurance</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{policy.status}</Text>
        </View>
      </View>

      <View style={styles.policyDivider} />

      <View style={styles.policyDetails}>
        <View style={styles.policyDetailItem}>
          <Text style={styles.policyDetailLabel}>Coverage</Text>
          <Text style={styles.policyDetailValue}>{formatCurrency(policy.coverage)}</Text>
        </View>
        <View style={styles.policyDetailItem}>
          <Text style={styles.policyDetailLabel}>Premium</Text>
          <Text style={styles.policyDetailValue}>₹{policy.premium.toLocaleString('en-IN')}/yr</Text>
        </View>
        <View style={styles.policyDetailItem}>
          <Text style={styles.policyDetailLabel}>Next Due</Text>
          <Text style={[styles.policyDetailValue, policy.status === 'Pending' && { color: '#F59E0B' }]}>
            {policy.nextDue}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function FamilyInsuranceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false, refresh = false) => {
    if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
    try {
      const res = await api.get('/family-space/insurance');
      const data = (res as any)?.data || res || [];
      setPolicies(Array.isArray(data) ? data : []);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { loadData(!isInitial); }, [loadData]));

  const totalCoverage = policies.reduce((s, p) => s + (p.coverage || 0), 0);
  const totalPremium = policies.reduce((s, p) => s + (p.premium || 0), 0);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + 'Cr';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
    return '₹' + amount.toLocaleString('en-IN');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Insurance</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
      <>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Coverage</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalCoverage)}</Text>
            <View style={styles.summaryIcon}>
              <AntDesign name="Safety" size={16} color="#10B981" />
            </View>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Premium / Year</Text>
            <Text style={styles.summaryValue}>₹{totalPremium.toLocaleString('en-IN')}</Text>
            <Text style={styles.summarySub}>₹{Math.round(totalPremium / 12).toLocaleString('en-IN')}/mo</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Policies</Text>
          <Text style={styles.sectionCount}>{policies.length} active</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {policies.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 }}>
              <AntDesign name="Safety" size={48} color="#6B7280" />
              <Text style={{ color: '#F9FAFB', marginTop: 16, fontSize: 18, fontWeight: '600' }}>No policies yet</Text>
              <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 14, textAlign: 'center' }}>
                Add your first insurance policy to track coverage and premiums
              </Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20, gap: 8 }}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Goals')}
              >
                <AntDesign name="plus" size={18} color="#0A0A0A" />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#0A0A0A' }}>Add Your First Policy</Text>
              </TouchableOpacity>
            </View>
          ) : policies.map(policy => (
            <PolicyCard key={policy.id} policy={policy} />
          ))}
        </ScrollView>
      </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  summarySub: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  sectionCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  policyCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  policyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  policyInfo: {
    flex: 1,
  },
  policyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  policyType: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  policyDivider: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginBottom: 12,
  },
  policyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  policyDetailItem: {
    flex: 1,
  },
  policyDetailLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  policyDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F9FAFB',
  },
});
