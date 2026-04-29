'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Habit, Schedule, CATEGORIES, HABIT_COLORS } from '@/interfaces/Habit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Minus, Plus } from 'lucide-react';

interface HabitFormModalProps {
  habit?: Habit;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (habit: Habit) => void;
  onDelete?: (habitID: string) => void;
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const PRESETS = [
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Weekdays', days: [0, 1, 2, 3, 4] },
  { label: 'Weekends', days: [5, 6] },
];

const defaultSchedule: Schedule = { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], weekInterval: 1 };

const defaultForm = {
  name: '',
  description: '',
  category: 'other',
  targetCount: 1,
  color: '#3b82f6',
  icon: '',
  isActive: true,
  schedule: defaultSchedule,
};

type FormState = typeof defaultForm;

function matchesPreset(days: number[], preset: number[]): boolean {
  const a = [...days].sort((x, y) => x - y);
  const b = [...preset].sort((x, y) => x - y);
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function HabitFormModal({ habit, isOpen, onOpenChange, onSave, onDelete }: HabitFormModalProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const apiURL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (habit) {
      setForm({
        name: habit.name,
        description: habit.description,
        category: habit.category,
        targetCount: habit.targetCount,
        color: habit.color,
        icon: habit.icon,
        isActive: habit.isActive,
        schedule: habit.schedule ?? defaultSchedule,
      });
    } else {
      setForm(defaultForm);
    }
  }, [habit, isOpen]);

  const setSchedule = (patch: Partial<Schedule>) =>
    setForm(f => ({ ...f, schedule: { ...f.schedule, ...patch } }));

  const toggleDay = (day: number) => {
    const days = form.schedule.daysOfWeek;
    if (days.includes(day)) {
      if (days.length === 1) return; // keep at least one day
      setSchedule({ daysOfWeek: days.filter(d => d !== day) });
    } else {
      setSchedule({ daysOfWeek: [...days, day].sort((a, b) => a - b) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      frequency: 'daily',
      schedule: {
        daysOfWeek: form.schedule.daysOfWeek,
        weekInterval: form.schedule.weekInterval,
        ...(form.schedule.endDate ? { endDate: form.schedule.endDate } : {}),
      },
    };
    try {
      let saved: Habit;
      if (habit) {
        const res = await axios.put(`${apiURL}/habits/${habit.habitID}`, payload);
        saved = res.data.item;
      } else {
        const res = await axios.post(`${apiURL}/habits`, payload);
        saved = res.data.item;
      }
      onSave(saved);
      toast({ title: habit ? 'Habit updated' : 'Habit created', description: `"${form.name}" saved.` });
      onOpenChange(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to save habit', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!habit || !onDelete) return;
    try {
      await axios.delete(`${apiURL}/habits/${habit.habitID}`);
      onDelete(habit.habitID);
      toast({ title: 'Deleted', description: `"${habit.name}" deleted.`, variant: 'destructive' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to delete habit', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{habit ? 'Edit Habit' : 'New Habit'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Morning run"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <Label>Schedule</Label>

            {/* Quick presets */}
            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map(preset => {
                const active = matchesPreset(form.schedule.daysOfWeek, preset.days);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setSchedule({ daysOfWeek: preset.days })}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Day toggles */}
            <div className="flex gap-1">
              {DAY_LABELS.map((label, i) => {
                const on = form.schedule.daysOfWeek.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`flex-1 h-8 text-xs font-medium rounded transition-colors ${
                      on ? 'text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                    style={on ? { backgroundColor: form.color } : {}}
                    onClick={() => toggleDay(i)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Week interval */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex-shrink-0">Repeat every</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="w-6 h-6 rounded border flex items-center justify-center hover:bg-muted transition-colors"
                  onClick={() => setSchedule({ weekInterval: Math.max(1, form.schedule.weekInterval - 1) })}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-xs font-medium w-5 text-center tabular-nums">
                  {form.schedule.weekInterval}
                </span>
                <button
                  type="button"
                  className="w-6 h-6 rounded border flex items-center justify-center hover:bg-muted transition-colors"
                  onClick={() => setSchedule({ weekInterval: Math.min(12, form.schedule.weekInterval + 1) })}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                {form.schedule.weekInterval === 1 ? 'week' : 'weeks'}
              </span>
            </div>

            {/* End date */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex-shrink-0">Until</span>
              <Input
                type="date"
                className="h-8 text-xs"
                value={form.schedule.endDate ?? ''}
                onChange={e =>
                  setSchedule({ endDate: e.target.value || undefined })
                }
              />
              {form.schedule.endDate && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  onClick={() => setSchedule({ endDate: undefined })}
                >
                  clear
                </button>
              )}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {HABIT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    form.color === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            {habit && onDelete && (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
