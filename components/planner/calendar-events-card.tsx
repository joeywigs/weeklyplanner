'use client';

import { useState } from 'react';
import { usePlanner } from '@/lib/planner-context';

interface CalendarEventsCardProps {
  dateKey: string;
}

export function CalendarEventsCard({ dateKey }: CalendarEventsCardProps) {
  const { getCalendarEventsForDay, addCalendarEvent, removeCalendarEvent } =
    usePlanner();
  const [eventInput, setEventInput] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);

  const events = getCalendarEventsForDay(dateKey);

  function handleAdd() {
    const text = eventInput.trim();
    if (!text) return;
    addCalendarEvent(text, isAllDay, dateKey);
    setEventInput('');
    setIsAllDay(false);
  }

  return (
    <div className="rounded-lg border border-calendar-200 bg-[var(--calendar-light)] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--calendar)]" />
        <span className="text-xs font-semibold text-calendar-800">
          Calendar
        </span>
      </div>

      <div className="flex gap-1">
        <input
          type="text"
          value={eventInput}
          onChange={(e) => setEventInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add event..."
          className="flex-1 text-xs px-2 py-1 rounded-md bg-white border border-calendar-200 placeholder:text-calendar-300 focus:outline-none focus:ring-1 focus:ring-calendar-400 min-w-0"
        />
        <button
          onClick={handleAdd}
          className="text-xs px-2 py-1 rounded-md bg-white border border-calendar-200 text-calendar-600 hover:bg-calendar-50 transition-colors shrink-0"
        >
          +
        </button>
      </div>

      <label className="flex items-center gap-1.5 mt-1.5">
        <input
          type="checkbox"
          checked={isAllDay}
          onChange={(e) => setIsAllDay(e.target.checked)}
          className="w-3 h-3 rounded border-calendar-300 text-calendar-500 focus:ring-calendar-400"
        />
        <span className="text-[10px] text-calendar-600">All week</span>
      </label>

      {events.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-start gap-1 text-xs text-calendar-800 bg-calendar-200 rounded px-1.5 py-1"
            >
              <span className="flex-1 break-words">
                {ev.text}
                {ev.isAllDay && (
                  <span className="ml-1 text-[10px] text-calendar-500 font-medium">
                    (all week)
                  </span>
                )}
              </span>
              <button
                onClick={() => removeCalendarEvent(ev.id)}
                className="text-calendar-400 hover:text-red-500 shrink-0 mt-0.5"
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

      {events.length === 0 && (
        <p className="text-[10px] text-calendar-300 mt-1.5 italic">
          No calendar events
        </p>
      )}
    </div>
  );
}
