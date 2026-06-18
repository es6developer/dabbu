import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const cardWidth = (width - 56) / 2;

interface Goal {
  id: string;
  icon: keyof typeof AntDesign.glyphMap;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  color: string;
}

const initialGoals: Goal[] = [
  { id: '1', icon: 'home', name: 'House', target: 5000000, saved: 1200000, deadline: 'Dec 2028', color: '#3B82F6' },
  { id: '2', icon: 'book', name: 'Education', target: 3000000, saved: 800000, deadline: 'Jun 2030', color: '#8B5CF6' },
  { id: '3', icon: 'heart', name: 'Marriage', target: 2500000, saved: 500000, deadline: 'Jan 2032', color: '#EC4899' },
  { id: '4', icon: 'warning', name: 'Emergency', target: 500000, saved: 250000, deadline: 'Ongoing', color: '#F59E0B' },
  { id: '5', icon: 'car', name: 'Vehicle', target: 800000, saved: 300000, deadline: 'Mar 2027', color: '#10B981' },
  { id: '6', icon: 'star', name: 'Custom', target: 100000, saved: 20000, deadline: 'Aug 2026', color: '#6366F1' },
];

const GoalCard: React.FC<{ goal: Goal }> = ({ goal }) => {
  const progress = Math.min((goal.saved / goal.target) * 100, 100);
  const fmtVal = (amount: number) => {
    if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + 'Cr';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
    return '₹' + amount.toLocaleString('en-IN');
  };

  return (
    <View style={styles.goalCard}>
      <View style={[styles.goalIconContainer, { backgroundColor: goal.color + '20' }]}>
        <AntDesign name={goal.icon} size={24} color={goal.color} />
      </View>
      <Text style={styles.goalName}>{goal.name}</Text>
      <View style={styles.goalAmountRow}>
        <Text style={styles.goalTarget}>{fmtVal(goal.target)}</Text>
        <Text style={styles.goalDeadline}>{goal.deadline}</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progress}%`, backgroundColor: goal.color },
          ]}
        />
      </View>
      <View style={styles.goalSavedRow}>
        <Text style={styles.goalSavedText}>Saved: {fmtVal(goal.saved)}</Text>
        <Text style={styles.goalProgressText}>{progress.toFixed(0)}%</Text>
      </View>
      <TouchableOpacity
        style={[styles.contributeBtn, { borderColor: goal.color + '40' }]}
        onPress={() => Alert.alert('Add Contribution', `Add to ${goal.name} fund`)}
      >
        <AntDesign name="plus" size={14} color={goal.color} />
        <Text style={[styles.contributeBtnText, { color: goal.color }]}>
          Add Contribution
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function FamilyGoalsScreen() {
  const insets = useSafeAreaInsets();
  const [goals] = useState<Goal[]>(initialGoals);

  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const overallProgress = Math.min((totalSaved / totalTarget) * 100, 100);

  const fmtVal = (amount: number) => {
    if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + 'Cr';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
    return '₹' + amount.toLocaleString('en-IN');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Family Goals</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert('Create Goal', 'Goal creation flow')}
        >
          <AntDesign name="pluscircleo" size={20} color="#10B981" />
          <Text style={styles.addButtonText}>Create Goal</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.overallCard}>
        <View style={styles.overallHeader}>
          <Text style={styles.overallLabel}>Overall Progress</Text>
          <Text style={styles.overallPercent}>{overallProgress.toFixed(1)}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${overallProgress}%`, backgroundColor: '#10B981' } as any,
            ]}
          />
        </View>
        <View style={styles.overallRow}>
          <View style={styles.overallItem}>
            <Text style={styles.overallValue}>{fmtVal(totalSaved)}</Text>
            <Text style={styles.overallLabelSmall}>Saved</Text>
          </View>
          <View style={styles.overallItem}>
            <Text style={styles.overallValue}>{fmtVal(totalTarget)}</Text>
            <Text style={styles.overallLabelSmall}>Target</Text>
          </View>
          <View style={styles.overallItem}>
            <Text style={styles.overallValue}>{goals.length}</Text>
            <Text style={styles.overallLabelSmall}>Goals</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.goalsGrid}>
          {goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </View>
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
    backgroundColor: '#1C2A25',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  overallCard: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  overallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overallLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  overallPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  overallItem: {
    alignItems: 'center',
  },
  overallValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  overallLabelSmall: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  goalCard: {
    width: cardWidth,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  goalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 6,
  },
  goalAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalTarget: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  goalDeadline: {
    fontSize: 11,
    color: '#6B7280',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#2C2C2E',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalSavedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalSavedText: {
    fontSize: 11,
    color: '#6B7280',
  },
  goalProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  contributeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  contributeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
