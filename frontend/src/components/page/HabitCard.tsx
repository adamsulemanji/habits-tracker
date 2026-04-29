'use client';

import React from 'react';
import { Habit, HabitAnalysis, CATEGORIES } from '@/interfaces/Habit';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className={`transition-colors hover:border-border/80 ${loggedToday ? 'bg-muted/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Color indicator */}
            <div
              className="mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ring-4 ring-offset-background"
              style={{ backgroundColor: habit.color, boxShadow: `0 0 0 3px ${habit.color}18` }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm truncate">{habit.name}</span>
                {loggedToday && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400 font-medium shrink-0">
                    <Check className="h-3 w-3" /> Done
                  </span>
                )}
              </div>
              {habit.description && (
                <p className="text-xs text-muted-foreground truncate mb-1">{habit.description}</p>
              )}
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                {category && <span className="font-medium">{category.label}</span>}
                <span className="text-muted-foreground/50">·</span>
                <span className="capitalize">{habit.frequency}</span>
                {streak > 0 && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="flex items-center gap-0.5 text-orange-500 dark:text-orange-400 font-medium">
                      <Flame className="h-3 w-3" />
                      {streak}d
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(habit)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            {loggedToday ? (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" disabled>
                <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-7 w-7"
                style={{ backgroundColor: habit.color }}
                onClick={() => onLog(habit)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Completion progress bar */}
        <div className="mt-3">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-1.5">
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
      </CardContent>
    </Card>
  );
}
