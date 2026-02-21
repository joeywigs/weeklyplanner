import type { CalendarSource, CalendarEvent } from './types';
import { syncGet, syncSet, syncRemove } from './cloud';

const SOURCES_KEY = 'calendar_sources';
const EVENTS_KEY = 'calendar_events_cache';
const LAST_REFRESH_KEY = 'calendar_last_refresh';

const DEFAULT_SOURCES: CalendarSource[] = [
  {
    id: 'carly-joey',
    name: 'Carly and Joey',
    url: 'https://calendar.google.com/calendar/ical/bde345mbnjjhikil4tsa8e7f90%40group.calendar.google.com/private-74d044285b31c465b0a824162a1c7e50/basic.ics',
  },
  {
    id: 'girlies',
    name: 'Girlies',
    url: 'https://calendar.google.com/calendar/ical/ggbi1tl1ma1vphj0ihcc4blvmk%40group.calendar.google.com/private-c6c87295f36044d391f54ab195145214/basic.ics',
  },
];

export function getCalendarSources(): CalendarSource[] {
  return DEFAULT_SOURCES;
}

export function getCachedCalendarEvents(): CalendarEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = syncGet(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
  } catch {
    return [];
  }
}

export function setCachedCalendarEvents(events: CalendarEvent[]): void {
  if (typeof window === 'undefined') return;
  syncSet(EVENTS_KEY, JSON.stringify(events));
  syncSet(LAST_REFRESH_KEY, new Date().toISOString());
  window.dispatchEvent(new Event('calendar-events-changed'));
}

export function clearCachedCalendarEvents(): void {
  if (typeof window === 'undefined') return;
  syncRemove(EVENTS_KEY);
  syncRemove(LAST_REFRESH_KEY);
  window.dispatchEvent(new Event('calendar-events-changed'));
}

export function onCalendarEventsChanged(callback: () => void): () => void {
  window.addEventListener('calendar-events-changed', callback);
  return () => window.removeEventListener('calendar-events-changed', callback);
}

export function getLastRefreshTime(): string | null {
  if (typeof window === 'undefined') return null;
  return syncGet(LAST_REFRESH_KEY);
}
