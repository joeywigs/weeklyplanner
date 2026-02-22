'use client';

import { usePlanner } from '@/lib/planner-context';
import type { DayData } from '@/lib/types';

interface PickupCardProps {
  dateKey: string;
  dayData: DayData;
  isWeekend: boolean;
}

type PickUp = 'Carly' | 'Joey' | 'Other' | '';

const CYCLE: Exclude<PickUp, ''>[] = ['Carly', 'Joey', 'Other'];

const LABEL: Record<string, string> = {
  Carly: 'C',
  Joey: 'J',
  Other: 'O',
};

const STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  Carly: { bg: 'bg-red-100',    border: 'border-red-300',    text: 'text-red-800',    badge: 'bg-red-500 text-white' },
  Joey:  { bg: 'bg-blue-100',   border: 'border-blue-300',   text: 'text-blue-800',   badge: 'bg-blue-500 text-white' },
  Other: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', badge: 'bg-yellow-400 text-yellow-900' },
};

export function PickupCard({ dateKey, dayData, isWeekend }: PickupCardProps) {
  const { setPickUp, editMode } = usePlanner();
  const pickUp = (dayData.pickUp || '') as PickUp;

  function cyclePickUp() {
    if (!pickUp) {
      setPickUp(dateKey, 'Carly');
    } else {
      const idx = CYCLE.indexOf(pickUp as Exclude<PickUp, ''>);
      const nextIdx = idx + 1;
      if (nextIdx >= CYCLE.length) {
        setPickUp(dateKey, '');
      } else {
        setPickUp(dateKey, CYCLE[nextIdx]!);
      }
    }
  }

  if (isWeekend) return null;

  const style = pickUp ? STYLES[pickUp] : null;

  const pickUpButton = (
    <button
      type="button"
      onClick={cyclePickUp}
      className={`relative w-full text-left text-[11px] rounded px-2 py-1.5 select-none transition-colors active:scale-[0.98] ${
        style
          ? `${style.bg} border ${style.border} ${style.text}`
          : 'text-accent-600 bg-accent-50 border border-accent-200 hover:border-accent-300'
      }`}
    >
      Pick Up
      {pickUp && style && (
        <span className={`absolute -bottom-1 -right-1 text-[8px] font-bold leading-none px-1 py-0.5 rounded ${style.badge}`}>
          {LABEL[pickUp]}
        </span>
      )}
    </button>
  );

  // Live mode: compact display
  if (!editMode) {
    return (
      <div className="rounded-lg border border-accent-200 bg-[var(--accent-light)] p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span className="text-xs font-semibold text-accent-800">Pick-up</span>
        </div>
        {pickUpButton}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent-200 bg-[var(--accent-light)] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span className="text-xs font-semibold text-accent-800">Pick-up</span>
      </div>
      {pickUpButton}
    </div>
  );
}
