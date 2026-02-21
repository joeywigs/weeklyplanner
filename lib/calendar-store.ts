import type { CalendarSource, CalendarEvent } from './types';
import { syncGet, syncSet, syncRemove } from './cloud';

const SOURCES_KEY = 'calendar_sources';
const EVENTS_KEY = 'calendar_events_cache';
const LAST_REFRESH_KEY = 'calendar_last_refresh';

export function getCalendarSources(): CalendarSource[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = syncGet(SOURCES_KEY);
    return raw ? (JSON.parse(raw) as CalendarSource[]) : [];
  } catch {
    return [];
  }
}

export function setCalendarSources(sources: CalendarSource[]): void {
  if (typeof window === 'undefined') return;
  syncSet(SOURCES_KEY, JSON.stringify(sources));
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
