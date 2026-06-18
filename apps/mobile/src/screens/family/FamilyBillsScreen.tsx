import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BillStatus = 'Paid' | 'Upcoming' | 'Overdue';

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: BillStatus;
  category: string;
}

const initialBills: Bill[] = [
  { id: '1', name: 'Electricity Bill', amount: 3200, dueDate: '15 Jun 2026', status: 'Upcoming', category: 'Utilities' },
  { id: '2', name: 'Water Bill', amount: 850, dueDate: '20 Jun 2026', status: 'Upcoming', category: 'Utilities' },
  { id: '3', name: 'Internet - Airtel', amount: 1499, dueDate: '10 Jun 2026', status: 'Paid', category: 'Utilities' },
  { id: '4', name: 'Home Insurance Premium', amount: 12500, dueDate: '05 Jun 2026', status: 'Paid', category: 'Insurance' },
  { id: '5', name: 'Society Maintenance', amount: 4500, dueDate: '01 Jun 2026', status: 'Overdue', category: 'Housing' },
  { id: '6', name: 'School Fees - Aarav', amount: 8500, dueDate: '25 May 2026', status: 'Overdue', category: 'Education' },
  { id: '7', name: 'Credit Card Bill', amount: 23400, dueDate: '28 Jun 2026', status: 'Upcoming', category: 'Finance' },
  { id: '8', name: 'Gas Cylinder', amount: 1050, dueDate: '18 Jun 2026', status: 'Upcoming', category: 'Utilities' },
];

const statusConfig = {
  Paid: { icon: 'checkcircle' as const, color: '#10B981', label: 'Paid' },
  Upcoming: { icon: 'clockcircle' as const, color: '#3B82F6', label: 'Upcoming' },
  Overdue: { icon: 'exclamationcircle' as const, color: '#EF4444', label: 'Overdue' },
};

const BillCard: React.FC<{ bill: Bill }> = ({ bill }) => {
  const config = statusConfig[bill.status];
  const isOverdue = bill.status === 'Overdue';
  const formatCurrency = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  return (
    <TouchableOpacity
      style={[styles.billCard, isOverdue && styles.overdueCard]}
      activeOpacity={0.7}
      onPress={() => Alert.alert('Bill Details', `${bill.name}\n${formatCurrency(bill.amount)}\nDue: ${bill.dueDate}`)}
    >
      <View style={styles.billLeft}>
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
        <View style={styles.billInfo}>
          <Text style={[styles.billName, isOverdue && styles.overdueText]}>{bill.name}</Text>
          <Text style={styles.billCategory}>{bill.category}</Text>
          <Text style={[styles.billDueDate, isOverdue && styles.overdueText]}>Due: {bill.dueDate}</Text>
        </View>
      </View>
      <View style={styles.billRight}>
        <Text style={[styles.billAmount, isOverdue && styles.overdueText]}>
          {formatCurrency(bill.amount)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
          <AntDesign name={config.icon} size={12} color={config.color} />
          <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function FamilyBillsScreen() {
  const insets = useSafeAreaInsets();
  const [bills] = useState<Bill[]>(initialBills);

  const formatCurrency = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  const totalBills = bills.reduce((s, b) => s + b.amount, 0);
  const dueThisMonth = bills
    .filter(b => b.status === 'Upcoming')
    .reduce((s, b) => s + b.amount, 0);
  const overdue = bills
    .filter(b => b.status === 'Overdue')
    .reduce((s, b) => s + b.amount, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shared Bills</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert('Add Bill', 'Add a new shared bill')}
        >
          <AntDesign name="plus" size={18} color="#0A0A0A" />
          <Text style={styles.addButtonText}>Add Bill</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Bills</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalBills)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Due This Month</Text>
          <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>{formatCurrency(dueThisMonth)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Overdue</Text>
          <Text style={[styles.summaryValue, { color: overdue > 0 ? '#EF4444' : '#6B7280' }]}>
            {formatCurrency(overdue)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {bills.map(bill => (
          <BillCard key={bill.id} bill={bill} />
        ))}
      </ScrollView>
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
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  billCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  overdueCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  billLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  billCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  billDueDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  overdueText: {
    color: '#EF4444',
  },
  billRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
