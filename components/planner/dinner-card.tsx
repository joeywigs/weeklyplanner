'use client';

import { useState, useRef, useEffect } from 'react';
import { usePlanner } from '@/lib/planner-context';
import { SAMPLE_RECIPES } from '@/lib/sample-data';
import type { DayData } from '@/lib/types';

interface DinnerCardProps {
  dateKey: string;
  dayData: DayData;
}

export function DinnerCard({ dateKey, dayData }: DinnerCardProps) {
  const { setDinner } = usePlanner();
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = searchText.trim()
    ? SAMPLE_RECIPES.filter((r) =>
        r.toLowerCase().includes(searchText.toLowerCase())
      )
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
  }

  return (
    <div className="rounded-lg border border-dinner-200 bg-[var(--dinner-light)] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--dinner)]" />
        <span className="text-xs font-semibold text-dinner-800">Dinner</span>
      </div>

      {dayData.dinner ? (
        <div className="flex items-center gap-1.5 bg-white rounded-md px-2 py-1.5 border border-dinner-200">
          <span className="flex-1 text-xs text-dinner-800 font-medium">
            {dayData.dinner}
          </span>
          <button
            onClick={clearDinner}
            className="text-dinner-300 hover:text-dinner-600 shrink-0"
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
