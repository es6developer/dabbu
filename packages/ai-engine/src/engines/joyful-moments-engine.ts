interface JMGoalData {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  type: string;
  isCompleted: boolean;
  completedAt?: Date;
}

interface JMTransactionData {
  id: string;
  amount: number;
  category?: string;
  date: Date;
  type: string;
}

interface JMSettlementData {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: Date;
  status: string;
}

interface JMStreakData {
  id: string;
  type: string;
  currentStreak: number;
  bestStreak: number;
  updatedAt: Date;
}

interface AiMilestoneOutput {
  milestoneType: string;
  title: string;
  description: string;
  icon?: string;
  animation?: 'confetti' | 'progress_ring' | 'achievement_card';
  value?: number;
  isAchieved: boolean;
}

export class JoyfulMomentsEngine {
  checkLargeSavingsMilestone(
    goals: JMGoalData[],
    transactions: JMTransactionData[]
  ): AiMilestoneOutput[] {
    const milestones: AiMilestoneOutput[] = [];
    const savingsGoals = goals.filter(g => g.type?.toLowerCase().includes('savings'));

    const savingsInflows = transactions
      .filter(t => t.type === 'income' || t.type === 'savings' || t.category?.toLowerCase().includes('savings'))
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0) + (savingsInflows * 0.3);
    const thresholds = [
      { value: 100000, label: '₹1,00,000', icon: '🌱' },
      { value: 500000, label: '₹5,00,000', icon: '🌟' },
      { value: 1000000, label: '₹10,00,000', icon: '💎' },
    ];

    for (const threshold of thresholds) {
      const goalCrossing = savingsGoals.find(
        g => g.currentAmount >= threshold.value && g.targetAmount >= threshold.value
      );

      if (goalCrossing || totalSaved >= threshold.value) {
        milestones.push({
          milestoneType: 'savings_milestone',
          title: `First ${threshold.label} Saved!`,
          description: `You've crossed the ${threshold.label} milestone. This is a huge step toward financial freedom!`,
          icon: threshold.icon,
          animation: 'confetti',
          value: threshold.value,
          isAchieved: true,
        });
      }
    }

    for (const goal of savingsGoals) {
      const crossed = thresholds.find(t =>
        goal.currentAmount >= t.value &&
        goal.currentAmount - goal.targetAmount < t.value &&
        goal.targetAmount >= t.value
      );
      if (crossed && !milestones.find(m => m.value === crossed.value)) {
        milestones.push({
          milestoneType: 'savings_milestone',
          title: `${crossed.label} Milestone Reached!`,
          description: `Your savings goal "${goal.name}" just crossed ${crossed.label}!`,
          icon: crossed.icon,
          animation: 'confetti',
          value: crossed.value,
          isAchieved: true,
        });
      }
    }

    return milestones;
  }

  checkStreakMilestones(streaks: JMStreakData[]): AiMilestoneOutput[] {
    const milestones: AiMilestoneOutput[] = [];
    const streakCheckpoints = [
      { days: 7, title: 'One week strong!', description: '7 days of consistency. Keep the momentum going!' },
      { days: 30, title: 'One month of discipline!', description: '30 days strong. You are building a healthy habit!' },
      { days: 60, title: 'Two months of consistency!', description: '60 days of unwavering discipline. Incredible!' },
      { days: 90, title: '90 days of financial discipline!', description: 'Three months of smart money habits. You are a rockstar!' },
    ];

    for (const streak of streaks) {
      for (const checkpoint of streakCheckpoints) {
        if (streak.currentStreak >= checkpoint.days) {
          const existing = milestones.find(
            m => m.milestoneType === `${streak.type}_streak` && m.title === checkpoint.title
          );
          if (!existing) {
            milestones.push({
              milestoneType: `${streak.type}_streak`,
              title: checkpoint.title,
              description: `${streak.type.charAt(0).toUpperCase() + streak.type.slice(1)} streak: ${streak.currentStreak} days. ${checkpoint.description}`,
              animation: 'progress_ring',
              value: streak.currentStreak,
              isAchieved: true,
            });
          }
        }
      }
    }

    return milestones;
  }

  checkGoalCompletion(goals: JMGoalData[]): AiMilestoneOutput[] {
    const milestones: AiMilestoneOutput[] = [];
    const now = new Date();

    for (const goal of goals) {
      if (!goal.isCompleted || !goal.completedAt) continue;

      let description = `Goal "${goal.name}" has been completed!`;
      let title = `🎉 ${goal.name} Goal Completed!`;

      milestones.push({
        milestoneType: 'goal_completion',
        title,
        description,
        animation: 'achievement_card',
        value: goal.targetAmount,
        isAchieved: true,
      });
    }

    return milestones;
  }

  checkFastestSettlement(settlements: JMSettlementData[]): AiMilestoneOutput[] {
    const milestones: AiMilestoneOutput[] = [];

    const settledRecords = settlements.filter(s => s.status === 'completed');
    if (settledRecords.length < 2) return milestones;

    for (const settlement of settledRecords) {
      const otherPartySettlements = settledRecords.filter(
        s => s.id !== settlement.id &&
          ((s.from === settlement.from && s.to === settlement.to) ||
           (s.from === settlement.to && s.to === settlement.from))
      );

      if (otherPartySettlements.length === 0) continue;

      for (const other of otherPartySettlements) {
        const timeDiff = Math.abs(other.date.getTime() - settlement.date.getTime());
        const minutesDiff = timeDiff / (1000 * 60);

        if (minutesDiff <= 60 && minutesDiff > 0) {
          const displayMinutes = Math.max(Math.round(minutesDiff), 1);
          milestones.push({
            milestoneType: 'fastest_settlement',
            title: `Fastest settlement ever — just ${displayMinutes} ${displayMinutes === 1 ? 'minute' : 'minutes'}!`,
            description: `A settlement of ₹${settlement.amount.toLocaleString()} was resolved in ${displayMinutes} ${displayMinutes === 1 ? 'minute' : 'minutes'}. That's record speed!`,
            animation: 'confetti',
            value: settlement.amount,
            isAchieved: true,
          });
        }
      }
    }

    return milestones;
  }

  checkSavingStreak(streaks: JMStreakData[]): AiMilestoneOutput | null {
    const savingsStreak = streaks.find(
      s => s.type?.toLowerCase().includes('savings') || s.type?.toLowerCase().includes('couple')
    );

    if (!savingsStreak || savingsStreak.currentStreak < 2) return null;

    const unit = savingsStreak.currentStreak >= 7 ? 'week' : 'week';
    const weeksValue = savingsStreak.currentStreak >= 7
      ? Math.floor(savingsStreak.currentStreak / 7)
      : savingsStreak.currentStreak;

    return {
      milestoneType: 'saving_streak',
      title: `Couple Savings Streak: ${weeksValue} ${weeksValue === 1 ? 'week' : 'weeks'}`,
      description: `You and your partner have been saving together for ${weeksValue} ${weeksValue === 1 ? 'week' : 'weeks'}! Keep building that future together.`,
      animation: 'progress_ring',
      value: weeksValue,
      isAchieved: true,
    };
  }

  checkAll(
    goals: JMGoalData[],
    transactions: JMTransactionData[],
    settlements: JMSettlementData[],
    streaks: JMStreakData[]
  ): AiMilestoneOutput[] {
    const milestones: AiMilestoneOutput[] = [
      ...this.checkLargeSavingsMilestone(goals, transactions),
      ...this.checkStreakMilestones(streaks),
      ...this.checkGoalCompletion(goals),
      ...this.checkFastestSettlement(settlements),
    ];

    const savingStreak = this.checkSavingStreak(streaks);
    if (savingStreak) {
      milestones.push(savingStreak);
    }

    const significanceOrder: Record<string, number> = {
      savings_milestone: 1,
      goal_completion: 2,
      fastest_settlement: 3,
      saving_streak: 4,
    };

    for (const streak of streaks) {
      const key = `${streak.type}_streak`;
      if (!significanceOrder[key]) {
        significanceOrder[key] = 5;
      }
    }

    milestones.sort((a, b) => {
      const orderA = significanceOrder[a.milestoneType] ?? 99;
      const orderB = significanceOrder[b.milestoneType] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return (b.value ?? 0) - (a.value ?? 0);
    });

    return milestones;
  }
}
