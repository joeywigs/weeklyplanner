import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../index';

/**
 * CORS middleware.
 *
 * Reads the allowed origin from the CORS_ORIGIN environment variable so the
 * same worker binary works in both local development and production.
 */
export const corsMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const origin = c.env.CORS_ORIGIN ?? '*';

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  await next();

  // Attach CORS headers to every response
  c.res.headers.set('Access-Control-Allow-Origin', origin);
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  c.res.headers.set('Access-Control-Allow-Credentials', 'true');
});
