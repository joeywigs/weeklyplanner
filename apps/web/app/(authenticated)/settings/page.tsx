'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import type { PantryStaple, RecurringEssential } from '@mealflow/shared';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [pantryStaples, setPantryStaples] = useState<PantryStaple[]>([]);
  const [essentials, setEssentials] = useState<RecurringEssential[]>([]);
  const [newStaple, setNewStaple] = useState('');
  const [newEssential, setNewEssential] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [staplesRes, essentialsRes] = await Promise.all([
      apiGet<PantryStaple[]>('/shopping/pantry-staples'),
      apiGet<RecurringEssential[]>('/shopping/recurring-essentials'),
    ]);
    if (staplesRes.data) setPantryStaples(staplesRes.data);
    if (essentialsRes.data) setEssentials(essentialsRes.data);
  }

  async function addStaple() {
    if (!newStaple.trim()) return;
    await apiPost('/shopping/pantry-staples', { ingredient_name: newStaple.trim() });
    setNewStaple('');
    loadData();
  }

  async function removeStaple(id: string) {
    await apiDelete(`/shopping/pantry-staples/${id}`);
    setPantryStaples((prev) => prev.filter((s) => s.id !== id));
  }

  async function addEssential() {
    if (!newEssential.trim()) return;
    await apiPost('/shopping/recurring-essentials', { item_name: newEssential.trim() });
    setNewEssential('');
    loadData();
  }

  async function removeEssential(id: string) {
    await apiDelete(`/shopping/recurring-essentials/${id}`);
    setEssentials((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Account */}
      <Card>
        <CardTitle>Account</CardTitle>
        {user && (
          <div className="flex items-center gap-3 mt-3">
            {user.picture && (
              <img src={user.picture} alt="" className="w-10 h-10 rounded-full" />
            )}
            <div>
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-[var(--muted)]">{user.email}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" className="mt-3" onClick={logout}>
          Sign out
        </Button>
      </Card>

      {/* Pantry Staples */}
      <Card>
        <CardTitle>Pantry Staples</CardTitle>
        <p className="text-xs text-[var(--muted)] mt-1">
          Items you always have on hand. These are automatically excluded from shopping lists.
        </p>
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={newStaple}
            onChange={(e) => setNewStaple(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStaple()}
            placeholder="e.g., olive oil"
            className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button size="sm" onClick={addStaple}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {pantryStaples.map((staple) => (
            <span
              key={staple.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--background)] border border-[var(--border)] text-xs"
            >
              {staple.ingredient_name}
              <button
                onClick={() => removeStaple(staple.id)}
                className="text-[var(--muted)] hover:text-red-500 transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      </Card>

      {/* Recurring Essentials */}
      <Card>
        <CardTitle>Weekly Essentials</CardTitle>
        <p className="text-xs text-[var(--muted)] mt-1">
          Items that automatically get added to every shopping list (milk, bread, eggs, etc.)
        </p>
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={newEssential}
            onChange={(e) => setNewEssential(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEssential()}
            placeholder="e.g., milk"
            className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button size="sm" onClick={addEssential}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {essentials.map((ess) => (
            <span
              key={ess.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--background)] border border-[var(--border)] text-xs"
            >
              {ess.item_name}
              <button
                onClick={() => removeEssential(ess.id)}
                className="text-[var(--muted)] hover:text-red-500 transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      </Card>

      {/* Import/Export */}
      <Card>
        <CardTitle>Data</CardTitle>
        <div className="space-y-2 mt-3">
          <Button variant="secondary" size="sm" className="w-full">
            Import Paprika Recipes
          </Button>
        </div>
      </Card>
    </div>
  );
}
