'use client';

import { useState } from 'react';
import { usePlanner } from '@/lib/planner-context';
import type { DayData } from '@/lib/types';

interface MorningCardProps {
  dateKey: string;
  dayData: DayData;
}

type DropOff = 'Carly' | 'Joey' | 'Other';

const TOGGLE_OPTIONS: { value: DropOff; label: string }[] = [
  { value: 'Carly', label: 'C' },
  { value: 'Joey', label: 'J' },
  { value: 'Other', label: 'O' },
];

const ACTIVE_STYLES: Record<DropOff, string> = {
  Carly: 'bg-red-500 text-white border-red-500',
  Joey: 'bg-blue-500 text-white border-blue-500',
  Other: 'bg-yellow-400 text-yellow-900 border-yellow-400',
};

export function MorningCard({ dateKey, dayData }: MorningCardProps) {
  const { setDropOff, addReminder, removeReminder, editMode } = usePlanner();
  const [reminderInput, setReminderInput] = useState('');
  const dropOff = dayData.dropOff as DropOff;

  function handleAddReminder() {
    const text = reminderInput.trim();
    if (!text) return;
    addReminder(dateKey, text);
    setReminderInput('');
  }

  function renderToggle() {
    return (
      <div className="flex rounded-md overflow-hidden border border-morning-300">
        {TOGGLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDropOff(dateKey, opt.value)}
            className={`flex-1 text-[10px] font-bold py-1 transition-colors ${
              dropOff === opt.value
                ? ACTIVE_STYLES[opt.value]
                : 'bg-white text-morning-500 hover:bg-morning-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
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
        {renderToggle()}
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
      <div className="mb-2">
        <label className="text-[10px] text-morning-700 font-medium uppercase tracking-wider">
          Drop-off
        </label>
        <div className="mt-1">
          {renderToggle()}
        </div>
      </div>

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
