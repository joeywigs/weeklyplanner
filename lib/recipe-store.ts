import type { Recipe } from './types';
import { syncGet, syncSet } from './cloud';

const RECIPES_KEY = 'user_recipes';

export function getRecipes(): Recipe[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = syncGet(RECIPES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setRecipes(recipes: Recipe[]): void {
  if (typeof window === 'undefined') return;
  syncSet(RECIPES_KEY, JSON.stringify(recipes));
}
