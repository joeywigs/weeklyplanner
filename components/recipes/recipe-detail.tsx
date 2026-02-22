'use client';

import { useState } from 'react';
import type { Recipe } from '@/lib/types';
import { scaleIngredient } from '@/lib/ingredient-scale';

interface RecipeDetailProps {
  recipe: Recipe;
  onSave: (updated: Recipe) => void;
  onBack: () => void;
}

export function RecipeDetail({ recipe, onSave, onBack }: RecipeDetailProps) {
  const baseServings = parseInt(recipe.servings, 10) || 0;
  const [servings, setServings] = useState(baseServings || 4);
  const [editing, setEditing] = useState(false);
  const [ingredients, setIngredients] = useState<string[]>([...recipe.ingredients]);
  const [directions, setDirections] = useState(recipe.directions);
  const [notes, setNotes] = useState(recipe.notes);
  const [newIngredient, setNewIngredient] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const canScale = baseServings > 0;
  const scaledIngredients = canScale
    ? ingredients.map((ing) => scaleIngredient(ing, baseServings, servings))
    : ingredients;

  function handleSave() {
    onSave({
      ...recipe,
      servings: servings.toString(),
      ingredients,
      directions,
      notes,
    });
    setEditing(false);
  }

  function addIngredient() {
    const text = newIngredient.trim();
    if (!text) return;
    setIngredients([...ingredients, text]);
    setNewIngredient('');
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function startEditIngredient(index: number) {
    setEditIndex(index);
    setEditValue(ingredients[index]);
  }

  function saveEditIngredient() {
    if (editIndex === null) return;
    const text = editValue.trim();
    if (!text) return;
    const updated = [...ingredients];
    updated[editIndex] = text;
    setIngredients(updated);
    setEditIndex(null);
    setEditValue('');
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1">{recipe.name}</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1.5 rounded-md bg-accent-500 text-white font-medium hover:bg-accent-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setIngredients([...recipe.ingredients]);
                setDirections(recipe.directions);
                setNotes(recipe.notes);
                setServings(baseServings || 4);
              }}
              className="text-xs px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
        {recipe.prepTime && (
          <span>Prep: {recipe.prepTime}</span>
        )}
        {recipe.cookTime && (
          <span>Cook: {recipe.cookTime}</span>
        )}
        {recipe.totalTime && (
          <span>Total: {recipe.totalTime}</span>
        )}
        {recipe.source && (
          <span className="text-accent-500">{recipe.source}</span>
        )}
      </div>

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Servings adjuster */}
      <div className="flex items-center gap-3 mb-4 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
        <span className="text-xs font-medium text-gray-700">Servings</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setServings(Math.max(1, servings - 1))}
            className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-600 text-sm flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            -
          </button>
          <span className="text-sm font-bold text-gray-900 w-6 text-center">{servings}</span>
          <button
            onClick={() => setServings(servings + 1)}
            className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-600 text-sm flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            +
          </button>
        </div>
        {canScale && servings !== baseServings && (
          <span className="text-[10px] text-accent-500">
            (originally {baseServings})
          </span>
        )}
        {!canScale && (
          <span className="text-[10px] text-gray-400">
            no base servings — scaling disabled
          </span>
        )}
      </div>

      {/* Ingredients */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Ingredients</h3>
        {scaledIngredients.length > 0 ? (
          <ul className="space-y-1">
            {scaledIngredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                {editIndex === i ? (
                  <div className="flex-1 flex gap-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditIngredient();
                        if (e.key === 'Escape') setEditIndex(null);
                      }}
                      className="flex-1 text-xs px-2 py-1 rounded-md bg-white border border-accent-300 focus:outline-none focus:ring-1 focus:ring-accent-400"
                      autoFocus
                    />
                    <button
                      onClick={saveEditIngredient}
                      className="text-[10px] px-1.5 py-1 text-accent-600 hover:text-accent-800"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-accent-400 mt-0.5">•</span>
                    <span className="flex-1">{ing}</span>
                    {editing && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => startEditIngredient(i)}
                          className="text-gray-300 hover:text-accent-500 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeIngredient(i)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400 italic">No ingredients listed</p>
        )}

        {editing && (
          <div className="flex gap-1 mt-2">
            <input
              type="text"
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
              placeholder="Add ingredient..."
              className="flex-1 text-xs px-2 py-1.5 rounded-md bg-white border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
            />
            <button
              onClick={addIngredient}
              className="text-xs px-2 py-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Directions */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Directions</h3>
        {editing ? (
          <textarea
            value={directions}
            onChange={(e) => setDirections(e.target.value)}
            rows={6}
            className="w-full text-xs px-3 py-2 rounded-md bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-accent-400 resize-y"
          />
        ) : directions ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {directions}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No directions</p>
        )}
      </div>

      {/* Notes */}
      {(notes || editing) && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Notes</h3>
          {editing ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full text-xs px-3 py-2 rounded-md bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-accent-400 resize-y"
            />
          ) : (
            <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
