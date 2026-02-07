'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import type { MealPlanEntry, Recipe, EveningClassification } from '@mealflow/shared';

interface MealPlanWithEntries {
  id: string;
  week_start: string;
  entries: (MealPlanEntry & { recipe?: Recipe })[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CLASSIFICATION_LABELS: Record<EveningClassification, string> = {
  free: 'Free evening',
  partial: 'Partial',
  busy: 'Busy',
};

const CLASSIFICATION_COLORS: Record<EveningClassification, string> = {
  free: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  busy: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function PlanPage() {
  const [plan, setPlan] = useState<MealPlanWithEntries | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadPlan();
  }, []);

  async function loadPlan() {
    setLoading(true);
    const res = await apiGet<MealPlanWithEntries>('/meal-plans/current');
    if (res.data) {
      setPlan(res.data);
    }
    setLoading(false);
  }

  async function syncCalendar() {
    if (!plan) return;
    setSyncing(true);
    await apiPost(`/meal-plans/${plan.id}/sync-calendar`);
    await loadPlan();
    setSyncing(false);
  }

  function getEntryForDay(dayIndex: number): (MealPlanEntry & { recipe?: Recipe }) | undefined {
    if (!plan) return undefined;
    const date = getDateForDay(plan.week_start, dayIndex);
    return plan.entries.find((e) => e.date === date);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-[var(--border)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">This Week</h1>
          {plan && (
            <p className="text-sm text-[var(--muted)]">
              Week of {formatDate(plan.week_start)}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={syncCalendar} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Calendar'}
        </Button>
      </div>

      <div className="space-y-2">
        {DAYS.map((day, i) => {
          const entry = getEntryForDay(i);
          const classification = entry?.override_classification || entry?.classification || 'free';

          return (
            <Card key={day} className="!p-0 overflow-hidden">
              <div className="flex items-stretch">
                <div className="w-1.5 shrink-0" style={{
                  backgroundColor: classification === 'free' ? '#22c55e' : classification === 'partial' ? '#eab308' : '#ef4444'
                }} />
                <div className="flex-1 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{day}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CLASSIFICATION_COLORS[classification]}`}>
                      {CLASSIFICATION_LABELS[classification]}
                    </span>
                  </div>

                  {entry?.recipe ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{entry.recipe.title}</p>
                        <p className="text-xs text-[var(--muted)]">
                          Effort {entry.recipe.effort_level} · {entry.recipe.total_time_minutes ?? '?'} min
                        </p>
                      </div>
                      <StatusBadge status={entry.status} />
                    </div>
                  ) : entry?.status === 'eating_out' ? (
                    <p className="text-sm text-[var(--muted)]">Eating out</p>
                  ) : entry?.status === 'leftovers' ? (
                    <p className="text-sm text-[var(--muted)]">Leftovers</p>
                  ) : (
                    <p className="text-sm text-[var(--muted)] italic">No meal assigned</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    suggested: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    eating_out: 'bg-gray-100 text-gray-800',
    leftovers: 'bg-orange-100 text-orange-800',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || ''}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function getDateForDay(weekStart: string, dayIndex: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayIndex);
  return d.toISOString().split('T')[0] ?? weekStart;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
