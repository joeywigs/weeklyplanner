import type { Recipe } from './types';

const RECIPES_KEY = 'user_recipes';

export function getRecipes(): Recipe[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECIPES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setRecipes(recipes: Recipe[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
}
