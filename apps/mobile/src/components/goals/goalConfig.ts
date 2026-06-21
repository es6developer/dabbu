import { Dimensions } from 'react-native';

export const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const MILESTONES = [25, 50, 75, 100];

export type GoalConfig = {
  icon: string;
  color: string;
  emoji: string;
  tagline: string;
};

export const GOAL_CONFIGS: Record<string, GoalConfig> = {
  emergency: { icon: 'checkcircle', color: '#FF6B6B', emoji: '🛡️', tagline: 'Peace of mind' },
  vacation: { icon: 'dingding', color: '#00B894', emoji: '✈️', tagline: 'Adventure is calling' },
  education: { icon: 'book', color: '#4F6EF7', emoji: '🎓', tagline: 'Invest in your future' },
  home: { icon: 'home', color: '#F97316', emoji: '🏠', tagline: 'Your dream home awaits' },
  car: { icon: 'car', color: '#14B8A6', emoji: '🚗', tagline: 'Freedom on four wheels' },
  wedding: { icon: 'heart', color: '#FF6B9D', emoji: '💍', tagline: 'Happily ever after' },
  retirement: { icon: 'Safety', color: '#247BA0', emoji: '🏖️', tagline: 'Golden years ahead' },
  savings: { icon: 'wallet', color: '#8B5CF6', emoji: '🐷', tagline: 'Every rupee counts' },
  investment: { icon: 'linechart', color: '#10B981', emoji: '📈', tagline: 'Grow your wealth' },
  baby: { icon: 'smileo', color: '#FF69B4', emoji: '👶', tagline: 'Welcome to the family' },
  custom: { icon: 'flag', color: '#14B8A6', emoji: '⭐', tagline: 'Your goal, your way' },
};

export const SUGGESTED_GOALS = [
  { name: 'Emergency Fund', type: 'emergency', target: 200000 },
  { name: 'Dream Vacation', type: 'vacation', target: 300000 },
  { name: 'New Home', type: 'home', target: 5000000 },
  { name: 'New Car', type: 'car', target: 800000 },
  { name: 'Education Fund', type: 'education', target: 500000 },
  { name: 'Wedding Fund', type: 'wedding', target: 1000000 },
  { name: 'Retirement', type: 'retirement', target: 10000000 },
  { name: 'Baby Fund', type: 'baby', target: 500000 },
  { name: 'General Savings', type: 'savings', target: 100000 },
  { name: 'Investment Goal', type: 'investment', target: 500000 },
];

export function fmt(v: number): string {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function fmtShort(v: number): string {
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return fmt(v);
}

export function daysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getMotivationalTagline(pct: number): string {
  if (pct === 0) return 'Every journey begins with a single step';
  if (pct < 25) return 'Great start! Keep the momentum going';
  if (pct < 50) return 'You\'re building something amazing';
  if (pct < 75) return 'Halfway there! The best is yet to come';
  if (pct < 100) return 'Almost there! The finish line is in sight';
  return 'Goal achieved! You did it! 🎉';
}

export function getGoalConfig(type: string): GoalConfig {
  return GOAL_CONFIGS[type] || GOAL_CONFIGS.custom;
}

export function getPaceLabel(pace: string): string {
  switch (pace) {
    case 'ahead': return 'Ahead';
    case 'ontrack': return 'On Track';
    case 'behind': return 'Behind';
    default: return 'On Track';
  }
}

export function getPaceColor(pace: string): string {
  switch (pace) {
    case 'ahead': return '#22C55E';
    case 'ontrack': return '#3B82F6';
    case 'behind': return '#EF4444';
    default: return '#3B82F6';
  }
}
