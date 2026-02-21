'use client';

import { useState } from 'react';
import { usePlanner } from '@/lib/planner-context';

export function GroceryList() {
  const { groceryItems, addGroceryItem, removeGroceryItem, buildGroceryFromDinners } =
    usePlanner();
  const [input, setInput] = useState('');

  function handleAdd() {
    const name = input.trim();
    if (!name) return;
    addGroceryItem(name);
    setInput('');
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
            />
          </svg>
          <h2 className="text-sm font-bold text-gray-900">Grocery List</h2>
          {groceryItems.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              {groceryItems.length}
            </span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Input row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add grocery item..."
            className="flex-1 text-sm px-3 py-2 rounded-lg bg-gray-50 border border-[var(--border)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
          <button
            onClick={handleAdd}
            className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
            Add
          </button>
        </div>

        {/* Build from dinners button */}
        <button
          onClick={buildGroceryFromDinners}
          className="w-full text-xs py-2 rounded-lg border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors font-medium"
        >
          + Build from selected dinners
        </button>

        {/* Items list */}
        {groceryItems.length > 0 ? (
          <ul className="space-y-1">
            {groceryItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="flex-1">{item.name}</span>
                <button
                  onClick={() => removeGroceryItem(item.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M3 3l6 6M9 3l-6 6"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400 text-center py-2 italic">
            No items yet
          </p>
        )}
      </div>
    </div>
  );
}
