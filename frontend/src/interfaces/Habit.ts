export interface Schedule {
  daysOfWeek: number[];  // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  weekInterval: number;  // 1=every week, 2=every other week, …
  endDate?: string;       // ISO YYYY-MM-DD
}

export interface Habit {
  habitID: string;
  name: string;
  description: string;
  category: string;
  frequency: string;
  schedule?: Schedule;
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
  scheduledDays30: number;
  weeklyActivity: Record<string, number>;
  logDates: string[];
}

function isoWeekNumber(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function isScheduledToday(habit: Habit): boolean {
  const today = new Date();
  const todayOur = (today.getDay() + 6) % 7; // JS: 0=Sun → our: 0=Mon
  const todayStr = today.toISOString().split('T')[0];

  if (!habit.schedule) {
    return habit.frequency === 'daily';
  }

  const { daysOfWeek, weekInterval, endDate } = habit.schedule;
  if (endDate && todayStr > endDate) return false;
  if (!daysOfWeek.includes(todayOur)) return false;
  if (weekInterval > 1 && isoWeekNumber(today) % weekInterval !== 0) return false;
  return true;
}

export function formatSchedule(habit: Habit): string {
  if (!habit.schedule) {
    return habit.frequency === 'daily' ? 'Every day' : 'Weekly';
  }

  const { daysOfWeek, weekInterval } = habit.schedule;
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const sorted = [...daysOfWeek].sort((a, b) => a - b);

  let dayStr: string;
  if (sorted.length === 7) {
    dayStr = 'Every day';
  } else if (JSON.stringify(sorted) === JSON.stringify([0, 1, 2, 3, 4])) {
    dayStr = 'Weekdays';
  } else if (JSON.stringify(sorted) === JSON.stringify([5, 6])) {
    dayStr = 'Weekends';
  } else {
    dayStr = sorted.map(d => dayNames[d]).join(', ');
  }

  if (weekInterval > 1) {
    dayStr += ` · every ${weekInterval}w`;
  }

  return dayStr;
}

export const CATEGORIES = [
  { value: 'health', label: 'Health' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'learning', label: 'Learning' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
];

export const HABIT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];
