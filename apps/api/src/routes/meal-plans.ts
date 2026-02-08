import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings, Variables } from '../index';
import { getUserFromContext } from '../middleware/auth';
import {
  getMealPlanByWeekStart,
  getMealPlanById,
  createMealPlan,
  getMealPlanEntries,
  createMealPlanEntry,
  updateMealPlanEntry,
  listRecipes,
  getUser,
} from '../db/queries';
import type { EveningClassification } from '@mealflow/shared';
import { classifyWeekEvenings } from '../services/calendar-classifier';
import { fetchGoogleCalendarEvents } from '../services/google-calendar';

export const mealPlanRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createPlanSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format'),
});

const updateEntrySchema = z.object({
  recipe_id: z.string().uuid().nullable().optional(),
  status: z.enum(['suggested', 'confirmed', 'eating_out', 'leftovers']).optional(),
  override_classification: z.enum(['free', 'partial', 'busy']).nullable().optional(),
  headcount: z.number().int().positive().optional(),
  notes: z.string().nullable().optional(),
  leftover_source_entry_id: z.string().uuid().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the Monday of the current week (ISO week, Mon=0).
 */
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // offset to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

/**
 * Map evening classification to recommended effort level.
 */
function classificationToEffortLevel(classification: EveningClassification): 1 | 2 | 3 {
  switch (classification) {
    case 'free':
      return 3; // complex recipes are OK
    case 'partial':
      return 2; // medium-effort recipes
    case 'busy':
      return 1; // quick / easy recipes only
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /meal-plans/current
 * Get the meal plan for the current week, creating one if it does not exist.
 */
mealPlanRoutes.get('/current', async (c) => {
  const user = getUserFromContext(c);
  const weekStart = getCurrentWeekStart();

  let plan = await getMealPlanByWeekStart(c.env.DB, weekStart, user.id);

  if (!plan) {
    plan = await createMealPlan(c.env.DB, {
      week_start: weekStart,
      created_by: user.id,
    });

    // Create entries for each day of the week (Mon-Sun)
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      await createMealPlanEntry(c.env.DB, {
        meal_plan_id: plan.id,
        date: dateStr,
        meal_type: 'dinner',
        classification: 'free', // default, updated when calendar is classified
      });
    }
  }

  const entries = await getMealPlanEntries(c.env.DB, plan.id);

  return c.json({
    data: { ...plan, entries },
    error: null,
  });
});

/**
 * GET /meal-plans/:id
 * Get a specific meal plan with its entries.
 */
mealPlanRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const plan = await getMealPlanById(c.env.DB, id);

  if (!plan) {
    return c.json({ data: null, error: 'Meal plan not found' }, 404);
  }

  const entries = await getMealPlanEntries(c.env.DB, plan.id);

  return c.json({
    data: { ...plan, entries },
    error: null,
  });
});

/**
 * POST /meal-plans/:id/sync-calendar
 * Fetch Google Calendar events for the plan's week, classify each evening,
 * and update the meal plan entries' classification field.
 */
mealPlanRoutes.post('/:id/sync-calendar', async (c) => {
  const planId = c.req.param('id');
  const { id: userId } = getUserFromContext(c);

  const plan = await getMealPlanById(c.env.DB, planId);
  if (!plan) {
    return c.json({ data: null, error: 'Meal plan not found' }, 404);
  }

  const user = await getUser(c.env.DB, userId);
  if (!user || !user.google_access_token) {
    return c.json({ data: null, error: 'Google Calendar not connected. Please log out and log back in to grant calendar access.' }, 400);
  }

  // Build time range for the full week (Monday through Sunday)
  const timeMin = `${plan.week_start}T00:00:00Z`;
  const endDate = new Date(plan.week_start);
  endDate.setDate(endDate.getDate() + 7);
  const timeMax = `${endDate.toISOString().split('T')[0]}T23:59:59Z`;

  try {
    const events = await fetchGoogleCalendarEvents(user.google_access_token, timeMin, timeMax);
    const classifications = classifyWeekEvenings(events, plan.week_start);

    // Update each entry's classification
    const entries = await getMealPlanEntries(c.env.DB, plan.id);
    for (const dayResult of classifications) {
      const entry = entries.find((e) => e.date === dayResult.date);
      if (entry) {
        await c.env.DB
          .prepare('UPDATE meal_plan_entries SET classification = ? WHERE id = ? AND meal_plan_id = ?')
          .bind(dayResult.classification, entry.id, plan.id)
          .run();
      }
    }

    const updatedEntries = await getMealPlanEntries(c.env.DB, plan.id);
    return c.json({ data: { ...plan, entries: updatedEntries }, error: null });
  } catch (err) {
    console.error('Calendar sync error:', err);
    return c.json({ data: null, error: 'Failed to sync calendar' }, 502);
  }
});

/**
 * POST /meal-plans
 * Create a new meal plan for a given week.
 */
mealPlanRoutes.post('/', async (c) => {
  const user = getUserFromContext(c);
  const body = await c.req.json();
  const parseResult = createPlanSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ data: null, error: 'Validation failed', meta: { issues: parseResult.error.issues } }, 400);
  }

  const { week_start } = parseResult.data;

  // Check if a plan already exists for this week
  const existing = await getMealPlanByWeekStart(c.env.DB, week_start, user.id);
  if (existing) {
    return c.json({ data: null, error: 'A meal plan already exists for this week' }, 409);
  }

  const plan = await createMealPlan(c.env.DB, {
    week_start,
    created_by: user.id,
  });

  // Create entries for each day of the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(week_start);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    await createMealPlanEntry(c.env.DB, {
      meal_plan_id: plan.id,
      date: dateStr,
      meal_type: 'dinner',
      classification: 'free',
    });
  }

  const entries = await getMealPlanEntries(c.env.DB, plan.id);

  return c.json({ data: { ...plan, entries }, error: null }, 201);
});

/**
 * PUT /meal-plans/:id/entries/:entryId
 * Update a meal plan entry (assign recipe, change status, override classification, etc.).
 */
mealPlanRoutes.put('/:id/entries/:entryId', async (c) => {
  const planId = c.req.param('id');
  const entryId = c.req.param('entryId');

  const plan = await getMealPlanById(c.env.DB, planId);
  if (!plan) {
    return c.json({ data: null, error: 'Meal plan not found' }, 404);
  }

  const body = await c.req.json();
  const parseResult = updateEntrySchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ data: null, error: 'Validation failed', meta: { issues: parseResult.error.issues } }, 400);
  }

  const updated = await updateMealPlanEntry(c.env.DB, entryId, planId, parseResult.data);
  if (!updated) {
    return c.json({ data: null, error: 'Meal plan entry not found' }, 404);
  }

  return c.json({ data: updated, error: null });
});

/**
 * GET /meal-plans/:id/suggestions/:date
 * Get recipe suggestions for a specific date, filtered by effort level
 * matching the evening classification.
 */
mealPlanRoutes.get('/:id/suggestions/:date', async (c) => {
  const planId = c.req.param('id');
  const date = c.req.param('date');

  const plan = await getMealPlanById(c.env.DB, planId);
  if (!plan) {
    return c.json({ data: null, error: 'Meal plan not found' }, 404);
  }

  const entries = await getMealPlanEntries(c.env.DB, planId);
  const entry = entries.find((e) => e.date === date);

  if (!entry) {
    return c.json({ data: null, error: 'No entry found for this date' }, 404);
  }

  // Use override classification if present, otherwise use the auto-classified value
  const effectiveClassification = entry.override_classification ?? entry.classification;
  const maxEffort = classificationToEffortLevel(effectiveClassification as EveningClassification);

  // Get recipes that already have been assigned this week (to avoid repeats)
  const assignedRecipeIds = entries
    .filter((e) => e.recipe_id !== null)
    .map((e) => e.recipe_id as string);

  // Fetch suitable recipes — effort level <= maxEffort, exclude tree nuts, exclude already assigned
  const { recipes } = await listRecipes(c.env.DB, {
    limit: 10,
    offset: 0,
    search: null,
    effortLevel: null,
    maxEffortLevel: maxEffort,
    category: null,
    excludeTreeNuts: true,
    excludeIds: assignedRecipeIds,
  });

  return c.json({
    data: {
      date,
      classification: effectiveClassification,
      max_effort_level: maxEffort,
      suggestions: recipes,
    },
    error: null,
  });
});
