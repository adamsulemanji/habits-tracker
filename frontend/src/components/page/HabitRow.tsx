'use client';

import React from 'react';
import { Habit, HabitAnalysis, CATEGORIES } from '@/interfaces/Habit';
import { Button } from '@/components/ui/button';
import { Check, Pencil, Plus, Flame } from 'lucide-react';

interface HabitRowProps {
  habit: Habit;
  analysis?: HabitAnalysis;
  loggedToday: boolean;
  onLog: (habit: Habit) => void;
  onEdit: (habit: Habit) => void;
}

export default function HabitRow({ habit, analysis, loggedToday, onLog, onEdit }: HabitRowProps) {
  const category = CATEGORIES.find(c => c.value === habit.category);
  const streak = analysis?.currentStreak ?? 0;
  const rate = analysis?.completionRate30d ?? 0;

  return (
    <div
      className={`group flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors ${
        loggedToday
          ? 'bg-muted/20 border-border/40'
          : 'bg-card border-border hover:border-border/80 hover:bg-muted/10'
      }`}
    >
      {/* Color stripe */}
      <div
        className="w-0.5 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: habit.color }}
      />

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${loggedToday ? 'text-muted-foreground' : ''}`}>
            {habit.name}
          </span>
          {loggedToday && (
            <span className="shrink-0 text-xs text-green-600 dark:text-green-500 font-medium">done</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
          {category && <span>{category.label}</span>}
          <span className="opacity-40">·</span>
          <span className="capitalize">{habit.frequency}</span>
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
      </div>

      {/* Progress — hidden on small screens */}
      <div className="hidden sm:flex items-center gap-2.5 shrink-0 w-36">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: habit.color }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{rate}%</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onEdit(habit)}
        >
          <Pencil className="h-3 w-3" />
        </Button>

        {loggedToday ? (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 cursor-default" disabled>
            <Check className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-7 w-7 shrink-0 shadow-none"
            style={{ backgroundColor: habit.color }}
            onClick={() => onLog(habit)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
