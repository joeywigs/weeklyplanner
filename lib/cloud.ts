/**
 * Cloud sync layer — wraps localStorage with Cloudflare KV.
 *
 * When a Worker URL and household ID are configured:
 *   Writes → localStorage (instant) + cloud (async fire-and-forget)
 *   Reads  → localStorage (sync, fast), with async cloud pull on demand
 *
 * When cloud is not configured, falls back to plain localStorage.
 */

const WORKER_URL = 'https://planner-api.joeywigs.workers.dev';
const HOUSEHOLD_ID = 'wigs744';

// ─── Config helpers ─────────────────────────────────────────────

export function getWorkerUrl(): string {
  return WORKER_URL;
}

export function getHouseholdId(): string {
  return HOUSEHOLD_ID;
}

export function isCloudEnabled(): boolean {
  return true;
}

// ─── Low-level API calls ────────────────────────────────────────

async function apiGet(key: string): Promise<string | null> {
  const base = getWorkerUrl();
  const hid = getHouseholdId();
  if (!base || !hid) return null;

  const res = await fetch(`${base}/api/data/${encodeURIComponent(key)}`, {
    headers: { 'X-Household-Id': hid },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data === null ? null : JSON.stringify(data);
}

async function apiPut(key: string, value: string): Promise<void> {
  const base = getWorkerUrl();
  const hid = getHouseholdId();
  if (!base || !hid) return;

  await fetch(`${base}/api/data/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'X-Household-Id': hid, 'Content-Type': 'application/json' },
    body: value,
  });
}

async function apiDelete(key: string): Promise<void> {
  const base = getWorkerUrl();
  const hid = getHouseholdId();
  if (!base || !hid) return;

  await fetch(`${base}/api/data/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: { 'X-Household-Id': hid },
  });
}

// ─── Public sync functions ──────────────────────────────────────

/** Read from localStorage (sync). */
export function syncGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

/** Write to localStorage immediately, then push to cloud async. */
export function syncSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
  if (isCloudEnabled()) {
    apiPut(key, value).catch(() => {});
  }
}

/** Remove from localStorage, then remove from cloud async. */
export function syncRemove(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
  if (isCloudEnabled()) {
    apiDelete(key).catch(() => {});
  }
}

/**
 * Pull a key from cloud and update localStorage.
 * Returns the cloud value, or falls back to localStorage if cloud is unavailable.
 */
export async function syncPull(key: string): Promise<string | null> {
  if (!isCloudEnabled()) {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  }
  try {
    const cloudValue = await apiGet(key);
    if (cloudValue !== null && typeof window !== 'undefined') {
      localStorage.setItem(key, cloudValue);
    }
    return cloudValue ?? (typeof window !== 'undefined' ? localStorage.getItem(key) : null);
  } catch {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  }
}

/**
 * Push current localStorage value for a key to the cloud.
 * Used for initial upload when joining a household.
 */
export async function syncPush(key: string): Promise<void> {
  if (!isCloudEnabled() || typeof window === 'undefined') return;
  const value = localStorage.getItem(key);
  if (value !== null) {
    await apiPut(key, value).catch(() => {});
  }
}

/**
 * Push all planner data to cloud (for initial sync when setting up household).
 */
export async function pushAllToCloud(): Promise<void> {
  if (!isCloudEnabled() || typeof window === 'undefined') return;

  const keysToSync: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    // Sync planner weeks, calendar data, and recipes — skip internal/cache keys
    if (
      key.startsWith('planner_week_') ||
      key === 'calendar_sources' ||
      key === 'calendar_events_cache' ||
      key === 'calendar_last_refresh' ||
      key === 'user_recipes'
    ) {
      keysToSync.push(key);
    }
  }

  await Promise.all(keysToSync.map((key) => syncPush(key)));
}

/**
 * Test the cloud connection.
 */
export async function testConnection(): Promise<boolean> {
  const base = getWorkerUrl();
  const hid = getHouseholdId();
  if (!base || !hid) return false;

  try {
    const res = await fetch(`${base}/api/ping`, {
      headers: { 'X-Household-Id': hid },
    });
    return res.ok;
  } catch {
    return false;
  }
}
