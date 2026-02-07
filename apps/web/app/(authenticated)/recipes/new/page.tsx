'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/lib/api';
import type { Recipe } from '@mealflow/shared';

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

interface IngredientRow {
  raw_text: string;
}

export default function NewRecipePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [directions, setDirections] = useState('');
  const [ingredientText, setIngredientText] = useState('');
  const [effortLevel, setEffortLevel] = useState<1 | 2 | 3>(2);
  const [servings, setServings] = useState(2);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Recipe title is required');
      return;
    }

    setSaving(true);

    // Parse ingredients from textarea (one per line)
    const ingredients = ingredientText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => ({
        name: line.toLowerCase().replace(/^[\d\s\/½¼¾⅓⅔⅛]+/, '').replace(/^\w+\s+(?:of\s+)?/, ''),
        raw_text: line,
      }));

    const res = await apiPost<Recipe>('/recipes', {
      title: title.trim(),
      directions: directions.trim(),
      effort_level: effortLevel,
      servings,
      prep_time_minutes: prepTime ? parseInt(prepTime, 10) : null,
      cook_time_minutes: cookTime ? parseInt(cookTime, 10) : null,
      total_time_minutes:
        prepTime || cookTime
          ? (parseInt(prepTime, 10) || 0) + (parseInt(cookTime, 10) || 0) || null
          : null,
      source: source.trim() || null,
      notes: notes.trim(),
      ingredients,
    });

    if (res.error) {
      setError(res.error);
      setSaving(false);
      return;
    }

    if (res.data) {
      router.push(`/recipes/${res.data.id}`);
    }
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

      <h1 className="text-2xl font-bold">Add Recipe</h1>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Sheet Pan Chicken Fajitas"
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>

        {/* Effort level */}
        <div>
          <label className="block text-sm font-medium mb-2">Effort Level</label>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setEffortLevel(level)}
                className={`px-3 py-3 rounded-xl text-center transition-colors ${
                  effortLevel === level
                    ? 'bg-brand-600 text-white'
                    : 'bg-[var(--card)] border border-[var(--border)] hover:border-brand-300'
                }`}
              >
                <div className="text-sm font-medium">{EFFORT_LABELS[level]}</div>
                <div className={`text-xs mt-0.5 ${effortLevel === level ? 'text-brand-100' : 'text-[var(--muted)]'}`}>
                  {EFFORT_DESCRIPTIONS[level]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Servings + times */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Servings</label>
            <input
              type="number"
              min={1}
              max={20}
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value, 10) || 2)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Prep (min)</label>
            <input
              type="number"
              min={0}
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              placeholder="15"
              className="w-full px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Cook (min)</label>
            <input
              type="number"
              min={0}
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              placeholder="30"
              className="w-full px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <label className="block text-sm font-medium mb-1">Ingredients</label>
          <p className="text-xs text-[var(--muted)] mb-2">One ingredient per line, including quantity and unit</p>
          <textarea
            value={ingredientText}
            onChange={(e) => setIngredientText(e.target.value)}
            placeholder={"2 lbs chicken breast\n1 cup rice\n2 tbsp olive oil\n1 lemon, juiced"}
            rows={8}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono"
          />
        </div>

        {/* Directions */}
        <div>
          <label className="block text-sm font-medium mb-1">Directions</label>
          <p className="text-xs text-[var(--muted)] mb-2">One step per line</p>
          <textarea
            value={directions}
            onChange={(e) => setDirections(e.target.value)}
            placeholder={"Preheat oven to 400F.\nSeason chicken with salt and pepper.\nRoast for 25 minutes."}
            rows={8}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Source */}
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">Source (optional)</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="URL or cookbook name"
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tips, substitutions, etc."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" size="lg" className="flex-1" disabled={saving}>
            {saving ? 'Saving...' : 'Save Recipe'}
          </Button>
          <Link href="/recipes" className="flex-shrink-0">
            <Button type="button" variant="secondary" size="lg">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
