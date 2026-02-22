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

const TEXT_STYLE: Record<string, string> = {
  Carly: 'text-red-500',
  Joey: 'text-blue-500',
  Other: 'text-yellow-500',
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

  const pickUpDisplay = pickUp ? (
    <button
      type="button"
      onClick={cyclePickUp}
      className={`text-[11px] font-semibold select-none active:scale-[0.96] transition-transform ${TEXT_STYLE[pickUp]}`}
    >
      Pick Up: {LABEL[pickUp]}
    </button>
  ) : (
    <button
      type="button"
      onClick={cyclePickUp}
      className="text-[11px] font-semibold select-none active:scale-[0.96] transition-transform text-accent-400"
    >
      Pick Up
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
        {pickUpDisplay}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent-200 bg-[var(--accent-light)] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span className="text-xs font-semibold text-accent-800">Pick-up</span>
      </div>
      {pickUpDisplay}
    </div>
  );
}
