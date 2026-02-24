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

type Owner = 'C' | 'J' | 'CJ' | 'O' | undefined;

/** Cycle: unassigned → C → J → C+J → O → unassigned */
function nextOwner(current: string | undefined): Owner {
  switch (current) {
    case undefined: return 'C';
    case 'C': return 'J';
    case 'J': return 'CJ';
    case 'CJ': return 'O';
    case 'O': return undefined;
    default: return 'C';
  }
}

const OWNER_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  C:  { bg: 'bg-red-100',    border: 'border-red-300',    text: 'text-red-800',    badge: 'bg-red-500 text-white' },
  J:  { bg: 'bg-blue-100',   border: 'border-blue-300',   text: 'text-blue-800',   badge: 'bg-blue-500 text-white' },
  CJ: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', badge: 'bg-purple-500 text-white' },
  O:  { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', badge: 'bg-yellow-400 text-yellow-900' },
};

const OWNER_LABEL: Record<string, string> = {
  C: 'C',
  J: 'J',
  CJ: 'C+J',
  O: 'O',
};

export function EveningCard({ dateKey, dayData }: EveningCardProps) {
  const {
    addActivity,
    removeActivity,
    moveActivity,
    setActivityOwner,
    setCalendarEventOwner,
    hideCalendarEvent,
    getCalendarEventsForDay,
    editMode,
  } = usePlanner();
  const [activityInput, setActivityInput] = useState('');

  const calendarEvents = getCalendarEventsForDay(dateKey);
  const eventOwners = dayData.calendarEventOwners || {};

  function handleAdd() {
    const text = activityInput.trim();
    if (!text) return;
    addActivity(dateKey, text);
    setActivityInput('');
  }

  const hasItems = dayData.eveningActivities.length > 0 || calendarEvents.length > 0;

  function renderCalendarEvent(ev: CalendarEvent) {
    const owner = eventOwners[ev.id] as Owner;
    const style = owner ? OWNER_STYLES[owner] : null;
    return (
      <button
        key={ev.id}
        type="button"
        onClick={() => setCalendarEventOwner(dateKey, ev.id, nextOwner(owner))}
        className={`relative w-full text-left text-[11px] rounded px-2 py-1.5 select-none transition-colors active:scale-[0.98] ${
          style
            ? `${style.bg} border ${style.border} ${style.text}`
            : 'text-evening-700 bg-evening-100 border border-transparent hover:border-evening-300'
        }`}
      >
        {formatTime(ev) && <span className="font-medium">{formatTime(ev)} </span>}{ev.text}
        {owner && (
          <span className={`absolute -bottom-1 -right-1 text-[8px] font-bold leading-none px-1 py-0.5 rounded ${style!.badge}`}>
            {OWNER_LABEL[owner]}
          </span>
        )}
      </button>
    );
  }

  function renderActivity(a: { id: string; text: string; owner?: Owner }) {
    const style = a.owner ? OWNER_STYLES[a.owner] : null;
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => setActivityOwner(dateKey, a.id, nextOwner(a.owner))}
        className={`relative w-full text-left text-[11px] rounded px-2 py-1.5 select-none transition-colors active:scale-[0.98] ${
          style
            ? `${style.bg} border ${style.border} ${style.text}`
            : 'text-evening-700 bg-evening-100 border border-transparent hover:border-evening-300'
        }`}
      >
        {a.text}
        {a.owner && (
          <span className={`absolute -bottom-1 -right-1 text-[8px] font-bold leading-none px-1 py-0.5 rounded ${style!.badge}`}>
            {OWNER_LABEL[a.owner]}
          </span>
        )}
      </button>
    );
  }

  // Live mode: simplified read-only view
  if (!editMode) {
    return (
      <div className="rounded-lg border border-evening-200 bg-[var(--evening-light)] p-2.5 min-h-[14rem]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--evening)]" />
          <span className="text-xs font-semibold text-evening-800">Evening</span>
        </div>
        {hasItems ? (
          <div className="mt-1.5 space-y-1.5">
            {calendarEvents.map(renderCalendarEvent)}
            {dayData.eveningActivities.map(renderActivity)}
          </div>
        ) : (
          <p className="text-[10px] text-evening-300 mt-1.5 italic">Free evening</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-evening-200 bg-[var(--evening-light)] p-2.5 min-h-[14rem]">
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
        <div className="mt-1.5 space-y-1.5">
          {calendarEvents.map((ev) => {
            const owner = eventOwners[ev.id] as Owner;
            const style = owner ? OWNER_STYLES[owner] : null;
            return (
              <div
                key={ev.id}
                className={`relative flex items-center gap-1 text-xs rounded px-1.5 py-1 transition-colors ${
                  style
                    ? `${style.bg} border ${style.border} ${style.text}`
                    : 'text-evening-800 bg-evening-200 border border-transparent'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setCalendarEventOwner(dateKey, ev.id, nextOwner(owner))}
                  className="flex-1 text-left break-words select-none active:scale-[0.98] cursor-pointer"
                >
                  {formatTime(ev) && <span className="font-medium">{formatTime(ev)} </span>}{ev.text}
                </button>
                {owner && (
                  <span className={`text-[8px] font-bold leading-none px-1 py-0.5 rounded ${style!.badge}`}>
                    {OWNER_LABEL[owner]}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => hideCalendarEvent(dateKey, ev.id)}
                  className="text-evening-300 hover:text-red-500 shrink-0"
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
              </div>
            );
          })}
          {dayData.eveningActivities.map((a, idx) => {
            const style = a.owner ? OWNER_STYLES[a.owner] : null;
            const isFirst = idx === 0;
            const isLast = idx === dayData.eveningActivities.length - 1;
            return (
              <div
                key={a.id}
                className={`relative flex items-center gap-1 text-xs rounded px-1.5 py-1 transition-colors ${
                  style
                    ? `${style.bg} border ${style.border} ${style.text}`
                    : 'text-evening-800 bg-evening-100 border border-transparent'
                }`}
              >
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    onClick={() => moveActivity(dateKey, a.id, 'up')}
                    disabled={isFirst}
                    className="text-evening-400 hover:text-evening-700 disabled:opacity-20 disabled:cursor-default"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveActivity(dateKey, a.id, 'down')}
                    disabled={isLast}
                    className="text-evening-400 hover:text-evening-700 disabled:opacity-20 disabled:cursor-default"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setActivityOwner(dateKey, a.id, nextOwner(a.owner))}
                  className="flex-1 text-left break-words select-none active:scale-[0.98] cursor-pointer"
                >
                  {a.text}
                </button>
                {a.owner && (
                  <span className={`text-[8px] font-bold leading-none px-1 py-0.5 rounded ${style!.badge}`}>
                    {OWNER_LABEL[a.owner]}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeActivity(dateKey, a.id)}
                  className="text-evening-300 hover:text-red-500 shrink-0"
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
              </div>
            );
          })}
        </div>
      )}

      {!hasItems && (
        <p className="text-[10px] text-evening-300 mt-1.5 italic">
          No activities planned
        </p>
      )}
    </div>
  );
}
