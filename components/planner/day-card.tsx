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
  const { getDayData, weekDates, getWeatherForDay } = usePlanner();
  const dateKey = formatDateKey(date);
  const dayData = getDayData(dateKey, date);
  const today = isToday(date);
  const weather = getWeatherForDay(dateKey);

  return (
    <div
      className={`flex-shrink-0 w-[280px] lg:w-auto rounded-xl border bg-white shadow-sm snap-start overflow-visible ${
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
          <div className="flex items-center gap-1.5">
            {weather && (
              <span className="text-xs" title={`${weather.high}°/${weather.low}°`}>
                {weather.icon} <span className={`text-[10px] ${today ? 'text-accent-500' : 'text-gray-400'}`}>{weather.high}°</span>
              </span>
            )}
            <span
              className={`text-xs ${today ? 'text-accent-600' : 'text-gray-500'}`}
            >
              {formatShortDate(date)}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-cards */}
      <div className="p-2 space-y-2">
        <MorningCard dateKey={dateKey} dayData={dayData} />
        <LunchCard dateKey={dateKey} dayData={dayData} dayOfWeek={date.getDay()} />
        <EveningCard dateKey={dateKey} dayData={dayData} weekDates={weekDates} />
        <DinnerCard dateKey={dateKey} dayData={dayData} />
      </div>
    </div>
  );
}
