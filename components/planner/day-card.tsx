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
        today ? 'border-blue-400 ring-2 ring-blue-100' : 'border-[var(--border)]'
      }`}
    >
      {/* Day header */}
      <div
        className={`px-3 py-2 rounded-t-xl border-b ${
          today
            ? 'bg-blue-50 border-blue-200'
            : 'bg-gray-50 border-[var(--border)]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-bold ${
              today ? 'text-blue-700' : 'text-gray-900'
            }`}
          >
            {getDayName(date)}
          </span>
          <span
            className={`text-xs ${today ? 'text-blue-600' : 'text-gray-500'}`}
          >
            {formatShortDate(date)}
          </span>
        </div>
        {today && (
          <span className="text-[10px] font-medium text-blue-500">Today</span>
        )}
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
