'use client';

import React, { useMemo } from 'react';
import { HabitAnalysis, Habit } from '@/interfaces/Habit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ContributionGraph from './ContributionGraph';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface AnalysisChartsProps {
  analyses: HabitAnalysis[];
  habits: Habit[];
}

export default function AnalysisCharts({ analyses, habits }: AnalysisChartsProps) {
  const habitMap = useMemo(() => {
    const map: Record<string, Habit> = {};
    habits.forEach(h => { map[h.habitID] = h; });
    return map;
  }, [habits]);

  // Combine all log dates for the overall activity graph
  const allLogDates = useMemo(() =>
    analyses.flatMap(a => a.logDates),
    [analyses]
  );

  // Streak bar chart data
  const streakData = useMemo(() =>
    analyses
      .filter(a => a.currentStreak > 0)
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, 10)
      .map(a => ({
        name: a.name.length > 14 ? a.name.slice(0, 13) + '…' : a.name,
        streak: a.currentStreak,
        color: habitMap[a.habitID]?.color ?? '#3b82f6',
      })),
    [analyses, habitMap]
  );

  // Completion rate data
  const rateData = useMemo(() =>
    analyses
      .sort((a, b) => b.completionRate30d - a.completionRate30d)
      .map(a => ({
        name: a.name.length > 14 ? a.name.slice(0, 13) + '…' : a.name,
        rate: a.completionRate30d,
        color: habitMap[a.habitID]?.color ?? '#3b82f6',
      })),
    [analyses, habitMap]
  );

  if (!analyses.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground text-sm">
          No analysis data yet. Start logging your habits to see insights here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall activity graph */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Activity — Last 26 Weeks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContributionGraph logDates={allLogDates} color="#3b82f6" weeks={26} />
          <p className="mt-2 text-xs text-muted-foreground">
            Each cell represents a day. Darker cells indicate more habits completed.
          </p>
        </CardContent>
      </Card>

      {/* Per-habit graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {analyses.map(analysis => {
          const habit = habitMap[analysis.habitID];
          return (
            <Card key={analysis.habitID}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: habit?.color ?? '#3b82f6' }}
                  />
                  <CardTitle className="text-sm font-semibold truncate">{analysis.name}</CardTitle>
                  <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span>{analysis.uniqueDays} days logged</span>
                    {analysis.currentStreak > 0 && (
                      <span className="text-orange-500 font-medium">{analysis.currentStreak}d streak</span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-1">
                <ContributionGraph
                  logDates={analysis.logDates}
                  color={habit?.color ?? '#3b82f6'}
                  weeks={18}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bar charts */}
      {streakData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Current Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(160, streakData.length * 28)}>
                <BarChart data={streakData} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={88} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => [`${v} days`, 'Streak']}
                    contentStyle={{ fontSize: 12, border: '1px solid var(--border)', borderRadius: 6 }}
                  />
                  <Bar dataKey="streak" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {streakData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                30-Day Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(160, rateData.length * 28)}>
                <BarChart data={rateData} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={88} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Completion']}
                    contentStyle={{ fontSize: 12, border: '1px solid var(--border)', borderRadius: 6 }}
                  />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {rateData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
