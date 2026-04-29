'use client';

import React, { useMemo } from 'react';
import { HabitAnalysis, Habit } from '@/interfaces/Habit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface AnalysisChartsProps {
  analyses: HabitAnalysis[];
  habits: Habit[];
}

export default function AnalysisCharts({ analyses, habits }: AnalysisChartsProps) {
  const habitColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    habits.forEach(h => { map[h.habitID] = h.color; });
    return map;
  }, [habits]);

  // Streak bar chart data
  const streakData = analyses
    .filter(a => a.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 8)
    .map(a => ({ name: a.name, streak: a.currentStreak, color: habitColorMap[a.habitID] ?? '#3b82f6' }));

  // Completion rate data
  const rateData = analyses
    .sort((a, b) => b.completionRate30d - a.completionRate30d)
    .map(a => ({ name: a.name, rate: a.completionRate30d, color: habitColorMap[a.habitID] ?? '#3b82f6' }));

  if (!analyses.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          No analysis data yet. Start logging your habits!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Current Streaks 🔥</CardTitle>
        </CardHeader>
        <CardContent>
          {streakData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active streaks yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={streakData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: number) => [`${v} days`, 'Streak']} />
                <Bar dataKey="streak" radius={[0, 4, 4, 0]}>
                  {streakData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">30-Day Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rateData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Completion']} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {rateData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
