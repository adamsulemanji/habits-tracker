'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Habit, HabitAnalysis, HabitLog } from '@/interfaces/Habit';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/provider/Dark-LightModeToggle';
import HabitCard from '@/components/page/HabitCard';
import HabitRow from '@/components/page/HabitRow';
import HabitFormModal from '@/components/page/HabitFormModal';
import LogModal from '@/components/page/LogModal';
import DailyUpdateModal from '@/components/page/DailyUpdateModal';
import AnalysisCharts from '@/components/page/AnalysisCharts';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Plus, BarChart2, LayoutGrid, LayoutList, ClipboardList,
} from 'lucide-react';

type Tab = 'habits' | 'analysis';
type ViewMode = 'list' | 'grid';

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [analyses, setAnalyses] = useState<HabitAnalysis[]>([]);
  const [todayLogs, setTodayLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('habits');
  const [view, setView] = useState<ViewMode>('list');
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>(undefined);
  const [logHabit, setLogHabit] = useState<Habit | undefined>(undefined);
  const [logOpen, setLogOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const { toast } = useToast();
  const apiURL = process.env.NEXT_PUBLIC_API_URL;
  const today = new Date().toISOString().split('T')[0];

  // Persist view preference
  useEffect(() => {
    const saved = localStorage.getItem('habits-view') as ViewMode | null;
    if (saved === 'list' || saved === 'grid') setView(saved);
  }, []);

  const handleSetView = (v: ViewMode) => {
    setView(v);
    localStorage.setItem('habits-view', v);
  };

  const loggedTodaySet = useMemo(
    () => new Set(todayLogs.map(l => l.habitID)),
    [todayLogs]
  );

  const activeHabits = useMemo(() => habits.filter(h => h.isActive), [habits]);
  const completedToday = loggedTodaySet.size;
  const totalActive = activeHabits.length;
  const allDoneToday = totalActive > 0 && completedToday === totalActive;

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

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleOpenLog = (habit: Habit) => { setLogHabit(habit); setLogOpen(true); };
  const handleOpenEdit = (habit: Habit) => { setEditingHabit(habit); setFormOpen(true); };
  const handleAddNew = () => { setEditingHabit(undefined); setFormOpen(true); };

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-3">

            {/* Brand + nav */}
            <div className="flex items-center gap-4">
              <span className="font-semibold text-sm tracking-tight">Habits</span>
              <nav className="flex items-center gap-0.5">
                <button
                  onClick={() => setTab('habits')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    tab === 'habits'
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Habits
                </button>
                <button
                  onClick={() => setTab('analysis')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    tab === 'analysis'
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Analysis
                </button>
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs hidden sm:flex"
                onClick={() => setDailyOpen(true)}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Check In
              </Button>
              {/* Mobile check-in */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:hidden"
                onClick={() => setDailyOpen(true)}
              >
                <ClipboardList className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAddNew}>
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New</span>
              </Button>
              <ModeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">

        {isLoading ? (
          <div className="flex items-center justify-center py-32 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading</span>
          </div>

        ) : tab === 'analysis' ? (
          <AnalysisCharts analyses={analyses} habits={habits} />

        ) : activeHabits.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No habits yet</p>
              <p className="text-xs text-muted-foreground">Create your first habit to start tracking.</p>
            </div>
            <Button onClick={handleAddNew} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Habit
            </Button>
          </div>

        ) : (
          <div className="space-y-4">

            {/* ── Toolbar: stats + view toggle ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {totalActive > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Mini ring-style progress */}
                      <div className="relative w-5 h-5">
                        <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                          <circle
                            cx="10" cy="10" r="7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-muted"
                          />
                          <circle
                            cx="10" cy="10" r="7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray={`${2 * Math.PI * 7}`}
                            strokeDashoffset={`${2 * Math.PI * 7 * (1 - completedToday / totalActive)}`}
                            strokeLinecap="round"
                            className={allDoneToday ? 'text-green-500' : 'text-primary'}
                          />
                        </svg>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground tabular-nums">{completedToday}</span>
                        {' / '}{totalActive} today
                      </span>
                    </div>
                    {allDoneToday && (
                      <span className="text-xs text-green-600 dark:text-green-500 font-medium">All done!</span>
                    )}
                  </div>
                )}
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-md">
                <button
                  onClick={() => handleSetView('list')}
                  className={`p-1.5 rounded transition-colors ${
                    view === 'list'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="List view"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleSetView('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    view === 'grid'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* ── Habit list ── */}
            {view === 'list' ? (
              <div className="space-y-1">
                {activeHabits.map(habit => (
                  <HabitRow
                    key={habit.habitID}
                    habit={habit}
                    analysis={analyses.find(a => a.habitID === habit.habitID)}
                    loggedToday={loggedTodaySet.has(habit.habitID)}
                    onLog={handleOpenLog}
                    onEdit={handleOpenEdit}
                  />
                ))}
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
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-3 text-center text-xs text-muted-foreground">
        Habits Tracker
      </footer>

      {/* ── Modals ── */}
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
