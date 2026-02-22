'use client';

import { usePlanner } from '@/lib/planner-context';
import type { DayData, CalendarEvent } from '@/lib/types';

interface LunchCardProps {
  dateKey: string;
  dayData: DayData;
  dayOfWeek: number; // 0=Sun, 6=Sat
  calendarEvents?: CalendarEvent[];
}

function hasNoSchoolEvent(events: CalendarEvent[] | undefined): boolean {
  if (!events) return false;
  return events.some((e) => /no\s*school/i.test(e.text));
}

export function LunchCard({ dateKey, dayData, dayOfWeek, calendarEvents }: LunchCardProps) {
  const { setLunchChoice, toggleSchool, getSchoolMenu, editMode } = usePlanner();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const noSchoolFromCalendar = isWeekday && hasNoSchoolEvent(calendarEvents);
  const effectiveHasSchool = dayData.hasSchool && !noSchoolFromCalendar;
  const menu = effectiveHasSchool ? getSchoolMenu(dateKey) : null;

  // Weekend: show simple lunch card
  if (!isWeekday) {
    return (
      <div className="rounded-lg border border-lunch-200 bg-[var(--lunch-light)] p-2.5 min-h-[14rem]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--lunch)]" />
          <span className="text-xs font-semibold text-lunch-800">Lunch</span>
        </div>
        <p className="text-[10px] text-lunch-600 mt-1.5 italic">Weekend — no school lunch</p>
      </div>
    );
  }

  // Calendar says "No School" — show just that, nothing else
  if (noSchoolFromCalendar) {
    return (
      <div className="rounded-lg border border-lunch-200 bg-[var(--lunch-light)] p-2.5 min-h-[14rem]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--lunch)]" />
          <span className="text-xs font-semibold text-lunch-800">Lunch</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-200 text-gray-600">
            No School
          </span>
        </div>
        <p className="text-[10px] text-lunch-600 mt-1.5 italic">No school today</p>
      </div>
    );
  }

  // Live mode: simplified read-only view
  if (!editMode) {
    const greyLabel = dayData.greyLunch === 'pack' ? 'Pack' : dayData.greyLunch === 'school' ? 'School' : '—';
    const sloaneLabel = dayData.sloaneLunch === 'pack' ? 'Pack' : dayData.sloaneLunch === 'school' ? 'School' : '—';
    return (
      <div className="rounded-lg border border-lunch-200 bg-[var(--lunch-light)] p-2.5 min-h-[14rem]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--lunch)]" />
          <span className="text-xs font-semibold text-lunch-800">Lunch</span>
          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            dayData.hasSchool ? 'bg-lunch-200 text-lunch-800' : 'bg-gray-200 text-gray-600'
          }`}>
            {dayData.hasSchool ? 'School' : 'No School'}
          </span>
        </div>
        {dayData.hasSchool && menu && (
          <div className="mt-1.5 space-y-0.5">
            <div className="text-[10px] text-lunch-600">{menu.entree.join(', ')}</div>
            <div className="text-[10px] text-lunch-600">{menu.grill.join(', ')}</div>
            <div className="text-[10px] text-lunch-600">{menu.express.join(', ')}</div>
            <div className="text-[10px] text-lunch-500">{menu.vegetable.join(', ')}</div>
            <div className="text-[10px] text-lunch-500">{menu.fruit.join(', ')}</div>
            <div className="flex gap-3 mt-1 text-[10px] text-lunch-700">
              <span>Grey: {greyLabel}</span>
              <span>Sloane: {sloaneLabel}</span>
            </div>
          </div>
        )}
        {dayData.hasSchool && !menu && (
          <p className="text-[10px] text-lunch-400 mt-1.5 italic">Menu not available</p>
        )}
        {!dayData.hasSchool && (
          <p className="text-[10px] text-lunch-600 mt-1.5 italic">No school today</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-lunch-200 bg-[var(--lunch-light)] p-2.5 min-h-[14rem]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--lunch)]" />
          <span className="text-xs font-semibold text-lunch-800">Lunch</span>
        </div>
        <button
          onClick={() => toggleSchool(dateKey)}
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
            effectiveHasSchool
              ? 'bg-lunch-200 text-lunch-800'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {effectiveHasSchool ? 'School' : 'No School'}
        </button>
      </div>

      {effectiveHasSchool && menu ? (
        <>
          {/* School menu */}
          <div className="mb-2 space-y-0.5">
            {menu.entree.length > 0 && (
              <div className="text-[10px] text-lunch-600">
                <span className="font-medium text-lunch-700">Entree:</span> {menu.entree.join(', ')}
              </div>
            )}
            {menu.grill.length > 0 && (
              <div className="text-[10px] text-lunch-600">
                <span className="font-medium text-lunch-700">Grill:</span> {menu.grill.join(', ')}
              </div>
            )}
            {menu.express.length > 0 && (
              <div className="text-[10px] text-lunch-600">
                <span className="font-medium text-lunch-700">Express:</span> {menu.express.join(', ')}
              </div>
            )}
            {menu.vegetable.length > 0 && (
              <div className="text-[10px] text-lunch-500">
                <span className="font-medium text-lunch-600">Veg:</span> {menu.vegetable.join(', ')}
              </div>
            )}
            {menu.fruit.length > 0 && (
              <div className="text-[10px] text-lunch-500">
                <span className="font-medium text-lunch-600">Fruit:</span> {menu.fruit.join(', ')}
              </div>
            )}
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
      ) : effectiveHasSchool ? (
        <p className="text-[10px] text-lunch-400 italic">
          Menu not available
        </p>
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
