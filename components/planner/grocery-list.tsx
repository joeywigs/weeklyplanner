'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { usePlanner } from '@/lib/planner-context';
import { parseIngredient } from '@/lib/ingredient-scale';
import type { GroceryItem } from '@/lib/types';

/** Strip leading quantities, units, and trailing size/count info so the
 *  Walmart search focuses on just the product name. */
function itemSearchName(item: string): string {
  // 1. Strip leading quantity (e.g. "2 1/2", "½")
  const parsed = parseIngredient(item);
  let name = parsed.rest;

  // 2. Strip leading measurement units
  const UNITS_RE =
    /^(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|cans?|jars?|bottles?|packages?|packets?|bunche?s?|bags?|cloves?|heads?|stalks?|sprigs?|pinch|dash|handful|pieces?|slices?)\b\s*/i;
  name = name.replace(UNITS_RE, '');

  // 3. Strip trailing package-size info (e.g. "16 oz Bag", "12 Count", "1 lb Tray")
  name = name.replace(/\s+\d[\d.]*\s*(oz|fl\s*oz|lb|lbs|count|ct|pack|pk|g|kg|ml|l|gal)\b.*$/i, '');

  return name.trim() || item;
}

function walmartSearchUrl(item: string): string {
  return `https://www.walmart.com/search?q=${encodeURIComponent(itemSearchName(item))}`;
}

const POPUP_NAME = 'walmart_shopping';

/* ------------------------------------------------------------------ */
/*  Walmart shopping panel with a companion popup window               */
/* ------------------------------------------------------------------ */
function WalmartShoppingPanel({
  items,
  onToggleChecked,
  onClose,
}: {
  items: GroceryItem[];
  onToggleChecked: (id: string) => void;
  onClose: () => void;
}) {
  const checkedSet = useMemo(
    () => new Set(items.filter((i) => i.checked).map((i) => i.id)),
    [items],
  );

  // Start on the first unchecked item
  const firstUnchecked = useMemo(
    () => {
      const idx = items.findIndex((i) => !i.checked);
      return idx >= 0 ? idx : 0;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [currentIndex, setCurrentIndex] = useState(firstUnchecked);
  const popupRef = useRef<Window | null>(null);

  const total = items.length;
  const done = checkedSet.size;
  const current = items[currentIndex];

  // Close the popup when this component unmounts
  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  /** Open or navigate the single Walmart popup window */
  const openInPopup = useCallback((url: string) => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.location.href = url;
      popupRef.current.focus();
    } else {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const popupW = Math.round(w * 0.55);
      const popupH = h;
      const left = w - popupW;
      popupRef.current = window.open(
        url,
        POPUP_NAME,
        `width=${popupW},height=${popupH},left=${left},top=0,menubar=no,toolbar=no,location=yes,status=no`,
      );
    }
  }, []);

  const goToItem = useCallback(
    (idx: number) => {
      setCurrentIndex(idx);
    },
    [],
  );

  const handleFind = useCallback(() => {
    if (current) openInPopup(walmartSearchUrl(current.name));
  }, [current, openInPopup]);

  const handleMarkAdded = useCallback(() => {
    if (!current) return;
    if (!checkedSet.has(current.id)) {
      onToggleChecked(current.id);
    }
    // advance to next item and auto-search
    if (currentIndex < total - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      openInPopup(walmartSearchUrl(items[nextIdx].name));
    }
  }, [current, checkedSet, currentIndex, total, items, onToggleChecked, openInPopup]);

  const handleClose = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    onClose();
  }, [onClose]);

  return (
    <div className="rounded-xl border border-blue-200 bg-white shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-blue-100 bg-blue-50 rounded-t-xl flex items-center justify-between">
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
          <h2 className="text-sm font-bold text-blue-900">Walmart Shopping</h2>
        </div>
        <button
          onClick={handleClose}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium"
        >
          Exit
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>
              {done} of {total} added
            </span>
            <span>{Math.round((done / total) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        </div>

        {done === total ? (
          /* All done */
          <div className="text-center py-4 space-y-2">
            <p className="text-sm font-medium text-green-700">
              All items added!
            </p>
            <button
              onClick={handleClose}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Back to grocery list
            </button>
          </div>
        ) : (
          <>
            {/* Current item spotlight */}
            {current && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                <p className="text-xs text-blue-500 font-medium">
                  Item {currentIndex + 1} of {total}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {current.name}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleFind}
                    className="flex-1 text-center text-xs py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                  >
                    Find on Walmart
                  </button>
                  <button
                    onClick={handleMarkAdded}
                    className={`flex-1 text-center text-xs py-2 rounded-lg font-medium transition-colors ${
                      checkedSet.has(current.id)
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {checkedSet.has(current.id) ? 'Added' : 'Mark added'}
                  </button>
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => goToItem(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                    className="text-[10px] text-blue-500 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed font-medium"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => {
                      if (!checkedSet.has(current.id)) onToggleChecked(current.id);
                      if (currentIndex < total - 1) goToItem(currentIndex + 1);
                    }}
                    className="text-[10px] text-blue-500 hover:text-blue-700 font-medium"
                  >
                    {currentIndex < total - 1 ? 'Skip' : 'Finish'}
                  </button>
                </div>
              </div>
            )}

            {/* Checklist of all items */}
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {items.map((item, idx) => (
                <li
                  key={item.id}
                  className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
                    idx === currentIndex
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => goToItem(idx)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleChecked(item.id);
                    }}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      checkedSet.has(item.id)
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {checkedSet.has(item.id) && (
                      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6l2.5 2.5 4.5-5"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`flex-1 ${
                      checkedSet.has(item.id)
                        ? 'line-through text-gray-400'
                        : 'text-gray-700'
                    }`}
                  >
                    {item.name}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main grocery list card                                             */
/* ------------------------------------------------------------------ */
export function GroceryList() {
  const {
    groceryItems,
    addGroceryItem,
    removeGroceryItem,
    toggleGroceryItemChecked,
    clearGroceryItems,
    buildGroceryFromDinners,
  } = usePlanner();
  const [input, setInput] = useState('');
  const [showAlreadyBuilt, setShowAlreadyBuilt] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [walmartMode, setWalmartMode] = useState(false);

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

  if (walmartMode && groceryItems.length > 0) {
    return (
      <WalmartShoppingPanel
        items={groceryItems}
        onToggleChecked={toggleGroceryItemChecked}
        onClose={() => setWalmartMode(false)}
      />
    );
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
          {groceryItems.length > 0 && (() => {
            const checkedCount = groceryItems.filter((i) => i.checked).length;
            return (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                checkedCount === groceryItems.length
                  ? 'bg-green-100 text-green-700'
                  : 'bg-accent-100 text-accent-700'
              }`}>
                {checkedCount > 0
                  ? `${checkedCount}/${groceryItems.length}`
                  : groceryItems.length}
              </span>
            );
          })()}
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
                className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                  item.checked
                    ? 'bg-green-50 text-gray-400'
                    : 'bg-gray-50 text-gray-800'
                }`}
              >
                <button
                  onClick={() => toggleGroceryItemChecked(item.id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    item.checked
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {item.checked && (
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6l2.5 2.5 4.5-5"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 ${item.checked ? 'line-through' : ''}`}>
                  {item.name}
                </span>
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

        {/* Shop at Walmart button */}
        {groceryItems.length > 0 && (
          <button
            onClick={() => setWalmartMode(true)}
            className="w-full text-xs py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            Shop at Walmart
          </button>
        )}
      </div>
    </div>
  );
}
