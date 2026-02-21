import type { CalendarSource, CalendarEvent } from './types';

const SOURCES_KEY = 'calendar_sources';
const EVENTS_KEY = 'calendar_events_cache';
const LAST_REFRESH_KEY = 'calendar_last_refresh';

export function getCalendarSources(): CalendarSource[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SOURCES_KEY);
    return raw ? (JSON.parse(raw) as CalendarSource[]) : [];
  } catch {
    return [];
  }
}

export function setCalendarSources(sources: CalendarSource[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
}

export function getCachedCalendarEvents(): CalendarEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
  } catch {
    return [];
  }
}

export function setCachedCalendarEvents(events: CalendarEvent[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  localStorage.setItem(LAST_REFRESH_KEY, new Date().toISOString());
}

export function clearCachedCalendarEvents(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(EVENTS_KEY);
  localStorage.removeItem(LAST_REFRESH_KEY);
}

export function getLastRefreshTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_REFRESH_KEY);
}
