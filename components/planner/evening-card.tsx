'use client';

import { useState } from 'react';
import { usePlanner } from '@/lib/planner-context';
import type { DayData, CalendarEvent } from '@/lib/types';

function formatTime(ev: CalendarEvent): string | null {
  if (!ev.startTime) return null;
  const [h, m] = ev.startTime.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

interface EveningCardProps {
  dateKey: string;
  dayData: DayData;
}

export function EveningCard({ dateKey, dayData }: EveningCardProps) {
  const {
    addActivity,
    removeActivity,
    getCalendarEventsForDay,
    editMode,
  } = usePlanner();
  const [activityInput, setActivityInput] = useState('');

  const calendarEvents = getCalendarEventsForDay(dateKey);

  function handleAdd() {
    const text = activityInput.trim();
    if (!text) return;
    addActivity(dateKey, text);
    setActivityInput('');
  }

  const hasItems = dayData.eveningActivities.length > 0 || calendarEvents.length > 0;

  // Live mode: simplified read-only view
  if (!editMode) {
    return (
      <div className="rounded-lg border border-evening-200 bg-[var(--evening-light)] p-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--evening)]" />
          <span className="text-xs font-semibold text-evening-800">Evening</span>
        </div>
        {hasItems ? (
          <ul className="mt-1.5 space-y-0.5">
            {calendarEvents.map((ev) => (
              <li key={ev.id} className="text-[11px] text-evening-700 pl-3.5">
                &bull; {formatTime(ev) && <span className="font-medium">{formatTime(ev)} </span>}{ev.text}
              </li>
            ))}
            {dayData.eveningActivities.map((a) => (
              <li key={a.id} className="text-[11px] text-evening-700 pl-3.5">
                &bull; {a.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[10px] text-evening-300 mt-1.5 italic">Free evening</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-evening-200 bg-[var(--evening-light)] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--evening)]" />
        <span className="text-xs font-semibold text-evening-800">
          Activities
        </span>
      </div>

      <div className="flex gap-1">
        <input
          type="text"
          value={activityInput}
          onChange={(e) => setActivityInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add activity..."
          className="flex-1 text-xs px-2 py-1 rounded-md bg-white border border-evening-200 placeholder:text-evening-300 focus:outline-none focus:ring-1 focus:ring-evening-400 min-w-0"
        />
        <button
          onClick={handleAdd}
          className="text-xs px-2 py-1 rounded-md bg-white border border-evening-200 text-evening-600 hover:bg-evening-50 transition-colors shrink-0"
        >
          +
        </button>
      </div>

      {hasItems && (
        <ul className="mt-1.5 space-y-1">
          {calendarEvents.map((ev) => (
            <li
              key={ev.id}
              className="text-xs text-evening-800 bg-evening-200 rounded px-1.5 py-1 break-words"
            >
              {formatTime(ev) && <span className="font-medium">{formatTime(ev)} </span>}{ev.text}
            </li>
          ))}
          {dayData.eveningActivities.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-1 text-xs text-evening-800 bg-evening-100 rounded px-1.5 py-1"
            >
              <span className="flex-1 break-words">{a.text}</span>
              <button
                onClick={() => removeActivity(dateKey, a.id)}
                className="text-evening-300 hover:text-red-500 shrink-0 mt-0.5"
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

      {!hasItems && (
        <p className="text-[10px] text-evening-300 mt-1.5 italic">
          No activities planned
        </p>
      )}
    </div>
  );
}
