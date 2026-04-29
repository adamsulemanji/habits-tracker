'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { Habit } from '@/interfaces/Habit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface LogModalProps {
  habit: Habit;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLogged: () => void;
}

export default function LogModal({ habit, isOpen, onOpenChange, onLogged }: LogModalProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const apiURL = process.env.NEXT_PUBLIC_API_URL;

  const handleLog = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await axios.post(`${apiURL}/logs`, {
        habitID: habit.habitID,
        date: today,
        note,
      });
      toast({ title: 'Logged', description: `"${habit.name}" marked complete for today.` });
      onLogged();
      onOpenChange(false);
      setNote('');
    } catch {
      toast({ title: 'Error', description: 'Failed to log habit', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Log — {habit.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="log-note">Note (optional)</Label>
          <Textarea
            id="log-note"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="How did it go?"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleLog} disabled={saving}>{saving ? 'Logging…' : 'Mark Complete'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
