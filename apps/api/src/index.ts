import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { recipeRoutes } from './routes/recipes';
import { calendarRoutes } from './routes/calendar';
import { mealPlanRoutes } from './routes/meal-plans';
import { shoppingRoutes } from './routes/shopping';

// ---------------------------------------------------------------------------
// Cloudflare Workers Bindings
// ---------------------------------------------------------------------------

export interface Bindings {
  DB: D1Database;
  IMAGES: R2Bucket;
  CORS_ORIGIN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AUTHORIZED_EMAILS: string;
  JWT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  FRONTEND_URL: string;
}

// Context variables set by middleware (accessible via c.get / c.set)
export interface Variables {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// Re-export the app type so route files can reference it
export type AppType = Hono<{ Bindings: Bindings; Variables: Variables }>;

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// --- Global middleware ---
app.use('*', corsMiddleware);

// --- Public routes (no auth required) ---
app.route('/auth', authRoutes);

// --- Protected routes (auth required) ---
app.use('/recipes/*', authMiddleware);
app.use('/calendar/*', authMiddleware);
app.use('/meal-plans/*', authMiddleware);
app.use('/shopping/*', authMiddleware);

app.route('/recipes', recipeRoutes);
app.route('/calendar', calendarRoutes);
app.route('/meal-plans', mealPlanRoutes);
app.route('/shopping', shoppingRoutes);

// --- Health check ---
app.get('/health', (c) => {
  return c.json({ data: { status: 'ok' }, error: null });
});

// --- 404 fallback ---
app.notFound((c) => {
  return c.json({ data: null, error: 'Not found' }, 404);
});

// --- Global error handler ---
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ data: null, error: 'Internal server error' }, 500);
});

export default app;
