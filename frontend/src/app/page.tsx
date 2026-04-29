'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Habit, HabitAnalysis, HabitLog } from '@/interfaces/Habit';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/provider/Dark-LightModeToggle';
import HabitCard from '@/components/page/HabitCard';
import HabitFormModal from '@/components/page/HabitFormModal';
import LogModal from '@/components/page/LogModal';
import AnalysisCharts from '@/components/page/AnalysisCharts';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, BarChart2, ListChecks } from 'lucide-react';

type Tab = 'habits' | 'analysis';

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [analyses, setAnalyses] = useState<HabitAnalysis[]>([]);
  const [todayLogs, setTodayLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('habits');
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>(undefined);
  const [logHabit, setLogHabit] = useState<Habit | undefined>(undefined);
  const [logOpen, setLogOpen] = useState(false);
  const { toast } = useToast();
  const apiURL = process.env.NEXT_PUBLIC_API_URL;

  const today = new Date().toISOString().split('T')[0];

  const loggedTodaySet = useMemo(
    () => new Set(todayLogs.map(l => l.habitID)),
    [todayLogs]
  );

  const activeHabits = useMemo(() => habits.filter(h => h.isActive), [habits]);

  async function fetchAll() {
    setIsLoading(true);
    try {
      const [habitsRes, analysisRes, logsRes] = await Promise.all([
        axios.get(`${apiURL}/habits`),
        axios.get(`${apiURL}/analysis`),
        axios.get(`${apiURL}/logs`, { params: { startDate: today, endDate: today } }),
      ]);
      setHabits(habitsRes.data.items ?? []);
      setAnalyses(analysisRes.data.items ?? []);
      setTodayLogs(logsRes.data.items ?? []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSaveHabit = (saved: Habit) => {
    setHabits(prev => {
      const exists = prev.some(h => h.habitID === saved.habitID);
      return exists ? prev.map(h => h.habitID === saved.habitID ? saved : h) : [...prev, saved];
    });
    setEditingHabit(undefined);
    fetchAll();
  };

  const handleDeleteHabit = (habitID: string) => {
    setHabits(prev => prev.filter(h => h.habitID !== habitID));
    setAnalyses(prev => prev.filter(a => a.habitID !== habitID));
  };

  const handleLogged = () => {
    fetchAll();
  };

  const handleOpenLog = (habit: Habit) => {
    setLogHabit(habit);
    setLogOpen(true);
  };

  const handleOpenEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingHabit(undefined);
    setFormOpen(true);
  };

  const completedToday = loggedTodaySet.size;
  const totalActive = activeHabits.length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h1 className="text-lg font-bold leading-none">Habits Tracker</h1>
                {!isLoading && totalActive > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {completedToday}/{totalActive} done today
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={tab === 'habits' ? 'default' : 'ghost'}
                size="sm"
                className="gap-1.5"
                onClick={() => setTab('habits')}
              >
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline">Habits</span>
              </Button>
              <Button
                variant={tab === 'analysis' ? 'default' : 'ghost'}
                size="sm"
                className="gap-1.5"
                onClick={() => setTab('analysis')}
              >
                <BarChart2 className="h-4 w-4" />
                <span className="hidden sm:inline">Analysis</span>
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handleAddNew}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Habit</span>
              </Button>
              <ModeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : tab === 'habits' ? (
          activeHabits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span className="text-5xl">🌱</span>
              <p className="text-muted-foreground text-sm">No habits yet. Add your first one!</p>
              <Button onClick={handleAddNew} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Habit
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeHabits.map(habit => (
                <HabitCard
                  key={habit.habitID}
                  habit={habit}
                  analysis={analyses.find(a => a.habitID === habit.habitID)}
                  loggedToday={loggedTodaySet.has(habit.habitID)}
                  onLog={handleOpenLog}
                  onEdit={handleOpenEdit}
                />
              ))}
            </div>
          )
        ) : (
          <AnalysisCharts analyses={analyses} habits={habits} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Habits Tracker — built with Next.js + FastAPI + AWS
      </footer>

      {/* Modals */}
      <HabitFormModal
        habit={editingHabit}
        isOpen={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSaveHabit}
        onDelete={handleDeleteHabit}
      />

      {logHabit && (
        <LogModal
          habit={logHabit}
          isOpen={logOpen}
          onOpenChange={setLogOpen}
          onLogged={handleLogged}
        />
      )}
    </div>
  );
}
