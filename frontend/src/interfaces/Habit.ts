export interface Habit {
  habitID: string;
  name: string;
  description: string;
  category: string;
  frequency: string;
  targetCount: number;
  color: string;
  icon: string;
  createdAt: string;
  isActive: boolean;
}

export interface HabitLog {
  logID: string;
  habitID: string;
  date: string;
  completedAt: string;
  note: string;
}

export interface HabitAnalysis {
  habitID: string;
  name: string;
  totalLogs: number;
  uniqueDays: number;
  currentStreak: number;
  maxStreak: number;
  completionRate30d: number;
  weeklyActivity: Record<string, number>;
  logDates: string[];
}

export const CATEGORIES = [
  { value: 'health', label: 'Health', icon: '🏥' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'learning', label: 'Learning', icon: '📚' },
  { value: 'productivity', label: 'Productivity', icon: '⚡' },
  { value: 'mindfulness', label: 'Mindfulness', icon: '🧘' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'other', label: 'Other', icon: '⭐' },
];

export const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export const HABIT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];
