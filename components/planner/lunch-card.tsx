'use client';

import { usePlanner } from '@/lib/planner-context';
import { SAMPLE_SCHOOL_LUNCH } from '@/lib/sample-data';
import type { DayData } from '@/lib/types';

interface LunchCardProps {
  dateKey: string;
  dayData: DayData;
  dayOfWeek: number; // 0=Sun, 6=Sat
}

export function LunchCard({ dateKey, dayData, dayOfWeek }: LunchCardProps) {
  const { setLunchChoice, toggleSchool } = usePlanner();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const menu = isWeekday ? SAMPLE_SCHOOL_LUNCH[dayOfWeek] : undefined;

  // Weekend: show simple lunch card
  if (!isWeekday) {
    return (
      <div className="rounded-lg border border-lunch-200 bg-[var(--lunch-light)] p-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--lunch)]" />
          <span className="text-xs font-semibold text-lunch-800">Lunch</span>
        </div>
        <p className="text-[10px] text-lunch-600 mt-1.5 italic">Weekend — no school lunch</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-lunch-200 bg-[var(--lunch-light)] p-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--lunch)]" />
          <span className="text-xs font-semibold text-lunch-800">Lunch</span>
        </div>
        <button
          onClick={() => toggleSchool(dateKey)}
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
            dayData.hasSchool
              ? 'bg-lunch-200 text-lunch-800'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {dayData.hasSchool ? 'School' : 'No School'}
        </button>
      </div>

      {dayData.hasSchool && menu ? (
        <>
          {/* School menu */}
          <div className="mb-2 space-y-0.5">
            <div className="text-[11px] font-semibold text-lunch-800">
              {menu.entree}
            </div>
            <div className="flex flex-wrap gap-x-2 text-[10px] text-lunch-600">
              <span>{menu.grill}</span>
              <span className="text-lunch-300">·</span>
              <span>{menu.express}</span>
            </div>
            <div className="flex flex-wrap gap-x-2 text-[10px] text-lunch-500">
              <span>{menu.vegetable}</span>
              <span className="text-lunch-300">·</span>
              <span>{menu.fruit}</span>
            </div>
          </div>

          {/* Lunch choice per child — toggle pills */}
          <div className="space-y-1.5">
            <ChildLunchPill
              name="Grey"
              value={dayData.greyLunch}
              onChange={(choice) => setLunchChoice(dateKey, 'grey', choice)}
            />
            <ChildLunchPill
              name="Sloane"
              value={dayData.sloaneLunch}
              onChange={(choice) => setLunchChoice(dateKey, 'sloane', choice)}
            />
          </div>
        </>
      ) : (
        <p className="text-[10px] text-lunch-600 italic">
          No school today
        </p>
      )}
    </div>
  );
}

function ChildLunchPill({
  name,
  value,
  onChange,
}: {
  name: string;
  value: 'pack' | 'school' | null;
  onChange: (choice: 'pack' | 'school' | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-lunch-800 w-11 shrink-0">
        {name}
      </span>
      <div className="flex rounded-full bg-white border border-lunch-200 overflow-hidden">
        <button
          onClick={() => onChange(value === 'pack' ? null : 'pack')}
          className={`text-[10px] px-2.5 py-0.5 font-medium transition-colors ${
            value === 'pack'
              ? 'bg-lunch-400 text-white'
              : 'text-lunch-600 hover:bg-lunch-50'
          }`}
        >
          Pack
        </button>
        <button
          onClick={() => onChange(value === 'school' ? null : 'school')}
          className={`text-[10px] px-2.5 py-0.5 font-medium transition-colors ${
            value === 'school'
              ? 'bg-lunch-400 text-white'
              : 'text-lunch-600 hover:bg-lunch-50'
          }`}
        >
          School
        </button>
      </div>
    </div>
  );
}
