'use client';

import { useState } from 'react';
import { usePlanner } from '@/lib/planner-context';
import { DayCard } from '@/components/planner/day-card';
import { GroceryList } from '@/components/planner/grocery-list';
import { NotesForCara } from '@/components/planner/notes-for-cara';
import { WeekSummary } from '@/components/planner/week-summary';

const ZOOM_STEPS = [0.75, 0.85, 1, 1.15, 1.3, 1.5];
const DEFAULT_ZOOM_INDEX = 2; // 1x

export default function PlannerPage() {
  const { weekDates, viewMode } = usePlanner();
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const zoom = ZOOM_STEPS[zoomIndex];

  return (
    <div className="space-y-4 py-4" style={{ zoom }}>
      {/* Zoom controls */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 bg-white/90 backdrop-blur border border-gray-200 rounded-full shadow-lg px-1 py-1">
        <button
          type="button"
          onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
          disabled={zoomIndex === 0}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
        >
          −
        </button>
        <span className="text-[11px] font-medium text-gray-500 w-10 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
          disabled={zoomIndex === ZOOM_STEPS.length - 1}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
        >
          +
        </button>
      </div>
      {/* Day cards */}
      {viewMode === 'week' ? (
        <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory px-4 lg:grid lg:grid-cols-7 lg:gap-2 lg:px-3">
          {weekDates.map((date) => (
            <DayCard key={date.toISOString()} date={date} />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-2" style={{ scrollbarWidth: 'thin' }}>
          {weekDates.map((date) => (
            <div key={date.toISOString()} className="min-w-[calc(33.333%-0.5rem)] max-w-[calc(33.333%-0.5rem)] snap-start">
              <DayCard date={date} />
            </div>
          ))}
        </div>
      )}

      {/* Week Summary */}
      <div className="px-4 lg:px-3">
        <WeekSummary />
      </div>

      {/* Grocery List and Notes for Cara */}
      <div className="grid gap-4 md:grid-cols-2 px-4 lg:px-3">
        <GroceryList />
        <NotesForCara />
      </div>
    </div>
  );
}
