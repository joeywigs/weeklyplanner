/**
 * Database query functions for Cloudflare D1.
 *
 * All queries use parameterized statements (no string interpolation).
 * Results are typed using the shared interfaces from @mealflow/shared.
 */

import type {
  User,
  Recipe,
  RecipeInsert,
  Ingredient,
  IngredientInsert,
  MealPlan,
  MealPlanInsert,
  MealPlanEntry,
  MealPlanEntryInsert,
  ShoppingList,
  ShoppingListInsert,
  ShoppingListItem,
  ShoppingListItemInsert,
  PantryStaple,
  PantryStapleInsert,
  RecurringEssential,
  RecurringEssentialInsert,
} from '@mealflow/shared';

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * D1 stores arrays as JSON strings. This helper parses them back.
 */
function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Convert a D1 result row into a typed Recipe.
 */
function rowToRecipe(row: Record<string, unknown>): Recipe {
  return {
    id: row.id as string,
    paprika_uid: (row.paprika_uid as string) ?? null,
    title: row.title as string,
    directions: (row.directions as string) ?? '',
    prep_time_minutes: (row.prep_time_minutes as number) ?? null,
    cook_time_minutes: (row.cook_time_minutes as number) ?? null,
    total_time_minutes: (row.total_time_minutes as number) ?? null,
    servings: (row.servings as number) ?? 4,
    effort_level: (row.effort_level as 1 | 2 | 3) ?? 2,
    categories: parseJsonArray(row.categories),
    tags: parseJsonArray(row.tags),
    image_url: (row.image_url as string) ?? null,
    source: (row.source as string) ?? null,
    last_made: (row.last_made as string) ?? null,
    times_made: (row.times_made as number) ?? 0,
    rating: (row.rating as number) ?? null,
    notes: (row.notes as string) ?? '',
    contains_tree_nuts: Boolean(row.contains_tree_nuts),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToIngredient(row: Record<string, unknown>): Ingredient {
  return {
    id: row.id as string,
    name: row.name as string,
    raw_text: (row.raw_text as string) ?? '',
    quantity: (row.quantity as number) ?? null,
    unit: (row.unit as string) ?? null,
    category: (row.category as string) ?? null,
    recipe_id: row.recipe_id as string,
  };
}

function rowToMealPlan(row: Record<string, unknown>): MealPlan {
  return {
    id: row.id as string,
    week_start: row.week_start as string,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToMealPlanEntry(row: Record<string, unknown>): MealPlanEntry {
  return {
    id: row.id as string,
    meal_plan_id: row.meal_plan_id as string,
    date: row.date as string,
    meal_type: 'dinner',
    classification: row.classification as MealPlanEntry['classification'],
    override_classification: (row.override_classification as MealPlanEntry['override_classification']) ?? null,
    recipe_id: (row.recipe_id as string) ?? null,
    status: (row.status as MealPlanEntry['status']) ?? 'suggested',
    leftover_source_entry_id: (row.leftover_source_entry_id as string) ?? null,
    headcount: (row.headcount as number) ?? 4,
    notes: (row.notes as string) ?? null,
  };
}

function rowToShoppingList(row: Record<string, unknown>): ShoppingList {
  return {
    id: row.id as string,
    meal_plan_id: row.meal_plan_id as string,
    created_at: row.created_at as string,
    finalized_at: (row.finalized_at as string) ?? null,
  };
}

function rowToShoppingListItem(row: Record<string, unknown>): ShoppingListItem {
  return {
    id: row.id as string,
    shopping_list_id: row.shopping_list_id as string,
    ingredient_name: row.ingredient_name as string,
    quantity: (row.quantity as number) ?? null,
    unit: (row.unit as string) ?? null,
    category: (row.category as string) ?? 'other',
    source_recipes: parseJsonArray(row.source_recipes),
    have_it: Boolean(row.have_it),
    is_recurring_essential: Boolean(row.is_recurring_essential),
  };
}

function rowToPantryStaple(row: Record<string, unknown>): PantryStaple {
  return {
    id: row.id as string,
    ingredient_name: row.ingredient_name as string,
    created_at: row.created_at as string,
  };
}

function rowToRecurringEssential(row: Record<string, unknown>): RecurringEssential {
  return {
    id: row.id as string,
    item_name: row.item_name as string,
    quantity: (row.quantity as number) ?? null,
    unit: (row.unit as string) ?? null,
    category: (row.category as string) ?? 'other',
  };
}

// Extended user row (includes OAuth tokens stored in DB but not in shared type)
interface UserRow {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  created_at: string;
  last_login: string;
}

function rowToUserRow(row: Record<string, unknown>): UserRow {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    picture: (row.picture as string) ?? null,
    google_access_token: (row.google_access_token as string) ?? null,
    google_refresh_token: (row.google_refresh_token as string) ?? null,
    created_at: row.created_at as string,
    last_login: row.last_login as string,
  };
}

// ===========================================================================
// User CRUD
// ===========================================================================

export async function getUser(db: D1Database, id: string): Promise<UserRow | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first();
  return result ? rowToUserRow(result as Record<string, unknown>) : null;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first();
  return result ? rowToUserRow(result as Record<string, unknown>) : null;
}

export async function upsertUser(
  db: D1Database,
  data: {
    email: string;
    name: string;
    picture: string | null;
    google_access_token: string;
    google_refresh_token: string | null;
    last_login: string;
  },
): Promise<UserRow> {
  const existing = await getUserByEmail(db, data.email);

  if (existing) {
    await db
      .prepare(
        `UPDATE users
         SET name = ?, picture = ?, google_access_token = ?,
             google_refresh_token = COALESCE(?, google_refresh_token),
             last_login = ?
         WHERE id = ?`,
      )
      .bind(
        data.name,
        data.picture,
        data.google_access_token,
        data.google_refresh_token,
        data.last_login,
        existing.id,
      )
      .run();

    return { ...existing, ...data, id: existing.id, created_at: existing.created_at };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO users (id, email, name, picture, google_access_token, google_refresh_token, created_at, last_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      data.email,
      data.name,
      data.picture,
      data.google_access_token,
      data.google_refresh_token,
      now,
      data.last_login,
    )
    .run();

  return {
    id,
    email: data.email,
    name: data.name,
    picture: data.picture,
    google_access_token: data.google_access_token,
    google_refresh_token: data.google_refresh_token,
    created_at: now,
    last_login: data.last_login,
  };
}

// ===========================================================================
// Recipe CRUD
// ===========================================================================

export interface ListRecipesOptions {
  limit: number;
  offset: number;
  search: string | null;
  effortLevel: 1 | 2 | 3 | null;
  maxEffortLevel?: 1 | 2 | 3;
  category: string | null;
  excludeTreeNuts: boolean;
  excludeIds?: string[];
}

export async function listRecipes(
  db: D1Database,
  opts: ListRecipesOptions,
): Promise<{ recipes: Recipe[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.excludeTreeNuts) {
    conditions.push('contains_tree_nuts = 0');
  }

  if (opts.search) {
    conditions.push('title LIKE ?');
    params.push(`%${opts.search}%`);
  }

  if (opts.effortLevel !== null && opts.effortLevel !== undefined) {
    conditions.push('effort_level = ?');
    params.push(opts.effortLevel);
  }

  if (opts.maxEffortLevel !== undefined) {
    conditions.push('effort_level <= ?');
    params.push(opts.maxEffortLevel);
  }

  if (opts.category) {
    conditions.push("categories LIKE ?");
    params.push(`%${opts.category}%`);
  }

  if (opts.excludeIds && opts.excludeIds.length > 0) {
    const placeholders = opts.excludeIds.map(() => '?').join(', ');
    conditions.push(`id NOT IN (${placeholders})`);
    params.push(...opts.excludeIds);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching recipes
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM recipes ${whereClause}`);
  const countResult = await countStmt.bind(...params).first<{ count: number }>();
  const total = countResult?.count ?? 0;

  // Fetch the page
  const selectStmt = db.prepare(
    `SELECT * FROM recipes ${whereClause} ORDER BY title ASC LIMIT ? OFFSET ?`,
  );
  const result = await selectStmt.bind(...params, opts.limit, opts.offset).all();

  const recipes = (result.results ?? []).map((row) => rowToRecipe(row as Record<string, unknown>));

  return { recipes, total };
}

export async function getRecipeById(db: D1Database, id: string): Promise<Recipe | null> {
  const result = await db.prepare('SELECT * FROM recipes WHERE id = ?').bind(id).first();
  return result ? rowToRecipe(result as Record<string, unknown>) : null;
}

export async function getRecipeByPaprikaUid(db: D1Database, paprikaUid: string): Promise<Recipe | null> {
  const result = await db
    .prepare('SELECT * FROM recipes WHERE paprika_uid = ?')
    .bind(paprikaUid)
    .first();
  return result ? rowToRecipe(result as Record<string, unknown>) : null;
}

export async function createRecipe(
  db: D1Database,
  data: RecipeInsert & {
    image_url?: string | null;
    last_made?: string | null;
    times_made?: number;
    rating?: number | null;
  },
): Promise<Recipe> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO recipes (
        id, paprika_uid, title, directions, prep_time_minutes, cook_time_minutes,
        total_time_minutes, servings, effort_level, categories, tags, image_url,
        source, last_made, times_made, rating, notes, contains_tree_nuts,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      data.paprika_uid ?? null,
      data.title,
      data.directions ?? '',
      data.prep_time_minutes ?? null,
      data.cook_time_minutes ?? null,
      data.total_time_minutes ?? null,
      data.servings ?? 4,
      data.effort_level ?? 2,
      JSON.stringify(data.categories ?? []),
      JSON.stringify(data.tags ?? []),
      data.image_url ?? null,
      data.source ?? null,
      data.last_made ?? null,
      data.times_made ?? 0,
      data.rating ?? null,
      data.notes ?? '',
      data.contains_tree_nuts ? 1 : 0,
      now,
      now,
    )
    .run();

  return {
    id,
    paprika_uid: data.paprika_uid ?? null,
    title: data.title,
    directions: data.directions ?? '',
    prep_time_minutes: data.prep_time_minutes ?? null,
    cook_time_minutes: data.cook_time_minutes ?? null,
    total_time_minutes: data.total_time_minutes ?? null,
    servings: data.servings ?? 4,
    effort_level: data.effort_level ?? 2,
    categories: data.categories ?? [],
    tags: data.tags ?? [],
    image_url: data.image_url ?? null,
    source: data.source ?? null,
    last_made: data.last_made ?? null,
    times_made: data.times_made ?? 0,
    rating: data.rating ?? null,
    notes: data.notes ?? '',
    contains_tree_nuts: data.contains_tree_nuts ?? false,
    created_at: now,
    updated_at: now,
  };
}

export async function updateRecipe(
  db: D1Database,
  id: string,
  data: Partial<RecipeInsert>,
): Promise<Recipe> {
  const now = new Date().toISOString();

  // Build SET clause dynamically from provided fields
  const setClauses: string[] = ['updated_at = ?'];
  const params: unknown[] = [now];

  const fieldMap: Record<string, (val: unknown) => unknown> = {
    paprika_uid: (v) => v,
    title: (v) => v,
    directions: (v) => v,
    prep_time_minutes: (v) => v,
    cook_time_minutes: (v) => v,
    total_time_minutes: (v) => v,
    servings: (v) => v,
    effort_level: (v) => v,
    categories: (v) => JSON.stringify(v),
    tags: (v) => JSON.stringify(v),
    image_url: (v) => v,
    source: (v) => v,
    last_made: (v) => v,
    times_made: (v) => v,
    rating: (v) => v,
    notes: (v) => v,
    contains_tree_nuts: (v) => (v ? 1 : 0),
  };

  for (const [field, transform] of Object.entries(fieldMap)) {
    if (field in data) {
      setClauses.push(`${field} = ?`);
      params.push(transform((data as Record<string, unknown>)[field]));
    }
  }

  params.push(id);

  await db
    .prepare(`UPDATE recipes SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run();

  const updated = await getRecipeById(db, id);
  if (!updated) throw new Error(`Recipe ${id} not found after update`);
  return updated;
}

export async function deleteRecipe(db: D1Database, id: string): Promise<void> {
  // Delete ingredients first (foreign key)
  await db.prepare('DELETE FROM ingredients WHERE recipe_id = ?').bind(id).run();
  await db.prepare('DELETE FROM recipes WHERE id = ?').bind(id).run();
}

// ===========================================================================
// Ingredient CRUD
// ===========================================================================

export async function getIngredientsByRecipeId(db: D1Database, recipeId: string): Promise<Ingredient[]> {
  const result = await db
    .prepare('SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY rowid ASC')
    .bind(recipeId)
    .all();
  return (result.results ?? []).map((row) => rowToIngredient(row as Record<string, unknown>));
}

export async function bulkInsertIngredients(
  db: D1Database,
  ingredients: Array<IngredientInsert & { recipe_id: string }>,
): Promise<void> {
  if (ingredients.length === 0) return;

  // D1 batch API for efficiency
  const stmts = ingredients.map((ing) => {
    const id = crypto.randomUUID();
    return db
      .prepare(
        `INSERT INTO ingredients (id, name, raw_text, quantity, unit, category, recipe_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        ing.name,
        ing.raw_text,
        ing.quantity ?? null,
        ing.unit ?? null,
        ing.category ?? null,
        ing.recipe_id,
      );
  });

  await db.batch(stmts);
}

// ===========================================================================
// MealPlan CRUD
// ===========================================================================

export async function getMealPlanById(db: D1Database, id: string): Promise<MealPlan | null> {
  const result = await db.prepare('SELECT * FROM meal_plans WHERE id = ?').bind(id).first();
  return result ? rowToMealPlan(result as Record<string, unknown>) : null;
}

export async function getMealPlanByWeekStart(
  db: D1Database,
  weekStart: string,
  userId: string,
): Promise<MealPlan | null> {
  const result = await db
    .prepare('SELECT * FROM meal_plans WHERE week_start = ? AND created_by = ?')
    .bind(weekStart, userId)
    .first();
  return result ? rowToMealPlan(result as Record<string, unknown>) : null;
}

export async function createMealPlan(db: D1Database, data: MealPlanInsert): Promise<MealPlan> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO meal_plans (id, week_start, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, data.week_start, data.created_by, now, now)
    .run();

  return {
    id,
    week_start: data.week_start,
    created_by: data.created_by,
    created_at: now,
    updated_at: now,
  };
}

// ===========================================================================
// MealPlanEntry CRUD
// ===========================================================================

export async function getMealPlanEntries(db: D1Database, mealPlanId: string): Promise<MealPlanEntry[]> {
  const result = await db
    .prepare('SELECT * FROM meal_plan_entries WHERE meal_plan_id = ? ORDER BY date ASC')
    .bind(mealPlanId)
    .all();
  return (result.results ?? []).map((row) => rowToMealPlanEntry(row as Record<string, unknown>));
}

export async function createMealPlanEntry(
  db: D1Database,
  data: MealPlanEntryInsert,
): Promise<MealPlanEntry> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO meal_plan_entries (
        id, meal_plan_id, date, meal_type, classification,
        override_classification, recipe_id, status,
        leftover_source_entry_id, headcount, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      data.meal_plan_id,
      data.date,
      data.meal_type ?? 'dinner',
      data.classification,
      data.override_classification ?? null,
      data.recipe_id ?? null,
      data.status ?? 'suggested',
      data.leftover_source_entry_id ?? null,
      data.headcount ?? 4,
      data.notes ?? null,
    )
    .run();

  return {
    id,
    meal_plan_id: data.meal_plan_id,
    date: data.date,
    meal_type: 'dinner',
    classification: data.classification,
    override_classification: data.override_classification ?? null,
    recipe_id: data.recipe_id ?? null,
    status: data.status ?? 'suggested',
    leftover_source_entry_id: data.leftover_source_entry_id ?? null,
    headcount: data.headcount ?? 4,
    notes: data.notes ?? null,
  };
}

export async function updateMealPlanEntry(
  db: D1Database,
  entryId: string,
  mealPlanId: string,
  data: Partial<{
    recipe_id: string | null;
    status: MealPlanEntry['status'];
    override_classification: MealPlanEntry['override_classification'];
    headcount: number;
    notes: string | null;
    leftover_source_entry_id: string | null;
  }>,
): Promise<MealPlanEntry | null> {
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if ('recipe_id' in data) {
    setClauses.push('recipe_id = ?');
    params.push(data.recipe_id);
  }
  if ('status' in data) {
    setClauses.push('status = ?');
    params.push(data.status);
  }
  if ('override_classification' in data) {
    setClauses.push('override_classification = ?');
    params.push(data.override_classification);
  }
  if ('headcount' in data) {
    setClauses.push('headcount = ?');
    params.push(data.headcount);
  }
  if ('notes' in data) {
    setClauses.push('notes = ?');
    params.push(data.notes);
  }
  if ('leftover_source_entry_id' in data) {
    setClauses.push('leftover_source_entry_id = ?');
    params.push(data.leftover_source_entry_id);
  }

  if (setClauses.length === 0) {
    // Nothing to update — just return the existing entry
    const result = await db
      .prepare('SELECT * FROM meal_plan_entries WHERE id = ? AND meal_plan_id = ?')
      .bind(entryId, mealPlanId)
      .first();
    return result ? rowToMealPlanEntry(result as Record<string, unknown>) : null;
  }

  params.push(entryId, mealPlanId);

  await db
    .prepare(
      `UPDATE meal_plan_entries SET ${setClauses.join(', ')} WHERE id = ? AND meal_plan_id = ?`,
    )
    .bind(...params)
    .run();

  const result = await db
    .prepare('SELECT * FROM meal_plan_entries WHERE id = ? AND meal_plan_id = ?')
    .bind(entryId, mealPlanId)
    .first();
  return result ? rowToMealPlanEntry(result as Record<string, unknown>) : null;
}

// ===========================================================================
// ShoppingList CRUD
// ===========================================================================

export async function getShoppingListByMealPlanId(
  db: D1Database,
  mealPlanId: string,
): Promise<ShoppingList | null> {
  const result = await db
    .prepare('SELECT * FROM shopping_lists WHERE meal_plan_id = ?')
    .bind(mealPlanId)
    .first();
  return result ? rowToShoppingList(result as Record<string, unknown>) : null;
}

export async function createShoppingList(
  db: D1Database,
  data: ShoppingListInsert,
): Promise<ShoppingList> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO shopping_lists (id, meal_plan_id, created_at, finalized_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(id, data.meal_plan_id, now, null)
    .run();

  return {
    id,
    meal_plan_id: data.meal_plan_id,
    created_at: now,
    finalized_at: null,
  };
}

// ===========================================================================
// ShoppingListItem CRUD
// ===========================================================================

export async function getShoppingListItems(
  db: D1Database,
  shoppingListId: string,
): Promise<ShoppingListItem[]> {
  const result = await db
    .prepare('SELECT * FROM shopping_list_items WHERE shopping_list_id = ? ORDER BY category ASC, ingredient_name ASC')
    .bind(shoppingListId)
    .all();
  return (result.results ?? []).map((row) => rowToShoppingListItem(row as Record<string, unknown>));
}

export async function bulkInsertShoppingListItems(
  db: D1Database,
  items: Array<ShoppingListItemInsert & { shopping_list_id: string }>,
): Promise<void> {
  if (items.length === 0) return;

  const stmts = items.map((item) => {
    const id = crypto.randomUUID();
    return db
      .prepare(
        `INSERT INTO shopping_list_items (
          id, shopping_list_id, ingredient_name, quantity, unit,
          category, source_recipes, have_it, is_recurring_essential
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        item.shopping_list_id,
        item.ingredient_name,
        item.quantity ?? null,
        item.unit ?? null,
        item.category ?? 'other',
        JSON.stringify(item.source_recipes ?? []),
        item.have_it ? 1 : 0,
        item.is_recurring_essential ? 1 : 0,
      );
  });

  await db.batch(stmts);
}

export async function updateShoppingListItem(
  db: D1Database,
  itemId: string,
  data: Partial<{ have_it: boolean; quantity: number | null; unit: string | null }>,
): Promise<ShoppingListItem | null> {
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if ('have_it' in data) {
    setClauses.push('have_it = ?');
    params.push(data.have_it ? 1 : 0);
  }
  if ('quantity' in data) {
    setClauses.push('quantity = ?');
    params.push(data.quantity);
  }
  if ('unit' in data) {
    setClauses.push('unit = ?');
    params.push(data.unit);
  }

  if (setClauses.length === 0) {
    const result = await db
      .prepare('SELECT * FROM shopping_list_items WHERE id = ?')
      .bind(itemId)
      .first();
    return result ? rowToShoppingListItem(result as Record<string, unknown>) : null;
  }

  params.push(itemId);

  await db
    .prepare(`UPDATE shopping_list_items SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run();

  const result = await db
    .prepare('SELECT * FROM shopping_list_items WHERE id = ?')
    .bind(itemId)
    .first();
  return result ? rowToShoppingListItem(result as Record<string, unknown>) : null;
}

export async function deleteShoppingListItems(db: D1Database, shoppingListId: string): Promise<void> {
  await db
    .prepare('DELETE FROM shopping_list_items WHERE shopping_list_id = ?')
    .bind(shoppingListId)
    .run();
}

// ===========================================================================
// PantryStaple CRUD
// ===========================================================================

export async function listPantryStaples(db: D1Database): Promise<PantryStaple[]> {
  const result = await db
    .prepare('SELECT * FROM pantry_staples ORDER BY ingredient_name ASC')
    .all();
  return (result.results ?? []).map((row) => rowToPantryStaple(row as Record<string, unknown>));
}

export async function createPantryStaple(
  db: D1Database,
  data: PantryStapleInsert,
): Promise<PantryStaple> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO pantry_staples (id, ingredient_name, created_at) VALUES (?, ?, ?)`,
    )
    .bind(id, data.ingredient_name, now)
    .run();

  return {
    id,
    ingredient_name: data.ingredient_name,
    created_at: now,
  };
}

export async function deletePantryStaple(db: D1Database, id: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM pantry_staples WHERE id = ?')
    .bind(id)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

// ===========================================================================
// RecurringEssential CRUD
// ===========================================================================

export async function listRecurringEssentials(db: D1Database): Promise<RecurringEssential[]> {
  const result = await db
    .prepare('SELECT * FROM recurring_essentials ORDER BY item_name ASC')
    .all();
  return (result.results ?? []).map((row) => rowToRecurringEssential(row as Record<string, unknown>));
}

export async function createRecurringEssential(
  db: D1Database,
  data: RecurringEssentialInsert,
): Promise<RecurringEssential> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO recurring_essentials (id, item_name, quantity, unit, category)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, data.item_name, data.quantity ?? null, data.unit ?? null, data.category ?? 'other')
    .run();

  return {
    id,
    item_name: data.item_name,
    quantity: data.quantity ?? null,
    unit: data.unit ?? null,
    category: data.category ?? 'other',
  };
}

export async function deleteRecurringEssential(db: D1Database, id: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM recurring_essentials WHERE id = ?')
    .bind(id)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}
