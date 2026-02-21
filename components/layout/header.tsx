'use client';

import { usePlanner } from '@/lib/planner-context';
import { formatWeekRange } from '@/lib/date-utils';

const BUILD_DATE = '2026-02-21';

export function Header() {
  const { weekDates, goToPrevWeek, goToNextWeek, goToCurrentWeek, weekOffset } =
    usePlanner();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--border)]">
      <div className="px-4 py-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-bold text-[var(--foreground)]">
            Weekly Family Planner
          </h1>
          <span className="text-[10px] text-gray-400">v{BUILD_DATE}</span>
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
                className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
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
