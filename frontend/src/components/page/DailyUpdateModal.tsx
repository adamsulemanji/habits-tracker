'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Habit, HabitLog, isScheduledToday } from '@/interfaces/Habit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2 } from 'lucide-react';

interface DailyUpdateModalProps {
  habits: Habit[];
  todayLogs: HabitLog[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface HabitEntry {
  habit: Habit;
  checked: boolean;
  alreadyLogged: boolean;
  note: string;
}

export default function DailyUpdateModal({
  habits,
  todayLogs,
  isOpen,
  onOpenChange,
  onSaved,
}: DailyUpdateModalProps) {
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const { toast } = useToast();
  const apiURL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (isOpen) {
      const loggedIDs = new Set(todayLogs.map(l => l.habitID));
      setEntries(
        habits
          .filter(h => h.isActive && isScheduledToday(h))
          .map(habit => ({
            habit,
            checked: loggedIDs.has(habit.habitID),
            alreadyLogged: loggedIDs.has(habit.habitID),
            note: '',
          }))
      );
      setExpandedNote(null);
    }
  }, [isOpen, habits, todayLogs]);

  const toggle = (habitID: string) => {
    setEntries(prev =>
      prev.map(e =>
        e.habit.habitID === habitID && !e.alreadyLogged
          ? { ...e, checked: !e.checked }
          : e
      )
    );
  };

  const setNote = (habitID: string, note: string) => {
    setEntries(prev =>
      prev.map(e => (e.habit.habitID === habitID ? { ...e, note } : e))
    );
  };

  const handleSave = async () => {
    const today = new Date().toISOString().split('T')[0];
    const toLog = entries.filter(e => e.checked && !e.alreadyLogged);

    if (toLog.length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        toLog.map(e =>
          axios.post(`${apiURL}/logs`, {
            habitID: e.habit.habitID,
            date: today,
            note: e.note,
          })
        )
      );
      toast({
        title: 'Saved',
        description: `${toLog.length} habit${toLog.length === 1 ? '' : 's'} logged for today.`,
      });
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to save some logs', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const newlyChecked = entries.filter(e => e.checked && !e.alreadyLogged).length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            Daily Check-in — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-1 py-1">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No habits scheduled for today.</p>
          ) : (
            entries.map(entry => (
              <div key={entry.habit.habitID} className="rounded-lg border bg-card">
                <button
                  type="button"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors rounded-lg ${
                    entry.checked ? 'bg-muted/40' : ''
                  } ${entry.alreadyLogged ? 'cursor-default' : 'hover:bg-muted/30 cursor-pointer'}`}
                  onClick={() => toggle(entry.habit.habitID)}
                  disabled={entry.alreadyLogged}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${
                      entry.checked
                        ? 'border-transparent'
                        : 'border-muted-foreground/30'
                    }`}
                    style={entry.checked ? { backgroundColor: entry.habit.color } : {}}
                  >
                    {entry.checked && <Check className="h-3 w-3 text-white" />}
                  </div>

                  {/* Habit info */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${entry.checked ? '' : 'text-foreground/80'}`}>
                      {entry.habit.name}
                    </span>
                    {entry.alreadyLogged && (
                      <span className="ml-2 text-xs text-muted-foreground">already logged</span>
                    )}
                  </div>

                  {/* Color dot */}
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.habit.color }}
                  />
                </button>

                {/* Note field — shown when checked and not already logged */}
                {entry.checked && !entry.alreadyLogged && (
                  <div className="px-3 pb-2.5">
                    {expandedNote === entry.habit.habitID ? (
                      <Textarea
                        autoFocus
                        value={entry.note}
                        onChange={e => setNote(entry.habit.habitID, e.target.value)}
                        placeholder="Add a note... (optional)"
                        rows={2}
                        className="text-xs resize-none"
                        onBlur={() => !entry.note && setExpandedNote(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setExpandedNote(entry.habit.habitID)}
                      >
                        {entry.note ? `"${entry.note}"` : '+ add note'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || newlyChecked === 0} className="flex-1 sm:flex-none">
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving…
              </>
            ) : newlyChecked > 0 ? (
              `Log ${newlyChecked} habit${newlyChecked === 1 ? '' : 's'}`
            ) : (
              'Nothing new to log'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
