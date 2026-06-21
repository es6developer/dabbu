import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.55;
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface CircularProgressProps {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size,
  strokeWidth,
  color,
}) => {
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: '#2C2C2E',
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: color,
          transform: [{ rotate: `${progress * 360}deg` }],
          position: 'absolute',
        }}
      />
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.circlePercent}>{Math.round(progress * 100)}%</Text>
        <Text style={styles.circleLabel}>Funded</Text>
      </View>
    </View>
  );
};

export default function FamilyEmergencyFundScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [fund, setFund] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false, refresh = false) => {
    if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
    try {
      const res = await api.get('/family-space/emergency-fund');
      const data = (res as any)?.data || res || {};
      setFund(data);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { loadData(!isInitial); }, [loadData]));

  const targetAmount = fund?.targetAmount || 500000;
  const savedAmount = fund?.savedAmount || 0;
  const monthlyContribution = fund?.monthlyContribution || 0;
  const monthlyExpenses = fund?.monthlyExpenses || 83333;
  const monthsCovered = monthlyExpenses > 0 ? Math.floor(savedAmount / monthlyExpenses) : 0;
  const targetMonths = fund?.targetMonths || 6;
  const progress = targetAmount > 0 ? savedAmount / targetAmount : 0;

  const formatCurrency = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  const remaining = targetAmount - savedAmount;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AntDesign name="Safety" size={24} color="#10B981" />
          <Text style={styles.headerTitle}>Emergency Fund</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.circleCard}>
          <CircularProgress
            progress={progress}
            size={CIRCLE_SIZE}
            strokeWidth={STROKE_WIDTH}
            color="#10B981"
          />
          <View style={styles.amountContainer}>
            <Text style={styles.savedAmount}>{formatCurrency(savedAmount)}</Text>
            <Text style={styles.targetText}>of {formatCurrency(targetAmount)}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
              <AntDesign name="arrowup" size={18} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{formatCurrency(monthlyContribution)}</Text>
            <Text style={styles.statLabel}>Monthly Contribution</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
              <AntDesign name="clockcircle" size={18} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{monthsCovered} / {targetMonths}</Text>
            <Text style={styles.statLabel}>Months Covered</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <AntDesign name="checkcircle" size={16} color="#10B981" />
            <Text style={styles.infoText}>
              Great start! You've saved <Text style={styles.infoHighlight}>{formatCurrency(savedAmount)}</Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <AntDesign name="exclamationcircle" size={16} color="#F59E0B" />
            <Text style={styles.infoText}>
              Need <Text style={[styles.infoHighlight, { color: '#F59E0B' }]}>{formatCurrency(remaining)}</Text> more to reach your target
            </Text>
          </View>
          <View style={styles.infoRow}>
            <AntDesign name="star" size={16} color="#8B5CF6" />
            <Text style={styles.infoText}>
              Target: <Text style={[styles.infoHighlight, { color: '#8B5CF6' }]}>{targetMonths} months</Text> of expenses covered
            </Text>
          </View>
        </View>

        <View style={styles.progressDetailCard}>
          <Text style={styles.progressDetailTitle}>Monthly Breakdown</Text>
          <View style={styles.progressDetailRow}>
            <Text style={styles.progressDetailLabel}>Monthly Expenses</Text>
            <Text style={styles.progressDetailValue}>{formatCurrency(monthlyExpenses)}</Text>
          </View>
          <View style={styles.progressDetailRow}>
            <Text style={styles.progressDetailLabel}>Months of Safety</Text>
            <Text style={styles.progressDetailValue}>{monthsCovered} months</Text>
          </View>
          <View style={styles.progressDetailRow}>
            <Text style={styles.progressDetailLabel}>Target Safety</Text>
            <Text style={styles.progressDetailValue}>{targetMonths} months</Text>
          </View>
          <View style={styles.progressDivider} />
          <View style={styles.progressDetailRow}>
            <Text style={styles.progressDetailLabel}>Progress</Text>
            <Text style={[styles.progressDetailValue, { color: '#10B981' }]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.contributeButton}
          onPress={() => navigation.navigate('Goals')}
        >
          <AntDesign name="plus" size={20} color="#0A0A0A" />
          <Text style={styles.contributeText}>Contribute Now</Text>
        </TouchableOpacity>
      </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
  },
  circleCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 16,
  },
  circlePercent: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  circleLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  amountContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  savedAmount: {
    fontSize: 34,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: -0.5,
  },
  targetText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#F9FAFB',
    flex: 1,
  },
  infoHighlight: {
    fontWeight: '700',
    color: '#10B981',
  },
  progressDetailCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  progressDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  progressDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  progressDivider: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
  },
  contributeButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  contributeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0A0A0A',
  },
});
