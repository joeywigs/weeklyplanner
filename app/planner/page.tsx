'use client';

import { usePlanner } from '@/lib/planner-context';
import { DayCard } from '@/components/planner/day-card';
import { GroceryList } from '@/components/planner/grocery-list';
import { NotesForCara } from '@/components/planner/notes-for-cara';
import { WeekSummary } from '@/components/planner/week-summary';

export default function PlannerPage() {
  const { weekDates } = usePlanner();

  return (
    <div className="space-y-4 py-4 planner-scale">
      {/* Day cards — horizontal scroll on mobile, grid on large screens */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory px-4 lg:grid lg:grid-cols-7 lg:gap-2 lg:px-3">
        {weekDates.map((date) => (
          <DayCard key={date.toISOString()} date={date} />
        ))}
      </div>

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
