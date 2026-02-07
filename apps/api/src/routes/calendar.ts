import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings, Variables } from '../index';
import { getUserFromContext } from '../middleware/auth';
import { getUser } from '../db/queries';
import { classifyWeekEvenings, type CalendarEvent } from '../services/calendar-classifier';

export const calendarRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Google Calendar API helper
// ---------------------------------------------------------------------------

async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Calendar API error: ${response.status} ${text}`);
  }

  interface GoogleCalendarItem {
    id: string;
    summary?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    status?: string;
  }

  interface GoogleCalendarResponse {
    items: GoogleCalendarItem[];
  }

  const data = (await response.json()) as GoogleCalendarResponse;

  return (data.items ?? []).map((item) => ({
    id: item.id,
    summary: item.summary ?? '(No title)',
    start: item.start.dateTime ?? item.start.date ?? '',
    end: item.end.dateTime ?? item.end.date ?? '',
    isAllDay: !item.start.dateTime,
  }));
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const eventsQuerySchema = z.object({
  start: z.string().min(1, 'start is required (ISO 8601)'),
  end: z.string().min(1, 'end is required (ISO 8601)'),
});

const classifyQuerySchema = z.object({
  week_start: z.string().min(1, 'week_start is required (YYYY-MM-DD)'),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /calendar/events?start=&end=
 * Fetch Google Calendar events for a date range.
 */
calendarRoutes.get('/events', async (c) => {
  const parseResult = eventsQuerySchema.safeParse(c.req.query());
  if (!parseResult.success) {
    return c.json({ data: null, error: 'Invalid query parameters', meta: { issues: parseResult.error.issues } }, 400);
  }

  const { id: userId } = getUserFromContext(c);
  const user = await getUser(c.env.DB, userId);
  if (!user || !user.google_access_token) {
    return c.json({ data: null, error: 'Google Calendar not connected' }, 400);
  }

  try {
    const events = await fetchGoogleCalendarEvents(
      user.google_access_token,
      parseResult.data.start,
      parseResult.data.end,
    );
    return c.json({ data: events, error: null });
  } catch (err) {
    console.error('Calendar fetch error:', err);
    return c.json({ data: null, error: 'Failed to fetch calendar events' }, 502);
  }
});

/**
 * GET /calendar/classify-week?week_start=
 * Classify each evening of the week as free/partial/busy based on
 * Google Calendar events between 4 PM and 9 PM.
 */
calendarRoutes.get('/classify-week', async (c) => {
  const parseResult = classifyQuerySchema.safeParse(c.req.query());
  if (!parseResult.success) {
    return c.json({ data: null, error: 'Invalid query parameters', meta: { issues: parseResult.error.issues } }, 400);
  }

  const { id: userId } = getUserFromContext(c);
  const user = await getUser(c.env.DB, userId);
  if (!user || !user.google_access_token) {
    return c.json({ data: null, error: 'Google Calendar not connected' }, 400);
  }

  const weekStart = parseResult.data.week_start; // YYYY-MM-DD
  // Build ISO range covering the full week (Monday through Sunday)
  const timeMin = `${weekStart}T00:00:00Z`;
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 7);
  const timeMax = `${endDate.toISOString().split('T')[0]}T23:59:59Z`;

  try {
    const events = await fetchGoogleCalendarEvents(user.google_access_token, timeMin, timeMax);
    const classifications = classifyWeekEvenings(events, weekStart);
    return c.json({ data: classifications, error: null });
  } catch (err) {
    console.error('Calendar classify error:', err);
    return c.json({ data: null, error: 'Failed to classify week' }, 502);
  }
});
