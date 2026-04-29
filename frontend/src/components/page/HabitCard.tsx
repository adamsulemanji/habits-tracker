'use client';

import React from 'react';
import { Habit, HabitAnalysis, CATEGORIES } from '@/interfaces/Habit';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Flame, Pencil, Plus } from 'lucide-react';

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
    <Card className={`transition-all hover:shadow-md ${!habit.isActive ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: habit.color + '20', color: habit.color }}
            >
              {habit.icon}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{habit.name}</div>
              {habit.description && (
                <div className="text-xs text-muted-foreground truncate">{habit.description}</div>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {category?.icon} {category?.label}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">{habit.frequency}</span>
                {streak > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-orange-500 font-medium">
                    <Flame className="h-3 w-3" /> {streak}d
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(habit)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {loggedToday ? (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" disabled>
                <CheckCircle2 className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-8 w-8"
                style={{ backgroundColor: habit.color }}
                onClick={() => onLog(habit)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>30-day completion</span>
            <span>{rate}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: habit.color }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
