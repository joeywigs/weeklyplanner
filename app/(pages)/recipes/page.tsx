'use client';

import { useState, useEffect } from 'react';
import type { Recipe } from '@/lib/types';
import { getRecipes, setRecipes } from '@/lib/recipe-store';
import { RecipeDetail } from '@/components/recipes/recipe-detail';

export default function RecipesPage() {
  const [recipes, setLocalRecipes] = useState<Recipe[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLocalRecipes(getRecipes());
  }, []);

  const filtered = search.trim()
    ? recipes.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.tags.some((t) => t.includes(search.toLowerCase())) ||
          r.ingredients?.some((ing) => ing.toLowerCase().includes(search.toLowerCase()))
      )
    : recipes;

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  const selected = selectedId ? recipes.find((r) => r.id === selectedId) : null;

  function handleSave(updated: Recipe) {
    const next = recipes.map((r) => (r.id === updated.id ? updated : r));
    setLocalRecipes(next);
    setRecipes(next);
  }

  if (selected) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <RecipeDetail
          recipe={selected}
          onSave={handleSave}
          onBack={() => setSelectedId(null)}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Recipes</h1>
      <p className="text-sm text-gray-500 mb-4">
        {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in your collection.
      </p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search recipes, ingredients, tags..."
        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[var(--border)] text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400 mb-3"
      />

      {sorted.length > 0 ? (
        <ul className="space-y-1">
          {sorted.map((recipe) => (
            <li key={recipe.id}>
              <button
                onClick={() => setSelectedId(recipe.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-accent-600 transition-colors">
                    {recipe.name}
                  </span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-accent-400 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {recipe.prepTime && (
                    <span className="text-[11px] text-gray-400">{recipe.prepTime}</span>
                  )}
                  {recipe.servings && (
                    <span className="text-[11px] text-gray-400">{recipe.servings} servings</span>
                  )}
                  {recipe.ingredients?.length > 0 && (
                    <span className="text-[11px] text-gray-400">{recipe.ingredients.length} ingredients</span>
                  )}
                </div>
                {recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1.5 py-px rounded-full bg-gray-100 text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">No recipes yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Import from Paprika in Settings to get started
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic text-center py-8">
          No recipes match &ldquo;{search}&rdquo;
        </p>
      )}
    </div>
  );
}
