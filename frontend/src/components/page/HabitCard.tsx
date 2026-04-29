'use client';

import React from 'react';
import { Habit, HabitAnalysis, CATEGORIES, formatSchedule } from '@/interfaces/Habit';
import { Button } from '@/components/ui/button';
import { Check, Pencil, Plus, Flame } from 'lucide-react';

interface HabitCardProps {
  habit: Habit;
  analysis?: HabitAnalysis;
  loggedToday: boolean;
  onLog: (habit: Habit) => void;
  onEdit: (habit: Habit) => void;
}

export default function HabitCard({ habit, analysis, loggedToday, onLog, onEdit }: HabitCardProps) {
  const category = CATEGORIES.find(c => c.value === habit.category);
  const streak = analysis?.currentStreak ?? 0;
  const rate = analysis?.completionRate30d ?? 0;

  return (
    <div
      className={`group rounded-lg border transition-colors overflow-hidden ${
        loggedToday
          ? 'bg-muted/20 border-border/40'
          : 'bg-card border-border hover:border-border/70'
      }`}
    >
      {/* Color top bar */}
      <div className="h-0.5 w-full" style={{ backgroundColor: habit.color }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-sm font-medium truncate ${loggedToday ? 'text-muted-foreground' : ''}`}>
                {habit.name}
              </span>
              {loggedToday && (
                <span className="shrink-0 text-xs text-green-600 dark:text-green-500 font-medium">done</span>
              )}
            </div>
            {habit.description && (
              <p className="text-xs text-muted-foreground truncate">{habit.description}</p>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0 -mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(habit)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            {loggedToday ? (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 cursor-default" disabled>
                <Check className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-7 w-7 shadow-none"
                style={{ backgroundColor: habit.color }}
                onClick={() => onLog(habit)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          {category && <span>{category.label}</span>}
          <span className="opacity-40">·</span>
          <span>{formatSchedule(habit)}</span>
          {streak > 0 && (
            <>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-0.5 text-orange-500 dark:text-orange-400 font-medium">
                <Flame className="h-3 w-3" />
                {streak}d
              </span>
            </>
          )}
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>30-day rate</span>
            <span className="font-medium tabular-nums">{rate}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: habit.color }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
