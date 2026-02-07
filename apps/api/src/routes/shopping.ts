import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings, Variables } from '../index';
import { getUserFromContext } from '../middleware/auth';
import {
  getShoppingListByMealPlanId,
  createShoppingList,
  getShoppingListItems,
  bulkInsertShoppingListItems,
  updateShoppingListItem,
  deleteShoppingListItems,
  getMealPlanById,
  getMealPlanEntries,
  getRecipeById,
  getIngredientsByRecipeId,
  listPantryStaples,
  createPantryStaple,
  deletePantryStaple,
  listRecurringEssentials,
  createRecurringEssential,
  deleteRecurringEssential,
} from '../db/queries';
import { generateShoppingList } from '../services/shopping-generator';

export const shoppingRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const updateItemSchema = z.object({
  have_it: z.boolean().optional(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
});

const pantryStapleSchema = z.object({
  ingredient_name: z.string().min(1).max(200),
});

const recurringEssentialSchema = z.object({
  item_name: z.string().min(1).max(200),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  category: z.string().default('other'),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /shopping/:mealPlanId
 * Get the shopping list for a meal plan.
 */
shoppingRoutes.get('/:mealPlanId', async (c) => {
  const mealPlanId = c.req.param('mealPlanId');

  const shoppingList = await getShoppingListByMealPlanId(c.env.DB, mealPlanId);
  if (!shoppingList) {
    return c.json({ data: null, error: 'Shopping list not found for this meal plan' }, 404);
  }

  const items = await getShoppingListItems(c.env.DB, shoppingList.id);

  return c.json({
    data: { ...shoppingList, items },
    error: null,
  });
});

/**
 * POST /shopping/generate/:mealPlanId
 * Generate a shopping list from a meal plan.
 * Aggregates ingredients, combines quantities, excludes pantry staples,
 * and adds recurring essentials.
 */
shoppingRoutes.post('/generate/:mealPlanId', async (c) => {
  const mealPlanId = c.req.param('mealPlanId');

  // Verify the meal plan exists
  const plan = await getMealPlanById(c.env.DB, mealPlanId);
  if (!plan) {
    return c.json({ data: null, error: 'Meal plan not found' }, 404);
  }

  // Get all entries with their recipes and ingredients
  const entries = await getMealPlanEntries(c.env.DB, mealPlanId);
  const recipesWithIngredients: Array<{
    recipeId: string;
    recipeTitle: string;
    ingredients: Array<{
      name: string;
      quantity: number | null;
      unit: string | null;
      category: string | null;
    }>;
  }> = [];

  for (const entry of entries) {
    if (entry.recipe_id && (entry.status === 'confirmed' || entry.status === 'suggested')) {
      const recipe = await getRecipeById(c.env.DB, entry.recipe_id);
      if (recipe) {
        const ingredients = await getIngredientsByRecipeId(c.env.DB, recipe.id);
        recipesWithIngredients.push({
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          ingredients: ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category,
          })),
        });
      }
    }
  }

  // Get pantry staples and recurring essentials
  const pantryStaples = await listPantryStaples(c.env.DB);
  const recurringEssentials = await listRecurringEssentials(c.env.DB);

  // Generate the list
  const generatedItems = generateShoppingList(
    recipesWithIngredients,
    pantryStaples.map((s) => s.ingredient_name),
    recurringEssentials,
  );

  // Delete existing shopping list for this plan if it exists
  const existingList = await getShoppingListByMealPlanId(c.env.DB, mealPlanId);
  if (existingList) {
    await deleteShoppingListItems(c.env.DB, existingList.id);
    // We reuse the existing list record
    await bulkInsertShoppingListItems(
      c.env.DB,
      generatedItems.map((item) => ({
        shopping_list_id: existingList.id,
        ingredient_name: item.ingredient_name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        source_recipes: item.source_recipes,
        have_it: false,
        is_recurring_essential: item.is_recurring_essential,
      })),
    );

    const items = await getShoppingListItems(c.env.DB, existingList.id);
    return c.json({ data: { ...existingList, items }, error: null }, 201);
  }

  // Create new shopping list
  const shoppingList = await createShoppingList(c.env.DB, { meal_plan_id: mealPlanId });

  await bulkInsertShoppingListItems(
    c.env.DB,
    generatedItems.map((item) => ({
      shopping_list_id: shoppingList.id,
      ingredient_name: item.ingredient_name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      source_recipes: item.source_recipes,
      have_it: false,
      is_recurring_essential: item.is_recurring_essential,
    })),
  );

  const items = await getShoppingListItems(c.env.DB, shoppingList.id);
  return c.json({ data: { ...shoppingList, items }, error: null }, 201);
});

/**
 * PUT /shopping/items/:itemId
 * Update a shopping list item (toggle have_it, change quantity).
 */
shoppingRoutes.put('/items/:itemId', async (c) => {
  const itemId = c.req.param('itemId');
  const body = await c.req.json();
  const parseResult = updateItemSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ data: null, error: 'Validation failed', meta: { issues: parseResult.error.issues } }, 400);
  }

  const updated = await updateShoppingListItem(c.env.DB, itemId, parseResult.data);
  if (!updated) {
    return c.json({ data: null, error: 'Shopping list item not found' }, 404);
  }

  return c.json({ data: updated, error: null });
});

// ---------------------------------------------------------------------------
// Pantry Staples
// ---------------------------------------------------------------------------

/**
 * GET /shopping/pantry-staples
 * List all pantry staples.
 */
shoppingRoutes.get('/pantry-staples', async (c) => {
  const staples = await listPantryStaples(c.env.DB);
  return c.json({ data: staples, error: null });
});

/**
 * POST /shopping/pantry-staples
 * Add a pantry staple.
 */
shoppingRoutes.post('/pantry-staples', async (c) => {
  const body = await c.req.json();
  const parseResult = pantryStapleSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ data: null, error: 'Validation failed', meta: { issues: parseResult.error.issues } }, 400);
  }

  const staple = await createPantryStaple(c.env.DB, parseResult.data);
  return c.json({ data: staple, error: null }, 201);
});

/**
 * DELETE /shopping/pantry-staples/:id
 * Remove a pantry staple.
 */
shoppingRoutes.delete('/pantry-staples/:id', async (c) => {
  const id = c.req.param('id');
  const deleted = await deletePantryStaple(c.env.DB, id);

  if (!deleted) {
    return c.json({ data: null, error: 'Pantry staple not found' }, 404);
  }

  return c.json({ data: { deleted: true }, error: null });
});

// ---------------------------------------------------------------------------
// Recurring Essentials
// ---------------------------------------------------------------------------

/**
 * GET /shopping/recurring-essentials
 * List all recurring essentials.
 */
shoppingRoutes.get('/recurring-essentials', async (c) => {
  const essentials = await listRecurringEssentials(c.env.DB);
  return c.json({ data: essentials, error: null });
});

/**
 * POST /shopping/recurring-essentials
 * Add a recurring essential.
 */
shoppingRoutes.post('/recurring-essentials', async (c) => {
  const body = await c.req.json();
  const parseResult = recurringEssentialSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ data: null, error: 'Validation failed', meta: { issues: parseResult.error.issues } }, 400);
  }

  const essential = await createRecurringEssential(c.env.DB, parseResult.data);
  return c.json({ data: essential, error: null }, 201);
});

/**
 * DELETE /shopping/recurring-essentials/:id
 * Remove a recurring essential.
 */
shoppingRoutes.delete('/recurring-essentials/:id', async (c) => {
  const id = c.req.param('id');
  const deleted = await deleteRecurringEssential(c.env.DB, id);

  if (!deleted) {
    return c.json({ data: null, error: 'Recurring essential not found' }, 404);
  }

  return c.json({ data: { deleted: true }, error: null });
});
