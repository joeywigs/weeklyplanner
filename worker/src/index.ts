export interface Env {
  PLANNER_KV: KVNamespace;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Household-Id',
  'Access-Control-Max-Age': '86400',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function text(body: string, status = 200): Response {
  return new Response(body, { status, headers: CORS_HEADERS });
}

const HOUSEHOLD_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,48}[a-zA-Z0-9]$/;
const KEY_RE = /^[a-zA-Z0-9_.-]{1,100}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const householdId = request.headers.get('X-Household-Id');

    if (!householdId || !HOUSEHOLD_RE.test(householdId)) {
      return json({ error: 'Missing or invalid X-Household-Id header' }, 400);
    }

    // ─── GET /api/data/:key ─────────────────────────────────────
    if (request.method === 'GET' && url.pathname.startsWith('/api/data/')) {
      const key = decodeURIComponent(url.pathname.slice('/api/data/'.length));
      if (!KEY_RE.test(key)) return json({ error: 'Invalid key' }, 400);

      const value = await env.PLANNER_KV.get(`${householdId}:${key}`);
      return json(value === null ? null : JSON.parse(value));
    }

    // ─── PUT /api/data/:key ─────────────────────────────────────
    if (request.method === 'PUT' && url.pathname.startsWith('/api/data/')) {
      const key = decodeURIComponent(url.pathname.slice('/api/data/'.length));
      if (!KEY_RE.test(key)) return json({ error: 'Invalid key' }, 400);

      const body = await request.text();
      if (body.length > 512_000) {
        return json({ error: 'Payload too large (max 512 KB)' }, 413);
      }

      await env.PLANNER_KV.put(`${householdId}:${key}`, body);
      return json({ ok: true });
    }

    // ─── DELETE /api/data/:key ──────────────────────────────────
    if (request.method === 'DELETE' && url.pathname.startsWith('/api/data/')) {
      const key = decodeURIComponent(url.pathname.slice('/api/data/'.length));
      if (!KEY_RE.test(key)) return json({ error: 'Invalid key' }, 400);

      await env.PLANNER_KV.delete(`${householdId}:${key}`);
      return json({ ok: true });
    }

    // ─── GET /api/bulk?keys=a,b,c ──────────────────────────────
    // Fetch multiple keys in one round trip
    if (request.method === 'GET' && url.pathname === '/api/bulk') {
      const keysParam = url.searchParams.get('keys') || '';
      const keys = keysParam.split(',').filter((k) => KEY_RE.test(k));

      const results: Record<string, unknown> = {};
      await Promise.all(
        keys.map(async (key) => {
          const value = await env.PLANNER_KV.get(`${householdId}:${key}`);
          results[key] = value === null ? null : JSON.parse(value);
        })
      );
      return json(results);
    }

    // ─── PUT /api/bulk ──────────────────────────────────────────
    // Write multiple keys in one round trip
    if (request.method === 'PUT' && url.pathname === '/api/bulk') {
      const body = await request.text();
      if (body.length > 2_000_000) {
        return json({ error: 'Payload too large (max 2 MB)' }, 413);
      }

      const entries = JSON.parse(body) as Record<string, unknown>;
      await Promise.all(
        Object.entries(entries).map(async ([key, value]) => {
          if (!KEY_RE.test(key)) return;
          if (value === null) {
            await env.PLANNER_KV.delete(`${householdId}:${key}`);
          } else {
            await env.PLANNER_KV.put(
              `${householdId}:${key}`,
              JSON.stringify(value)
            );
          }
        })
      );
      return json({ ok: true });
    }

    // ─── GET /api/ping ──────────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/api/ping') {
      return json({ ok: true, household: householdId });
    }

    return json({ error: 'Not found' }, 404);
  },
};
