import { normalizeIngredientName, categorizeIngredient } from '@mealflow/shared';
import type { RecurringEssential } from '@mealflow/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecipeIngredients {
  recipeId: string;
  recipeTitle: string;
  ingredients: Array<{
    name: string;
    quantity: number | null;
    unit: string | null;
    category: string | null;
  }>;
}

export interface GeneratedShoppingItem {
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  source_recipes: string[];
  is_recurring_essential: boolean;
}

// ---------------------------------------------------------------------------
// Internal: Aggregation map entry
// ---------------------------------------------------------------------------

interface AggregatedEntry {
  normalizedName: string;
  displayName: string;
  /** Map from unit -> total quantity. null unit is stored as '' key */
  quantities: Map<string, number>;
  category: string;
  sourceRecipes: Set<string>;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Aggregate ingredients from multiple recipes, combine quantities for
 * matching ingredients, exclude pantry staples, and add recurring essentials.
 */
export function generateShoppingList(
  recipesWithIngredients: RecipeIngredients[],
  pantryStapleNames: string[],
  recurringEssentials: RecurringEssential[],
): GeneratedShoppingItem[] {
  // Normalize pantry staple names for comparison
  const normalizedStaples = new Set(
    pantryStapleNames.map((n) => normalizeIngredientName(n)),
  );

  // Build aggregation map keyed by normalized ingredient name
  const aggregation = new Map<string, AggregatedEntry>();

  for (const recipe of recipesWithIngredients) {
    for (const ing of recipe.ingredients) {
      const normalized = normalizeIngredientName(ing.name);

      // Skip pantry staples
      if (normalizedStaples.has(normalized)) {
        continue;
      }

      let entry = aggregation.get(normalized);
      if (!entry) {
        entry = {
          normalizedName: normalized,
          displayName: ing.name,
          quantities: new Map(),
          category: ing.category ?? categorizeIngredient(ing.name),
          sourceRecipes: new Set(),
        };
        aggregation.set(normalized, entry);
      }

      // Accumulate quantity
      const unitKey = ing.unit ?? '';
      if (ing.quantity !== null) {
        const existing = entry.quantities.get(unitKey) ?? 0;
        entry.quantities.set(unitKey, existing + ing.quantity);
      } else if (!entry.quantities.has(unitKey)) {
        // No quantity — just mark the unit as seen with 0
        // (we'll output null for items with 0 total quantity)
        entry.quantities.set(unitKey, 0);
      }

      entry.sourceRecipes.add(recipe.recipeTitle);
    }
  }

  // Convert aggregation map to output items
  const items: GeneratedShoppingItem[] = [];

  for (const entry of aggregation.values()) {
    // If there's only one unit (common case), output a single item
    if (entry.quantities.size <= 1) {
      const [unitKey, qty] = entry.quantities.entries().next().value as [string, number];
      items.push({
        ingredient_name: entry.displayName,
        quantity: qty > 0 ? qty : null,
        unit: unitKey || null,
        category: entry.category,
        source_recipes: [...entry.sourceRecipes],
        is_recurring_essential: false,
      });
    } else {
      // Multiple units for the same ingredient — output one item per unit
      for (const [unitKey, qty] of entry.quantities) {
        items.push({
          ingredient_name: entry.displayName,
          quantity: qty > 0 ? qty : null,
          unit: unitKey || null,
          category: entry.category,
          source_recipes: [...entry.sourceRecipes],
          is_recurring_essential: false,
        });
      }
    }
  }

  // Add recurring essentials (unless they already appear in the list)
  for (const essential of recurringEssentials) {
    const normalized = normalizeIngredientName(essential.item_name);
    if (!aggregation.has(normalized)) {
      items.push({
        ingredient_name: essential.item_name,
        quantity: essential.quantity,
        unit: essential.unit,
        category: essential.category,
        source_recipes: [],
        is_recurring_essential: true,
      });
    }
  }

  // Sort by category then by name for a nicer shopping experience
  items.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.ingredient_name.localeCompare(b.ingredient_name);
  });

  return items;
}
