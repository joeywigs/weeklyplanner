import type { CalendarEvent } from './calendar-classifier';

/**
 * Fetch events from the Google Calendar API for a given time range.
 */
export async function fetchGoogleCalendarEvents(
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
