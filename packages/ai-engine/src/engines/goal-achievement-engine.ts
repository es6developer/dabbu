interface GoalData {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  type: string;
  monthlyContribution?: number;
  createdAt: Date;
}

interface GoalPredictionOutput {
  goalId: string;
  goalName: string;
  successProbability: number;
  requiredMonthlyContribution: number;
  predictedCompletionDate?: Date;
  delayRisk: 'low' | 'medium' | 'high';
  delayMonths: number;
  currentPace: 'ahead' | 'ontrack' | 'behind' | 'critical';
  improvementTip?: string;
}

interface GoalTransactionData {
  id: string;
  amount: number;
  category?: string;
  date: Date;
  type: string;
}

export class GoalAchievementEngine {
  predictGoalCompletion(
    goal: GoalData,
    savingsTransactions: GoalTransactionData[]
  ): GoalPredictionOutput {
    const now = new Date();

    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

    const monthsToDeadline = goal.deadline
      ? Math.max(0, this.monthsBetween(now, goal.deadline))
      : 12;

    if (monthsToDeadline <= 0) {
      return {
        goalId: goal.id,
        goalName: goal.name,
        successProbability: 0,
        requiredMonthlyContribution: 0,
        delayRisk: 'high',
        delayMonths: Math.abs(goal.deadline ? this.monthsBetween(now, goal.deadline) : 12),
        currentPace: 'critical',
        improvementTip: 'Deadline has passed. Consider resetting your goal timeline.',
      };
    }

    if (goal.currentAmount >= goal.targetAmount) {
      return {
        goalId: goal.id,
        goalName: goal.name,
        successProbability: 100,
        requiredMonthlyContribution: 0,
        delayRisk: 'low',
        delayMonths: 0,
        currentPace: 'ahead',
      };
    }

    const monthlySavingsRate = this.calculateMonthlySavingsRate(savingsTransactions, now);

    if (monthlySavingsRate <= 0) {
      const required = Math.round(remainingAmount / monthsToDeadline);
      return {
        goalId: goal.id,
        goalName: goal.name,
        successProbability: 0,
        requiredMonthlyContribution: required,
        delayRisk: 'high',
        delayMonths: Math.round(monthsToDeadline),
        currentPace: 'critical',
        improvementTip: `Start saving ₹${required}/month to reach your goal on time.`,
      };
    }

    const monthsNeeded = remainingAmount / monthlySavingsRate;

    let currentPace: 'ahead' | 'ontrack' | 'behind' | 'critical';
    if (monthsNeeded <= monthsToDeadline * 0.7) {
      currentPace = 'ahead';
    } else if (monthsNeeded <= monthsToDeadline) {
      currentPace = 'ontrack';
    } else if (monthsNeeded <= monthsToDeadline * 1.5) {
      currentPace = 'behind';
    } else {
      currentPace = 'critical';
    }

    const ratio = monthsNeeded / monthsToDeadline;
    let successProbability = 100 - (ratio - 1) * 100;
    successProbability = Math.max(0, Math.min(100, Math.round(successProbability)));

    const requiredMonthlyContribution = Math.round(remainingAmount / monthsToDeadline);

    const delayMonths = Math.max(0, Math.round(monthsNeeded - monthsToDeadline));

    let delayRisk: 'low' | 'medium' | 'high';
    if (delayMonths <= 0) {
      delayRisk = 'low';
    } else if (delayMonths <= 3) {
      delayRisk = 'medium';
    } else {
      delayRisk = 'high';
    }

    const predictedCompletionDate = new Date(now);
    predictedCompletionDate.setMonth(predictedCompletionDate.getMonth() + Math.ceil(monthsNeeded));

    let improvementTip: string | undefined;
    if (currentPace === 'behind' || currentPace === 'critical') {
      const additionalNeeded = requiredMonthlyContribution - monthlySavingsRate;
      if (additionalNeeded > 0) {
        const daysEarlier = Math.round(delayMonths * 30);
        improvementTip = `Increase savings by ₹${Math.round(additionalNeeded)}/month to finish ${daysEarlier} days earlier.`;
      }
    }

    return {
      goalId: goal.id,
      goalName: goal.name,
      successProbability,
      requiredMonthlyContribution,
      predictedCompletionDate,
      delayRisk,
      delayMonths,
      currentPace,
      improvementTip,
    };
  }

  calculateGoalProgress(goal: GoalData): { progress: number; daysRemaining?: number; burnRate: number } {
    const now = new Date();

    const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

    let daysRemaining: number | undefined;
    if (goal.deadline) {
      const diff = goal.deadline.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const createdAt = new Date(goal.createdAt);
    const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const burnRate = goal.currentAmount / daysSinceCreation;

    return { progress, daysRemaining, burnRate };
  }

  private calculateMonthlySavingsRate(transactions: GoalTransactionData[], now: Date): number {
    if (transactions.length === 0) return 0;

    const savingsTxns = transactions.filter(
      t => t.type === 'savings' || t.type === 'deposit' || t.type === 'investment'
    );
    const relevantTxns = savingsTxns.length > 0 ? savingsTxns : transactions;

    const totalSavings = relevantTxns.reduce((sum, t) => sum + t.amount, 0);

    const dates = relevantTxns.map(t => t.date);
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const monthsRange = Math.max(1, this.monthsBetween(earliest, now));

    return totalSavings / monthsRange;
  }

  private monthsBetween(start: Date, end: Date): number {
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      (end.getDate() - start.getDate()) / 30
    );
  }
}
