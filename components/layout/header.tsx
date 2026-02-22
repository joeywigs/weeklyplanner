'use client';

import { usePlanner } from '@/lib/planner-context';
import { formatWeekRange } from '@/lib/date-utils';

function formatSavedTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function Header() {
  const { weekDates, goToPrevWeek, goToNextWeek, goToCurrentWeek, weekOffset, editMode, toggleEditMode, lastSaved } =
    usePlanner();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--border)]">
      <div className="px-4 py-3">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">
              Weekly Family Planner
            </h1>
            {lastSaved && (
              <p className="text-[10px] text-gray-400">
                Last saved {formatSavedTime(lastSaved)}
              </p>
            )}
          </div>
          <button
            onClick={toggleEditMode}
            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors ${
              editMode
                ? 'bg-accent-100 text-accent-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {editMode ? 'Edit' : 'Live'}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2">
          <button
            onClick={goToPrevWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Previous week"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              {formatWeekRange(weekDates)}
            </span>
            {weekOffset !== 0 && (
              <button
                onClick={goToCurrentWeek}
                className="text-xs px-2 py-0.5 rounded-full bg-accent-50 text-accent-600 hover:bg-accent-100 transition-colors"
              >
                Today
              </button>
            )}
          </div>

          <button
            onClick={goToNextWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Next week"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
