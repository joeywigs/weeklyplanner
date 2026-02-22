'use client';

import { useState, useEffect, useRef } from 'react';
import type { Recipe } from '@/lib/types';
import { getRecipes, setRecipes } from '@/lib/recipe-store';
import { parsePaprikaFile } from '@/lib/paprika-import';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const TAG_SUGGESTIONS = [
  'entree',
  'side',
  'appetizer',
  'dessert',
  'breakfast',
  'quick',
  'slow cooker',
  'grill',
  'vegetarian',
  'kid-friendly',
];

export function RecipeSettings() {
  const [recipes, setLocalRecipes] = useState<Recipe[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrepTime, setEditPrepTime] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalRecipes(getRecipes());
  }, []);

  function save(updated: Recipe[]) {
    setLocalRecipes(updated);
    setRecipes(updated);
  }

  function startEdit(recipe: Recipe) {
    setEditingId(recipe.id);
    setEditName(recipe.name);
    setEditPrepTime(recipe.prepTime);
    setEditTags([...recipe.tags]);
    setTagInput('');
  }

  function startAdd() {
    const id = generateId();
    setEditingId(id);
    setEditName('');
    setEditPrepTime('');
    setEditTags([]);
    setTagInput('');
  }

  function saveEdit() {
    if (!editName.trim()) return;
    const existing = recipes.find((r) => r.id === editingId);
    const recipe: Recipe = {
      id: editingId!,
      name: editName.trim(),
      prepTime: editPrepTime.trim(),
      tags: editTags,
    };

    if (existing) {
      save(recipes.map((r) => (r.id === editingId ? recipe : r)));
    } else {
      save([...recipes, recipe]);
    }
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function deleteRecipe(id: string) {
    save(recipes.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function addTag(tag: string) {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !editTags.includes(normalized)) {
      setEditTags([...editTags, normalized]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setEditTags(editTags.filter((t) => t !== tag));
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportCount(null);

    try {
      const imported = await parsePaprikaFile(file);
      if (imported.length === 0) {
        setImportError('No recipes found in file. Supports .paprikarecipes and .paprikarecipe files.');
        return;
      }

      // Merge: skip duplicates by name
      const existingNames = new Set(recipes.map((r) => r.name.toLowerCase()));
      const newRecipes = imported.filter(
        (r) => !existingNames.has(r.name.toLowerCase())
      );
      if (newRecipes.length > 0) {
        save([...recipes, ...newRecipes]);
      }
      setImportCount(newRecipes.length);
    } catch {
      setImportError('Failed to parse file.');
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const filtered = searchFilter.trim()
    ? recipes.filter(
        (r) =>
          r.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          r.tags.some((t) => t.includes(searchFilter.toLowerCase()))
      )
    : recipes;

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <h2 className="text-sm font-bold text-gray-900 mb-1">Recipes</h2>
      <p className="text-xs text-gray-500 mb-3">
        Manage your recipe collection. Import from Paprika or add manually.
      </p>

      {/* Import */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-xs px-3 py-1.5 rounded-md bg-accent-500 text-white font-medium hover:bg-accent-600 transition-colors"
        >
          Import from Paprika
        </button>
        <button
          onClick={startAdd}
          className="text-xs px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
        >
          + Add Recipe
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".paprikarecipes,.paprikarecipe,.zip"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {importError && (
        <p className="mb-2 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-md">
          {importError}
        </p>
      )}
      {importCount !== null && (
        <p className="mb-2 text-xs text-green-600 bg-green-50 px-2 py-1.5 rounded-md">
          Imported {importCount} new recipe{importCount !== 1 ? 's' : ''}.
        </p>
      )}

      {/* Edit form */}
      {editingId && (
        <div className="mb-3 p-3 rounded-lg border border-accent-200 bg-accent-50 space-y-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Recipe name"
            className="w-full text-xs px-2 py-1.5 rounded-md bg-white border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
            autoFocus
          />
          <input
            type="text"
            value={editPrepTime}
            onChange={(e) => setEditPrepTime(e.target.value)}
            placeholder="Prep time (e.g., 30 min, 1 hour)"
            className="w-full text-xs px-2 py-1.5 rounded-md bg-white border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
          />

          {/* Tags */}
          <div>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {editTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-accent-200 text-accent-800 font-medium"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-accent-500 hover:text-red-500"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder="Add tag..."
                className="flex-1 text-xs px-2 py-1 rounded-md bg-white border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-400 min-w-0"
              />
              <button
                onClick={() => addTag(tagInput)}
                className="text-xs px-2 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {TAG_SUGGESTIONS.filter((s) => !editTags.includes(s)).map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => addTag(suggestion)}
                    className="text-[10px] px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    + {suggestion}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={saveEdit}
              disabled={!editName.trim()}
              className="text-xs px-3 py-1.5 rounded-md bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="text-xs px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search / filter */}
      {recipes.length > 0 && (
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter recipes..."
          className="w-full text-xs px-2 py-1.5 rounded-md bg-gray-50 border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-400 mb-2"
        />
      )}

      {/* Recipe list */}
      {sorted.length > 0 ? (
        <ul className="space-y-1 max-h-64 overflow-y-auto">
          {sorted.map((recipe) => (
            <li
              key={recipe.id}
              className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-gray-50 group"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900">{recipe.name}</span>
                {recipe.prepTime && (
                  <span className="text-[10px] text-gray-400 ml-1.5">
                    {recipe.prepTime}
                  </span>
                )}
                {recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1 py-px rounded bg-gray-100 text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => startEdit(recipe)}
                className="text-gray-300 hover:text-accent-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                onClick={() => deleteRecipe(recipe.id)}
                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
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
        <p className="text-xs text-gray-400 italic text-center py-4">
          {recipes.length === 0
            ? 'No recipes yet. Import from Paprika or add manually.'
            : 'No recipes match your filter.'}
        </p>
      )}

      {recipes.length > 0 && (
        <p className="mt-2 text-[10px] text-gray-400">
          {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
