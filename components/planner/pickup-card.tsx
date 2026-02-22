'use client';

import { usePlanner } from '@/lib/planner-context';
import type { DayData } from '@/lib/types';

interface PickupCardProps {
  dateKey: string;
  dayData: DayData;
}

const PERSON_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  Carly: { bg: 'bg-red-100',  border: 'border-red-300',  text: 'text-red-800' },
  Joey:  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
};

export function PickupCard({ dateKey, dayData }: PickupCardProps) {
  const { setPickUp, editMode } = usePlanner();
  const pickUp = dayData.pickUp || '';

  function cyclePickUp() {
    if (!pickUp) setPickUp(dateKey, 'Carly');
    else if (pickUp === 'Carly') setPickUp(dateKey, 'Joey');
    else setPickUp(dateKey, '');
  }

  // Live mode: compact tappable display
  if (!editMode) {
    const style = pickUp ? PERSON_STYLES[pickUp] : null;
    return (
      <div className="rounded-lg border border-accent-200 bg-[var(--accent-light)] p-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span className="text-xs font-semibold text-accent-800">Pick-up</span>
          <button
            type="button"
            onClick={cyclePickUp}
            className={`ml-auto text-[10px] font-medium rounded px-2 py-0.5 select-none transition-colors active:scale-[0.98] ${
              style
                ? `${style.bg} border ${style.border} ${style.text}`
                : 'text-accent-500 bg-accent-100 border border-accent-200 hover:border-accent-300'
            }`}
          >
            {pickUp || '—'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent-200 bg-[var(--accent-light)] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span className="text-xs font-semibold text-accent-800">Pick-up</span>
      </div>
      <select
        value={pickUp}
        onChange={(e) => setPickUp(dateKey, e.target.value as 'Carly' | 'Joey' | '')}
        className="w-full text-xs py-1.5 px-2 rounded-md font-medium bg-white border border-accent-300 text-accent-800 focus:outline-none focus:ring-1 focus:ring-accent-400 appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%232e526f' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
      >
        <option value="">—</option>
        <option value="Carly">Carly</option>
        <option value="Joey">Joey</option>
      </select>
    </div>
  );
}
