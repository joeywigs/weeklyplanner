import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import type { Bindings, Variables } from '../index';

// ---------------------------------------------------------------------------
// JWT helpers (minimal, no external dependencies)
// ---------------------------------------------------------------------------

function base64UrlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad if necessary
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string, expiresInSeconds = 60 * 60 * 24 * 7): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encoder = new TextEncoder();
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)));
  const data = `${header}.${body}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sig = base64UrlEncode(signature);

  return `${data}.${sig}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;
    const data = `${header}.${body}`;

    const key = await getSigningKey(secret);
    const encoder = new TextEncoder();
    const signatureBytes = base64UrlDecode(sig);

    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(data));
    if (!valid) return null;

    const payload: JwtPayload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helper
// ---------------------------------------------------------------------------

function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const cookieHeader = c.req.header('Cookie');
  const token = getCookie(cookieHeader, 'mealflow_session');

  if (!token) {
    return c.json({ data: null, error: 'Authentication required' }, 401);
  }

  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ data: null, error: 'Invalid or expired session' }, 401);
  }

  c.set('user', {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
  });

  await next();
});

// ---------------------------------------------------------------------------
// Helper to read user from context
// ---------------------------------------------------------------------------

export function getUserFromContext(c: Context<{ Bindings: Bindings; Variables: Variables }>): {
  id: string;
  email: string;
  name: string;
} {
  return c.get('user');
}
