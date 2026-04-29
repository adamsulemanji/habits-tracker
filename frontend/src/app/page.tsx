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
import DailyUpdateModal from '@/components/page/DailyUpdateModal';
import { Loader2, Plus, BarChart2, LayoutGrid, ClipboardList } from 'lucide-react';

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
  const [dailyOpen, setDailyOpen] = useState(false);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleLogged = () => fetchAll();

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
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-semibold text-base tracking-tight">Habits</span>
              {!isLoading && totalActive > 0 && (
                <span className="hidden sm:block text-xs text-muted-foreground">
                  {completedToday} / {totalActive} today
                </span>
              )}
            </div>

            <nav className="flex items-center gap-1">
              <Button
                variant={tab === 'habits' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setTab('habits')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Habits</span>
              </Button>
              <Button
                variant={tab === 'analysis' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setTab('analysis')}
              >
                <BarChart2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Analysis</span>
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setDailyOpen(true)}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Check In</span>
              </Button>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAddNew}>
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New</span>
              </Button>
              <ModeToggle />
            </nav>
          </div>
        </div>

        {/* Mobile progress bar */}
        {!isLoading && totalActive > 0 && (
          <div className="sm:hidden px-4 pb-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{completedToday} of {totalActive} completed today</span>
              <span>{Math.round(completedToday / totalActive * 100)}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(completedToday / totalActive) * 100}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading</span>
          </div>
        ) : tab === 'habits' ? (
          activeHabits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">No habits yet</p>
                <p className="text-muted-foreground text-sm mt-0.5">Create your first habit to start tracking.</p>
              </div>
              <Button onClick={handleAddNew} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> New Habit
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
      <footer className="border-t py-3 text-center text-xs text-muted-foreground">
        Habits Tracker
      </footer>

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

      <DailyUpdateModal
        habits={activeHabits}
        todayLogs={todayLogs}
        isOpen={dailyOpen}
        onOpenChange={setDailyOpen}
        onSaved={handleLogged}
      />
    </div>
  );
}
