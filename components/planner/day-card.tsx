'use client';

import { usePlanner } from '@/lib/planner-context';
import { formatDateKey, getDayName, formatShortDate, isToday } from '@/lib/date-utils';
import { MorningCard } from './morning-card';
import { LunchCard } from './lunch-card';
import { EveningCard } from './evening-card';
import { DinnerCard } from './dinner-card';

interface DayCardProps {
  date: Date;
}

export function DayCard({ date }: DayCardProps) {
  const { getDayData } = usePlanner();
  const dateKey = formatDateKey(date);
  const dayData = getDayData(dateKey, date);
  const today = isToday(date);

  return (
    <div
      className={`flex-shrink-0 w-[280px] lg:w-auto rounded-xl border bg-white shadow-sm snap-start ${
        today ? 'border-accent-400 ring-2 ring-accent-100' : 'border-[var(--border)]'
      }`}
    >
      {/* Day header */}
      <div
        className={`px-3 py-2 rounded-t-xl border-b ${
          today
            ? 'bg-accent-50 border-accent-200'
            : 'bg-gray-50 border-[var(--border)]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-bold ${
              today ? 'text-accent-700' : 'text-gray-900'
            }`}
          >
            {getDayName(date)}
          </span>
          <span
            className={`text-xs ${today ? 'text-accent-600' : 'text-gray-500'}`}
          >
            {formatShortDate(date)}
          </span>
        </div>
      </div>

      {/* Sub-cards */}
      <div className="p-2 space-y-2">
        <MorningCard dateKey={dateKey} dayData={dayData} />
        <LunchCard dateKey={dateKey} dayData={dayData} dayOfWeek={date.getDay()} />
        <EveningCard dateKey={dateKey} dayData={dayData} />
        <DinnerCard dateKey={dateKey} dayData={dayData} />
      </div>
    </div>
  );
}
