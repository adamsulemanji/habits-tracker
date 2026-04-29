'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Habit, CATEGORIES, FREQUENCIES, HABIT_COLORS } from '@/interfaces/Habit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

interface HabitFormModalProps {
  habit?: Habit;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (habit: Habit) => void;
  onDelete?: (habitID: string) => void;
}

const defaultForm = {
  name: '',
  description: '',
  category: 'other',
  frequency: 'daily',
  targetCount: 1,
  color: '#3b82f6',
  icon: '⭐',
  isActive: true,
};

export default function HabitFormModal({ habit, isOpen, onOpenChange, onSave, onDelete }: HabitFormModalProps) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const apiURL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (habit) {
      setForm({
        name: habit.name,
        description: habit.description,
        category: habit.category,
        frequency: habit.frequency,
        targetCount: habit.targetCount,
        color: habit.color,
        icon: habit.icon,
        isActive: habit.isActive,
      });
    } else {
      setForm(defaultForm);
    }
  }, [habit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let saved: Habit;
      if (habit) {
        const res = await axios.put(`${apiURL}/habits/${habit.habitID}`, form);
        saved = res.data.item;
      } else {
        const res = await axios.post(`${apiURL}/habits`, form);
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(fr => (
                    <SelectItem key={fr.value} value={fr.value}>{fr.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {HABIT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
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
