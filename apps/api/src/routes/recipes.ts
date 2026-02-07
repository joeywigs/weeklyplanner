import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings, Variables } from '../index';
import { getUserFromContext } from '../middleware/auth';
import {
  listRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getIngredientsByRecipeId,
  bulkInsertIngredients,
} from '../db/queries';
import { parsePaprikaFile } from '../services/paprika-import';

export const recipeRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createRecipeSchema = z.object({
  title: z.string().min(1).max(500),
  directions: z.string().default(''),
  prep_time_minutes: z.number().int().positive().nullable().optional(),
  cook_time_minutes: z.number().int().positive().nullable().optional(),
  total_time_minutes: z.number().int().positive().nullable().optional(),
  servings: z.number().int().positive().default(4),
  effort_level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  source: z.string().nullable().optional(),
  notes: z.string().default(''),
  contains_tree_nuts: z.boolean().default(false),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        raw_text: z.string().min(1),
        quantity: z.number().nullable().optional(),
        unit: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

const updateRecipeSchema = createRecipeSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  effort_level: z.coerce.number().int().min(1).max(3).optional(),
  category: z.string().optional(),
  exclude_tree_nuts: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /recipes
 * List recipes with pagination, search, and filters.
 * Tree-nut-containing recipes are excluded by default.
 */
recipeRoutes.get('/', async (c) => {
  const parseResult = listQuerySchema.safeParse(c.req.query());
  if (!parseResult.success) {
    return c.json({ data: null, error: 'Invalid query parameters', meta: { issues: parseResult.error.issues } }, 400);
  }

  const { page, limit, search, effort_level, category, exclude_tree_nuts } = parseResult.data;
  const offset = (page - 1) * limit;

  const { recipes, total } = await listRecipes(c.env.DB, {
    limit,
    offset,
    search: search ?? null,
    effortLevel: (effort_level as 1 | 2 | 3 | undefined) ?? null,
    category: category ?? null,
    excludeTreeNuts: exclude_tree_nuts,
  });

  return c.json({
    data: recipes,
    error: null,
    meta: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
});

/**
 * GET /recipes/:id
 * Get a single recipe with its ingredients.
 */
recipeRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const recipe = await getRecipeById(c.env.DB, id);

  if (!recipe) {
    return c.json({ data: null, error: 'Recipe not found' }, 404);
  }

  const ingredients = await getIngredientsByRecipeId(c.env.DB, id);

  return c.json({
    data: { ...recipe, ingredients },
    error: null,
  });
});

/**
 * POST /recipes
 * Create a recipe manually.
 */
recipeRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parseResult = createRecipeSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ data: null, error: 'Validation failed', meta: { issues: parseResult.error.issues } }, 400);
  }

  const { ingredients, ...recipeData } = parseResult.data;

  const recipe = await createRecipe(c.env.DB, {
    ...recipeData,
    paprika_uid: null,
    image_url: null,
    last_made: null,
    times_made: 0,
    rating: null,
  });

  if (ingredients.length > 0) {
    await bulkInsertIngredients(
      c.env.DB,
      ingredients.map((ing) => ({ ...ing, recipe_id: recipe.id })),
    );
  }

  return c.json({ data: recipe, error: null }, 201);
});

/**
 * PUT /recipes/:id
 * Update an existing recipe.
 */
recipeRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await getRecipeById(c.env.DB, id);
  if (!existing) {
    return c.json({ data: null, error: 'Recipe not found' }, 404);
  }

  const body = await c.req.json();
  const parseResult = updateRecipeSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ data: null, error: 'Validation failed', meta: { issues: parseResult.error.issues } }, 400);
  }

  const { ingredients, ...recipeData } = parseResult.data;

  const updated = await updateRecipe(c.env.DB, id, recipeData);

  // If ingredients are provided, replace all existing ones
  if (ingredients !== undefined && ingredients.length > 0) {
    // Delete existing ingredients and bulk-insert new ones
    await c.env.DB.prepare('DELETE FROM ingredients WHERE recipe_id = ?').bind(id).run();
    await bulkInsertIngredients(
      c.env.DB,
      ingredients.map((ing) => ({ ...ing, recipe_id: id })),
    );
  }

  return c.json({ data: updated, error: null });
});

/**
 * DELETE /recipes/:id
 * Delete a recipe and its ingredients.
 */
recipeRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await getRecipeById(c.env.DB, id);
  if (!existing) {
    return c.json({ data: null, error: 'Recipe not found' }, 404);
  }

  await deleteRecipe(c.env.DB, id);
  return c.json({ data: { deleted: true }, error: null });
});

/**
 * POST /recipes/import
 * Import recipes from a .paprikarecipes file (multipart form upload).
 */
recipeRoutes.post('/import', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return c.json({ data: null, error: 'No file uploaded. Expected a .paprikarecipes file.' }, 400);
  }

  if (!file.name.endsWith('.paprikarecipes')) {
    return c.json({ data: null, error: 'Invalid file type. Expected a .paprikarecipes file.' }, 400);
  }

  try {
    const buffer = await file.arrayBuffer();
    const importedRecipes = await parsePaprikaFile(buffer, c.env.DB, c.env.IMAGES);

    return c.json({
      data: {
        imported: importedRecipes.length,
        recipes: importedRecipes,
      },
      error: null,
    }, 201);
  } catch (err) {
    console.error('Paprika import error:', err);
    return c.json({ data: null, error: 'Failed to parse .paprikarecipes file' }, 500);
  }
});
