'use client';

import { useState, useEffect } from 'react';
import { getBirthdays, saveBirthdays } from '@/lib/birthday-store';
import type { Birthday } from '@/lib/types';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function BirthdaySettings() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [name, setName] = useState('');
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);

  useEffect(() => {
    setBirthdays(getBirthdays());
  }, []);

  function persist(updated: Birthday[]) {
    // Sort by month, then day
    const sorted = [...updated].sort((a, b) => a.month - b.month || a.day - b.day);
    setBirthdays(sorted);
    saveBirthdays(sorted);
  }

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist([
      ...birthdays,
      { id: crypto.randomUUID(), name: trimmed, month, day },
    ]);
    setName('');
  }

  function handleRemove(id: string) {
    persist(birthdays.filter((b) => b.id !== id));
  }

  function formatDate(b: Birthday): string {
    return `${MONTHS[b.month - 1]} ${b.day}`;
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <h2 className="text-sm font-bold text-gray-900 mb-1">
        Important Birthdays
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        Keep track of birthdays for family and friends.
      </p>

      {/* Add form */}
      <div className="flex gap-1.5 mb-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Name"
          className="flex-1 text-xs px-2 py-1.5 rounded-md bg-white border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-400 min-w-0"
        />
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="text-xs py-1.5 px-2 rounded-md bg-white border border-gray-200 text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent-400 appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '22px' }}
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="text-xs py-1.5 px-2 rounded-md bg-white border border-gray-200 text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent-400 appearance-none cursor-pointer w-14"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '22px' }}
        >
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="text-xs px-3 py-1.5 rounded-md bg-accent-500 text-white font-medium hover:bg-accent-600 transition-colors shrink-0"
        >
          Add
        </button>
      </div>

      {/* List */}
      {birthdays.length === 0 ? (
        <p className="text-xs text-gray-400 italic text-center py-4">
          No birthdays added yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {birthdays.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2"
            >
              <span className="text-gray-900 font-medium flex-1">{b.name}</span>
              <span className="text-gray-500">{formatDate(b)}</span>
              <button
                onClick={() => handleRemove(b.id)}
                className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
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
  );
}
