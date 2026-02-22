'use client';

import { usePlanner } from '@/lib/planner-context';
import type { DayData } from '@/lib/types';

interface NotesCardProps {
  dateKey: string;
  dayData: DayData;
}

export function NotesCard({ dateKey, dayData }: NotesCardProps) {
  const { setNotes, editMode } = usePlanner();
  const notes = dayData.notes || '';

  // Live mode: read-only
  if (!editMode) {
    if (!notes) return null;
    return (
      <div className="rounded-lg border border-notes-200 bg-[var(--notes-light)] p-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--notes)]" />
          <span className="text-xs font-semibold text-notes-800">Notes</span>
        </div>
        <p className="text-[11px] text-notes-700 mt-1.5 pl-3.5 whitespace-pre-wrap">{notes}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-notes-200 bg-[var(--notes-light)] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--notes)]" />
        <span className="text-xs font-semibold text-notes-800">Notes</span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(dateKey, e.target.value)}
        placeholder="Add a note..."
        rows={2}
        className="w-full text-xs px-2 py-1.5 rounded-md bg-white border border-notes-200 placeholder:text-notes-300 focus:outline-none focus:ring-1 focus:ring-notes-400 resize-none"
      />
    </div>
  );
}
