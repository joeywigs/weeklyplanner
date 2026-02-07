'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiGet, apiPut, apiDelete } from '@/lib/api';
import type { Recipe, Ingredient } from '@mealflow/shared';

interface RecipeWithIngredients extends Recipe {
  ingredients: Ingredient[];
}

const EFFORT_LABELS: Record<number, string> = {
  1: 'Minimal',
  2: 'Moderate',
  3: 'Full Cook',
};

const EFFORT_DESCRIPTIONS: Record<number, string> = {
  1: 'Crockpot, sheet pan, or set-and-forget',
  2: '~30 minutes active cooking',
  3: '45+ minutes of active time',
};

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<{
    effort_level: 1 | 2 | 3;
    servings: number;
    contains_tree_nuts: boolean;
    notes: string;
  } | null>(null);

  useEffect(() => {
    loadRecipe();
  }, [params.id]);

  async function loadRecipe() {
    setLoading(true);
    const res = await apiGet<RecipeWithIngredients>(`/recipes/${params.id}`);
    if (res.data) {
      setRecipe(res.data);
      setEditData({
        effort_level: res.data.effort_level,
        servings: res.data.servings,
        contains_tree_nuts: res.data.contains_tree_nuts,
        notes: res.data.notes,
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!editData) return;
    await apiPut(`/recipes/${params.id}`, editData);
    setEditing(false);
    loadRecipe();
  }

  async function handleDelete() {
    if (!confirm('Delete this recipe? This cannot be undone.')) return;
    setDeleting(true);
    await apiDelete(`/recipes/${params.id}`);
    router.push('/recipes');
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-xl bg-[var(--border)] animate-pulse" />
        <div className="h-6 w-2/3 rounded bg-[var(--border)] animate-pulse" />
        <div className="h-4 w-1/3 rounded bg-[var(--border)] animate-pulse" />
        <div className="space-y-2 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted)]">Recipe not found</p>
        <Link href="/recipes">
          <Button variant="secondary" size="sm" className="mt-4">
            Back to recipes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/recipes"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Recipes
      </Link>

      {/* Header */}
      <div className="space-y-3">
        {recipe.image_url && (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-48 rounded-xl object-cover"
          />
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{recipe.title}</h1>
            {recipe.source && (
              <p className="text-sm text-[var(--muted)] mt-1">
                Source: {recipe.source}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              {editing ? 'Cancel' : 'Edit'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Tree nut warning */}
        {recipe.contains_tree_nuts && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Contains tree nuts — excluded from meal suggestions
          </div>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap gap-3">
          <MetaBadge label="Effort" value={EFFORT_LABELS[recipe.effort_level] ?? 'Unknown'} />
          <MetaBadge label="Servings" value={String(recipe.servings)} />
          {recipe.prep_time_minutes && (
            <MetaBadge label="Prep" value={`${recipe.prep_time_minutes} min`} />
          )}
          {recipe.cook_time_minutes && (
            <MetaBadge label="Cook" value={`${recipe.cook_time_minutes} min`} />
          )}
          {recipe.total_time_minutes && (
            <MetaBadge label="Total" value={`${recipe.total_time_minutes} min`} />
          )}
          {recipe.rating && (
            <MetaBadge label="Rating" value={`${recipe.rating}/5`} />
          )}
          {recipe.times_made > 0 && (
            <MetaBadge label="Made" value={`${recipe.times_made}x`} />
          )}
          {recipe.last_made && (
            <MetaBadge label="Last made" value={new Date(recipe.last_made).toLocaleDateString()} />
          )}
        </div>

        {/* Categories & tags */}
        {(recipe.categories.length > 0 || recipe.tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.categories.map((cat) => (
              <span key={cat} className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs">
                {cat}
              </span>
            ))}
            {recipe.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--muted)] text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Edit form */}
      {editing && editData && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-sm">Edit Recipe</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Effort Level
              </label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setEditData({ ...editData, effort_level: level })}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs text-center transition-colors ${
                      editData.effort_level === level
                        ? 'bg-brand-600 text-white'
                        : 'bg-[var(--background)] border border-[var(--border)]'
                    }`}
                  >
                    <div className="font-medium">{EFFORT_LABELS[level]}</div>
                    <div className={editData.effort_level === level ? 'text-brand-100' : 'text-[var(--muted)]'}>
                      {EFFORT_DESCRIPTIONS[level]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Servings
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={editData.servings}
                onChange={(e) => setEditData({ ...editData, servings: parseInt(e.target.value, 10) || 2 })}
                className="w-24 px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tree-nuts"
                checked={editData.contains_tree_nuts}
                onChange={(e) => setEditData({ ...editData, contains_tree_nuts: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--border)] text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="tree-nuts" className="text-sm">
                Contains tree nuts
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Notes
              </label>
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Save Changes</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Ingredients */}
      <section>
        <h2 className="font-semibold text-base mb-3">Ingredients</h2>
        {recipe.ingredients.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No ingredients listed</p>
        ) : (
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id} className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                <span>
                  {ing.quantity && (
                    <span className="font-medium">
                      {formatQuantity(ing.quantity)}
                      {ing.unit ? ` ${ing.unit}` : ''}{' '}
                    </span>
                  )}
                  {ing.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Directions */}
      {recipe.directions && (
        <section>
          <h2 className="font-semibold text-base mb-3">Directions</h2>
          <div className="space-y-3">
            {recipe.directions.split('\n').filter(Boolean).map((step, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 text-xs font-medium">
                  {i + 1}
                </span>
                <p className="pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {recipe.notes && !editing && (
        <section>
          <h2 className="font-semibold text-base mb-2">Notes</h2>
          <p className="text-sm text-[var(--muted)] whitespace-pre-wrap">{recipe.notes}</p>
        </section>
      )}
    </div>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
      <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <span className="block text-sm font-medium">{value}</span>
    </div>
  );
}

function formatQuantity(qty: number): string {
  if (qty === Math.floor(qty)) return String(qty);

  const fractions: Record<string, number> = {
    '\u00BC': 0.25,
    '\u00BD': 0.5,
    '\u00BE': 0.75,
    '\u2153': 0.333,
    '\u2154': 0.667,
  };

  const whole = Math.floor(qty);
  const frac = qty - whole;

  for (const [char, val] of Object.entries(fractions)) {
    if (Math.abs(frac - val) < 0.05) {
      return whole > 0 ? `${whole}${char}` : char;
    }
  }

  return qty.toFixed(1);
}
