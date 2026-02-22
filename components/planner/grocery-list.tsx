'use client';

import { useState } from 'react';
import { usePlanner } from '@/lib/planner-context';

function walmartSearchUrl(item: string): string {
  return `https://www.walmart.com/search?q=${encodeURIComponent(item)}`;
}

export function GroceryList() {
  const {
    groceryItems,
    addGroceryItem,
    removeGroceryItem,
    clearGroceryItems,
    buildGroceryFromDinners,
  } = usePlanner();
  const [input, setInput] = useState('');
  const [showAlreadyBuilt, setShowAlreadyBuilt] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  function handleAdd() {
    const name = input.trim();
    if (!name) return;
    addGroceryItem(name);
    setInput('');
  }

  function handleBuild() {
    const result = buildGroceryFromDinners();
    if (result === 'already_built') {
      setShowAlreadyBuilt(true);
    } else {
      setShowAlreadyBuilt(false);
    }
  }

  function handleClear() {
    clearGroceryItems();
    setShowClearConfirm(false);
    setShowAlreadyBuilt(false);
  }

  function handleAddToWalmart() {
    for (const item of groceryItems) {
      window.open(walmartSearchUrl(item.name), '_blank', 'noopener');
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-accent-600"
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
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700 font-medium">
              {groceryItems.length}
            </span>
          )}
          {groceryItems.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="Clear all items"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Clear confirmation */}
        {showClearConfirm && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            <p className="font-medium">Clear entire grocery list?</p>
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={handleClear}
                className="px-2 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-1 rounded bg-white border border-red-300 text-red-700 font-medium hover:bg-red-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add grocery item..."
            className="flex-1 text-sm px-3 py-2 rounded-lg bg-gray-50 border border-[var(--border)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
          />
          <button
            onClick={handleAdd}
            className="px-3 py-2 text-sm font-medium bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors shrink-0"
          >
            Add
          </button>
        </div>

        {/* Build from dinners button / already-built warning */}
        {showAlreadyBuilt ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-medium">Already built from these dinners</p>
            <p className="mt-0.5 text-amber-600">
              The dinner plan hasn&apos;t changed since the last build.
            </p>
            <button
              onClick={() => setShowAlreadyBuilt(false)}
              className="mt-1.5 text-amber-700 underline hover:text-amber-900 font-medium"
            >
              OK
            </button>
          </div>
        ) : (
          <button
            onClick={handleBuild}
            className="w-full text-xs py-2 rounded-lg border border-dashed border-accent-300 text-accent-600 hover:bg-accent-50 transition-colors font-medium"
          >
            + Build from selected dinners
          </button>
        )}

        {/* Items list */}
        {groceryItems.length > 0 ? (
          <ul className="space-y-1">
            {groceryItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2"
              >
                <a
                  href={walmartSearchUrl(item.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 shrink-0"
                  title="Search on Walmart"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
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

        {/* Add to Walmart button */}
        {groceryItems.length > 0 && (
          <button
            onClick={handleAddToWalmart}
            className="w-full text-xs py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            Open all in Walmart ({groceryItems.length} items)
          </button>
        )}
      </div>
    </div>
  );
}
