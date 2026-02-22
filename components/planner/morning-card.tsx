'use client';

import { useState } from 'react';
import { usePlanner } from '@/lib/planner-context';
import type { DayData } from '@/lib/types';

interface MorningCardProps {
  dateKey: string;
  dayData: DayData;
  isWeekend: boolean;
}

type DropOff = 'Carly' | 'Joey' | 'Other';

const CYCLE: DropOff[] = ['Carly', 'Joey', 'Other'];

const LABEL: Record<DropOff, string> = {
  Carly: 'C',
  Joey: 'J',
  Other: 'O',
};

const TEXT_STYLE: Record<DropOff, string> = {
  Carly: 'text-red-500',
  Joey: 'text-blue-500',
  Other: 'text-yellow-500',
};

export function MorningCard({ dateKey, dayData, isWeekend }: MorningCardProps) {
  const { setDropOff, addReminder, removeReminder, editMode } = usePlanner();
  const [reminderInput, setReminderInput] = useState('');
  const dropOff = dayData.dropOff as DropOff;

  function handleAddReminder() {
    const text = reminderInput.trim();
    if (!text) return;
    addReminder(dateKey, text);
    setReminderInput('');
  }

  function cycleDropOff() {
    const idx = CYCLE.indexOf(dropOff);
    const next = CYCLE[(idx + 1) % CYCLE.length]!;
    setDropOff(dateKey, next);
  }

  function renderDropOff() {
    if (isWeekend) return null;
    return (
      <button
        type="button"
        onClick={cycleDropOff}
        className={`text-[11px] font-semibold select-none active:scale-[0.96] transition-transform ${TEXT_STYLE[dropOff]}`}
      >
        Drop Off: {LABEL[dropOff]}
      </button>
    );
  }

  // Live mode: simplified read-only view
  if (!editMode) {
    return (
      <div className="rounded-lg border border-morning-200 bg-[var(--morning-light)] p-2.5 min-h-[8.5rem]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--morning)]" />
          <span className="text-xs font-semibold text-morning-800">Morning</span>
        </div>
        {renderDropOff()}
        {dayData.morningReminders.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {dayData.morningReminders.map((r) => (
              <li key={r.id} className="text-[11px] text-morning-700 pl-3.5">
                &bull; {r.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-morning-200 bg-[var(--morning-light)] p-2.5 min-h-[8.5rem]">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--morning)]" />
        <span className="text-xs font-semibold text-morning-800">Morning</span>
      </div>

      {/* Drop-off toggle */}
      {!isWeekend && (
        <div className="mb-2">
          {renderDropOff()}
        </div>
      )}

      {/* Reminders */}
      <div>
        <label className="text-[10px] text-morning-700 font-medium uppercase tracking-wider">
          Reminders
        </label>
        <div className="flex gap-1 mt-1">
          <input
            type="text"
            value={reminderInput}
            onChange={(e) => setReminderInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddReminder()}
            placeholder="Add reminder..."
            className="flex-1 text-xs px-2 py-1 rounded-md bg-white border border-morning-200 placeholder:text-morning-300 focus:outline-none focus:ring-1 focus:ring-morning-400 min-w-0"
          />
          <button
            onClick={handleAddReminder}
            className="text-xs px-2 py-1 rounded-md bg-white border border-morning-200 text-morning-600 hover:bg-morning-50 transition-colors shrink-0"
          >
            +
          </button>
        </div>
        {dayData.morningReminders.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {dayData.morningReminders.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-1 text-xs text-morning-800 bg-white rounded px-1.5 py-1"
              >
                <span className="flex-1 break-words">{r.text}</span>
                <button
                  onClick={() => removeReminder(dateKey, r.id)}
                  className="text-morning-300 hover:text-red-500 shrink-0 mt-0.5"
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
      </div>
    </div>
  );
}
