'use client';

import { usePlanner } from '@/lib/planner-context';
import type { DayData } from '@/lib/types';

interface PickupCardProps {
  dateKey: string;
  dayData: DayData;
}

type PickUp = 'Carly' | 'Joey' | 'Other' | '';

const TOGGLE_OPTIONS: { value: Exclude<PickUp, ''>; label: string }[] = [
  { value: 'Carly', label: 'C' },
  { value: 'Joey', label: 'J' },
  { value: 'Other', label: 'O' },
];

const ACTIVE_STYLES: Record<string, string> = {
  Carly: 'bg-red-500 text-white border-red-500',
  Joey: 'bg-blue-500 text-white border-blue-500',
  Other: 'bg-yellow-400 text-yellow-900 border-yellow-400',
};

export function PickupCard({ dateKey, dayData }: PickupCardProps) {
  const { setPickUp, editMode } = usePlanner();
  const pickUp = (dayData.pickUp || '') as PickUp;

  function handleToggle(value: Exclude<PickUp, ''>) {
    // Tap the active one to clear it
    setPickUp(dateKey, pickUp === value ? '' : value);
  }

  function renderToggle() {
    return (
      <div className="flex rounded-md overflow-hidden border border-accent-300">
        {TOGGLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleToggle(opt.value)}
            className={`flex-1 text-[10px] font-bold py-1 transition-colors ${
              pickUp === opt.value
                ? ACTIVE_STYLES[opt.value]
                : 'bg-white text-accent-500 hover:bg-accent-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  // Live mode: compact display
  if (!editMode) {
    return (
      <div className="rounded-lg border border-accent-200 bg-[var(--accent-light)] p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span className="text-xs font-semibold text-accent-800">Pick-up</span>
        </div>
        {renderToggle()}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent-200 bg-[var(--accent-light)] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span className="text-xs font-semibold text-accent-800">Pick-up</span>
      </div>
      {renderToggle()}
    </div>
  );
}
