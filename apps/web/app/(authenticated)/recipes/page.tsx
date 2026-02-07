'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import type { Recipe } from '@mealflow/shared';

const EFFORT_LABELS: Record<number, string> = {
  1: 'Minimal',
  2: 'Moderate',
  3: 'Full Cook',
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [effortFilter, setEffortFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (effortFilter) params.set('effort_level', String(effortFilter));

    const res = await apiGet<Recipe[]>(`/recipes?${params.toString()}`);
    if (res.data) {
      setRecipes(res.data);
    }
    setLoading(false);
  }, [search, effortFilter]);

  useEffect(() => {
    const timer = setTimeout(loadRecipes, 300);
    return () => clearTimeout(timer);
  }, [loadRecipes]);

  async function handleImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/recipes/import`,
      {
        method: 'POST',
        credentials: 'include',
        body: formData,
      }
    );

    if (res.ok) {
      setShowImport(false);
      loadRecipes();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Recipes</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowImport(!showImport)}>
            Import
          </Button>
          <Link href="/recipes/new">
            <Button size="sm">Add Recipe</Button>
          </Link>
        </div>
      </div>

      {showImport && (
        <Card className="space-y-2">
          <p className="text-sm font-medium">Import from Paprika</p>
          <p className="text-xs text-[var(--muted)]">
            Upload a .paprikarecipes file exported from the Paprika app.
          </p>
          <input
            type="file"
            accept=".paprikarecipes"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
            className="text-sm"
          />
        </Card>
      )}

      {/* Search & filters */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <div className="flex gap-2">
          <FilterChip
            label="All"
            active={effortFilter === null}
            onClick={() => setEffortFilter(null)}
          />
          <FilterChip
            label="Minimal"
            active={effortFilter === 1}
            onClick={() => setEffortFilter(1)}
          />
          <FilterChip
            label="Moderate"
            active={effortFilter === 2}
            onClick={() => setEffortFilter(2)}
          />
          <FilterChip
            label="Full Cook"
            active={effortFilter === 3}
            onClick={() => setEffortFilter(3)}
          />
        </div>
      </div>

      {/* Recipe list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted)]">No recipes found</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            Import from Paprika or add a recipe manually
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <Card className="!p-3 hover:border-brand-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                      <span className="text-brand-600 text-lg">
                        {recipe.title.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{recipe.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--muted)]">
                        {EFFORT_LABELS[recipe.effort_level] ?? 'Unknown'}
                      </span>
                      {recipe.total_time_minutes && (
                        <span className="text-xs text-[var(--muted)]">
                          · {recipe.total_time_minutes} min
                        </span>
                      )}
                      {recipe.contains_tree_nuts && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          Tree nuts
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-brand-600 text-white'
          : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--border)] hover:border-brand-300'
      }`}
    >
      {label}
    </button>
  );
}
