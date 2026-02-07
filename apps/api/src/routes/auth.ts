import { Hono } from 'hono';
import type { Bindings, Variables } from '../index';
import { signJwt, verifyJwt } from '../middleware/auth';
import { getUser, upsertUser } from '../db/queries';

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Google OAuth helpers
// ---------------------------------------------------------------------------

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
}

async function exchangeCodeForTokens(
  code: string,
  env: Bindings,
): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  return response.json() as Promise<GoogleUserInfo>;
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function buildSessionCookie(token: string, env: Bindings): string {
  const isProduction = !env.CORS_ORIGIN.includes('localhost');
  const parts = [
    `mealflow_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${60 * 60 * 24 * 7}`, // 7 days
  ];
  if (isProduction) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function buildClearCookie(): string {
  return 'mealflow_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /auth/login
 * Redirect the user to Google's OAuth consent screen.
 */
authRoutes.get('/login', (c) => {
  const scopes = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar.readonly',
  ];

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: c.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return c.redirect(url);
});

/**
 * GET /auth/callback
 * Handle the OAuth callback from Google.
 * Verify that the user's email is in the AUTHORIZED_EMAILS whitelist,
 * create or update the user row in D1, issue a JWT session cookie,
 * and redirect to the frontend.
 */
authRoutes.get('/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error) {
    return c.json({ data: null, error: `OAuth error: ${error}` }, 400);
  }

  if (!code) {
    return c.json({ data: null, error: 'Missing authorization code' }, 400);
  }

  try {
    // 1. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, c.env);

    // 2. Get user info from Google
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    // 3. Verify email is authorized
    const authorizedEmails = c.env.AUTHORIZED_EMAILS.split(',').map((e) => e.trim().toLowerCase());
    if (!authorizedEmails.includes(googleUser.email.toLowerCase())) {
      return c.json(
        { data: null, error: 'Not authorized. This app is restricted to approved users only.' },
        403,
      );
    }

    // 4. Create or update user in D1
    const now = new Date().toISOString();
    const user = await upsertUser(c.env.DB, {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token ?? null,
      last_login: now,
    });

    // 5. Issue JWT session cookie
    const jwt = await signJwt(
      { sub: user.id, email: user.email, name: user.name },
      c.env.JWT_SECRET,
    );

    const frontendUrl = c.env.FRONTEND_URL ?? c.env.CORS_ORIGIN;
    return new Response(null, {
      status: 302,
      headers: {
        Location: frontendUrl,
        'Set-Cookie': buildSessionCookie(jwt, c.env),
      },
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    return c.json({ data: null, error: 'Authentication failed' }, 500);
  }
});

/**
 * GET /auth/me
 * Return the currently authenticated user from the session cookie.
 * This route does its own token verification instead of relying on the
 * global auth middleware, so unauthenticated requests get a clean null.
 */
authRoutes.get('/me', async (c) => {
  const cookieHeader = c.req.header('Cookie');
  const token = getCookie(cookieHeader, 'mealflow_session');

  if (!token) {
    return c.json({ data: null, error: null });
  }

  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ data: null, error: null });
  }

  const user = await getUser(c.env.DB, payload.sub);
  if (!user) {
    return c.json({ data: null, error: null });
  }

  return c.json({
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
    error: null,
  });
});

/**
 * POST /auth/logout
 * Clear the session cookie.
 */
authRoutes.post('/logout', (c) => {
  return new Response(JSON.stringify({ data: null, error: null }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildClearCookie(),
    },
  });
});
