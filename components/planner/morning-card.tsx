'use client';

import { useState } from 'react';
import { usePlanner } from '@/lib/planner-context';
import type { DayData } from '@/lib/types';

interface MorningCardProps {
  dateKey: string;
  dayData: DayData;
}

export function MorningCard({ dateKey, dayData }: MorningCardProps) {
  const { setDropOff, addReminder, removeReminder } = usePlanner();
  const [reminderInput, setReminderInput] = useState('');

  function handleAddReminder() {
    const text = reminderInput.trim();
    if (!text) return;
    addReminder(dateKey, text);
    setReminderInput('');
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-[var(--morning-light)] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--morning)]" />
        <span className="text-xs font-semibold text-amber-800">Morning</span>
      </div>

      {/* Drop-off */}
      <div className="mb-2">
        <label className="text-[10px] text-amber-700 font-medium uppercase tracking-wider">
          Drop-off
        </label>
        <div className="flex gap-1 mt-1">
          <button
            onClick={() => setDropOff(dateKey, 'Carly')}
            className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${
              dayData.dropOff === 'Carly'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
            }`}
          >
            Carly
          </button>
          <button
            onClick={() => setDropOff(dateKey, 'Joey')}
            className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${
              dayData.dropOff === 'Joey'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
            }`}
          >
            Joey
          </button>
        </div>
      </div>

      {/* Reminders */}
      <div>
        <label className="text-[10px] text-amber-700 font-medium uppercase tracking-wider">
          Reminders
        </label>
        <div className="flex gap-1 mt-1">
          <input
            type="text"
            value={reminderInput}
            onChange={(e) => setReminderInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddReminder()}
            placeholder="Add reminder..."
            className="flex-1 text-xs px-2 py-1 rounded-md bg-white border border-amber-200 placeholder:text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400 min-w-0"
          />
          <button
            onClick={handleAddReminder}
            className="text-xs px-2 py-1 rounded-md bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors shrink-0"
          >
            +
          </button>
        </div>
        {dayData.morningReminders.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {dayData.morningReminders.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-1 text-xs text-amber-800 bg-white rounded px-1.5 py-1"
              >
                <span className="flex-1 break-words">{r.text}</span>
                <button
                  onClick={() => removeReminder(dateKey, r.id)}
                  className="text-amber-400 hover:text-red-500 shrink-0 mt-0.5"
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
