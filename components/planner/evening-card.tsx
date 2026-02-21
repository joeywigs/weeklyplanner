'use client';

import { useState } from 'react';
import { usePlanner } from '@/lib/planner-context';
import type { DayData } from '@/lib/types';

interface EveningCardProps {
  dateKey: string;
  dayData: DayData;
}

export function EveningCard({ dateKey, dayData }: EveningCardProps) {
  const { addActivity, removeActivity } = usePlanner();
  const [activityInput, setActivityInput] = useState('');

  function handleAdd() {
    const text = activityInput.trim();
    if (!text) return;
    addActivity(dateKey, text);
    setActivityInput('');
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-[var(--evening-light)] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--evening)]" />
        <span className="text-xs font-semibold text-violet-800">
          Evening Activities
        </span>
      </div>

      <div className="flex gap-1">
        <input
          type="text"
          value={activityInput}
          onChange={(e) => setActivityInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add activity..."
          className="flex-1 text-xs px-2 py-1 rounded-md bg-white border border-violet-200 placeholder:text-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400 min-w-0"
        />
        <button
          onClick={handleAdd}
          className="text-xs px-2 py-1 rounded-md bg-white border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors shrink-0"
        >
          +
        </button>
      </div>

      {dayData.eveningActivities.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {dayData.eveningActivities.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-1 text-xs text-violet-800 bg-white rounded px-1.5 py-1"
            >
              <span className="flex-1 break-words">{a.text}</span>
              <button
                onClick={() => removeActivity(dateKey, a.id)}
                className="text-violet-400 hover:text-red-500 shrink-0 mt-0.5"
              >
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 3l6 6M9 3l-6 6"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {dayData.eveningActivities.length === 0 && (
        <p className="text-[10px] text-violet-400 mt-1.5 italic">
          No activities planned
        </p>
      )}
    </div>
  );
}
