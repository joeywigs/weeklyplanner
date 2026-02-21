'use client';

import { useState } from 'react';
import { usePlanner } from '@/lib/planner-context';
import { formatDateKey, getShortDayName } from '@/lib/date-utils';
import type { DayData } from '@/lib/types';

interface EveningCardProps {
  dateKey: string;
  dayData: DayData;
  weekDates: Date[];
}

export function EveningCard({ dateKey, dayData, weekDates }: EveningCardProps) {
  const {
    addActivity,
    removeActivity,
    getCalendarEventsForDay,
    addCalendarEvent,
    removeCalendarEvent,
  } = usePlanner();
  const [activityInput, setActivityInput] = useState('');
  const [throughDate, setThroughDate] = useState('');

  const calendarEvents = getCalendarEventsForDay(dateKey);

  // Only show days after the current day for the "through" dropdown
  const laterDates = weekDates.filter((d) => formatDateKey(d) > dateKey);

  function handleAdd() {
    const text = activityInput.trim();
    if (!text) return;
    if (throughDate) {
      addCalendarEvent(text, dateKey, throughDate);
    } else {
      addActivity(dateKey, text);
    }
    setActivityInput('');
    setThroughDate('');
  }

  const hasItems = dayData.eveningActivities.length > 0 || calendarEvents.length > 0;

  return (
    <div className="rounded-lg border border-evening-200 bg-[var(--evening-light)] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--evening)]" />
        <span className="text-xs font-semibold text-evening-800">
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
          className="flex-1 text-xs px-2 py-1 rounded-md bg-white border border-evening-200 placeholder:text-evening-300 focus:outline-none focus:ring-1 focus:ring-evening-400 min-w-0"
        />
        <button
          onClick={handleAdd}
          className="text-xs px-2 py-1 rounded-md bg-white border border-evening-200 text-evening-600 hover:bg-evening-50 transition-colors shrink-0"
        >
          +
        </button>
      </div>

      {laterDates.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[10px] text-evening-500">through</span>
          <select
            value={throughDate}
            onChange={(e) => setThroughDate(e.target.value)}
            className="text-[10px] px-1 py-0.5 rounded border border-evening-200 bg-white text-evening-700 focus:outline-none focus:ring-1 focus:ring-evening-400"
          >
            <option value="">this day only</option>
            {laterDates.map((d) => {
              const key = formatDateKey(d);
              return (
                <option key={key} value={key}>
                  {getShortDayName(d)}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {hasItems && (
        <ul className="mt-1.5 space-y-1">
          {calendarEvents.map((ev) => (
            <li
              key={ev.id}
              className="flex items-start gap-1 text-xs text-evening-800 bg-evening-200 rounded px-1.5 py-1"
            >
              <span className="flex-1 break-words">{ev.text}</span>
              <button
                onClick={() => removeCalendarEvent(ev.id)}
                className="text-evening-400 hover:text-red-500 shrink-0 mt-0.5"
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
