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
            <MenuRow label="Entree" value={menu.entree} />
            <MenuRow label="Grill" value={menu.grill} />
            <MenuRow label="Express" value={menu.express} />
            <MenuRow label="Vegetable" value={menu.vegetable} />
            <MenuRow label="Fruit" value={menu.fruit} />
          </div>

          {/* Lunch choice per child */}
          <div className="space-y-1.5">
            <ChildLunchChoice
              name="Grey"
              value={dayData.greyLunch}
              onChange={(choice) => setLunchChoice(dateKey, 'grey', choice)}
            />
            <ChildLunchChoice
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

function MenuRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5 text-[10px]">
      <span className="text-lunch-600 font-medium w-14 shrink-0">{label}:</span>
      <span className="text-lunch-800">{value}</span>
    </div>
  );
}

function ChildLunchChoice({
  name,
  value,
  onChange,
}: {
  name: string;
  value: 'pack' | 'school' | null;
  onChange: (choice: 'pack' | 'school' | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold text-lunch-800 w-12">{name}</span>
      <label className="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={value === 'pack'}
          onChange={() => onChange(value === 'pack' ? null : 'pack')}
          className="w-3 h-3 rounded accent-lunch-600"
        />
        <span className="text-[10px] text-lunch-700">Pack</span>
      </label>
      <label className="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={value === 'school'}
          onChange={() => onChange(value === 'school' ? null : 'school')}
          className="w-3 h-3 rounded accent-lunch-600"
        />
        <span className="text-[10px] text-lunch-700">School</span>
      </label>
    </div>
  );
}
