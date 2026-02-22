'use client';

import { useState, useRef, useEffect } from 'react';
import { usePlanner } from '@/lib/planner-context';
import { getRecipes } from '@/lib/recipe-store';
import type { DayData } from '@/lib/types';

interface DinnerCardProps {
  dateKey: string;
  dayData: DayData;
}

type Cook = 'Carly' | 'Joey' | 'Other' | '';

/** Cycle: unassigned → Carly → Joey → Other → unassigned */
function nextCook(current: Cook): Cook {
  switch (current) {
    case '': return 'Carly';
    case 'Carly': return 'Joey';
    case 'Joey': return 'Other';
    case 'Other': return '';
  }
}

const COOK_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  Carly: { bg: 'bg-red-100',    border: 'border-red-300',    text: 'text-red-800',    badge: 'bg-red-500 text-white' },
  Joey:  { bg: 'bg-blue-100',   border: 'border-blue-300',   text: 'text-blue-800',   badge: 'bg-blue-500 text-white' },
  Other: { bg: 'bg-yellow-100',  border: 'border-yellow-300',  text: 'text-yellow-800',  badge: 'bg-yellow-400 text-yellow-900' },
};

export function DinnerCard({ dateKey, dayData }: DinnerCardProps) {
  const { setDinner, setCook, swapDinner, editMode } = usePlanner();
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userRecipes = getRecipes();
  const filtered = searchText.trim()
    ? userRecipes
        .filter((r) =>
          r.name.toLowerCase().includes(searchText.toLowerCase())
        )
        .map((r) => r.name)
    : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsSearching(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectRecipe(name: string) {
    setDinner(dateKey, name);
    setSearchText('');
    setIsSearching(false);
  }

  function clearDinner() {
    setDinner(dateKey, '');
    setCook(dateKey, '');
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', dateKey);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const fromDateKey = e.dataTransfer.getData('text/plain');
    if (fromDateKey && fromDateKey !== dateKey) {
      swapDinner(fromDateKey, dateKey);
    }
  }

  const cook = dayData.cook as Cook;
  const cookStyle = cook ? COOK_STYLES[cook] : null;

  // Live mode: simplified read-only view
  if (!editMode) {
    return (
      <div className="rounded-lg border border-dinner-200 bg-[var(--dinner-light)] p-2.5 min-h-[6.5rem]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--dinner)]" />
          <span className="text-xs font-semibold text-dinner-800">Dinner</span>
        </div>
        {dayData.dinner ? (
          <button
            type="button"
            onClick={() => setCook(dateKey, nextCook(cook))}
            className={`relative w-full text-left text-[11px] font-medium rounded px-2 py-1.5 mt-1.5 select-none transition-colors active:scale-[0.98] ${
              cookStyle
                ? `${cookStyle.bg} border ${cookStyle.border} ${cookStyle.text}`
                : 'text-dinner-800 bg-dinner-100 border border-transparent hover:border-dinner-300'
            }`}
          >
            {dayData.dinner}
            {cook && (
              <span className={`absolute -bottom-1 -right-1 text-[8px] font-bold leading-none px-1 py-0.5 rounded ${cookStyle!.badge}`}>
                {cook === 'Carly' ? 'C' : cook === 'Joey' ? 'J' : 'O'}
              </span>
            )}
          </button>
        ) : (
          <p className="text-[10px] text-dinner-300 mt-1.5 italic">No dinner planned</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border bg-[var(--dinner-light)] p-2.5 overflow-visible transition-colors min-h-[6.5rem] ${
        isDragOver
          ? 'border-dinner-400 bg-dinner-100'
          : 'border-dinner-200'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--dinner)]" />
        <span className="text-xs font-semibold text-dinner-800">Dinner</span>
      </div>

      {dayData.dinner ? (
        <div
          draggable
          onDragStart={handleDragStart}
          className={`relative flex items-center gap-1.5 rounded-md px-2 py-1.5 border cursor-grab active:cursor-grabbing transition-colors ${
            cookStyle
              ? `${cookStyle.bg} ${cookStyle.border} ${cookStyle.text}`
              : 'bg-white border-dinner-200'
          }`}
        >
          <svg
            className={`w-3 h-3 shrink-0 ${cookStyle ? cookStyle.text : 'text-dinner-300'}`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <circle cx="4" cy="3" r="1" />
            <circle cx="8" cy="3" r="1" />
            <circle cx="4" cy="6" r="1" />
            <circle cx="8" cy="6" r="1" />
            <circle cx="4" cy="9" r="1" />
            <circle cx="8" cy="9" r="1" />
          </svg>
          <button
            type="button"
            onClick={() => setCook(dateKey, nextCook(cook))}
            className="flex-1 text-left text-xs font-medium break-words select-none active:scale-[0.98] cursor-pointer"
          >
            {dayData.dinner}
          </button>
          {cook && (
            <span className={`text-[8px] font-bold leading-none px-1 py-0.5 rounded ${cookStyle!.badge}`}>
              {cook === 'Carly' ? 'C' : cook === 'Joey' ? 'J' : 'O'}
            </span>
          )}
          <button
            onClick={clearDinner}
            className={`shrink-0 ${cookStyle ? `${cookStyle.text} hover:opacity-70` : 'text-dinner-300 hover:text-dinner-600'}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 3l6 6M9 3l-6 6"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <input
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setIsSearching(true);
            }}
            onFocus={() => setIsSearching(true)}
            placeholder="Search recipes..."
            className="w-full text-xs px-2 py-1.5 rounded-md bg-white border border-dinner-200 placeholder:text-dinner-300 focus:outline-none focus:ring-1 focus:ring-dinner-400"
          />
          {isSearching && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-dinner-200 rounded-md shadow-lg z-10 max-h-32 overflow-y-auto">
              {filtered.map((recipe) => (
                <button
                  key={recipe}
                  onClick={() => selectRecipe(recipe)}
                  className="w-full text-left text-xs px-2 py-1.5 text-dinner-800 hover:bg-dinner-50 transition-colors"
                >
                  {recipe}
                </button>
              ))}
            </div>
          )}
          {isSearching && searchText.trim() && filtered.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-dinner-200 rounded-md shadow-lg z-10 p-2">
              <button
                onClick={() => selectRecipe(searchText.trim())}
                className="w-full text-left text-xs text-dinner-600"
              >
                Add &quot;{searchText.trim()}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
