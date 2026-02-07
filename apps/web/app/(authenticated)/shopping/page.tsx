'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import type { ShoppingListItem } from '@mealflow/shared';

interface ShoppingListData {
  id: string;
  items: ShoppingListItem[];
  finalized_at: string | null;
}

const CATEGORY_ORDER = ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'bakery', 'other'];

const CATEGORY_LABELS: Record<string, string> = {
  produce: 'Produce',
  dairy: 'Dairy & Eggs',
  meat: 'Meat & Seafood',
  pantry: 'Pantry',
  frozen: 'Frozen',
  bakery: 'Bakery',
  other: 'Other',
};

export default function ShoppingPage() {
  const [list, setList] = useState<ShoppingListData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadList();
  }, []);

  async function loadList() {
    setLoading(true);
    const planRes = await apiGet<{ id: string }>('/meal-plans/current');
    if (planRes.data) {
      const res = await apiGet<ShoppingListData>(`/shopping/${planRes.data.id}`);
      if (res.data) {
        setList(res.data);
      }
    }
    setLoading(false);
  }

  async function generateList() {
    const planRes = await apiGet<{ id: string }>('/meal-plans/current');
    if (planRes.data) {
      await apiPost(`/shopping/generate/${planRes.data.id}`);
      await loadList();
    }
  }

  async function toggleItem(itemId: string, haveIt: boolean) {
    await apiPut(`/shopping/items/${itemId}`, { have_it: !haveIt });
    setList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, have_it: !haveIt } : item
        ),
      };
    });
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 rounded bg-[var(--border)] animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-[var(--border)] animate-pulse" />
        ))}
      </div>
    );
  }

  const itemsByCategory = groupByCategory(list?.items ?? []);
  const totalItems = list?.items.length ?? 0;
  const checkedItems = list?.items.filter((i) => i.have_it).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Shopping List</h1>
          {totalItems > 0 && (
            <p className="text-sm text-[var(--muted)]">
              {checkedItems} of {totalItems} items checked
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={generateList}>
          Regenerate
        </Button>
      </div>

      {totalItems > 0 && (
        <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${(checkedItems / totalItems) * 100}%` }}
          />
        </div>
      )}

      {!list || totalItems === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted)]">No shopping list yet</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            Assign meals to your weekly plan first, then generate a list
          </p>
          <Button variant="primary" size="sm" className="mt-4" onClick={generateList}>
            Generate Shopping List
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.map((category) => {
            const items = itemsByCategory[category];
            if (!items || items.length === 0) return null;

            return (
              <div key={category}>
                <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                  {CATEGORY_LABELS[category] ?? category}
                </h2>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id, item.have_it)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                        item.have_it
                          ? 'bg-[var(--border)]/50 opacity-60'
                          : 'bg-[var(--card)] border border-[var(--border)]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          item.have_it
                            ? 'bg-brand-600 border-brand-600'
                            : 'border-[var(--muted)]'
                        }`}
                      >
                        {item.have_it && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${item.have_it ? 'line-through' : ''}`}>
                          {item.ingredient_name}
                        </span>
                        {item.quantity && (
                          <span className="text-xs text-[var(--muted)] ml-1">
                            {item.quantity} {item.unit ?? ''}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function groupByCategory(items: ShoppingListItem[]): Record<string, ShoppingListItem[]> {
  const grouped: Record<string, ShoppingListItem[]> = {};
  for (const item of items) {
    const cat = item.category || 'other';
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(item);
  }
  return grouped;
}
